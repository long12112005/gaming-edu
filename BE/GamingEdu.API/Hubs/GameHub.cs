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

    // In-memory room state (production: use Redis/distributed cache)
    private static readonly Dictionary<string, int> RoomSlideIndex = new();

    public GameHub(
        IRoomService roomService,
        IQuizService quizService,
        ILogger<GameHub> logger)
    {
        _roomService = roomService;
        _quizService  = quizService;
        _logger       = logger;
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

            // Confirm to the joining player
            await Clients.Caller.SendAsync("JoinedRoom", new
            {
                RoomId     = room.Id,
                PlayerId   = player.Id,
                PinCode    = room.PinCode,
                Mode       = room.Mode,
                QuizId     = room.QuizId,
                PlayerNickname = player.Nickname,
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
                Message = "Trò chơi bắt đầu! Sẵn sàng chưa?",
            });

            // Small delay then send first slide
            await Task.Delay(2000);
            await Clients.Group(groupName).SendAsync("SlideStarted", slideDto);
        }
        catch (Exception ex)
        {
            await SendErrorAsync(ex.Message);
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

            // Grade answer and save response to player_responses table
            var result = await _roomService.SubmitAnswerAsync(playerId, request);

            // Send personal result back to the submitting player only
            await Clients.Caller.SendAsync("AnswerResult", result);

            // Broadcast updated leaderboard to the whole room
            var roomId = (Guid)Context.Items["RoomId"]!;
            var leaderboard = await _roomService.GetLeaderboardAsync(roomId);
            var groupName   = Context.Items["GroupName"] as string ?? "";

            await Clients.Group(groupName).SendAsync("LeaderboardUpdated", leaderboard);
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

            var leaderboard = await _roomService.GetLeaderboardAsync(roomId);
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
