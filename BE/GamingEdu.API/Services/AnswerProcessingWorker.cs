using System.Threading.Channels;
using GamingEdu.API.DTOs;
using GamingEdu.API.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

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

                // 1. Chấm điểm ngầm (cập nhật kết quả bài làm vào DB và SortedSet Leaderboard)
                var result = await roomService.SubmitAnswerAsync(payload.RoomPlayerId, payload.Request);

                var db = scope.ServiceProvider.GetRequiredService<GamingEdu.API.Data.ApplicationDbContext>();
                var room = await db.Rooms.AsNoTracking().FirstOrDefaultAsync(r => r.Id == payload.RoomId, stoppingToken);
                bool isTournamentMode = room != null && room.Mode == "ASYNC_TOURNAMENT";
                bool isRoomFinished = room != null && room.Status == "FINISHED";

                if (isTournamentMode && !isRoomFinished)
                {
                    // Chế độ Giải đấu (ASYNC_TOURNAMENT) khi phòng chưa kết thúc:
                    // Chấm điểm ngầm, KHÓA xem điểm/đáp án/thứ hạng cho đến khi Host kết thúc phòng chơi
                    var maskedResult = new AnswerResultDto(
                        IsCorrect: false,
                        ScoreAwarded: 0,
                        TotalScore: 0,
                        CorrectAnswer: "Được bảo mật cho đến khi Host kết thúc giải đấu.",
                        Rank: 0,
                        RankChange: 0,
                        IsTournamentLocked: true
                    );

                    await _hubContext.Clients.Client(payload.ConnectionId).SendAsync("AnswerRecorded", new
                    {
                        payload.Request.SlideId,
                        Message = "Đã ghi nhận bài nộp thành công. Điểm số và bảng xếp hạng được bảo mật cho đến khi Host kết thúc giải đấu.",
                        IsTournamentLocked = true
                    }, cancellationToken: stoppingToken);

                    // Trả về masked result qua event AnswerResult để client cập nhật trạng thái đã nộp
                    await _hubContext.Clients.Client(payload.ConnectionId).SendAsync("AnswerResult", maskedResult, cancellationToken: stoppingToken);

                    // KHÔNG broadcast LeaderboardUpdate ra phòng
                }
                else
                {
                    // 2. Chế độ thông thường hoặc phòng đã FINISHED:
                    // Gửi kết quả về cho cá nhân
                    await _hubContext.Clients.Client(payload.ConnectionId).SendAsync("AnswerResult", result, cancellationToken: stoppingToken);

                    // 3. Xử lý WordCloud hoặc Leaderboard Update (broadcast cho cả phòng)
                    var slide = await db.Slides.FindAsync(new object[] { payload.Request.SlideId }, cancellationToken: stoppingToken);

                    if (slide != null && slide.Type == "WORD_CLOUD")
                    {
                        var wordCloudData = await roomService.GetWordCloudDataAsync(payload.RoomId, payload.Request.SlideId);
                        await _hubContext.Clients.Group(payload.GroupName).SendAsync("WordCloudUpdated", wordCloudData, cancellationToken: stoppingToken);
                    }
                    else
                    {
                        var leaderboard = await roomService.GetLeaderboardAsync(payload.RoomId, top: 10);
                        await _hubContext.Clients.Group(payload.GroupName).SendAsync("LeaderboardUpdated", leaderboard, cancellationToken: stoppingToken);
                    }

                    // 4. Phát sóng tiến độ nộp bài và phân bổ đáp án (Answer Distribution) thời gian thực
                    var distribution = await roomService.GetSlideAnswerDistributionAsync(payload.RoomId, payload.Request.SlideId);
                    var theme = await roomService.GetRoomThemeAsync(payload.RoomId);
                    BattleRoyaleStateDto? survival = null;
                    if (theme == "BATTLE_ROYALE")
                    {
                        survival = await roomService.GetBattleRoyaleStateAsync(payload.RoomId);
                    }

                    WagerPoolStateDto? wagerPool = null;
                    if (theme == "QUIZ_WAGER")
                    {
                        wagerPool = await roomService.GetWagerPoolStateAsync(payload.RoomId, payload.Request.SlideId);
                    }

                    BombDefusalStateDto? bombDefusal = null;
                    if (theme == "DEFUSE_BOMB")
                    {
                        bombDefusal = await roomService.GetBombDefusalStateAsync(payload.RoomId, payload.Request.SlideId);
                    }

                    WordHunterStateDto? wordHunter = null;
                    if (theme == "WORD_HUNTER")
                    {
                        wordHunter = await roomService.GetWordHunterStateAsync(payload.RoomId, payload.Request.SlideId);
                    }

                    BridgeBuilderStateDto? bridgeBuilder = null;
                    if (theme == "BRIDGE_BUILDER")
                    {
                        bridgeBuilder = await roomService.GetBridgeBuilderStateAsync(payload.RoomId, payload.Request.SlideId);
                    }

                    await _hubContext.Clients.Group(payload.GroupName).SendAsync("AnswerCountUpdated", new
                    {
                        SlideId = payload.Request.SlideId,
                        AnsweredCount = distribution.TotalAnswers,
                        TotalPlayers = distribution.TotalPlayers,
                        Distribution = distribution,
                        BattleRoyale = survival,
                        WagerPool = wagerPool,
                        BombDefusal = bombDefusal,
                        WordHunter = wordHunter,
                        BridgeBuilder = bridgeBuilder
                    }, cancellationToken: stoppingToken);

                    if (survival != null)
                    {
                        await _hubContext.Clients.Group(payload.GroupName).SendAsync("SurvivalStatusUpdated", survival, cancellationToken: stoppingToken);
                    }

                    if (wagerPool != null)
                    {
                        await _hubContext.Clients.Group(payload.GroupName).SendAsync("WagerPoolUpdated", wagerPool, cancellationToken: stoppingToken);
                    }

                    if (bombDefusal != null)
                    {
                        await _hubContext.Clients.Group(payload.GroupName).SendAsync("BombDefusalUpdated", bombDefusal, cancellationToken: stoppingToken);
                    }

                    if (wordHunter != null)
                    {
                        await _hubContext.Clients.Group(payload.GroupName).SendAsync("WordHunterUpdated", wordHunter, cancellationToken: stoppingToken);
                    }

                    if (bridgeBuilder != null)
                    {
                        await _hubContext.Clients.Group(payload.GroupName).SendAsync("BridgeBuilderUpdated", bridgeBuilder, cancellationToken: stoppingToken);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing answer for PlayerId {PlayerId}", payload.RoomPlayerId);
            }
        }
    }
}
