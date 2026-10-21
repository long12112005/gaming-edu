using System.Security.Claims;
using GamingEdu.API.DTOs;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace GamingEdu.API.Hubs;

/// <summary>
/// Real-time Game Hub using SignalR.
/// Group naming convention: "room_{pinCode}"
/// 
/// Client-to-Server methods (called by clients):
///   JoinRoom, LeaveRoom, StartGame, NextSlide, SubmitAnswer, RequestLeaderboard
///
/// Server-to-Client events (pushed by server):
///   PlayerJoined, GameStarted, SlideStarted, AnswerResult, LeaderboardUpdated,
///   GameEnded, Error
/// </summary>
public class GameHub : Hub
{
    private readonly IRoomService _roomService;
    private readonly IQuizService _quizService;
    private readonly ILogger<GameHub> _logger;
    private readonly AnswerQueueService _answerQueue;
    private readonly ISlideTimerService _timer;

    // In-memory room state (production: use Redis/distributed cache)
    private static readonly Dictionary<string, int> RoomSlideIndex = new();
    private static readonly HashSet<string> LockedRooms = new();

    public GameHub(
        IRoomService roomService,
        IQuizService quizService,
        ILogger<GameHub> logger,
        AnswerQueueService answerQueue,
        ISlideTimerService timer)
    {
        _roomService = roomService;
        _quizService  = quizService;
        _logger       = logger;
        _answerQueue  = answerQueue;
        _timer        = timer;
    }

    // ── CLIENT CONNECTIONS ─────────────────────────────────────────────
    public override async Task OnConnectedAsync()
    {
        _logger.LogDebug("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogDebug("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ── JOIN ROOM ──────────────────────────────────────────────────────
    // Maps to rooms.pin_code lookup + room_players insert
    // ═══════════════════════════════════════════════════════════════════
    public async Task JoinRoom(JoinRoomRequest request)
    {
        try
        {
            // Get userId from JWT claim (null = guest player)
            Guid? userId = null;
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(userIdClaim, out var parsed)) userId = parsed;

            if (LockedRooms.Contains(request.PinCode))
            {
                await SendErrorAsync("Phòng này đã bị khóa. Không thể tham gia.");
                return;
            }

            var (room, player) = await _roomService.JoinRoomAsync(userId, request);

            // Add connection to SignalR group for this room
            var groupName = $"room_{room.PinCode}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            // Store player info in connection context for later use
            Context.Items["RoomId"]      = room.Id;
            Context.Items["PlayerId"]    = player.Id;
            Context.Items["GroupName"]   = groupName;
            Context.Items["PinCode"]     = room.PinCode;

            _logger.LogInformation(
                "Player '{Nickname}' joined room {PinCode}", player.Nickname, room.PinCode);

            var theme = await _roomService.GetRoomThemeAsync(room.Id);

            // Confirm to the joining player
            await Clients.Caller.SendAsync("JoinedRoom", new
            {
                RoomId     = room.Id,
                PlayerId   = player.Id,
                PinCode    = room.PinCode,
                Mode       = room.Mode,
                QuizId     = room.QuizId,
                PlayerNickname = player.Nickname,
                Theme      = theme,
            });

            // Broadcast to all players in the room (including host)
            await Clients.Group(groupName).SendAsync("PlayerJoined", new
            {
                PlayerId     = player.Id,
                Nickname     = player.Nickname,
                AvatarUrl    = player.AvatarUrl,
                JoinedAt     = player.JoinedAt,
            });
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ── REJOIN ROOM (FAULT TOLERANCE / RECOVERY) ────────────────────────
    // Cho phép người chơi rớt mạng / F5 kết nối lại phòng
    // ═══════════════════════════════════════════════════════════════════
    public async Task RejoinRoom(string pinCode, Guid? playerId, string? nickname)
    {
        try
        {
            var playerData = await _roomService.RejoinRoomPlayerAsync(pinCode, playerId, nickname);
            if (playerData is null)
            {
                // Fallback: nếu phòng vẫn WAITING thì gọi JoinRoom thông thường
                await JoinRoom(new JoinRoomRequest(pinCode, nickname ?? "Player", null));
                return;
            }

            var groupName = $"room_{playerData.PinCode}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            Context.Items["RoomId"]    = playerData.RoomId;
            Context.Items["PlayerId"]  = playerData.PlayerId;
            Context.Items["GroupName"] = groupName;
            Context.Items["PinCode"]   = playerData.PinCode;

            // Lấy slide hiện tại nếu game đang chạy
            var currentSlideDto = await GetCurrentSlideAsync(playerData.RoomId, playerData.PinCode);
            bool hasAnswered = false;
            AnswerResultDto? previousResult = null;
            int remainingSeconds = 0;

            if (currentSlideDto != null)
            {
                var response = await _roomService.GetPlayerResponseAsync(playerData.PlayerId, currentSlideDto.SlideId);
                if (response != null)
                {
                    hasAnswered = true;
                    previousResult = new AnswerResultDto(
                        response.IsCorrect,
                        response.ScoreAwarded,
                        playerData.TotalScore,
                        "",
                        playerData.Rank,
                        0
                    );
                }

                // Check remaining timer
                var timerCheck = await _timer.CheckAsync(playerData.RoomId, playerData.PlayerId, currentSlideDto.SlideId);
                remainingSeconds = Math.Max(0, currentSlideDto.TimeLimit - (timerCheck.ElapsedMs / 1000));
            }

            await Clients.Caller.SendAsync("RejoinedRoom", new
            {
                playerData.RoomId,
                playerData.PlayerId,
                playerData.PinCode,
                playerData.Mode,
                playerData.Status,
                playerData.PlayerNickname,
                playerData.TotalScore,
                playerData.Rank,
                playerData.Theme,
                CurrentSlide = currentSlideDto,
                RemainingSeconds = remainingSeconds,
                HasAnswered = hasAnswered,
                PreviousResult = previousResult,
            });

            _logger.LogInformation("Player '{Nickname}' successfully rejoined room {PinCode}", playerData.PlayerNickname, playerData.PinCode);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    public async Task GetSlideDistribution(Guid roomId, Guid slideId)
    {
        try
        {
            var distribution = await _roomService.GetSlideAnswerDistributionAsync(roomId, slideId);
            await Clients.Caller.SendAsync("DistributionUpdated", distribution);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ── HOST JOIN ROOM ─────────────────────────────────────────────────
    // Host gắn kết nối vào phòng (không tạo room_players) để điều khiển game
    // ═══════════════════════════════════════════════════════════════════
    [Authorize]
    public async Task HostJoinRoom(string pinCode)
    {
        try
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var hostId))
            {
                await SendErrorAsync("Không xác định được chủ phòng.");
                return;
            }

            var room = await _roomService.GetRoomByPinAsync(pinCode);
            if (room is null)
            {
                await SendErrorAsync("Không tìm thấy phòng.");
                return;
            }
            if (room.HostId != hostId)
            {
                await SendErrorAsync("Bạn không phải chủ phòng này.");
                return;
            }

            var groupName = $"room_{room.PinCode}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            Context.Items["RoomId"]    = room.Id;
            Context.Items["GroupName"] = groupName;
            Context.Items["PinCode"]   = room.PinCode;

            var hostTheme = await _roomService.GetRoomThemeAsync(room.Id);

            // Gửi danh sách người chơi hiện có (phòng hợp lệ khi host F5 trang)
            var players = room.Players
                .OrderBy(p => p.JoinedAt)
                .Select(p => new { PlayerId = p.Id, p.Nickname, p.AvatarUrl, p.JoinedAt });
            await Clients.Caller.SendAsync("LoadPlayers", players);
            await Clients.Caller.SendAsync("HostJoined", new
            {
                RoomId   = room.Id,
                PinCode  = room.PinCode,
                Status   = room.Status,
                IsLocked = LockedRooms.Contains(room.PinCode),
                Theme    = hostTheme,
            });
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ── START GAME (HOST_PACED) ────────────────────────────────────────
    // Host calls this to transition room status from WAITING → PLAYING
    // ═══════════════════════════════════════════════════════════════════
    [Authorize]
    public async Task StartGame(Guid roomId)
    {
        try
        {
            // Update rooms.status = 'PLAYING', rooms.start_time = NOW
            await _roomService.UpdateRoomStatusAsync(roomId, "PLAYING");

            var pinCode   = Context.Items["PinCode"] as string ?? "";
            var groupName = $"room_{pinCode}";

            // Initialize slide index for this room
            RoomSlideIndex[pinCode] = 0;

            // Load first slide
            var slideDto = await GetCurrentSlideAsync(roomId, pinCode);
            if (slideDto is null)
            {
                await SendErrorAsync("Bộ đề không có câu hỏi nào.");
                return;
            }

            _logger.LogInformation("Game started in room {PinCode}", pinCode);

            // Broadcast GameStarted event to all room members
            await Clients.Group(groupName).SendAsync("GameStarted", new
            {
                RoomId  = roomId,
                Mode    = "HOST_PACED",
                Message = "Trò chơi bắt đầu!",
            });

            // Gửi luôn slide đầu tiên (nếu client tự xử lý UI, hoặc đã gọi StartCountdown trước)
            // Ghi mốc thời gian server cho câu hỏi đầu (chống gian lận)
            await _timer.StartRoomSlideAsync(roomId, slideDto.SlideId, slideDto.TimeLimit);
            await Clients.Group(groupName).SendAsync("SlideStarted", slideDto);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ── COUNTDOWN ──────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════
    [Authorize]
    public async Task StartCountdown(int seconds = 3)
    {
        var groupName = Context.Items["GroupName"] as string;
        if (!string.IsNullOrEmpty(groupName))
        {
            await Clients.Group(groupName).SendAsync("CountdownStarted", seconds);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ── KICK PLAYER & LOCK ROOM ────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════
    [Authorize]
    public async Task LockRoom(bool isLocked)
    {
        var pinCode = Context.Items["PinCode"] as string;
        if (!string.IsNullOrEmpty(pinCode))
        {
            if (isLocked) LockedRooms.Add(pinCode);
            else LockedRooms.Remove(pinCode);
            
            var groupName = Context.Items["GroupName"] as string;
            await Clients.Group(groupName!).SendAsync("RoomLockedStatusChanged", isLocked);
        }
    }

    [Authorize]
    public async Task KickPlayer(Guid playerIdToKick)
    {
        var roomId = Context.Items["RoomId"] as Guid?;
        if (roomId == null) return;

        // Xóa player khỏi Database (tùy chọn: đánh dấu BANNED)
        await _roomService.RemovePlayerAsync(roomId.Value, playerIdToKick);

        var groupName = Context.Items["GroupName"] as string;
        if (!string.IsNullOrEmpty(groupName))
        {
            await Clients.Group(groupName).SendAsync("PlayerKicked", playerIdToKick);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ── NEXT SLIDE (HOST_PACED) ────────────────────────────────────────
    // Host advances to the next question
    // ═══════════════════════════════════════════════════════════════════
    [Authorize]
    public async Task NextSlide(Guid roomId)
    {
        try
        {
            var pinCode   = Context.Items["PinCode"] as string ?? "";
            var groupName = $"room_{pinCode}";

            // Xử lý phạt timeout cho những người không nộp ở câu hỏi trước (cho Battle Royale)
            var prevSlide = await GetCurrentSlideAsync(roomId, pinCode);
            if (prevSlide != null)
            {
                await _roomService.ApplyBattleRoyaleTimeoutPenaltyAsync(roomId, prevSlide.SlideId);
            }

            // Increment slide index
            RoomSlideIndex.TryGetValue(pinCode, out int currentIdx);
            RoomSlideIndex[pinCode] = currentIdx + 1;

            var slideDto = await GetCurrentSlideAsync(roomId, pinCode);

            if (slideDto is null)
            {
                // No more slides → end game
                await EndGame(roomId);
                return;
            }

            await _timer.StartRoomSlideAsync(roomId, slideDto.SlideId, slideDto.TimeLimit);
            await Clients.Group(groupName).SendAsync("SlideStarted", slideDto);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ── SUBMIT ANSWER ──────────────────────────────────────────────────
    // Player submits an answer → graded → result + leaderboard broadcast
    // Saves to player_responses, updates room_players.total_score
    // ═══════════════════════════════════════════════════════════════════
    public async Task SubmitAnswer(SubmitAnswerRequest request)
    {
        try
        {
            if (Context.Items["PlayerId"] is not Guid playerId)
            {
                await SendErrorAsync("Không xác định được người chơi. Hãy tham gia phòng trước.");
                return;
            }

            // Thay vì gọi _roomService.SubmitAnswerAsync đồng bộ tại đây, 
            // đẩy vào Message Queue (Channel) để Worker chạy ngầm xử lý.
            var roomId = (Guid)Context.Items["RoomId"]!;
            var groupName = Context.Items["GroupName"] as string ?? "";

            // CHỐNG GIAN LẬN: thời gian trả lời do SERVER tính từ mốc đã ghi,
            // bỏ qua ResponseTimeMs client gửi lên. Tính tại thời điểm nhận (không tính độ trễ hàng đợi).
            var check = await _timer.CheckAsync(roomId, playerId, request.SlideId);
            if (check.Status == TimerCheckStatus.NotStarted)
            {
                await Clients.Caller.SendAsync("AnswerRejected", new { request.SlideId, Reason = "NOT_STARTED", Message = "Câu hỏi chưa bắt đầu." });
                return;
            }
            if (check.Status == TimerCheckStatus.Expired)
            {
                await Clients.Caller.SendAsync("AnswerRejected", new { request.SlideId, Reason = "EXPIRED", Message = "Đã hết thời gian trả lời." });
                return;
            }

            var trusted = request with { ResponseTimeMs = check.ElapsedMs };

            var payload = new AnswerQueuePayload(
                playerId, 
                roomId, 
                Context.ConnectionId, 
                groupName, 
                trusted
            );

            await _answerQueue.QueueAnswerAsync(payload);

            // Báo lại cho user biết đã ghi nhận và đang chờ kết quả
            await Clients.Caller.SendAsync("AnswerAccepted", new { request.SlideId, Message = "Đã nhận câu trả lời, đang chấm..." });
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ── START PLAYER SLIDE (PLAYER_PACED / ASYNC_TOURNAMENT) ──────────────────
    // Thí sinh mở câu hỏi → server bắt đầu đồng hồ cá nhân (Async Timer).
    // Gọi lại (F5) không reset đồng hồ.
    // ═══════════════════════════════════════════════════════════════════════
    public async Task StartPlayerSlide(Guid slideId)
    {
        try
        {
            if (Context.Items["PlayerId"] is not Guid playerId
                || Context.Items["PinCode"] is not string pinCode)
            {
                await SendErrorAsync("Không xác định được người chơi.");
                return;
            }

            var room = await _roomService.GetRoomByPinAsync(pinCode);
            var quiz = room is null ? null : await _quizService.GetQuizDetailAsync(room.QuizId);
            var slide = quiz?.Slides.FirstOrDefault(s => s.Id == slideId && s.Status == "PUBLISHED");
            if (slide is null)
            {
                await SendErrorAsync("Không tìm thấy câu hỏi.");
                return;
            }

            await _timer.StartPlayerSlideAsync(playerId, slideId, slide.TimeLimit);
            await Clients.Caller.SendAsync("PlayerSlideTimerStarted", new { SlideId = slideId, slide.TimeLimit });
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ── REQUEST LEADERBOARD ────────────────────────────────────────────
    // Any client can request current standings
    // ═══════════════════════════════════════════════════════════════════
    public async Task RequestLeaderboard()
    {
        try
        {
            if (Context.Items["RoomId"] is not Guid roomId)
            {
                await SendErrorAsync("Không tìm thấy phòng.");
                return;
            }

            var leaderboard = await _roomService.GetLeaderboardAsync(roomId, top: 10);
            await Clients.Caller.SendAsync("LeaderboardUpdated", leaderboard);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ── END GAME ───────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════
    [Authorize]
    public async Task EndGame(Guid roomId)
    {
        try
        {
            // Update rooms.status = 'FINISHED', rooms.end_time = NOW
            await _roomService.UpdateRoomStatusAsync(roomId, "FINISHED");

            var pinCode   = Context.Items["PinCode"] as string ?? "";
            var groupName = $"room_{pinCode}";
            RoomSlideIndex.Remove(pinCode);

            // Final leaderboard
            var finalLeaderboard = await _roomService.GetLeaderboardAsync(roomId);

            await Clients.Group(groupName).SendAsync("GameEnded", new
            {
                RoomId      = roomId,
                Message     = "Trò chơi kết thúc! Cảm ơn đã tham gia.",
                Leaderboard = finalLeaderboard,
            });

            _logger.LogInformation("Game ended in room {RoomId}", roomId);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    public async Task GetBattleRoyaleState(Guid roomId)
    {
        try
        {
            var state = await _roomService.GetBattleRoyaleStateAsync(roomId);
            await Clients.Caller.SendAsync("SurvivalStatusUpdated", state);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    public async Task PlaceWager(Guid slideId, int wagerPercent, int wagerAmount)
    {
        try
        {
            var roomId = Context.Items["RoomId"] as Guid?;
            var playerId = Context.Items["PlayerId"] as Guid?;
            var groupName = Context.Items["GroupName"] as string;

            if (roomId == null || playerId == null || string.IsNullOrEmpty(groupName))
            {
                await SendErrorAsync("Bạn chưa tham gia phòng nào.");
                return;
            }

            var poolState = await _roomService.PlaceWagerAsync(roomId.Value, playerId.Value, slideId, wagerPercent, wagerAmount);
            await Clients.Group(groupName).SendAsync("WagerPoolUpdated", poolState);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    public async Task GetWagerPoolState(Guid roomId, Guid slideId)
    {
        try
        {
            var poolState = await _roomService.GetWagerPoolStateAsync(roomId, slideId);
            await Clients.Caller.SendAsync("WagerPoolUpdated", poolState);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    // ── HELPERS ────────────────────────────────────────────────────────
    private async Task<SlideStartedDto?> GetCurrentSlideAsync(Guid roomId, string pinCode)
    {
        // Get quiz via room — load from cache via QuizService
        var room = await _roomService.GetRoomByPinAsync(pinCode);
        if (room is null) return null;

        var quiz = await _quizService.GetQuizDetailAsync(room.QuizId);
        if (quiz is null) return null;

        var slides = quiz.Slides
            .Where(s => s.Status == "PUBLISHED")
            .OrderBy(s => s.OrderIndex)
            .ToList();

        int idx = RoomSlideIndex.GetValueOrDefault(pinCode, 0);
        if (idx >= slides.Count) return null;

        var slide = slides[idx];

        // Only send public options (hide IsCorrect from players)
        var publicOptions = slide.Options.Select(o => new SlideOptionPublicDto(
            o.Id, o.Content, o.MatchingPair, o.OrderIndex));

        return new SlideStartedDto(
            idx, slide.Id, slide.Type, slide.QuestionText,
            slide.TimeLimit, slide.Points, publicOptions);
    }

    private async Task SendErrorAsync(string message)
    {
        _logger.LogWarning("GameHub error for {ConnectionId}: {Message}",
            Context.ConnectionId, message);
        await Clients.Caller.SendAsync("Error", new { Message = message });
    }
}
