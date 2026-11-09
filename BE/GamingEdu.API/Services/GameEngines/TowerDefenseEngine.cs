using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services.GameEngines;

public class Creep
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Type { get; set; } = "SCOUT"; // SCOUT (50 HP, 20 dmg) | TANK (300 HP, 100 dmg)
    public string OwnerTeam { get; set; } = "TEAM_B"; // Đội thả quái
    public string TargetTeam { get; set; } = "TEAM_A"; // Căn cứ mục tiêu
    public int Lane { get; set; } = 1; // Làn 1 hoặc Làn 2 song song
    public int Hp { get; set; } = 50;
    public int MaxHp { get; set; } = 50;
    public int BaseDamage { get; set; } = 20;
    public int PathIndex { get; set; } = 0;
    public double Speed { get; set; } = 1.0; // Giảm 40% còn 0.6 khi trúng Tháp Băng
    public bool IsFrozen { get; set; } = false;
}

public class DefenseTower
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string TeamSide { get; set; } = "TEAM_A";
    public string OwnerTeam { get; set; } = "TEAM_A";
    public string Type { get; set; } = "ARCHER"; // ARCHER (100g) | FREEZE (150g) | LASER/CANNON (200g)
    public int X { get; set; }
    public int Y { get; set; }
    public int Lane { get; set; } = 0;
    public int Level { get; set; } = 1;
    public int Range { get; set; } = 2;
    public int Damage { get; set; } = 35;
}

public class TowerDefenseBoardState
{
    // Căn cứ Đội A (Bên trái - 1000 HP) và Căn cứ Đội B (Bên phải - 1000 HP)
    public int BaseHp { get; set; } = 1000;
    public int BaseHpA { get; set; } = 1000;
    public int BaseHpB { get; set; } = 1000;
    public int TeamABaseHp { get; set; } = 1000;
    public int TeamBBaseHp { get; set; } = 1000;
    public int ShieldHpA { get; set; } = 0; // Khiên Căn Cứ hấp thụ 200 sát thương
    public int ShieldHpB { get; set; } = 0;
    public int TeamAShield { get; set; } = 0;
    public int TeamBShield { get; set; } = 0;
    public int TotalDamageDealtA { get; set; } = 0;
    public int TotalDamageDealtB { get; set; } = 0;
    public bool TowerBoostA { get; set; } = false; // Cường Hóa Tháp x2 tốc độ bắn (8s)
    public bool TowerBoostB { get; set; } = false;
    public DateTime? TowerBoostUntilA { get; set; }
    public DateTime? TowerBoostUntilB { get; set; }
    public int WaveNumber { get; set; } = 1;
    public List<DefenseTower> Towers { get; set; } = [];
    public List<Creep> Creeps { get; set; } = [];
    // 2 làn đường song song (Hàng 1 và Hàng 3) nối giữa Căn cứ A (Cột 0) và Căn cứ B (Cột 7)
    public List<int[]> PathTiles { get; set; } = [
        [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7],
        [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7]
    ];
}

public class TowerDefenseEngine : BaseGameModeEngine
{
    public override string GameType => "TOWER_DEFENSE";

    public override async Task InitializeRoomAsync(Room room, List<RoomPlayer> players, ApplicationDbContext db)
    {
        var board = new TowerDefenseBoardState();
        SpawnInitialWave(board);

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
                SkillsStateJson = JsonSerializer.Serialize(new { FreezeReady = true, BoostReady = true, ShieldReady = true }),
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
            p.ActionPoints = 150; // 150 Vàng khởi đầu
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
            return new GameActionResult(false, actionType, "REJECTED", "Bạn đang bị choáng, không thể thực hiện!");

        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP")
            ?? throw new KeyNotFoundException("Chưa khởi tạo bản đồ Tower Defense!");

        var board = JsonSerializer.Deserialize<TowerDefenseBoardState>(state.BoardStateJson) ?? new TowerDefenseBoardState();
        string teamSide = player.TeamSide ?? "TEAM_A";
        string enemySide = teamSide == "TEAM_A" ? "TEAM_B" : "TEAM_A";

        // 1. Nhánh Phòng Thủ: Xây Tháp (ARCHER 100g, FREEZE 150g, LASER/CANNON 200g)
        if (actionType.Equals("BUILD_TOWER", StringComparison.OrdinalIgnoreCase))
        {
            using var doc = JsonDocument.Parse(payloadJson);
            int x = doc.RootElement.GetProperty("x").GetInt32();
            int y = doc.RootElement.GetProperty("y").GetInt32();
            string towerType = doc.RootElement.GetProperty("towerType").GetString()?.ToUpper() ?? "ARCHER";
            if (towerType == "CANNON") towerType = "LASER";

            int cost = towerType switch
            {
                "LASER" => 200,
                "FREEZE" => 150,
                _ => 100 // ARCHER
            };

            if (player.ActionPoints < cost)
                return new GameActionResult(false, actionType, "NOT_ENOUGH_GOLD", $"Không đủ Vàng để xây tháp {towerType}! Cần {cost} Vàng.");

            bool onPath = board.PathTiles.Any(p => p[0] == x && p[1] == y);
            if (onPath)
                return new GameActionResult(false, actionType, "ON_PATH", "Chỉ được đặt tháp tại các Ô Đặt Tháp (Tower Slots) dọc hai bên làn đường!");

            bool alreadyHasTower = board.Towers.Any(t => t.X == x && t.Y == y);
            if (alreadyHasTower)
                return new GameActionResult(false, actionType, "OCCUPIED", "Ô Đặt Tháp này đã có tháp phòng thủ!");

            player.ActionPoints -= cost;

            var newTower = new DefenseTower
            {
                TeamSide = teamSide,
                OwnerTeam = teamSide,
                Type = towerType,
                X = x,
                Y = y,
                Lane = x <= 2 ? 0 : 1,
                Level = 1,
                Range = towerType == "LASER" ? 3 : 2,
                Damage = towerType == "LASER" ? 80 : (towerType == "FREEZE" ? 25 : 40)
            };
            board.Towers.Add(newTower);

            SimulateCombatTick(board);
            SyncBaseHp(board);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.HpOrProgress = board.BaseHpA;
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, actionType, payloadJson, $"BUILT_{towerType}_AT_({x},{y})", db);

            bool matchEnded = board.BaseHpA <= 0 || board.BaseHpB <= 0;
            string? winner = board.BaseHpB <= 0 ? "TEAM_A" : (board.BaseHpA <= 0 ? "TEAM_B" : null);
            if (matchEnded)
            {
                room.Status = "FINISHED";
                room.WinnerTeam = winner;
            }

            await db.SaveChangesAsync();

            return new GameActionResult(
                true,
                actionType,
                "SUCCESS",
                $"Đã xây dựng {towerType} (-{cost} Vàng) tại ({x}, {y})!",
                new { board.BaseHpA, board.BaseHpB, board.Towers.Count },
                matchEnded,
                winner
            );
        }

        // 2. Nhánh Tấn Công: Thả Quái sang đường đi của đối phương (SCOUT 100g, TANK 250g)
        if (actionType.Equals("SPAWN_CREEP", StringComparison.OrdinalIgnoreCase))
        {
            using var doc = JsonDocument.Parse(payloadJson);
            string creepType = doc.RootElement.TryGetProperty("creepType", out var ct)
                ? (ct.GetString()?.ToUpper() ?? "SCOUT")
                : "SCOUT";
            int lane = doc.RootElement.TryGetProperty("lane", out var ln) ? ln.GetInt32() : 0;
            int normalizedLane = (lane == 1 || lane == 2) ? 1 : 0;

            int cost = creepType == "TANK" ? 250 : 100;
            if (player.ActionPoints < cost)
                return new GameActionResult(false, actionType, "NOT_ENOUGH_GOLD", $"Cần {cost} Vàng để triệu hồi {(creepType == "TANK" ? "Chiến Xa Bọc Thép" : "Quái Trinh Sát")}!");

            player.ActionPoints -= cost;

            var newCreep = new Creep
            {
                Type = creepType,
                OwnerTeam = teamSide,
                TargetTeam = enemySide,
                Lane = normalizedLane,
                Hp = creepType == "TANK" ? 300 : 50,
                MaxHp = creepType == "TANK" ? 300 : 50,
                BaseDamage = creepType == "TANK" ? 100 : 20,
                PathIndex = 1,
                Speed = creepType == "TANK" ? 0.8 : 1.5
            };
            board.Creeps.Add(newCreep);

            SimulateCombatTick(board);
            SyncBaseHp(board);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, actionType, payloadJson, $"SPAWNED_{creepType}_LANE_{lane}", db);

            bool matchEnded = board.BaseHpA <= 0 || board.BaseHpB <= 0;
            string? winner = board.BaseHpB <= 0 ? "TEAM_A" : (board.BaseHpA <= 0 ? "TEAM_B" : null);
            if (matchEnded)
            {
                room.Status = "FINISHED";
                room.WinnerTeam = winner;
            }

            await db.SaveChangesAsync();

            return new GameActionResult(
                true,
                actionType,
                "SUCCESS",
                $"Đã thả {(creepType == "TANK" ? "Chiến Xa Bọc Thép (300 HP, 100 Dmg)" : "Quái Trinh Sát (50 HP, 20 Dmg)")} sang Làn {lane} tấn công căn cứ đối phương!",
                new { board.BaseHpA, board.BaseHpB, CreepCount = board.Creeps.Count },
                matchEnded,
                winner
            );
        }

        // 3. Nâng cấp tháp
        if (actionType.Equals("UPGRADE_TOWER", StringComparison.OrdinalIgnoreCase))
        {
            using var doc = JsonDocument.Parse(payloadJson);
            string towerId = doc.RootElement.GetProperty("towerId").GetString() ?? "";

            var tower = board.Towers.FirstOrDefault(t => t.Id == towerId);
            if (tower == null)
                return new GameActionResult(false, actionType, "NOT_FOUND", "Không tìm thấy tháp cần nâng cấp!");

            int upgradeCost = tower.Level * 100;
            if (player.ActionPoints < upgradeCost)
                return new GameActionResult(false, actionType, "NOT_ENOUGH_GOLD", $"Cần {upgradeCost} Vàng để nâng cấp tháp lên cấp {tower.Level + 1}!");

            player.ActionPoints -= upgradeCost;
            tower.Level++;
            tower.Damage += 25;
            if (tower.Level % 2 == 0) tower.Range++;

            SimulateCombatTick(board);
            SyncBaseHp(board);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, actionType, payloadJson, $"UPGRADED_{tower.Type}_TO_LV{tower.Level}", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, actionType, "SUCCESS", $"Đã nâng cấp tháp {tower.Type} lên Cấp {tower.Level}!", new { tower.Level, tower.Damage, tower.Range });
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
            ?? throw new KeyNotFoundException("Chưa khởi tạo bản đồ Tower Defense!");

        var board = JsonSerializer.Deserialize<TowerDefenseBoardState>(state.BoardStateJson) ?? new TowerDefenseBoardState();
        string teamSide = player.TeamSide ?? "TEAM_A";

        // 1. Đóng Băng Toàn Cầu (GLOBAL_FREEZE / METEOR_STRIKE): Đóng băng toàn bộ quái đối phương 5 giây
        if (skillName.Equals("GLOBAL_FREEZE", StringComparison.OrdinalIgnoreCase) ||
            skillName.Equals("METEOR_STRIKE", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 150)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_GOLD", "Kỹ năng Đóng Băng Toàn Cầu cần 150 Vàng!");

            player.ActionPoints -= 150;
            int frozenCount = 0;
            foreach (var creep in board.Creeps.Where(c => c.TargetTeam == teamSide))
            {
                creep.IsFrozen = true;
                creep.Speed = 0.6;
                creep.Hp -= 40;
                frozenCount++;
            }
            board.Creeps.RemoveAll(c => c.Hp <= 0);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_GLOBAL_FREEZE", payloadJson, $"FROZE_{frozenCount}_CREEPS", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", $"Đóng Băng Toàn Cầu! Toàn bộ {frozenCount} quái vật đối phương bị đóng băng trong 5 giây!");
        }

        // 2. Cường Hóa Tháp (TOWER_BOOST - Combo 3): Tăng x2 tốc độ bắn cho toàn bộ tháp của đội trong 8 giây
        if (skillName.Equals("TOWER_BOOST", StringComparison.OrdinalIgnoreCase))
        {
            if (player.CurrentCombo < 3 && player.MaxCombo < 3 && player.ActionPoints < 150)
                return new GameActionResult(false, skillName, "COMBO_REQUIRED", "Cường Hóa Tháp yêu cầu đạt Combo 3 câu đúng (hoặc 150 Vàng)!");

            if (player.CurrentCombo < 3 && player.ActionPoints >= 150)
                player.ActionPoints -= 150;

            if (teamSide == "TEAM_B")
            {
                board.TowerBoostB = true;
                board.TowerBoostUntilB = DateTime.UtcNow.AddSeconds(8);
            }
            else
            {
                board.TowerBoostA = true;
                board.TowerBoostUntilA = DateTime.UtcNow.AddSeconds(8);
            }

            SimulateCombatTick(board);
            SyncBaseHp(board);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_TOWER_BOOST", payloadJson, "TOWER_SPEED_X2_8S", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "Kích hoạt Cường Hóa Tháp! Toàn bộ tháp pháo của đội tăng gấp đôi (x2) tốc độ bắn trong 8 giây!");
        }

        // 3. Khiên Căn Cứ (BASE_SHIELD / REPAIR_BASE): Tạo lớp giáp ảo hấp thụ 200 sát thương
        if (skillName.Equals("BASE_SHIELD", StringComparison.OrdinalIgnoreCase) ||
            skillName.Equals("REPAIR_BASE", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 100)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_GOLD", "Kỹ năng Khiên Căn Cứ cần 100 Vàng!");

            player.ActionPoints -= 100;
            if (teamSide == "TEAM_B") board.ShieldHpB += 200;
            else board.ShieldHpA += 200;
            SyncBaseHp(board);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_BASE_SHIELD", payloadJson, "SHIELD_+200", db);
            await db.SaveChangesAsync();

            int currentShield = teamSide == "TEAM_B" ? board.ShieldHpB : board.ShieldHpA;
            return new GameActionResult(true, skillName, "SUCCESS", $"Đã bật Khiên Căn Cứ! Giáp ảo hiện tại hấp thụ {currentShield} sát thương trước khi trừ vào máu thật.");
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

        var board = JsonSerializer.Deserialize<TowerDefenseBoardState>(state.BoardStateJson) ?? new TowerDefenseBoardState();
        bool isFinished = room.Status == "FINISHED" || board.BaseHpA <= 0 || board.BaseHpB <= 0;

        string? winner = room.WinnerTeam;
        if (board.BaseHpB <= 0) winner = "TEAM_A";
        else if (board.BaseHpA <= 0) winner = "TEAM_B";
        else if (isFinished && string.IsNullOrEmpty(winner))
        {
            // Xét theo thứ tự: (1) HP Căn cứ còn lại -> (2) Tổng sát thương đã gây ra -> (3) Tỷ lệ trả lời đúng
            if (board.BaseHpA != board.BaseHpB)
                winner = board.BaseHpA > board.BaseHpB ? "TEAM_A" : "TEAM_B";
            else if (board.TotalDamageDealtA != board.TotalDamageDealtB)
                winner = board.TotalDamageDealtA > board.TotalDamageDealtB ? "TEAM_A" : "TEAM_B";
            else
            {
                var roomPlayers = await db.RoomPlayers.AsNoTracking().Where(p => p.RoomId == room.Id).ToListAsync();
                var pIds = roomPlayers.Select(p => p.Id).ToList();
                var resps = await db.PlayerResponses.AsNoTracking().Where(r => pIds.Contains(r.RoomPlayerId)).ToListAsync();

                var teamAIds = roomPlayers.Where(p => (p.TeamSide ?? "TEAM_A") == "TEAM_A").Select(p => p.Id).ToHashSet();
                var teamBIds = roomPlayers.Where(p => p.TeamSide == "TEAM_B").Select(p => p.Id).ToHashSet();

                var aResps = resps.Where(r => teamAIds.Contains(r.RoomPlayerId)).ToList();
                var bResps = resps.Where(r => teamBIds.Contains(r.RoomPlayerId)).ToList();

                double accA = aResps.Count > 0 ? (double)aResps.Count(r => r.IsCorrect == true) / aResps.Count : 0;
                double accB = bResps.Count > 0 ? (double)bResps.Count(r => r.IsCorrect == true) / bResps.Count : 0;
                winner = accA >= accB ? "TEAM_A" : "TEAM_B";
            }
        }

        return new GameMatchStatus(
            Status: isFinished ? "FINISHED" : room.Status,
            CurrentSlideIndex: room.CurrentSlideIndex,
            TotalSlides: 0,
            IsFinished: isFinished,
            Winner: winner,
            Summary: new
            {
                board.BaseHpA,
                board.BaseHpB,
                board.ShieldHpA,
                board.ShieldHpB,
                board.TotalDamageDealtA,
                board.TotalDamageDealtB,
                ActiveTowers = board.Towers.Count,
                RemainingCreeps = board.Creeps.Count
            }
        );
    }

    public override async Task<object> GetClientGameStateAsync(Room room, Guid? requestingPlayerId, ApplicationDbContext db)
    {
        var state = await db.RoomGameStates
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");

        var board = state != null
            ? JsonSerializer.Deserialize<TowerDefenseBoardState>(state.BoardStateJson)
            : new TowerDefenseBoardState();
        if (board != null) SyncBaseHp(board);

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
            PlayerGold = player?.ActionPoints ?? 0,
            PlayerCombo = player?.CurrentCombo ?? 0,
            PlayerScore = player?.TotalScore ?? 0,
            PlayerTeam = player?.TeamSide ?? "TEAM_A"
        };
    }

    private static void SyncBaseHp(TowerDefenseBoardState board)
    {
        board.BaseHp = board.BaseHpA;
        board.TeamABaseHp = board.BaseHpA;
        board.TeamBBaseHp = board.BaseHpB;
        board.TeamAShield = board.ShieldHpA;
        board.TeamBShield = board.ShieldHpB;
    }

    private static void SpawnInitialWave(TowerDefenseBoardState board)
    {
        board.Creeps.Add(new Creep
        {
            Type = "SCOUT",
            OwnerTeam = "TEAM_B",
            TargetTeam = "TEAM_A",
            Lane = 0,
            Hp = 50,
            MaxHp = 50,
            BaseDamage = 20,
            PathIndex = 5
        });
        board.Creeps.Add(new Creep
        {
            Type = "TANK",
            OwnerTeam = "TEAM_B",
            TargetTeam = "TEAM_A",
            Lane = 1,
            Hp = 300,
            MaxHp = 300,
            BaseDamage = 100,
            PathIndex = 4
        });
        SyncBaseHp(board);
    }

    private static void SimulateCombatTick(TowerDefenseBoardState board)
    {
        var now = DateTime.UtcNow;
        if (board.TowerBoostUntilA.HasValue && board.TowerBoostUntilA.Value <= now) board.TowerBoostA = false;
        if (board.TowerBoostUntilB.HasValue && board.TowerBoostUntilB.Value <= now) board.TowerBoostB = false;

        // 1. Tháp tấn công quái địch trong tầm (nếu đang bật Cường Hóa Tháp trong 8s thì sát thương x2)
        foreach (var tower in board.Towers)
        {
            bool boosted = tower.TeamSide == "TEAM_B" ? board.TowerBoostB : board.TowerBoostA;
            int effectiveDmg = boosted ? tower.Damage * 2 : tower.Damage;

            var target = board.Creeps
                .Where(c => c.TargetTeam == tower.TeamSide)
                .OrderByDescending(c => c.PathIndex)
                .FirstOrDefault(c =>
                {
                    int laneRow = c.Lane == 1 ? 3 : 1;
                    int col = Math.Clamp(c.PathIndex, 0, 7);
                    double dist = Math.Sqrt(Math.Pow(laneRow - tower.X, 2) + Math.Pow(col - tower.Y, 2));
                    return dist <= tower.Range + 1;
                });

            if (target != null)
            {
                target.Hp -= effectiveDmg;
                if (tower.TeamSide == "TEAM_B") board.TotalDamageDealtB += effectiveDmg;
                else board.TotalDamageDealtA += effectiveDmg;

                if (tower.Type == "FREEZE")
                {
                    target.IsFrozen = true;
                    target.Speed = 0.6; // Làm chậm 40% tốc độ di chuyển
                }
            }
        }

        board.Creeps.RemoveAll(c => c.Hp <= 0);

        // 2. Quái di chuyển trên 2 làn đường song song (Cột 0 đến Cột 7)
        var reachedCreeps = new List<Creep>();
        foreach (var creep in board.Creeps)
        {
            if (creep.IsFrozen)
            {
                creep.IsFrozen = false; // Bị đóng băng 1 nhịp
                continue;
            }

            if (creep.TargetTeam == "TEAM_A")
            {
                creep.PathIndex--;
                if (creep.PathIndex <= 0)
                {
                    reachedCreeps.Add(creep);
                    int dmg = creep.BaseDamage;
                    board.TotalDamageDealtB += dmg;
                    int absorbed = Math.Min(board.ShieldHpA, dmg);
                    board.ShieldHpA -= absorbed;
                    board.BaseHpA = Math.Max(0, board.BaseHpA - (dmg - absorbed));
                }
            }
            else
            {
                creep.PathIndex++;
                if (creep.PathIndex >= 7)
                {
                    reachedCreeps.Add(creep);
                    int dmg = creep.BaseDamage;
                    board.TotalDamageDealtA += dmg;
                    int absorbed = Math.Min(board.ShieldHpB, dmg);
                    board.ShieldHpB -= absorbed;
                    board.BaseHpB = Math.Max(0, board.BaseHpB - (dmg - absorbed));
                }
            }
        }

        foreach (var rc in reachedCreeps)
        {
            board.Creeps.Remove(rc);
        }

        // Luôn duy trì ít nhất 1 quái mỗi bên để người chơi có mục tiêu phòng thủ
        if (!board.Creeps.Any(c => c.TargetTeam == "TEAM_A"))
        {
            board.Creeps.Add(new Creep
            {
                Type = "SCOUT",
                OwnerTeam = "TEAM_B",
                TargetTeam = "TEAM_A",
                Lane = 0,
                Hp = 50,
                MaxHp = 50,
                BaseDamage = 20,
                PathIndex = 6
            });
        }
        SyncBaseHp(board);
    }
}
