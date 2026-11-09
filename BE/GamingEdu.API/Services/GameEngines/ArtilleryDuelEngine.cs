using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services.GameEngines;

public class ArtilleryBoardState
{
    // Trục tọa độ X (0 đến 100): Pháo đài Đội A tại X = 12, Pháo đài Đội B tại X = 88, mỗi pháo đài 1000 HP
    public int FortressHpA { get; set; } = 1000;
    public int FortressHpB { get; set; } = 1000;
    public double BasePosA { get; set; } = 12.0;
    public double BasePosB { get; set; } = 88.0;
    // Ngọn núi chắn ngang ở giữa bản đồ (X = 45 đến 55) với độ cao ngẫu nhiên
    public double MountainStartX { get; set; } = 45.0;
    public double MountainEndX { get; set; } = 55.0;
    public double MountainHeight { get; set; } = 28.0;
    // Chỉ số Sức gió (Wind: từ -10 ngược chiều đến +10 thuận chiều)
    public double CurrentWind { get; set; } = 2.0;
    public bool ShieldActiveA { get; set; } = false;
    public bool ShieldActiveB { get; set; } = false;
    public bool ClusterAmmoA { get; set; } = false; // Đạn Phân Mảnh (Combo 3: tách 3 đầu đạn, tối đa 220 sát thương)
    public bool ClusterAmmoB { get; set; } = false;
    public bool PiercingAmmoA { get; set; } = false; // Đạn Xuyên Địa Hình (bắn xuyên qua ngọn núi ở giữa)
    public bool PiercingAmmoB { get; set; } = false;
    public bool PiercingReadyA { get; set; } = false;
    public bool PiercingReadyB { get; set; } = false;
    public int HitsCountA { get; set; } = 0;
    public int HitsCountB { get; set; } = 0;
    public string CurrentTurn { get; set; } = "TEAM_A";
    public List<string> ShotHistory { get; set; } = [];
}

public class ArtilleryDuelEngine : BaseGameModeEngine
{
    public override string GameType => "ARTILLERY_DUEL";

    public override async Task InitializeRoomAsync(Room room, List<RoomPlayer> players, ApplicationDbContext db)
    {
        var board = new ArtilleryBoardState
        {
            MountainHeight = Random.Shared.Next(22, 36),
            CurrentWind = Math.Round((Random.Shared.NextDouble() * 20.0) - 10.0, 1)
        };

        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");

        if (state == null)
        {
            state = new RoomGameState
            {
                Id = Guid.NewGuid(),
                RoomId = room.Id,
                TeamOrGroup = "GLOBAL_MAP",
                HpOrProgress = 1000,
                BoardStateJson = JsonSerializer.Serialize(board),
                SkillsStateJson = JsonSerializer.Serialize(new { ClusterReady = true, PiercingReady = true, ShieldReady = true, WindReady = true }),
                UpdatedAt = DateTime.UtcNow
            };
            db.RoomGameStates.Add(state);
        }
        else
        {
            state.HpOrProgress = 1000;
            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;
        }

        foreach (var p in players)
        {
            p.ActionPoints = 1; // 1 viên đạn đại bác ban đầu
        }

        await db.SaveChangesAsync();
    }

    public override async Task<GameActionResult> PerformActionAsync(
        Room room,
        RoomPlayer player,
        string actionType,
        string payloadJson,
        ApplicationDbContext db)
    {
        if (player.IsIsolated)
            return new GameActionResult(false, actionType, "REJECTED", "Pháo thủ đang bị choáng/tê liệt!");

        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP")
            ?? throw new KeyNotFoundException("Chưa khởi tạo trận địa Pháo Đài Đại Bác!");

        var board = JsonSerializer.Deserialize<ArtilleryBoardState>(state.BoardStateJson) ?? new ArtilleryBoardState();
        string teamSide = player.TeamSide ?? "TEAM_A";
        bool isTeamA = teamSide == "TEAM_A";

        if (actionType.Equals("FIRE_CANNON", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, actionType, "NO_SHELLS", "Hết đạn đại bác! Trả lời đúng câu hỏi để nhận +1 Viên Đạn Đại Bác.");

            using var doc = JsonDocument.Parse(payloadJson);
            double angle = Math.Clamp(doc.RootElement.GetProperty("angle").GetDouble(), 15.0, 80.0);
            double power = Math.Clamp(doc.RootElement.GetProperty("power").GetDouble(), 10.0, 100.0);

            player.ActionPoints -= 1;

            bool isCluster = isTeamA ? board.ClusterAmmoA : board.ClusterAmmoB;
            bool isPiercing = isTeamA ? (board.PiercingAmmoA || board.PiercingReadyA) : (board.PiercingAmmoB || board.PiercingReadyB);
            if (isTeamA) { board.ClusterAmmoA = false; board.PiercingAmmoA = false; board.PiercingReadyA = false; }
            else { board.ClusterAmmoB = false; board.PiercingAmmoB = false; board.PiercingReadyB = false; }

            double startX = isTeamA ? board.BasePosA : board.BasePosB;
            double targetX = isTeamA ? board.BasePosB : board.BasePosA;
            double dir = isTeamA ? 1.0 : -1.0;

            // Tính quỹ đạo Parabol trên hệ trục X (0..100) với Angle (15..80), Power (10..100), Wind (-10..+10)
            var (impactX, hitMountain) = SimulateTrajectory(
                startX,
                angle,
                power,
                board.CurrentWind,
                dir,
                board.MountainStartX,
                board.MountainEndX,
                board.MountainHeight,
                isPiercing
            );

            double distToTarget = Math.Abs(impactX - targetX);
            int damage = 0;
            string hitType = "MISS";

            if (hitMountain)
            {
                hitType = "HIT_MOUNTAIN";
                damage = 0;
            }
            else if (isCluster)
            {
                // Đạn Phân Mảnh tách 3 đầu đạn rơi trải rộng (impactX - 4, impactX, impactX + 4), tối đa 220 sát thương
                double[] subImpacts = [impactX - 4.0, impactX, impactX + 4.0];
                foreach (var sx in subImpacts)
                {
                    double d = Math.Abs(sx - targetX);
                    if (d <= 3.0) damage += 90;
                    else if (d <= 7.0) damage += 65;
                }
                damage = Math.Min(220, damage);
                hitType = damage >= 150 ? "CRITICAL_CLUSTER_HIT" : (damage > 0 ? "CLUSTER_HIT" : "MISS");
            }
            else
            {
                // Bắn Trúng Tâm (Sai số <= 3 đơn vị): 150 sát thương (Critical Hit)
                // Bắn Sượt Cạnh (Sai số 4 - 7 đơn vị): 80 sát thương
                if (distToTarget <= 3.5)
                {
                    damage = 150;
                    hitType = "CRITICAL_HIT";
                }
                else if (distToTarget <= 7.5)
                {
                    damage = 80;
                    hitType = "GRAZE_HIT";
                }
            }

            // Kiểm tra Lá Chắn Vòm (Dome Shield)
            bool enemyShield = isTeamA ? board.ShieldActiveB : board.ShieldActiveA;
            if (damage > 0 && enemyShield)
            {
                damage = 0;
                hitType = "BLOCKED_BY_SHIELD";
                if (isTeamA) board.ShieldActiveB = false;
                else board.ShieldActiveA = false;
            }
            else if (damage > 0)
            {
                if (isTeamA)
                {
                    board.FortressHpB = Math.Max(0, board.FortressHpB - damage);
                    board.HitsCountA++;
                }
                else
                {
                    board.FortressHpA = Math.Max(0, board.FortressHpA - damage);
                    board.HitsCountB++;
                }
            }

            // Gió tự động dao động nhẹ (-10 đến +10)
            board.CurrentWind = Math.Round((Random.Shared.NextDouble() * 20.0) - 10.0, 1);
            board.ShotHistory.Add(
                hitMountain
                    ? $"{teamSide}: Góc {angle}°, Lực {power} → Đạn vướng núi giữa tại X = {Math.Round(impactX, 1)} (MISS)"
                    : $"{teamSide}: Góc {angle}°, Lực {power} → Đạn rơi tại X = {Math.Round(impactX, 1)} ({hitType}, -{damage} HP)"
            );

            bool matchEnded = false;
            string? winner = null;
            if (board.FortressHpB <= 0)
            {
                matchEnded = true;
                winner = "TEAM_A";
                room.Status = "FINISHED";
                room.WinnerTeam = winner;
            }
            else if (board.FortressHpA <= 0)
            {
                matchEnded = true;
                winner = "TEAM_B";
                room.Status = "FINISHED";
                room.WinnerTeam = winner;
            }

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.HpOrProgress = isTeamA ? board.FortressHpA : board.FortressHpB;
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, actionType, payloadJson, $"{hitType}_X_{Math.Round(impactX, 1)}_DMG_{damage}", db);
            await db.SaveChangesAsync();

            string feedback = hitMountain
                ? $"Đạn va vào ngọn núi chắn giữa tại X = {Math.Round(impactX, 1)}! Hãy tăng Góc bắn lên cao hơn hoặc dùng Đạn Xuyên Địa Hình."
                : $"Khai hỏa! Đạn rơi tại X = {Math.Round(impactX, 1)} (Mục tiêu X = {targetX}, lệch {Math.Round(distToTarget, 1)} đơn vị) → {hitType} (-{damage} HP)!";

            return new GameActionResult(
                Success: true,
                ActionType: actionType,
                Result: hitType,
                Message: feedback,
                Data: new
                {
                    ImpactX = Math.Round(impactX, 1),
                    DistanceToTarget = Math.Round(distToTarget, 1),
                    HitMountain = hitMountain,
                    Damage = damage,
                    board.FortressHpA,
                    board.FortressHpB,
                    NewWind = board.CurrentWind
                },
                MatchEnded: matchEnded,
                WinnerTeam: winner
            );
        }

        return new GameActionResult(false, actionType, "UNKNOWN_ACTION", "Hành động không hợp lệ.");
    }

    public override async Task<GameActionResult> UseSkillAsync(
        Room room,
        RoomPlayer player,
        string skillName,
        string payloadJson,
        ApplicationDbContext db)
    {
        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP")
            ?? throw new KeyNotFoundException("Chưa khởi tạo trận địa Pháo Đài Đại Bác!");

        var board = JsonSerializer.Deserialize<ArtilleryBoardState>(state.BoardStateJson) ?? new ArtilleryBoardState();
        string teamSide = player.TeamSide ?? "TEAM_A";
        bool isTeamA = teamSide == "TEAM_A";

        // 1. Đạn Phân Mảnh (CLUSTER_SHELL - Mở khóa ở Combo 3): Tách làm 3 đầu đạn rơi trải rộng, tối đa 220 sát thương
        if (skillName.Equals("CLUSTER_SHELL", StringComparison.OrdinalIgnoreCase))
        {
            if (player.CurrentCombo < 3 && player.MaxCombo < 3 && player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "COMBO_REQUIRED", "Đạn Phân Mảnh mở khóa ở Combo 3 câu đúng (hoặc tốn 1 viên đạn)!");

            if (player.CurrentCombo < 3 && player.ActionPoints >= 1)
                player.ActionPoints -= 1;

            if (isTeamA) board.ClusterAmmoA = true;
            else board.ClusterAmmoB = true;

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_CLUSTER_SHELL", payloadJson, "CLUSTER_LOADED", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "💥 Đã nạp Đạn Phân Mảnh (3 đầu đạn trải rộng, sát thương tối đa 220 HP) cho phát bắn tiếp theo!");
        }

        // 2. Đạn Xuyên Địa Hình (PIERCING_SHELL): Bắn thẳng xuyên qua ngọn núi chắn ở giữa
        if (skillName.Equals("PIERCING_SHELL", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Đạn Xuyên Địa Hình cần 1 viên đạn!");

            player.ActionPoints -= 1;
            if (isTeamA) { board.PiercingAmmoA = true; board.PiercingReadyA = true; }
            else { board.PiercingAmmoB = true; board.PiercingReadyB = true; }

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_PIERCING_SHELL", payloadJson, "PIERCING_LOADED", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "🚀 Đã nạp Đạn Xuyên Địa Hình! Phát bắn tiếp theo sẽ xuyên thẳng qua ngọn núi ở giữa mà không bị cản!");
        }

        // 3. Lá Chắn Vòm (DOME_SHIELD / ENERGY_SHIELD): Chặn hoàn toàn 1 phát đạn trúng đích
        if (skillName.Equals("DOME_SHIELD", StringComparison.OrdinalIgnoreCase) ||
            skillName.Equals("ENERGY_SHIELD", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Lá Chắn Vòm cần 1 viên đạn!");

            player.ActionPoints -= 1;
            if (isTeamA) board.ShieldActiveA = true;
            else board.ShieldActiveB = true;

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_DOME_SHIELD", payloadJson, "SHIELD_DEPLOYED", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "🛡️ Đã kích hoạt Lá Chắn Vòm (Dome Shield)! Chặn hoàn toàn sát thương của 1 phát đạn bắn trúng từ đối phương.");
        }

        // 4. Đảo Chiều Gió (WIND_CONTROLLER): Đổi ngẫu nhiên chỉ số Gió khiến đối phương lệch thông số
        if (skillName.Equals("WIND_CONTROLLER", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Đảo Chiều Gió cần 1 viên đạn!");

            player.ActionPoints -= 1;
            double newWind = Math.Round((Random.Shared.NextDouble() * 20.0) - 10.0, 1);
            if (Math.Abs(newWind - board.CurrentWind) < 3.0)
                newWind = -board.CurrentWind;
            board.CurrentWind = Math.Clamp(newWind, -10.0, 10.0);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_WIND_CONTROLLER", payloadJson, $"WIND_CHANGED_TO_{board.CurrentWind}", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", $"🌪️ Đã Đảo Chiều Gió! Chỉ số gió mới là {board.CurrentWind} khiến thông số căn chỉnh của đối phương bị lệch!");
        }

        return new GameActionResult(false, skillName, "UNKNOWN_SKILL", "Kỹ năng không tồn tại.");
    }

    public override async Task<GameMatchStatus> EvaluateMatchStatusAsync(Room room, ApplicationDbContext db)
    {
        var state = await db.RoomGameStates
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");

        if (state == null)
            return new GameMatchStatus(room.Status, room.CurrentSlideIndex, 0, false);

        var board = JsonSerializer.Deserialize<ArtilleryBoardState>(state.BoardStateJson) ?? new ArtilleryBoardState();
        bool isFinished = room.Status == "FINISHED" || board.FortressHpA <= 0 || board.FortressHpB <= 0;
        string? winner = board.FortressHpB <= 0 ? "TEAM_A" : (board.FortressHpA <= 0 ? "TEAM_B" : room.WinnerTeam);

        if (isFinished && string.IsNullOrEmpty(winner))
        {
            if (board.FortressHpA != board.FortressHpB)
                winner = board.FortressHpA > board.FortressHpB ? "TEAM_A" : "TEAM_B";
            else
                winner = board.HitsCountA >= board.HitsCountB ? "TEAM_A" : "TEAM_B";
        }

        return new GameMatchStatus(
            Status: isFinished ? "FINISHED" : room.Status,
            CurrentSlideIndex: room.CurrentSlideIndex,
            TotalSlides: 0,
            IsFinished: isFinished,
            Winner: winner,
            Summary: new
            {
                board.FortressHpA,
                board.FortressHpB,
                board.HitsCountA,
                board.HitsCountB,
                board.CurrentWind
            }
        );
    }

    public override async Task<object> GetClientGameStateAsync(Room room, Guid? requestingPlayerId, ApplicationDbContext db)
    {
        var state = await db.RoomGameStates
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");

        var board = state != null
            ? JsonSerializer.Deserialize<ArtilleryBoardState>(state.BoardStateJson)
            : new ArtilleryBoardState();
        if (board != null)
        {
            board.PiercingReadyA = board.PiercingAmmoA;
            board.PiercingReadyB = board.PiercingAmmoB;
        }

        var player = requestingPlayerId.HasValue
            ? await db.RoomPlayers.AsNoTracking().FirstOrDefaultAsync(p => p.Id == requestingPlayerId.Value)
            : null;

        return new
        {
            GameType,
            RoomId = room.Id,
            PinCode = room.PinCode,
            Status = room.Status,
            Board = board,
            PlayerShells = player?.ActionPoints ?? 0,
            PlayerCombo = player?.CurrentCombo ?? 0,
            PlayerTeam = player?.TeamSide ?? "TEAM_A"
        };
    }

    public static (double impactX, bool hitMountain) SimulateTrajectory(
        double startX,
        double angleDeg,
        double power,
        double wind,
        double dir,
        double mountainStartX,
        double mountainEndX,
        double mountainHeight,
        bool isPiercing)
    {
        // Đồng bộ 100% công thức vật lý Parabol giữa HUD ngắm bắn và Server
        double rad = angleDeg * Math.PI / 180.0;
        double range = power * 0.96 * Math.Sin(2.0 * rad) + wind * 1.5 * dir;
        double maxHeight = power * 0.65 * Math.Pow(Math.Sin(rad), 2.0);
        bool hitMountain = !isPiercing && maxHeight < mountainHeight && range > 33.0;
        if (hitMountain)
        {
            return ((mountainStartX + mountainEndX) / 2.0, true);
        }

        double impactX = Math.Clamp(Math.Round((startX + range * dir) * 10.0) / 10.0, 0.0, 100.0);
        return (impactX, false);
    }
}
