using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services;

public interface INavalCombatService
{
    /// <summary>
    /// Kiểm tra câu trả lời từ slide, cập nhật current_combo, max_combo, energy_points, team_combo
    /// và cấp quyền bắn (shots_earned) nếu đúng.
    /// </summary>
    Task<NavalAnswerResultDto> ProcessAnswerAsync(Guid roomId, Guid playerId, Guid slideId, string answerData, int responseTimeMs);

    /// <summary>
    /// Xử lý phát bắn vào tọa độ (row, col) trên bản đồ đối phương:
    /// - Kiểm tra quyền bắn (shots_earned > 0)
    /// - Kiểm tra biên bản đồ
    /// - Chống bắn trùng ô
    /// - Kiểm tra Lá chắn shielded (tiêu hao lá chắn, chặn sát thương)
    /// - Cập nhật HIT / MISS / SUNK
    /// - Cập nhật số tàu còn lại của đối phương
    /// - Kiểm tra điều kiện thắng tức thì nếu toàn bộ tàu địch đã chìm
    /// </summary>
    Task<NavalShotResultDto> FireShotAsync(Guid roomId, Guid playerId, int targetRow, int targetCol, string actionType = "NORMAL_SHOT");

    /// <summary>
    /// Sử dụng Radar dò tìm quét khu vực quanh (centerRow, centerCol).
    /// </summary>
    Task<RadarScanResultDto> UseRadarScanAsync(Guid roomId, Guid playerId, int centerRow, int centerCol);

    /// <summary>
    /// Kích hoạt Lá chắn phòng thủ cho 1 ô tàu của đội mình.
    /// </summary>
    Task<ShieldActivateResultDto> ActivateShieldAsync(Guid roomId, Guid playerId, int targetRow, int targetCol);

    /// <summary>
    /// Đánh giá kết quả trận đấu: kết thúc bình thường (đánh chìm 5 tàu) hoặc chủ phòng kết thúc sớm.
    /// Áp dụng 4 tiêu chí ưu tiên theo đúng tài liệu:
    /// 1. Số tàu đối phương đã bị đánh chìm (Enemy ships sunk)
    /// 2. Tổng số ô tàu đối phương đã bị bắn trúng (Enemy ship cells hit)
    /// 3. Tỷ lệ trả lời đúng của đội (Team correct answer rate)
    /// 4. Tổng thời gian trả lời hợp lệ (Total valid response time - nhanh hơn là tốt hơn)
    /// Nếu tất cả bằng nhau thì tuyên bố HÒA (DRAW).
    /// </summary>
    Task<NavalMatchResultDto> EvaluateMatchResultAsync(Guid roomId, bool isEarlyTermination = false);

    /// <summary>
    /// Lấy bảng xếp hạng đóng góp cá nhân của các người chơi trong phòng.
    /// </summary>
    Task<List<NavalPlayerContributionDto>> GetPlayerContributionsAsync(Guid roomId);
}

public class NavalCombatService : INavalCombatService
{
    private readonly ApplicationDbContext _db;
    private readonly FuzzyMatchingService _fuzzy;
    private readonly ILogger<NavalCombatService> _logger;

    public NavalCombatService(
        ApplicationDbContext db,
        FuzzyMatchingService fuzzy,
        ILogger<NavalCombatService> logger)
    {
        _db = db;
        _fuzzy = fuzzy;
        _logger = logger;
    }

    /// <summary>
    /// 1. Chấm đáp án từ slides -> Cập nhật current_combo, energy_points -> Cấp quyền bắn (shots_earned).
    /// </summary>
    public async Task<NavalAnswerResultDto> ProcessAnswerAsync(
        Guid roomId, Guid playerId, Guid slideId, string answerData, int responseTimeMs)
    {
        var player = await _db.RoomPlayers.FindAsync(playerId)
            ?? throw new KeyNotFoundException("Không tìm thấy người chơi.");

        if (player.RoomId != roomId)
            throw new ArgumentException("Người chơi không thuộc phòng này.", nameof(roomId));

        if (string.IsNullOrEmpty(player.TeamSide))
            throw new InvalidOperationException("Người chơi chưa được phân vào đội (TEAM_A hoặc TEAM_B).");

        var slide = await _db.Slides
            .Include(s => s.Options)
            .FirstOrDefaultAsync(s => s.Id == slideId)
            ?? throw new KeyNotFoundException("Không tìm thấy slide câu hỏi.");

        // Chống trả lời trùng câu hỏi
        bool alreadyAnswered = await _db.PlayerResponses
            .AnyAsync(pr => pr.RoomPlayerId == playerId && pr.SlideId == slideId);
        if (alreadyAnswered)
            throw new InvalidOperationException("Bạn đã gửi câu trả lời cho câu hỏi này rồi.");

        // Tính toán tốc độ trả lời (Speed Factor)
        double maxTime = slide.TimeLimit * 1000.0;
        double elapsed = Math.Min(responseTimeMs, maxTime);
        double speedFactor = Math.Max(0.1, 1.0 - (elapsed / maxTime));

        // Chấm điểm theo loại slide
        var (isCorrect, scoreRatio, correctAnswer) = EvaluateSlideAnswer(slide, answerData);

        // Kiểm tra hiệu ứng x2 Bắn Pháo (Dành cho người chơi được chọn khi đội ít hơn 1 người)
        var room = await _db.Rooms.FindAsync(roomId);
        bool isDoubleShot = false;
        if (room != null && !string.IsNullOrEmpty(room.GameSettings))
        {
            try
            {
                using var doc = JsonDocument.Parse(room.GameSettings);
                if (doc.RootElement.TryGetProperty("doubleShotPlayerId", out var prop))
                {
                    if (Guid.TryParse(prop.GetString(), out var dId) && dId == playerId)
                    {
                        isDoubleShot = true;
                    }
                }
            }
            catch {}
        }

        int scoreAwarded = 0;
        int comboBonus = 0;

        var team = await _db.NavalTeams
            .FirstOrDefaultAsync(t => t.RoomId == roomId && t.TeamSide == player.TeamSide);

        if (isCorrect)
        {
            // Tăng combo cá nhân
            player.CurrentCombo += 1;
            player.MaxCombo = Math.Max(player.MaxCombo, player.CurrentCombo);

            // Cấp quyền bắn (shots_earned): mặc định 1, nếu có hiệu ứng x2 thì nhận 2 ô bắn
            int shotsToAdd = isDoubleShot ? 2 : 1;
            player.ShotsEarned += shotsToAdd;

            // Tích lũy điểm năng lượng (energy_points): cơ bản 15 + thưởng combo
            int energyEarned = 15;
            if (player.CurrentCombo >= 2)
            {
                energyEarned += (player.CurrentCombo - 1) * 5;
            }
            player.EnergyPoints += energyEarned;

            // Tăng combo đội
            if (team != null)
            {
                team.TeamCombo += 1;
            }

            // Tính điểm thưởng kiến thức
            scoreAwarded = (int)Math.Round(slide.Points * scoreRatio * speedFactor);
            if (player.CurrentCombo >= 2)
            {
                comboBonus = Math.Min(player.CurrentCombo - 1, 5) * 50; // Tối đa +250
                scoreAwarded += comboBonus;
            }

            player.TotalScore += scoreAwarded;

            _logger.LogInformation(
                "Người chơi {Nickname} ({TeamSide}) trả lời ĐÚNG slide {SlideId}. Combo: {Combo}, ShotsToAdd: {ShotsToAdd}, Shots: {Shots}, Energy: {Energy}, IsDoubleShot: {IsDoubleShot}",
                player.Nickname, player.TeamSide, slideId, player.CurrentCombo, shotsToAdd, player.ShotsEarned, player.EnergyPoints, isDoubleShot);
        }
        else
        {
            // Trả lời sai: reset combo
            player.CurrentCombo = 0;
            if (team != null)
            {
                team.TeamCombo = 0;
            }

            _logger.LogInformation(
                "Người chơi {Nickname} ({TeamSide}) trả lời SAI slide {SlideId}. Combo reset về 0.",
                player.Nickname, player.TeamSide, slideId);
        }

        // Lưu lịch sử trả lời vào player_responses
        var response = new PlayerResponse
        {
            Id = Guid.NewGuid(),
            RoomPlayerId = playerId,
            SlideId = slideId,
            AnswerData = answerData,
            IsCorrect = isCorrect,
            ScoreAwarded = scoreAwarded,
            ResponseTimeMs = responseTimeMs,
            AnsweredAt = DateTime.UtcNow
        };
        _db.PlayerResponses.Add(response);

        await _db.SaveChangesAsync();

        return new NavalAnswerResultDto(
            IsCorrect: isCorrect,
            ScoreAwarded: scoreAwarded,
            CurrentCombo: player.CurrentCombo,
            MaxCombo: player.MaxCombo,
            EnergyPoints: player.EnergyPoints,
            ShotsEarned: player.ShotsEarned,
            CorrectAnswer: correctAnswer,
            IsDoubleShot: isDoubleShot
        );
    }

    /// <summary>
    /// 2. Xử lý phát bắn vào tọa độ (row, col) (kiểm tra trùng ô, kiểm tra Lá chắn shielded, cập nhật HIT/MISS/SUNK).
    /// </summary>
    public async Task<NavalShotResultDto> FireShotAsync(
        Guid roomId, Guid playerId, int targetRow, int targetCol, string actionType = "NORMAL_SHOT")
    {
        var player = await _db.RoomPlayers.FindAsync(playerId)
            ?? throw new KeyNotFoundException("Không tìm thấy người chơi.");

        if (player.RoomId != roomId)
            throw new ArgumentException("Người chơi không thuộc phòng này.", nameof(roomId));

        if (string.IsNullOrEmpty(player.TeamSide))
            throw new InvalidOperationException("Người chơi chưa được phân vào đội nào.");

        if (player.ShotsEarned <= 0)
        {
            throw new InvalidOperationException("Bạn không còn quyền bắn (shots_earned = 0). Hãy trả lời đúng câu hỏi để nhận lượt bắn.");
        }

        var room = await _db.Rooms.FindAsync(roomId)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng chiến đấu.");

        int mapSize = room.MapSize > 0 ? room.MapSize : 15;

        // Kiểm tra tọa độ trong biên
        if (targetRow < 0 || targetRow >= mapSize || targetCol < 0 || targetCol >= mapSize)
        {
            throw new ArgumentOutOfRangeException(
                $"Tọa độ ({targetRow}, {targetCol}) nằm ngoài giới hạn bản đồ ({mapSize}x{mapSize}).");
        }

        string attackerTeam = player.TeamSide;
        string targetTeam = attackerTeam == "TEAM_A" ? "TEAM_B" : "TEAM_A";

        // Kiểm tra trùng ô (chống bắn lặp lại ô đã bắn của đối phương)
        bool alreadyShot = await _db.NavalActions.AnyAsync(a =>
            a.RoomId == roomId &&
            a.TargetTeam == targetTeam &&
            a.TargetRow == targetRow &&
            a.TargetCol == targetCol &&
            (a.ActionType == "NORMAL_SHOT" || a.ActionType == "PRECISION_SHOT"));

        if (alreadyShot)
        {
            throw new InvalidOperationException(
                $"Tọa độ ({targetRow}, {targetCol}) trên bản đồ đối phương đã được bắn trước đó. Vui lòng chọn tọa độ khác.");
        }

        // Tiêu hao 1 quyền bắn và ghi nhận 1 phát bắn hợp lệ
        player.ShotsEarned = Math.Max(0, player.ShotsEarned - 1);
        player.ValidShotsCount += 1;

        // Tìm xem tọa độ có tàu đối phương hay không
        var targetShips = await _db.NavalShips
            .Where(s => s.RoomId == roomId && s.TeamSide == targetTeam)
            .ToListAsync();

        NavalShip? hitShip = null;
        ShipCoordinate? hitCoord = null;
        List<ShipCoordinate>? hitShipCoords = null;

        foreach (var ship in targetShips)
        {
            var coords = JsonSerializer.Deserialize<List<ShipCoordinate>>(ship.Coordinates) ?? [];
            var matched = coords.FirstOrDefault(c => c.R == targetRow && c.C == targetCol);
            if (matched != null)
            {
                hitShip = ship;
                hitCoord = matched;
                hitShipCoords = coords;
                break;
            }
        }

        string result;
        int? sunkShipType = null;
        string message;

        if (hitShip == null || hitCoord == null || hitShipCoords == null)
        {
            // Bắn trượt vào vùng nước
            result = "MISS";
            message = $"Bắn trượt vào vùng nước tại ({targetRow}, {targetCol}).";
        }
        else
        {
            // Có tàu tại ô này! Kiểm tra Lá chắn (Shielded)
            if (hitCoord.Shielded)
            {
                // Có lá chắn bảo vệ: chặn sát thương, lá chắn bị tiêu hao
                hitCoord.Shielded = false;
                result = "BLOCKED_BY_SHIELD";
                message = $"Phát bắn trúng tàu địch tại ({targetRow}, {targetCol}) nhưng đã bị Lá chắn phòng thủ ngăn chặn!";

                hitShip.Coordinates = JsonSerializer.Serialize(hitShipCoords);
            }
            else
            {
                // Ghi nhận sát thương vào ô tàu
                hitCoord.Hit = true;
                player.HitsCount += 1;

                // Kiểm tra xem tàu đã chìm hoàn toàn chưa
                bool isSunk = hitShipCoords.All(c => c.Hit);
                if (isSunk)
                {
                    hitShip.IsSunk = true;
                    result = "SUNK";
                    sunkShipType = hitShip.ShipType;
                    message = $"XUẤT SẮC! Bạn đã bắn chìm Tàu chiến số {hitShip.ShipType} (dài {hitShip.ShipType} ô) của đối phương!";

                    // Ghi nhận đóng góp đánh chìm tàu cho người chơi
                    player.ShipsSunkContribution += 1;

                    // Giảm số tàu còn lại của đội đối thủ
                    var targetNavalTeam = await _db.NavalTeams
                        .FirstOrDefaultAsync(t => t.RoomId == roomId && t.TeamSide == targetTeam);
                    if (targetNavalTeam != null)
                    {
                        targetNavalTeam.ShipsRemaining = Math.Max(0, targetNavalTeam.ShipsRemaining - 1);
                    }
                }
                else
                {
                    result = "HIT";
                    message = $"TRÚNG ĐÍCH! Phát bắn đã gây sát thương lên tàu đối phương tại ({targetRow}, {targetCol})!";
                }

                hitShip.Coordinates = JsonSerializer.Serialize(hitShipCoords);
            }
        }

        // Lưu lịch sử hành động vào naval_actions
        var action = new NavalAction
        {
            Id = Guid.NewGuid(),
            RoomId = roomId,
            PlayerId = playerId,
            AttackerTeam = attackerTeam,
            TargetTeam = targetTeam,
            ActionType = actionType,
            TargetRow = targetRow,
            TargetCol = targetCol,
            Result = result,
            SunkShipType = sunkShipType,
            CreatedAt = DateTime.UtcNow
        };
        _db.NavalActions.Add(action);

        // Kiểm tra điều kiện thắng tức thì (toàn bộ 5 tàu của đối phương bị đánh chìm)
        bool allTargetShipsSunk = targetShips.All(s => s.IsSunk);
        bool isGameOver = allTargetShipsSunk;
        string? winningTeam = isGameOver ? attackerTeam : null;
        string? winReason = isGameOver ? "NORMAL_VICTORY_ALL_SHIPS_SUNK" : null;

        if (isGameOver)
        {
            room.Status = "FINISHED";
            room.EndTime = DateTime.UtcNow;
            _logger.LogInformation("Trận đấu tại phòng {RoomId} kết thúc! Đội {Winner} chiến thắng do đánh chìm toàn bộ 5 tàu địch.", roomId, winningTeam);
        }

        await _db.SaveChangesAsync();

        return new NavalShotResultDto(
            Success: true,
            Message: message,
            AttackerTeam: attackerTeam,
            TargetTeam: targetTeam,
            TargetRow: targetRow,
            TargetCol: targetCol,
            Result: result,
            SunkShipType: sunkShipType,
            ShotsEarnedRemaining: player.ShotsEarned,
            IsGameOver: isGameOver,
            WinningTeam: winningTeam,
            WinReason: winReason
        );
    }

    /// <summary>
    /// Kỹ năng Radar: quét vùng 3x3 quanh (centerRow, centerCol) xem có phần tàu chưa bị bắn trúng không.
    /// </summary>
    public async Task<RadarScanResultDto> UseRadarScanAsync(Guid roomId, Guid playerId, int centerRow, int centerCol)
    {
        var player = await _db.RoomPlayers.FindAsync(playerId)
            ?? throw new KeyNotFoundException("Không tìm thấy người chơi.");

        if (string.IsNullOrEmpty(player.TeamSide))
            throw new InvalidOperationException("Người chơi chưa thuộc đội nào.");

        var team = await _db.NavalTeams
            .FirstOrDefaultAsync(t => t.RoomId == roomId && t.TeamSide == player.TeamSide)
            ?? throw new KeyNotFoundException("Không tìm thấy đội trong phòng.");

        if (team.RadarRemaining <= 0)
        {
            return new RadarScanResultDto(false, "Đội của bạn đã hết lượt sử dụng Radar dò tìm.", centerRow, centerCol, false, 0);
        }

        team.RadarRemaining -= 1;
        player.SkillsUsedCount += 1;

        string targetTeam = player.TeamSide == "TEAM_A" ? "TEAM_B" : "TEAM_A";
        var targetShips = await _db.NavalShips
            .Where(s => s.RoomId == roomId && s.TeamSide == targetTeam && !s.IsSunk)
            .ToListAsync();

        bool detected = false;
        foreach (var ship in targetShips)
        {
            var coords = JsonSerializer.Deserialize<List<ShipCoordinate>>(ship.Coordinates) ?? [];
            if (coords.Any(c => !c.Hit && Math.Abs(c.R - centerRow) <= 1 && Math.Abs(c.C - centerCol) <= 1))
            {
                detected = true;
                break;
            }
        }

        var action = new NavalAction
        {
            Id = Guid.NewGuid(),
            RoomId = roomId,
            PlayerId = playerId,
            AttackerTeam = player.TeamSide,
            TargetTeam = targetTeam,
            ActionType = "RADAR_SCAN",
            TargetRow = centerRow,
            TargetCol = centerCol,
            Result = detected ? "RADAR_DETECTED" : "RADAR_EMPTY",
            CreatedAt = DateTime.UtcNow
        };
        _db.NavalActions.Add(action);

        await _db.SaveChangesAsync();

        string msg = detected
            ? $"Radar phát hiện có tín hiệu tàu đối phương trong khu vực 3x3 quanh ({centerRow}, {centerCol})!"
            : $"Radar không phát hiện tàu nào trong khu vực 3x3 quanh ({centerRow}, {centerCol}).";

        return new RadarScanResultDto(true, msg, centerRow, centerCol, detected, team.RadarRemaining);
    }

    /// <summary>
    /// Kỹ năng Lá chắn: gắn lá chắn bảo vệ cho 1 ô tàu còn nguyên của đội mình.
    /// </summary>
    public async Task<ShieldActivateResultDto> ActivateShieldAsync(Guid roomId, Guid playerId, int targetRow, int targetCol)
    {
        var player = await _db.RoomPlayers.FindAsync(playerId)
            ?? throw new KeyNotFoundException("Không tìm thấy người chơi.");

        if (string.IsNullOrEmpty(player.TeamSide))
            throw new InvalidOperationException("Người chơi chưa thuộc đội nào.");

        var team = await _db.NavalTeams
            .FirstOrDefaultAsync(t => t.RoomId == roomId && t.TeamSide == player.TeamSide)
            ?? throw new KeyNotFoundException("Không tìm thấy thông tin đội.");

        if (team.ShieldRemaining <= 0)
        {
            return new ShieldActivateResultDto(false, "Đội của bạn đã hết lượt kích hoạt Lá chắn phòng thủ.", targetRow, targetCol, 0);
        }

        // Tìm ô tàu của đội mình tại tọa độ đó
        var myShips = await _db.NavalShips
            .Where(s => s.RoomId == roomId && s.TeamSide == player.TeamSide && !s.IsSunk)
            .ToListAsync();

        NavalShip? targetShip = null;
        ShipCoordinate? targetCell = null;
        List<ShipCoordinate>? shipCoords = null;

        foreach (var ship in myShips)
        {
            var coords = JsonSerializer.Deserialize<List<ShipCoordinate>>(ship.Coordinates) ?? [];
            var found = coords.FirstOrDefault(c => c.R == targetRow && c.C == targetCol);
            if (found != null)
            {
                targetShip = ship;
                targetCell = found;
                shipCoords = coords;
                break;
            }
        }

        if (targetShip == null || targetCell == null || shipCoords == null)
        {
            return new ShieldActivateResultDto(false, $"Tọa độ ({targetRow}, {targetCol}) không chứa tàu của đội bạn.", targetRow, targetCol, team.ShieldRemaining);
        }

        if (targetCell.Hit)
        {
            return new ShieldActivateResultDto(false, "Không thể kích hoạt Lá chắn lên ô tàu đã bị bắn trúng.", targetRow, targetCol, team.ShieldRemaining);
        }

        if (targetCell.Shielded)
        {
            return new ShieldActivateResultDto(false, "Ô tàu này đã được bảo vệ bởi Lá chắn trước đó.", targetRow, targetCol, team.ShieldRemaining);
        }

        targetCell.Shielded = true;
        targetShip.Coordinates = JsonSerializer.Serialize(shipCoords);

        team.ShieldRemaining -= 1;
        player.SkillsUsedCount += 1;

        var action = new NavalAction
        {
            Id = Guid.NewGuid(),
            RoomId = roomId,
            PlayerId = playerId,
            AttackerTeam = player.TeamSide,
            TargetTeam = player.TeamSide,
            ActionType = "SHIELD_ACTIVATE",
            TargetRow = targetRow,
            TargetCol = targetCol,
            Result = "SHIELD_APPLIED",
            CreatedAt = DateTime.UtcNow
        };
        _db.NavalActions.Add(action);

        await _db.SaveChangesAsync();

        return new ShieldActivateResultDto(
            true,
            $"Đã kích hoạt Lá chắn phòng thủ tại ({targetRow}, {targetCol}) thành công!",
            targetRow,
            targetCol,
            team.ShieldRemaining
        );
    }

    /// <summary>
    /// 3. Kiểm tra điều kiện thắng hoặc thắng sớm theo đúng 4 tiêu chí ưu tiên trong tài liệu.
    /// </summary>
    public async Task<NavalMatchResultDto> EvaluateMatchResultAsync(Guid roomId, bool isEarlyTermination = false)
    {
        var room = await _db.Rooms.FindAsync(roomId)
            ?? throw new KeyNotFoundException("Không tìm thấy phòng.");

        var teamAShips = await _db.NavalShips
            .Where(s => s.RoomId == roomId && s.TeamSide == "TEAM_A")
            .ToListAsync();

        var teamBShips = await _db.NavalShips
            .Where(s => s.RoomId == roomId && s.TeamSide == "TEAM_B")
            .ToListAsync();

        // 1. Số tàu còn lại và số tàu đối phương đã bị đánh chìm
        int teamA_ShipsRemaining = teamAShips.Count(s => !s.IsSunk);
        int teamB_ShipsRemaining = teamBShips.Count(s => !s.IsSunk);

        // Số tàu đối phương bị đánh chìm:
        // Đội A đánh chìm tàu của Đội B:
        int teamA_ShipsSunk = teamBShips.Count(s => s.IsSunk);
        // Đội B đánh chìm tàu của Đội A:
        int teamB_ShipsSunk = teamAShips.Count(s => s.IsSunk);

        // 2. Tổng số ô tàu đối phương đã bị bắn trúng
        int teamA_HitCellsOnB = CountHitCells(teamBShips);
        int teamB_HitCellsOnA = CountHitCells(teamAShips);

        // 3 & 4. Thống kê câu hỏi & thời gian của 2 đội
        var teamAPlayerIds = await _db.RoomPlayers
            .Where(rp => rp.RoomId == roomId && rp.TeamSide == "TEAM_A")
            .Select(rp => rp.Id)
            .ToListAsync();

        var teamBPlayerIds = await _db.RoomPlayers
            .Where(rp => rp.RoomId == roomId && rp.TeamSide == "TEAM_B")
            .Select(rp => rp.Id)
            .ToListAsync();

        var responsesA = await _db.PlayerResponses
            .Where(pr => teamAPlayerIds.Contains(pr.RoomPlayerId))
            .ToListAsync();

        var responsesB = await _db.PlayerResponses
            .Where(pr => teamBPlayerIds.Contains(pr.RoomPlayerId))
            .ToListAsync();

        int teamA_Questions = responsesA.Count;
        int teamA_Correct = responsesA.Count(r => r.IsCorrect);
        double teamA_Accuracy = teamA_Questions > 0 ? (double)teamA_Correct / teamA_Questions : 0.0;
        int teamA_TotalTime = responsesA.Sum(r => r.ResponseTimeMs ?? 0);

        int teamB_Questions = responsesB.Count;
        int teamB_Correct = responsesB.Count(r => r.IsCorrect);
        double teamB_Accuracy = teamB_Questions > 0 ? (double)teamB_Correct / teamB_Questions : 0.0;
        int teamB_TotalTime = responsesB.Sum(r => r.ResponseTimeMs ?? 0);

        var summaryA = new NavalTeamSummaryDto(
            TeamSide: "TEAM_A",
            ShipsRemaining: teamA_ShipsRemaining,
            ShipsSunk: teamA_ShipsSunk,
            TotalHitCells: teamA_HitCellsOnB,
            TotalQuestions: teamA_Questions,
            CorrectAnswers: teamA_Correct,
            AccuracyRate: Math.Round(teamA_Accuracy, 4),
            TotalResponseTimeMs: teamA_TotalTime
        );

        var summaryB = new NavalTeamSummaryDto(
            TeamSide: "TEAM_B",
            ShipsRemaining: teamB_ShipsRemaining,
            ShipsSunk: teamB_ShipsSunk,
            TotalHitCells: teamB_HitCellsOnA,
            TotalQuestions: teamB_Questions,
            CorrectAnswers: teamB_Correct,
            AccuracyRate: Math.Round(teamB_Accuracy, 4),
            TotalResponseTimeMs: teamB_TotalTime
        );

        NavalMatchResultDto matchResult;

        // Trường hợp 5.1: Kết thúc bình thường khi 1 đội đánh chìm toàn bộ 5 tàu đối phương
        if (teamA_ShipsSunk == 5 && teamB_ShipsSunk < 5)
        {
            matchResult = new NavalMatchResultDto(
                IsGameOver: true,
                IsEarlyTermination: false,
                WinningTeam: "TEAM_A",
                WinReason: "Đội TEAM_A đã xuất sắc đánh chìm toàn bộ 5 tàu chiến của đối phương!",
                PriorityCriterion: "NORMAL_VICTORY",
                TeamA: summaryA,
                TeamB: summaryB
            );
        }
        else if (teamB_ShipsSunk == 5 && teamA_ShipsSunk < 5)
        {
            matchResult = new NavalMatchResultDto(
                IsGameOver: true,
                IsEarlyTermination: false,
                WinningTeam: "TEAM_B",
                WinReason: "Đội TEAM_B đã xuất sắc đánh chìm toàn bộ 5 tàu chiến của đối phương!",
                PriorityCriterion: "NORMAL_VICTORY",
                TeamA: summaryA,
                TeamB: summaryB
            );
        }
        else if (!isEarlyTermination && room.Status != "FINISHED")
        {
            // Nếu trận đấu chưa kết thúc và chủ phòng không bấm kết thúc sớm: trận đấu vẫn đang diễn ra
            return new NavalMatchResultDto(
                IsGameOver: false,
                IsEarlyTermination: false,
                WinningTeam: null,
                WinReason: "Trận đấu đang tiếp diễn.",
                PriorityCriterion: null,
                TeamA: summaryA,
                TeamB: summaryB
            );
        }
        else
        {
            // Trường hợp 5.2: Kết thúc sớm -> Xét đúng 4 tiêu chí ưu tiên theo thứ tự trong tài liệu:
            // Tiêu chí 1: Số tàu đối phương đã bị đánh chìm (Enemy ships sunk)
            if (teamA_ShipsSunk > teamB_ShipsSunk)
            {
                matchResult = new NavalMatchResultDto(
                    IsGameOver: true,
                    IsEarlyTermination: true,
                    WinningTeam: "TEAM_A",
                    WinReason: $"Thắng theo Tiêu chí 1: Số tàu đối phương đã bị đánh chìm cao hơn ({teamA_ShipsSunk} vs {teamB_ShipsSunk} tàu).",
                    PriorityCriterion: "CRITERION_1_SHIPS_SUNK",
                    TeamA: summaryA,
                    TeamB: summaryB
                );
            }
            else if (teamB_ShipsSunk > teamA_ShipsSunk)
            {
                matchResult = new NavalMatchResultDto(
                    IsGameOver: true,
                    IsEarlyTermination: true,
                    WinningTeam: "TEAM_B",
                    WinReason: $"Thắng theo Tiêu chí 1: Số tàu đối phương đã bị đánh chìm cao hơn ({teamB_ShipsSunk} vs {teamA_ShipsSunk} tàu).",
                    PriorityCriterion: "CRITERION_1_SHIPS_SUNK",
                    TeamA: summaryA,
                    TeamB: summaryB
                );
            }
            // Tiêu chí 2: Tổng số ô tàu đối phương đã bị bắn trúng (Enemy ship cells hit)
            else if (teamA_HitCellsOnB > teamB_HitCellsOnA)
            {
                matchResult = new NavalMatchResultDto(
                    IsGameOver: true,
                    IsEarlyTermination: true,
                    WinningTeam: "TEAM_A",
                    WinReason: $"Thắng theo Tiêu chí 2: Tổng số ô tàu đối phương đã bị bắn trúng cao hơn ({teamA_HitCellsOnB} vs {teamB_HitCellsOnA} ô).",
                    PriorityCriterion: "CRITERION_2_CELLS_HIT",
                    TeamA: summaryA,
                    TeamB: summaryB
                );
            }
            else if (teamB_HitCellsOnA > teamA_HitCellsOnB)
            {
                matchResult = new NavalMatchResultDto(
                    IsGameOver: true,
                    IsEarlyTermination: true,
                    WinningTeam: "TEAM_B",
                    WinReason: $"Thắng theo Tiêu chí 2: Tổng số ô tàu đối phương đã bị bắn trúng cao hơn ({teamB_HitCellsOnA} vs {teamA_HitCellsOnB} ô).",
                    PriorityCriterion: "CRITERION_2_CELLS_HIT",
                    TeamA: summaryA,
                    TeamB: summaryB
                );
            }
            // Tiêu chí 3: Tỷ lệ trả lời đúng của đội (Team correct answer rate)
            else if (teamA_Accuracy > teamB_Accuracy + 0.0001)
            {
                matchResult = new NavalMatchResultDto(
                    IsGameOver: true,
                    IsEarlyTermination: true,
                    WinningTeam: "TEAM_A",
                    WinReason: $"Thắng theo Tiêu chí 3: Tỷ lệ trả lời đúng của đội cao hơn ({teamA_Accuracy:P1} vs {teamB_Accuracy:P1}).",
                    PriorityCriterion: "CRITERION_3_ACCURACY",
                    TeamA: summaryA,
                    TeamB: summaryB
                );
            }
            else if (teamB_Accuracy > teamA_Accuracy + 0.0001)
            {
                matchResult = new NavalMatchResultDto(
                    IsGameOver: true,
                    IsEarlyTermination: true,
                    WinningTeam: "TEAM_B",
                    WinReason: $"Thắng theo Tiêu chí 3: Tỷ lệ trả lời đúng của đội cao hơn ({teamB_Accuracy:P1} vs {teamA_Accuracy:P1}).",
                    PriorityCriterion: "CRITERION_3_ACCURACY",
                    TeamA: summaryA,
                    TeamB: summaryB
                );
            }
            // Tiêu chí 4: Tổng thời gian trả lời hợp lệ (Nhanh hơn / ít thời gian hơn là tốt hơn)
            else if (teamA_TotalTime < teamB_TotalTime)
            {
                matchResult = new NavalMatchResultDto(
                    IsGameOver: true,
                    IsEarlyTermination: true,
                    WinningTeam: "TEAM_A",
                    WinReason: $"Thắng theo Tiêu chí 4: Tổng thời gian trả lời nhanh hơn ({teamA_TotalTime}ms vs {teamB_TotalTime}ms).",
                    PriorityCriterion: "CRITERION_4_RESPONSE_TIME",
                    TeamA: summaryA,
                    TeamB: summaryB
                );
            }
            else if (teamB_TotalTime < teamA_TotalTime)
            {
                matchResult = new NavalMatchResultDto(
                    IsGameOver: true,
                    IsEarlyTermination: true,
                    WinningTeam: "TEAM_B",
                    WinReason: $"Thắng theo Tiêu chí 4: Tổng thời gian trả lời nhanh hơn ({teamB_TotalTime}ms vs {teamA_TotalTime}ms).",
                    PriorityCriterion: "CRITERION_4_RESPONSE_TIME",
                    TeamA: summaryA,
                    TeamB: summaryB
                );
            }
            else
            {
                // Nếu tất cả 4 tiêu chí vẫn bằng nhau: Công nhận HÒA (DRAW) theo đúng tài liệu
                matchResult = new NavalMatchResultDto(
                    IsGameOver: true,
                    IsEarlyTermination: true,
                    WinningTeam: "DRAW",
                    WinReason: "Cả 4 tiêu chí ưu tiên đều hoàn toàn bằng nhau. Trận đấu được công nhận kết quả Hòa!",
                    PriorityCriterion: "DRAW",
                    TeamA: summaryA,
                    TeamB: summaryB
                );
            }
        }

        // Lưu thông tin kết quả vào rooms table
        if (matchResult.IsGameOver)
        {
            room.Status = "FINISHED";
            room.IsEarlyFinished = matchResult.IsEarlyTermination;
            room.WinnerTeam = matchResult.WinningTeam;
            room.EndTime = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return matchResult;
    }

    /// <summary>
    /// Thống kê bảng thành tích đóng góp cá nhân của các người chơi trong phòng Hải Chiến.
    /// </summary>
    public async Task<List<NavalPlayerContributionDto>> GetPlayerContributionsAsync(Guid roomId)
    {
        var players = await _db.RoomPlayers
            .Where(rp => rp.RoomId == roomId)
            .OrderByDescending(rp => rp.TotalScore)
            .ThenByDescending(rp => rp.HitsCount)
            .ThenByDescending(rp => rp.ShipsSunkContribution)
            .ToListAsync();

        return players.Select(p =>
        {
            double hitAccuracy = p.ValidShotsCount > 0
                ? Math.Round((double)p.HitsCount / p.ValidShotsCount * 100.0, 1)
                : 0.0;

            return new NavalPlayerContributionDto(
                PlayerId: p.Id,
                Nickname: p.Nickname,
                AvatarUrl: p.AvatarUrl,
                TeamSide: p.TeamSide,
                TotalScore: p.TotalScore,
                CurrentCombo: p.CurrentCombo,
                MaxCombo: p.MaxCombo,
                EnergyPoints: p.EnergyPoints,
                ShotsEarned: p.ShotsEarned,
                ValidShotsCount: p.ValidShotsCount,
                HitsCount: p.HitsCount,
                ShipsSunkContribution: p.ShipsSunkContribution,
                SkillsUsedCount: p.SkillsUsedCount,
                HitAccuracy: hitAccuracy
            );
        }).ToList();
    }

    // ─── Private Helper Methods ──────────────────────────────────────────────

    private (bool isCorrect, double scoreRatio, string correctAnswer) EvaluateSlideAnswer(Slide slide, string answerData)
    {
        if (slide.Type == "QUIZ")
        {
            var selectedIds = ParseOptionIds(answerData);
            var correctOptions = slide.Options.Where(o => o.IsCorrect).Select(o => o.Id).ToHashSet();
            int totalCorrect = correctOptions.Count;

            string correctAnswer = string.Join(", ", slide.Options
                .Where(o => o.IsCorrect)
                .Select(o => o.Content));

            if (totalCorrect == 0)
            {
                return (true, 1.0, correctAnswer);
            }

            int correctSelected = selectedIds.Count(id => correctOptions.Contains(id));
            int wrongSelected = selectedIds.Count(id => !correctOptions.Contains(id));

            if (correctSelected == totalCorrect && wrongSelected == 0)
            {
                return (true, 1.0, correctAnswer);
            }

            if (correctSelected > 0)
            {
                double penalty = wrongSelected * 0.5 / Math.Max(1, slide.Options.Count - totalCorrect);
                double partialRatio = Math.Max(0.0, Math.Round(((double)correctSelected / totalCorrect) - penalty, 2));
                return (partialRatio >= 0.99, partialRatio, correctAnswer);
            }

            return (false, 0.0, correctAnswer);
        }
        else if (slide.Type == "FILL_IN_BLANK" || slide.Type == "FILL_IN_THE_BLANK")
        {
            List<string> userAnswers;
            try
            {
                userAnswers = JsonSerializer.Deserialize<List<string>>(answerData) ?? [];
            }
            catch
            {
                userAnswers = [answerData];
            }

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

            var (isFullyCorrect, scoreRatio, _, _, _) =
                _fuzzy.GradeFillInBlankDetailed(userAnswers, keywordSets);

            string correctAnswer = string.Join(" | ", correctOptions
                .Select(o => FuzzyMatchingService.ParseKeywords(o.BlankKeywords).FirstOrDefault() ?? o.Content));

            return (isFullyCorrect, scoreRatio, correctAnswer);
        }
        else if (slide.Type == "MATCHING")
        {
            List<MatchingPairAnswer> userPairs;
            try
            {
                userPairs = JsonSerializer.Deserialize<List<MatchingPairAnswer>>(
                    answerData,
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

            int totalPairs = matchingOptions.Count;
            int correctCount = 0;

            for (int i = 0; i < matchingOptions.Count; i++)
            {
                var opt = matchingOptions[i];
                var userPair = userPairs.FirstOrDefault(p =>
                    Guid.TryParse(p.LeftId, out var parsedGuid)
                        ? parsedGuid == opt.Id
                        : p.LeftId.Equals(opt.Id.ToString(), StringComparison.OrdinalIgnoreCase));

                if (userPair != null && !string.IsNullOrWhiteSpace(userPair.RightContent))
                {
                    if (FuzzyMatchingService.Normalize(opt.MatchingPair) == FuzzyMatchingService.Normalize(userPair.RightContent))
                    {
                        correctCount++;
                    }
                }
            }

            double ratio = totalPairs > 0 ? (double)correctCount / totalPairs : 0.0;
            bool isCorrect = totalPairs > 0 && correctCount == totalPairs;
            string correctAnswer = string.Join(" | ", matchingOptions.Select(o => $"{o.Content} → {o.MatchingPair}"));

            return (isCorrect, ratio, correctAnswer);
        }
        else
        {
            // POLL, WORD_CLOUD hoặc đáp án chính xác
            bool isCorrect = slide.Type is "POLL" or "WORD_CLOUD" ||
                             slide.Options.Any(o => o.IsCorrect && o.Content.Trim().Equals(answerData.Trim(), StringComparison.OrdinalIgnoreCase));
            return (isCorrect, isCorrect ? 1.0 : 0.0, "Đáp án ghi nhận");
        }
    }

    private static List<Guid> ParseOptionIds(string answerData)
    {
        if (Guid.TryParse(answerData, out var singleId))
            return [singleId];

        try
        {
            var ids = JsonSerializer.Deserialize<List<Guid>>(answerData);
            if (ids is not null) return ids;
        }
        catch { }

        try
        {
            var stringIds = JsonSerializer.Deserialize<List<string>>(answerData);
            if (stringIds is not null)
                return stringIds
                    .Select(s => Guid.TryParse(s, out var g) ? g : Guid.Empty)
                    .Where(g => g != Guid.Empty)
                    .ToList();
        }
        catch { }

        return [];
    }

    private static int CountHitCells(IEnumerable<NavalShip> ships)
    {
        int hitCount = 0;
        foreach (var ship in ships)
        {
            var coords = JsonSerializer.Deserialize<List<ShipCoordinate>>(ship.Coordinates) ?? [];
            hitCount += coords.Count(c => c.Hit);
        }
        return hitCount;
    }

    private record MatchingPairAnswer(string LeftId, string RightContent);
}
