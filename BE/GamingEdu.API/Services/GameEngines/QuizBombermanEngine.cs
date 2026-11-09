using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services.GameEngines;

public class ActiveBomb
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public int R { get; set; }
    public int C { get; set; }
    public int TimerTicks { get; set; } = 3; // Phát nổ sau 4 giây / 3 bước
    public int Range { get; set; } = 2; // Bán kính nổ chữ thập mặc định 2 ô (4 ô khi bật Bom Lửa Dài)
    public Guid OwnerPlayerId { get; set; }
    public string OwnerNickname { get; set; } = string.Empty;
    public string OwnerTeam { get; set; } = "TEAM_A";
}

public class BombermanPlayerState
{
    public Guid PlayerId { get; set; }
    public string Nickname { get; set; } = string.Empty;
    public string TeamSide { get; set; } = "TEAM_A";
    public int R { get; set; } = 1;
    public int C { get; set; } = 1;
    public int SpawnR { get; set; } = 1;
    public int SpawnC { get; set; } = 1;
    public int Hp { get; set; } = 5; // 5 Tim (HP) mỗi đội
    public int MoveSteps { get; set; } = 3; // Gói hành động: +3 Bước Di Chuyển mỗi câu trả lời đúng
    public int BombRange { get; set; } = 2; // Bán kính 2 ô (tăng lên 4 ô với Bom Lửa Dài)
    public bool ShieldActive { get; set; } = false;
    public bool IsEliminated { get; set; } = false;
    public int BricksDestroyed { get; set; } = 0;
    public int EnemyHits { get; set; } = 0;
}

public class BombermanBoardState
{
    // Mê cung lưới ô vuông 15x15
    public int Size { get; set; } = 15;
    public int TeamAHp { get; set; } = 5;
    public int TeamBHp { get; set; } = 5;
    public string[][] Grid { get; set; } = []; // 'W' = Tường Sắt cố định, 'B' = Tường Gạch (40%), '.' = Đường đi trống
    public List<ActiveBomb> Bombs { get; set; } = [];
    public List<BombermanPlayerState> Players { get; set; } = [];
    public List<string> ExplosionEvents { get; set; } = [];
}

public class QuizBombermanEngine : BaseGameModeEngine
{
    public override string GameType => "QUIZ_BOMBERMAN";

    public override async Task InitializeRoomAsync(Room room, List<RoomPlayer> players, ApplicationDbContext db)
    {
        int size = 15;
        var grid = new string[size][];

        for (int r = 0; r < size; r++)
        {
            grid[r] = new string[size];
            for (int c = 0; c < size; c++)
            {
                // Viền ngoài và các tọa độ chẵn là Tường Sắt cố định 'W'
                if (r == 0 || r == size - 1 || c == 0 || c == size - 1 || (r % 2 == 0 && c % 2 == 0))
                {
                    grid[r][c] = "W";
                }
                else
                {
                    // Tránh góc xuất phát Đội A (1,1) và Đội B (size-2, size-2)
                    bool isCorner = (r <= 2 && c <= 2) || (r >= size - 3 && c >= size - 3) ||
                                    (r <= 2 && c >= size - 3) || (r >= size - 3 && c <= 2);
                    // Tường Gạch đặt ngẫu nhiên 40% bản đồ
                    if (!isCorner && Random.Shared.Next(100) < 40)
                    {
                        grid[r][c] = "B";
                    }
                    else
                    {
                        grid[r][c] = ".";
                    }
                }
            }
        }

        // Đội A xuất phát ở góc trên bên trái (1,1), Đội B xuất phát ở góc dưới bên phải (13,13 - góc trong của lưới 15x15)
        var bPlayers = new List<BombermanPlayerState>();
        for (int i = 0; i < players.Count; i++)
        {
            var p = players[i];
            bool isTeamB = p.TeamSide == "TEAM_B" || (players.Count > 1 && i % 2 == 1);
            int sr = isTeamB ? size - 2 : 1;
            int sc = isTeamB ? size - 2 : 1;

            bPlayers.Add(new BombermanPlayerState
            {
                PlayerId = p.Id,
                Nickname = p.Nickname,
                TeamSide = isTeamB ? "TEAM_B" : "TEAM_A",
                R = sr,
                C = sc,
                SpawnR = sr,
                SpawnC = sc,
                Hp = 5,
                MoveSteps = 3,
                BombRange = 2,
                ShieldActive = false,
                IsEliminated = false
            });
            p.ActionPoints = 1; // 1 quả bom hẹn giờ khởi đầu
        }

        var board = new BombermanBoardState
        {
            Size = size,
            TeamAHp = 5,
            TeamBHp = 5,
            Grid = grid,
            Bombs = [],
            Players = bPlayers,
            ExplosionEvents = []
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
                HpOrProgress = 5,
                BoardStateJson = JsonSerializer.Serialize(board),
                SkillsStateJson = JsonSerializer.Serialize(new { LongFireAvailable = true, KickAvailable = true, ShieldAvailable = true }),
                UpdatedAt = DateTime.UtcNow
            };
            db.RoomGameStates.Add(state);
        }
        else
        {
            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;
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
        if (res.Success && res.IsCorrect)
        {
            // Trả lời đúng 1 câu hỏi = Nhận gói hành động gồm 3 Bước Di Chuyển + 1 Quả Bom Hẹn Giờ
            var state = await db.RoomGameStates
                .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");
            if (state != null)
            {
                var board = JsonSerializer.Deserialize<BombermanBoardState>(state.BoardStateJson) ?? new BombermanBoardState();
                var bp = EnsurePlayerInBoard(board, player);
                bp.MoveSteps += 3;
                if (player.CurrentCombo >= 3)
                {
                    bp.BombRange = 4; // Mở khóa Bom Lửa Dài ở Combo 3
                }
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
            return new GameActionResult(false, actionType, "REJECTED", "Bạn đã bị loại khỏi đấu trường Đặt Bom!");

        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP")
            ?? throw new KeyNotFoundException("Chưa khởi tạo sàn đấu Đặt Bom 15×15!");

        var board = JsonSerializer.Deserialize<BombermanBoardState>(state.BoardStateJson) ?? new BombermanBoardState();
        var bp = EnsurePlayerInBoard(board, player);
        if (bp.IsEliminated)
            return new GameActionResult(false, actionType, "ELIMINATED", "Nhân vật đã hết 5 Tim (HP)!");

        // 1. Di chuyển (MOVE_PLAYER / MOVE_STEP)
        if (actionType.Equals("MOVE_PLAYER", StringComparison.OrdinalIgnoreCase) ||
            actionType.Equals("MOVE_STEP", StringComparison.OrdinalIgnoreCase))
        {
            if (bp.MoveSteps < 1)
                return new GameActionResult(false, actionType, "NO_STEPS", "Hết Bước Di Chuyển! Trả lời đúng câu hỏi để nhận gói +3 Bước Di Chuyển + 1 Quả Bom Hẹn Giờ.");

            using var doc = JsonDocument.Parse(payloadJson);
            string dir = doc.RootElement.GetProperty("direction").GetString()?.ToUpper() ?? "UP";

            int dr = dir switch { "UP" => -1, "DOWN" => 1, _ => 0 };
            int dc = dir switch { "LEFT" => -1, "RIGHT" => 1, _ => 0 };

            int nr = bp.R + dr;
            int nc = bp.C + dc;

            if (nr < 0 || nr >= board.Size || nc < 0 || nc >= board.Size)
                return new GameActionResult(false, actionType, "OUT_OF_BOUNDS", "Không thể đi xuyên tường biên!");

            string tile = board.Grid[nr][nc];
            if (tile == "W" || tile == "B")
                return new GameActionResult(false, actionType, "BLOCKED", "Bị cản bởi Tường Sắt hoặc Tường Gạch!");

            bool hasBomb = board.Bombs.Any(b => b.R == nr && b.C == nc);
            if (hasBomb)
                return new GameActionResult(false, actionType, "BOMB_BLOCK", "Ô này đang có quả bom hẹn giờ chắn đường!");

            bp.R = nr;
            bp.C = nc;
            if (bp.MoveSteps > 0) bp.MoveSteps--;

            await TickBombsAsync(board, room, db);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, actionType, payloadJson, $"MOVED_{dir}_TO_({nr},{nc})", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, actionType, "SUCCESS", $"Di chuyển sang ({nr}, {nc}) (Còn {bp.MoveSteps} bước)", new { bp.R, bp.C, bp.MoveSteps });
        }

        // 2. Đặt bom hẹn giờ (PLANT_BOMB)
        if (actionType.Equals("PLANT_BOMB", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, actionType, "NO_BOMBS", "Hết Quả Bom Hẹn Giờ! Trả lời đúng câu hỏi để nhận gói 3 Bước Di Chuyển + 1 Quả Bom.");

            bool bombHere = board.Bombs.Any(b => b.R == bp.R && b.C == bp.C);
            if (bombHere)
                return new GameActionResult(false, actionType, "ALREADY_PLANTED", "Ô này đã có quả bom hẹn giờ rồi!");

            player.ActionPoints -= 1;
            var newBomb = new ActiveBomb
            {
                R = bp.R,
                C = bp.C,
                TimerTicks = 3,
                Range = bp.BombRange,
                OwnerPlayerId = player.Id,
                OwnerNickname = player.Nickname,
                OwnerTeam = bp.TeamSide
            };
            board.Bombs.Add(newBomb);

            await TickBombsAsync(board, room, db);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, actionType, payloadJson, $"PLANTED_BOMB_AT_({bp.R},{bp.C})_RANGE_{newBomb.Range}", db);
            await db.SaveChangesAsync();

            return new GameActionResult(
                true,
                actionType,
                "SUCCESS",
                $"Đã đặt Bom Hẹn Giờ (bán kính chữ thập {newBomb.Range} ô) tại ({bp.R}, {bp.C})! Hãy lùi ra sau Tường Sắt!",
                new { bp.R, bp.C, newBomb.Range },
                MatchEnded: room.Status == "FINISHED",
                WinnerTeam: room.WinnerTeam
            );
        }

        // 3. Kích nổ bom hẹn giờ khi hết 4 giây (DETONATE_BOMB)
        if (actionType.Equals("DETONATE_BOMB", StringComparison.OrdinalIgnoreCase))
        {
            foreach (var b in board.Bombs)
            {
                b.TimerTicks = 1;
            }
            await TickBombsAsync(board, room, db);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return new GameActionResult(
                true,
                actionType,
                "SUCCESS",
                "💥 Bom Hẹn Giờ đã phát nổ theo hình chữ thập!",
                new { board.TeamAHp, board.TeamBHp, bp.Hp },
                MatchEnded: room.Status == "FINISHED",
                WinnerTeam: room.WinnerTeam
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
            ?? throw new KeyNotFoundException("Chưa khởi tạo sàn đấu Đặt Bom 15×15!");

        var board = JsonSerializer.Deserialize<BombermanBoardState>(state.BoardStateJson) ?? new BombermanBoardState();
        var bp = EnsurePlayerInBoard(board, player);

        // 1. Bom Lửa Dài (LONG_FIRE_BOMB - Mở khóa ở Combo 3): Tăng bán kính tia lửa chữ thập từ 2 ô lên 4 ô
        if (skillName.Equals("LONG_FIRE_BOMB", StringComparison.OrdinalIgnoreCase))
        {
            if (player.CurrentCombo < 3 && player.MaxCombo < 3 && player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "COMBO_REQUIRED", "Bom Lửa Dài mở khóa ở Combo 3 câu đúng (hoặc tốn 1 lượt đặt bom)!");

            if (player.CurrentCombo < 3 && player.ActionPoints >= 1)
                player.ActionPoints -= 1;

            bp.BombRange = 4;

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_LONG_FIRE_BOMB", payloadJson, "RANGE_UP_TO_4", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "🔥 Đã kích hoạt Bom Lửa Dài! Bán kính tia lửa chữ thập tăng từ 2 ô lên 4 ô!");
        }

        // 2. Khiên Chống Nổ (SHIELD): Đứng trong vùng tia lửa bom không bị mất Tim và không bị trừ điểm (1 lần)
        if (skillName.Equals("SHIELD", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Kỹ năng Khiên Chống Nổ cần 1 lượt đặt bom!");

            player.ActionPoints -= 1;
            bp.ShieldActive = true;

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_SHIELD", payloadJson, "SHIELD_EQUIPPED", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "🛡️ Đã bật Khiên Chống Nổ! Bảo vệ nhân vật khỏi mất Tim và trừ điểm trong 1 lần trúng tia lửa bom.");
        }

        // 3. Kỹ năng Đá Bom (KICK_BOMB): Đá văng quả bom sát cạnh trượt ngược lại 4 ô
        if (skillName.Equals("KICK_BOMB", StringComparison.OrdinalIgnoreCase))
        {
            using var doc = JsonDocument.Parse(payloadJson);
            string dir = doc.RootElement.GetProperty("direction").GetString()?.ToUpper() ?? "UP";
            int dr = dir switch { "UP" => -1, "DOWN" => 1, _ => 0 };
            int dc = dir switch { "LEFT" => -1, "RIGHT" => 1, _ => 0 };

            var adjacentBomb = board.Bombs.FirstOrDefault(b =>
                (b.R == bp.R + dr && b.C == bp.C + dc) ||
                (Math.Abs(b.R - bp.R) + Math.Abs(b.C - bp.C) <= 1));

            if (adjacentBomb == null)
                return new GameActionResult(false, skillName, "NO_BOMB", "Không có quả bom nào ngay sát cạnh nhân vật của bạn để đá!");

            // Đá văng quả bom trượt ngược lại 4 ô theo hướng chỉ định
            int finalR = adjacentBomb.R;
            int finalC = adjacentBomb.C;
            for (int step = 1; step <= 4; step++)
            {
                int testR = adjacentBomb.R + (dr * step);
                int testC = adjacentBomb.C + (dc * step);
                if (testR < 0 || testR >= board.Size || testC < 0 || testC >= board.Size) break;
                if (board.Grid[testR][testC] != ".") break;
                finalR = testR;
                finalC = testC;
            }

            adjacentBomb.R = finalR;
            adjacentBomb.C = finalC;

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_KICK_BOMB", payloadJson, $"KICKED_BOMB_4_TILES_TO_({finalR},{finalC})", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", $"👟 Đã Đá Bom trượt văng 4 ô về phía ({finalR}, {finalC})!");
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

        var board = JsonSerializer.Deserialize<BombermanBoardState>(state.BoardStateJson) ?? new BombermanBoardState();
        var alivePlayers = board.Players.Where(p => !p.IsEliminated && p.Hp > 0).ToList();

        bool isFinished = room.Status == "FINISHED" || board.TeamAHp <= 0 || board.TeamBHp <= 0 || (board.Players.Count > 1 && alivePlayers.Count <= 1);
        string? winner = room.WinnerTeam;

        if (string.IsNullOrEmpty(winner) && isFinished)
        {
            var roomPlayers = await db.RoomPlayers.AsNoTracking().Where(rp => rp.RoomId == room.Id).ToListAsync();
            var scoreMap = roomPlayers.ToDictionary(rp => rp.Id, rp => rp.TotalScore);

            // Xét theo thứ tự ưu tiên: (1) Số Tim (HP) còn lại -> (2) Tổng số lần đặt bom trúng đối phương -> (3) Số Tường gạch đã phá hủy -> (4) Điểm trả lời câu hỏi
            var ranked = board.Players
                .OrderByDescending(p => p.Hp)
                .ThenByDescending(p => p.EnemyHits)
                .ThenByDescending(p => p.BricksDestroyed)
                .ThenByDescending(p => scoreMap.TryGetValue(p.PlayerId, out int s) ? s : 0)
                .ToList();
            winner = ranked.FirstOrDefault()?.Nickname ?? (board.TeamAHp >= board.TeamBHp ? "TEAM_A" : "TEAM_B");
        }

        return new GameMatchStatus(
            Status: isFinished ? "FINISHED" : room.Status,
            CurrentSlideIndex: room.CurrentSlideIndex,
            TotalSlides: 0,
            IsFinished: isFinished,
            Winner: winner,
            Summary: new
            {
                board.TeamAHp,
                board.TeamBHp,
                AliveCount = alivePlayers.Count,
                TotalPlayers = board.Players.Count
            }
        );
    }

    public override async Task<object> GetClientGameStateAsync(Room room, Guid? requestingPlayerId, ApplicationDbContext db)
    {
        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");

        var board = (state != null
            ? JsonSerializer.Deserialize<BombermanBoardState>(state.BoardStateJson)
            : null) ?? new BombermanBoardState();

        var player = requestingPlayerId.HasValue
            ? await db.RoomPlayers.AsNoTracking().FirstOrDefaultAsync(p => p.Id == requestingPlayerId.Value)
            : null;

        BombermanPlayerState? bp = null;
        if (player != null)
        {
            int prevCount = board.Players.Count;
            bp = EnsurePlayerInBoard(board, player);
            if (state != null && board.Players.Count != prevCount)
            {
                state.BoardStateJson = JsonSerializer.Serialize(board);
                state.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }
        }
        else if (requestingPlayerId.HasValue)
        {
            bp = board.Players.FirstOrDefault(p => p.PlayerId == requestingPlayerId.Value);
        }

        return new
        {
            GameType,
            RoomId = room.Id,
            PinCode = room.PinCode,
            Status = room.Status,
            Board = board,
            PlayerBombs = player?.ActionPoints ?? 0,
            PlayerMoveSteps = bp?.MoveSteps ?? 3,
            PlayerHp = bp?.Hp ?? 5,
            PlayerBombRange = bp?.BombRange ?? 2,
            PlayerCombo = player?.CurrentCombo ?? 0,
            ShieldActive = bp?.ShieldActive ?? false,
            IsEliminated = bp?.IsEliminated ?? false
        };
    }

    private static BombermanPlayerState EnsurePlayerInBoard(BombermanBoardState board, RoomPlayer player)
    {
        var existing = board.Players.FirstOrDefault(p => p.PlayerId == player.Id);
        if (existing != null) return existing;

        int size = board.Size > 0 ? board.Size : 15;
        bool isTeamB = player.TeamSide == "TEAM_B" || (board.Players.Count % 2 == 1);
        int sr = isTeamB ? size - 2 : 1;
        int sc = isTeamB ? size - 2 : 1;

        var newBp = new BombermanPlayerState
        {
            PlayerId = player.Id,
            Nickname = player.Nickname,
            TeamSide = isTeamB ? "TEAM_B" : "TEAM_A",
            R = sr,
            C = sc,
            SpawnR = sr,
            SpawnC = sc,
            Hp = 5,
            MoveSteps = 3,
            BombRange = 2,
            ShieldActive = false,
            IsEliminated = false
        };
        board.Players.Add(newBp);
        return newBp;
    }

    private static async Task TickBombsAsync(BombermanBoardState board, Room room, ApplicationDbContext db)
    {
        var explodedBombs = new List<ActiveBomb>();

        foreach (var bomb in board.Bombs)
        {
            bomb.TimerTicks--;
            if (bomb.TimerTicks <= 0)
            {
                explodedBombs.Add(bomb);
            }
        }

        foreach (var bomb in explodedBombs)
        {
            board.Bombs.Remove(bomb);
            var flameCells = new List<(int r, int c)> { (bomb.R, bomb.C) };

            int[][] dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            var ownerState = board.Players.FirstOrDefault(x => x.PlayerId == bomb.OwnerPlayerId);
            var ownerDb = await db.RoomPlayers.FirstOrDefaultAsync(p => p.Id == bomb.OwnerPlayerId);

            foreach (var d in dirs)
            {
                for (int step = 1; step <= bomb.Range; step++)
                {
                    int nr = bomb.R + (d[0] * step);
                    int nc = bomb.C + (d[1] * step);

                    if (nr < 0 || nr >= board.Size || nc < 0 || nc >= board.Size) break;

                    string cell = board.Grid[nr][nc];
                    if (cell == "W")
                    {
                        break; // Chạm Tường Sắt cố định -> Tia lửa dừng lại
                    }

                    flameCells.Add((nr, nc));

                    if (cell == "B")
                    {
                        // Trúng Tường Gạch: Phá hủy tường gạch, cộng +50 Điểm cho người đặt bom và mở thông đường đi
                        board.Grid[nr][nc] = ".";
                        if (ownerState != null) ownerState.BricksDestroyed++;
                        if (ownerDb != null) ownerDb.TotalScore += 50;
                        break;
                    }
                }
            }

            // Kiểm tra nhân vật đứng trong vùng tia lửa chữ thập
            foreach (var p in board.Players.Where(p => !p.IsEliminated))
            {
                bool inFlame = flameCells.Any(fc => fc.r == p.R && fc.c == p.C);
                if (inFlame)
                {
                    if (p.ShieldActive)
                    {
                        // Khiên Chống Nổ bảo vệ không mất Tim và không bị trừ điểm (hiệu lực 1 lần)
                        p.ShieldActive = false;
                        board.ExplosionEvents.Add($"🛡️ {p.Nickname} được Khiên Chống Nổ bảo vệ an toàn!");
                    }
                    else
                    {
                        // Trừ 1 Tim (HP), cướp 200 Điểm và làm nhân vật văng về góc xuất phát
                        p.Hp = Math.Max(0, p.Hp - 1);
                        if (p.TeamSide == "TEAM_B") board.TeamBHp = Math.Max(0, board.TeamBHp - 1);
                        else board.TeamAHp = Math.Max(0, board.TeamAHp - 1);

                        p.R = p.SpawnR;
                        p.C = p.SpawnC;

                        if (ownerState != null && p.PlayerId != bomb.OwnerPlayerId)
                        {
                            ownerState.EnemyHits++;
                        }

                        var victimDb = await db.RoomPlayers.FirstOrDefaultAsync(rp => rp.Id == p.PlayerId);
                        if (victimDb != null && p.PlayerId != bomb.OwnerPlayerId)
                        {
                            victimDb.TotalScore = Math.Max(0, victimDb.TotalScore - 200);
                            if (ownerDb != null) ownerDb.TotalScore += 200;
                        }

                        board.ExplosionEvents.Add($"💥 {p.Nickname} trúng bom chữ thập (-1 Tim, bị cướp 200 Điểm, văng về góc xuất phát)! Còn {p.Hp}/5 Tim.");
                        if (p.Hp <= 0 || board.TeamAHp <= 0 || board.TeamBHp <= 0)
                        {
                            p.IsEliminated = true;
                            board.ExplosionEvents.Add($"☠️ Đội của {p.Nickname} đã mất hết 5 Tim!");
                            if (board.TeamAHp <= 0 || board.TeamBHp <= 0)
                            {
                                room.Status = "FINISHED";
                                room.WinnerTeam = board.TeamAHp <= 0 ? "TEAM_B" : "TEAM_A";
                            }
                        }
                    }
                }
            }
        }
    }
}
