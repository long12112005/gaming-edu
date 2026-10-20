using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using GamingEdu.API.Hubs;
using Microsoft.Extensions.Caching.Memory;
using ClosedXML.Excel;
using QRCoder;

namespace GamingEdu.API.Services;

public interface IRoomService
{
    Task<RoomDto> CreateRoomAsync(Guid hostId, CreateRoomRequest request);
    Task<(Room room, RoomPlayer player)> JoinRoomAsync(Guid? userId, JoinRoomRequest request);
    Task<Room?> GetRoomByPinAsync(string pinCode);
    Task<IEnumerable<LeaderboardEntryDto>> GetLeaderboardAsync(Guid roomId, int top = 0);
    Task<AnswerResultDto> SubmitAnswerAsync(Guid roomPlayerId, SubmitAnswerRequest request);
    Task UpdateRoomStatusAsync(Guid roomId, string status);
    Task<Dictionary<string, int>> GetWordCloudDataAsync(Guid roomId, Guid slideId);
    Task InviteGroupAsync(Guid hostId, Guid roomId, Guid groupId);
    Task RemovePlayerAsync(Guid roomId, Guid playerId);
    Task SaveDraftAnswerAsync(Guid roomPlayerId, Guid slideId, string answerData);
    Task<string?> GetDraftAnswerAsync(Guid roomPlayerId, Guid slideId);
    Task<IEnumerable<LeaderboardEntryDto>> FinishRoomAsync(Guid roomId, Guid hostId);
    Task<byte[]> ExportRoomReportAsync(Guid roomId, Guid hostId);
    Task<HostedRoomHistoryDto?> GetHostedRoomDetailsAsync(Guid roomId, Guid hostId) => Task.FromResult<HostedRoomHistoryDto?>(null);
    Task<IEnumerable<HostedRoomHistoryDto>> GetHostedRoomsHistoryAsync(Guid hostId);
    Task<IEnumerable<PlayedRoomHistoryDto>> GetPlayedRoomsHistoryAsync(Guid userId);
    Task<string> GetRoomThemeAsync(Guid roomId);
    Task SetRoomThemeAsync(Guid roomId, string theme);
    Task<SlideDistributionDto> GetSlideAnswerDistributionAsync(Guid roomId, Guid slideId);
    Task<PlayerRejoinDataDto?> RejoinRoomPlayerAsync(string pinCode, Guid? playerId, string? nickname);
    Task<PlayerResponse?> GetPlayerResponseAsync(Guid roomPlayerId, Guid slideId);
}

public class RoomService : IRoomService
{
    private readonly ApplicationDbContext  _db;
    private readonly ILogger<RoomService>  _logger;
    private readonly FuzzyMatchingService  _fuzzy;
    private readonly IHubContext<NotificationHub> _notificationHub;
    private readonly ICacheStore _cacheStore;
    private readonly ILeaderboardStore _leaderboard;

    public RoomService(
        ApplicationDbContext db,
        ILogger<RoomService> logger,
        FuzzyMatchingService fuzzy,
        IHubContext<NotificationHub> notificationHub,
        ICacheStore cacheStore,
        ILeaderboardStore leaderboard)
    {
        _db     = db;
        _logger = logger;
        _fuzzy  = fuzzy;
        _notificationHub = notificationHub;
        _cacheStore = cacheStore;
        _leaderboard = leaderboard;
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

        var theme = string.IsNullOrWhiteSpace(request.GameModeTheme) ? "SPEED_RACER" : request.GameModeTheme.Trim();
        await _cacheStore.SetStringAsync($"room_theme:{room.Id}", theme, TimeSpan.FromDays(2));
        await _cacheStore.SetStringAsync($"room_theme:pin:{pin}", theme, TimeSpan.FromDays(2));

        _logger.LogInformation("Room created: PIN={Pin}, Mode={Mode}, Theme={Theme}", pin, request.Mode, theme);

        string qrCodeBase64 = GenerateQrCodeBase64(pin);

        return new RoomDto(room.Id, room.PinCode, room.Mode, room.Status,
            room.QuizId, quiz.Title, room.CreatedAt, qrCodeBase64, theme);
    }

    private string GenerateQrCodeBase64(string pin)
    {
        // Example URL: https://game.edu/join?pin={pin}
        string url = $"https://game.edu/join?pin={pin}";
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);
        var qrCodeBytes = qrCode.GetGraphic(20);
        return Convert.ToBase64String(qrCodeBytes);
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

        // Đưa người chơi vào bảng xếp hạng (0 điểm) để có hạng ngay từ đầu
        await EnsureLeaderboardAsync(room.Id);
        await _leaderboard.SetScoreAsync(room.Id, player.Id, 0);

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
        double speedMultiplier = Math.Round(1.0 + (speedFactor * 0.5), 2);

        // ── Chấm điểm theo loại câu hỏi ──────────────────────────────
        bool   isCorrect    = false;
        int    scoreAwarded = 0;
        int    streak       = 0;
        int    streakBonus  = 0;
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

        // ── Tính Streak và Streak Bonus ───────────────────────────────
        string streakKey = $"room_streak:{roomPlayerId}";
        if (isCorrect)
        {
            var rawStreak = await _cacheStore.GetStringAsync(streakKey);
            int.TryParse(rawStreak, out streak);
            streak += 1;
            await _cacheStore.SetStringAsync(streakKey, streak.ToString(), TimeSpan.FromHours(4));

            if (streak >= 2)
            {
                streakBonus = Math.Min(streak - 1, 5) * 50; // max +250
                scoreAwarded += streakBonus;
            }
        }
        else
        {
            await _cacheStore.SetStringAsync(streakKey, "0", TimeSpan.FromHours(4));
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

        // Hạng trước khi cộng điểm (để tính leo hạng - spec 5.3)
        await EnsureLeaderboardAsync(player.RoomId);
        int? rankBefore = await _leaderboard.GetRankAsync(player.RoomId, roomPlayerId);

        // Update total_score in room_players table
        player.TotalScore += scoreAwarded;

        _db.PlayerResponses.Add(response);
        await _db.SaveChangesAsync();

        // Cập nhật Redis Sorted Set và lấy hạng mới
        await _leaderboard.SetScoreAsync(player.RoomId, roomPlayerId, player.TotalScore);
        int? rankAfter = await _leaderboard.GetRankAsync(player.RoomId, roomPlayerId);
        int rankChange = (rankBefore.HasValue && rankAfter.HasValue) ? rankBefore.Value - rankAfter.Value : 0;

        return new AnswerResultDto(
            isCorrect, 
            scoreAwarded, 
            player.TotalScore, 
            correctAnswer,
            rankAfter ?? 0, 
            rankChange,
            false,
            streak,
            speedMultiplier,
            streakBonus
        );
    }

    public async Task<SlideDistributionDto> GetSlideAnswerDistributionAsync(Guid roomId, Guid slideId)
    {
        var slide = await _db.Slides
            .Include(s => s.Options)
            .FirstOrDefaultAsync(s => s.Id == slideId);

        if (slide == null)
            return new SlideDistributionDto(slideId, 0, 0, []);

        var totalPlayers = await _db.RoomPlayers.CountAsync(rp => rp.RoomId == roomId);

        var responses = await _db.PlayerResponses
            .Where(pr => pr.SlideId == slideId && pr.RoomPlayer.RoomId == roomId)
            .ToListAsync();

        var totalAnswers = responses.Count;

        var optionsDto = slide.Options
            .OrderBy(o => o.OrderIndex)
            .Select(o =>
            {
                int count = responses.Count(r => 
                    r.AnswerData == o.Id.ToString() || 
                    (r.AnswerData != null && r.AnswerData.Equals(o.Content, StringComparison.OrdinalIgnoreCase)));
                double pct = totalAnswers > 0 ? Math.Round((double)count / totalAnswers * 100, 1) : 0;
                return new OptionDistributionDto(
                    o.Id,
                    o.Content,
                    o.OrderIndex,
                    o.IsCorrect,
                    count,
                    pct
                );
            })
            .ToList();

        return new SlideDistributionDto(slideId, totalAnswers, totalPlayers, optionsDto);
    }

    // ── LEADERBOARD ────────────────────────────────────────────────────
    /// <summary>Dựng lại sorted set từ DB nếu Redis chưa có/mất dữ liệu (DB là nguồn sự thật).</summary>
    private async Task EnsureLeaderboardAsync(Guid roomId)
    {
        if (await _leaderboard.ExistsAsync(roomId)) return;

        var scores = await _db.RoomPlayers
            .AsNoTracking()
            .Where(rp => rp.RoomId == roomId)
            .Select(rp => new { rp.Id, rp.TotalScore })
            .ToListAsync();

        foreach (var s in scores)
            await _leaderboard.SetScoreAsync(roomId, s.Id, s.TotalScore);
    }

    public async Task<IEnumerable<LeaderboardEntryDto>> GetLeaderboardAsync(Guid roomId, int top = 0)
    {
        await EnsureLeaderboardAsync(roomId);
        var rows = await _leaderboard.GetTopAsync(roomId, top);
        if (rows.Count == 0) return [];

        // Chỉ truy vấn thông tin hiển thị cho các hạng cần lấy (theo khóa chính)
        var ids = rows.Select(r => r.PlayerId).ToList();
        var info = await _db.RoomPlayers
            .AsNoTracking()
            .Where(rp => ids.Contains(rp.Id))
            .Select(rp => new { rp.Id, rp.Nickname, rp.AvatarUrl })
            .ToDictionaryAsync(x => x.Id);

        var result = new List<LeaderboardEntryDto>(rows.Count);
        foreach (var r in rows)
        {
            if (!info.TryGetValue(r.PlayerId, out var p)) continue; // người chơi đã bị xóa
            result.Add(new LeaderboardEntryDto(r.Rank, p.Nickname, p.AvatarUrl, r.Score));
        }
        return result;
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

    // ── AUTO-SAVE DRAFT (REDIS CACHE) ──────────────────────────────────
    public async Task SaveDraftAnswerAsync(Guid roomPlayerId, Guid slideId, string answerData)
    {
        var draftKey = $"draft_answer:{roomPlayerId}:{slideId}";
        await _cacheStore.SetStringAsync(draftKey, answerData, TimeSpan.FromHours(4));
    }

    public async Task<string?> GetDraftAnswerAsync(Guid roomPlayerId, Guid slideId)
    {
        var draftKey = $"draft_answer:{roomPlayerId}:{slideId}";
        return await _cacheStore.GetStringAsync(draftKey);
    }

    public async Task<PlayerRejoinDataDto?> RejoinRoomPlayerAsync(string pinCode, Guid? playerId, string? nickname)
    {
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode);
        if (room is null) return null;

        RoomPlayer? player = null;
        if (playerId.HasValue)
        {
            player = await _db.RoomPlayers.FirstOrDefaultAsync(p => p.Id == playerId.Value && p.RoomId == room.Id);
        }
        if (player is null && !string.IsNullOrWhiteSpace(nickname))
        {
            player = await _db.RoomPlayers.FirstOrDefaultAsync(p => p.Nickname == nickname.Trim() && p.RoomId == room.Id);
        }
        if (player is null) return null;

        var theme = await GetRoomThemeAsync(room.Id);
        var rank = await _leaderboard.GetRankAsync(room.Id, player.Id) ?? 1;

        return new PlayerRejoinDataDto(
            room.Id,
            player.Id,
            room.PinCode,
            room.Mode,
            room.Status,
            player.Nickname,
            player.TotalScore,
            rank,
            theme
        );
    }

    public async Task<PlayerResponse?> GetPlayerResponseAsync(Guid roomPlayerId, Guid slideId)
    {
        return await _db.PlayerResponses
            .FirstOrDefaultAsync(pr => pr.RoomPlayerId == roomPlayerId && pr.SlideId == slideId);
    }

    // ── FINISH ROOM (PODIUM) ───────────────────────────────────────────
    public async Task<IEnumerable<LeaderboardEntryDto>> FinishRoomAsync(Guid roomId, Guid hostId)
    {
        var room = await _db.Rooms.FindAsync(roomId) ?? throw new KeyNotFoundException("Không tìm thấy phòng.");
        if (room.HostId != hostId) throw new UnauthorizedAccessException("Bạn không phải chủ phòng.");

        await UpdateRoomStatusAsync(roomId, "FINISHED");

        // Lấy top 3 từ Leaderboard (Redis hoặc DB)
        var fullLeaderboard = await GetLeaderboardAsync(roomId);
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

    // ── ROOM HISTORY ───────────────────────────────────────────────────
    public async Task<IEnumerable<HostedRoomHistoryDto>> GetHostedRoomsHistoryAsync(Guid hostId)
    {
        var rooms = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.Quiz)
            .Include(r => r.Players)
            .Where(r => r.HostId == hostId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new HostedRoomHistoryDto(
                r.Id,
                r.PinCode,
                r.Quiz.Title,
                r.Mode,
                r.Status,
                r.Players.Count,
                r.CreatedAt
            ))
            .ToListAsync();

        return rooms;
    }

    public async Task<IEnumerable<PlayedRoomHistoryDto>> GetPlayedRoomsHistoryAsync(Guid userId)
    {
        var playerRecords = await _db.RoomPlayers
            .AsNoTracking()
            .Include(rp => rp.Room)
                .ThenInclude(r => r.Quiz)
            .Include(rp => rp.Room)
                .ThenInclude(r => r.Host)
            .Include(rp => rp.Room)
                .ThenInclude(r => r.Players)
            .Where(rp => rp.UserId == userId)
            .OrderByDescending(rp => rp.JoinedAt)
            .ToListAsync();

        var result = new List<PlayedRoomHistoryDto>();

        foreach (var rp in playerRecords)
        {
            if (rp.Room == null) continue;

            var sortedPlayers = rp.Room.Players
                .OrderByDescending(p => p.TotalScore)
                .ThenBy(p => p.JoinedAt)
                .ToList();

            int rank = sortedPlayers.FindIndex(p => p.Id == rp.Id) + 1;
            if (rank <= 0) rank = 1;

            result.Add(new PlayedRoomHistoryDto(
                rp.Room.Id,
                rp.Room.Quiz?.Title ?? "Bộ đề không xác định",
                rp.Room.Host?.Nickname ?? "Chủ phòng",
                rp.TotalScore,
                rank,
                rp.JoinedAt
            ));
        }

        return result;
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
            await _leaderboard.RemoveAsync(roomId, playerId);
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

    public async Task<string> GetRoomThemeAsync(Guid roomId)
    {
        var theme = await _cacheStore.GetStringAsync($"room_theme:{roomId}");
        return string.IsNullOrWhiteSpace(theme) ? "SPEED_RACER" : theme;
    }

    public async Task SetRoomThemeAsync(Guid roomId, string theme)
    {
        await _cacheStore.SetStringAsync($"room_theme:{roomId}", theme, TimeSpan.FromDays(2));
    }
}
