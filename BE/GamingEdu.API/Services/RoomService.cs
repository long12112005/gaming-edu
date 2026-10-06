using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using GamingEdu.API.Hubs;
using StackExchange.Redis;
using ClosedXML.Excel;

namespace GamingEdu.API.Services;

public interface IRoomService
{
    Task<RoomDto> CreateRoomAsync(Guid hostId, CreateRoomRequest request);
    Task<(Room room, RoomPlayer player)> JoinRoomAsync(Guid? userId, JoinRoomRequest request);
    Task<Room?> GetRoomByPinAsync(string pinCode);
    Task<IEnumerable<LeaderboardEntryDto>> GetLeaderboardAsync(Guid roomId);
    Task<AnswerResultDto> SubmitAnswerAsync(Guid roomPlayerId, SubmitAnswerRequest request);
    Task UpdateRoomStatusAsync(Guid roomId, string status);
    Task<Dictionary<string, int>> GetWordCloudDataAsync(Guid roomId, Guid slideId);
    Task InviteGroupAsync(Guid hostId, Guid roomId, Guid groupId);
    Task RemovePlayerAsync(Guid roomId, Guid playerId);
    Task SaveDraftAnswerAsync(Guid roomPlayerId, Guid slideId, string answerData);
    Task<IEnumerable<LeaderboardEntryDto>> FinishRoomAsync(Guid roomId, Guid hostId);
    Task<byte[]> ExportRoomReportAsync(Guid roomId, Guid hostId);
}

public class RoomService : IRoomService
{
    private readonly ApplicationDbContext  _db;
    private readonly ILogger<RoomService>  _logger;
    private readonly FuzzyMatchingService  _fuzzy;
    private readonly IHubContext<NotificationHub> _notificationHub;
    private readonly IConnectionMultiplexer _redis;

    public RoomService(
        ApplicationDbContext db,
        ILogger<RoomService> logger,
        FuzzyMatchingService fuzzy,
        IHubContext<NotificationHub> notificationHub,
        IConnectionMultiplexer redis)
    {
        _db     = db;
        _logger = logger;
        _fuzzy  = fuzzy;
        _notificationHub = notificationHub;
        _redis  = redis;
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

        // ── Speed factor (dùng cho mọi loại câu hỏi) ─────────────────
        double maxTime    = slide.TimeLimit * 1000.0; // ms
        double elapsed    = Math.Min(request.ResponseTimeMs, maxTime);
        double speedFactor = Math.Max(0.1, 1.0 - (elapsed / maxTime));

        // ── Chấm điểm theo loại câu hỏi ──────────────────────────────
        bool   isCorrect    = false;
        int    scoreAwarded = 0;
        string correctAnswer;

        if (slide.Type == "FILL_IN_BLANK")
        {
            // answerData = JSON array: ["đáp án blank 1", "đáp án blank 2", ...]
            List<string> userAnswers;
            try
            {
                userAnswers = JsonSerializer.Deserialize<List<string>>(request.AnswerData)
                              ?? [];
            }
            catch
            {
                // Fallback: treat as single-blank answer
                userAnswers = [request.AnswerData];
            }

            // Mỗi option có IsCorrect=true tương ứng 1 blank, theo OrderIndex
            var correctOptions = slide.Options
                .Where(o => o.IsCorrect)
                .OrderBy(o => o.OrderIndex)
                .ToList();

            var keywordSets = correctOptions
                .Select(o => (IList<string>)FuzzyMatchingService.ParseKeywords(o.BlankKeywords))
                .ToList();

            var (isFullyCorrect, scoreRatio, correctCount, totalBlanks) =
                _fuzzy.GradeFillInBlank(userAnswers, keywordSets);

            isCorrect    = isFullyCorrect;
            scoreAwarded = (int)Math.Round(slide.Points * scoreRatio * speedFactor);
            correctAnswer = string.Join(" | ", correctOptions
                .Select(o => FuzzyMatchingService.ParseKeywords(o.BlankKeywords)
                                .FirstOrDefault() ?? ""));

            _logger.LogDebug(
                "FILL_IN_BLANK: {Correct}/{Total} blanks correct, ratio={Ratio:P0}",
                correctCount, totalBlanks, scoreRatio);
        }
        else
        {
            isCorrect    = GradeAnswerExact(slide, request.AnswerData);
            correctAnswer = GetCorrectAnswer(slide);

            if (isCorrect)
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

        // Chỉ lưu log response vào DB, KHÔNG cập nhật TotalScore đồng bộ vào DB
        _db.PlayerResponses.Add(response);
        await _db.SaveChangesAsync();

        // 1. Dùng ZINCRBY (SortedSetIncrementAsync) để cộng điểm
        var redisDb = _redis.GetDatabase();
        var lbKey = $"room_leaderboard:{player.RoomId}";
        var memberName = $"{player.Id}|{player.Nickname}|{player.AvatarUrl}";
        
        double newScore = await redisDb.SortedSetIncrementAsync(lbKey, memberName, scoreAwarded);

        // 2. Dùng ZREVRANK (SortedSetRankAsync với Order.Descending) để lấy thứ hạng realtime
        long? rank = await redisDb.SortedSetRankAsync(lbKey, memberName, StackExchange.Redis.Order.Descending);
        int currentRank = (int)(rank ?? 0) + 1;

        return new AnswerResultDto(isCorrect, scoreAwarded, (int)newScore, currentRank, correctAnswer);
    }

    // ── LEADERBOARD ────────────────────────────────────────────────────
    public async Task<IEnumerable<LeaderboardEntryDto>> GetLeaderboardAsync(Guid roomId)
    {
        var redisDb = _redis.GetDatabase();
        var lbKey = $"room_leaderboard:{roomId}";
        
        var sortedPlayers = await redisDb.SortedSetRangeByRankWithScoresAsync(lbKey, 0, -1, StackExchange.Redis.Order.Descending);

        if (sortedPlayers.Length > 0)
        {
            return sortedPlayers.Select((sp, index) => {
                var parts = sp.Element.ToString().Split('|'); // id|nickname|avatarUrl
                return new LeaderboardEntryDto(
                    index + 1,
                    parts.Length > 1 ? parts[1] : "Unknown",
                    parts.Length > 2 ? parts[2] : "",
                    (int)sp.Score
                );
            });
        }

        // Fallback đọc DB nếu Redis rỗng (do restart server hoặc mới tạo phòng)
        var players = await _db.RoomPlayers
            .AsNoTracking()
            .Where(rp => rp.RoomId == roomId)
            .ToListAsync();

        var result = new List<LeaderboardEntryDto>();
        foreach (var p in players)
        {
            // Dùng ZADD (SortedSetAddAsync) đẩy vào Redis
            await redisDb.SortedSetAddAsync(lbKey, $"{p.Id}|{p.Nickname}|{p.AvatarUrl}", p.TotalScore);
        }
        
        // Gọi lại chính hàm này để lấy thứ hạng đã được Redis tính toán chuẩn xác
        return await GetLeaderboardAsync(roomId);
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

    // ── AUTO-SAVE DRAFT ────────────────────────────────────────────────
    public async Task SaveDraftAnswerAsync(Guid roomPlayerId, Guid slideId, string answerData)
    {
        var redisDb = _redis.GetDatabase();
        var draftKey = $"draft_answer:{roomPlayerId}:{slideId}";
        await redisDb.StringSetAsync(draftKey, answerData, TimeSpan.FromHours(2));
    }

    // ── FINISH ROOM (PODIUM) ───────────────────────────────────────────
    public async Task<IEnumerable<LeaderboardEntryDto>> FinishRoomAsync(Guid roomId, Guid hostId)
    {
        var room = await _db.Rooms.FindAsync(roomId) ?? throw new KeyNotFoundException("Không tìm thấy phòng.");
        if (room.HostId != hostId) throw new UnauthorizedAccessException("Bạn không phải chủ phòng.");

        await UpdateRoomStatusAsync(roomId, "FINISHED");

        // Lấy top từ Leaderboard (Redis ZSET)
        var fullLeaderboard = (await GetLeaderboardAsync(roomId)).ToList();
        
        // Sync điểm từ Redis về DB khi kết thúc game
        var roomPlayers = await _db.RoomPlayers.Where(rp => rp.RoomId == roomId).ToListAsync();
        foreach (var rp in roomPlayers)
        {
            var lbEntry = fullLeaderboard.FirstOrDefault(l => l.Nickname == rp.Nickname);
            if (lbEntry != null)
            {
                rp.TotalScore = lbEntry.TotalScore;
                rp.Rank = lbEntry.Rank;
            }
        }
        await _db.SaveChangesAsync();

        return fullLeaderboard.Take(3);
    }

    // ── EXPORT REPORT ──────────────────────────────────────────────────
    public async Task<byte[]> ExportRoomReportAsync(Guid roomId, Guid hostId)
    {
        var room = await _db.Rooms
            .Include(r => r.Quiz)
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Id == roomId) ?? throw new KeyNotFoundException("Không tìm thấy phòng.");
            
        if (room.HostId != hostId) throw new UnauthorizedAccessException("Bạn không phải chủ phòng.");

        var players = room.Players.OrderByDescending(p => p.TotalScore).ToList();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Kết quả phòng chơi");

        // Header
        ws.Cell(1, 1).Value = "Room PIN";
        ws.Cell(1, 2).Value = room.PinCode;
        ws.Cell(2, 1).Value = "Bộ đề";
        ws.Cell(2, 2).Value = room.Quiz.Title;
        ws.Cell(3, 1).Value = "Thời gian tạo";
        ws.Cell(3, 2).Value = room.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss");

        ws.Cell(5, 1).Value = "Hạng";
        ws.Cell(5, 2).Value = "Người chơi";
        ws.Cell(5, 3).Value = "Tổng điểm";

        var headerRange = ws.Range("A5:C5");
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.LightBlue;

        // Data
        int row = 6;
        for (int i = 0; i < players.Count; i++)
        {
            ws.Cell(row, 1).Value = i + 1;
            ws.Cell(row, 2).Value = players[i].Nickname;
            ws.Cell(row, 3).Value = players[i].TotalScore;
            row++;
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    // ── HELPERS ────────────────────────────────────────────────────────
    public async Task InviteGroupAsync(Guid hostId, Guid roomId, Guid groupId)
    {
        var room = await _db.Rooms.Include(r => r.Quiz).FirstOrDefaultAsync(r => r.Id == roomId)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng.");

        if (room.HostId != hostId) throw new UnauthorizedAccessException("Bạn không phải chủ phòng.");

        var group = await _db.Groups.Include(g => g.Members).FirstOrDefaultAsync(g => g.Id == groupId)
            ?? throw new KeyNotFoundException("Không tìm thấy nhóm.");

        if (group.HostId != hostId) throw new UnauthorizedAccessException("Bạn không phải chủ nhóm.");

        // Lấy danh sách user ID đang ACTIVE trong nhóm
        var activeMemberUserIds = group.Members.Where(m => m.Status == "ACTIVE").Select(m => m.UserId).ToList();

        // Gửi push notification qua Hub cho từng member
        foreach (var memberId in activeMemberUserIds)
        {
            await _notificationHub.Clients.Group($"user_{memberId}").SendAsync("NotificationReceived", new
            {
                Type = "GROUP_ROOM_INVITE",
                Message = $"Chủ phòng {group.Name} đang mở phòng chơi bộ đề {room.Quiz.Title}. Tham gia ngay!",
                RoomId = room.Id,
                PinCode = room.PinCode
            });
        }
    }

    public async Task RemovePlayerAsync(Guid roomId, Guid playerId)
    {
        var player = await _db.RoomPlayers.FirstOrDefaultAsync(p => p.RoomId == roomId && p.Id == playerId);
        if (player != null)
        {
            _db.RoomPlayers.Remove(player);
            await _db.SaveChangesAsync();
        }
    }

    public async Task<Dictionary<string, int>> GetWordCloudDataAsync(Guid roomId, Guid slideId)
    {
        var responses = await _db.PlayerResponses
            .Include(pr => pr.RoomPlayer)
            .Where(pr => pr.SlideId == slideId && pr.RoomPlayer.RoomId == roomId)
            .Select(pr => pr.AnswerData)
            .ToListAsync();

        var wordCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var answer in responses)
        {
            if (string.IsNullOrWhiteSpace(answer)) continue;
            // Phân tách từ khóa bằng dấu phẩy hoặc khoảng trắng (đơn giản)
            var words = answer.Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                              .Select(w => w.Trim())
                              .Where(w => !string.IsNullOrEmpty(w));
            
            foreach (var word in words)
            {
                if (wordCounts.ContainsKey(word)) wordCounts[word]++;
                else wordCounts[word] = 1;
            }
        }

        return wordCounts.OrderByDescending(kvp => kvp.Value).ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
    }
    private static string GeneratePin()
        => Random.Shared.Next(100000, 999999).ToString();

    /// <summary>
    /// Chấm điểm chính xác cho QUIZ, MATCHING, POLL, WORD_CLOUD.
    /// FILL_IN_BLANK được xử lý riêng bên trên với FuzzyMatchingService.
    /// </summary>
    private static bool GradeAnswerExact(Slide slide, string answerData)
    {
        if (slide.Type == "QUIZ")
        {
            // answerData = GUID của option người dùng chọn
            if (Guid.TryParse(answerData, out var optionId))
                return slide.Options.Any(o => o.Id == optionId && o.IsCorrect);
        }
        else if (slide.Type == "MATCHING")
        {
            // answerData = JSON: [{"leftId":"...","rightContent":"..."}]
            // Mỗi cặp ghép đúng → isCorrect
            try
            {
                var pairs = JsonSerializer.Deserialize<List<MatchingPairAnswer>>(answerData);
                if (pairs is null) return false;
                return pairs.All(pair =>
                    slide.Options.Any(o =>
                        o.Id.ToString() == pair.LeftId &&
                        FuzzyMatchingService.Normalize(o.MatchingPair) ==
                        FuzzyMatchingService.Normalize(pair.RightContent)));
            }
            catch { return false; }
        }
        // POLL và WORD_CLOUD không có đáp án đúng/sai
        else if (slide.Type is "POLL" or "WORD_CLOUD")
            return true;

        return false;
    }

    // DTO nội bộ cho MATCHING answer
    private record MatchingPairAnswer(string LeftId, string RightContent);

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
