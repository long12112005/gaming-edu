using System.Text.Json;
using System.Text.Json.Serialization;
using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;
using GamingEdu.API.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;

namespace GamingEdu.API.Services;

/// <summary>
/// Hosted background service that polls ai_jobs table for PENDING jobs,
/// processes them (simulated AI generation), and updates status to COMPLETED/FAILED.
/// </summary>
public class AIJobWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AIJobWorker> _logger;
    private readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(10);

    public AIJobWorker(IServiceScopeFactory scopeFactory, ILogger<AIJobWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AI Job Worker started. Polling every {Interval}s",
            _pollInterval.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingJobsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Unhandled error in AI Job Worker");
            }

            await Task.Delay(_pollInterval, stoppingToken);
        }

        _logger.LogInformation("AI Job Worker stopped.");
    }

    private async Task ProcessPendingJobsAsync(CancellationToken ct)
    {
        // Use a new scope per cycle (DbContext is scoped, not singleton)
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var geminiService = scope.ServiceProvider.GetRequiredService<IGeminiApiService>();
        var cache = scope.ServiceProvider.GetRequiredService<ICacheStore>();
        var hub = scope.ServiceProvider.GetRequiredService<IHubContext<NotificationHub>>();
        var memCache = scope.ServiceProvider.GetService<IMemoryCache>();

        // Query PENDING jobs from ai_jobs table (idx_ai_jobs_status index used)
        var pendingJobs = await db.AIJobs
            .Where(j => j.Status == "PENDING")
            .OrderBy(j => j.CreatedAt)
            .Take(5) // process up to 5 per cycle to avoid blocking
            .ToListAsync(ct);

        if (!pendingJobs.Any())
        {
            _logger.LogDebug("No PENDING AI jobs found.");
            return;
        }

        _logger.LogInformation("Processing {Count} pending AI jobs", pendingJobs.Count);

        foreach (var job in pendingJobs)
        {
            await ProcessSingleJobAsync(db, job, geminiService, cache, hub, memCache, ct);
        }
    }

    /// <summary>
    /// Đẩy trạng thái job tới đúng người dùng qua SignalR (group user_{id} của NotificationHub)
    /// thay cho việc frontend gọi lặp để hỏi trạng thái. Lỗi gửi không được làm hỏng job.
    /// </summary>
    private async Task PushAsync(IHubContext<NotificationHub> hub, AIJob job, string eventName, object? extra = null)
    {
        try
        {
            await hub.Clients.Group($"user_{job.UserId}").SendAsync(eventName, new
            {
                JobId  = job.Id,
                Status = job.Status,
                Error  = job.ErrorMessage,
                Extra  = extra,
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không đẩy được {Event} cho job {JobId}", eventName, job.Id);
        }
    }

    private async Task ProcessSingleJobAsync(
        ApplicationDbContext db,
        AIJob job,
        IGeminiApiService geminiService,
        ICacheStore cache,
        IHubContext<NotificationHub> hub,
        IMemoryCache? memCache,
        CancellationToken ct)
    {
        // ── Step 1: Mark as PROCESSING ───────────────────────────────
        job.Status = "PROCESSING";
        await db.SaveChangesAsync(ct);
        await PushAsync(hub, job, "AIJobProgress");
        _logger.LogInformation("AI Job {JobId}: PROCESSING (file: {FileUrl})", job.Id, job.FileUrl);

        try
        {
            // ── Step 2: Generate AI content via Gemini API ─────────
            var prompt = $"Vui lòng phân tích tài liệu/từ khóa sau và tạo ra 3-5 câu hỏi trắc nghiệm, điền khuyết và ghép cặp chất lượng: {job.FileUrl}";
            var localFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", job.FileUrl.TrimStart('/'));
            if (File.Exists(localFilePath))
            {
                var ext = Path.GetExtension(localFilePath).ToLowerInvariant();
                if (ext == ".txt")
                {
                    var textContent = await File.ReadAllTextAsync(localFilePath, ct);
                    if (!string.IsNullOrWhiteSpace(textContent))
                    {
                        if (textContent.Length > 20000) textContent = textContent[..20000];
                        prompt = $"Vui lòng phân tích nội dung tài liệu sau và tạo ra 3-5 câu hỏi đa dạng (Trắc nghiệm QUIZ, Điền khuyết FILL_IN_BLANK, Ghép cặp MATCHING):\n\n{textContent}";
                    }
                }
            }

            var jsonDraft = await geminiService.GenerateQuizJsonAsync(prompt, job.FileUrl);

            // ── Step 3: Lưu Draft vào Cache để dự phòng ─────
            var draftKey = $"ai_draft:{job.Id}";
            await cache.SetStringAsync(draftKey, jsonDraft, TimeSpan.FromHours(24));

            // ── Step 4: Deserialize JSON và lưu trực tiếp các Slide DRAFT vào CSDL ──
            try
            {
                var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var generatedSlides = JsonSerializer.Deserialize<List<GeneratedSlideDto>>(jsonDraft, jsonOptions);

                if (job.QuizId.HasValue && job.QuizId.Value != Guid.Empty && generatedSlides is { Count: > 0 })
                {
                    var quizId = job.QuizId.Value;
                    int currentMaxOrder = await db.Slides
                        .Where(s => s.QuizId == quizId)
                        .Select(s => (int?)s.OrderIndex)
                        .MaxAsync(ct) ?? -1;

                    var newSlides = new List<Slide>();
                    foreach (var gSlide in generatedSlides)
                    {
                        if (string.IsNullOrWhiteSpace(gSlide.QuestionText)) continue;

                        currentMaxOrder++;
                        var slideType = string.IsNullOrWhiteSpace(gSlide.Type) ? "QUIZ" : gSlide.Type.ToUpperInvariant();
                        var slide = new Slide
                        {
                            Id = Guid.NewGuid(),
                            QuizId = quizId,
                            Type = slideType,
                            QuestionText = gSlide.QuestionText.Trim(),
                            TimeLimit = gSlide.TimeLimit > 0 ? gSlide.TimeLimit : 30,
                            Points = gSlide.Points > 0 ? gSlide.Points : 1000,
                            Status = "DRAFT", // Trạng thái DRAFT chờ Host kiểm duyệt (Human-in-the-loop)
                            OrderIndex = currentMaxOrder,
                            IsAIGenerated = true,
                            CreatedAt = DateTime.UtcNow,
                        };

                        if (gSlide.Options is { Count: > 0 })
                        {
                            for (int i = 0; i < gSlide.Options.Count; i++)
                            {
                                var opt = gSlide.Options[i];
                                if (string.IsNullOrWhiteSpace(opt.Content)) continue;

                                slide.Options.Add(new SlideOption
                                {
                                    Id = Guid.NewGuid(),
                                    SlideId = slide.Id,
                                    Content = opt.Content.Trim(),
                                    IsCorrect = opt.IsCorrect,
                                    MatchingPair = opt.MatchingPair?.Trim(),
                                    BlankKeywords = opt.BlankKeywords?.Trim(),
                                    OrderIndex = i,
                                });
                            }
                        }

                        newSlides.Add(slide);
                    }

                    if (newSlides.Count > 0)
                    {
                        db.Slides.AddRange(newSlides);
                        await db.SaveChangesAsync(ct);

                        // Invalidate cache của quiz để GET /quizzes/{id} nhận ngay slides mới
                        memCache?.Remove($"quiz_detail_{quizId}");
                        _logger.LogInformation("AI Job {JobId}: Đã tạo thành công {Count} câu hỏi DRAFT trong CSDL cho Quiz {QuizId}",
                            job.Id, newSlides.Count, quizId);
                    }
                }
            }
            catch (Exception parseEx)
            {
                _logger.LogWarning(parseEx, "AI Job {JobId}: Lỗi phân tích JSON kết quả AI, vẫn lưu draft vào cache", job.Id);
            }

            // ── Step 5: Mark COMPLETED ───────────────────────────────
            job.Status      = "COMPLETED";
            job.CompletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            _logger.LogInformation("AI Job {JobId}: COMPLETED", job.Id);

            // ── Step 6: Tăng biến đếm Quota AI trong ngày ───────────
            var quota = await db.UserQuotas.FirstOrDefaultAsync(q => q.UserId == job.UserId, ct);
            if (quota is not null)
            {
                quota.AIUsedToday++;
                await db.SaveChangesAsync(ct);
            }

            // ── Step 7: Bắn thông báo Realtime qua SignalR cho Host ──
            await PushAsync(hub, job, "AIJobCompleted");
        }
        catch (OperationCanceledException)
        {
            // Graceful shutdown: re-queue to PENDING so next startup picks it up
            job.Status       = "PENDING";
            job.ErrorMessage = "Worker stopped during processing.";
            await db.SaveChangesAsync(CancellationToken.None);
            throw;
        }
        catch (Exception ex)
        {
            // ── Step 8: Mark FAILED ──────────────────────────────────
            job.Status       = "FAILED";
            job.ErrorMessage = ex.Message;
            job.CompletedAt  = DateTime.UtcNow;
            await db.SaveChangesAsync(CancellationToken.None);
            _logger.LogError(ex, "AI Job {JobId}: FAILED", job.Id);
            await PushAsync(hub, job, "AIJobFailed");
        }
    }
}

public class GeneratedSlideDto
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "QUIZ";

    [JsonPropertyName("questionText")]
    public string QuestionText { get; set; } = string.Empty;

    [JsonPropertyName("timeLimit")]
    public int TimeLimit { get; set; } = 30;

    [JsonPropertyName("points")]
    public int Points { get; set; } = 1000;

    [JsonPropertyName("options")]
    public List<GeneratedOptionDto> Options { get; set; } = [];
}

public class GeneratedOptionDto
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("isCorrect")]
    public bool IsCorrect { get; set; } = false;

    [JsonPropertyName("matchingPair")]
    public string? MatchingPair { get; set; }

    [JsonPropertyName("blankKeywords")]
    public string? BlankKeywords { get; set; }

    [JsonPropertyName("orderIndex")]
    public int OrderIndex { get; set; } = 0;
}
