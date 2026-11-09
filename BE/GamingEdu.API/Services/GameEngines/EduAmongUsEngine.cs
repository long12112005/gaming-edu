using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services.GameEngines;

public class AmongUsBoardState
{
    // Thanh Tiến Độ Sửa Trạm: bắt đầu ở mức 0%, mục tiêu của phe Khoa học là đưa lên 100%
    public int StationProgress { get; set; } = 0;
    public bool MeetingActive { get; set; } = false;
    public string? MeetingCallerNickname { get; set; }
    public Dictionary<string, string> ActiveVotes { get; set; } = []; // VoterId -> SuspectId
    public Dictionary<string, int> IsolatedQuestionsLeft { get; set; } = []; // PlayerId -> số câu hỏi bị cách ly còn lại (2 câu)
    public Dictionary<string, List<int>> RecentContributions { get; set; } = []; // PlayerId -> % đóng góp trong 3 câu gần nhất
    public bool MeltdownActive { get; set; } = false;
    public int MeltdownCountdown { get; set; } = 45;
    public DateTime? SystemShieldUntilUtc { get; set; } // Lá Chắn Bảo Toàn Hệ Thống (15 giây)
    public DateTime? JamSignalUntilUtc { get; set; } // Gây Nhiễu Tín Hiệu (8 giây)
    public bool SystemShieldActive { get; set; } = false;
    public bool SignalJamActive { get; set; } = false;
    public int QuestionsAnsweredCount { get; set; } = 0;
    public List<string> ActivityLog { get; set; } = [];
}

public class EduAmongUsEngine : BaseGameModeEngine
{
    public override string GameType => "EDU_AMONG_US";

    public override async Task InitializeRoomAsync(Room room, List<RoomPlayer> players, ApplicationDbContext db)
    {
        // Phân vai trên Server: 20% Nội Gián (IMPOSTOR), 80% Nhà Khoa Học (SCIENTIST)
        int impostorCount = players.Count >= 3 ? Math.Max(1, (int)Math.Round(players.Count * 0.2)) : 0;
        var shuffled = players.OrderBy(_ => Guid.NewGuid()).ToList();

        for (int i = 0; i < shuffled.Count; i++)
        {
            var p = shuffled[i];
            p.PlayerRole = i < impostorCount ? "IMPOSTOR" : "SCIENTIST";
            p.ActionPoints = 0;
            p.IsIsolated = false;
        }

        var board = new AmongUsBoardState
        {
            StationProgress = 0, // Khởi đầu ở mức 0%
            ActivityLog = ["Trạm Nghiên Cứu Khoa Học bắt đầu phục hồi năng lượng (0%). Nhà Khoa Học trả lời đúng tự động tăng tiến độ sửa trạm!"]
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
                HpOrProgress = 0,
                BoardStateJson = JsonSerializer.Serialize(board),
                SkillsStateJson = JsonSerializer.Serialize(new { BiometricReady = true, SystemShieldReady = true }),
                UpdatedAt = DateTime.UtcNow
            };
            db.RoomGameStates.Add(state);
        }
        else
        {
            state.HpOrProgress = 0;
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
        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");
        AmongUsBoardState? board = null;
        if (state != null)
        {
            board = JsonSerializer.Deserialize<AmongUsBoardState>(state.BoardStateJson) ?? new AmongUsBoardState();
            board.SystemShieldActive = board.SystemShieldUntilUtc.HasValue && board.SystemShieldUntilUtc.Value > DateTime.UtcNow;
            board.SignalJamActive = board.JamSignalUntilUtc.HasValue && board.JamSignalUntilUtc.Value > DateTime.UtcNow;
        }

        bool wasIsolatedBeforeAnswer = player.IsIsolated;
        var res = await base.ProcessSlideAnswerAsync(room, player, slide, answerData, responseTimeMs, db);

        // Nếu người chơi đang trong Buồng Cách Ly: bị khóa trả lời câu này và giảm bộ đếm 2 câu hỏi cách ly
        if (wasIsolatedBeforeAnswer && state != null && board != null)
        {
            string pid = player.Id.ToString();
            int left = board.IsolatedQuestionsLeft.TryGetValue(pid, out int curLeft) ? curLeft : 2;
            left--;
            if (left <= 0)
            {
                player.IsIsolated = false;
                board.IsolatedQuestionsLeft.Remove(pid);
                board.ActivityLog.Add($"🔓 {player.Nickname} đã hoàn thành thời hạn 2 câu hỏi trong Buồng Cách Ly và được phép quay lại trạm ở câu tiếp theo.");
            }
            else
            {
                board.IsolatedQuestionsLeft[pid] = left;
            }
            state.BoardStateJson = JsonSerializer.Serialize(board);
            await db.SaveChangesAsync();
            return res;
        }

        if (res.Success && state != null && board != null)
        {
            string pid = player.Id.ToString();
            if (!board.RecentContributions.ContainsKey(pid))
                board.RecentContributions[pid] = [];

            if (res.IsCorrect)
            {
                if (player.PlayerRole == "IMPOSTOR")
                {
                    // Nội Gián trả lời ĐÚNG: Thanh Tiến Độ KHÔNG tăng, nhưng nhận +1 Điểm Phá Hoại Ngầm (action_points)
                    board.RecentContributions[pid].Add(0);
                }
                else
                {
                    // Nhà Khoa Học trả lời ĐÚNG: Thanh Tiến Độ Sửa Trạm tăng +3% (co giãn theo sĩ số phòng để phòng ít người vẫn đạt 100%)
                    int totalPlayers = await db.RoomPlayers.CountAsync(p => p.RoomId == room.Id);
                    int gainPercent = totalPlayers <= 3 ? 10 : (totalPlayers <= 8 ? 6 : 3);
                    board.StationProgress = Math.Min(100, board.StationProgress + gainPercent);
                    board.RecentContributions[pid].Add(gainPercent);
                    board.ActivityLog.Add($"🔬 Một Nhà Khoa Học vừa trả lời đúng, đóng góp +{gainPercent}% Tiến độ Sửa Trạm ({board.StationProgress}%).");

                    if (board.StationProgress >= 100)
                    {
                        room.Status = "FINISHED";
                        room.WinnerTeam = "SCIENTISTS";
                    }
                }
            }
            else
            {
                board.RecentContributions[pid].Add(0);
            }

            if (board.RecentContributions[pid].Count > 3)
            {
                board.RecentContributions[pid].RemoveAt(0);
            }

            board.QuestionsAnsweredCount++;
            state.HpOrProgress = board.StationProgress;
            state.BoardStateJson = JsonSerializer.Serialize(board);
            await db.SaveChangesAsync();
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
            return new GameActionResult(false, actionType, "REJECTED", "Bạn đang ở trong Buồng Cách Ly (2 câu hỏi), không thể tung kỹ năng hay thao tác!");

        var state = await db.RoomGameStates
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP")
            ?? throw new KeyNotFoundException("Chưa khởi tạo Trạm Nghiên Cứu Khoa Học!");

        var board = JsonSerializer.Deserialize<AmongUsBoardState>(state.BoardStateJson) ?? new AmongUsBoardState();
        board.SystemShieldActive = board.SystemShieldUntilUtc.HasValue && board.SystemShieldUntilUtc.Value > DateTime.UtcNow;
        board.SignalJamActive = board.JamSignalUntilUtc.HasValue && board.JamSignalUntilUtc.Value > DateTime.UtcNow;

        // 1. Sửa trạm bổ sung (SCIENTIST dùng ActionPoints)
        if (actionType.Equals("REPAIR_STATION", StringComparison.OrdinalIgnoreCase) ||
            actionType.Equals("REPAIR_TASK", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, actionType, "NO_POINTS", "Cần trả lời đúng câu hỏi để nhận Điểm thao tác!");

            player.ActionPoints -= 1;
            int gain = player.PlayerRole == "IMPOSTOR" ? 0 : 3;
            board.StationProgress = Math.Min(100, board.StationProgress + gain);
            if (board.MeltdownActive && player.PlayerRole != "IMPOSTOR")
            {
                board.MeltdownActive = false;
            }
            board.ActivityLog.Add($"🔧 {player.Nickname} vừa kích hoạt trạm năng lượng phụ. Tiến độ hiện tại: {board.StationProgress}%");

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.HpOrProgress = board.StationProgress;
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, actionType, payloadJson, $"REPAIRED_+{gain}%_PROGRESS_{board.StationProgress}%", db);

            bool matchEnded = false;
            string? winner = null;
            if (board.StationProgress >= 100)
            {
                matchEnded = true;
                winner = "SCIENTISTS";
                room.Status = "FINISHED";
                room.WinnerTeam = winner;
            }

            await db.SaveChangesAsync();

            return new GameActionResult(
                Success: true,
                ActionType: actionType,
                Result: "SUCCESS",
                Message: $"Đã thao tác trạm thành công! Tiến độ đạt {board.StationProgress}%.",
                Data: new { board.StationProgress, board.MeltdownActive },
                MatchEnded: matchEnded,
                WinnerTeam: winner
            );
        }

        // 2. Đánh Sập Lò Phản Ứng (IMPOSTOR: trừ trực tiếp -8% vào Thanh Tiến Độ Sửa Trạm và bật còi báo động đỏ)
        if (actionType.Equals("SABOTAGE", StringComparison.OrdinalIgnoreCase) ||
            actionType.Equals("SABOTAGE_REACTOR", StringComparison.OrdinalIgnoreCase))
        {
            if (player.PlayerRole != "IMPOSTOR")
                return new GameActionResult(false, actionType, "UNAUTHORIZED", "Chỉ Nội Gián (IMPOSTOR) mới có thể Đánh Sập Lò Phản Ứng!");

            if (player.ActionPoints < 1)
                return new GameActionResult(false, actionType, "NO_POINTS", "Cần 1 Điểm Phá Hoại Ngầm (trả lời đúng câu hỏi) để Đánh Sập Lò Phản Ứng!");

            player.ActionPoints -= 1;

            bool shieldProtected = board.SystemShieldUntilUtc.HasValue && board.SystemShieldUntilUtc.Value > DateTime.UtcNow;
            if (shieldProtected)
            {
                board.ActivityLog.Add("🛡️ Lá Chắn Bảo Toàn Hệ Thống đã chặn đứng âm mưu Đánh Sập Lò Phản Ứng của Nội Gián!");
            }
            else
            {
                board.StationProgress = Math.Max(0, board.StationProgress - 8);
                board.MeltdownActive = true;
                board.ActivityLog.Add($"🚨 CÒI BÁO ĐỘNG ĐỎ: Nội Gián vừa Đánh Sập Lò Phản Ứng (-8%)! Tiến độ sụt giảm còn {board.StationProgress}%!");
            }

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.HpOrProgress = board.StationProgress;
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, actionType, payloadJson, $"SABOTAGE_-8%_PROGRESS_{board.StationProgress}%", db);
            await db.SaveChangesAsync();

            return new GameActionResult(
                Success: true,
                ActionType: actionType,
                Result: shieldProtected ? "BLOCKED_BY_SHIELD" : "SUCCESS",
                Message: shieldProtected
                    ? "Lá Chắn Bảo Toàn Hệ Thống đang bật, không thể trừ Thanh Tiến Độ!"
                    : $"Đánh Sập Lò Phản Ứng thành công (-8%)! Tiến độ trạm giảm còn {board.StationProgress}%.",
                Data: new { board.StationProgress, board.MeltdownActive }
            );
        }

        // 3. Triệu tập Phiên Họp Bỏ Phiếu Cách Ly (Emergency Meeting)
        if (actionType.Equals("CALL_MEETING", StringComparison.OrdinalIgnoreCase))
        {
            if (board.MeetingActive)
                return new GameActionResult(false, actionType, "ALREADY_ACTIVE", "Phiên họp bỏ phiếu cách ly đang diễn ra!");

            board.MeetingActive = true;
            board.MeetingCallerNickname = player.Nickname;
            board.ActiveVotes.Clear();
            board.ActivityLog.Add($"🔔 {player.Nickname} đã kích hoạt PHIÊN HỌP BỎ PHIẾU CÁCH LY (20 giây)! Nếu cách ly trúng Nội gián, phe Khoa học được thưởng +10% Tiến độ!");

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, actionType, payloadJson, "MEETING_STARTED", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, actionType, "SUCCESS", $"{player.Nickname} đã mở Phiên Họp Bỏ Phiếu Cách Ly!", new { board.MeetingActive });
        }

        // 4. Bỏ phiếu cách ly (Vote Isolate)
        if (actionType.Equals("VOTE_ISOLATE", StringComparison.OrdinalIgnoreCase))
        {
            if (!board.MeetingActive)
                return new GameActionResult(false, actionType, "NO_MEETING", "Chỉ có thể bỏ phiếu khi Phiên Họp Bỏ Phiếu Cách Ly đang diễn ra!");

            using var doc = JsonDocument.Parse(payloadJson);
            string suspectIdStr = doc.RootElement.GetProperty("suspectPlayerId").GetString() ?? "";
            if (!Guid.TryParse(suspectIdStr, out var suspectId))
                return new GameActionResult(false, actionType, "INVALID_ID", "ID người bị tình nghi không hợp lệ!");

            board.ActiveVotes[player.Id.ToString()] = suspectId.ToString();

            var activePlayers = await db.RoomPlayers
                .Where(p => p.RoomId == room.Id && !p.IsIsolated)
                .ToListAsync();

            bool allVoted = activePlayers.All(p => board.ActiveVotes.ContainsKey(p.Id.ToString()));
            string? isolatedNickname = null;
            bool matchEnded = false;
            string? winner = null;

            if (allVoted || board.ActiveVotes.Count >= activePlayers.Count)
            {
                var voteCounts = board.ActiveVotes.Values
                    .GroupBy(id => id)
                    .OrderByDescending(g => g.Count())
                    .ToList();

                if (voteCounts.Count > 0 && (voteCounts.Count == 1 || voteCounts[0].Count() > voteCounts[1].Count()))
                {
                    var targetId = Guid.Parse(voteCounts[0].Key);
                    var isolatedPlayer = activePlayers.FirstOrDefault(p => p.Id == targetId);
                    if (isolatedPlayer != null)
                    {
                        isolatedPlayer.IsIsolated = true;
                        board.IsolatedQuestionsLeft[isolatedPlayer.Id.ToString()] = 2; // Cách ly trong 2 câu hỏi tiếp theo
                        isolatedNickname = isolatedPlayer.Nickname;

                        if (isolatedPlayer.PlayerRole == "IMPOSTOR")
                        {
                            // Cách ly trúng Nội gián -> Thưởng +10% Tiến độ cho phe Khoa học!
                            board.StationProgress = Math.Min(100, board.StationProgress + 10);
                            board.ActivityLog.Add($"🎯 CHÍNH XÁC! {isolatedPlayer.Nickname} chính là NỘI GIÁN! Đã đưa vào Buồng Cách Ly và thưởng +10% Tiến độ Sửa Trạm ({board.StationProgress}%)!");
                        }
                        else
                        {
                            board.ActivityLog.Add($"⛔ {isolatedPlayer.Nickname} (Nhà Khoa Học) đã bị đưa vào Buồng Cách Ly trong 2 câu hỏi tiếp theo!");
                        }
                    }
                }
                else
                {
                    board.ActivityLog.Add("⚖️ Số phiếu hòa! Không ai bị đưa vào Buồng Cách Ly trong phiên họp này.");
                }

                board.MeetingActive = false;
                board.ActiveVotes.Clear();

                var allPlayers = await db.RoomPlayers.Where(p => p.RoomId == room.Id).ToListAsync();
                var remaining = allPlayers.Where(p => !p.IsIsolated).ToList();
                int remainingImpostors = remaining.Count(p => p.PlayerRole == "IMPOSTOR");

                if (board.StationProgress >= 100 || (allPlayers.Count >= 3 && remainingImpostors == 0))
                {
                    matchEnded = true;
                    winner = "SCIENTISTS";
                    room.Status = "FINISHED";
                    room.WinnerTeam = winner;
                }
            }

            state.HpOrProgress = board.StationProgress;
            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;

            await RecordActionAsync(room, player, actionType, payloadJson, $"VOTED_{suspectIdStr}", db);
            await db.SaveChangesAsync();

            return new GameActionResult(
                Success: true,
                ActionType: actionType,
                Result: "SUCCESS",
                Message: isolatedNickname != null
                    ? $"Bỏ phiếu hoàn tất! {isolatedNickname} đã bị đưa vào Buồng Cách Ly."
                    : "Đã ghi nhận phiếu bầu của bạn.",
                Data: new { board.MeetingActive, board.StationProgress, IsolatedPlayer = isolatedNickname, VotesCount = board.ActiveVotes.Count },
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
            ?? throw new KeyNotFoundException("Chưa khởi tạo Trạm Nghiên Cứu Khoa Học!");

        var board = JsonSerializer.Deserialize<AmongUsBoardState>(state.BoardStateJson) ?? new AmongUsBoardState();

        // 1. Máy Quét Sinh Trắc Học (SCAN_VITALS / BIOMETRIC_SCAN - Combo 4): Quét đóng góp 3 câu gần nhất của 1 người chơi
        if (skillName.Equals("SCAN_VITALS", StringComparison.OrdinalIgnoreCase) ||
            skillName.Equals("BIOMETRIC_SCAN", StringComparison.OrdinalIgnoreCase))
        {
            if (player.CurrentCombo < 4 && player.MaxCombo < 4 && player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "COMBO_REQUIRED", "Máy Quét Sinh Trắc Học mở khóa khi đạt Combo 4 câu đúng liên tiếp (hoặc tốn 1 Điểm thao tác)!");

            if (player.CurrentCombo < 4 && player.ActionPoints >= 1)
                player.ActionPoints -= 1;

            string? targetPlayerIdStr = null;
            if (!string.IsNullOrWhiteSpace(payloadJson) && payloadJson != "{}")
            {
                using var doc = JsonDocument.Parse(payloadJson);
                if (doc.RootElement.TryGetProperty("targetPlayerId", out var tp))
                    targetPlayerIdStr = tp.GetString();
            }

            RoomPlayer? targetPlayer = null;
            if (Guid.TryParse(targetPlayerIdStr, out var targetGuid))
            {
                targetPlayer = await db.RoomPlayers.AsNoTracking().FirstOrDefaultAsync(p => p.Id == targetGuid && p.RoomId == room.Id);
            }
            targetPlayer ??= await db.RoomPlayers.AsNoTracking()
                .Where(p => p.RoomId == room.Id && p.Id != player.Id)
                .OrderByDescending(p => p.PlayerRole == "IMPOSTOR")
                .FirstOrDefaultAsync() ?? player;

            var contribs = board.RecentContributions.TryGetValue(targetPlayer.Id.ToString(), out var list)
                ? list
                : [];
            int totalContrib = contribs.Sum();

            string report = $"🔍 Quét Sinh Trắc Học [{targetPlayer.Nickname}]: Người chơi này đã đóng góp {totalContrib}% vào Tiến độ sửa trạm trong {Math.Max(1, contribs.Count)} câu gần nhất!";
            board.ActivityLog.Add(report);

            state.BoardStateJson = JsonSerializer.Serialize(board);
            await RecordActionAsync(room, player, "SKILL_BIOMETRIC_SCAN", payloadJson, $"SCANNED_{targetPlayer.Nickname}_{totalContrib}%", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", report, new { TargetNickname = targetPlayer.Nickname, ContributionPercent = totalContrib });
        }

        // 2. Lá Chắn Bảo Toàn Hệ Thống (SYSTEM_SHIELD): Khóa Thanh Tiến Độ không bị Nội gián trừ điểm trong 15 giây
        if (skillName.Equals("SYSTEM_SHIELD", StringComparison.OrdinalIgnoreCase))
        {
            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Lá Chắn Bảo Toàn Hệ Thống cần 1 Điểm thao tác!");

            player.ActionPoints -= 1;
            board.SystemShieldUntilUtc = DateTime.UtcNow.AddSeconds(15);
            board.SystemShieldActive = true;
            board.MeltdownActive = false;
            board.ActivityLog.Add($"🛡️ Nhà khoa học {player.Nickname} đã bật Lá Chắn Bảo Toàn Hệ Thống! Khóa Thanh Tiến Độ khỏi bị trừ điểm trong 15 giây!");

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;
            await RecordActionAsync(room, player, "SKILL_SYSTEM_SHIELD", payloadJson, "SHIELD_15S", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "🛡️ Đã kích hoạt Lá Chắn Bảo Toàn Hệ Thống! Khóa Thanh Tiến Độ không bị Nội gián trừ điểm trong 15 giây!");
        }

        // 3. Gây Nhiễu Tín Hiệu (JAM_SIGNAL / DISGUISE - Kỹ năng Nội Gián): Làm nhấp nháy màn hình câu hỏi 8 giây
        if (skillName.Equals("JAM_SIGNAL", StringComparison.OrdinalIgnoreCase) ||
            skillName.Equals("DISGUISE", StringComparison.OrdinalIgnoreCase))
        {
            if (player.PlayerRole != "IMPOSTOR")
                return new GameActionResult(false, skillName, "DENIED", "Chỉ Nội Gián (IMPOSTOR) mới có thể kích hoạt Gây Nhiễu Tín Hiệu!");

            if (player.ActionPoints < 1)
                return new GameActionResult(false, skillName, "NOT_ENOUGH_POINTS", "Gây Nhiễu Tín Hiệu cần 1 Điểm Phá Hoại Ngầm!");

            player.ActionPoints -= 1;
            board.JamSignalUntilUtc = DateTime.UtcNow.AddSeconds(8);
            board.SignalJamActive = true;
            board.ActivityLog.Add("📡 CẢNH BÁO NHIỄU SÓNG: Hệ thống tín hiệu câu hỏi của các Nhà Khoa Học đang bị gây nhiễu trong 8 giây!");

            state.BoardStateJson = JsonSerializer.Serialize(board);
            state.UpdatedAt = DateTime.UtcNow;
            await RecordActionAsync(room, player, "SKILL_JAM_SIGNAL", payloadJson, "JAM_8S", db);
            await db.SaveChangesAsync();

            return new GameActionResult(true, skillName, "SUCCESS", "📡 Đã kích hoạt Gây Nhiễu Tín Hiệu! Màn hình câu hỏi của các Nhà Khoa Học bị nhấp nháy trong 8 giây!");
        }

        if (skillName.Equals("SWITCH_ROLE", StringComparison.OrdinalIgnoreCase))
        {
            player.PlayerRole = player.PlayerRole == "IMPOSTOR" ? "SCIENTIST" : "IMPOSTOR";
            await db.SaveChangesAsync();
            return new GameActionResult(true, skillName, "SUCCESS", $"Đã chuyển vai trò thành: {player.PlayerRole}!");
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

        var board = JsonSerializer.Deserialize<AmongUsBoardState>(state.BoardStateJson) ?? new AmongUsBoardState();

        var allPlayers = await db.RoomPlayers.AsNoTracking().Where(p => p.RoomId == room.Id).ToListAsync();
        var remaining = allPlayers.Where(p => !p.IsIsolated).ToList();
        int remainingImpostors = remaining.Count(p => p.PlayerRole == "IMPOSTOR");
        int remainingScientists = remaining.Count(p => p.PlayerRole == "SCIENTIST");

        bool hasEnoughPlayersForRoleWin = allPlayers.Count >= 3;
        bool scientistsWin = board.StationProgress >= 100 || (hasEnoughPlayersForRoleWin && remainingImpostors == 0);
        bool isFinished = room.Status == "FINISHED" || scientistsWin;

        // Nếu kết thúc trận đấu (hết bộ đề hoặc Host dừng) mà Thanh Tiến Độ chưa đạt 100% -> Phe Nội Gián thắng!
        string? winner = scientistsWin ? "SCIENTISTS" : (isFinished ? "IMPOSTORS" : null);

        return new GameMatchStatus(
            Status: isFinished ? "FINISHED" : room.Status,
            CurrentSlideIndex: room.CurrentSlideIndex,
            TotalSlides: 0,
            IsFinished: isFinished,
            Winner: winner,
            Summary: new
            {
                board.StationProgress,
                RemainingScientists = remainingScientists,
                RemainingImpostors = remainingImpostors
            }
        );
    }

    public override async Task<object> GetClientGameStateAsync(Room room, Guid? requestingPlayerId, ApplicationDbContext db)
    {
        var state = await db.RoomGameStates
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.RoomId == room.Id && s.TeamOrGroup == "GLOBAL_MAP");

        var board = (state != null
            ? JsonSerializer.Deserialize<AmongUsBoardState>(state.BoardStateJson)
            : null) ?? new AmongUsBoardState();
        board.SystemShieldActive = board.SystemShieldUntilUtc.HasValue && board.SystemShieldUntilUtc.Value > DateTime.UtcNow;
        board.SignalJamActive = board.JamSignalUntilUtc.HasValue && board.JamSignalUntilUtc.Value > DateTime.UtcNow;

        var player = requestingPlayerId.HasValue
            ? await db.RoomPlayers.AsNoTracking().FirstOrDefaultAsync(p => p.Id == requestingPlayerId.Value)
            : null;

        var allPlayers = await db.RoomPlayers
            .AsNoTracking()
            .Where(p => p.RoomId == room.Id)
            .Select(p => new
            {
                p.Id,
                p.Nickname,
                p.AvatarUrl,
                p.IsIsolated,
                // Bảo mật vai trò trên Server: Ai chỉ biết vai trò của người đó (các Nội gián biết mặt nhau)
                Role = (player != null && (p.Id == player.Id || (player.PlayerRole == "IMPOSTOR" && p.PlayerRole == "IMPOSTOR")))
                    ? p.PlayerRole
                    : "UNKNOWN"
            })
            .ToListAsync();

        return new
        {
            GameType,
            RoomId = room.Id,
            PinCode = room.PinCode,
            Status = room.Status,
            Board = board,
            Players = allPlayers,
            MyRole = player?.PlayerRole ?? "SCIENTIST",
            MyActionPoints = player?.ActionPoints ?? 0,
            MyCombo = player?.CurrentCombo ?? 0,
            MyIsIsolated = player?.IsIsolated ?? false
        };
    }
}
