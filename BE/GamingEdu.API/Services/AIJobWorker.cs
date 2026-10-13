using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;
using GamingEdu.API.Hubs;
using Microsoft.AspNetCore.SignalR;

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
            await ProcessSingleJobAsync(db, job, geminiService, cache, hub, ct);
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

    private async Task ProcessSingleJobAsync(ApplicationDbContext db, AIJob job, IGeminiApiService geminiService, ICacheStore cache, IHubContext<NotificationHub> hub, CancellationToken ct)
    {
        // ── Step 1: Mark as PROCESSING ───────────────────────────────
        job.Status = "PROCESSING";
        await db.SaveChangesAsync(ct);
        await PushAsync(hub, job, "AIJobProgress");
        _logger.LogInformation("AI Job {JobId}: PROCESSING (file: {FileUrl})", job.Id, job.FileUrl);

        try
        {
            // ── Step 2: Generate AI content via Gemini API ─────────
            var prompt = $"Vui lòng phân tích tài liệu/từ khóa sau và tạo ra 5 câu hỏi trắc nghiệm: {job.FileUrl}";
            var jsonDraft = await geminiService.GenerateQuizJsonAsync(prompt, job.FileUrl);

            // ── Step 3: Lưu Draft vào Cache để FE gọi lên lấy ─────
            var draftKey = $"ai_draft:{job.Id}";
            await cache.SetStringAsync(draftKey, jsonDraft, TimeSpan.FromHours(24));

            // ── Step 4: Mark COMPLETED ───────────────────────────────
            job.Status      = "COMPLETED";
            job.CompletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            _logger.LogInformation("AI Job {JobId}: COMPLETED, Draft saved to Cache", job.Id);

            // ── Step 5: Reset daily quota if needed ─────────────────
            var quota = await db.UserQuotas.FirstOrDefaultAsync(q => q.UserId == job.UserId, ct);
            if (quota is not null)
            {
                quota.AIUsedToday++;
                await db.SaveChangesAsync(ct);
            }

            // ── Step 6: Thông báo realtime cho Host (FE mở bản nháp để xem trước) ──
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
            // ── Step 5: Mark FAILED ──────────────────────────────────
            job.Status       = "FAILED";
            job.ErrorMessage = ex.Message;
            job.CompletedAt  = DateTime.UtcNow;
            await db.SaveChangesAsync(CancellationToken.None);
            _logger.LogError(ex, "AI Job {JobId}: FAILED", job.Id);
            await PushAsync(hub, job, "AIJobFailed");
        }
    }
}
