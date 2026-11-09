using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services.GameEngines;

public class BoatObstacle
{
    public int Distance { get; set; } // Vị trí mét trên đường đua: 250, 500, 750
    public int Lane { get; set; } // Làn 1, 2, 3, 4
    public string Type { get; set; } = "WHIRLPOOL"; // WHIRLPOOL | ROCK_REEF
}

public class BoatTeamState
{
    public string TeamSide { get; set; } = "TEAM_A";
    public string TeamName { get; set; } = "Thuyền Đỏ";
    public int Distance { get; set; } = 0; // 0 đến 1000m
    public int CurrentLane { get; set; } = 1; // 1..4
    public int ComboRow { get; set; } = 0; // Chuỗi câu đúng liên tiếp của đội
    public bool HasDrumBoost { get; set; } = false; // Nitro Boost (+30m/nhịp cho 3 nhịp)
    public int BoostRemaining { get; set; } = 0;
    public int NitroStrokesLeft { get; set; } = 0;
    public bool WindShieldActive { get; set; } = false; // Lá Chắn Gió
    public bool HasWindShield { get; set; } = false;
    public DateTime? LastRowAtUtc { get; set; } // Để tính Đồng Tâm Hiệp Lực trong 5 giây
    public DateTime? InkBlindUntilUtc { get; set; } // Hiệu ứng Mực Đen che câu hỏi 6 giây
    public bool IsInkBlinded { get; set; } = false;
}

public class DragonBoatBoardState
{
    public int TargetDistance { get; set; } = 1000;
    public BoatTeamState BoatA { get; set; } = new() { TeamSide = "TEAM_A", TeamName = "Thuyền Đỏ", CurrentLane = 1 };
    public BoatTeamState BoatB { get; set; } = new() { TeamSide = "TEAM_B", TeamName = "Thuyền Xanh", CurrentLane = 2 };
    public BoatTeamState BoatC { get; set; } = new() { TeamSide = "TEAM_C", TeamName = "Thuyền Vàng", CurrentLane = 3 };
    public BoatTeamState BoatD { get; set; } = new() { TeamSide = "TEAM_D", TeamName = "Thuyền Tím", CurrentLane = 4 };
    public List<BoatObstacle> Obstacles { get; set; } = [
        new() { Distance = 250, Lane = 2, Type = "WHIRLPOOL" },
        new() { Distance = 500, Lane = 1, Type = "ROCK_REEF" },
        new() { Distance = 750, Lane = 3, Type = "WHIRLPOOL" }
    ];
}

public class DragonBoatEngine : BaseGameModeEngine
{
    public override string GameType => "DRAGON_BOAT";

    public override async Task InitializeRoomAsync(Room room, List<RoomPlayer> players, ApplicationDbContext db)
    {
        var board = new DragonBoatBoardState();
        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");

        if (state == null)
        {
            state = new RoomGameState
            {
                Id = Guid.NewGuid(),
                RoomId = room.Id,
                TeamOrGroup = "GLOBAL_MAP",
                HpOrProgress = 0,
                BoardStateJson = JsonSerializer.Serialize(board),
                SkillsStateJson = JsonSerializer.Serialize(new { NitroReady = true, TorpedoReady = true, WindShieldReady = true }),
                UpdatedAt = DateTime.UtcNow
            };
            db.RoomGameStates.Add(state);
        }
        else
        {
            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;
        }

        foreach (var p in players)
        {
            p.ActionPoints = 1; // 1 nhịp chèo khởi đầu
        }

        await db.SaveChangesAsync();
    }

    public override async Task<SlideAnswerProcessResult> ProcessSlideAnswerAsync(
        Room room,
        RoomPlayer player,
        Slide slide,
        string answerData,
        int responseTimeMs,
        ApplicationDbContext db)
    {
        var res = await base.ProcessSlideAnswerAsync(room, player, slide, answerData, responseTimeMs, db);
        if (res.Success)
        {
            var state = await db.RoomGameStates
                .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");
            if (state != null)
            {
                var board = JsonSerializer.Deserialize<DragonBoatBoardState>(state.BoardStateJson) ?? new DragonBoatBoardState();
                var boat = GetBoatByTeam(board, player.TeamSide ?? "TEAM_A");

                if (res.IsCorrect)
                {
                    boat.ComboRow++;
                    // Chuỗi 4 câu trả lời đúng liên tiếp của đội -> Tự động kích hoạt Tăng Tốc Nitro cho 3 nhịp tiếp theo!
                    if (boat.ComboRow >= 4 && !boat.HasDrumBoost)
                    {
                        boat.HasDrumBoost = true;
                        boat.BoostRemaining = 3;
                    }
                }
                else
                {
                    boat.ComboRow = 0;
                }

                SyncBoatAliases(board);
                state.BoardStateJson = JsonSerializer.Serialize(board);
                await db.SaveChangesAsync();
            }
        }
        return res;
    }

    public override async Task<GameActionResult> PerformActionAsync(
        Room room,
        RoomPlayer player,
        string actionType,
        string payloadJson,
        ApplicationDbContext db)
    {
        if (player.IsIsolated)
            return new GameActionResult(false, actionType, "REJECTED", "Bạn đang bị say sóng/choáng!");

        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP")
            ?? throw new KeyNotFoundException("Chưa khởi tạo đường đua Thuyền Rồng!");

        var board = JsonSerializer.Deserialize<DragonBoatBoardState>(state.BoardStateJson) ?? new DragonBoatBoardState();
        string teamSide = player.TeamSide ?? "TEAM_A";
        var boat = GetBoatByTeam(board, teamSide);
        var enemyBoat = teamSide == "TEAM_B" ? board.BoatA : board.BoatB;

        if (actionType.Equals("ROW_BOAT", StringComparison.OrdinalIgnoreCase) ||
            actionType.Equals("ROW_FORWARD", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, actionType, "NO_STROKES", "Hết nhịp chèo! Hãy trả lời đúng câu hỏi để tạo Nhịp Chèo (+15m)!");

            player.ActionPoints -= 1;

            // Nhịp chèo cơ bản: +15m (hoặc +30m khi đang có Tăng Tốc Nitro)
            int baseGain = 15;
            bool usedNitro = false;
            if ((boat.HasDrumBoost || boat.BoostRemaining > 0) && boat.BoostRemaining > 0)
            {
                baseGain = 30; // Gấp đôi quãng đường (+30m/nhịp)
                usedNitro = true;
                boat.BoostRemaining--;
                if (boat.BoostRemaining <= 0) boat.HasDrumBoost = false;
            }

            // Phối hợp Đồng đội (Đồng Tâm Hiệp Lực): Nếu chèo trong vòng 5 giây kể từ nhịp trước của đội -> thưởng +5m
            int teamSyncBonus = 0;
            var now = DateTime.UtcNow;
            if (boat.LastRowAtUtc.HasValue && (now - boat.LastRowAtUtc.Value).TotalSeconds <= 5.0)
            {
                teamSyncBonus = 5;
            }
            boat.LastRowAtUtc = now;

            int totalMeters = baseGain + teamSyncBonus;
            int newDist = boat.Distance + totalMeters;

            // Kiểm tra va chạm Xoáy Nước / Đá Ngầm ở mốc 250m, 500m, 750m
            var hitObstacle = board.Obstacles.FirstOrDefault(o =>
                o.Lane == boat.CurrentLane &&
                boat.Distance < o.Distance &&
                newDist >= o.Distance
            );

            string alertMsg = "";
            if (hitObstacle != null)
            {
                if (boat.WindShieldActive)
                {
                    boat.WindShieldActive = false;
                    alertMsg = $" 🛡️ Lá Chắn Gió đã giúp thuyền lướt qua {hitObstacle.Type} tại mốc {hitObstacle.Distance}m mà không bị giảm tốc!";
                }
                else
                {
                    newDist = Math.Max(0, newDist - 15);
                    boat.ComboRow = 0;
                    alertMsg = $" ⚠️ Thuyền va vào {hitObstacle.Type} tại mốc {hitObstacle.Distance}m! Bị cản lại -15m.";
                }
            }

            boat.Distance = Math.Min(board.TargetDistance, newDist);

            bool matchEnded = false;
            string? winner = null;
            if (boat.Distance >= board.TargetDistance)
            {
                matchEnded = true;
                winner = teamSide;
                room.Status = "FINISHED";
                room.WinnerTeam = winner;
            }

            SyncBoatAliases(board);
            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.HpOrProgress = boat.Distance;
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "ROW_BOAT", payloadJson, $"ROWED_+{totalMeters}m_TOTAL_{boat.Distance}m", db);
            await db.SaveChangesAsync();

            string syncNote = teamSyncBonus > 0 ? " (Đồng Tâm Hiệp Lực +5m!)" : "";
            string nitroNote = usedNitro ? " (🔥 Nitro x2: +30m!)" : "";

            return new GameActionResult(
                Success: true,
                ActionType: "ROW_BOAT",
                Result: "SUCCESS",
                Message: $"Nhịp chèo tiến thêm +{totalMeters}m{nitroNote}{syncNote} ({boat.Distance}/1000m).{alertMsg}",
                Data: new { boat.Distance, boat.CurrentLane, boat.ComboRow, boat.HasDrumBoost, boat.WindShieldActive, EnemyDistance = enemyBoat.Distance },
                MatchEnded: matchEnded,
                WinnerTeam: winner
            );
        }

        if (actionType.Equals("STEER_LANE", StringComparison.OrdinalIgnoreCase) ||
            actionType.Equals("CHANGE_LANE", StringComparison.OrdinalIgnoreCase))
        {
            using var doc = JsonDocument.Parse(payloadJson);
            int targetLane = doc.RootElement.GetProperty("lane").GetInt32();
            if (targetLane < 1 || targetLane > 4)
                return new GameActionResult(false, actionType, "INVALID_LANE", "Làn đua hợp lệ là 1, 2, 3 hoặc 4!");

            boat.CurrentLane = targetLane;
            SyncBoatAliases(board);
            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "STEER_LANE", payloadJson, $"STEERED_LANE_{targetLane}", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, "STEER_LANE", "SUCCESS", $"Đã bẻ lái chuyển sang Làn {targetLane} thành công!", new { boat.CurrentLane });
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
            ?? throw new KeyNotFoundException("Chưa khởi tạo đường đua Thuyền Rồng!");

        var board = JsonSerializer.Deserialize<DragonBoatBoardState>(state.BoardStateJson) ?? new DragonBoatBoardState();
        string teamSide = player.TeamSide ?? "TEAM_A";
        var boat = GetBoatByTeam(board, teamSide);
        var leadingEnemy = GetLeadingEnemyBoat(board, teamSide);

        // 1. Tăng Tốc Nitro (NITRO_BOOST / DRUM_BEAT): 3 nhịp chèo tiếp theo đạt gấp đôi quãng đường (+30m/nhịp)
        if (skillName.Equals("NITRO_BOOST", StringComparison.OrdinalIgnoreCase) ||
            skillName.Equals("DRUM_BEAT", StringComparison.OrdinalIgnoreCase))
        {
            if (boat.ComboRow < 4 && player.CurrentCombo < 4 && player.ActionPoints < 2)
                return new GameActionResult(false, skillName, "COMBO_REQUIRED", "Tăng Tốc Nitro mở khóa khi đạt chuỗi 4 câu trả lời đúng liên tiếp (hoặc tốn 2 Nhịp chèo)!");

            if (boat.ComboRow < 4 && player.CurrentCombo < 4)
                player.ActionPoints -= 2;

            boat.HasDrumBoost = true;
            boat.BoostRemaining = 3;
            SyncBoatAliases(board);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_NITRO_BOOST", payloadJson, "NITRO_3_STROKES_30M", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "🔥 Tăng Tốc Nitro bùng cháy ở đuôi thuyền! 3 nhịp chèo tiếp theo đạt gấp đôi quãng đường (+30m/nhịp)!");
        }

        // 2. Phun Mực Đen / Thủy Lôi (INK_TORPEDO / WATER_SPLASH): Đẩy thuyền dẫn đầu lùi -20m và che mực 6 giây
        if (skillName.Equals("INK_TORPEDO", StringComparison.OrdinalIgnoreCase) ||
            skillName.Equals("WATER_SPLASH", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Phun Mực Đen / Thủy Lôi cần 1 Nhịp chèo!");

            player.ActionPoints -= 1;

            if (leadingEnemy.WindShieldActive)
            {
                leadingEnemy.WindShieldActive = false;
                SyncBoatAliases(board);
                state.BoardStateJson = JsonSerializer.Serialize(board);
                await db.SaveChangesAsync();
                return new GameActionResult(true, skillName, "BLOCKED", $"Thuyền đối phương đã dùng Lá Chắn Gió chặn đứng Thủy Lôi của bạn!");
            }

            leadingEnemy.Distance = Math.Max(0, leadingEnemy.Distance - 20);
            leadingEnemy.ComboRow = 0;
            leadingEnemy.InkBlindUntilUtc = DateTime.UtcNow.AddSeconds(6);
            SyncBoatAliases(board);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_INK_TORPEDO", payloadJson, $"HIT_{leadingEnemy.TeamSide}_-20M_INK_6S", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", $"🦑 Phóng Thủy Lôi & Mực Đen trúng {leadingEnemy.TeamName}! Thuyền địch lùi -20m và bị mực che khuất câu hỏi trong 6 giây!");
        }

        // 3. Lá Chắn Gió (WIND_SHIELD): Lướt qua Xoáy Nước / Đá Ngầm hoặc chặn 1 Thủy Lôi
        if (skillName.Equals("WIND_SHIELD", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Lá Chắn Gió cần 1 Nhịp chèo!");

            player.ActionPoints -= 1;
            boat.WindShieldActive = true;
            SyncBoatAliases(board);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_WIND_SHIELD", payloadJson, "WIND_SHIELD_ACTIVE", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "🛡️ Đã bật Lá Chắn Gió! Sẵn sàng lướt qua Xoáy Nước / Đá Ngầm hoặc chặn đứng 1 quả Thủy Lôi của đối phương!");
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

        var board = JsonSerializer.Deserialize<DragonBoatBoardState>(state.BoardStateJson) ?? new DragonBoatBoardState();
        var boats = new[] { board.BoatA, board.BoatB, board.BoatC, board.BoatD };
        var finishedBoat = boats.FirstOrDefault(b => b.Distance >= 1000);
        bool isFinished = room.Status == "FINISHED" || finishedBoat != null;

        string? winner = finishedBoat?.TeamSide ?? room.WinnerTeam;
        if (isFinished && string.IsNullOrEmpty(winner))
        {
            // Xét theo thứ tự: (1) Quãng đường (số mét) -> (2) Tỷ lệ trả lời đúng -> (3) Thời gian trả lời trung bình
            if (board.BoatA.Distance != board.BoatB.Distance)
                winner = boats.OrderByDescending(b => b.Distance).First().TeamSide;
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

                if (Math.Abs(accA - accB) > 0.001)
                    winner = accA > accB ? "TEAM_A" : "TEAM_B";
                else
                {
                    double avgA = aResps.Count > 0 ? aResps.Average(r => r.ResponseTimeMs ?? 0) : double.MaxValue;
                    double avgB = bResps.Count > 0 ? bResps.Average(r => r.ResponseTimeMs ?? 0) : double.MaxValue;
                    winner = avgA <= avgB ? "TEAM_A" : "TEAM_B";
                }
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
                BoatA_Dist = board.BoatA.Distance,
                BoatB_Dist = board.BoatB.Distance,
                BoatC_Dist = board.BoatC.Distance,
                BoatD_Dist = board.BoatD.Distance
            }
        );
    }

    public override async Task<object> GetClientGameStateAsync(Room room, Guid? requestingPlayerId, ApplicationDbContext db)
    {
        var state = await db.RoomGameStates
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");

        var board = state != null
            ? JsonSerializer.Deserialize<DragonBoatBoardState>(state.BoardStateJson)
            : new DragonBoatBoardState();
        if (board != null) SyncBoatAliases(board);

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
            PlayerRowStrokes = player?.ActionPoints ?? 0,
            PlayerCombo = player?.CurrentCombo ?? 0,
            PlayerTeam = player?.TeamSide ?? "TEAM_A"
        };
    }

    private static void SyncBoatAliases(DragonBoatBoardState board)
    {
        var now = DateTime.UtcNow;
        foreach (var b in new[] { board.BoatA, board.BoatB, board.BoatC, board.BoatD })
        {
            b.NitroStrokesLeft = b.BoostRemaining;
            b.HasWindShield = b.WindShieldActive;
            b.IsInkBlinded = b.InkBlindUntilUtc.HasValue && b.InkBlindUntilUtc.Value > now;
        }
    }

    private static BoatTeamState GetBoatByTeam(DragonBoatBoardState board, string teamSide)
    {
        return teamSide switch
        {
            "TEAM_B" => board.BoatB,
            "TEAM_C" => board.BoatC,
            "TEAM_D" => board.BoatD,
            _ => board.BoatA
        };
    }

    private static BoatTeamState GetLeadingEnemyBoat(DragonBoatBoardState board, string myTeamSide)
    {
        var candidates = new[] { board.BoatA, board.BoatB, board.BoatC, board.BoatD }
            .Where(b => b.TeamSide != myTeamSide)
            .OrderByDescending(b => b.Distance)
            .ToList();

        return candidates.FirstOrDefault() ?? (myTeamSide == "TEAM_A" ? board.BoatB : board.BoatA);
    }
}
