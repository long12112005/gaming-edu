using System.Threading.Channels;
using GamingEdu.API.DTOs;
using GamingEdu.API.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GamingEdu.API.Services;

// Payload for the queue
public record AnswerQueuePayload(
    Guid RoomPlayerId,
    Guid RoomId,
    string ConnectionId,
    string GroupName,
    SubmitAnswerRequest Request
);

// Channel-based Queue
public class AnswerQueueService
{
    private readonly Channel<AnswerQueuePayload> _queue;

    public AnswerQueueService(int capacity = 10000)
    {
        var options = new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _queue = Channel.CreateBounded<AnswerQueuePayload>(options);
    }

    public async ValueTask QueueAnswerAsync(AnswerQueuePayload payload, CancellationToken cancellationToken = default)
    {
        await _queue.Writer.WriteAsync(payload, cancellationToken);
    }

    public IAsyncEnumerable<AnswerQueuePayload> DequeueAnswersAsync(CancellationToken cancellationToken = default)
    {
        return _queue.Reader.ReadAllAsync(cancellationToken);
    }
}

// Background Worker
public class AnswerProcessingWorker : BackgroundService
{
    private readonly AnswerQueueService _queue;
    private readonly IServiceProvider _serviceProvider;
    private readonly IHubContext<GameHub> _hubContext;
    private readonly ILogger<AnswerProcessingWorker> _logger;

    public AnswerProcessingWorker(
        AnswerQueueService queue,
        IServiceProvider serviceProvider,
        IHubContext<GameHub> hubContext,
        ILogger<AnswerProcessingWorker> logger)
    {
        _queue = queue;
        _serviceProvider = serviceProvider;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AnswerProcessingWorker is running.");

        await foreach (var payload in _queue.DequeueAnswersAsync(stoppingToken))
        {
            try
            {
                // Create a new scope for scoped services (like EF Core DbContext)
                using var scope = _serviceProvider.CreateScope();
                var roomService = scope.ServiceProvider.GetRequiredService<IRoomService>();

                // 1. Chấm điểm
                var result = await roomService.SubmitAnswerAsync(payload.RoomPlayerId, payload.Request);

                // 2. Gửi kết quả về cho cá nhân
                await _hubContext.Clients.Client(payload.ConnectionId).SendAsync("AnswerResult", result, cancellationToken: stoppingToken);

                // 3. Xử lý WordCloud hoặc Leaderboard Update (broadcast cho cả phòng)
                var quizService = scope.ServiceProvider.GetRequiredService<IQuizService>();
                // Need to get Slide Type
                var db = scope.ServiceProvider.GetRequiredService<GamingEdu.API.Data.ApplicationDbContext>();
                var slide = await db.Slides.FindAsync(new object[] { payload.Request.SlideId }, cancellationToken: stoppingToken);

                if (slide != null && slide.Type == "WORD_CLOUD")
                {
                    var wordCloudData = await roomService.GetWordCloudDataAsync(payload.RoomId, payload.Request.SlideId);
                    await _hubContext.Clients.Group(payload.GroupName).SendAsync("WordCloudUpdated", wordCloudData, cancellationToken: stoppingToken);
                }
                else
                {
                    var leaderboard = await roomService.GetLeaderboardAsync(payload.RoomId);
                    await _hubContext.Clients.Group(payload.GroupName).SendAsync("LeaderboardUpdated", leaderboard, cancellationToken: stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing answer for PlayerId {PlayerId}", payload.RoomPlayerId);
            }
        }
    }
}
