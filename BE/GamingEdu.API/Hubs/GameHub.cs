using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
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
    private static readonly Dictionary<string, DateTime> LastSlideTransitionTime = new();
    private static readonly HashSet<string> LockedRooms = new();
    private static readonly object SlideTransitionLock = new();

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
    private static Guid? GetUserId(HubCallerContext context)
    {
        var claim = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? context.User?.FindFirst("sub")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    public async Task JoinRoom(JoinRoomRequest request)
    {
        try
        {
            // Get userId from JWT claim or request payload (null = guest player)
            Guid? userId = GetUserId(Context) ?? request.UserId;

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

            Context.Items["PlayerNickname"] = player.Nickname;

            _logger.LogInformation(
                "Player '{Nickname}' joined room {PinCode}", player.Nickname, room.PinCode);

            var theme = await _roomService.GetRoomThemeAsync(room.Id);

            int? questionTimeLimit = null;
            if (!string.IsNullOrEmpty(room.GameSettings))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(room.GameSettings);
                    if (doc.RootElement.TryGetProperty("questionTimeLimit", out var qtlProp))
                    {
                        questionTimeLimit = qtlProp.GetInt32();
                    }
                }
                catch {}
            }

            // Confirm to the joining player
            await Clients.Caller.SendAsync("JoinedRoom", new
            {
                RoomId     = room.Id,
                PlayerId   = player.Id,
                PinCode    = room.PinCode,
                Mode       = room.Mode,
                Status     = room.Status,
                QuizId     = room.QuizId,
                PlayerNickname = player.Nickname,
                Theme      = theme,
                EndTime    = room.EndTime,
                QuestionTimeLimit = questionTimeLimit,
                IsEarlyFinished = room.IsEarlyFinished
            });

            // Gửi danh sách toàn bộ người chơi hiện tại cho người mới vào thấy được mọi người trong phòng
            var currentPlayers = await _roomService.GetRoomActivePlayersAsync(room.Id);
            await Clients.Caller.SendAsync("LoadPlayers", currentPlayers);

            // Gửi tiến độ đường đua đấu trường 60 FPS hiện tại cho người mới vào
            var initialProgress = await _roomService.GetRoomPlayersArenaProgressAsync(room.Id);
            await Clients.Caller.SendAsync("PlayersProgressUpdated", initialProgress);

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
            Guid? userId = GetUserId(Context);
            var playerData = await _roomService.RejoinRoomPlayerAsync(pinCode, playerId, nickname, userId);
            if (playerData is null)
            {
                // Fallback: nếu phòng vẫn WAITING thì gọi JoinRoom thông thường
                await JoinRoom(new JoinRoomRequest(pinCode, nickname ?? "Player", null, userId));
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

            Context.Items["PlayerNickname"] = playerData.PlayerNickname;

            var currentPlayers = await _roomService.GetRoomActivePlayersAsync(playerData.RoomId);
            await Clients.Caller.SendAsync("LoadPlayers", currentPlayers);

            // Đồng bộ tiến độ đấu trường thời gian thực khi kết nối lại
            var rejoinProgress = await _roomService.GetRoomPlayersArenaProgressAsync(playerData.RoomId, null, 0, currentSlideDto?.SlideId);
            await Clients.Caller.SendAsync("PlayersProgressUpdated", rejoinProgress);

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
            var hostId = GetUserId(Context);
            if (!hostId.HasValue)
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
            var players = await _roomService.GetRoomActivePlayersAsync(room.Id);
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
    // Host or Solo Player calls this to transition room status from WAITING → PLAYING
    // ═══════════════════════════════════════════════════════════════════
    public async Task StartGame(Guid roomId)
    {
        try
        {
            var pinCode = Context.Items["PinCode"] as string;
            Room? room = null;
            if (!string.IsNullOrEmpty(pinCode))
            {
                room = await _roomService.GetRoomByPinAsync(pinCode);
            }
            if (room == null)
            {
                room = await _roomService.GetRoomByIdAsync(roomId);
            }
            if (room == null)
            {
                await SendErrorAsync("Không tìm thấy phòng.");
                return;
            }
            pinCode = room.PinCode;
            var groupName = $"room_{pinCode}";

            Context.Items["PinCode"]   = pinCode;
            Context.Items["RoomId"]    = room.Id;
            Context.Items["GroupName"] = groupName;

            // Initialize slide index for this room
            RoomSlideIndex[pinCode] = 0;
            LastSlideTransitionTime[pinCode] = DateTime.UtcNow;

            // Load first slide
            var slideDto = await GetCurrentSlideAsync(roomId, pinCode);
            if (slideDto is null)
            {
                await SendErrorAsync("Bộ đề không có câu hỏi nào. Vui lòng thêm câu hỏi vào bộ đề trước khi bắt đầu.");
                return;
            }

            // Update rooms.status = 'PLAYING', rooms.start_time = NOW
            await _roomService.UpdateRoomStatusAsync(roomId, "PLAYING");

            _logger.LogInformation("Game started in room {PinCode}", pinCode);

            // Broadcast GameStarted event to all room members
            await Clients.Group(groupName).SendAsync("GameStarted", new
            {
                RoomId  = roomId,
                Mode    = room.Mode,
                Message = "Trò chơi bắt đầu!",
            });

            // Gửi luôn slide đầu tiên (nếu client tự xử lý UI, hoặc đã gọi StartCountdown trước)
            // Ghi mốc thời gian server cho câu hỏi đầu (chống gian lận)
            await _timer.StartRoomSlideAsync(roomId, slideDto.SlideId, slideDto.TimeLimit);
            await Clients.Group(groupName).SendAsync("SlideStarted", slideDto);

            // Đồng bộ tiến độ đấu trường toàn phòng khi bắt đầu câu hỏi đầu tiên
            var arenaProgress = await _roomService.GetRoomPlayersArenaProgressAsync(roomId, null, 0, slideDto.SlideId);
            await Clients.Group(groupName).SendAsync("PlayersProgressUpdated", arenaProgress);

            var roomTheme = await _roomService.GetRoomThemeAsync(roomId);
            if (roomTheme == "DEFUSE_BOMB")
            {
                var bombState = await _roomService.GetBombDefusalStateAsync(roomId, slideDto.SlideId);
                await Clients.Group(groupName).SendAsync("BombDefusalUpdated", bombState);
            }
            if (roomTheme == "WORD_HUNTER")
            {
                var wordHunterState = await _roomService.GetWordHunterStateAsync(roomId, slideDto.SlideId);
                await Clients.Group(groupName).SendAsync("WordHunterUpdated", wordHunterState);
            }
            if (roomTheme == "BRIDGE_BUILDER")
            {
                var bridgeState = await _roomService.GetBridgeBuilderStateAsync(roomId, slideDto.SlideId);
                await Clients.Group(groupName).SendAsync("BridgeBuilderUpdated", bridgeState);
            }
            if (roomTheme == "CIRCUIT_CONNECT")
            {
                var circuitState = await _roomService.GetCircuitConnectStateAsync(roomId, slideDto.SlideId);
                await Clients.Group(groupName).SendAsync("CircuitConnectUpdated", circuitState);
            }
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

    public async Task TogglePlayerReady(bool isReady)
    {
        var playerId = Context.Items["PlayerId"] as Guid?;
        var groupName = Context.Items["GroupName"] as string;
        if (playerId != null && !string.IsNullOrEmpty(groupName))
        {
            await Clients.Group(groupName).SendAsync("PlayerReadyChanged", new { PlayerId = playerId.Value, IsReady = isReady });
        }
    }

    public async Task UpdatePlayerProgress(int currentQuestionIndex, int totalQuestions, int score)
    {
        var playerId = Context.Items["PlayerId"] as Guid?;
        var nickname = Context.Items["PlayerNickname"] as string ?? "Thí sinh";
        var groupName = Context.Items["GroupName"] as string;
        if (playerId != null && !string.IsNullOrEmpty(groupName))
        {
            await Clients.Group(groupName).SendAsync("PlayerProgressUpdated", new
            {
                PlayerId = playerId.Value,
                Nickname = nickname,
                CurrentQuestionIndex = currentQuestionIndex,
                TotalQuestions = totalQuestions,
                Score = score
            });
        }
    }

    public async Task RequestPlayersProgress()
    {
        var roomId = Context.Items["RoomId"] as Guid?;
        if (roomId.HasValue)
        {
            var progress = await _roomService.GetRoomPlayersArenaProgressAsync(roomId.Value);
            await Clients.Caller.SendAsync("PlayersProgressUpdated", progress);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ── NEXT SLIDE (HOST_PACED) ────────────────────────────────────────
    // Host or Solo Player advances to the next question
    // ═══════════════════════════════════════════════════════════════════
    public async Task NextSlide(Guid roomId)
    {
        try
        {
            var pinCode = Context.Items["PinCode"] as string;
            Room? room = null;
            if (!string.IsNullOrEmpty(pinCode))
            {
                room = await _roomService.GetRoomByPinAsync(pinCode);
            }
            if (room == null)
            {
                room = await _roomService.GetRoomByIdAsync(roomId);
            }
            if (room == null || room.Status == "FINISHED") return;

            pinCode = room.PinCode;
            var groupName = $"room_{pinCode}";
            Context.Items["PinCode"]   = pinCode;
            Context.Items["RoomId"]    = room.Id;
            Context.Items["GroupName"] = groupName;

            // Chống gọi NextSlide liên tiếp trong vòng 2.5 giây gây nhảy cóc câu hỏi (an toàn đa luồng khi cả Host & Player auto-advance)
            lock (SlideTransitionLock)
            {
                if (LastSlideTransitionTime.TryGetValue(pinCode, out var lastTime) && (DateTime.UtcNow - lastTime).TotalMilliseconds < 2500)
                {
                    _logger.LogWarning("NextSlide ignored due to rapid successive trigger in room {PinCode}", pinCode);
                    return;
                }
                LastSlideTransitionTime[pinCode] = DateTime.UtcNow;
            }

            // Xử lý phạt timeout cho những người không nộp ở câu hỏi trước (cho Battle Royale)
            var prevSlide = await GetCurrentSlideAsync(roomId, pinCode);
            if (prevSlide != null)
            {
                await _roomService.ApplyBattleRoyaleTimeoutPenaltyAsync(roomId, prevSlide.SlideId);
            }

            var quiz = await _quizService.GetQuizDetailAsync(room.QuizId);
            if (quiz is null)
            {
                await EndGame(roomId);
                return;
            }

            var slides = quiz.Slides
                .OrderBy(s => s.OrderIndex)
                .ToList();

            if (slides.Count == 0)
            {
                await EndGame(roomId);
                return;
            }

            // Increment slide index
            RoomSlideIndex.TryGetValue(pinCode, out int currentIdx);
            int nextIdx = currentIdx + 1;

            if (nextIdx >= slides.Count)
            {
                // No more slides → end game
                _logger.LogInformation("All {Count} questions completed in room {PinCode}. Ending game.", slides.Count, pinCode);
                await EndGame(roomId);
                return;
            }

            RoomSlideIndex[pinCode] = nextIdx;

            var slideDto = await GetCurrentSlideAsync(roomId, pinCode);

            if (slideDto is null)
            {
                await EndGame(roomId);
                return;
            }

            await _timer.StartRoomSlideAsync(roomId, slideDto.SlideId, slideDto.TimeLimit);
            await Clients.Group(groupName).SendAsync("SlideStarted", slideDto);

            // Đồng bộ tiến độ đấu trường toàn phòng khi chuyển sang câu hỏi tiếp theo
            var nextSlideProgress = await _roomService.GetRoomPlayersArenaProgressAsync(roomId, null, 0, slideDto.SlideId);
            await Clients.Group(groupName).SendAsync("PlayersProgressUpdated", nextSlideProgress);

            var roomTheme = await _roomService.GetRoomThemeAsync(roomId);
            if (roomTheme == "DEFUSE_BOMB")
            {
                var bombState = await _roomService.GetBombDefusalStateAsync(roomId, slideDto.SlideId);
                await Clients.Group(groupName).SendAsync("BombDefusalUpdated", bombState);
            }
            if (roomTheme == "WORD_HUNTER")
            {
                var wordHunterState = await _roomService.GetWordHunterStateAsync(roomId, slideDto.SlideId);
                await Clients.Group(groupName).SendAsync("WordHunterUpdated", wordHunterState);
            }
            if (roomTheme == "BRIDGE_BUILDER")
            {
                var bridgeState = await _roomService.GetBridgeBuilderStateAsync(roomId, slideDto.SlideId);
                await Clients.Group(groupName).SendAsync("BridgeBuilderUpdated", bridgeState);
            }
            if (roomTheme == "CIRCUIT_CONNECT")
            {
                var circuitState = await _roomService.GetCircuitConnectStateAsync(roomId, slideDto.SlideId);
                await Clients.Group(groupName).SendAsync("CircuitConnectUpdated", circuitState);
            }
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
                // Fallback cho chế độ tự do (PLAYER_PACED hoặc ASYNC_TOURNAMENT) nếu client nộp mà timer cá nhân chưa kịp ghi
                var pinCode = Context.Items["PinCode"] as string;
                var room = !string.IsNullOrEmpty(pinCode) ? await _roomService.GetRoomByPinAsync(pinCode) : await _roomService.GetRoomByIdAsync(roomId);
                if (room != null && (room.Mode == "PLAYER_PACED" || room.Mode == "ASYNC_TOURNAMENT"))
                {
                    var quiz = await _quizService.GetQuizDetailAsync(room.QuizId);
                    var slide = quiz?.Slides.FirstOrDefault(s => s.Id == request.SlideId);
                    int timeLimit = slide?.TimeLimit > 0 ? slide.TimeLimit : 30;
                    if (!string.IsNullOrEmpty(room.GameSettings))
                    {
                        try
                        {
                            using var doc = System.Text.Json.JsonDocument.Parse(room.GameSettings);
                            if (doc.RootElement.TryGetProperty("questionTimeLimit", out var limitElem) && limitElem.TryGetInt32(out var customLimit) && customLimit > 0)
                            {
                                timeLimit = customLimit;
                            }
                        }
                        catch { }
                    }
                    await _timer.StartPlayerSlideAsync(playerId, request.SlideId, timeLimit);
                    check = await _timer.CheckAsync(roomId, playerId, request.SlideId);
                }
            }

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
            var slide = quiz?.Slides.FirstOrDefault(s => s.Id == slideId);
            if (slide is null)
            {
                await SendErrorAsync("Không tìm thấy câu hỏi.");
                return;
            }

            int effectiveTimeLimit = slide.TimeLimit > 0 ? slide.TimeLimit : 30;
            if (room != null && !string.IsNullOrEmpty(room.GameSettings))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(room.GameSettings);
                    if (doc.RootElement.TryGetProperty("questionTimeLimit", out var limitElem) && limitElem.TryGetInt32(out var customLimit) && customLimit > 0)
                    {
                        effectiveTimeLimit = customLimit;
                    }
                }
                catch { }
            }

            await _timer.StartPlayerSlideAsync(playerId, slideId, effectiveTimeLimit);
            await Clients.Caller.SendAsync("PlayerSlideTimerStarted", new { SlideId = slideId, TimeLimit = effectiveTimeLimit });
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
    public async Task EndGame(Guid roomId)
    {
        try
        {
            // Update rooms.status = 'FINISHED', rooms.end_time = NOW
            await _roomService.UpdateRoomStatusAsync(roomId, "FINISHED");

            var pinCode   = Context.Items["PinCode"] as string ?? "";
            var groupName = $"room_{pinCode}";
            RoomSlideIndex.Remove(pinCode);
            LastSlideTransitionTime.Remove(pinCode);

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

    // ═══════════════════════════════════════════════════════════════════
    // ── CLOSE ROOM (CHỦ PHÒNG ĐÓNG PHÒNG & GIẢI TÁN) ───────────────────
    // ═══════════════════════════════════════════════════════════════════
    [Authorize]
    public async Task CloseRoom(Guid roomId)
    {
        try
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var hostId))
            {
                await SendErrorAsync("Không xác định được chủ phòng.");
                return;
            }

            await _roomService.CloseRoomAsync(roomId, hostId);

            var pinCode = Context.Items["PinCode"] as string ?? "";
            var groupName = $"room_{pinCode}";

            await Clients.Group(groupName).SendAsync("RoomClosed", new
            {
                RoomId  = roomId,
                Message = "Chủ phòng đã đóng phòng thi đấu. Cảm ơn bạn đã tham gia!"
            });

            _logger.LogInformation("Room {RoomId} closed by host {HostId}", roomId, hostId);
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

    public async Task GetBombDefusalState(Guid roomId, Guid slideId)
    {
        try
        {
            var state = await _roomService.GetBombDefusalStateAsync(roomId, slideId);
            await Clients.Caller.SendAsync("BombDefusalUpdated", state);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    public async Task GetWordHunterState(Guid roomId, Guid slideId)
    {
        try
        {
            var state = await _roomService.GetWordHunterStateAsync(roomId, slideId);
            await Clients.Caller.SendAsync("WordHunterUpdated", state);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    public async Task GetBridgeBuilderState(Guid roomId, Guid slideId)
    {
        try
        {
            var state = await _roomService.GetBridgeBuilderStateAsync(roomId, slideId);
            await Clients.Caller.SendAsync("BridgeBuilderUpdated", state);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
        }
    }

    public async Task GetCircuitConnectState(Guid roomId, Guid slideId)
    {
        try
        {
            var state = await _roomService.GetCircuitConnectStateAsync(roomId, slideId);
            await Clients.Caller.SendAsync("CircuitConnectUpdated", state);
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
        var room = !string.IsNullOrEmpty(pinCode)
            ? await _roomService.GetRoomByPinAsync(pinCode)
            : await _roomService.GetRoomByIdAsync(roomId);
        if (room is null) return null;

        var quiz = await _quizService.GetQuizDetailAsync(room.QuizId);
        if (quiz is null) return null;

        var slides = quiz.Slides
            .OrderBy(s => s.OrderIndex)
            .ToList();

        int idx = RoomSlideIndex.GetValueOrDefault(room.PinCode, 0);
        if (idx >= slides.Count) return null;

        var slide = slides[idx];

        // Only send public options (hide IsCorrect from players, but compute length for Word Hunter without revealing letters)
        var publicOptions = slide.Options.Select(o => {
            int? blankLength = null;
            List<int>? wordLengths = null;
            var keywords = FuzzyMatchingService.ParseKeywords(o.BlankKeywords);
            var primary = keywords.FirstOrDefault() ?? (o.IsCorrect ? o.Content : null);
            if (!string.IsNullOrWhiteSpace(primary))
            {
                var trimmed = primary.Trim();
                blankLength = trimmed.Length;
                wordLengths = trimmed.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(w => w.Length).ToList();
            }
            return new SlideOptionPublicDto(
                o.Id, o.Content, o.MatchingPair, o.OrderIndex, blankLength, wordLengths);
        });

        int effectiveTimeLimit = slide.TimeLimit > 0 ? slide.TimeLimit : 30;

        return new SlideStartedDto(
            idx, slide.Id, slide.Type, slide.QuestionText,
            effectiveTimeLimit, slide.Points, publicOptions, slides.Count);
    }

    private async Task SendErrorAsync(string message)
    {
        _logger.LogWarning("GameHub error for {ConnectionId}: {Message}",
            Context.ConnectionId, message);
        await Clients.Caller.SendAsync("Error", new { Message = message });
    }
}
