using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services.GameEngines;

public class HexCell
{
    public int R { get; set; }
    public int C { get; set; }
    public string Owner { get; set; } = "NONE"; // NONE | TEAM_A | TEAM_B
    public bool Fortified { get; set; } = false;
    public int FortifiedTurns { get; set; } = 0;
    public bool IsBase { get; set; } = false;
}

public class HexBoardState
{
    public int Rows { get; set; } = 11;
    public int Cols { get; set; } = 11;
    public List<HexCell> Cells { get; set; } = [];
    public int TeamACells { get; set; } = 3;
    public int TeamBCells { get; set; } = 3;
    public int TeamAStolen { get; set; } = 0;
    public int TeamBStolen { get; set; } = 0;
    public int TeamAEnergy { get; set; } = 0;
    public int TeamBEnergy { get; set; } = 0;
}

public class HexConquestEngine : BaseGameModeEngine
{
    public override string GameType => "HEX_CONQUEST";

    public override async Task InitializeRoomAsync(Room room, List<RoomPlayer> players, ApplicationDbContext db)
    {
        // Cấu hình kích thước lưới theo số người chơi: 11x11 cho đấu 1v1 / nhóm nhỏ, 17x17 cho đấu Đội nhóm lớn (>= 12 người)
        int gridSize = players.Count >= 12 ? 17 : 11;
        var board = new HexBoardState { Rows = gridSize, Cols = gridSize };

        for (int r = 0; r < gridSize; r++)
        {
            for (int c = 0; c < gridSize; c++)
            {
                board.Cells.Add(new HexCell { R = r, C = c, Owner = "NONE", Fortified = false, FortifiedTurns = 0, IsBase = false });
            }
        }

        // Đội A khởi đầu tại cụm 3 ô lục giác ở góc Tây Bắc
        var teamABaseCoords = new (int r, int c)[] { (0, 0), (0, 1), (1, 0) };
        foreach (var (r, c) in teamABaseCoords)
        {
            var cell = board.Cells.First(x => x.R == r && x.C == c);
            cell.Owner = "TEAM_A";
            cell.Fortified = true;
            cell.FortifiedTurns = 999;
            cell.IsBase = true;
        }

        // Đội B khởi đầu tại cụm 3 ô lục giác ở góc Đông Nam
        var teamBBaseCoords = new (int r, int c)[]
        {
            (gridSize - 1, gridSize - 1),
            (gridSize - 1, gridSize - 2),
            (gridSize - 2, gridSize - 1)
        };
        foreach (var (r, c) in teamBBaseCoords)
        {
            var cell = board.Cells.First(x => x.R == r && x.C == c);
            cell.Owner = "TEAM_B";
            cell.Fortified = true;
            cell.FortifiedTurns = 999;
            cell.IsBase = true;
        }

        board.TeamACells = 3;
        board.TeamBCells = 3;

        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");

        if (state == null)
        {
            state = new RoomGameState
            {
                Id = Guid.NewGuid(),
                RoomId = room.Id,
                TeamOrGroup = "GLOBAL_MAP",
                HpOrProgress = 50,
                BoardStateJson = JsonSerializer.Serialize(board),
                SkillsStateJson = JsonSerializer.Serialize(new { TeamASkills = 3, TeamBSkills = 3 }),
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
            // Cộng +25 Năng lượng cho đội để mở khóa Bom Màu (100 Năng lượng)
            var state = await db.RoomGameStates
                .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");
            if (state != null)
            {
                var board = JsonSerializer.Deserialize<HexBoardState>(state.BoardStateJson) ?? new HexBoardState();
                if ((player.TeamSide ?? "TEAM_A") == "TEAM_B")
                    board.TeamBEnergy = Math.Min(200, board.TeamBEnergy + 25);
                else
                    board.TeamAEnergy = Math.Min(200, board.TeamAEnergy + 25);

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
            return new GameActionResult(false, actionType, "REJECTED", "Người chơi đang bị cách ly/choáng!");

        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP")
            ?? throw new KeyNotFoundException("Chưa khởi tạo bản đồ Hex!");

        var board = JsonSerializer.Deserialize<HexBoardState>(state.BoardStateJson) ?? new HexBoardState();
        string teamSide = player.TeamSide ?? "TEAM_A";
        string enemySide = teamSide == "TEAM_A" ? "TEAM_B" : "TEAM_A";

        if (actionType.Equals("CLAIM_HEX", StringComparison.OrdinalIgnoreCase))
        {
            using var doc = JsonDocument.Parse(payloadJson);
            int r = doc.RootElement.GetProperty("r").GetInt32();
            int c = doc.RootElement.GetProperty("c").GetInt32();

            if (player.ActionPoints < 1)
                return new GameActionResult(false, actionType, "NOT_ENOUGH_POINTS", "Không đủ Lượt Chiếm Đất! Cần trả lời đúng câu hỏi để nhận +1 lượt.");

            if (r < 0 || r >= board.Rows || c < 0 || c >= board.Cols)
                return new GameActionResult(false, actionType, "OUT_OF_BOUNDS", "Tọa độ nằm ngoài bàn cờ Hex!");

            var targetCell = board.Cells.FirstOrDefault(cell => cell.R == r && cell.C == c);
            if (targetCell == null)
                return new GameActionResult(false, actionType, "NOT_FOUND", "Không tìm thấy ô lục giác!");

            if (targetCell.Owner == teamSide)
                return new GameActionResult(false, actionType, "ALREADY_OWNED", "Đội của bạn đã sở hữu ô này rồi!");

            if (targetCell.IsBase)
                return new GameActionResult(false, actionType, "BASE_PROTECTED", "Không thể chiếm trực tiếp ô Căn cứ gốc của đối phương!");

            if (targetCell.Fortified && targetCell.Owner != "NONE" && targetCell.FortifiedTurns > 0)
                return new GameActionResult(false, actionType, "FORTIFIED", $"Ô này đang có Tường Thành bảo vệ trong {targetCell.FortifiedTurns} lượt nữa!");

            // Kiểm tra kề cạnh với lãnh thổ hiện tại của đội mình
            bool isAdjacent = IsAdjacentToTeam(board, r, c, teamSide);
            if (!isAdjacent)
                return new GameActionResult(false, actionType, "NOT_ADJACENT", "Ô lục giác chọn phải nằm kề cạnh với lãnh thổ hiện tại của đội bạn!");

            // Trừ 1 Lượt Chiếm Đất
            player.ActionPoints -= 1;

            // Giảm thời hạn Tường Thành trên bản đồ sau 1 lượt
            TickFortifications(board);

            string actionFeedback;
            int enclosedCount = 0;

            if (targetCell.Owner == enemySide)
            {
                // Cơ chế 2 lần click: Lần 1 hạ cấp ô đối phương về Trung lập (NONE)
                targetCell.Owner = "NONE";
                targetCell.Fortified = false;
                targetCell.FortifiedTurns = 0;
                if (teamSide == "TEAM_A") board.TeamAStolen++;
                else board.TeamBStolen++;

                actionFeedback = $"Đã công phá ô ({r}, {c}) của đối phương về trạng thái Trung Lập! Click thêm 1 lần nữa để chiếm hẳn.";
            }
            else
            {
                // Nếu chọn Ô Trung lập: Đổi ngay sang màu đội mình
                targetCell.Owner = teamSide;
                enclosedCount = ApplyBfsEnclose(board, teamSide);
                actionFeedback = $"Đã chiếm thành công ô ({r}, {c})!" + (enclosedCount > 0 ? $" Vây Thành Đổi Màu đồng hóa thêm {enclosedCount} ô!" : "");
            }

            // Cập nhật lại số ô mỗi đội
            board.TeamACells = board.Cells.Count(x => x.Owner == "TEAM_A");
            board.TeamBCells = board.Cells.Count(x => x.Owner == "TEAM_B");

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.HpOrProgress = (int)Math.Round((double)board.TeamACells / board.Cells.Count * 100);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, actionType, payloadJson, $"CLAIMED_({r},{c})_ENCLOSED_{enclosedCount}", db);

            // Điều kiện thắng tuyệt đối: Chiếm trên 70% tổng số ô lục giác
            int winThreshold = (int)Math.Floor(board.Cells.Count * 0.70) + 1;
            bool matchEnded = false;
            string? winner = null;
            if (board.TeamACells >= winThreshold) { matchEnded = true; winner = "TEAM_A"; }
            else if (board.TeamBCells >= winThreshold) { matchEnded = true; winner = "TEAM_B"; }

            if (matchEnded)
            {
                room.Status = "FINISHED";
                room.WinnerTeam = winner;
            }

            await db.SaveChangesAsync();

            return new GameActionResult(
                Success: true,
                ActionType: actionType,
                Result: "SUCCESS",
                Message: actionFeedback,
                Data: new { r, c, enclosedCount, board.TeamACells, board.TeamBCells, WinThreshold = winThreshold },
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
            ?? throw new KeyNotFoundException("Chưa khởi tạo bản đồ Hex!");

        var board = JsonSerializer.Deserialize<HexBoardState>(state.BoardStateJson) ?? new HexBoardState();
        string teamSide = player.TeamSide ?? "TEAM_A";

        // 1. Kỹ năng Tường Thành (Mở khóa ở Combo 2): Bảo vệ ô biên giới trong 2 lượt tiếp theo
        if (skillName.Equals("FORTIFY_HEX", StringComparison.OrdinalIgnoreCase))
        {
            if (player.CurrentCombo < 2 && player.MaxCombo < 2 && player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "COMBO_REQUIRED", "Kỹ năng Tường Thành yêu cầu đạt Combo 2 câu đúng liên tiếp (hoặc 1 Lượt chiếm đất)!");

            using var doc = JsonDocument.Parse(payloadJson);
            int r = doc.RootElement.GetProperty("r").GetInt32();
            int c = doc.RootElement.GetProperty("c").GetInt32();

            var cell = board.Cells.FirstOrDefault(x => x.R == r && x.C == c && x.Owner == teamSide);
            if (cell == null)
                return new GameActionResult(false, skillName, "INVALID_TARGET", "Chỉ có thể dựng Tường Thành trên ô lục giác thuộc sở hữu của đội bạn!");

            if (player.CurrentCombo < 2 && player.ActionPoints >= 1)
                player.ActionPoints -= 1;

            cell.Fortified = true;
            cell.FortifiedTurns = 2;

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;
            await RecordActionAsync(room, player, "SKILL_FORTIFY_HEX", payloadJson, $"FORTIFIED_({r},{c})_2_TURNS", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", $"Đã dựng Tường Thành bảo vệ ô ({r}, {c}) trong 2 lượt tiếp theo!");
        }

        // 2. Kỹ năng Nhảy Dù Đột Kích (Mở khóa ở Combo 3): Chiếm ngay 1 ô Trung lập bất kỳ không cần kề cạnh
        if (skillName.Equals("PARACHUTE_DROP", StringComparison.OrdinalIgnoreCase))
        {
            if (player.CurrentCombo < 3 && player.MaxCombo < 3 && player.ActionPoints < 2)
                return new GameActionResult(false, skillName, "COMBO_REQUIRED", "Nhảy Dù Đột Kích yêu cầu đạt Combo 3 câu đúng (hoặc 2 Lượt chiếm đất)!");

            using var doc = JsonDocument.Parse(payloadJson);
            int r = doc.RootElement.GetProperty("r").GetInt32();
            int c = doc.RootElement.GetProperty("c").GetInt32();

            var targetCell = board.Cells.FirstOrDefault(x => x.R == r && x.C == c);
            if (targetCell == null || targetCell.Owner != "NONE")
                return new GameActionResult(false, skillName, "INVALID_TARGET", "Nhảy Dù Đột Kích chỉ có thể đáp xuống một ô Trung Lập (Màu xám) bất kỳ!");

            if (player.CurrentCombo < 3 && player.ActionPoints >= 2)
                player.ActionPoints -= 2;
            else if (player.ActionPoints >= 1)
                player.ActionPoints -= 1;

            targetCell.Owner = teamSide;
            int enclosed = ApplyBfsEnclose(board, teamSide);
            board.TeamACells = board.Cells.Count(x => x.Owner == "TEAM_A");
            board.TeamBCells = board.Cells.Count(x => x.Owner == "TEAM_B");

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;
            await RecordActionAsync(room, player, "SKILL_PARACHUTE_DROP", payloadJson, $"PARACHUTE_({r},{c})_ENCLOSED_{enclosed}", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", $"Nhảy Dù Đột Kích thành công xuống ô ({r}, {c}) không cần kề cạnh!");
        }

        // 3. Kỹ năng Bom Màu (Mở khóa khi đủ 100 Năng lượng hoặc 2 Lượt): Nhuộm màu ô tâm + 3 ô liền kề
        if (skillName.Equals("COLOR_BOMB", StringComparison.OrdinalIgnoreCase) ||
            skillName.Equals("EXPAND_BURST", StringComparison.OrdinalIgnoreCase))
        {
            int currentEnergy = teamSide == "TEAM_B" ? board.TeamBEnergy : board.TeamAEnergy;
            if (currentEnergy < 100 && player.ActionPoints < 2)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_ENERGY", "Bom Màu cần đủ 100 Năng lượng đội (hoặc 2 Lượt chiếm đất)!");

            int centerR = board.Rows / 2;
            int centerC = board.Cols / 2;
            if (!string.IsNullOrWhiteSpace(payloadJson) && payloadJson != "{}")
            {
                using var doc = JsonDocument.Parse(payloadJson);
                if (doc.RootElement.TryGetProperty("r", out var rProp)) centerR = rProp.GetInt32();
                if (doc.RootElement.TryGetProperty("c", out var cProp)) centerC = cProp.GetInt32();
            }
            else
            {
                var frontCell = board.Cells.FirstOrDefault(c => c.Owner != teamSide && !c.IsBase && IsAdjacentToTeam(board, c.R, c.C, teamSide));
                if (frontCell != null) { centerR = frontCell.R; centerC = frontCell.C; }
            }

            if (currentEnergy >= 100)
            {
                if (teamSide == "TEAM_B") board.TeamBEnergy -= 100;
                else board.TeamAEnergy -= 100;
            }
            else
            {
                player.ActionPoints -= 2;
            }

            var targetCoords = new List<(int r, int c)> { (centerR, centerC) };
            targetCoords.AddRange(GetHexNeighbors(centerR, centerC, board.Rows, board.Cols).Take(3));

            int paintedCount = 0;
            foreach (var (tr, tc) in targetCoords)
            {
                var cell = board.Cells.FirstOrDefault(x => x.R == tr && x.C == tc);
                if (cell != null && !cell.IsBase && !(cell.Fortified && cell.Owner != teamSide && cell.FortifiedTurns > 0))
                {
                    if (cell.Owner != "NONE" && cell.Owner != teamSide)
                    {
                        if (teamSide == "TEAM_A") board.TeamAStolen++;
                        else board.TeamBStolen++;
                    }
                    cell.Owner = teamSide;
                    paintedCount++;
                }
            }

            int enclosed = ApplyBfsEnclose(board, teamSide);
            board.TeamACells = board.Cells.Count(x => x.Owner == "TEAM_A");
            board.TeamBCells = board.Cells.Count(x => x.Owner == "TEAM_B");

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;
            await RecordActionAsync(room, player, "SKILL_COLOR_BOMB", payloadJson, $"PAINTED_{paintedCount}_ENCLOSED_{enclosed}", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", $"Bom Màu phát nổ tại ({centerR}, {centerC}), nhuộm màu đồng loạt {paintedCount} ô lục giác!");
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

        var board = JsonSerializer.Deserialize<HexBoardState>(state.BoardStateJson) ?? new HexBoardState();
        int winThreshold = (int)Math.Floor(board.Cells.Count * 0.70) + 1;
        bool isFinished = room.Status == "FINISHED" || board.TeamACells >= winThreshold || board.TeamBCells >= winThreshold;

        string? winner = room.WinnerTeam;
        if (board.TeamACells >= winThreshold) winner = "TEAM_A";
        else if (board.TeamBCells >= winThreshold) winner = "TEAM_B";
        else if (isFinished && string.IsNullOrEmpty(winner))
        {
            // Xét theo thứ tự ưu tiên: (1) Tổng số ô -> (2) Số ô cướp được từ địch -> (3) Tỷ lệ trả lời đúng của đội -> (4) Tổng thời gian trả lời hợp lệ
            if (board.TeamACells != board.TeamBCells)
                winner = board.TeamACells > board.TeamBCells ? "TEAM_A" : "TEAM_B";
            else if (board.TeamAStolen != board.TeamBStolen)
                winner = board.TeamAStolen > board.TeamBStolen ? "TEAM_A" : "TEAM_B";
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
                    int timeA = aResps.Where(r => r.IsCorrect == true).Sum(r => r.ResponseTimeMs ?? 0);
                    int timeB = bResps.Where(r => r.IsCorrect == true).Sum(r => r.ResponseTimeMs ?? 0);
                    winner = (timeA > 0 && (timeB == 0 || timeA <= timeB)) ? "TEAM_A" : "TEAM_B";
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
                board.TeamACells,
                board.TeamBCells,
                board.TeamAStolen,
                board.TeamBStolen,
                TotalCells = board.Cells.Count,
                WinThreshold = winThreshold
            }
        );
    }

    public override async Task<object> GetClientGameStateAsync(Room room, Guid? requestingPlayerId, ApplicationDbContext db)
    {
        var state = await db.RoomGameStates
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");

        var board = state != null
            ? JsonSerializer.Deserialize<HexBoardState>(state.BoardStateJson)
            : new HexBoardState();

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
            PlayerActionPoints = player?.ActionPoints ?? 0,
            PlayerCombo = player?.CurrentCombo ?? 0,
            PlayerTeam = player?.TeamSide ?? "TEAM_A"
        };
    }

    private static void TickFortifications(HexBoardState board)
    {
        foreach (var cell in board.Cells)
        {
            if (cell.Fortified && !cell.IsBase && cell.FortifiedTurns > 0)
            {
                cell.FortifiedTurns--;
                if (cell.FortifiedTurns <= 0)
                {
                    cell.Fortified = false;
                }
            }
        }
    }

    private static bool IsAdjacentToTeam(HexBoardState board, int r, int c, string teamSide)
    {
        var neighbors = GetHexNeighbors(r, c, board.Rows, board.Cols);
        foreach (var (nr, nc) in neighbors)
        {
            var neighborCell = board.Cells.FirstOrDefault(x => x.R == nr && x.C == nc);
            if (neighborCell != null && neighborCell.Owner == teamSide)
                return true;
        }
        return false;
    }

    private static List<(int r, int c)> GetHexNeighbors(int r, int c, int maxRows, int maxCols)
    {
        int[][] oddOffsets = [
            [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]
        ];
        int[][] evenOffsets = [
            [-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]
        ];

        var offsets = (r % 2 != 0) ? oddOffsets : evenOffsets;
        var list = new List<(int, int)>();

        foreach (var offset in offsets)
        {
            int nr = r + offset[0];
            int nc = c + offset[1];
            if (nr >= 0 && nr < maxRows && nc >= 0 && nc < maxCols)
            {
                list.Add((nr, nc));
            }
        }
        return list;
    }

    private static int ApplyBfsEnclose(HexBoardState board, string teamSide)
    {
        // Tìm tất cả các ô biên bản đồ hoặc ô Căn cứ chính KHÔNG thuộc teamSide
        var visitedEscape = new HashSet<(int, int)>();
        var queue = new Queue<(int, int)>();

        for (int r = 0; r < board.Rows; r++)
        {
            for (int c = 0; c < board.Cols; c++)
            {
                var cell = board.Cells.FirstOrDefault(x => x.R == r && x.C == c);
                if (cell == null || cell.Owner == teamSide) continue;

                bool isBorderOrBase = r == 0 || r == board.Rows - 1 || c == 0 || c == board.Cols - 1 || cell.IsBase;
                if (isBorderOrBase)
                {
                    visitedEscape.Add((r, c));
                    queue.Enqueue((r, c));
                }
            }
        }

        while (queue.Count > 0)
        {
            var (currR, currC) = queue.Dequeue();
            var neighbors = GetHexNeighbors(currR, currC, board.Rows, board.Cols);
            foreach (var (nr, nc) in neighbors)
            {
                if (visitedEscape.Contains((nr, nc))) continue;

                var neighborCell = board.Cells.FirstOrDefault(x => x.R == nr && x.C == nc);
                if (neighborCell != null && neighborCell.Owner != teamSide)
                {
                    visitedEscape.Add((nr, nc));
                    queue.Enqueue((nr, nc));
                }
            }
        }

        int enclosedCount = 0;
        foreach (var cell in board.Cells)
        {
            if (cell.Owner != teamSide && !cell.IsBase && !visitedEscape.Contains((cell.R, cell.C)))
            {
                if (cell.Owner != "NONE")
                {
                    if (teamSide == "TEAM_A") board.TeamAStolen++;
                    else board.TeamBStolen++;
                }
                cell.Owner = teamSide;
                cell.Fortified = false;
                cell.FortifiedTurns = 0;
                enclosedCount++;
            }
        }

        return enclosedCount;
    }
}
