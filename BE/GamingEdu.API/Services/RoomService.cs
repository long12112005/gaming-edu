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
    Task<Room?> GetRoomByIdAsync(Guid roomId);
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
    Task<HostedRoomHistoryDto?> GetHostedRoomDetailsAsync(Guid roomId, Guid hostId) => Task.FromResult<HostedRoomHistoryDto?>(null);
    Task<IEnumerable<HostedRoomHistoryDto>> GetHostedRoomsHistoryAsync(Guid hostId);
    Task<IEnumerable<PlayedRoomHistoryDto>> GetPlayedRoomsHistoryAsync(Guid userId);
    Task<string> GetRoomThemeAsync(Guid roomId);
    Task SetRoomThemeAsync(Guid roomId, string theme);
    Task<SlideDistributionDto> GetSlideAnswerDistributionAsync(Guid roomId, Guid slideId);
    Task<PlayerRejoinDataDto?> RejoinRoomPlayerAsync(string pinCode, Guid? playerId, string? nickname, Guid? userId = null);
    Task<PlayerResponse?> GetPlayerResponseAsync(Guid roomPlayerId, Guid slideId);
    Task<int> GetPlayerHpAsync(Guid roomId, Guid roomPlayerId);
    Task SetPlayerHpAsync(Guid roomId, Guid roomPlayerId, int hp);
    Task<BattleRoyaleStateDto> GetBattleRoyaleStateAsync(Guid roomId);
    Task ApplyBattleRoyaleTimeoutPenaltyAsync(Guid roomId, Guid slideId);
    Task<WagerPoolStateDto> PlaceWagerAsync(Guid roomId, Guid roomPlayerId, Guid slideId, int wagerPercent, int wagerAmount);
    Task<WagerPoolStateDto> GetWagerPoolStateAsync(Guid roomId, Guid slideId);
    Task<(int percent, int amount)> GetPlayerWagerAsync(Guid roomPlayerId, Guid slideId);
    Task<BombDefusalStateDto> GetBombDefusalStateAsync(Guid roomId, Guid slideId);
    Task RecordBombDefusalResultAsync(Guid roomId, Guid slideId, Guid roomPlayerId, string nickname, bool isDefused, int defusedWires, int totalWires, List<bool> wireCuts);
    Task<WordHunterStateDto> GetWordHunterStateAsync(Guid roomId, Guid slideId);
    Task RecordWordHunterGuessAsync(Guid roomId, Guid slideId, Guid roomPlayerId, string nickname, string? avatarUrl, string guess, bool isCorrect, int responseTimeMs, int scoreAwarded);
    Task<BridgeBuilderStateDto> GetBridgeBuilderStateAsync(Guid roomId, Guid slideId);
    Task RecordBridgeBuilderCrossingAsync(Guid roomId, Guid slideId, Guid roomPlayerId, string nickname, string? avatarUrl, bool isFullyCrossed, int builtSpans, int totalSpans, List<bool> spanBridges, int responseTimeMs, int scoreAwarded);
    Task<CircuitConnectStateDto> GetCircuitConnectStateAsync(Guid roomId, Guid slideId);
    Task RecordCircuitConnectResultAsync(Guid roomId, Guid slideId, Guid roomPlayerId, string nickname, string? avatarUrl, bool isFullCircuit, int correctWires, int totalWires, List<bool> wireResults, int responseTimeMs, int scoreAwarded);
    Task<RoomDetailedReportDto> GetRoomDetailedReportAsync(Guid roomId, Guid hostId);
    Task<RoomDto> UpdateTournamentSettingsAsync(Guid roomId, Guid hostId, UpdateTournamentSettingsRequest request);
    Task CloseRoomAsync(Guid roomId, Guid hostId);
    Task<List<object>> GetRoomActivePlayersAsync(Guid roomId);
    Task<List<PlayerArenaProgressDto>> GetRoomPlayersArenaProgressAsync(Guid roomId, Guid? boostedPlayerId = null, int boostedScore = 0, Guid? currentSlideId = null);
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

        var theme = string.IsNullOrWhiteSpace(request.GameModeTheme) ? "CLASSIC" : request.GameModeTheme.Trim();

        var settingsObj = new Dictionary<string, object>
        {
            ["theme"] = theme
        };
        if (request.QuestionTimeLimit.HasValue && request.QuestionTimeLimit.Value > 0)
        {
            settingsObj["questionTimeLimit"] = request.QuestionTimeLimit.Value;
        }

        var room = new Room
        {
            Id        = Guid.NewGuid(),
            HostId    = hostId,
            QuizId    = request.QuizId,
            PinCode   = pin,
            Mode      = request.Mode,
            Status    = "WAITING",
            MapSize   = theme == "NAVAL_WAR" ? 15 : 15,
            EndTime   = request.EndTime,
            GameSettings = JsonSerializer.Serialize(settingsObj),
            CreatedAt = DateTime.UtcNow,
        };

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        await _cacheStore.SetStringAsync($"room_theme:{room.Id}", theme, TimeSpan.FromDays(2));
        await _cacheStore.SetStringAsync($"room_theme:pin:{pin}", theme, TimeSpan.FromDays(2));

        _logger.LogInformation("Room created: PIN={Pin}, Mode={Mode}, Theme={Theme}, EndTime={EndTime}, QTL={QTL}", pin, request.Mode, theme, request.EndTime, request.QuestionTimeLimit);

        string qrCodeBase64 = GenerateQrCodeBase64(pin);
        var slideCount = await _db.Slides.CountAsync(s => s.QuizId == room.QuizId && !s.IsDeleted);

        return new RoomDto(room.Id, room.PinCode, room.Mode, room.Status,
            room.QuizId, quiz.Title, room.CreatedAt, qrCodeBase64, theme, slideCount, room.HostId,
            room.EndTime, request.QuestionTimeLimit, room.IsEarlyFinished);
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
        // Cho phép vào phòng nếu đang WAITING hoặc nếu là ASYNC_TOURNAMENT và chưa FINISHED
        var room = await _db.Rooms
            .FirstOrDefaultAsync(r => r.PinCode == request.PinCode && (r.Status == "WAITING" || (r.Mode == "ASYNC_TOURNAMENT" && r.Status != "FINISHED")))
            ?? throw new KeyNotFoundException(
                $"Phòng có mã PIN '{request.PinCode}' không tồn tại hoặc đã kết thúc.");

        if (room.Mode == "ASYNC_TOURNAMENT" && room.EndTime.HasValue && room.EndTime.Value < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Giải đấu này đã hết thời hạn tham gia.");
        }

        // Resolve user if not provided
        if (!userId.HasValue && request.UserId.HasValue)
        {
            userId = request.UserId.Value;
        }
        else if (!userId.HasValue)
        {
            var matchedUser = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Nickname == request.Nickname.Trim());
            if (matchedUser != null)
            {
                userId = matchedUser.Id;
            }
        }

        // Prevent duplicate join (same user or nickname in same room)
        var existingPlayer = await _db.RoomPlayers
            .FirstOrDefaultAsync(rp => rp.RoomId == room.Id && ((userId.HasValue && rp.UserId == userId) || rp.Nickname == request.Nickname.Trim()));
        if (existingPlayer != null)
        {
            if (userId.HasValue && existingPlayer.UserId == null)
            {
                existingPlayer.UserId = userId.Value;
                await _db.SaveChangesAsync();
            }
            return (room, existingPlayer);
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

        // Khởi tạo HP mặc định 100 cho người chơi
        await SetPlayerHpAsync(room.Id, player.Id, 100);

        return (room, player);
    }

    // ── GET ROOM BY PIN ────────────────────────────────────────────────
    public async Task<Room?> GetRoomByPinAsync(string pinCode)
        => await _db.Rooms
            .Include(r => r.Quiz)
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.PinCode == pinCode);

    public async Task<Room?> GetRoomByIdAsync(Guid roomId)
        => await _db.Rooms
            .Include(r => r.Quiz)
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Id == roomId);

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
        double partialRatio = 1.0;
        int    scoreAwarded = 0;
        int    streak       = 0;
        int    streakBonus  = 0;
        string correctAnswer;

        // Mini-Game 04: Defuse the Bomb fields
        bool isBombDefused = false;
        int totalWires = 0;
        int defusedWires = 0;
        List<WireDefuseResultDto>? wireResults = null;

        // Mini-Game 06: Bridge Builder fields
        bool isBridgeCrossed = false;
        int totalSpans = 0;
        int builtSpans = 0;
        List<BridgeSpanResultDto>? spanResults = null;

        // Mini-Game 08: Circuit Connect fields
        bool isFullCircuit = false;
        int totalCircuitWires = 0;
        int connectedCorrectWires = 0;
        List<CircuitWireResultDto>? circuitWireResults = null;

        if (slide.Type == "QUIZ")
        {
            var selectedIds = ParseOptionIds(request.AnswerData);
            var correctOptions = slide.Options.Where(o => o.IsCorrect).Select(o => o.Id).ToHashSet();
            int totalCorrect = correctOptions.Count;

            if (totalCorrect == 0)
            {
                isCorrect = true;
                partialRatio = 1.0;
            }
            else
            {
                int correctSelected = selectedIds.Count(id => correctOptions.Contains(id));
                int wrongSelected = selectedIds.Count(id => !correctOptions.Contains(id));

                if (correctSelected == totalCorrect && wrongSelected == 0)
                {
                    isCorrect = true;
                    partialRatio = 1.0;
                }
                else if (correctSelected > 0)
                {
                    // Partial Credit: Tính tỷ lệ đúng trừ đi hình phạt nếu chọn nhầm
                    double penalty = wrongSelected * 0.5 / Math.Max(1, slide.Options.Count - totalCorrect);
                    partialRatio = Math.Max(0.0, Math.Round(((double)correctSelected / totalCorrect) - penalty, 2));
                    isCorrect = partialRatio >= 0.99;
                }
                else
                {
                    isCorrect = false;
                    partialRatio = 0.0;
                }
            }

            correctAnswer = GetCorrectAnswer(slide);
            scoreAwarded = (int)Math.Round(slide.Points * partialRatio * speedFactor);
        }
        else if (slide.Type == "FILL_IN_BLANK" || slide.Type == "FILL_IN_THE_BLANK")
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

            if (correctOptions.Count == 0 && slide.Options.Count > 0)
            {
                correctOptions = slide.Options.OrderBy(o => o.OrderIndex).ToList();
            }

            var keywordSets = correctOptions
                .Select(o => (IList<string>)FuzzyMatchingService.ParseKeywords(o.BlankKeywords))
                .ToList();

            if (keywordSets.Count == 0)
            {
                keywordSets = [[]];
            }

            var (isFullyCorrect, scoreRatio, correctCount, totalBlanks, details) =
                _fuzzy.GradeFillInBlankDetailed(userAnswers, keywordSets);

            isCorrect    = isFullyCorrect;
            partialRatio = scoreRatio;
            scoreAwarded = (int)Math.Round(slide.Points * scoreRatio * speedFactor);
            correctAnswer = string.Join(" | ", correctOptions
                .Select(o => FuzzyMatchingService.ParseKeywords(o.BlankKeywords)
                                .FirstOrDefault() ?? o.Content));

            string[] wireColorPalette = ["red", "blue", "yellow", "green", "purple", "orange"];
            wireResults = details.Select(d => new WireDefuseResultDto(
                WireIndex: d.Index + 1,
                WireColor: wireColorPalette[d.Index % wireColorPalette.Length],
                IsCut: d.IsCorrect,
                UserInput: d.UserAnswer,
                ExpectedKeyword: d.PrimaryKeyword,
                NormalizedKeyword: d.NormalizedKeyword
            )).ToList();

            isBombDefused = isFullyCorrect;
            totalWires = totalBlanks;
            defusedWires = correctCount;

            isBridgeCrossed = isFullyCorrect;
            totalSpans = totalBlanks;
            builtSpans = correctCount;
            spanResults = details.Select(d => new BridgeSpanResultDto(
                SpanIndex: d.Index + 1,
                IsBuilt: d.IsCorrect,
                UserInput: d.UserAnswer,
                ExpectedKeyword: d.PrimaryKeyword,
                NormalizedKeyword: d.NormalizedKeyword
            )).ToList();

            _logger.LogDebug(
                "FILL_IN_BLANK / DEFUSE_BOMB / BRIDGE_BUILDER: {Correct}/{Total} blanks correct, ratio={Ratio:P0}",
                correctCount, totalBlanks, scoreRatio);
        }
        else if (slide.Type == "MATCHING")
        {
            List<MatchingPairAnswer> userPairs;
            try
            {
                userPairs = JsonSerializer.Deserialize<List<MatchingPairAnswer>>(
                    request.AnswerData,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                ) ?? [];
            }
            catch
            {
                userPairs = [];
            }

            var matchingOptions = slide.Options
                .Where(o => !string.IsNullOrWhiteSpace(o.MatchingPair))
                .OrderBy(o => o.OrderIndex)
                .ToList();

            if (matchingOptions.Count == 0 && slide.Options.Count > 0)
            {
                matchingOptions = slide.Options.OrderBy(o => o.OrderIndex).ToList();
            }

            totalCircuitWires = matchingOptions.Count;
            int correctCount = 0;
            string[] circuitColorPalette = ["#ef4444", "#3b82f6", "#eab308", "#10b981", "#a855f7", "#f97316", "#06b6d4", "#ec4899"];
            circuitWireResults = new List<CircuitWireResultDto>();

            for (int i = 0; i < matchingOptions.Count; i++)
            {
                var opt = matchingOptions[i];
                var userPair = userPairs.FirstOrDefault(p =>
                    Guid.TryParse(p.LeftId, out var parsedGuid)
                        ? parsedGuid == opt.Id
                        : p.LeftId.Equals(opt.Id.ToString(), StringComparison.OrdinalIgnoreCase));

                bool isConnected = userPair != null && !string.IsNullOrWhiteSpace(userPair.RightContent);
                string userRight = userPair?.RightContent ?? "";
                string expectedRight = opt.MatchingPair ?? "";

                bool isPairCorrect = isConnected &&
                    FuzzyMatchingService.Normalize(expectedRight) == FuzzyMatchingService.Normalize(userRight);

                if (isPairCorrect)
                {
                    correctCount++;
                }

                circuitWireResults.Add(new CircuitWireResultDto(
                    WireIndex: i + 1,
                    LeftId: opt.Id,
                    LeftContent: opt.Content,
                    UserRightContent: userRight,
                    ExpectedRightContent: expectedRight,
                    IsConnected: isConnected,
                    IsCorrect: isPairCorrect,
                    WireColor: circuitColorPalette[i % circuitColorPalette.Length]
                ));
            }

            connectedCorrectWires = correctCount;
            partialRatio = totalCircuitWires > 0 ? (double)correctCount / totalCircuitWires : 0.0;
            isFullCircuit = (totalCircuitWires > 0 && correctCount == totalCircuitWires);
            isCorrect = isFullCircuit;
            scoreAwarded = (int)Math.Round(slide.Points * partialRatio * speedFactor);
            correctAnswer = string.Join(" | ", matchingOptions.Select(o => $"{o.Content} → {o.MatchingPair}"));

            _logger.LogDebug(
                "MATCHING / CIRCUIT_CONNECT: {Correct}/{Total} wires correct, ratio={Ratio:P0}",
                correctCount, totalCircuitWires, partialRatio);
        }
        else
        {
            isCorrect    = GradeAnswerExact(slide, request.AnswerData);
            correctAnswer = GetCorrectAnswer(slide);

            if (isCorrect)
                scoreAwarded = (int)Math.Round(slide.Points * speedFactor);
            else
                partialRatio = 0.0;
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

        // ── Battle Royale Sinh Tồn Logic ──────────────────────────────
        var theme = await GetRoomThemeAsync(player.RoomId);
        int currentHp = 100;
        int maxHp = 100;
        int hpDeducted = 0;
        bool isEliminated = false;

        if (theme == "BATTLE_ROYALE")
        {
            currentHp = await GetPlayerHpAsync(player.RoomId, roomPlayerId);
            if (currentHp <= 0)
            {
                isEliminated = true;
                currentHp = 0;
                hpDeducted = 0;
                // Người hết HP chuyển sang Bóng ma, vẫn được tích điểm phụ (50%)
                scoreAwarded = (int)Math.Round(scoreAwarded * 0.5);
            }
            else
            {
                if (isCorrect)
                {
                    hpDeducted = 0;
                }
                else if (partialRatio > 0.0)
                {
                    // Giảm lượng HP bị trừ theo Partial Credit (tối đa 35 HP)
                    hpDeducted = (int)Math.Round(35.0 * (1.0 - partialRatio));
                }
                else
                {
                    hpDeducted = 35; // Sai hoàn toàn hoặc không khớp
                }

                currentHp = Math.Max(0, currentHp - hpDeducted);
                if (currentHp == 0)
                {
                    isEliminated = true;
                }
                await SetPlayerHpAsync(player.RoomId, roomPlayerId, currentHp);
            }
        }

        // ── Quiz Wager (Đặt Cược Trí Tuệ) Logic ───────────────────────
        int wagerPercent = request.WagerPercent;
        int wagerAmount  = request.WagerAmount;
        int wagerNetGain = 0;

        if (theme == "QUIZ_WAGER")
        {
            if (wagerPercent == 0 && wagerAmount == 0)
            {
                var savedWager = await GetPlayerWagerAsync(roomPlayerId, request.SlideId);
                wagerPercent = savedWager.percent;
                wagerAmount  = savedWager.amount;
            }

            if (wagerPercent > 0 && wagerAmount == 0)
            {
                int effectiveBankroll = Math.Max(player.TotalScore, slide.Points);
                wagerAmount = (int)Math.Round(effectiveBankroll * (wagerPercent / 100.0));
            }

            if (wagerAmount > 0)
            {
                if (isCorrect)
                {
                    // Trả lời đúng: cộng điểm chuẩn kèm phần thưởng nhân theo mức cược
                    wagerNetGain = wagerAmount;
                    scoreAwarded += wagerNetGain;
                }
                else
                {
                    // Trả lời sai: bị trừ số điểm đã cược (điểm tổng không âm)
                    wagerNetGain = -wagerAmount;
                    scoreAwarded = -wagerAmount;
                }
            }
        }

        if (theme == "DEFUSE_BOMB")
        {
            var wireCutList = wireResults?.Select(w => w.IsCut).ToList() ?? [isCorrect];
            await RecordBombDefusalResultAsync(player.RoomId, slide.Id, player.Id, player.Nickname, isBombDefused, defusedWires, totalWires, wireCutList);
        }

        if (theme == "WORD_HUNTER")
        {
            string userGuessText = request.AnswerData;
            try
            {
                var arr = JsonSerializer.Deserialize<List<string>>(request.AnswerData);
                if (arr != null && arr.Count > 0)
                {
                    userGuessText = string.Join(" ", arr);
                }
            }
            catch { }

            await RecordWordHunterGuessAsync(player.RoomId, slide.Id, player.Id, player.Nickname, player.AvatarUrl, userGuessText, isCorrect, request.ResponseTimeMs, scoreAwarded);
        }

        if (theme == "BRIDGE_BUILDER")
        {
            var spanBuiltList = spanResults?.Select(s => s.IsBuilt).ToList() ?? [isCorrect];
            await RecordBridgeBuilderCrossingAsync(player.RoomId, slide.Id, player.Id, player.Nickname, player.AvatarUrl, isBridgeCrossed, builtSpans, totalSpans, spanBuiltList, request.ResponseTimeMs, scoreAwarded);
        }

        if (theme == "CIRCUIT_CONNECT")
        {
            var wireResultBools = circuitWireResults?.Select(w => w.IsCorrect).ToList() ?? [isCorrect];
            await RecordCircuitConnectResultAsync(player.RoomId, slide.Id, player.Id, player.Nickname, player.AvatarUrl, isFullCircuit, connectedCorrectWires, totalCircuitWires, wireResultBools, request.ResponseTimeMs, scoreAwarded);
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

        // Update total_score in room_players table (bảo đảm điểm không âm)
        player.TotalScore = Math.Max(0, player.TotalScore + scoreAwarded);

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
            streakBonus,
            currentHp,
            maxHp,
            hpDeducted,
            isEliminated,
            partialRatio,
            wagerPercent,
            wagerAmount,
            wagerNetGain,
            isBombDefused,
            totalWires,
            defusedWires,
            wireResults,
            isCorrect,
            correctAnswer,
            isBridgeCrossed,
            totalSpans,
            builtSpans,
            spanResults,
            isFullCircuit,
            totalCircuitWires,
            connectedCorrectWires,
            circuitWireResults
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

    public async Task<PlayerRejoinDataDto?> RejoinRoomPlayerAsync(string pinCode, Guid? playerId, string? nickname, Guid? userId = null)
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

        if (userId.HasValue && player.UserId == null)
        {
            player.UserId = userId.Value;
            await _db.SaveChangesAsync();
        }

        var theme = await GetRoomThemeAsync(room.Id);
        var rank = await _leaderboard.GetRankAsync(room.Id, player.Id) ?? 1;
        int hp = await GetPlayerHpAsync(room.Id, player.Id);
        bool isEliminated = hp <= 0;

        return new PlayerRejoinDataDto(
            room.Id,
            player.Id,
            room.PinCode,
            room.Mode,
            room.Status,
            player.Nickname,
            player.TotalScore,
            rank,
            theme,
            hp,
            100,
            isEliminated
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
        var user = await _db.Users.FindAsync(hostId);
        bool isAdmin = user?.IsAdmin ?? false;
        if (!isAdmin && room.HostId != hostId) throw new UnauthorizedAccessException("Bạn không phải chủ phòng.");

        room.IsEarlyFinished = true;
        room.EndTime = DateTime.UtcNow;
        await UpdateRoomStatusAsync(roomId, "FINISHED");

        // Lấy top 3 từ Leaderboard (Redis hoặc DB)
        var fullLeaderboard = await GetLeaderboardAsync(roomId);
        return fullLeaderboard.Take(3);
    }

    // ── DETAIL REPORT ──────────────────────────────────────────────────
    public async Task<RoomDetailReportDto> GetRoomReportDetailAsync(Guid roomId, Guid hostId)
    {
        var room = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.Quiz)
                .ThenInclude(q => q.Slides)
                    .ThenInclude(s => s.Options)
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

    // ── DETAILED REPORT ───────────────────────────────────────────────
    public async Task<RoomDetailedReportDto> GetRoomDetailedReportAsync(Guid roomId, Guid hostId)
    {
        var room = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.Quiz)
                .ThenInclude(q => q.Slides)
                    .ThenInclude(s => s.Options)
            .Include(r => r.Players)
                .ThenInclude(p => p.Responses)
            .FirstOrDefaultAsync(r => r.Id == roomId) ?? throw new KeyNotFoundException("Không tìm thấy phòng.");

        var user = await _db.Users.FindAsync(hostId);
        bool isAdmin = user?.IsAdmin ?? false;
        if (!isAdmin && room.HostId != hostId) throw new UnauthorizedAccessException("Bạn không phải chủ phòng.");

        var slides = room.Quiz.Slides.OrderBy(s => s.OrderIndex).ToList();
        var players = room.Players.OrderByDescending(p => p.TotalScore).ToList();

        // 1. Tổng kết từng câu hỏi
        var questionSummaries = new List<QuestionSummaryDto>();
        for (int i = 0; i < slides.Count; i++)
        {
            var slide = slides[i];
            var allSlideResponses = room.Players
                .SelectMany(p => p.Responses)
                .Where(r => r.SlideId == slide.Id)
                .ToList();

            int totalAns = allSlideResponses.Count;
            int correctAns = allSlideResponses.Count(r => r.IsCorrect);
            double accuracy = totalAns > 0 ? Math.Round((double)correctAns / totalAns * 100, 1) : 0;
            string correctAnsStr = GetCorrectAnswer(slide);

            questionSummaries.Add(new QuestionSummaryDto(
                slide.Id,
                i + 1,
                slide.QuestionText,
                slide.Type,
                correctAnsStr,
                totalAns,
                correctAns,
                accuracy
            ));
        }

        // 2. Tổng kết từng thí sinh kèm mảng câu trả lời
        var playerSummaries = new List<PlayerReportSummaryDto>();
        for (int pIdx = 0; pIdx < players.Count; pIdx++)
        {
            var p = players[pIdx];
            var pAnswers = new List<PlayerAnswerSummaryDto>();
            int correctCount = 0;
            int wrongCount = 0;

            for (int sIdx = 0; sIdx < slides.Count; sIdx++)
            {
                var slide = slides[sIdx];
                var resp = p.Responses.FirstOrDefault(r => r.SlideId == slide.Id);
                if (resp != null)
                {
                    if (resp.IsCorrect) correctCount++;
                    else wrongCount++;

                    pAnswers.Add(new PlayerAnswerSummaryDto(
                        slide.Id,
                        sIdx + 1,
                        resp.IsCorrect,
                        resp.ScoreAwarded,
                        resp.ResponseTimeMs,
                        resp.AnswerData
                    ));
                }
                else
                {
                    wrongCount++;
                    pAnswers.Add(new PlayerAnswerSummaryDto(
                        slide.Id,
                        sIdx + 1,
                        false,
                        0,
                        null,
                        null
                    ));
                }
            }

            double playerAccuracy = slides.Count > 0 ? Math.Round((double)correctCount / slides.Count * 100, 1) : 0;
            int answeredCount = p.Responses.Count(r => !string.IsNullOrEmpty(r.AnswerData));
            bool isCompleted = slides.Count > 0 && answeredCount >= slides.Count;

            playerSummaries.Add(new PlayerReportSummaryDto(
                p.Id,
                p.Nickname,
                p.AvatarUrl,
                p.TotalScore,
                pIdx + 1,
                correctCount,
                wrongCount,
                playerAccuracy,
                pAnswers,
                answeredCount,
                slides.Count,
                isCompleted
            ));
        }

        int? questionTimeLimit = null;
        if (!string.IsNullOrEmpty(room.GameSettings))
        {
            try
            {
                using var doc = JsonDocument.Parse(room.GameSettings);
                if (doc.RootElement.TryGetProperty("questionTimeLimit", out var qtlProp))
                {
                    questionTimeLimit = qtlProp.GetInt32();
                }
            }
            catch {}
        }

        return new RoomDetailedReportDto(
            room.Id,
            room.PinCode,
            room.Quiz.Title,
            room.Mode,
            room.Status,
            room.CreatedAt,
            players.Count,
            questionSummaries,
            playerSummaries,
            room.EndTime,
            room.IsEarlyFinished,
            questionTimeLimit
        );
    }

    // ── EXPORT REPORT (2 SHEETS: MA TRẬN & THỐNG KÊ CÂU HỎI) ─────────────
    public async Task<byte[]> ExportRoomReportAsync(Guid roomId, Guid hostId)
    {
        var report = await GetRoomDetailedReportAsync(roomId, hostId);

        using var workbook = new XLWorkbook();
        
        // ── SHEET 1: MA TRẬN BẢNG ĐIỂM CHI TIẾT ──
        var wsMatrix = workbook.Worksheets.Add("Bảng Điểm Chi Tiết");
        
        // Header Thông tin phòng
        wsMatrix.Cell(1, 1).Value = "Phòng Thi:";
        wsMatrix.Cell(1, 2).Value = report.QuizTitle;
        wsMatrix.Cell(1, 1).Style.Font.Bold = true;

        wsMatrix.Cell(2, 1).Value = "Mã PIN:";
        wsMatrix.Cell(2, 2).Value = report.PinCode;
        wsMatrix.Cell(2, 1).Style.Font.Bold = true;

        wsMatrix.Cell(3, 1).Value = "Thời gian tạo:";
        wsMatrix.Cell(3, 2).Value = report.CreatedAt.ToString("dd/MM/yyyy HH:mm:ss");
        wsMatrix.Cell(3, 1).Style.Font.Bold = true;

        wsMatrix.Cell(4, 1).Value = "Tổng số thí sinh:";
        wsMatrix.Cell(4, 2).Value = report.TotalPlayers;
        wsMatrix.Cell(4, 1).Style.Font.Bold = true;

        // Header Bảng Ma Trận
        int startRow = 6;
        wsMatrix.Cell(startRow, 1).Value = "Hạng";
        wsMatrix.Cell(startRow, 2).Value = "Thí sinh";
        wsMatrix.Cell(startRow, 3).Value = "Tổng điểm";
        wsMatrix.Cell(startRow, 4).Value = "Số câu đúng";
        wsMatrix.Cell(startRow, 5).Value = "Số câu sai";
        wsMatrix.Cell(startRow, 6).Value = "Tỷ lệ chính xác";

        for (int q = 0; q < report.Questions.Count; q++)
        {
            wsMatrix.Cell(startRow, 7 + q).Value = $"Câu {q + 1}";
        }

        int lastCol = Math.Max(6, 6 + report.Questions.Count);
        var headerRange = wsMatrix.Range(startRow, 1, startRow, lastCol);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromArgb(99, 102, 241); // Indigo
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        // Dữ liệu từng thí sinh
        int currentRow = startRow + 1;
        foreach (var p in report.Players)
        {
            wsMatrix.Cell(currentRow, 1).Value = p.Rank ?? (currentRow - startRow);
            wsMatrix.Cell(currentRow, 2).Value = p.Nickname;
            wsMatrix.Cell(currentRow, 3).Value = p.TotalScore;
            wsMatrix.Cell(currentRow, 4).Value = p.CorrectCount;
            wsMatrix.Cell(currentRow, 5).Value = p.WrongCount;
            wsMatrix.Cell(currentRow, 6).Value = $"{p.AccuracyRate}%";

            for (int q = 0; q < p.Answers.Count; q++)
            {
                var ans = p.Answers[q];
                var cell = wsMatrix.Cell(currentRow, 7 + q);
                if (ans.IsCorrect)
                {
                    cell.Value = "Đúng (✓)";
                    cell.Style.Fill.BackgroundColor = XLColor.FromArgb(220, 252, 231); // light green
                    cell.Style.Font.FontColor = XLColor.FromArgb(22, 101, 52); // dark green
                    cell.Style.Font.Bold = true;
                }
                else
                {
                    cell.Value = "Sai (✗)";
                    cell.Style.Fill.BackgroundColor = XLColor.FromArgb(254, 226, 226); // light red
                    cell.Style.Font.FontColor = XLColor.FromArgb(153, 27, 27); // dark red
                }
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }
            currentRow++;
        }

        // Dòng tổng kết tỷ lệ đúng từng câu
        if (report.Players.Count > 0 && report.Questions.Count > 0)
        {
            wsMatrix.Cell(currentRow, 2).Value = "Tỷ lệ đúng cả phòng (%)";
            wsMatrix.Cell(currentRow, 2).Style.Font.Bold = true;
            for (int q = 0; q < report.Questions.Count; q++)
            {
                var cell = wsMatrix.Cell(currentRow, 7 + q);
                cell.Value = $"{report.Questions[q].AccuracyRate}%";
                cell.Style.Font.Bold = true;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(241, 245, 249);
            }
        }

        wsMatrix.Columns().AdjustToContents();

        // ── SHEET 2: PHÂN TÍCH THỐNG KÊ CÂU HỎI ──
        var wsQuestions = workbook.Worksheets.Add("Thống Kê Câu Hỏi");
        wsQuestions.Cell(1, 1).Value = "STT";
        wsQuestions.Cell(1, 2).Value = "Nội dung câu hỏi";
        wsQuestions.Cell(1, 3).Value = "Dạng câu hỏi";
        wsQuestions.Cell(1, 4).Value = "Đáp án đúng";
        wsQuestions.Cell(1, 5).Value = "Số người trả lời";
        wsQuestions.Cell(1, 6).Value = "Số người đúng";
        wsQuestions.Cell(1, 7).Value = "Tỷ lệ đúng (%)";

        var qHeaderRange = wsQuestions.Range(1, 1, 1, 7);
        qHeaderRange.Style.Font.Bold = true;
        qHeaderRange.Style.Font.FontColor = XLColor.White;
        qHeaderRange.Style.Fill.BackgroundColor = XLColor.FromArgb(79, 70, 229);
        qHeaderRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        int qRow = 2;
        foreach (var q in report.Questions)
        {
            wsQuestions.Cell(qRow, 1).Value = q.OrderIndex;
            wsQuestions.Cell(qRow, 2).Value = q.QuestionText;
            wsQuestions.Cell(qRow, 3).Value = q.Type;
            wsQuestions.Cell(qRow, 4).Value = q.CorrectAnswer;
            wsQuestions.Cell(qRow, 5).Value = q.TotalAnswers;
            wsQuestions.Cell(qRow, 6).Value = q.CorrectAnswers;
            wsQuestions.Cell(qRow, 7).Value = $"{q.AccuracyRate}%";
            qRow++;
        }
        wsQuestions.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    // ── CLOSE ROOM ─────────────────────────────────────────────────────
    public async Task CloseRoomAsync(Guid roomId, Guid hostId)
    {
        var room = await _db.Rooms.FindAsync(roomId)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng.");

        var user = await _db.Users.FindAsync(hostId);
        bool isAdmin = user?.IsAdmin ?? false;
        if (!isAdmin && room.HostId != hostId)
            throw new UnauthorizedAccessException("Bạn không phải chủ phòng.");

        room.Status = "CLOSED";
        room.EndTime = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    // ── GET ROOM ACTIVE PLAYERS ────────────────────────────────────────
    public async Task<List<object>> GetRoomActivePlayersAsync(Guid roomId)
    {
        var players = await _db.RoomPlayers
            .AsNoTracking()
            .Where(p => p.RoomId == roomId)
            .OrderBy(p => p.JoinedAt)
            .Select(p => new
            {
                PlayerId = p.Id,
                Nickname = p.Nickname,
                AvatarUrl = p.AvatarUrl,
                JoinedAt = p.JoinedAt
            })
            .ToListAsync();

        return players.Cast<object>().ToList();
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
                r.CreatedAt,
                r.EndTime,
                r.IsEarlyFinished
            ))
            .ToListAsync();

        return rooms;
    }

    public async Task<RoomDto> UpdateTournamentSettingsAsync(Guid roomId, Guid hostId, UpdateTournamentSettingsRequest request)
    {
        var room = await _db.Rooms
            .Include(r => r.Quiz)
            .FirstOrDefaultAsync(r => r.Id == roomId)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng.");

        var user = await _db.Users.FindAsync(hostId);
        bool isAdmin = user?.IsAdmin ?? false;
        if (!isAdmin && room.HostId != hostId)
            throw new UnauthorizedAccessException("Bạn không phải chủ phòng này.");

        room.EndTime = request.EndTime;

        var settings = new Dictionary<string, object>();
        if (!string.IsNullOrEmpty(room.GameSettings))
        {
            try
            {
                settings = JsonSerializer.Deserialize<Dictionary<string, object>>(room.GameSettings) ?? new();
            }
            catch {}
        }

        if (request.QuestionTimeLimit.HasValue && request.QuestionTimeLimit.Value > 0)
        {
            settings["questionTimeLimit"] = request.QuestionTimeLimit.Value;
        }
        else
        {
            settings.Remove("questionTimeLimit");
        }

        room.GameSettings = JsonSerializer.Serialize(settings);
        await _db.SaveChangesAsync();

        var qrCode = GenerateQrCodeBase64(room.PinCode);
        var theme = await GetRoomThemeAsync(room.Id);
        var slideCount = await _db.Slides.CountAsync(s => s.QuizId == room.QuizId && !s.IsDeleted);

        return new RoomDto(
            room.Id, room.PinCode, room.Mode, room.Status,
            room.QuizId, room.Quiz?.Title ?? "", room.CreatedAt, qrCode, theme, slideCount, room.HostId,
            room.EndTime, request.QuestionTimeLimit, room.IsEarlyFinished);
    }

    public async Task<IEnumerable<PlayedRoomHistoryDto>> GetPlayedRoomsHistoryAsync(Guid userId)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        string? userNickname = user?.Nickname?.Trim();

        var playerRecords = await _db.RoomPlayers
            .AsNoTracking()
            .Include(rp => rp.Room)
                .ThenInclude(r => r.Quiz)
            .Include(rp => rp.Room)
                .ThenInclude(r => r.Host)
            .Where(rp => rp.UserId == userId || (rp.UserId == null && userNickname != null && rp.Nickname == userNickname))
            .OrderByDescending(rp => rp.JoinedAt)
            .ToListAsync();

        var roomIds = playerRecords.Select(rp => rp.RoomId).Distinct().ToList();
        var allRoomPlayers = await _db.RoomPlayers
            .AsNoTracking()
            .Where(p => roomIds.Contains(p.RoomId))
            .Select(p => new { p.RoomId, p.Id, p.TotalScore, p.JoinedAt })
            .ToListAsync();

        var result = new List<PlayedRoomHistoryDto>();

        foreach (var rp in playerRecords)
        {
            if (rp.Room == null) continue;

            var roomPlayers = allRoomPlayers
                .Where(p => p.RoomId == rp.RoomId)
                .OrderByDescending(p => p.TotalScore)
                .ThenBy(p => p.JoinedAt)
                .ToList();

            int rank = roomPlayers.FindIndex(p => p.Id == rp.Id) + 1;
            if (rank <= 0) rank = 1;

            result.Add(new PlayedRoomHistoryDto(
                rp.Room.Id,
                rp.Room.PinCode ?? "",
                rp.Room.Quiz?.Title ?? "Bộ đề không xác định",
                rp.Room.Host?.Nickname ?? "Chủ phòng",
                rp.TotalScore,
                rank,
                rp.JoinedAt,
                rp.Room.Status
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
        if (!string.IsNullOrWhiteSpace(theme)) return theme;

        var room = await _db.Rooms.AsNoTracking().FirstOrDefaultAsync(r => r.Id == roomId);
        if (!string.IsNullOrWhiteSpace(room?.GameSettings))
        {
            try
            {
                using var doc = JsonDocument.Parse(room.GameSettings);
                if (doc.RootElement.TryGetProperty("theme", out var t))
                {
                    var val = t.GetString();
                    if (!string.IsNullOrWhiteSpace(val)) return val;
                }
            }
            catch {}
        }
        return "CLASSIC";
    }

    public async Task SetRoomThemeAsync(Guid roomId, string theme)
    {
        await _cacheStore.SetStringAsync($"room_theme:{roomId}", theme, TimeSpan.FromDays(2));
    }

    private static List<Guid> ParseOptionIds(string answerData)
    {
        var result = new List<Guid>();
        if (string.IsNullOrWhiteSpace(answerData)) return result;

        if (Guid.TryParse(answerData, out var singleId))
        {
            result.Add(singleId);
            return result;
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<List<string>>(answerData);
            if (parsed != null)
            {
                foreach (var s in parsed)
                {
                    if (Guid.TryParse(s, out var g)) result.Add(g);
                }
                if (result.Count > 0) return result;
            }
        }
        catch { }

        var parts = answerData.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var p in parts)
        {
            if (Guid.TryParse(p, out var g)) result.Add(g);
        }

        return result;
    }

    public async Task<int> GetPlayerHpAsync(Guid roomId, Guid roomPlayerId)
    {
        var raw = await _cacheStore.GetStringAsync($"room_hp:{roomPlayerId}");
        if (int.TryParse(raw, out int hp)) return hp;

        // Default 100 HP
        await SetPlayerHpAsync(roomId, roomPlayerId, 100);
        return 100;
    }

    public async Task SetPlayerHpAsync(Guid roomId, Guid roomPlayerId, int hp)
    {
        await _cacheStore.SetStringAsync($"room_hp:{roomPlayerId}", hp.ToString(), TimeSpan.FromHours(4));
    }

    public async Task<BattleRoyaleStateDto> GetBattleRoyaleStateAsync(Guid roomId)
    {
        var players = await _db.RoomPlayers
            .AsNoTracking()
            .Where(rp => rp.RoomId == roomId)
            .OrderByDescending(rp => rp.TotalScore)
            .ToListAsync();

        int total = players.Count;
        int survivors = 0;
        int eliminated = 0;
        var statusList = new List<PlayerSurvivalStatusDto>();

        for (int i = 0; i < players.Count; i++)
        {
            var p = players[i];
            int hp = await GetPlayerHpAsync(roomId, p.Id);
            bool isDead = hp <= 0;
            if (isDead) eliminated++;
            else survivors++;

            statusList.Add(new PlayerSurvivalStatusDto(
                p.Id,
                p.Nickname,
                p.AvatarUrl,
                hp,
                100,
                isDead,
                p.TotalScore,
                i + 1
            ));
        }

        return new BattleRoyaleStateDto(total, survivors, eliminated, statusList);
    }

    public async Task ApplyBattleRoyaleTimeoutPenaltyAsync(Guid roomId, Guid slideId)
    {
        var theme = await GetRoomThemeAsync(roomId);
        if (theme != "BATTLE_ROYALE") return;

        var allPlayers = await _db.RoomPlayers
            .Where(rp => rp.RoomId == roomId)
            .ToListAsync();

        var answeredPlayerIds = await _db.PlayerResponses
            .Where(pr => pr.SlideId == slideId && pr.RoomPlayer.RoomId == roomId)
            .Select(pr => pr.RoomPlayerId)
            .ToHashSetAsync();

        foreach (var p in allPlayers)
        {
            if (!answeredPlayerIds.Contains(p.Id))
            {
                // Người chơi hết giờ không trả lời: trừ 35 HP
                int hp = await GetPlayerHpAsync(roomId, p.Id);
                if (hp > 0)
                {
                    int newHp = Math.Max(0, hp - 35);
                    await SetPlayerHpAsync(roomId, p.Id, newHp);
                }
            }
        }
    }

    public async Task<WagerPoolStateDto> PlaceWagerAsync(Guid roomId, Guid roomPlayerId, Guid slideId, int wagerPercent, int wagerAmount)
    {
        var player = await _db.RoomPlayers.FindAsync(roomPlayerId);
        string nickname = player?.Nickname ?? "Đấu thủ";

        // Lưu mức cược cá nhân vào Redis
        await _cacheStore.SetStringAsync($"room_wager:{slideId}:{roomPlayerId}", $"{wagerPercent}:{wagerAmount}", TimeSpan.FromHours(4));

        // Đọc danh sách cược hiện tại của câu hỏi
        string poolKey = $"room_wagers_json:{roomId}:{slideId}";
        var rawPool = await _cacheStore.GetStringAsync(poolKey);
        var wagers = new List<PlayerWagerDto>();
        if (!string.IsNullOrWhiteSpace(rawPool))
        {
            try { wagers = JsonSerializer.Deserialize<List<PlayerWagerDto>>(rawPool) ?? new(); } catch { }
        }

        wagers.RemoveAll(w => w.PlayerId == roomPlayerId);
        wagers.Add(new PlayerWagerDto(
            roomPlayerId,
            nickname,
            wagerPercent,
            wagerAmount,
            wagerPercent >= 100
        ));

        await _cacheStore.SetStringAsync(poolKey, JsonSerializer.Serialize(wagers), TimeSpan.FromHours(4));

        int totalAmount = wagers.Sum(w => w.WagerAmount);
        int allInCount = wagers.Count(w => w.IsAllIn);

        return new WagerPoolStateDto(slideId, totalAmount, wagers.Count, allInCount, wagers);
    }

    public async Task<WagerPoolStateDto> GetWagerPoolStateAsync(Guid roomId, Guid slideId)
    {
        string poolKey = $"room_wagers_json:{roomId}:{slideId}";
        var rawPool = await _cacheStore.GetStringAsync(poolKey);
        var wagers = new List<PlayerWagerDto>();
        if (!string.IsNullOrWhiteSpace(rawPool))
        {
            try { wagers = JsonSerializer.Deserialize<List<PlayerWagerDto>>(rawPool) ?? new(); } catch { }
        }

        int totalAmount = wagers.Sum(w => w.WagerAmount);
        int allInCount = wagers.Count(w => w.IsAllIn);

        return new WagerPoolStateDto(slideId, totalAmount, wagers.Count, allInCount, wagers);
    }

    public async Task<(int percent, int amount)> GetPlayerWagerAsync(Guid roomPlayerId, Guid slideId)
    {
        var raw = await _cacheStore.GetStringAsync($"room_wager:{slideId}:{roomPlayerId}");
        if (string.IsNullOrWhiteSpace(raw)) return (0, 0);

        var parts = raw.Split(':');
        if (parts.Length == 2 && int.TryParse(parts[0], out int p) && int.TryParse(parts[1], out int a))
        {
            return (p, a);
        }
        return (0, 0);
    }

    // ── DEFUSE THE BOMB LOGIC ───────────────────────────────────────────
    public record PlayerBombRecord(
        Guid PlayerId,
        string Nickname,
        bool IsDefused,
        int DefusedWires,
        int TotalWires,
        List<bool> WireCuts,
        DateTime SubmittedAt
    );

    public async Task RecordBombDefusalResultAsync(
        Guid roomId, Guid slideId, Guid roomPlayerId, string nickname, bool isDefused, int defusedWires, int totalWires, List<bool> wireCuts)
    {
        var key = $"bomb_defusal:{roomId}:{slideId}";
        var raw = await _cacheStore.GetStringAsync(key);
        var records = string.IsNullOrEmpty(raw)
            ? new List<PlayerBombRecord>()
            : JsonSerializer.Deserialize<List<PlayerBombRecord>>(raw) ?? new List<PlayerBombRecord>();

        records.RemoveAll(r => r.PlayerId == roomPlayerId);
        records.Add(new PlayerBombRecord(roomPlayerId, nickname, isDefused, defusedWires, totalWires, wireCuts, DateTime.UtcNow));

        await _cacheStore.SetStringAsync(key, JsonSerializer.Serialize(records), TimeSpan.FromHours(4));
    }

    public async Task<BombDefusalStateDto> GetBombDefusalStateAsync(Guid roomId, Guid slideId)
    {
        var totalPlayers = await _db.RoomPlayers.CountAsync(rp => rp.RoomId == roomId);
        if (totalPlayers == 0) totalPlayers = 1;

        var slide = await _db.Slides
            .Include(s => s.Options)
            .FirstOrDefaultAsync(s => s.Id == slideId);

        var correctOptions = slide?.Options
            .Where(o => o.IsCorrect)
            .OrderBy(o => o.OrderIndex)
            .ToList() ?? [];

        if (correctOptions.Count == 0 && slide?.Options != null && slide.Options.Count > 0)
        {
            correctOptions = slide.Options.OrderBy(o => o.OrderIndex).ToList();
        }

        string[] wireColorPalette = ["red", "blue", "yellow", "green", "purple", "orange"];
        var standardKeywords = new List<NormalizedKeywordDto>();
        for (int i = 0; i < correctOptions.Count; i++)
        {
            var opt = correctOptions[i];
            var primary = FuzzyMatchingService.ParseKeywords(opt.BlankKeywords).FirstOrDefault() ?? opt.Content;
            var norm = FuzzyMatchingService.Normalize(primary);
            standardKeywords.Add(new NormalizedKeywordDto(
                WireIndex: i + 1,
                WireColor: wireColorPalette[i % wireColorPalette.Length],
                OriginalKeywords: opt.BlankKeywords ?? opt.Content,
                NormalizedKeyword: norm
            ));
        }

        var key = $"bomb_defusal:{roomId}:{slideId}";
        var raw = await _cacheStore.GetStringAsync(key);
        var records = string.IsNullOrEmpty(raw)
            ? new List<PlayerBombRecord>()
            : JsonSerializer.Deserialize<List<PlayerBombRecord>>(raw) ?? new List<PlayerBombRecord>();

        int defusedBombs = records.Count(r => r.IsDefused);
        int explodedBombs = records.Count(r => !r.IsDefused);
        int inProgressBombs = Math.Max(0, totalPlayers - records.Count);

        int totalWireCount = Math.Max(1, correctOptions.Count);
        var wireStats = new List<WireDistributionDto>();
        for (int i = 0; i < totalWireCount; i++)
        {
            int cutCount = records.Count(r => r.WireCuts != null && r.WireCuts.Count > i && r.WireCuts[i]);
            double cutPercent = records.Count > 0 ? Math.Round((double)cutCount / records.Count * 100, 1) : 0.0;
            wireStats.Add(new WireDistributionDto(
                WireIndex: i + 1,
                WireColor: wireColorPalette[i % wireColorPalette.Length],
                CutCount: cutCount,
                TotalCount: records.Count,
                CutPercent: cutPercent
            ));
        }

        return new BombDefusalStateDto(
            SlideId: slideId,
            TotalBombs: totalPlayers,
            DefusedBombs: defusedBombs,
            ExplodedBombs: explodedBombs,
            InProgressBombs: inProgressBombs,
            WireStats: wireStats,
            StandardKeywords: standardKeywords
        );
    }

    // ── WORD HUNTER (GIẢI MÃ Ô CHỮ BÍ ẨN) LOGIC ────────────────────────
    public record PlayerWordHunterRecord(
        Guid PlayerId,
        string Nickname,
        string? AvatarUrl,
        string Guess,
        bool IsCorrect,
        int ResponseTimeMs,
        int ScoreAwarded,
        DateTime SubmittedAt
    );

    public async Task RecordWordHunterGuessAsync(
        Guid roomId, Guid slideId, Guid roomPlayerId, string nickname, string? avatarUrl, string guess, bool isCorrect, int responseTimeMs, int scoreAwarded)
    {
        var key = $"word_hunter:{roomId}:{slideId}";
        var raw = await _cacheStore.GetStringAsync(key);
        var records = string.IsNullOrEmpty(raw)
            ? new List<PlayerWordHunterRecord>()
            : JsonSerializer.Deserialize<List<PlayerWordHunterRecord>>(raw) ?? new List<PlayerWordHunterRecord>();

        records.RemoveAll(r => r.PlayerId == roomPlayerId);
        records.Add(new PlayerWordHunterRecord(roomPlayerId, nickname, avatarUrl, guess, isCorrect, responseTimeMs, scoreAwarded, DateTime.UtcNow));

        await _cacheStore.SetStringAsync(key, JsonSerializer.Serialize(records), TimeSpan.FromHours(4));
    }

    public async Task<WordHunterStateDto> GetWordHunterStateAsync(Guid roomId, Guid slideId)
    {
        var totalPlayers = await _db.RoomPlayers.CountAsync(rp => rp.RoomId == roomId);
        if (totalPlayers == 0) totalPlayers = 1;

        var slide = await _db.Slides
            .Include(s => s.Options)
            .FirstOrDefaultAsync(s => s.Id == slideId);

        var correctOptions = slide?.Options
            .Where(o => o.IsCorrect)
            .OrderBy(o => o.OrderIndex)
            .ToList() ?? [];

        if (correctOptions.Count == 0 && slide?.Options != null && slide.Options.Count > 0)
        {
            correctOptions = slide.Options.OrderBy(o => o.OrderIndex).ToList();
        }

        var solutions = new List<WordHunterSolutionDto>();
        for (int i = 0; i < correctOptions.Count; i++)
        {
            var opt = correctOptions[i];
            var keywords = FuzzyMatchingService.ParseKeywords(opt.BlankKeywords);
            var primary = keywords.FirstOrDefault() ?? opt.Content;
            solutions.Add(new WordHunterSolutionDto(
                WordIndex: i + 1,
                SolutionText: primary.Trim(),
                TotalLength: primary.Trim().Length,
                AcceptedKeywords: keywords.Count > 0 ? keywords : [opt.Content]
            ));
        }

        var key = $"word_hunter:{roomId}:{slideId}";
        var raw = await _cacheStore.GetStringAsync(key);
        var records = string.IsNullOrEmpty(raw)
            ? new List<PlayerWordHunterRecord>()
            : JsonSerializer.Deserialize<List<PlayerWordHunterRecord>>(raw) ?? new List<PlayerWordHunterRecord>();

        int decodedCount = records.Count(r => r.IsCorrect);
        int submittedCount = records.Count;

        var recentGuesses = records
            .OrderByDescending(r => r.SubmittedAt)
            .Select(r => new WordHunterGuessSummaryDto(
                r.PlayerId,
                r.Nickname,
                r.AvatarUrl,
                r.Guess,
                r.IsCorrect,
                r.ResponseTimeMs,
                r.ScoreAwarded
            ))
            .ToList();

        return new WordHunterStateDto(
            SlideId: slideId,
            TotalPlayers: totalPlayers,
            DecodedCount: decodedCount,
            SubmittedCount: submittedCount,
            RecentGuesses: recentGuesses,
            Solutions: solutions
        );
    }

    // ── BRIDGE BUILDER (XÂY CẦU QUA SÔNG) LOGIC ────────────────────────
    public record PlayerBridgeRecord(
        Guid PlayerId,
        string Nickname,
        string? AvatarUrl,
        bool IsFullyCrossed,
        int BuiltSpans,
        int TotalSpans,
        List<bool> SpanBridges,
        int ResponseTimeMs,
        int ScoreAwarded,
        DateTime SubmittedAt
    );

    public async Task RecordBridgeBuilderCrossingAsync(
        Guid roomId, Guid slideId, Guid roomPlayerId, string nickname, string? avatarUrl,
        bool isFullyCrossed, int builtSpans, int totalSpans, List<bool> spanBridges, int responseTimeMs, int scoreAwarded)
    {
        var key = $"bridge_builder:{roomId}:{slideId}";
        var raw = await _cacheStore.GetStringAsync(key);
        var records = string.IsNullOrEmpty(raw)
            ? new List<PlayerBridgeRecord>()
            : JsonSerializer.Deserialize<List<PlayerBridgeRecord>>(raw) ?? new List<PlayerBridgeRecord>();

        records.RemoveAll(r => r.PlayerId == roomPlayerId);
        records.Add(new PlayerBridgeRecord(
            roomPlayerId, nickname, avatarUrl, isFullyCrossed, builtSpans, totalSpans, spanBridges, responseTimeMs, scoreAwarded, DateTime.UtcNow
        ));

        await _cacheStore.SetStringAsync(key, JsonSerializer.Serialize(records), TimeSpan.FromHours(4));
    }

    public async Task<BridgeBuilderStateDto> GetBridgeBuilderStateAsync(Guid roomId, Guid slideId)
    {
        var totalPlayers = await _db.RoomPlayers.CountAsync(rp => rp.RoomId == roomId);
        if (totalPlayers == 0) totalPlayers = 1;

        var slide = await _db.Slides
            .Include(s => s.Options)
            .FirstOrDefaultAsync(s => s.Id == slideId);

        var correctOptions = slide?.Options
            .Where(o => o.IsCorrect)
            .OrderBy(o => o.OrderIndex)
            .ToList() ?? [];

        if (correctOptions.Count == 0 && slide?.Options != null && slide.Options.Count > 0)
        {
            correctOptions = slide.Options.OrderBy(o => o.OrderIndex).ToList();
        }

        int totalSpanCount = Math.Max(1, correctOptions.Count);

        var key = $"bridge_builder:{roomId}:{slideId}";
        var raw = await _cacheStore.GetStringAsync(key);
        var records = string.IsNullOrEmpty(raw)
            ? new List<PlayerBridgeRecord>()
            : JsonSerializer.Deserialize<List<PlayerBridgeRecord>>(raw) ?? new List<PlayerBridgeRecord>();

        int fullCrossings = records.Count(r => r.IsFullyCrossed);
        int partialCrossings = records.Count(r => !r.IsFullyCrossed && r.BuiltSpans > 0);
        int fallenCount = records.Count(r => r.BuiltSpans == 0);
        int submittedCount = records.Count;

        var spanStats = new List<BridgeSpanDistributionDto>();
        for (int i = 0; i < totalSpanCount; i++)
        {
            int builtCount = records.Count(r => r.SpanBridges != null && r.SpanBridges.Count > i && r.SpanBridges[i]);
            double builtPercent = records.Count > 0 ? Math.Round((double)builtCount / records.Count * 100, 1) : 0.0;
            var opt = i < correctOptions.Count ? correctOptions[i] : null;
            var expected = opt != null
                ? (FuzzyMatchingService.ParseKeywords(opt.BlankKeywords).FirstOrDefault() ?? opt.Content)
                : "";

            spanStats.Add(new BridgeSpanDistributionDto(
                SpanIndex: i + 1,
                BuiltCount: builtCount,
                TotalCount: records.Count,
                BuiltPercent: builtPercent,
                ExpectedKeyword: expected
            ));
        }

        var recentCrossings = records
            .OrderByDescending(r => r.SubmittedAt)
            .Select(r => new BridgeBuilderPlayerCrossingDto(
                r.PlayerId,
                r.Nickname,
                r.AvatarUrl,
                r.BuiltSpans,
                r.TotalSpans,
                r.IsFullyCrossed,
                r.ResponseTimeMs,
                r.ScoreAwarded
            ))
            .ToList();

        return new BridgeBuilderStateDto(
            SlideId: slideId,
            TotalPlayers: totalPlayers,
            FullCrossings: fullCrossings,
            PartialCrossings: partialCrossings,
            FallenCount: fallenCount,
            SubmittedCount: submittedCount,
            SpanStats: spanStats,
            RecentCrossings: recentCrossings
        );
    }

    // ── CIRCUIT CONNECT (NỐI MẠCH ĐIỆN CAO THẾ) LOGIC ───────────────────
    public record PlayerCircuitRecord(
        Guid PlayerId,
        string Nickname,
        string? AvatarUrl,
        bool IsFullCircuit,
        int CorrectWires,
        int TotalWires,
        List<bool> WireResults,
        int ResponseTimeMs,
        int ScoreAwarded,
        DateTime SubmittedAt
    );

    public async Task RecordCircuitConnectResultAsync(
        Guid roomId, Guid slideId, Guid roomPlayerId, string nickname, string? avatarUrl,
        bool isFullCircuit, int correctWires, int totalWires, List<bool> wireResults, int responseTimeMs, int scoreAwarded)
    {
        var key = $"circuit_connect:{roomId}:{slideId}";
        var raw = await _cacheStore.GetStringAsync(key);
        var records = string.IsNullOrEmpty(raw)
            ? new List<PlayerCircuitRecord>()
            : JsonSerializer.Deserialize<List<PlayerCircuitRecord>>(raw) ?? new List<PlayerCircuitRecord>();

        records.RemoveAll(r => r.PlayerId == roomPlayerId);
        records.Add(new PlayerCircuitRecord(
            roomPlayerId, nickname, avatarUrl, isFullCircuit, correctWires, totalWires, wireResults, responseTimeMs, scoreAwarded, DateTime.UtcNow
        ));

        await _cacheStore.SetStringAsync(key, JsonSerializer.Serialize(records), TimeSpan.FromHours(4));
    }

    public async Task<CircuitConnectStateDto> GetCircuitConnectStateAsync(Guid roomId, Guid slideId)
    {
        var totalPlayers = await _db.RoomPlayers.CountAsync(rp => rp.RoomId == roomId);
        if (totalPlayers == 0) totalPlayers = 1;

        var slide = await _db.Slides
            .Include(s => s.Options)
            .FirstOrDefaultAsync(s => s.Id == slideId);

        var matchingOptions = slide?.Options
            .Where(o => !string.IsNullOrWhiteSpace(o.MatchingPair))
            .OrderBy(o => o.OrderIndex)
            .ToList() ?? [];

        if (matchingOptions.Count == 0 && slide?.Options != null && slide.Options.Count > 0)
        {
            matchingOptions = slide.Options.OrderBy(o => o.OrderIndex).ToList();
        }

        int totalWireCount = Math.Max(1, matchingOptions.Count);

        var key = $"circuit_connect:{roomId}:{slideId}";
        var raw = await _cacheStore.GetStringAsync(key);
        var records = string.IsNullOrEmpty(raw)
            ? new List<PlayerCircuitRecord>()
            : JsonSerializer.Deserialize<List<PlayerCircuitRecord>>(raw) ?? new List<PlayerCircuitRecord>();

        int fullCircuits = records.Count(r => r.IsFullCircuit);
        int partialCircuits = records.Count(r => !r.IsFullCircuit && r.CorrectWires > 0);
        int shortCircuits = records.Count(r => r.CorrectWires == 0);
        int submittedCount = records.Count;

        string[] circuitColorPalette = ["#ef4444", "#3b82f6", "#eab308", "#10b981", "#a855f7", "#f97316", "#06b6d4", "#ec4899"];
        var wireStats = new List<CircuitWireDistributionDto>();
        for (int i = 0; i < totalWireCount; i++)
        {
            int correctCount = records.Count(r => r.WireResults != null && r.WireResults.Count > i && r.WireResults[i]);
            double correctPercent = records.Count > 0 ? Math.Round((double)correctCount / records.Count * 100, 1) : 0.0;
            var opt = i < matchingOptions.Count ? matchingOptions[i] : null;

            wireStats.Add(new CircuitWireDistributionDto(
                WireIndex: i + 1,
                LeftId: opt?.Id ?? Guid.Empty,
                LeftContent: opt?.Content ?? $"Cực {i + 1}",
                ExpectedRightContent: opt?.MatchingPair ?? "",
                CorrectCount: correctCount,
                TotalCount: records.Count,
                CorrectPercent: correctPercent,
                WireColor: circuitColorPalette[i % circuitColorPalette.Length]
            ));
        }

        var recentSubmissions = records
            .OrderByDescending(r => r.SubmittedAt)
            .Select(r => new CircuitConnectPlayerResultDto(
                r.PlayerId,
                r.Nickname,
                r.AvatarUrl,
                r.CorrectWires,
                r.TotalWires,
                r.IsFullCircuit,
                r.ResponseTimeMs,
                r.ScoreAwarded
            ))
            .ToList();

        return new CircuitConnectStateDto(
            SlideId: slideId,
            TotalPlayers: totalPlayers,
            FullCircuits: fullCircuits,
            PartialCircuits: partialCircuits,
            ShortCircuits: shortCircuits,
            SubmittedCount: submittedCount,
            WireStats: wireStats,
            RecentSubmissions: recentSubmissions
        );
    }

    // ── 60 FPS MULTIPLAYER ARENA REALTIME PROGRESS ───────────────────────
    public async Task<List<PlayerArenaProgressDto>> GetRoomPlayersArenaProgressAsync(
        Guid roomId,
        Guid? boostedPlayerId = null,
        int boostedScore = 0,
        Guid? currentSlideId = null)
    {
        var room = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.Quiz)
            .FirstOrDefaultAsync(r => r.Id == roomId);

        if (room == null) return [];

        int totalSlides = await _db.Slides.CountAsync(s => s.QuizId == room.QuizId);
        if (totalSlides <= 0) totalSlides = 1;

        int currentSlideIndex = 0;
        if (currentSlideId.HasValue)
        {
            var slide = await _db.Slides.AsNoTracking().FirstOrDefaultAsync(s => s.Id == currentSlideId.Value);
            if (slide != null) currentSlideIndex = Math.Max(0, slide.OrderIndex);
        }

        var players = await _db.RoomPlayers
            .AsNoTracking()
            .Where(p => p.RoomId == roomId)
            .OrderByDescending(p => p.TotalScore)
            .ThenBy(p => p.JoinedAt)
            .ToListAsync();

        HashSet<Guid> answeredPlayerIds = [];
        if (currentSlideId.HasValue)
        {
            answeredPlayerIds = (await _db.PlayerResponses
                .AsNoTracking()
                .Where(pr => pr.SlideId == currentSlideId.Value && pr.RoomPlayer.RoomId == roomId)
                .Select(pr => pr.RoomPlayerId)
                .ToListAsync()).ToHashSet();
        }

        var result = new List<PlayerArenaProgressDto>();

        for (int i = 0; i < players.Count; i++)
        {
            var p = players[i];
            int rank = i + 1;
            bool isAnswered = answeredPlayerIds.Contains(p.Id);
            bool isBoosted = boostedPlayerId.HasValue && p.Id == boostedPlayerId.Value && boostedScore > 0;

            var streakRaw = await _cacheStore.GetStringAsync($"streak:{p.Id}");
            int.TryParse(streakRaw, out int streak);

            // ProgressRatio: 0.0 -> 1.0 (toàn chặng trên minimap)
            double baseSlideRatio = (double)currentSlideIndex / totalSlides;
            if (isAnswered)
            {
                baseSlideRatio = (double)(currentSlideIndex + 1) / totalSlides;
            }

            int topScore = players.Count > 0 ? Math.Max(1, players[0].TotalScore) : 1;
            double scoreBonusRatio = ((double)p.TotalScore / (topScore * 1.5)) * (0.35 / totalSlides);
            double progressRatio = Math.Min(1.0, Math.Max(0.0, Math.Round(baseSlideRatio + scoreBonusRatio, 3)));

            result.Add(new PlayerArenaProgressDto(
                PlayerId: p.Id,
                Nickname: p.Nickname,
                AvatarUrl: p.AvatarUrl,
                Score: p.TotalScore,
                Rank: rank,
                ProgressRatio: progressRatio,
                Streak: streak,
                IsAnswered: isAnswered,
                IsJustBoosted: isBoosted,
                LastScoreAwarded: isBoosted ? boostedScore : 0,
                IsGhost: false
            ));
        }

        // Nếu là phòng giải đấu ASYNC_TOURNAMENT hoặc khi ít hơn 3 người:
        // Đọc Ghost Rivals từ Redis hoặc DB để tạo đối thủ bóng ma chạy cùng
        if (room.Mode == "ASYNC_TOURNAMENT")
        {
            var ghostRivals = await GetAsyncTournamentGhostRivalsAsync(room.QuizId, totalSlides);
            result.AddRange(ghostRivals);
            result = result.OrderByDescending(r => r.Score).Select((r, idx) => r with { Rank = idx + 1 }).ToList();
        }

        return result;
    }

    private async Task<List<PlayerArenaProgressDto>> GetAsyncTournamentGhostRivalsAsync(Guid quizId, int totalSlides)
    {
        // 1. Kiểm tra cache Ghost Rivals trên Redis
        var key = $"ghost_rivals:{quizId}";
        var raw = await _cacheStore.GetStringAsync(key);
        if (!string.IsNullOrEmpty(raw))
        {
            try
            {
                var cached = JsonSerializer.Deserialize<List<PlayerArenaProgressDto>>(raw);
                if (cached != null && cached.Count > 0) return cached;
            }
            catch { }
        }

        // 2. Tìm người chơi điểm cao từ các phiên trước của cùng bộ đề trong DB
        var pastResponses = await _db.RoomPlayers
            .AsNoTracking()
            .Include(rp => rp.Room)
            .Where(rp => rp.Room.QuizId == quizId && rp.TotalScore > 0)
            .OrderByDescending(rp => rp.TotalScore)
            .Take(5)
            .ToListAsync();

        var ghosts = new List<PlayerArenaProgressDto>();

        if (pastResponses.Count > 0)
        {
            for (int i = 0; i < pastResponses.Count; i++)
            {
                var past = pastResponses[i];
                ghosts.Add(new PlayerArenaProgressDto(
                    PlayerId: Guid.NewGuid(),
                    Nickname: $"{past.Nickname} (Bóng ma)",
                    AvatarUrl: past.AvatarUrl,
                    Score: past.TotalScore,
                    Rank: i + 1,
                    ProgressRatio: Math.Min(1.0, 0.70 + (i * 0.05)),
                    Streak: Math.Max(1, 4 - i),
                    IsAnswered: true,
                    IsJustBoosted: false,
                    LastScoreAwarded: 0,
                    IsGhost: true
                ));
            }
        }
        else
        {
            // Fallback Ghost Rivals mô phỏng để người chơi thi đấu bất đồng bộ có cảm giác đường đua kịch tính
            ghosts.Add(new PlayerArenaProgressDto(
                PlayerId: Guid.NewGuid(),
                Nickname: "Phantom_Racer ⚡",
                AvatarUrl: null,
                Score: 8400,
                Rank: 1,
                ProgressRatio: 0.88,
                Streak: 5,
                IsAnswered: true,
                IsJustBoosted: false,
                LastScoreAwarded: 0,
                IsGhost: true
            ));
            ghosts.Add(new PlayerArenaProgressDto(
                PlayerId: Guid.NewGuid(),
                Nickname: "Cyber_Ghost 🤖",
                AvatarUrl: null,
                Score: 7150,
                Rank: 2,
                ProgressRatio: 0.74,
                Streak: 3,
                IsAnswered: true,
                IsJustBoosted: false,
                LastScoreAwarded: 0,
                IsGhost: true
            ));
            ghosts.Add(new PlayerArenaProgressDto(
                PlayerId: Guid.NewGuid(),
                Nickname: "Shadow_Runner 🌪️",
                AvatarUrl: null,
                Score: 5900,
                Rank: 3,
                ProgressRatio: 0.62,
                Streak: 2,
                IsAnswered: false,
                IsJustBoosted: false,
                LastScoreAwarded: 0,
                IsGhost: true
            ));
        }

        // Cache 4 tiếng
        await _cacheStore.SetStringAsync(key, JsonSerializer.Serialize(ghosts), TimeSpan.FromHours(4));
        return ghosts;
    }
}

