using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services.GameEngines;

public class TrackPiece
{
    public int X { get; set; }
    public int Y { get; set; }
    public string TrackType { get; set; } = "STRAIGHT_H"; // STRAIGHT_H | STRAIGHT_V | CURVE_SE | CURVE_SW | CURVE_NE | CURVE_NW
}

public class TrainState
{
    public int X { get; set; } = 0; // Ga Khởi Hành tại Cột 1 (X = 0)
    public int Y { get; set; } = 3;
    public int Dx { get; set; } = 1;
    public int Dy { get; set; } = 0;
    public bool IsDerailed { get; set; } = false; // Trật bánh tạm thời (phạt 10s)
    public int DerailCount { get; set; } = 0;
    public DateTime? DerailedUntilUtc { get; set; }
    public bool ReachedStation { get; set; } = false;
    public int TotalTracksLaid { get; set; } = 2;
    public bool BoilerOverdrive { get; set; } = false; // Tăng Áp Lò Hơi (chạy nhanh gấp đôi 10s)
}

public class RunawayTrainBoardState
{
    // Bản đồ lưới ô vuông 12x8 (12 cột x 8 hàng) từ Ga Khởi Hành (Cột 1, X=0) tới Ga Đích (Cột 12, X=11)
    public int GridCols { get; set; } = 12;
    public int GridRows { get; set; } = 8;
    public int GridSize { get; set; } = 12;
    public TrainState Train { get; set; } = new();
    public TrainState TrainB { get; set; } = new();
    public int[] StationPos { get; set; } = [11, 5]; // Cột 12 (X = 11)
    // Ban đầu có sẵn 2 ô đường ray thẳng trước mũi tàu
    public List<TrackPiece> PlacedTracks { get; set; } = [
        new() { X = 0, Y = 3, TrackType = "STRAIGHT_H" },
        new() { X = 1, Y = 3, TrackType = "STRAIGHT_H" }
    ];
    public List<int[]> Obstacles { get; set; } = [
        [4, 3], [6, 2], [7, 5], [9, 4]
    ];
    public bool IsBrakeActive { get; set; } = false;
    public bool IsBoilerOverdrive { get; set; } = false;
}

public class RunawayTrainEngine : BaseGameModeEngine
{
    public override string GameType => "RUNAWAY_TRAIN";

    public override async Task InitializeRoomAsync(Room room, List<RoomPlayer> players, ApplicationDbContext db)
    {
        var board = new RunawayTrainBoardState();
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
                SkillsStateJson = JsonSerializer.Serialize(new { BrakeAvailable = true, SwitchTrackAvailable = true, BoilerAvailable = true }),
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
            p.ActionPoints = 2; // 2 mảnh ray khởi đầu
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
            return new GameActionResult(false, actionType, "REJECTED", "Bạn đang bị choáng, không thể ghép ray!");

        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP")
            ?? throw new KeyNotFoundException("Chưa khởi tạo bản đồ Chuyến Tàu Sinh Tử!");

        var board = JsonSerializer.Deserialize<RunawayTrainBoardState>(state.BoardStateJson) ?? new RunawayTrainBoardState();

        if (actionType.Equals("PLACE_RAIL", StringComparison.OrdinalIgnoreCase) ||
            actionType.Equals("PLACE_TRACK", StringComparison.OrdinalIgnoreCase))
        {
            using var doc = JsonDocument.Parse(payloadJson);
            int x = doc.RootElement.GetProperty("x").GetInt32();
            int y = doc.RootElement.GetProperty("y").GetInt32();
            string trackType = doc.RootElement.GetProperty("trackType").GetString()?.ToUpper() ?? "STRAIGHT_H";

            if (player.ActionPoints < 1)
                return new GameActionResult(false, actionType, "NOT_ENOUGH_TRACKS", "Hết mảnh đường ray! Trả lời đúng câu hỏi để nhận +1 Mảnh Đường Ray.");

            if (x < 0 || x >= board.GridCols || y < 0 || y >= board.GridRows)
                return new GameActionResult(false, actionType, "OUT_OF_BOUNDS", "Vị trí nằm ngoài bản đồ đường sắt 12×8!");

            bool onObstacle = board.Obstacles.Any(ob => ob[0] == x && ob[1] == y);
            if (onObstacle)
                return new GameActionResult(false, actionType, "BLOCKED_BY_OBSTACLE", "Vị trí này có Núi Đá / Vực Sâu chắn đường! Hãy đặt ray vòng qua hoặc phá đá.");

            if (board.Train.X == x && board.Train.Y == y)
                return new GameActionResult(false, actionType, "TRAIN_ON_TILE", "Đoàn tàu đang đứng trên ô này, không thể thay đổi ray!");

            var existingTrack = board.PlacedTracks.FirstOrDefault(t => t.X == x && t.Y == y);
            player.ActionPoints -= 1;

            if (existingTrack != null)
            {
                existingTrack.TrackType = trackType;
            }
            else
            {
                board.PlacedTracks.Add(new TrackPiece { X = x, Y = y, TrackType = trackType });
                board.Train.TotalTracksLaid++;
            }

            // Nếu tàu đang bị Trật Bánh Tạm Thời và người chơi vừa đặt/sửa ray thì khắc phục sự cố luôn
            board.Train.IsDerailed = false;

            if (!board.IsBrakeActive)
            {
                AdvanceTrain(board, player, isForcedTick: false);
                if (board.Train.BoilerOverdrive && !board.Train.ReachedStation && !board.Train.IsDerailed)
                {
                    // Tăng Áp Lò Hơi: tàu chạy gấp đôi (nhích thêm 1 ô)
                    AdvanceTrain(board, player, isForcedTick: false);
                    board.Train.BoilerOverdrive = false;
                }
            }
            else
            {
                board.IsBrakeActive = false; // Nhả phanh an toàn sau 1 chu kỳ
            }

            board.IsBoilerOverdrive = board.Train.BoilerOverdrive;
            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.HpOrProgress = board.Train.X;
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "PLACE_TRACK", payloadJson, $"PLACED_{trackType}_AT_({x},{y})", db);

            bool matchEnded = false;
            string? winner = null;
            if (board.Train.ReachedStation)
            {
                matchEnded = true;
                winner = player.TeamSide ?? "TEAM_A";
                room.Status = "FINISHED";
                room.WinnerTeam = winner;
            }

            await db.SaveChangesAsync();

            string statusMsg = board.Train.ReachedStation
                ? " 🏆 Đoàn tàu đã cập Ga Đích (Cột 12) an toàn! Chiến thắng tuyệt đối!"
                : (board.Train.IsDerailed
                    ? " ⚠️ SỰ CỐ TRẬT BÁNH TẠM THỜI: Đoàn tàu bị phạt đứng yên 10 giây và trừ 50 điểm! Hãy đặt lại đường ray đúng hướng!"
                    : " Ghép ray dẫn đường thành công!");

            return new GameActionResult(
                Success: true,
                ActionType: "PLACE_TRACK",
                Result: board.Train.IsDerailed ? "TEMP_DERAILED" : (board.Train.ReachedStation ? "VICTORY" : "SUCCESS"),
                Message: $"Đặt ray {trackType} tại ({x + 1}, {y + 1}).{statusMsg}",
                Data: new
                {
                    TrainX = board.Train.X,
                    TrainY = board.Train.Y,
                    board.Train.IsDerailed,
                    board.Train.DerailCount,
                    board.Train.ReachedStation
                },
                MatchEnded: matchEnded,
                WinnerTeam: winner
            );
        }

        // Tự động nhích tàu 1 ô sau mỗi 12 giây (hoặc 6 giây khi Tăng Áp Lò Hơi)
        if (actionType.Equals("ADVANCE_TRAIN_TICK", StringComparison.OrdinalIgnoreCase))
        {
            if (board.IsBrakeActive)
            {
                board.IsBrakeActive = false;
                state.BoardStateJson = JsonSerializer.Serialize(board);
                await db.SaveChangesAsync();
                return new GameActionResult(true, actionType, "BRAKE_RELEASED", "🛑 Đã hết 12 giây Phanh Khẩn Cấp! Đoàn tàu tiếp tục lăn bánh.");
            }

            if (board.Train.IsDerailed)
            {
                if (!board.Train.DerailedUntilUtc.HasValue || board.Train.DerailedUntilUtc.Value <= DateTime.UtcNow)
                {
                    board.Train.IsDerailed = false;
                }
                state.BoardStateJson = JsonSerializer.Serialize(board);
                await db.SaveChangesAsync();
                return new GameActionResult(true, actionType, "REPAIRING", "🔧 Đoàn tàu đã hoàn tất 10 giây sửa chữa trật bánh. Hãy lắp ray trước mũi tàu!");
            }

            AdvanceTrain(board, player, isForcedTick: true);
            board.IsBoilerOverdrive = board.Train.BoilerOverdrive;

            bool matchEnded = false;
            string? winner = null;
            if (board.Train.ReachedStation)
            {
                matchEnded = true;
                winner = player.TeamSide ?? "TEAM_A";
                room.Status = "FINISHED";
                room.WinnerTeam = winner;
            }

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.HpOrProgress = board.Train.X;
            state.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return new GameActionResult(
                true,
                actionType,
                board.Train.IsDerailed ? "TEMP_DERAILED" : (board.Train.ReachedStation ? "VICTORY" : "ADVANCED"),
                board.Train.IsDerailed
                    ? "⚠️ SỰ CỐ TRẬT BÁNH TẠM THỜI (-50đ, phạt dừng 10s): Ô phía trước chưa có đường ray hoặc vướng chướng ngại vật!"
                    : $"🚂 Đoàn tàu tự động nhích tới Cột {board.Train.X + 1}, Hàng {board.Train.Y + 1}!",
                new { TrainX = board.Train.X, TrainY = board.Train.Y, board.Train.IsDerailed, board.Train.ReachedStation },
                matchEnded,
                winner
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
            ?? throw new KeyNotFoundException("Chưa khởi tạo bản đồ Chuyến Tàu Sinh Tử!");

        var board = JsonSerializer.Deserialize<RunawayTrainBoardState>(state.BoardStateJson) ?? new RunawayTrainBoardState();

        // 1. Phanh Khẩn Cấp (EMERGENCY_BRAKE): Giữ đoàn tàu đứng yên an toàn trong 12 giây
        if (skillName.Equals("EMERGENCY_BRAKE", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Kỹ năng Phanh Khẩn Cấp cần 1 Mảnh ray!");

            player.ActionPoints -= 1;
            board.IsBrakeActive = true;
            board.Train.IsDerailed = false;

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_EMERGENCY_BRAKE", payloadJson, "BRAKE_HOLD_12S", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "🛑 Đã kéo Phanh Khẩn Cấp! Giữ đoàn tàu đứng yên an toàn trong 12 giây để cả đội trả lời câu hỏi lấy mảnh ray mới!");
        }

        // 2. Bẻ Ghi Đường Ray (SWITCH_TRACK - Phá hoại): Đổi hướng ô đường ray trước mặt tàu từ Thẳng sang Rẽ Cong
        if (skillName.Equals("SWITCH_TRACK", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Kỹ năng Bẻ Ghi Đường Ray cần 1 Mảnh ray!");

            player.ActionPoints -= 1;
            int frontX = board.Train.X + board.Train.Dx;
            int frontY = board.Train.Y + board.Train.Dy;
            var frontTrack = board.PlacedTracks.FirstOrDefault(t => t.X == frontX && t.Y == frontY)
                ?? board.PlacedTracks.LastOrDefault();

            if (frontTrack != null)
            {
                frontTrack.TrackType = frontTrack.TrackType.StartsWith("STRAIGHT") ? "CURVE_SE" : "STRAIGHT_H";
            }

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_SWITCH_TRACK", payloadJson, "SWITCHED_ENEMY_TRACK", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "🔀 Đã cài chốt Bẻ Ghi Đường Ray phía trước mũi tàu đối phương từ Thẳng sang Rẽ Cong!");
        }

        // 3. Tăng Áp Lò Hơi (BOILER_OVERDRIVE): Làm tàu đối phương chạy nhanh gấp đôi trong 10 giây
        if (skillName.Equals("BOILER_OVERDRIVE", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Kỹ năng Tăng Áp Lò Hơi cần 1 Mảnh ray!");

            player.ActionPoints -= 1;
            board.Train.BoilerOverdrive = true;
            board.IsBoilerOverdrive = true;

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_BOILER_OVERDRIVE", payloadJson, "SPEED_X2_10S", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "🔥 Đã kích hoạt Tăng Áp Lò Hơi! Đoàn tàu đối phương tăng tốc gấp đôi trong 10 giây!");
        }

        // 4. Nổ Đá Mở Đường (DYNAMITE_OBSTACLE)
        if (skillName.Equals("DYNAMITE_OBSTACLE", StringComparison.OrdinalIgnoreCase))
        {
            using var doc = JsonDocument.Parse(payloadJson);
            int x = doc.RootElement.GetProperty("x").GetInt32();
            int y = doc.RootElement.GetProperty("y").GetInt32();

            var obstacle = board.Obstacles.FirstOrDefault(ob => ob[0] == x && ob[1] == y);
            if (obstacle == null)
                return new GameActionResult(false, skillName, "NOT_FOUND", "Không có Núi Đá tại vị trí này!");

            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Cần 1 Mảnh ray để phá đá cản!");

            player.ActionPoints -= 1;
            board.Obstacles.Remove(obstacle);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, "SKILL_DYNAMITE_OBSTACLE", payloadJson, $"DESTROYED_ROCK_AT_({x},{y})", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", $"💥 Đã dọn sạch tảng Núi Đá tại ({x + 1}, {y + 1})!");
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

        var board = JsonSerializer.Deserialize<RunawayTrainBoardState>(state.BoardStateJson) ?? new RunawayTrainBoardState();
        bool isFinished = room.Status == "FINISHED" || board.Train.ReachedStation;

        string? winner = room.WinnerTeam;
        if (board.Train.ReachedStation)
        {
            winner ??= "TEAM_A";
        }
        else if (isFinished && string.IsNullOrEmpty(winner))
        {
            // Xét theo thứ tự ưu tiên: (1) Khoảng cách đoàn tàu đi được -> (2) Tổng số mảnh đường ray hợp lệ -> (3) Số lần trật bánh ít nhất
            if (board.Train.X != board.TrainB.X)
                winner = board.Train.X >= board.TrainB.X ? "TEAM_A" : "TEAM_B";
            else if (board.Train.TotalTracksLaid != board.TrainB.TotalTracksLaid)
                winner = board.Train.TotalTracksLaid >= board.TrainB.TotalTracksLaid ? "TEAM_A" : "TEAM_B";
            else
                winner = board.Train.DerailCount <= board.TrainB.DerailCount ? "TEAM_A" : "TEAM_B";
        }

        return new GameMatchStatus(
            Status: isFinished ? "FINISHED" : room.Status,
            CurrentSlideIndex: room.CurrentSlideIndex,
            TotalSlides: 0,
            IsFinished: isFinished,
            Winner: winner,
            Summary: new
            {
                TrainPos = new[] { board.Train.X, board.Train.Y },
                board.Train.TotalTracksLaid,
                board.Train.DerailCount,
                board.Train.ReachedStation
            }
        );
    }

    public override async Task<object> GetClientGameStateAsync(Room room, Guid? requestingPlayerId, ApplicationDbContext db)
    {
        var state = await db.RoomGameStates
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");

        var board = state != null
            ? JsonSerializer.Deserialize<RunawayTrainBoardState>(state.BoardStateJson)
            : new RunawayTrainBoardState();
        if (board != null) board.IsBoilerOverdrive = board.Train.BoilerOverdrive;

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
            PlayerRailTracks = player?.ActionPoints ?? 0,
            PlayerTeam = player?.TeamSide ?? "TEAM_A"
        };
    }

    private static void AdvanceTrain(RunawayTrainBoardState board, RoomPlayer player, bool isForcedTick)
    {
        var currentTrack = board.PlacedTracks.FirstOrDefault(t => t.X == board.Train.X && t.Y == board.Train.Y);
        if (currentTrack != null)
        {
            ApplyTrackDirection(board, currentTrack.TrackType);
        }

        int nextX = board.Train.X + board.Train.Dx;
        int nextY = board.Train.Y + board.Train.Dy;

        // Ra ngoài biên 12x8 hoặc đâm vào Núi Đá -> Trật Bánh Tạm Thời (phạt đứng yên 10s và trừ 50 điểm)
        if (nextX < 0 || nextX >= board.GridCols || nextY < 0 || nextY >= board.GridRows ||
            board.Obstacles.Any(ob => ob[0] == nextX && ob[1] == nextY))
        {
            board.Train.IsDerailed = true;
            board.Train.DerailCount++;
            board.Train.DerailedUntilUtc = DateTime.UtcNow.AddSeconds(10);
            player.TotalScore = Math.Max(0, player.TotalScore - 50);
            return;
        }

        // Kiểm tra cập Ga Đích (Cột 12, X = 11)
        if (nextX == board.StationPos[0] && nextY == board.StationPos[1])
        {
            board.Train.X = nextX;
            board.Train.Y = nextY;
            board.Train.ReachedStation = true;
            return;
        }

        var track = board.PlacedTracks.FirstOrDefault(t => t.X == nextX && t.Y == nextY);
        if (track == null)
        {
            // Nếu đến chu kỳ 12s tự động nhích tàu mà ô phía trước chưa được đặt đường ray -> Trật bánh tạm thời (dừng 10s sửa chữa, -50 điểm)
            if (isForcedTick)
            {
                board.Train.IsDerailed = true;
                board.Train.DerailCount++;
                board.Train.DerailedUntilUtc = DateTime.UtcNow.AddSeconds(10);
                player.TotalScore = Math.Max(0, player.TotalScore - 50);
            }
            return;
        }

        board.Train.X = nextX;
        board.Train.Y = nextY;
        ApplyTrackDirection(board, track.TrackType);

        int afterX = board.Train.X + board.Train.Dx;
        int afterY = board.Train.Y + board.Train.Dy;
        if (afterX == board.StationPos[0] && afterY == board.StationPos[1])
        {
            board.Train.X = afterX;
            board.Train.Y = afterY;
            board.Train.ReachedStation = true;
        }
    }

    private static void ApplyTrackDirection(RunawayTrainBoardState board, string trackType)
    {
        int dx = board.Train.Dx;
        int dy = board.Train.Dy;

        switch (trackType)
        {
            case "CURVE_SE":
                if (dx != 0) { board.Train.Dx = 0; board.Train.Dy = 1; }
                else { board.Train.Dx = 1; board.Train.Dy = 0; }
                break;
            case "CURVE_SW":
                if (dx != 0) { board.Train.Dx = 0; board.Train.Dy = 1; }
                else { board.Train.Dx = -1; board.Train.Dy = 0; }
                break;
            case "CURVE_NE":
                if (dy != 0) { board.Train.Dx = 1; board.Train.Dy = 0; }
                else { board.Train.Dx = 0; board.Train.Dy = -1; }
                break;
            case "CURVE_NW":
                if (dx != 0) { board.Train.Dx = 0; board.Train.Dy = -1; }
                else { board.Train.Dx = -1; board.Train.Dy = 0; }
                break;
            case "STRAIGHT_V":
                if (dx != 0)
                {
                    board.Train.Dx = 0;
                    board.Train.Dy = board.StationPos[1] >= board.Train.Y ? 1 : -1;
                }
                break;
            case "STRAIGHT_H":
                if (dy != 0)
                {
                    board.Train.Dy = 0;
                    board.Train.Dx = board.StationPos[0] >= board.Train.X ? 1 : -1;
                }
                break;
        }
    }
}
