using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services.GameEngines;

public abstract class BaseGameModeEngine : IGameModeEngine
{
    public abstract string GameType { get; }

    public abstract Task InitializeRoomAsync(Room room, List<RoomPlayer> players, ApplicationDbContext db);
    public abstract Task<GameActionResult> PerformActionAsync(Room room, RoomPlayer player, string actionType, string payloadJson, ApplicationDbContext db);
    public abstract Task<GameActionResult> UseSkillAsync(Room room, RoomPlayer player, string skillName, string payloadJson, ApplicationDbContext db);
    public abstract Task<GameMatchStatus> EvaluateMatchStatusAsync(Room room, ApplicationDbContext db);
    public abstract Task<object> GetClientGameStateAsync(Room room, Guid? requestingPlayerId, ApplicationDbContext db);

    /// <summary>
    /// Xử lý chung nộp câu trả lời cho mọi chế độ game:
    /// - Kiểm tra và CHẶN nộp trùng slide_id.
    /// - Kiểm tra đúng/sai từ bảng slides & slide_options.
    /// - Chỉ cộng action_points khi trả lời ĐÚNG.
    /// - Ghi nhận PlayerResponse và RoomGameAction vào Database.
    /// </summary>
    public virtual async Task<SlideAnswerProcessResult> ProcessSlideAnswerAsync(
        Room room,
        RoomPlayer player,
        Slide slide,
        string answerData,
        int responseTimeMs,
        ApplicationDbContext db)
    {
        // 1. Chặn người chơi đang bị cách ly (IsIsolated)
        if (player.IsIsolated)
        {
            return new SlideAnswerProcessResult(
                Success: false,
                IsCorrect: false,
                ScoreAwarded: 0,
                ActionPointsEarned: 0,
                TotalActionPoints: player.ActionPoints,
                Message: "Bạn đang bị cách ly/choáng, không thể nộp câu trả lời!"
            );
        }

        // 2. CHẶN NỘP TRÙNG SLIDE_ID
        bool alreadyAnswered = await db.PlayerResponses
            .AnyAsync(pr => pr.RoomPlayerId == player.Id && pr.SlideId == slide.Id);

        if (alreadyAnswered)
        {
            return new SlideAnswerProcessResult(
                Success: false,
                IsCorrect: false,
                ScoreAwarded: 0,
                ActionPointsEarned: 0,
                TotalActionPoints: player.ActionPoints,
                Message: "Bạn đã trả lời câu hỏi này rồi, không thể nộp lại!"
            );
        }

        // 3. Kiểm tra tính đúng đắn dựa trên options trong database (nếu hết giờ "__TIMEOUT__" thì tính là SAI)
        var options = await db.SlideOptions
            .Where(o => o.SlideId == slide.Id)
            .OrderBy(o => o.OrderIndex)
            .ToListAsync();

        bool isTimedOut = string.Equals(answerData?.Trim(), "__TIMEOUT__", StringComparison.OrdinalIgnoreCase)
                       || string.Equals(answerData?.Trim(), "TIMEOUT", StringComparison.OrdinalIgnoreCase);

        bool isCorrect = !isTimedOut && EvaluateAnswer(slide, options, answerData ?? string.Empty);

        // 4. Tính điểm và điểm hành động (Action Points)
        int scoreAwarded = 0;
        int actionPointsEarned = 0;

        if (isCorrect)
        {
            // Điểm câu hỏi: tính theo timeLimit và điểm gốc
            double timeRatio = slide.TimeLimit > 0
                ? Math.Clamp(1.0 - ((double)responseTimeMs / 1000.0 / slide.TimeLimit), 0.2, 1.0)
                : 1.0;
            scoreAwarded = (int)Math.Round(slide.Points * timeRatio);

            // Action points tương ứng theo từng game:
            actionPointsEarned = CalculateActionPoints(GameType, responseTimeMs);
            player.ActionPoints += actionPointsEarned;
            player.CurrentCombo++;
            if (player.CurrentCombo > player.MaxCombo) player.MaxCombo = player.CurrentCombo;
        }
        else
        {
            player.CurrentCombo = 0;
        }

        player.TotalScore += scoreAwarded;

        // 5. Lưu PlayerResponse vào DB
        var response = new PlayerResponse
        {
            Id = Guid.NewGuid(),
            RoomPlayerId = player.Id,
            SlideId = slide.Id,
            AnswerData = isTimedOut ? "TIMEOUT" : (answerData ?? string.Empty),
            IsCorrect = isCorrect,
            ScoreAwarded = scoreAwarded,
            ResponseTimeMs = responseTimeMs,
            AnsweredAt = DateTime.UtcNow
        };
        db.PlayerResponses.Add(response);

        // 6. Ghi log hành động vào room_game_actions
        var gameAction = new RoomGameAction
        {
            Id = Guid.NewGuid(),
            RoomId = room.Id,
            PlayerId = player.Id,
            SlideId = slide.Id,
            ActionType = "SUBMIT_ANSWER",
            ActionPayloadJson = JsonSerializer.Serialize(new { answerData, responseTimeMs, isCorrect, isTimedOut }),
            ActionResult = isTimedOut ? "TIMEOUT_0_PTS" : (isCorrect ? $"CORRECT_+{actionPointsEarned}_PTS" : "WRONG_0_PTS"),
            CreatedAt = DateTime.UtcNow
        };
        db.RoomGameActions.Add(gameAction);

        await db.SaveChangesAsync();

        return new SlideAnswerProcessResult(
            Success: true,
            IsCorrect: isCorrect,
            ScoreAwarded: scoreAwarded,
            ActionPointsEarned: actionPointsEarned,
            TotalActionPoints: player.ActionPoints,
            Message: isTimedOut
                ? "⏰ Hết thời gian trả lời! Tính là 1 câu sai (0 điểm, mất chuỗi Combo)."
                : (isCorrect
                    ? $"Chính xác! Bạn nhận được +{actionPointsEarned} điểm hành động."
                    : "Chưa chính xác! 0 điểm hành động (Mất chuỗi Combo).")
        );
    }

    protected virtual int CalculateActionPoints(string gameType, int responseTimeMs)
    {
        // Thưởng tốc độ trong 5 giây đầu cho Tower Defense (+50 Vàng)
        int speedBonusGold = responseTimeMs <= 5000 ? 50 : 0;
        return gameType switch
        {
            "TOWER_DEFENSE"   => 100 + speedBonusGold, // 100 Vàng + tối đa 50 Vàng thưởng tốc độ (< 5s)
            "DRAGON_BOAT"     => 1,                    // +1 Nhịp chèo (+15m)
            "RUNAWAY_TRAIN"   => 1,                    // +1 Mảnh đường ray
            "ARTILLERY_DUEL"  => 1,                    // +1 Viên đạn đại bác
            "EDU_AMONG_US"    => 1,                    // +1 Điểm thao tác / Phá hoại ngầm
            "QUIZ_BOMBERMAN"  => 1,                    // +1 Quả bom hẹn giờ (+3 bước di chuyển trong Engine)
            _                 => 1                     // HEX_CONQUEST: +1 Lượt chiếm đất
        };
    }

    protected virtual bool EvaluateAnswer(Slide slide, List<SlideOption> options, string answerData)
    {
        if (string.IsNullOrWhiteSpace(answerData)) return false;

        string cleanAnswer = answerData.Trim();

        // 1. Phân loại theo slide.Type
        if (slide.Type.Equals("QUIZ", StringComparison.OrdinalIgnoreCase) ||
            slide.Type.Equals("TRUE_FALSE", StringComparison.OrdinalIgnoreCase))
        {
            // answerData có thể là Guid của Option hoặc nội dung Content
            var correctOption = options.FirstOrDefault(o => o.IsCorrect);
            if (correctOption == null) return false;

            if (Guid.TryParse(cleanAnswer, out var optionId))
            {
                return correctOption.Id == optionId;
            }

            return string.Equals(cleanAnswer, correctOption.Content.Trim(), StringComparison.OrdinalIgnoreCase);
        }

        if (slide.Type.Equals("FILL_IN_BLANK", StringComparison.OrdinalIgnoreCase))
        {
            var correctOption = options.FirstOrDefault(o => o.IsCorrect) ?? options.FirstOrDefault();
            if (correctOption == null) return false;

            // Kiểm tra BlankKeywords
            if (!string.IsNullOrEmpty(correctOption.BlankKeywords))
            {
                var validKeywords = correctOption.BlankKeywords
                    .Split([';', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                foreach (var kw in validKeywords)
                {
                    if (string.Equals(cleanAnswer, kw, StringComparison.OrdinalIgnoreCase))
                        return true;
                }
            }

            return string.Equals(cleanAnswer, correctOption.Content.Trim(), StringComparison.OrdinalIgnoreCase);
        }

        if (slide.Type.Equals("MATCHING", StringComparison.OrdinalIgnoreCase))
        {
            // answerData lưu dạng JSON dictionary hoặc array pairs
            try
            {
                var userPairs = JsonSerializer.Deserialize<Dictionary<string, string>>(answerData);
                if (userPairs == null || userPairs.Count == 0) return false;

                foreach (var opt in options)
                {
                    if (!string.IsNullOrEmpty(opt.MatchingPair))
                    {
                        if (!userPairs.TryGetValue(opt.Content.Trim(), out var userPairVal) ||
                            !string.Equals(userPairVal.Trim(), opt.MatchingPair.Trim(), StringComparison.OrdinalIgnoreCase))
                        {
                            return false;
                        }
                    }
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        // Với POLL hoặc WORD_CLOUD thì câu trả lời luôn được chấp nhận
        if (slide.Type.Equals("POLL", StringComparison.OrdinalIgnoreCase) ||
            slide.Type.Equals("WORD_CLOUD", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Mặc định so sánh với Option đúng
        var defaultCorrect = options.FirstOrDefault(o => o.IsCorrect);
        return defaultCorrect != null && string.Equals(cleanAnswer, defaultCorrect.Content.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    protected async Task RecordActionAsync(
        Room room,
        RoomPlayer player,
        string actionType,
        string payloadJson,
        string result,
        ApplicationDbContext db)
    {
        var action = new RoomGameAction
        {
            Id = Guid.NewGuid(),
            RoomId = room.Id,
            PlayerId = player.Id,
            SlideId = null,
            ActionType = actionType,
            ActionPayloadJson = payloadJson,
            ActionResult = result,
            CreatedAt = DateTime.UtcNow
        };
        db.RoomGameActions.Add(action);
        await db.SaveChangesAsync();
    }
}

