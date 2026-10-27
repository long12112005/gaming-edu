using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GamingEdu.API.Services;

public interface IQuizService
{
    Task<IEnumerable<QuizSummaryDto>> GetPublicQuizzesAsync();
    Task<IEnumerable<QuizSummaryDto>> GetMyQuizzesAsync(Guid creatorId);
    Task<QuizDetailDto?> GetQuizDetailAsync(Guid quizId);
    Task<QuizSummaryDto> CreateQuizAsync(Guid creatorId, CreateQuizRequest request);
    Task<QuizSummaryDto> UpdateQuizAsync(Guid creatorId, Guid quizId, UpdateQuizRequest request);
    Task DeleteQuizAsync(Guid creatorId, Guid quizId);
    Task<QuizSummaryDto> CloneQuizAsync(Guid userId, Guid originalQuizId);
    Task ApproveAISlideAsync(Guid creatorId, Guid quizId, Guid slideId);
    Task BulkSaveSlidesAsync(Guid creatorId, Guid quizId, IEnumerable<CreateSlideRequest> requests);
    Task InvalidatePublicQuizCacheAsync();
}

public class QuizService : IQuizService
{
    private readonly ApplicationDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly ILogger<QuizService> _logger;

    // Cache key constants
    private const string PublicQuizzesCacheKey = "public_quizzes";
    private const string QuizDetailPrefix      = "quiz_detail_";

    public QuizService(
        ApplicationDbContext db,
        IMemoryCache cache,
        ILogger<QuizService> logger)
    {
        _db     = db;
        _cache  = cache;
        _logger = logger;
    }

    // ── GET PUBLIC QUIZZES (with caching) ──────────────────────────────
    /// <summary>
    /// Returns public quizzes (is_public = 1). Results are cached for 5 minutes.
    /// Cache is invalidated when a new quiz is created or updated.
    /// </summary>
    public async Task<IEnumerable<QuizSummaryDto>> GetPublicQuizzesAsync()
    {
        if (_cache.TryGetValue(PublicQuizzesCacheKey, out IEnumerable<QuizSummaryDto>? cached)
            && cached is not null)
        {
            _logger.LogDebug("Cache HIT: {Key}", PublicQuizzesCacheKey);
            return cached;
        }

        _logger.LogDebug("Cache MISS: {Key} — querying database", PublicQuizzesCacheKey);

        var quizzes = await _db.Quizzes
            .AsNoTracking()
            .Include(q => q.Creator)
            .Include(q => q.Slides)
            .Where(q => q.IsPublic)                      // is_public = 1
            .OrderByDescending(q => q.CreatedAt)
            .Select(q => new QuizSummaryDto(
                q.Id,
                q.Title,
                q.CoverImageUrl,
                q.Topic,
                q.IsPublic,
                q.Slides.Count,
                q.CreatedAt,
                q.Creator.Nickname,
                q.Creator.AvatarUrl
            ))
            .ToListAsync();

        // Cache with sliding expiry 5 min, absolute expiry 15 min
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(TimeSpan.FromMinutes(5))
            .SetAbsoluteExpiration(TimeSpan.FromMinutes(15))
            .SetPriority(CacheItemPriority.Normal)
            .SetSize(1);

        _cache.Set(PublicQuizzesCacheKey, quizzes, cacheOptions);
        return quizzes;
    }

    // ── GET MY QUIZZES (public + private của creator) ───────────────────
    public async Task<IEnumerable<QuizSummaryDto>> GetMyQuizzesAsync(Guid creatorId)
    {
        return await _db.Quizzes
            .AsNoTracking()
            .Include(q => q.Creator)
            .Include(q => q.Slides)
            .Where(q => q.CreatorId == creatorId)
            .OrderByDescending(q => q.CreatedAt)
            .Select(q => new QuizSummaryDto(
                q.Id,
                q.Title,
                q.CoverImageUrl,
                q.Topic,
                q.IsPublic,
                q.Slides.Count,
                q.CreatedAt,
                q.Creator.Nickname,
                q.Creator.AvatarUrl
            ))
            .ToListAsync();
    }

    // ── GET QUIZ DETAIL (with per-quiz caching) ─────────────────────────
    /// <summary>
    /// Returns full quiz details including slides and options.
    /// Cached per-quiz for 10 minutes (critical for active game rooms).
    /// </summary>
    public async Task<QuizDetailDto?> GetQuizDetailAsync(Guid quizId)
    {
        var cacheKey = $"{QuizDetailPrefix}{quizId}";

        if (_cache.TryGetValue(cacheKey, out QuizDetailDto? cached) && cached is not null)
        {
            _logger.LogDebug("Cache HIT: {Key}", cacheKey);
            return cached;
        }

        var quiz = await _db.Quizzes
            .AsNoTracking()
            .Include(q => q.Creator)
            .Include(q => q.Slides.OrderBy(s => s.OrderIndex))
                .ThenInclude(s => s.Options.OrderBy(o => o.OrderIndex))
            .FirstOrDefaultAsync(q => q.Id == quizId);

        if (quiz is null) return null;

        var dto = new QuizDetailDto(
            quiz.Id,
            quiz.Title,
            quiz.CoverImageUrl,
            quiz.Topic,
            quiz.IsPublic,
            quiz.CreatedAt,
            quiz.Creator.Nickname,
            quiz.Slides.Select(s => new SlideDto(
                s.Id,
                s.Type,
                s.QuestionText,
                s.TimeLimit,
                s.Points,
                s.Status,
                s.OrderIndex,
                s.IsAIGenerated,
                s.Options.Select(o => new SlideOptionDto(
                    o.Id, o.Content, o.IsCorrect,
                    o.MatchingPair, o.BlankKeywords, o.OrderIndex
                ))
            ))
        );

        var cacheOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(TimeSpan.FromMinutes(10))
            .SetAbsoluteExpiration(TimeSpan.FromMinutes(30))
            .SetSize(1);

        _cache.Set(cacheKey, dto, cacheOptions);
        return dto;
    }

    // ── CREATE QUIZ ─────────────────────────────────────────────────────
    public async Task<QuizSummaryDto> CreateQuizAsync(Guid creatorId, CreateQuizRequest request)
    {
        var creator = await _db.Users.FindAsync(creatorId)
            ?? throw new KeyNotFoundException("Không tìm thấy người dùng.");

        var quiz = new Quiz
        {
            Id            = Guid.NewGuid(),
            CreatorId     = creatorId,
            Title         = request.Title,
            CoverImageUrl = request.CoverImageUrl,
            Topic         = request.Topic,
            IsPublic      = request.IsPublic,
            CreatedAt     = DateTime.UtcNow,
            UpdatedAt     = DateTime.UtcNow,
        };

        _db.Quizzes.Add(quiz);
        await _db.SaveChangesAsync();

        // Invalidate public list cache since a new quiz may be public
        await InvalidatePublicQuizCacheAsync();

        return new QuizSummaryDto(
            quiz.Id, quiz.Title, quiz.CoverImageUrl, quiz.Topic, quiz.IsPublic,
            0, quiz.CreatedAt, creator.Nickname, creator.AvatarUrl);
    }

    // ── UPDATE QUIZ ─────────────────────────────────────────────────────
    public async Task<QuizSummaryDto> UpdateQuizAsync(Guid creatorId, Guid quizId, UpdateQuizRequest request)
    {
        var quiz = await _db.Quizzes.Include(q => q.Creator).FirstOrDefaultAsync(q => q.Id == quizId)
            ?? throw new KeyNotFoundException("Không tìm thấy bộ đề.");

        if (quiz.CreatorId != creatorId) throw new UnauthorizedAccessException("Bạn không có quyền sửa bộ đề này.");

        if (request.Title != null) quiz.Title = request.Title;
        if (request.CoverImageUrl != null) quiz.CoverImageUrl = request.CoverImageUrl;
        if (request.Topic != null) quiz.Topic = request.Topic;
        if (request.IsPublic.HasValue) quiz.IsPublic = request.IsPublic.Value;

        if (request.Slides != null)
        {
            var existingSlides = await _db.Slides
                .Include(s => s.Options)
                .Where(s => s.QuizId == quizId)
                .ToListAsync();
            _db.Slides.RemoveRange(existingSlides);

            int orderIdx = 0;
            foreach (var req in request.Slides)
            {
                var slide = new Slide
                {
                    Id            = Guid.NewGuid(),
                    QuizId        = quiz.Id,
                    Type          = req.Type,
                    QuestionText  = req.QuestionText?.Trim() ?? "",
                    TimeLimit     = req.TimeLimit > 0 ? req.TimeLimit : 30,
                    Points        = req.Points > 0 ? req.Points : 1000,
                    Status        = req.Status ?? "PUBLISHED",
                    OrderIndex    = req.OrderIndex ?? orderIdx++,
                    IsAIGenerated = req.IsAIGenerated,
                    CreatedAt     = DateTime.UtcNow,
                };

                if (req.Options != null)
                {
                    int optIdx = 0;
                    foreach (var opt in req.Options)
                    {
                        slide.Options.Add(new SlideOption
                        {
                            Id            = Guid.NewGuid(),
                            SlideId       = slide.Id,
                            Content       = opt.Content?.Trim() ?? "",
                            IsCorrect     = opt.IsCorrect,
                            MatchingPair  = opt.MatchingPair?.Trim(),
                            BlankKeywords = opt.BlankKeywords?.Trim(),
                            OrderIndex    = optIdx++
                        });
                    }
                }
                _db.Slides.Add(slide);
            }
        }

        quiz.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await InvalidatePublicQuizCacheAsync();
        _cache.Remove($"{QuizDetailPrefix}{quizId}"); // Invalidate specific quiz cache

        return new QuizSummaryDto(
            quiz.Id, quiz.Title, quiz.CoverImageUrl, quiz.Topic, quiz.IsPublic,
            0, quiz.CreatedAt, quiz.Creator.Nickname, quiz.Creator.AvatarUrl);
    }

    // ── DELETE QUIZ ─────────────────────────────────────────────────────
    public async Task DeleteQuizAsync(Guid creatorId, Guid quizId)
    {
        var quiz = await _db.Quizzes.FindAsync(quizId)
            ?? throw new KeyNotFoundException("Không tìm thấy bộ đề.");

        var user = await _db.Users.FindAsync(creatorId);
        bool isAdmin = user?.IsAdmin ?? false;
        if (!isAdmin && quiz.CreatorId != creatorId) throw new UnauthorizedAccessException("Bạn không có quyền xóa bộ đề này.");

        quiz.IsDeleted = true;
        _db.Quizzes.Update(quiz);
        await _db.SaveChangesAsync();

        await InvalidatePublicQuizCacheAsync();
        _cache.Remove($"{QuizDetailPrefix}{quizId}");
    }

    // ── CLONE QUIZ ─────────────────────────────────────────────────────
    public async Task<QuizSummaryDto> CloneQuizAsync(Guid userId, Guid originalQuizId)
    {
        var original = await _db.Quizzes
            .AsNoTracking()
            .Include(q => q.Slides)
                .ThenInclude(s => s.Options)
            .FirstOrDefaultAsync(q => q.Id == originalQuizId)
            ?? throw new KeyNotFoundException("Không tìm thấy bộ đề gốc.");

        if (!original.IsPublic && original.CreatorId != userId)
        {
            throw new UnauthorizedAccessException("Bộ đề này không được phép nhân bản.");
        }

        var creator = await _db.Users.FindAsync(userId);
        var newQuiz = new Quiz
        {
            Id = Guid.NewGuid(),
            CreatorId = userId,
            Title = original.Title + " (Clone)",
            CoverImageUrl = original.CoverImageUrl,
            Topic = original.Topic,
            IsPublic = false, // Cloned quiz is private by default
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Slides = original.Slides.Select(s => new Slide
            {
                Id = Guid.NewGuid(),
                Type = s.Type,
                QuestionText = s.QuestionText,
                TimeLimit = s.TimeLimit,
                Points = s.Points,
                Status = "PUBLISHED", // Inherit but auto publish
                OrderIndex = s.OrderIndex,
                IsAIGenerated = false, // It's cloned, not raw AI anymore
                Options = s.Options.Select(o => new SlideOption
                {
                    Id = Guid.NewGuid(),
                    Content = o.Content,
                    IsCorrect = o.IsCorrect,
                    MatchingPair = o.MatchingPair,
                    BlankKeywords = o.BlankKeywords,
                    OrderIndex = o.OrderIndex
                }).ToList()
            }).ToList()
        };

        _db.Quizzes.Add(newQuiz);
        await _db.SaveChangesAsync();

        return new QuizSummaryDto(
            newQuiz.Id, newQuiz.Title, newQuiz.CoverImageUrl, newQuiz.Topic, newQuiz.IsPublic,
            newQuiz.Slides.Count, newQuiz.CreatedAt, creator!.Nickname, creator.AvatarUrl);
    }

    // ── APPROVE AI SLIDE ───────────────────────────────────────────────
    public async Task ApproveAISlideAsync(Guid creatorId, Guid quizId, Guid slideId)
    {
        var slide = await _db.Slides.Include(s => s.Quiz).FirstOrDefaultAsync(s => s.Id == slideId && s.QuizId == quizId)
            ?? throw new KeyNotFoundException("Không tìm thấy slide.");

        if (slide.Quiz.CreatorId != creatorId) throw new UnauthorizedAccessException("Bạn không có quyền sửa bộ đề này.");

        slide.Status = "PUBLISHED";
        await _db.SaveChangesAsync();

        _cache.Remove($"{QuizDetailPrefix}{quizId}");
    }

    // ── BULK SAVE SLIDES (XÁC NHẬN & LƯU TỪ AI) ────────────────────────
    public async Task BulkSaveSlidesAsync(Guid creatorId, Guid quizId, IEnumerable<CreateSlideRequest> requests)
    {
        var quiz = await _db.Quizzes.Include(q => q.Slides).FirstOrDefaultAsync(q => q.Id == quizId)
            ?? throw new KeyNotFoundException("Không tìm thấy bộ đề.");

        if (quiz.CreatorId != creatorId) throw new UnauthorizedAccessException("Bạn không có quyền sửa bộ đề này.");

        int startIndex = quiz.Slides.Count;
        foreach (var req in requests)
        {
            var slide = new Slide
            {
                Id            = Guid.NewGuid(),
                QuizId        = quiz.Id,
                Type          = req.Type,
                QuestionText  = req.QuestionText,
                TimeLimit     = req.TimeLimit,
                Points        = req.Points,
                Status        = req.Status ?? "PUBLISHED",
                OrderIndex    = req.OrderIndex ?? startIndex++,
                IsAIGenerated = req.IsAIGenerated,
                CreatedAt     = DateTime.UtcNow,
            };

            if (req.Options != null)
            {
                foreach (var opt in req.Options)
                {
                    slide.Options.Add(new SlideOption
                    {
                        Id = Guid.NewGuid(),
                        Content = opt.Content,
                        IsCorrect = opt.IsCorrect,
                        MatchingPair = opt.MatchingPair,
                        BlankKeywords = opt.BlankKeywords,
                        OrderIndex = slide.Options.Count
                    });
                }
            }

            _db.Slides.Add(slide);
        }

        quiz.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _cache.Remove($"{QuizDetailPrefix}{quizId}");
    }

    // ── CACHE INVALIDATION ──────────────────────────────────────────────
    public Task InvalidatePublicQuizCacheAsync()
    {
        _cache.Remove(PublicQuizzesCacheKey);
        _logger.LogInformation("Cache INVALIDATED: {Key}", PublicQuizzesCacheKey);
        return Task.CompletedTask;
    }
}
