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
    Task<RoomDetailReportDto> GetRoomReportDetailAsync(Guid roomId, Guid hostId);
    Task<IEnumerable<HostedRoomHistoryDto>> GetHostedRoomsHistoryAsync(Guid hostId);
    Task<IEnumerable<PlayedRoomHistoryDto>> GetPlayedRoomsHistoryAsync(Guid userId);
    string GenerateQrCodeBase64(string pin);
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

        _logger.LogInformation("Room created: PIN={Pin}, Mode={Mode}", pin, request.Mode);

        string qrCodeBase64 = GenerateQrCodeBase64(pin);

        return new RoomDto(room.Id, room.PinCode, room.Mode, room.Status,
            room.QuizId, quiz.Title, room.CreatedAt, qrCodeBase64);
    }

    public string GenerateQrCodeBase64(string pin)
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

        return new AnswerResultDto(isCorrect, scoreAwarded, player.TotalScore, correctAnswer,
            rankAfter ?? 0, rankChange);
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

    // ── DETAIL REPORT & EXPORT ─────────────────────────────────────────
    public async Task<RoomDetailReportDto> GetRoomReportDetailAsync(Guid roomId, Guid hostId)
    {
        var room = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.Quiz)
            .Include(r => r.Players)
                .ThenInclude(p => p.Responses)
            .FirstOrDefaultAsync(r => r.Id == roomId) 
            ?? throw new KeyNotFoundException("Không tìm thấy phòng.");

        if (room.HostId != hostId) 
            throw new UnauthorizedAccessException("Bạn không phải chủ phòng.");

        var slides = await _db.Slides
            .AsNoTracking()
            .Where(s => s.QuizId == room.QuizId && !s.IsDeleted)
            .OrderBy(s => s.OrderIndex)
            .ToListAsync();

        var responses = await _db.PlayerResponses
            .AsNoTracking()
            .Where(pr => pr.RoomPlayer.RoomId == roomId)
            .ToListAsync();

        // 1. Phân tích từng Thí sinh
        var sortedPlayers = room.Players.OrderByDescending(p => p.TotalScore).ToList();
        var playerDtos = new List<PlayerReportItemDto>();
        for (int i = 0; i < sortedPlayers.Count; i++)
        {
            var p = sortedPlayers[i];
            var pResponses = responses.Where(r => r.RoomPlayerId == p.Id).ToList();
            int correctCount = pResponses.Count(r => r.IsCorrect);
            int wrongCount = pResponses.Count(r => !r.IsCorrect);
            double accuracy = pResponses.Count > 0 ? (double)correctCount / pResponses.Count * 100 : 0;
            double avgTime = pResponses.Count > 0 
                ? (pResponses.Average(r => r.ResponseTimeMs ?? 0) / 1000.0) 
                : 0;

            playerDtos.Add(new PlayerReportItemDto(
                i + 1,
                p.Nickname,
                p.TotalScore,
                correctCount,
                wrongCount,
                Math.Round(accuracy, 1),
                Math.Round(avgTime, 2)
            ));
        }

        // 2. Phân tích từng Câu hỏi
        var questionDtos = new List<QuestionReportItemDto>();
        foreach (var slide in slides)
        {
            var sResponses = responses.Where(r => r.SlideId == slide.Id).ToList();
            int totalAns = sResponses.Count;
            int correctAns = sResponses.Count(r => r.IsCorrect);
            double qAccuracy = totalAns > 0 ? (double)correctAns / totalAns * 100 : 0;
            
            string difficulty = qAccuracy >= 70 ? "Dễ" : (qAccuracy >= 40 ? "Trung bình" : "Khó");
            if (totalAns == 0) difficulty = "Chưa có lượt trả lời";

            questionDtos.Add(new QuestionReportItemDto(
                slide.OrderIndex + 1,
                slide.QuestionText,
                slide.Type,
                totalAns,
                correctAns,
                Math.Round(qAccuracy, 1),
                difficulty
            ));
        }

        double overallAccuracy = responses.Count > 0 
            ? (double)responses.Count(r => r.IsCorrect) / responses.Count * 100 
            : 0;

        var questionsWithAnswers = questionDtos.Where(q => q.TotalAnswers > 0).ToList();
        string? hardest = questionsWithAnswers.OrderBy(q => q.Accuracy).FirstOrDefault()?.QuestionText;
        string? easiest = questionsWithAnswers.OrderByDescending(q => q.Accuracy).FirstOrDefault()?.QuestionText;

        return new RoomDetailReportDto(
            room.Id,
            room.PinCode,
            room.Quiz.Title,
            room.Mode,
            room.Status,
            room.CreatedAt,
            sortedPlayers.Count,
            Math.Round(overallAccuracy, 1),
            hardest,
            easiest,
            playerDtos,
            questionDtos
        );
    }

    public async Task<byte[]> ExportRoomReportAsync(Guid roomId, Guid hostId)
    {
        var detail = await GetRoomReportDetailAsync(roomId, hostId);

        using var workbook = new XLWorkbook();

        // ═══════════════ SHEET 1: BẢNG ĐIỂM THÍ SINH ═══════════════
        var wsPlayers = workbook.Worksheets.Add("Bảng điểm thí sinh");

        // Header thông tin chung
        wsPlayers.Cell(1, 1).Value = "BÁO CÁO TỔNG KẾT KẾT QUẢ THI ĐẤU";
        wsPlayers.Range("A1:G1").Merge().Style
            .Font.SetBold().Font.SetFontSize(16).Font.SetFontColor(XLColor.FromHtml("#005C53"));

        wsPlayers.Cell(3, 1).Value = "Bộ Đề:";
        wsPlayers.Cell(3, 2).Value = detail.QuizTitle;
        wsPlayers.Cell(3, 1).Style.Font.Bold = true;

        wsPlayers.Cell(4, 1).Value = "Mã PIN:";
        wsPlayers.Cell(4, 2).Value = detail.PinCode;
        wsPlayers.Cell(4, 1).Style.Font.Bold = true;

        wsPlayers.Cell(3, 4).Value = "Thời Gian:";
        wsPlayers.Cell(3, 5).Value = detail.CreatedAt.ToString("dd/MM/yyyy HH:mm");
        wsPlayers.Cell(3, 4).Style.Font.Bold = true;

        wsPlayers.Cell(4, 4).Value = "Tổng Thí Sinh:";
        wsPlayers.Cell(4, 5).Value = detail.TotalPlayers;
        wsPlayers.Cell(4, 4).Style.Font.Bold = true;

        wsPlayers.Cell(3, 6).Value = "Tỷ Lệ Đúng Chung:";
        wsPlayers.Cell(3, 7).Value = $"{detail.OverallAccuracy}%";
        wsPlayers.Cell(3, 6).Style.Font.Bold = true;

        // Bảng danh sách thí sinh
        int pHeaderRow = 6;
        wsPlayers.Cell(pHeaderRow, 1).Value = "Hạng";
        wsPlayers.Cell(pHeaderRow, 2).Value = "Tên Thí Sinh";
        wsPlayers.Cell(pHeaderRow, 3).Value = "Tổng Điểm";
        wsPlayers.Cell(pHeaderRow, 4).Value = "Số Câu Đúng";
        wsPlayers.Cell(pHeaderRow, 5).Value = "Số Câu Sai";
        wsPlayers.Cell(pHeaderRow, 6).Value = "Độ Chính Xác (%)";
        wsPlayers.Cell(pHeaderRow, 7).Value = "Thời Gian TB (giây)";

        var pHeader = wsPlayers.Range(pHeaderRow, 1, pHeaderRow, 7);
        pHeader.Style.Font.Bold = true;
        pHeader.Style.Font.FontColor = XLColor.White;
        pHeader.Style.Fill.BackgroundColor = XLColor.FromHtml("#005C53");
        pHeader.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        int row = pHeaderRow + 1;
        foreach (var p in detail.Players)
        {
            wsPlayers.Cell(row, 1).Value = p.Rank;
            wsPlayers.Cell(row, 2).Value = p.Nickname;
            wsPlayers.Cell(row, 3).Value = p.TotalScore;
            wsPlayers.Cell(row, 4).Value = p.CorrectCount;
            wsPlayers.Cell(row, 5).Value = p.WrongCount;
            wsPlayers.Cell(row, 6).Value = $"{p.Accuracy}%";
            wsPlayers.Cell(row, 7).Value = p.AvgResponseTimeSec;

            // Tô màu top 3
            if (p.Rank == 1) wsPlayers.Row(row).Style.Fill.BackgroundColor = XLColor.FromHtml("#FFF9C4");
            else if (p.Rank == 2) wsPlayers.Row(row).Style.Fill.BackgroundColor = XLColor.FromHtml("#F5F5F5");
            else if (p.Rank == 3) wsPlayers.Row(row).Style.Fill.BackgroundColor = XLColor.FromHtml("#FFE0B2");

            row++;
        }

        wsPlayers.Range(pHeaderRow, 1, Math.Max(row - 1, pHeaderRow), 7).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        wsPlayers.Range(pHeaderRow, 1, Math.Max(row - 1, pHeaderRow), 7).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        wsPlayers.Columns().AdjustToContents();

        // ═══════════════ SHEET 2: PHÂN TÍCH TỪNG CÂU HỎI ═══════════════
        var wsQuestions = workbook.Worksheets.Add("Phân tích câu hỏi");

        wsQuestions.Cell(1, 1).Value = "PHÂN TÍCH ĐỘ KHÓ VÀ TỶ LỆ TRẢ LỜI TỪNG CÂU HỎI";
        wsQuestions.Range("A1:G1").Merge().Style
            .Font.SetBold().Font.SetFontSize(15).Font.SetFontColor(XLColor.FromHtml("#005C53"));

        int qHeaderRow = 3;
        wsQuestions.Cell(qHeaderRow, 1).Value = "STT";
        wsQuestions.Cell(qHeaderRow, 2).Value = "Nội Dung Câu Hỏi";
        wsQuestions.Cell(qHeaderRow, 3).Value = "Loại Câu";
        wsQuestions.Cell(qHeaderRow, 4).Value = "Số Lượt Trả Lời";
        wsQuestions.Cell(qHeaderRow, 5).Value = "Số Lượt Đúng";
        wsQuestions.Cell(qHeaderRow, 6).Value = "Tỷ Lệ Đúng (%)";
        wsQuestions.Cell(qHeaderRow, 7).Value = "Đánh Giá Sư Phạm";

        var qHeader = wsQuestions.Range(qHeaderRow, 1, qHeaderRow, 7);
        qHeader.Style.Font.Bold = true;
        qHeader.Style.Font.FontColor = XLColor.White;
        qHeader.Style.Fill.BackgroundColor = XLColor.FromHtml("#042940");
        qHeader.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        int qRow = qHeaderRow + 1;
        foreach (var q in detail.Questions)
        {
            wsQuestions.Cell(qRow, 1).Value = q.OrderIndex;
            wsQuestions.Cell(qRow, 2).Value = q.QuestionText;
            wsQuestions.Cell(qRow, 3).Value = q.Type;
            wsQuestions.Cell(qRow, 4).Value = q.TotalAnswers;
            wsQuestions.Cell(qRow, 5).Value = q.CorrectAnswers;
            wsQuestions.Cell(qRow, 6).Value = $"{q.Accuracy}%";
            wsQuestions.Cell(qRow, 7).Value = q.Difficulty;

            if (q.Difficulty == "Khó")
                wsQuestions.Cell(qRow, 7).Style.Font.FontColor = XLColor.Red;
            else if (q.Difficulty == "Dễ")
                wsQuestions.Cell(qRow, 7).Style.Font.FontColor = XLColor.Green;

            qRow++;
        }

        wsQuestions.Range(qHeaderRow, 1, Math.Max(qRow - 1, qHeaderRow), 7).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        wsQuestions.Range(qHeaderRow, 1, Math.Max(qRow - 1, qHeaderRow), 7).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        wsQuestions.Columns().AdjustToContents();

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
}
