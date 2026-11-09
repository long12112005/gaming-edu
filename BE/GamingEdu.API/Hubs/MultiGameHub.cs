using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using GamingEdu.API.Data;
using GamingEdu.API.Models;
using GamingEdu.API.Services.GameEngines;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Hubs;

/// <summary>
/// SignalR Hub điều phối thời gian thực cho 7 chế độ Game Edu thế hệ mới:
/// HEX_CONQUEST, TOWER_DEFENSE, DRAGON_BOAT, RUNAWAY_TRAIN, ARTILLERY_DUEL, EDU_AMONG_US, QUIZ_BOMBERMAN.
/// Đảm bảo tính toán hoàn toàn phía Server (Server-authoritative) chống hack/gian lận.
/// </summary>
public class MultiGameHub : Hub
{
    private readonly ApplicationDbContext _db;
    private readonly IGameEngineFactory _engineFactory;
    private readonly ILogger<MultiGameHub> _logger;

    public MultiGameHub(
        ApplicationDbContext db,
        IGameEngineFactory engineFactory,
        ILogger<MultiGameHub> logger)
    {
        _db = db;
        _engineFactory = engineFactory;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogDebug("MultiGame client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogDebug("MultiGame client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Tham gia phòng game và nhận phân đội / vị trí.
    /// </summary>
    public async Task JoinGameRoom(string pinCode, Guid playerId, string? teamSide = null)
    {
        try
        {
            var room = await _db.Rooms
                .Include(r => r.Players)
                .FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng chơi với PIN {pinCode}.");

            var player = await ResolveOrCreatePlayerAsync(room, playerId, teamSide);
            playerId = player.Id;

            string groupName = $"multi_{pinCode}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            Context.Items["PinCode"] = pinCode;
            Context.Items["RoomId"] = room.Id;
            Context.Items["PlayerId"] = player.Id;

            var engine = _engineFactory.GetEngine(room.GameType);

            // Tự động khởi tạo bản đồ nếu chưa có, nhưng giữ nguyên trạng thái WAITING ở Sảnh chờ cho đến khi bấm Bắt Đầu Trận Đấu (giống Hải Tặc Tri Thức)
            var hasState = await _db.RoomGameStates.AnyAsync(s => s.RoomId == room.Id);
            var allPlayers = await _db.RoomPlayers.Where(p => p.RoomId == room.Id).ToListAsync();
            if (!hasState)
            {
                await engine.InitializeRoomAsync(room, allPlayers, _db);
            }

            var clientState = await engine.GetClientGameStateAsync(room, player.Id, _db);
            var rosterPayload = BuildRosterPayload(room, allPlayers);

            await Clients.Caller.SendAsync("JoinedGameSuccess", new
            {
                RoomId = room.Id,
                PinCode = room.PinCode,
                GameType = room.GameType,
                Status = room.Status,
                PlayerId = player.Id,
                Nickname = player.Nickname,
                TeamSide = player.TeamSide ?? "TEAM_A",
                PlayerRole = player.PlayerRole ?? "MEMBER",
                ActionPoints = player.ActionPoints,
                IsIsolated = player.IsIsolated,
                GameState = clientState,
                Roster = rosterPayload
            });

            await Clients.Group(groupName).SendAsync("PlayerJoined", new
            {
                PlayerId = player.Id,
                Nickname = player.Nickname,
                TeamSide = player.TeamSide
            });

            await Clients.Group(groupName).SendAsync("LobbyRosterUpdated", rosterPayload);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi JoinGameRoom tại PIN {PinCode}", pinCode);
            await Clients.Caller.SendAsync("GameError", ex.Message);
        }
    }

    /// <summary>
    /// Chủ phòng bắt đầu trận đấu đa game.
    /// Khởi tạo tài nguyên bản đồ, chia vai trò bí mật (Game 9), quái vật (Game 2), tàu xuất phát,...
    /// </summary>
    public async Task StartMatch(string pinCode)
    {
        try
        {
            var room = await _db.Rooms
                .Include(r => r.Players)
                .FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng {pinCode}.");

            room.Status = "PLAYING";
            room.StartTime = DateTime.UtcNow;
            room.EndTime = null;
            room.IsEarlyFinished = false;
            room.WinnerTeam = null;
            room.CurrentSlideIndex = 0;

            var players = await _db.RoomPlayers.Where(p => p.RoomId == room.Id).ToListAsync();
            var playerIds = players.Select(p => p.Id).ToList();

            // Xóa lịch sử trả lời câu hỏi và hành động của ván cũ (nếu Chơi Lại) để thí sinh có thể trả lời lại từ đầu
            var oldResponses = await _db.PlayerResponses.Where(pr => playerIds.Contains(pr.RoomPlayerId)).ToListAsync();
            if (oldResponses.Count > 0)
            {
                _db.PlayerResponses.RemoveRange(oldResponses);
            }

            var oldActions = await _db.RoomGameActions.Where(a => a.RoomId == room.Id).ToListAsync();
            if (oldActions.Count > 0)
            {
                _db.RoomGameActions.RemoveRange(oldActions);
            }

            foreach (var p in players)
            {
                p.TotalScore = 0;
                p.CurrentCombo = 0;
                p.MaxCombo = 0;
                p.IsIsolated = false;
            }

            var engine = _engineFactory.GetEngine(room.GameType);

            // Khởi tạo trạng thái ban đầu của từng loại Engine
            await engine.InitializeRoomAsync(room, players, _db);
            await _db.SaveChangesAsync();

            string groupName = $"multi_{pinCode}";
            var rosterPayload = BuildRosterPayload(room, players);

            await Clients.Group(groupName).SendAsync("MatchStarted", new
            {
                RoomId = room.Id,
                PinCode = room.PinCode,
                GameType = room.GameType,
                Status = room.Status,
                StartTime = room.StartTime,
                TotalPlayers = players.Count,
                Roster = rosterPayload
            });

            await Clients.Group(groupName).SendAsync("LobbyRosterUpdated", rosterPayload);

            // Gửi trạng thái game tương ứng
            var firstPlayerId = players.FirstOrDefault()?.Id;
            var updatedState = await engine.GetClientGameStateAsync(room, firstPlayerId, _db);
            await Clients.Group(groupName).SendAsync("GameStateUpdated", updatedState);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi StartMatch tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("GameError", ex.Message);
        }
    }

    /// <summary>
    /// Nộp câu trả lời câu hỏi Slide.
    /// LUẬT BẮT BUỘC: Chặn nộp trùng slide_id; chỉ nhận action_points khi trả lời ĐÚNG.
    /// </summary>
    public async Task SubmitSlideAnswer(string pinCode, Guid playerId, Guid slideId, string answerData, int responseTimeMs)
    {
        try
        {
            var room = await _db.Rooms
                .FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng {pinCode}.");

            if (room.Status == "WAITING")
            {
                room.Status = "PLAYING";
                room.StartTime ??= DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
            else if (room.Status != "PLAYING")
            {
                await Clients.Caller.SendAsync("SlideAnswerResult", new
                {
                    Success = false,
                    Message = "Phòng chơi đã kết thúc!"
                });
                return;
            }

            var player = await ResolveOrCreatePlayerAsync(room, playerId);

            var slide = await _db.Slides.FirstOrDefaultAsync(s => s.Id == slideId)
                ?? throw new KeyNotFoundException("Không tìm thấy câu hỏi!");

            var engine = _engineFactory.GetEngine(room.GameType);

            // Server-authoritative answer processing
            var result = await engine.ProcessSlideAnswerAsync(room, player, slide, answerData, responseTimeMs, _db);

            // Gửi kết quả riêng tư cho người trả lời
            await Clients.Caller.SendAsync("SlideAnswerResult", result);

            if (result.Success)
            {
                string groupName = $"multi_{pinCode}";

                // Thông báo công khai người chơi đã hoàn thành câu hỏi
                await Clients.Group(groupName).SendAsync("PlayerAnswered", new
                {
                    PlayerId = player.Id,
                    player.Nickname,
                    player.TeamSide,
                    player.TotalScore,
                    result.IsCorrect,
                    result.ActionPointsEarned,
                    result.TotalActionPoints,
                    player.CurrentCombo
                });

                // Cập nhật trạng thái game mới nhất
                var updatedState = await engine.GetClientGameStateAsync(room, player.Id, _db);
                await Clients.Group(groupName).SendAsync("GameStateUpdated", updatedState);

                // Nếu câu trả lời giúp kết thúc ván đấu (ví dụ Trạm Không Gian đạt 100%)
                if (room.Status == "FINISHED")
                {
                    var matchStatus = await engine.EvaluateMatchStatusAsync(room, _db);
                    var leaderboard = await BuildPostMatchLeaderboardAsync(room);
                    await Clients.Group(groupName).SendAsync("MatchEnded", new
                    {
                        RoomId = room.Id,
                        WinnerTeam = room.WinnerTeam ?? matchStatus.Winner,
                        Summary = matchStatus.Summary,
                        Leaderboard = leaderboard,
                        Message = $"Trận đấu đã kết thúc! Đội/Phe chiến thắng: {room.WinnerTeam ?? matchStatus.Winner}."
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi SubmitSlideAnswer tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("GameError", ex.Message);
        }
    }

    /// <summary>
    /// Thực hiện hành động game Server-authoritative (chiếm ô, xây tháp, chèo thuyền, ghép ray, bắn pháo, sửa/phá trạm, đặt bom).
    /// </summary>
    public async Task PerformGameAction(string pinCode, Guid playerId, string actionType, string payloadJson)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng {pinCode}.");

            var player = await ResolveOrCreatePlayerAsync(room, playerId);

            var engine = _engineFactory.GetEngine(room.GameType);

            // Thực thi hành động trên Engine
            var actionResult = await engine.PerformActionAsync(room, player, actionType, payloadJson, _db);

            // Trả kết quả cho người thực hiện
            await Clients.Caller.SendAsync("ActionResult", actionResult);

            if (actionResult.Success)
            {
                string groupName = $"multi_{pinCode}";

                // Phát sóng hành động cho cả phòng
                await Clients.Group(groupName).SendAsync("ActionExecuted", new
                {
                    PlayerId = player.Id,
                    player.Nickname,
                    player.TeamSide,
                    actionType,
                    actionResult.Result,
                    actionResult.Message,
                    actionResult.Data
                });

                // Cập nhật trạng thái bàn cờ / bản đồ
                var updatedState = await engine.GetClientGameStateAsync(room, player.Id, _db);
                await Clients.Group(groupName).SendAsync("GameStateUpdated", updatedState);

                // Nếu hành động dẫn đến kết thúc ván đấu
                if (actionResult.MatchEnded || room.Status == "FINISHED")
                {
                    var matchStatus = await engine.EvaluateMatchStatusAsync(room, _db);
                    var leaderboard = await BuildPostMatchLeaderboardAsync(room);
                    await Clients.Group(groupName).SendAsync("MatchEnded", new
                    {
                        RoomId = room.Id,
                        WinnerTeam = actionResult.WinnerTeam ?? room.WinnerTeam ?? matchStatus.Winner,
                        Summary = matchStatus.Summary,
                        Leaderboard = leaderboard,
                        Message = $"Trận đấu đã phân định thắng bại! Đội/Người chiến thắng: {actionResult.WinnerTeam ?? room.WinnerTeam ?? matchStatus.Winner}."
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi PerformGameAction tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("GameError", ex.Message);
        }
    }

    /// <summary>
    /// Kích hoạt kỹ năng đặc trưng của từng chế độ game.
    /// </summary>
    public async Task UseGameSkill(string pinCode, Guid playerId, string skillName, string payloadJson)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng {pinCode}.");

            var player = await ResolveOrCreatePlayerAsync(room, playerId);

            var engine = _engineFactory.GetEngine(room.GameType);
            var skillResult = await engine.UseSkillAsync(room, player, skillName, payloadJson, _db);

            await Clients.Caller.SendAsync("SkillResult", skillResult);

            if (skillResult.Success)
            {
                string groupName = $"multi_{pinCode}";

                await Clients.Group(groupName).SendAsync("SkillTriggered", new
                {
                    PlayerId = player.Id,
                    player.Nickname,
                    player.TeamSide,
                    skillName,
                    skillResult.Message,
                    skillResult.Data
                });

                var updatedState = await engine.GetClientGameStateAsync(room, player.Id, _db);
                await Clients.Group(groupName).SendAsync("GameStateUpdated", updatedState);

                if (room.Status == "FINISHED")
                {
                    var matchStatus = await engine.EvaluateMatchStatusAsync(room, _db);
                    var leaderboard = await BuildPostMatchLeaderboardAsync(room);
                    await Clients.Group(groupName).SendAsync("MatchEnded", new
                    {
                        RoomId = room.Id,
                        WinnerTeam = room.WinnerTeam ?? matchStatus.Winner,
                        Summary = matchStatus.Summary,
                        Leaderboard = leaderboard,
                        Message = $"Trận đấu đã kết thúc! Đội/Người chiến thắng: {room.WinnerTeam ?? matchStatus.Winner}."
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi UseGameSkill tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("GameError", ex.Message);
        }
    }

    /// <summary>
    /// Đổi phe (Team A <-> Team B) tại Sảnh chờ giống Hải Tặc Tri Thức.
    /// </summary>
    public async Task SwitchTeam(string pinCode, Guid playerId, string newTeamSide)
    {
        try
        {
            var room = await _db.Rooms
                .Include(r => r.Players)
                .FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng {pinCode}.");

            var player = await ResolveOrCreatePlayerAsync(room, playerId, newTeamSide);
            player.TeamSide = newTeamSide;
            await _db.SaveChangesAsync();

            string groupName = $"multi_{pinCode}";
            var allPlayers = await _db.RoomPlayers.Where(p => p.RoomId == room.Id).ToListAsync();
            var rosterPayload = BuildRosterPayload(room, allPlayers);

            await Clients.Caller.SendAsync("TeamSwitched", new
            {
                PlayerId = player.Id,
                TeamSide = player.TeamSide
            });

            await Clients.Group(groupName).SendAsync("LobbyRosterUpdated", rosterPayload);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi SwitchTeam tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("GameError", ex.Message);
        }
    }

    /// <summary>
    /// Chủ phòng đưa trận đấu về Sảnh chờ để chơi lại (Reset Match).
    /// </summary>
    public async Task ResetMatch(string pinCode)
    {
        try
        {
            var room = await _db.Rooms
                .Include(r => r.Players)
                .FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng {pinCode}.");

            room.Status = "WAITING";
            room.IsEarlyFinished = false;
            room.EndTime = null;
            room.WinnerTeam = null;
            room.CurrentSlideIndex = 0;

            var players = await _db.RoomPlayers.Where(p => p.RoomId == room.Id).ToListAsync();
            var playerIds = players.Select(p => p.Id).ToList();
            var oldResponses = await _db.PlayerResponses.Where(pr => playerIds.Contains(pr.RoomPlayerId)).ToListAsync();
            if (oldResponses.Count > 0)
            {
                _db.PlayerResponses.RemoveRange(oldResponses);
            }

            var oldActions = await _db.RoomGameActions.Where(a => a.RoomId == room.Id).ToListAsync();
            if (oldActions.Count > 0)
            {
                _db.RoomGameActions.RemoveRange(oldActions);
            }

            foreach (var p in players)
            {
                p.TotalScore = 0;
                p.CurrentCombo = 0;
                p.MaxCombo = 0;
                p.IsIsolated = false;
            }

            var engine = _engineFactory.GetEngine(room.GameType);
            await engine.InitializeRoomAsync(room, players, _db);
            await _db.SaveChangesAsync();

            string groupName = $"multi_{pinCode}";
            var rosterPayload = BuildRosterPayload(room, players);

            await Clients.Group(groupName).SendAsync("MatchReset", new
            {
                RoomId = room.Id,
                PinCode = room.PinCode,
                Status = room.Status,
                Roster = rosterPayload
            });

            await Clients.Group(groupName).SendAsync("LobbyRosterUpdated", rosterPayload);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi ResetMatch tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("GameError", ex.Message);
        }
    }

    /// <summary>
    /// Chủ phòng kết thúc sớm trận đấu.
    /// </summary>
    public async Task EndMatchEarly(string pinCode)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng {pinCode}.");

            room.Status = "FINISHED";
            room.IsEarlyFinished = true;
            room.EndTime = DateTime.UtcNow;

            var engine = _engineFactory.GetEngine(room.GameType);
            var matchStatus = await engine.EvaluateMatchStatusAsync(room, _db);
            var leaderboard = await BuildPostMatchLeaderboardAsync(room);

            await _db.SaveChangesAsync();

            string groupName = $"multi_{pinCode}";
            await Clients.Group(groupName).SendAsync("MatchEndedEarly", new
            {
                RoomId = room.Id,
                EndTime = room.EndTime,
                Winner = matchStatus.Winner,
                matchStatus.Summary,
                Leaderboard = leaderboard,
                Message = "Chủ phòng đã bấm kết thúc trận đấu sớm!"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi EndMatchEarly tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("GameError", ex.Message);
        }
    }

    /// <summary>
    /// Khôi phục kết nối và trạng thái khi rớt mạng hoặc reload trang.
    /// </summary>
    public async Task ReconnectRoom(string pinCode, Guid playerId)
    {
        try
        {
            var room = await _db.Rooms
                .Include(r => r.Players)
                .FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng {pinCode}.");

            var player = await ResolveOrCreatePlayerAsync(room, playerId);
            playerId = player.Id;

            string groupName = $"multi_{pinCode}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            Context.Items["PinCode"] = pinCode;
            Context.Items["RoomId"] = room.Id;
            Context.Items["PlayerId"] = player.Id;

            var engine = _engineFactory.GetEngine(room.GameType);

            var hasState = await _db.RoomGameStates.AnyAsync(s => s.RoomId == room.Id);
            var allPlayers = await _db.RoomPlayers.Where(p => p.RoomId == room.Id).ToListAsync();
            if (!hasState)
            {
                await engine.InitializeRoomAsync(room, allPlayers, _db);
            }

            var clientState = await engine.GetClientGameStateAsync(room, player.Id, _db);
            var rosterPayload = BuildRosterPayload(room, allPlayers);

            await Clients.Caller.SendAsync("ReconnectedSuccess", new
            {
                RoomId = room.Id,
                PinCode = room.PinCode,
                GameType = room.GameType,
                Status = room.Status,
                PlayerId = player.Id,
                player.Nickname,
                player.TeamSide,
                player.PlayerRole,
                player.ActionPoints,
                player.IsIsolated,
                GameState = clientState,
                Roster = rosterPayload
            });

            await Clients.Group(groupName).SendAsync("PlayerReconnected", new
            {
                PlayerId = player.Id,
                player.Nickname
            });
            await Clients.Group(groupName).SendAsync("LobbyRosterUpdated", rosterPayload);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi ReconnectRoom tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("GameError", ex.Message);
        }
    }

    private static object BuildRosterPayload(Room room, List<RoomPlayer> players)
    {
        var teamA = players
            .Where(p => (p.TeamSide ?? "TEAM_A") == "TEAM_A")
            .Select(p => new { id = p.Id, nickname = p.Nickname, teamSide = "TEAM_A", totalScore = p.TotalScore, actionPoints = p.ActionPoints, isIsolated = p.IsIsolated })
            .ToList();
        var teamB = players
            .Where(p => p.TeamSide == "TEAM_B")
            .Select(p => new { id = p.Id, nickname = p.Nickname, teamSide = "TEAM_B", totalScore = p.TotalScore, actionPoints = p.ActionPoints, isIsolated = p.IsIsolated })
            .ToList();
        var all = players
            .OrderByDescending(p => p.TotalScore)
            .Select(p => new { id = p.Id, nickname = p.Nickname, teamSide = p.TeamSide ?? "TEAM_A", totalScore = p.TotalScore, actionPoints = p.ActionPoints, isIsolated = p.IsIsolated })
            .ToList();

        return new
        {
            roomId = room.Id,
            pinCode = room.PinCode,
            status = room.Status,
            teamACount = teamA.Count,
            teamBCount = teamB.Count,
            teamAPlayers = teamA,
            teamBPlayers = teamB,
            players = all
        };
    }

    /// <summary>
    /// Xây dựng Bảng Tổng Kết Chung Cuối Trận (Áp dụng cho cả 7 Game):
    /// - Thứ hạng & Danh hiệu (Top 1, Top 2, Top 3 toàn phòng & theo đội)
    /// - Chỉ số Học thuật (Đúng/Sai, % Chính xác, Thời gian phản hồi TB ms, Chuỗi Max Combo)
    /// - Chỉ số Đóng góp Chiến thuật đặc trưng theo từng chế độ chơi.
    /// </summary>
    private async Task<List<object>> BuildPostMatchLeaderboardAsync(Room room)
    {
        var players = await _db.RoomPlayers
            .AsNoTracking()
            .Where(p => p.RoomId == room.Id)
            .OrderByDescending(p => p.TotalScore)
            .ThenByDescending(p => p.MaxCombo)
            .ToListAsync();

        var playerIds = players.Select(p => p.Id).ToList();
        var responses = await _db.PlayerResponses
            .AsNoTracking()
            .Where(r => playerIds.Contains(r.RoomPlayerId))
            .ToListAsync();

        var actions = await _db.RoomGameActions
            .AsNoTracking()
            .Where(a => a.RoomId == room.Id)
            .ToListAsync();

        var leaderboard = new List<object>();
        var teamRankCounters = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        for (int i = 0; i < players.Count; i++)
        {
            var p = players[i];
            int overallRank = i + 1;
            string teamKey = p.TeamSide ?? "TEAM_A";
            teamRankCounters[teamKey] = teamRankCounters.GetValueOrDefault(teamKey, 0) + 1;
            int teamRank = teamRankCounters[teamKey];

            var pResponses = responses.Where(r => r.RoomPlayerId == p.Id).ToList();
            int correctCount = pResponses.Count(r => r.IsCorrect == true || r.ScoreAwarded > 0);
            int wrongCount = pResponses.Count(r => r.IsCorrect != true && r.ScoreAwarded <= 0);
            int totalAnswered = pResponses.Count;
            double accuracyPercent = totalAnswered > 0 ? Math.Round(correctCount * 100.0 / totalAnswered, 1) : 0;
            int avgResponseTimeMs = totalAnswered > 0 ? (int)Math.Round(pResponses.Average(r => r.ResponseTimeMs ?? 0)) : 0;

            var pActions = actions.Where(a => a.PlayerId == p.Id).ToList();
            string tacticalLabel;
            string tacticalValue;

            switch ((room.GameType ?? "HEX_CONQUEST").ToUpperInvariant())
            {
                case "HEX_CONQUEST":
                    int hexClaimed = pActions.Count(a => a.ActionType == "CLAIM_HEX" || a.ActionType == "SKILL_PARACHUTE" || a.ActionType == "SKILL_COLOR_BOMB");
                    tacticalLabel = "Số ô lục giác đã chiếm";
                    tacticalValue = $"{hexClaimed} ô lãnh thổ";
                    break;

                case "TOWER_DEFENSE":
                    int goldEarned = correctCount * 125;
                    int towersBuilt = pActions.Count(a => a.ActionType == "BUILD_TOWER" || a.ActionType == "UPGRADE_TOWER");
                    int creepsSpawned = pActions.Count(a => a.ActionType == "SPAWN_CREEP");
                    tacticalLabel = "Vàng kiếm được & Tháp/Quái";
                    tacticalValue = $"{goldEarned} Vàng • {towersBuilt} Tháp / {creepsSpawned} Quái";
                    break;

                case "DRAGON_BOAT":
                    int strokes = pActions.Count(a => a.ActionType == "ROW_BOAT");
                    int meters = strokes * 15;
                    tacticalLabel = "Nhịp chèo đóng góp";
                    tacticalValue = $"{strokes} nhịp (+{meters}m)";
                    break;

                case "RUNAWAY_TRAIN":
                    int tracks = pActions.Count(a => a.ActionType == "PLACE_TRACK");
                    tacticalLabel = "Mảnh đường ray lắp đúng";
                    tacticalValue = $"{tracks} mảnh ray";
                    break;

                case "ARTILLERY_DUEL":
                    int totalShots = pActions.Count(a => a.ActionType == "FIRE_CANNON" || a.ActionType == "SKILL_CLUSTER");
                    int hits = pActions.Count(a => a.ActionResult == "CRITICAL_HIT" || a.ActionResult == "SPLASH_HIT" || a.ActionType == "SKILL_CLUSTER");
                    tacticalLabel = "Phát bắn trúng đích";
                    tacticalValue = $"{hits}/{totalShots} phát trúng";
                    break;

                case "EDU_AMONG_US":
                    bool isImpostor = string.Equals(p.PlayerRole, "IMPOSTOR", StringComparison.OrdinalIgnoreCase);
                    if (isImpostor)
                    {
                        int sabotages = pActions.Count(a => a.ActionType == "SABOTAGE" || a.ActionType == "SKILL_SABOTAGE");
                        tacticalLabel = "Số lần phá hoại thành công";
                        tacticalValue = $"{sabotages} lần phá hoại (Nội gián)";
                    }
                    else
                    {
                        int repairs = correctCount + pActions.Count(a => a.ActionType == "REPAIR_TASK");
                        tacticalLabel = "Tiến độ sửa chữa trạm";
                        tacticalValue = $"+{repairs * 3}% năng lượng (Nhà KH)";
                    }
                    break;

                case "QUIZ_BOMBERMAN":
                    int bombs = pActions.Count(a => a.ActionType == "PLANT_BOMB");
                    int bombHits = pActions.Count(a => a.ActionType == "PLANT_BOMB" && a.ActionResult == "EXPLODED_HIT");
                    tacticalLabel = "Đặt bom & Phá gạch/Hạ địch";
                    tacticalValue = $"{bombs} quả bom • {bombHits} lần nổ trúng";
                    break;

                default:
                    tacticalLabel = "Hành động chiến thuật";
                    tacticalValue = $"{pActions.Count} lượt";
                    break;
            }

            string titleBadge = overallRank switch
            {
                1 => "Quán Quân Toàn Phòng (MVP)",
                2 => "Á Quân Toàn Phòng",
                3 => "Hạng 3 Toàn Phòng",
                _ => teamRank == 1 ? "Thủ Lĩnh Đội" : "Chiến Binh Tri Thức"
            };

            leaderboard.Add(new
            {
                rank = overallRank,
                teamRank,
                titleBadge,
                playerId = p.Id,
                nickname = p.Nickname,
                teamSide = p.TeamSide ?? "TEAM_A",
                playerRole = p.PlayerRole ?? "MEMBER",
                totalScore = p.TotalScore,
                correctCount,
                wrongCount,
                totalAnswered,
                accuracyPercent,
                avgResponseTimeMs,
                maxCombo = Math.Max(p.MaxCombo, p.CurrentCombo),
                tacticalContributionLabel = tacticalLabel,
                tacticalContributionValue = tacticalValue
            });
        }

        return leaderboard;
    }

    private async Task<RoomPlayer> ResolveOrCreatePlayerAsync(Room room, Guid playerId, string? preferredTeamSide = null)
    {
        RoomPlayer? player = null;

        if (playerId != Guid.Empty)
        {
            player = await _db.RoomPlayers.FirstOrDefaultAsync(p => p.Id == playerId && p.RoomId == room.Id);
        }

        var currentUserId = GetCurrentUserId();
        if (player == null && currentUserId.HasValue)
        {
            player = await _db.RoomPlayers.FirstOrDefaultAsync(p => p.RoomId == room.Id && p.UserId == currentUserId.Value);
        }

        // Nếu vẫn chưa tìm thấy nhưng phòng chỉ có 1 người hoặc kết nối hiện tại đã lưu PlayerId trong Context.Items
        if (player == null && Context.Items.TryGetValue("PlayerId", out var ctxPlayerIdObj) && ctxPlayerIdObj is Guid ctxPlayerId)
        {
            player = await _db.RoomPlayers.FirstOrDefaultAsync(p => p.Id == ctxPlayerId && p.RoomId == room.Id);
        }

        if (player == null)
        {
            var existingPlayers = await _db.RoomPlayers.Where(p => p.RoomId == room.Id).ToListAsync();
            int teamACount = existingPlayers.Count(p => p.TeamSide == "TEAM_A");
            int teamBCount = existingPlayers.Count(p => p.TeamSide == "TEAM_B");
            string assignedTeam = !string.IsNullOrEmpty(preferredTeamSide)
                ? preferredTeamSide
                : (teamACount <= teamBCount ? "TEAM_A" : "TEAM_B");

            string nickname = "Chiến Binh";
            if (currentUserId.HasValue)
            {
                var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId.Value);
                if (user != null && !string.IsNullOrWhiteSpace(user.Nickname))
                {
                    nickname = user.Nickname;
                }
            }
            else if (existingPlayers.Count > 0)
            {
                nickname = $"Chiến Binh #{existingPlayers.Count + 1}";
            }

            int initialActionPoints = room.GameType switch
            {
                "TOWER_DEFENSE" => 150,
                "RUNAWAY_TRAIN" => 3,
                "QUIZ_BOMBERMAN" => 1,
                _ => 0
            };

            string initialRole = room.GameType == "EDU_AMONG_US" ? "SCIENTIST" : "MEMBER";

            player = new RoomPlayer
            {
                Id = Guid.NewGuid(),
                RoomId = room.Id,
                UserId = currentUserId,
                Nickname = nickname,
                TeamSide = assignedTeam,
                PlayerRole = initialRole,
                ActionPoints = initialActionPoints,
                TotalScore = 0,
                JoinedAt = DateTime.UtcNow
            };

            _db.RoomPlayers.Add(player);
            await _db.SaveChangesAsync();
        }
        else
        {
            bool changed = false;
            if (!string.IsNullOrEmpty(preferredTeamSide) && player.TeamSide != preferredTeamSide)
            {
                player.TeamSide = preferredTeamSide;
                changed = true;
            }
            else if (string.IsNullOrEmpty(player.TeamSide))
            {
                var existingPlayers = await _db.RoomPlayers.Where(p => p.RoomId == room.Id && p.Id != player.Id).ToListAsync();
                int teamACount = existingPlayers.Count(p => p.TeamSide == "TEAM_A");
                int teamBCount = existingPlayers.Count(p => p.TeamSide == "TEAM_B");
                player.TeamSide = teamACount <= teamBCount ? "TEAM_A" : "TEAM_B";
                changed = true;
            }

            if (changed)
            {
                await _db.SaveChangesAsync();
            }
        }

        return player;
    }

    private Guid? GetCurrentUserId()
    {
        var idStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? Context.User?.FindFirst("sub")?.Value;

        if (Guid.TryParse(idStr, out var id)) return id;
        return null;
    }
}

