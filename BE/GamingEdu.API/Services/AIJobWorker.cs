using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services;

/// <summary>
/// Hosted background service that polls AI jobs from DB (Mocking RabbitMQ),
/// processes them (simulated AI generation), and updates status to COMPLETED/FAILED.
/// </summary>
public class AIJobWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AIJobWorker> _logger;

    public AIJobWorker(IServiceScopeFactory scopeFactory, ILogger<AIJobWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AI Job Worker started. Polling DB every 10s.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                var job = await db.AIJobs.FirstOrDefaultAsync(j => j.Status == "PENDING", stoppingToken);
                if (job != null)
                {
                    await ProcessSingleJobAsync(db, job, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing AI job polling");
            }

            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }

    private async Task ProcessSingleJobAsync(ApplicationDbContext db, AIJob job, CancellationToken ct)
    {
        // ── Step 1: Mark as PROCESSING ───────────────────────────────
        job.Status = "PROCESSING";
        await db.SaveChangesAsync(ct);
        _logger.LogInformation("AI Job {JobId}: PROCESSING (file: {FileUrl})", job.Id, job.FileUrl);

        try
        {
            // ── Step 2: Simulate AI generation (2–5s delay) ─────────
            var processingTime = TimeSpan.FromSeconds(Random.Shared.Next(2, 6));
            await Task.Delay(processingTime, ct);

            // ── Step 3: Simulate generating slides into the Quiz ─────
            if (job.QuizId.HasValue)
            {
                var quiz = await db.Quizzes
                    .Include(q => q.Slides)
                    .FirstOrDefaultAsync(q => q.Id == job.QuizId, ct);

                if (quiz is not null)
                {
                    // Mock: generate 5 AI slides
                    int startIndex = quiz.Slides.Count;
                    for (int i = 0; i < 5; i++)
                    {
                        var slide = new Slide
                        {
                            Id            = Guid.NewGuid(),
                            QuizId        = quiz.Id,
                            Type          = "QUIZ",
                            QuestionText  = $"[AI] Câu hỏi {startIndex + i + 1} được tạo tự động từ tài liệu.",
                            TimeLimit     = 30,
                            Points        = 1000,
                            Status        = "DRAFT",
                            OrderIndex    = startIndex + i,
                            IsAIGenerated = true,
                            CreatedAt     = DateTime.UtcNow,
                        };

                        // Add mock options (A, B, C, D)
                        var options = new[]
                        {
                            new SlideOption { Id = Guid.NewGuid(), SlideId = slide.Id,
                                Content = "Đáp án A (AI generated)", IsCorrect = true,  OrderIndex = 0 },
                            new SlideOption { Id = Guid.NewGuid(), SlideId = slide.Id,
                                Content = "Đáp án B (AI generated)", IsCorrect = false, OrderIndex = 1 },
                            new SlideOption { Id = Guid.NewGuid(), SlideId = slide.Id,
                                Content = "Đáp án C (AI generated)", IsCorrect = false, OrderIndex = 2 },
                            new SlideOption { Id = Guid.NewGuid(), SlideId = slide.Id,
                                Content = "Đáp án D (AI generated)", IsCorrect = false, OrderIndex = 3 },
                        };

                        db.Slides.Add(slide);
                        db.SlideOptions.AddRange(options);
                    }

                    quiz.UpdatedAt = DateTime.UtcNow;
                }
            }

            // ── Step 4: Mark COMPLETED ───────────────────────────────
            job.Status      = "COMPLETED";
            job.CompletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            _logger.LogInformation("AI Job {JobId}: COMPLETED in {Ms}ms",
                job.Id, processingTime.TotalMilliseconds);

            // ── Step 5: Reset daily quota if needed ─────────────────
            var quota = await db.UserQuotas.FirstOrDefaultAsync(q => q.UserId == job.UserId, ct);
            if (quota is not null)
            {
                quota.AIUsedToday++;
                await db.SaveChangesAsync(ct);
            }
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
        }
    }
}
