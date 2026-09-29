using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GamingEdu.API.Services;

public interface IQuizService
{
    Task<IEnumerable<QuizSummaryDto>> GetPublicQuizzesAsync();
    Task<QuizDetailDto?> GetQuizDetailAsync(Guid quizId);
    Task<QuizSummaryDto> CreateQuizAsync(Guid creatorId, CreateQuizRequest request);
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
            .SetPriority(CacheItemPriority.Normal);

        _cache.Set(PublicQuizzesCacheKey, quizzes, cacheOptions);
        return quizzes;
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
            .SetAbsoluteExpiration(TimeSpan.FromMinutes(30));

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

    // ── CACHE INVALIDATION ──────────────────────────────────────────────
    public Task InvalidatePublicQuizCacheAsync()
    {
        _cache.Remove(PublicQuizzesCacheKey);
        _logger.LogInformation("Cache INVALIDATED: {Key}", PublicQuizzesCacheKey);
        return Task.CompletedTask;
    }
}
