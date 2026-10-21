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

            _logger.LogDebug(
                "FILL_IN_BLANK / DEFUSE_BOMB: {Correct}/{Total} blanks correct, ratio={Ratio:P0}",
                correctCount, totalBlanks, scoreRatio);
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
            correctAnswer
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
}

