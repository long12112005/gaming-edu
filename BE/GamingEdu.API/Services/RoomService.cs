using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services;

public interface IRoomService
{
    Task<RoomDto> CreateRoomAsync(Guid hostId, CreateRoomRequest request);
    Task<(Room room, RoomPlayer player)> JoinRoomAsync(Guid? userId, JoinRoomRequest request);
    Task<Room?> GetRoomByPinAsync(string pinCode);
    Task<IEnumerable<LeaderboardEntryDto>> GetLeaderboardAsync(Guid roomId);
    Task<AnswerResultDto> SubmitAnswerAsync(Guid roomPlayerId, SubmitAnswerRequest request);
    Task UpdateRoomStatusAsync(Guid roomId, string status);
}

public class RoomService : IRoomService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<RoomService> _logger;

    public RoomService(ApplicationDbContext db, ILogger<RoomService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── CREATE ROOM ────────────────────────────────────────────────────
    public async Task<RoomDto> CreateRoomAsync(Guid hostId, CreateRoomRequest request)
    {
        // Validate quiz exists
        var quiz = await _db.Quizzes
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == request.QuizId)
            ?? throw new KeyNotFoundException("Không tìm thấy bộ đề.");

        // Validate mode value
        var validModes = new[] { "HOST_PACED", "PLAYER_PACED", "ASYNC_TOURNAMENT" };
        if (!validModes.Contains(request.Mode))
            throw new ArgumentException($"Chế độ không hợp lệ: {request.Mode}");

        // Generate unique 6-digit PIN (maps to rooms.pin_code)
        string pin;
        do { pin = GeneratePin(); }
        while (await _db.Rooms.AnyAsync(r => r.PinCode == pin && r.Status != "FINISHED"));

        var room = new Room
        {
            Id        = Guid.NewGuid(),
            HostId    = hostId,
            QuizId    = request.QuizId,
            PinCode   = pin,
            Mode      = request.Mode,
            Status    = "WAITING",
            CreatedAt = DateTime.UtcNow,
        };

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Room created: PIN={Pin}, Mode={Mode}", pin, request.Mode);

        return new RoomDto(room.Id, room.PinCode, room.Mode, room.Status,
            room.QuizId, quiz.Title, room.CreatedAt);
    }

    // ── JOIN ROOM ──────────────────────────────────────────────────────
    public async Task<(Room room, RoomPlayer player)> JoinRoomAsync(
        Guid? userId, JoinRoomRequest request)
    {
        // Find room by PIN (maps to rooms.pin_code)
        var room = await _db.Rooms
            .FirstOrDefaultAsync(r => r.PinCode == request.PinCode && r.Status == "WAITING")
            ?? throw new KeyNotFoundException(
                $"Phòng có mã PIN '{request.PinCode}' không tồn tại hoặc đã bắt đầu.");

        // Prevent duplicate join (same user in same room)
        if (userId.HasValue)
        {
            bool alreadyJoined = await _db.RoomPlayers
                .AnyAsync(rp => rp.RoomId == room.Id && rp.UserId == userId);
            if (alreadyJoined)
                throw new InvalidOperationException("Bạn đã tham gia phòng này rồi.");
        }

        var player = new RoomPlayer
        {
            Id         = Guid.NewGuid(),
            RoomId     = room.Id,
            UserId     = userId,
            Nickname   = request.Nickname.Trim(),
            AvatarUrl  = request.AvatarUrl,
            TotalScore = 0,
            JoinedAt   = DateTime.UtcNow,
        };

        _db.RoomPlayers.Add(player);
        await _db.SaveChangesAsync();

        return (room, player);
    }

    // ── GET ROOM BY PIN ────────────────────────────────────────────────
    public async Task<Room?> GetRoomByPinAsync(string pinCode)
        => await _db.Rooms
            .Include(r => r.Quiz)
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.PinCode == pinCode);

    // ── SUBMIT ANSWER ──────────────────────────────────────────────────
    public async Task<AnswerResultDto> SubmitAnswerAsync(
        Guid roomPlayerId, SubmitAnswerRequest request)
    {
        var player = await _db.RoomPlayers.FindAsync(roomPlayerId)
            ?? throw new KeyNotFoundException("Không tìm thấy người chơi.");

        var slide = await _db.Slides
            .Include(s => s.Options)
            .FirstOrDefaultAsync(s => s.Id == request.SlideId)
            ?? throw new KeyNotFoundException("Không tìm thấy câu hỏi.");

        // Prevent duplicate answer for same slide
        bool alreadyAnswered = await _db.PlayerResponses
            .AnyAsync(pr => pr.RoomPlayerId == roomPlayerId
                         && pr.SlideId     == request.SlideId);
        if (alreadyAnswered)
            throw new InvalidOperationException("Bạn đã trả lời câu hỏi này rồi.");

        // ── Grade the answer ──────────────────────────────────────────
        bool isCorrect = GradeAnswer(slide, request.AnswerData);

        // Score formula: speed bonus (faster = more points, min 10% of total)
        int scoreAwarded = 0;
        string correctAnswer = GetCorrectAnswer(slide);

        if (isCorrect)
        {
            double maxTime = slide.TimeLimit * 1000.0; // ms
            double elapsed = Math.Min(request.ResponseTimeMs, maxTime);
            double speedFactor = Math.Max(0.1, 1.0 - (elapsed / maxTime));
            scoreAwarded = (int)Math.Round(slide.Points * speedFactor);
        }

        // Save response to player_responses table
        var response = new PlayerResponse
        {
            Id             = Guid.NewGuid(),
            RoomPlayerId   = roomPlayerId,
            SlideId        = request.SlideId,
            AnswerData     = request.AnswerData,
            IsCorrect      = isCorrect,
            ScoreAwarded   = scoreAwarded,
            ResponseTimeMs = request.ResponseTimeMs,
            AnsweredAt     = DateTime.UtcNow,
        };

        // Update total_score in room_players table
        player.TotalScore += scoreAwarded;

        _db.PlayerResponses.Add(response);
        await _db.SaveChangesAsync();

        return new AnswerResultDto(isCorrect, scoreAwarded, player.TotalScore, correctAnswer);
    }

    // ── LEADERBOARD ────────────────────────────────────────────────────
    public async Task<IEnumerable<LeaderboardEntryDto>> GetLeaderboardAsync(Guid roomId)
    {
        var players = await _db.RoomPlayers
            .AsNoTracking()
            .Where(rp => rp.RoomId == roomId)
            .OrderByDescending(rp => rp.TotalScore)
            .ToListAsync();

        // Update ranks in DB
        var updates = players.Select((p, idx) => new { Player = p, Rank = idx + 1 }).ToList();
        foreach (var u in updates)
        {
            var tracked = await _db.RoomPlayers.FindAsync(u.Player.Id);
            if (tracked != null) tracked.Rank = u.Rank;
        }
        await _db.SaveChangesAsync();

        return updates.Select(u => new LeaderboardEntryDto(
            u.Rank, u.Player.Nickname, u.Player.AvatarUrl, u.Player.TotalScore));
    }

    // ── UPDATE ROOM STATUS ─────────────────────────────────────────────
    public async Task UpdateRoomStatusAsync(Guid roomId, string status)
    {
        var room = await _db.Rooms.FindAsync(roomId)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng.");

        room.Status = status;
        if (status == "PLAYING") room.StartTime = DateTime.UtcNow;
        if (status == "FINISHED") room.EndTime  = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    // ── HELPERS ────────────────────────────────────────────────────────
    private static string GeneratePin()
        => Random.Shared.Next(100000, 999999).ToString();

    private static bool GradeAnswer(Slide slide, string answerData)
    {
        // QUIZ / FILL_IN_BLANK: compare submitted option ID or text
        if (slide.Type == "QUIZ")
        {
            if (Guid.TryParse(answerData, out var optionId))
                return slide.Options.Any(o => o.Id == optionId && o.IsCorrect);
        }
        else if (slide.Type == "FILL_IN_BLANK")
        {
            var keywords = slide.Options
                .Where(o => o.IsCorrect)
                .SelectMany(o => (o.BlankKeywords ?? "").Split(',', StringSplitOptions.TrimEntries))
                .Select(k => k.ToLower());
            return keywords.Contains(answerData.Trim().ToLower());
        }
        // POLL and WORD_CLOUD — always "correct" (no right/wrong)
        else if (slide.Type is "POLL" or "WORD_CLOUD")
            return true;

        return false;
    }

    private static string GetCorrectAnswer(Slide slide)
    {
        if (slide.Type == "QUIZ")
            return string.Join(", ", slide.Options
                .Where(o => o.IsCorrect)
                .Select(o => o.Content));

        if (slide.Type == "FILL_IN_BLANK")
            return string.Join(", ", slide.Options
                .Where(o => o.IsCorrect)
                .SelectMany(o => (o.BlankKeywords ?? "").Split(',', StringSplitOptions.TrimEntries)));

        return "–";
    }
}
