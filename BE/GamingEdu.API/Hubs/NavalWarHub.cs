using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Hubs;

/// <summary>
/// SignalR Hub quản lý phòng chơi Hải Chiến Tri Thức theo thời gian thực.
/// Hỗ trợ chia nhóm SignalR theo phòng (naval_{pinCode}) và theo đội (naval_{pinCode}_{teamSide}).
/// Bảo mật tọa độ tàu và kỹ năng Radar giữa hai đội.
/// </summary>
public class NavalWarHub : Hub
{
    private readonly ApplicationDbContext _db;
    private readonly INavalMapService _mapService;
    private readonly INavalCombatService _combatService;
    private readonly ILogger<NavalWarHub> _logger;
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, string> _playerConnections = new();

    public NavalWarHub(
        ApplicationDbContext db,
        INavalMapService mapService,
        INavalCombatService combatService,
        ILogger<NavalWarHub> logger)
    {
        _db = db;
        _mapService = mapService;
        _combatService = combatService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogDebug("Naval client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogDebug("Naval client disconnected: {ConnectionId}", Context.ConnectionId);
        if (Context.Items.TryGetValue("PlayerId", out var pidObj) && pidObj is Guid playerId)
        {
            _playerConnections.TryRemove(playerId, out _);
        }
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Tham gia nhóm sảnh chờ của phòng ngay khi mở trang để nhận danh sách thuyền viên theo thời gian thực.
    /// </summary>
    public async Task EnterNavalLobby(string pinCode)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode);
            if (room == null) return;

            string roomGroup = $"naval_{pinCode}";
            await Groups.AddToGroupAsync(Context.ConnectionId, roomGroup);
            Context.Items["PinCode"] = pinCode;
            Context.Items["RoomId"] = room.Id;
            Context.Items["RoomGroup"] = roomGroup;

            await SendLobbyStateToCallerAsync(room.Id, pinCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi EnterNavalLobby tại phòng {PinCode}", pinCode);
        }
    }

    /// <summary>
    /// Người chơi tham gia phòng Hải Chiến và phân chia vào đội TEAM_A hoặc TEAM_B.
    /// Giới hạn tối đa 25 người/đội.
    /// </summary>
    public async Task JoinNavalRoom(string pinCode, Guid playerId, string teamSide, string? nickname = null)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng chơi với mã PIN {pinCode}.");

            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? Context.User?.FindFirst("sub")?.Value;
            Guid? userId = null;
            if (Guid.TryParse(userIdClaim, out var parsedUserId))
            {
                userId = parsedUserId;
            }

            bool isHostUser = (userId.HasValue && userId.Value == room.HostId);
            bool isObserverMode = (teamSide?.Trim().ToUpper() == "HOST") || (isHostUser && string.IsNullOrWhiteSpace(teamSide));
            string roomGroup = $"naval_{pinCode}";

            // ── NẾU LÀ CHỦ PHÒNG (TRỌNG TÀI QUAN SÁT TRUNG LẬP) ──
            if (isObserverMode)
            {
                string hostGroup = $"naval_{pinCode}_HOST";
                await Groups.AddToGroupAsync(Context.ConnectionId, roomGroup);
                await Groups.AddToGroupAsync(Context.ConnectionId, hostGroup);

                Context.Items["RoomId"] = room.Id;
                Context.Items["PinCode"] = pinCode;
                Context.Items["IsHost"] = true;
                Context.Items["TeamSide"] = "HOST";
                Context.Items["RoomGroup"] = roomGroup;
                Context.Items["HostGroup"] = hostGroup;

                _logger.LogInformation("Host đã gia nhập phòng Hải Chiến {PinCode} với tư cách trọng tài quan sát trung lập.", pinCode);

                await Clients.Caller.SendAsync("NavalRoomJoined", new
                {
                    RoomId = room.Id,
                    PinCode = room.PinCode,
                    IsHost = true,
                    TeamSide = "HOST",
                    Nickname = "Chủ Phòng (Trọng Tài)",
                    MapSize = room.MapSize,
                    IsMatchStarted = room.Status == "PLAYING" || room.Status == "FINISHED",
                    IsGameOver = room.Status == "FINISHED"
                });

                await BroadcastLobbyStateAsync(room.Id, pinCode);
                return;
            }

            // ── NẾU LÀ NGƯỜI CHƠI (CHỌN PHE TEAM_A HOẶC TEAM_B) ──
            string normalizedTeam = (teamSide?.Trim().ToUpper() == "TEAM_B") ? "TEAM_B" : "TEAM_A";

            // Tìm player theo playerId nếu có
            RoomPlayer? player = null;
            if (playerId != Guid.Empty)
            {
                player = await _db.RoomPlayers.FirstOrDefaultAsync(rp => rp.Id == playerId && rp.RoomId == room.Id);
            }

            if (userId.HasValue && player == null)
            {
                player = await _db.RoomPlayers.FirstOrDefaultAsync(rp => rp.UserId == userId.Value && rp.RoomId == room.Id);
            }

            // Kiểm tra giới hạn 25 người mỗi đội nếu người chơi chưa thuộc đội này
            if (player == null || player.TeamSide != normalizedTeam)
            {
                int currentTeamCount = await _db.RoomPlayers.CountAsync(rp => rp.RoomId == room.Id && rp.TeamSide == normalizedTeam);
                if (currentTeamCount >= 25)
                {
                    throw new InvalidOperationException($"{(normalizedTeam == "TEAM_A" ? "Hạm Đội Lam" : "Hạm Đội Xích")} đã đủ tối đa 25 thuyền viên.");
                }
            }

            // Xác định nickname hợp lệ
            string effectiveNickname = !string.IsNullOrWhiteSpace(nickname) ? nickname.Trim() : "Thuyền Trưởng";
            if (userId.HasValue)
            {
                var userObj = await _db.Users.FindAsync(userId.Value);
                if (userObj != null && !string.IsNullOrWhiteSpace(userObj.Nickname))
                {
                    effectiveNickname = userObj.Nickname;
                }
            }
            else if (string.IsNullOrWhiteSpace(nickname) && playerId != Guid.Empty)
            {
                effectiveNickname = $"Thuyền Viên {playerId.ToString()[..4].ToUpper()}";
            }

            // Nếu người chơi chưa có bản ghi trong phòng, tạo mới
            if (player == null)
            {
                player = new RoomPlayer
                {
                    Id = (playerId != Guid.Empty ? playerId : Guid.NewGuid()),
                    RoomId = room.Id,
                    UserId = userId,
                    Nickname = effectiveNickname,
                    TeamSide = normalizedTeam,
                    TotalScore = 0,
                    JoinedAt = DateTime.UtcNow
                };
                _db.RoomPlayers.Add(player);
                await _db.SaveChangesAsync();
            }
            else
            {
                player.TeamSide = normalizedTeam;
                if (!string.IsNullOrWhiteSpace(nickname))
                {
                    player.Nickname = nickname.Trim();
                }
                await _db.SaveChangesAsync();
            }

            // Lưu connection mapping
            _playerConnections[player.Id] = Context.ConnectionId;

            string teamGroup = $"naval_{pinCode}_{normalizedTeam}";

            // Rời nhóm đội cũ nếu trước đó đã chuyển đội
            if (Context.Items.TryGetValue("TeamGroup", out var prevTeamGroup) &&
                prevTeamGroup is string oldGroup && oldGroup != teamGroup)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, oldGroup);
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, roomGroup);
            await Groups.AddToGroupAsync(Context.ConnectionId, teamGroup);

            // Lưu trữ thông tin kết nối vào context
            Context.Items["RoomId"] = room.Id;
            Context.Items["PinCode"] = pinCode;
            Context.Items["PlayerId"] = player.Id;
            Context.Items["PlayerNickname"] = player.Nickname;
            Context.Items["TeamSide"] = normalizedTeam;
            Context.Items["IsHost"] = isHostUser;
            Context.Items["RoomGroup"] = roomGroup;
            Context.Items["TeamGroup"] = teamGroup;

            _logger.LogInformation("Người chơi '{Nickname}' (Host={IsHost}) đã tham gia phòng Hải Chiến {PinCode} vào phe {TeamSide}",
                player.Nickname, isHostUser, pinCode, normalizedTeam);

            // Phản hồi riêng cho người chơi
            await Clients.Caller.SendAsync("NavalRoomJoined", new
            {
                RoomId = room.Id,
                PinCode = room.PinCode,
                PlayerId = player.Id,
                Nickname = player.Nickname,
                TeamSide = normalizedTeam,
                IsHost = isHostUser,
                MapSize = room.MapSize
            });

            // Đồng bộ danh sách người chơi trong sảnh chờ cho toàn bộ phòng
            await BroadcastLobbyStateAsync(room.Id, pinCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi JoinNavalRoom tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("NavalError", ex.Message);
        }
    }

    /// <summary>
    /// Phát sóng danh sách người chơi chia theo 2 phe trong sảnh chờ tới toàn bộ kết nối trong phòng.
    /// </summary>
    private async Task BroadcastLobbyStateAsync(Guid roomId, string pinCode)
    {
        var players = await _db.RoomPlayers
            .Where(rp => rp.RoomId == roomId && !string.IsNullOrEmpty(rp.TeamSide) && rp.TeamSide != "HOST")
            .OrderBy(rp => rp.JoinedAt)
            .Select(rp => new
            {
                PlayerId = rp.Id,
                Nickname = rp.Nickname,
                AvatarUrl = rp.AvatarUrl,
                TeamSide = rp.TeamSide,
                JoinedAt = rp.JoinedAt
            })
            .ToListAsync();

        var teamAPlayers = players.Where(p => p.TeamSide == "TEAM_A").ToList();
        var teamBPlayers = players.Where(p => p.TeamSide == "TEAM_B").ToList();

        await Clients.Group($"naval_{pinCode}").SendAsync("NavalLobbyState", new
        {
            PinCode = pinCode,
            TotalPlayers = players.Count,
            TeamAPlayers = teamAPlayers,
            TeamBPlayers = teamBPlayers,
            TeamACount = teamAPlayers.Count,
            TeamBCount = teamBPlayers.Count
        });
    }

    private async Task SendLobbyStateToCallerAsync(Guid roomId, string pinCode)
    {
        var players = await _db.RoomPlayers
            .Where(rp => rp.RoomId == roomId && !string.IsNullOrEmpty(rp.TeamSide) && rp.TeamSide != "HOST")
            .OrderBy(rp => rp.JoinedAt)
            .Select(rp => new
            {
                PlayerId = rp.Id,
                Nickname = rp.Nickname,
                AvatarUrl = rp.AvatarUrl,
                TeamSide = rp.TeamSide,
                JoinedAt = rp.JoinedAt
            })
            .ToListAsync();

        var teamAPlayers = players.Where(p => p.TeamSide == "TEAM_A").ToList();
        var teamBPlayers = players.Where(p => p.TeamSide == "TEAM_B").ToList();

        await Clients.Caller.SendAsync("NavalLobbyState", new
        {
            PinCode = pinCode,
            TotalPlayers = players.Count,
            TeamAPlayers = teamAPlayers,
            TeamBPlayers = teamBPlayers,
            TeamACount = teamAPlayers.Count,
            TeamBCount = teamBPlayers.Count
        });
    }

    /// <summary>
    /// Lấy danh sách người chơi trong sảnh chờ của 2 đội
    /// </summary>
    public async Task GetLobbyState(string pinCode)
    {
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode);
        if (room != null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"naval_{pinCode}");
            await SendLobbyStateToCallerAsync(room.Id, pinCode);
        }
    }

    /// <summary>
    /// Người chơi đổi phe giữa TEAM_A và TEAM_B trước khi trận đấu bắt đầu (giới hạn 25 người/đội).
    /// </summary>
    public async Task SwitchTeam(string pinCode, Guid playerId, string newTeamSide)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng {pinCode}.");

            if (room.Status != "WAITING")
            {
                throw new InvalidOperationException("Không thể đổi phe khi trận đấu đã bắt đầu.");
            }

            string normalizedTeam = (newTeamSide?.Trim().ToUpper() == "TEAM_B") ? "TEAM_B" : "TEAM_A";
            var player = await _db.RoomPlayers.FirstOrDefaultAsync(rp => rp.Id == playerId && rp.RoomId == room.Id)
                ?? throw new KeyNotFoundException("Không tìm thấy thông tin người chơi.");

            if (player.TeamSide == normalizedTeam)
            {
                return; // Đã ở đội này rồi
            }

            // Kiểm tra giới hạn tối đa 25 người ở đội muốn chuyển tới
            int targetTeamCount = await _db.RoomPlayers.CountAsync(rp => rp.RoomId == room.Id && rp.TeamSide == normalizedTeam);
            if (targetTeamCount >= 25)
            {
                throw new InvalidOperationException($"{(normalizedTeam == "TEAM_A" ? "Hạm Đội Lam" : "Hạm Đội Xích")} đã đủ tối đa 25 thuyền viên.");
            }

            string oldTeam = player.TeamSide ?? "TEAM_A";
            string oldTeamGroup = $"naval_{pinCode}_{oldTeam}";
            string newTeamGroup = $"naval_{pinCode}_{normalizedTeam}";

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, oldTeamGroup);
            await Groups.AddToGroupAsync(Context.ConnectionId, newTeamGroup);

            player.TeamSide = normalizedTeam;
            await _db.SaveChangesAsync();

            _playerConnections[player.Id] = Context.ConnectionId;

            Context.Items["TeamSide"] = normalizedTeam;
            Context.Items["TeamGroup"] = newTeamGroup;

            await Clients.Caller.SendAsync("NavalTeamSwitched", new
            {
                PlayerId = player.Id,
                TeamSide = normalizedTeam
            });

            await BroadcastLobbyStateAsync(room.Id, pinCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi SwitchTeam tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("NavalError", ex.Message);
        }
    }

    /// <summary>
    /// Người chơi tự rời khỏi phòng Hải Chiến.
    /// </summary>
    public async Task LeaveNavalRoom(string pinCode, Guid playerId)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode);
            if (room == null) return;

            var player = await _db.RoomPlayers.FirstOrDefaultAsync(rp => rp.Id == playerId && rp.RoomId == room.Id);
            if (player != null)
            {
                string oldTeam = player.TeamSide ?? "TEAM_A";
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"naval_{pinCode}_{oldTeam}");
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"naval_{pinCode}");

                player.TeamSide = null;
                await _db.SaveChangesAsync();

                await Clients.Group($"naval_{pinCode}").SendAsync("NavalPlayerLeft", new
                {
                    PlayerId = player.Id,
                    Nickname = player.Nickname
                });

                await BroadcastLobbyStateAsync(room.Id, pinCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi LeaveNavalRoom tại phòng {PinCode}", pinCode);
        }
    }

    /// <summary>
    /// Khôi phục trạng thái tác chiến khi người chơi tải lại trang (F5 Reconnect).
    /// BẢO MẬT: Chỉ trả về tọa độ tàu của chính đội người chơi và danh sách các ô đã bắn ở đối phương.
    /// </summary>
    public async Task ReconnectRoom(string pinCode, Guid playerId)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng chơi với mã PIN {pinCode}.");

            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? Context.User?.FindFirst("sub")?.Value;
            Guid? userId = null;
            if (Guid.TryParse(userIdClaim, out var parsedUserId))
            {
                userId = parsedUserId;
            }

            string roomGroup = $"naval_{pinCode}";

            // Kiểm tra nếu là Host kết nối lại (F5 Reconnect)
            bool isHost = (userId.HasValue && userId.Value == room.HostId);
            if (isHost)
            {
                string hostGroup = $"naval_{pinCode}_HOST";
                await Groups.AddToGroupAsync(Context.ConnectionId, roomGroup);
                await Groups.AddToGroupAsync(Context.ConnectionId, hostGroup);

                Context.Items["RoomId"] = room.Id;
                Context.Items["PinCode"] = pinCode;
                Context.Items["IsHost"] = true;
                Context.Items["TeamSide"] = "HOST";
                Context.Items["RoomGroup"] = roomGroup;
                Context.Items["HostGroup"] = hostGroup;

                object? hostSpectator = null;
                if (room.Status == "PLAYING" || room.Status == "FINISHED")
                {
                    hostSpectator = await GetHostSpectatorStateAsync(room.Id, pinCode, room.MapSize);
                }

                var leaderboardHost = await _combatService.GetPlayerContributionsAsync(room.Id);
                NavalMatchResultDto? matchResultHost = null;
                if (room.Status == "FINISHED")
                {
                    matchResultHost = await _combatService.EvaluateMatchResultAsync(room.Id, room.IsEarlyFinished);
                }

                await Clients.Caller.SendAsync("NavalReconnected", new
                {
                    RoomId = room.Id,
                    PinCode = room.PinCode,
                    IsHost = true,
                    TeamSide = "HOST",
                    Nickname = "Chủ Phòng (Trọng Tài)",
                    MapSize = room.MapSize,
                    IsMatchStarted = room.Status == "PLAYING" || room.Status == "FINISHED",
                    IsGameOver = room.Status == "FINISHED",
                    SpectatorState = hostSpectator,
                    Leaderboard = leaderboardHost,
                    MatchResult = matchResultHost
                });

                await BroadcastLobbyStateAsync(room.Id, pinCode);
                return;
            }

            RoomPlayer? player = null;
            if (playerId != Guid.Empty)
            {
                player = await _db.RoomPlayers.FirstOrDefaultAsync(rp => rp.Id == playerId && rp.RoomId == room.Id);
            }

            if (userId.HasValue && player == null)
            {
                player = await _db.RoomPlayers.FirstOrDefaultAsync(rp => rp.UserId == userId.Value && rp.RoomId == room.Id);
            }

            if (player == null)
            {
                player = new RoomPlayer
                {
                    Id = (playerId != Guid.Empty ? playerId : Guid.NewGuid()),
                    RoomId = room.Id,
                    Nickname = "Thuyền Trưởng",
                    TeamSide = null,
                    TotalScore = 0,
                    JoinedAt = DateTime.UtcNow
                };
                _db.RoomPlayers.Add(player);
                await _db.SaveChangesAsync();
            }

            _playerConnections[player.Id] = Context.ConnectionId;

            await Groups.AddToGroupAsync(Context.ConnectionId, roomGroup);

            Context.Items["RoomId"] = room.Id;
            Context.Items["PinCode"] = pinCode;
            Context.Items["PlayerId"] = player.Id;
            Context.Items["PlayerNickname"] = player.Nickname;
            Context.Items["RoomGroup"] = roomGroup;

            string? normalizedTeam = player.TeamSide;
            if (!string.IsNullOrEmpty(normalizedTeam))
            {
                string teamGroup = $"naval_{pinCode}_{normalizedTeam}";
                await Groups.AddToGroupAsync(Context.ConnectionId, teamGroup);
                Context.Items["TeamSide"] = normalizedTeam;
                Context.Items["TeamGroup"] = teamGroup;
            }

            // Lấy danh sách tàu chiến của RIÊNG ĐỘI MÌNH (bảo mật tuyệt đối tọa độ tàu địch)
            List<object> myShipsDto = new();
            if (!string.IsNullOrEmpty(normalizedTeam))
            {
                var myShips = await _db.NavalShips
                    .Where(s => s.RoomId == room.Id && s.TeamSide == normalizedTeam)
                    .ToListAsync();

                foreach (var ship in myShips)
                {
                    var coords = JsonSerializer.Deserialize<List<ShipCoordinate>>(ship.Coordinates) ?? [];
                    myShipsDto.Add(new
                    {
                        Id = ship.Id,
                        ShipType = ship.ShipType,
                        Coordinates = coords,
                        IsSunk = ship.IsSunk
                    });
                }
            }

            // Lấy danh sách các ô đã bắn của đội mình vào hải phận đối phương
            List<object> enemyShotsDto = new();
            if (!string.IsNullOrEmpty(normalizedTeam))
            {
                var shots = await _db.NavalActions
                    .Where(a => a.RoomId == room.Id &&
                                a.AttackerTeam == normalizedTeam &&
                                (a.ActionType == "NORMAL_SHOT" || a.ActionType == "PRECISION_SHOT"))
                    .OrderBy(a => a.CreatedAt)
                    .ToListAsync();

                foreach (var shot in shots)
                {
                    enemyShotsDto.Add(new
                    {
                        TargetRow = shot.TargetRow,
                        TargetCol = shot.TargetCol,
                        Result = shot.Result,
                        SunkShipType = shot.SunkShipType
                    });
                }
            }

            // Thống kê số tàu còn lại của 2 đội
            int teamAShipsRemaining = await _db.NavalShips.CountAsync(s => s.RoomId == room.Id && s.TeamSide == "TEAM_A" && !s.IsSunk);
            int teamBShipsRemaining = await _db.NavalShips.CountAsync(s => s.RoomId == room.Id && s.TeamSide == "TEAM_B" && !s.IsSunk);

            // Kỹ năng còn lại của đội
            int radarRemaining = 2;
            int shieldRemaining = 2;
            if (!string.IsNullOrEmpty(normalizedTeam))
            {
                var team = await _db.NavalTeams.FirstOrDefaultAsync(t => t.RoomId == room.Id && t.TeamSide == normalizedTeam);
                if (team != null)
                {
                    radarRemaining = team.RadarRemaining;
                    shieldRemaining = team.ShieldRemaining;
                }
            }

            // Bảng xếp hạng đóng góp cá nhân
            var leaderboard = await _combatService.GetPlayerContributionsAsync(room.Id);

            // Lịch sử sự kiện chiến trường gần nhất
            var recentActions = await _db.NavalActions
                .Where(a => a.RoomId == room.Id)
                .OrderByDescending(a => a.CreatedAt)
                .Take(25)
                .ToListAsync();

            var combatLogs = recentActions.OrderBy(a => a.CreatedAt).Select(a => new
            {
                Id = a.Id.ToString(),
                Text = FormatActionLogText(a),
                Type = a.Result.Contains("HIT") ? "HIT" :
                       a.Result.Contains("SUNK") ? "SUNK" :
                       a.Result.Contains("SHIELD") ? "SHIELD" :
                       a.Result.Contains("RADAR") ? "RADAR" : "MISS",
                Time = a.CreatedAt.ToString("HH:mm:ss")
            }).ToList();

            NavalMatchResultDto? matchResult = null;
            if (room.Status == "FINISHED")
            {
                matchResult = await _combatService.EvaluateMatchResultAsync(room.Id, room.IsEarlyFinished);
            }

            // Kiểm tra hiệu ứng x2 Bắn Pháo
            bool isDoubleShot = false;
            Guid? doubleShotPlayerId = null;
            string? doubleShotPlayerNickname = null;
            string? doubleShotTeam = null;
            if (!string.IsNullOrEmpty(room.GameSettings))
            {
                try
                {
                    using var doc = JsonDocument.Parse(room.GameSettings);
                    if (doc.RootElement.TryGetProperty("doubleShotPlayerId", out var prop))
                    {
                        if (Guid.TryParse(prop.GetString(), out var dId))
                        {
                            doubleShotPlayerId = dId;
                            if (dId == player.Id) isDoubleShot = true;
                        }
                    }
                    if (doc.RootElement.TryGetProperty("doubleShotPlayerNickname", out var nProp))
                    {
                        doubleShotPlayerNickname = nProp.GetString();
                    }
                    if (doc.RootElement.TryGetProperty("doubleShotTeam", out var tProp))
                    {
                        doubleShotTeam = tProp.GetString();
                    }
                }
                catch {}
            }

            await Clients.Caller.SendAsync("NavalReconnected", new
            {
                RoomId = room.Id,
                PinCode = room.PinCode,
                PlayerId = player.Id,
                Nickname = player.Nickname,
                TeamSide = player.TeamSide,
                MapSize = room.MapSize,
                IsMatchStarted = room.Status == "PLAYING" || room.Status == "FINISHED",
                IsGameOver = room.Status == "FINISHED",
                MyShips = myShipsDto,
                EnemyShots = enemyShotsDto,
                ShotsEarned = player.ShotsEarned,
                CurrentCombo = player.CurrentCombo,
                MaxCombo = player.MaxCombo,
                EnergyPoints = player.EnergyPoints,
                TeamAShipsRemaining = teamAShipsRemaining,
                TeamBShipsRemaining = teamBShipsRemaining,
                RadarRemaining = radarRemaining,
                ShieldRemaining = shieldRemaining,
                Leaderboard = leaderboard,
                CombatLogs = combatLogs,
                MatchResult = matchResult,
                IsDoubleShot = isDoubleShot,
                DoubleShotPlayerId = doubleShotPlayerId,
                DoubleShotPlayerNickname = doubleShotPlayerNickname,
                DoubleShotTeam = doubleShotTeam
            });

            _logger.LogInformation("Người chơi '{Nickname}' đã khôi phục phiên (F5 Reconnect) phòng {PinCode}",
                player.Nickname, pinCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi ReconnectRoom tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("NavalError", ex.Message);
        }
    }

    /// <summary>
    /// Khởi động trận đấu:
    /// - Kiểm tra quyền Host.
    /// - Yêu cầu mỗi đội có ít nhất 1 người chơi.
    /// - Nếu 1 bên đông hơn từ 2 người trở lên (diff >= 2): Tự động chia đều người chơi giữa 2 đội.
    /// - Nếu chỉ hơn 1 người (diff == 1): 1 người ngẫu nhiên bên đội ít người hơn nhận hiệu ứng x2 Bắn Pháo (trả lời 1 câu được bắn 2 ô).
    /// - Sinh ngẫu nhiên tọa độ tàu cho 2 đội và kích hoạt trận đấu.
    /// </summary>
    public async Task StartMatch(string pinCode)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng với mã PIN {pinCode}.");

            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? Context.User?.FindFirst("sub")?.Value;
            Guid? userId = null;
            if (Guid.TryParse(userIdClaim, out var parsedUserId))
            {
                userId = parsedUserId;
            }

            bool isHost = (Context.Items.TryGetValue("IsHost", out var itemHost) && itemHost is true)
                || (userId.HasValue && userId.Value == room.HostId);

            if (!isHost)
            {
                throw new InvalidOperationException("Chỉ chủ phòng mới có quyền bắt đầu trận đấu.");
            }

            var teamAPlayers = await _db.RoomPlayers
                .Where(rp => rp.RoomId == room.Id && rp.TeamSide == "TEAM_A")
                .ToListAsync();
            var teamBPlayers = await _db.RoomPlayers
                .Where(rp => rp.RoomId == room.Id && rp.TeamSide == "TEAM_B")
                .ToListAsync();

            // Nếu chưa có người chơi tham gia phe nào (chủ phòng bấm bắt đầu trực tiếp để chơi 1 mình)
            if (teamAPlayers.Count == 0 && teamBPlayers.Count == 0)
            {
                var hostUser = userId.HasValue ? await _db.Users.FindAsync(userId.Value) : null;
                var hostPlayer = new RoomPlayer
                {
                    Id = Guid.NewGuid(),
                    RoomId = room.Id,
                    UserId = userId,
                    Nickname = hostUser?.Nickname ?? "Chủ Phòng (Solo)",
                    TeamSide = "TEAM_A",
                    TotalScore = 0,
                    JoinedAt = DateTime.UtcNow
                };
                _db.RoomPlayers.Add(hostPlayer);
                await _db.SaveChangesAsync();
                teamAPlayers.Add(hostPlayer);

                _playerConnections[hostPlayer.Id] = Context.ConnectionId;
                Context.Items["PlayerId"] = hostPlayer.Id;
                Context.Items["PlayerNickname"] = hostPlayer.Nickname;
                Context.Items["TeamSide"] = "TEAM_A";
                await Groups.AddToGroupAsync(Context.ConnectionId, $"naval_{pinCode}_TEAM_A");
            }

            int totalPlayers = teamAPlayers.Count + teamBPlayers.Count;
            if (totalPlayers < 1)
            {
                throw new InvalidOperationException("Phải có ít nhất 1 người chơi để bắt đầu trận đấu.");
            }

            var rnd = new Random();

            // 1. Nếu cả 2 đội đều có người VÀ một bên đông hơn từ 2 người trở lên -> Tự động chia đều người chơi
            int diff = Math.Abs(teamAPlayers.Count - teamBPlayers.Count);
            if (teamAPlayers.Count > 0 && teamBPlayers.Count > 0 && diff >= 2)
            {
                if (teamAPlayers.Count > teamBPlayers.Count)
                {
                    int moveCount = (teamAPlayers.Count - teamBPlayers.Count) / 2;
                    var playersToMove = teamAPlayers.OrderBy(_ => rnd.Next()).Take(moveCount).ToList();
                    foreach (var p in playersToMove)
                    {
                        string oldTeam = p.TeamSide ?? "TEAM_A";
                        p.TeamSide = "TEAM_B";
                        teamAPlayers.Remove(p);
                        teamBPlayers.Add(p);

                        if (_playerConnections.TryGetValue(p.Id, out var connId))
                        {
                            await Groups.RemoveFromGroupAsync(connId, $"naval_{pinCode}_{oldTeam}");
                            await Groups.AddToGroupAsync(connId, $"naval_{pinCode}_TEAM_B");
                        }

                        await Clients.Group($"naval_{pinCode}").SendAsync("NavalPlayerRebalanced", new
                        {
                            PlayerId = p.Id,
                            Nickname = p.Nickname,
                            NewTeamSide = "TEAM_B",
                            Message = "Hệ thống đã tự động chuyển bạn sang Hạm Đội Xích để cân bằng lực lượng giữa hai đội!"
                        });
                    }
                }
                else
                {
                    int moveCount = (teamBPlayers.Count - teamAPlayers.Count) / 2;
                    var playersToMove = teamBPlayers.OrderBy(_ => rnd.Next()).Take(moveCount).ToList();
                    foreach (var p in playersToMove)
                    {
                        string oldTeam = p.TeamSide ?? "TEAM_B";
                        p.TeamSide = "TEAM_A";
                        teamBPlayers.Remove(p);
                        teamAPlayers.Add(p);

                        if (_playerConnections.TryGetValue(p.Id, out var connId))
                        {
                            await Groups.RemoveFromGroupAsync(connId, $"naval_{pinCode}_{oldTeam}");
                            await Groups.AddToGroupAsync(connId, $"naval_{pinCode}_TEAM_A");
                        }

                        await Clients.Group($"naval_{pinCode}").SendAsync("NavalPlayerRebalanced", new
                        {
                            PlayerId = p.Id,
                            Nickname = p.Nickname,
                            NewTeamSide = "TEAM_A",
                            Message = "Hệ thống đã tự động chuyển bạn sang Hạm Đội Lam để cân bằng lực lượng giữa hai đội!"
                        });
                    }
                }

                await _db.SaveChangesAsync();
                await BroadcastLobbyStateAsync(room.Id, pinCode);
            }

            // 2. Nếu cả 2 phe đều có người và chênh lệch đúng 1 người -> 1 người ngẫu nhiên bên ít người hơn được x2 lượt bắn
            int newDiff = Math.Abs(teamAPlayers.Count - teamBPlayers.Count);
            Guid? doubleShotPlayerId = null;
            string? doubleShotPlayerNickname = null;
            string? doubleShotTeam = null;

            if (newDiff == 1 && teamAPlayers.Count > 0 && teamBPlayers.Count > 0)
            {
                var smallerTeam = teamAPlayers.Count < teamBPlayers.Count ? teamAPlayers : teamBPlayers;
                if (smallerTeam.Count > 0)
                {
                    var buffedPlayer = smallerTeam[rnd.Next(smallerTeam.Count)];
                    doubleShotPlayerId = buffedPlayer.Id;
                    doubleShotPlayerNickname = buffedPlayer.Nickname;
                    doubleShotTeam = buffedPlayer.TeamSide;

                    _logger.LogInformation("Phòng {PinCode}: Người chơi '{Nickname}' ({TeamSide}) nhận hiệu ứng X2 Bắn Pháo.",
                        pinCode, doubleShotPlayerNickname, doubleShotTeam);
                }
            }

            var settingsDict = new Dictionary<string, object>();
            if (!string.IsNullOrEmpty(room.GameSettings))
            {
                try
                {
                    settingsDict = JsonSerializer.Deserialize<Dictionary<string, object>>(room.GameSettings) ?? new();
                }
                catch {}
            }

            if (doubleShotPlayerId.HasValue)
            {
                settingsDict["doubleShotPlayerId"] = doubleShotPlayerId.Value.ToString();
                settingsDict["doubleShotPlayerNickname"] = doubleShotPlayerNickname!;
                settingsDict["doubleShotTeam"] = doubleShotTeam!;
            }
            else
            {
                settingsDict.Remove("doubleShotPlayerId");
                settingsDict.Remove("doubleShotPlayerNickname");
                settingsDict.Remove("doubleShotTeam");
            }
            room.GameSettings = JsonSerializer.Serialize(settingsDict);

            int mapSize = room.MapSize > 0 ? room.MapSize : 15;

            // Sinh ngẫu nhiên và lưu 5 tàu cho TEAM_A và 5 tàu cho TEAM_B
            var (teamAShips, teamBShips) = await _mapService.InitializeBattleMapAsync(room.Id, mapSize);

            room.Status = "PLAYING";
            room.StartTime = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            string groupTeamA = $"naval_{pinCode}_TEAM_A";
            string groupTeamB = $"naval_{pinCode}_TEAM_B";
            string roomGroup = $"naval_{pinCode}";

            // Lấy lịch sử bắn hiện tại (nếu có)
            var shotActions = await _db.NavalActions
                .Where(a => a.RoomId == room.Id && (a.ActionType == "NORMAL_SHOT" || a.ActionType == "PRECISION_SHOT"))
                .ToListAsync();

            var teamAShotsAgainstB = shotActions
                .Where(a => a.TargetTeam == "TEAM_B")
                .Select(a => new { a.TargetRow, a.TargetCol, a.Result, a.SunkShipType })
                .ToList();

            var teamBShotsAgainstA = shotActions
                .Where(a => a.TargetTeam == "TEAM_A")
                .Select(a => new { a.TargetRow, a.TargetCol, a.Result, a.SunkShipType })
                .ToList();

            // ── Gửi cho TEAM_A: Tọa độ tàu đội A + Các ô đã bắn bên bản đồ B ──
            var teamAPayload = new
            {
                RoomId = room.Id,
                PinCode = pinCode,
                MapSize = mapSize,
                MyTeamSide = "TEAM_A",
                DoubleShotPlayerId = doubleShotPlayerId,
                DoubleShotPlayerNickname = doubleShotPlayerNickname,
                DoubleShotTeam = doubleShotTeam,
                MyShips = teamAShips.Select(s => new
                {
                    s.Id,
                    s.ShipType,
                    Coordinates = JsonSerializer.Deserialize<List<ShipCoordinate>>(s.Coordinates) ?? [],
                    s.IsSunk
                }),
                EnemyShotsHistory = teamAShotsAgainstB
            };
            await Clients.Group(groupTeamA).SendAsync("NavalMapState", teamAPayload);

            // ── Gửi cho TEAM_B: Tọa độ tàu đội B + Các ô đã bắn bên bản đồ A ──
            var teamBPayload = new
            {
                RoomId = room.Id,
                PinCode = pinCode,
                MapSize = mapSize,
                MyTeamSide = "TEAM_B",
                DoubleShotPlayerId = doubleShotPlayerId,
                DoubleShotPlayerNickname = doubleShotPlayerNickname,
                DoubleShotTeam = doubleShotTeam,
                MyShips = teamBShips.Select(s => new
                {
                    s.Id,
                    s.ShipType,
                    Coordinates = JsonSerializer.Deserialize<List<ShipCoordinate>>(s.Coordinates) ?? [],
                    s.IsSunk
                }),
                EnemyShotsHistory = teamBShotsAgainstA
            };
            await Clients.Group(groupTeamB).SendAsync("NavalMapState", teamBPayload);

            // ── Gửi cho Host (Trọng tài quan sát toàn cảnh 2 bên) ──
            var spectatorState = await GetHostSpectatorStateAsync(room.Id, pinCode, mapSize);
            await Clients.Group($"naval_{pinCode}_HOST").SendAsync("NavalHostSpectatorState", spectatorState);

            // Thông báo trận đấu bắt đầu cho toàn phòng
            await Clients.Group(roomGroup).SendAsync("NavalMatchStarted", new
            {
                RoomId = room.Id,
                PinCode = pinCode,
                MapSize = mapSize,
                Status = "PLAYING",
                StartedAt = room.StartTime,
                DoubleShotPlayerId = doubleShotPlayerId,
                DoubleShotPlayerNickname = doubleShotPlayerNickname,
                DoubleShotTeam = doubleShotTeam
            });

            _logger.LogInformation("Phòng Hải Chiến {PinCode} đã bắt đầu trận đấu thành công.", pinCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi StartMatch tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("NavalError", ex.Message);
        }
    }

    /// <summary>
    /// Gửi câu trả lời Slide: Chấm điểm trên Server, cập nhật combo, năng lượng và cấp quyền bắn hoặc mở khóa kỹ năng.
    /// </summary>
    public async Task SubmitAnswer(string pinCode, Guid slideId, string answerData, int timeMs)
    {
        try
        {
            var (room, player) = await ResolveContextAsync(pinCode);

            var result = await _combatService.ProcessAnswerAsync(
                room.Id, player.Id, slideId, answerData, timeMs);

            // Trả kết quả chi tiết về riêng người chơi (kèm số quyền bắn shots_earned, combo, năng lượng)
            await Clients.Caller.SendAsync("NavalAnswerResult", new
            {
                SlideId = slideId,
                IsCorrect = result.IsCorrect,
                ScoreAwarded = result.ScoreAwarded,
                CurrentCombo = result.CurrentCombo,
                MaxCombo = result.MaxCombo,
                EnergyPoints = result.EnergyPoints,
                ShotsEarned = result.ShotsEarned,
                CorrectAnswer = result.CorrectAnswer,
                IsDoubleShot = result.IsDoubleShot,
                CanUseRadar = player.EnergyPoints >= 30,
                CanUsePrecision = player.CurrentCombo >= 3 || player.EnergyPoints >= 45,
                CanUseShield = player.EnergyPoints >= 50
            });

            // Đồng bộ trạng thái combo và điểm số cho toàn phòng
            string roomGroup = $"naval_{pinCode}";
            await Clients.Group(roomGroup).SendAsync("NavalPlayerAnswered", new
            {
                PlayerId = player.Id,
                Nickname = player.Nickname,
                TeamSide = player.TeamSide,
                IsCorrect = result.IsCorrect,
                CurrentCombo = result.CurrentCombo,
                TotalScore = player.TotalScore,
                ShotsEarned = result.ShotsEarned,
                IsDoubleShot = result.IsDoubleShot
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi SubmitAnswer tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("NavalError", ex.Message);
        }
    }

    /// <summary>
    /// Thực hiện phát bắn vào tọa độ (targetRow, targetCol) trên bản đồ đối phương.
    /// Hỗ trợ Bắn chính xác (isPrecision).
    /// </summary>
    public async Task FireShot(string pinCode, int targetRow, int targetCol, bool isPrecision)
    {
        try
        {
            var (room, player) = await ResolveContextAsync(pinCode);

            string actionType = isPrecision ? "PRECISION_SHOT" : "NORMAL_SHOT";
            var result = await _combatService.FireShotAsync(
                room.Id, player.Id, targetRow, targetCol, actionType);

            string roomGroup = $"naval_{pinCode}";

            // Broadcast kết quả phát bắn cho toàn phòng
            await Clients.Group(roomGroup).SendAsync("NavalShotFired", new
            {
                PlayerId = player.Id,
                PlayerNickname = player.Nickname,
                AttackerTeam = result.AttackerTeam,
                TargetTeam = result.TargetTeam,
                TargetRow = result.TargetRow,
                TargetCol = result.TargetCol,
                Result = result.Result, // 'MISS' | 'HIT' | 'SUNK' | 'BLOCKED_BY_SHIELD'
                SunkShipType = result.SunkShipType,
                ShotsEarnedRemaining = result.ShotsEarnedRemaining,
                IsPrecision = isPrecision,
                Message = result.Message
            });

            // Cập nhật lại trạng thái đội tàu của đội bị tấn công (để hiển thị ô trúng đạn / lá chắn bị tiêu hao)
            var targetTeamShips = await _mapService.GetTeamShipsAsync(room.Id, result.TargetTeam);
            await Clients.Group($"naval_{pinCode}_{result.TargetTeam}").SendAsync("NavalMyShipsUpdated", new
            {
                MyTeamSide = result.TargetTeam,
                MyShips = targetTeamShips.Select(s => new
                {
                    s.Id,
                    s.ShipType,
                    Coordinates = JsonSerializer.Deserialize<List<ShipCoordinate>>(s.Coordinates) ?? [],
                    s.IsSunk
                })
            });

            // Cập nhật toàn cảnh 2 bên cho Host quan sát trực tiếp
            var hostUpdate = await GetHostSpectatorStateAsync(room.Id, pinCode, room.MapSize);
            await Clients.Group($"naval_{pinCode}_HOST").SendAsync("NavalHostSpectatorUpdated", hostUpdate);

            // Nếu toàn bộ 5 tàu của đối phương bị đánh chìm -> Kết thúc trận đấu
            if (result.IsGameOver)
            {
                var matchResult = await _combatService.EvaluateMatchResultAsync(room.Id, isEarlyTermination: false);
                var leaderboard = await _combatService.GetPlayerContributionsAsync(room.Id);

                await Clients.Group(roomGroup).SendAsync("NavalMatchEnded", new
                {
                    IsGameOver = true,
                    IsEarlyTermination = false,
                    WinningTeam = result.WinningTeam,
                    WinReason = result.WinReason,
                    MatchResult = matchResult,
                    Leaderboard = leaderboard
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi FireShot tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("NavalError", ex.Message);
        }
    }

    /// <summary>
    /// Sử dụng kỹ năng chiến thuật (Radar, Lá chắn phòng thủ, Bắn chính xác).
    /// BẢO MẬT: Radar quét vùng 3x3 chỉ trả kết quả (có tàu hay không) về cho riêng đội sử dụng (Clients.Group(teamGroupName)).
    /// </summary>
    public async Task UseSkill(string pinCode, string skillType, int targetRow, int targetCol)
    {
        try
        {
            var (room, player) = await ResolveContextAsync(pinCode);
            string teamSide = player.TeamSide!;
            string teamGroupName = $"naval_{pinCode}_{teamSide}";
            string roomGroup = $"naval_{pinCode}";

            string normalizedSkill = skillType?.Trim().ToUpperInvariant() ?? "";

            if (normalizedSkill is "RADAR" or "RADAR_SCAN")
            {
                var radarResult = await _combatService.UseRadarScanAsync(
                    room.Id, player.Id, targetRow, targetCol);

                if (!radarResult.Success)
                {
                    await Clients.Caller.SendAsync("NavalError", radarResult.Message);
                    return;
                }

                // BẢO MẬT: Chỉ gửi kết quả dò quét (có tàu hay không) về cho riêng đội sử dụng!
                await Clients.Group(teamGroupName).SendAsync("RadarScanResult", new
                {
                    PlayerId = player.Id,
                    PlayerNickname = player.Nickname,
                    CenterRow = targetRow,
                    CenterCol = targetCol,
                    Detected = radarResult.Detected,
                    Message = radarResult.Message,
                    RadarRemaining = radarResult.RadarRemaining
                });

                // Thông báo chung cho đối thủ biết đội bạn vừa kích hoạt Radar (không lộ tọa độ và kết quả)
                await Clients.Group(roomGroup).SendAsync("NavalSkillNotice", new
                {
                    PlayerNickname = player.Nickname,
                    TeamSide = teamSide,
                    SkillType = "RADAR",
                    Notice = $"Đội {teamSide} đã kích hoạt Radar dò tìm!"
                });
            }
            else if (normalizedSkill is "SHIELD" or "SHIELD_ACTIVATE")
            {
                var shieldResult = await _combatService.ActivateShieldAsync(
                    room.Id, player.Id, targetRow, targetCol);

                if (!shieldResult.Success)
                {
                    await Clients.Caller.SendAsync("NavalError", shieldResult.Message);
                    return;
                }

                // Cập nhật tọa độ tàu có lá chắn về riêng đội mình
                var myShips = await _mapService.GetTeamShipsAsync(room.Id, teamSide);
                await Clients.Group(teamGroupName).SendAsync("NavalMyShipsUpdated", new
                {
                    MyTeamSide = teamSide,
                    MyShips = myShips.Select(s => new
                    {
                        s.Id,
                        s.ShipType,
                        Coordinates = JsonSerializer.Deserialize<List<ShipCoordinate>>(s.Coordinates) ?? [],
                        s.IsSunk
                    }),
                    ShieldRemaining = shieldResult.ShieldRemaining,
                    Message = shieldResult.Message
                });

                // Thông báo chung cho cả phòng
                await Clients.Group(roomGroup).SendAsync("NavalSkillNotice", new
                {
                    PlayerNickname = player.Nickname,
                    TeamSide = teamSide,
                    SkillType = "SHIELD",
                    Notice = $"Đội {teamSide} đã kích hoạt Lá chắn phòng thủ bảo vệ hạm đội!"
                });
            }
            else
            {
                await Clients.Caller.SendAsync("NavalError", $"Kỹ năng '{skillType}' không hợp lệ.");
                return;
            }

            // Cập nhật trạng thái chiến trường thời gian thực cho Host quan sát
            var hostUpdate = await GetHostSpectatorStateAsync(room.Id, pinCode, room.MapSize);
            await Clients.Group($"naval_{pinCode}_HOST").SendAsync("NavalHostSpectatorUpdated", hostUpdate);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi UseSkill tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("NavalError", ex.Message);
        }
    }

    /// <summary>
    /// Dành cho Host kết thúc sớm trận đấu:
    /// Phân định thắng thua theo 4 tiêu chí ưu tiên trong tài liệu và trả về Bảng xếp hạng cá nhân đầy đủ chỉ số.
    /// </summary>
    public async Task EndMatchEarly(string pinCode)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng với mã PIN {pinCode}.");

            room.Status = "FINISHED";
            room.EndTime = DateTime.UtcNow;
            room.IsEarlyFinished = true;
            await _db.SaveChangesAsync();

            // Đánh giá kết thúc sớm theo đúng 4 tiêu chí ưu tiên
            var matchResult = await _combatService.EvaluateMatchResultAsync(room.Id, isEarlyTermination: true);

            // Bảng xếp hạng đóng góp cá nhân đầy đủ chỉ số
            var leaderboard = await _combatService.GetPlayerContributionsAsync(room.Id);

            string roomGroup = $"naval_{pinCode}";

            await Clients.Group(roomGroup).SendAsync("NavalMatchEnded", new
            {
                IsGameOver = true,
                IsEarlyTermination = true,
                WinningTeam = matchResult.WinningTeam,
                WinReason = matchResult.WinReason,
                PriorityCriterion = matchResult.PriorityCriterion,
                TeamA = matchResult.TeamA,
                TeamB = matchResult.TeamB,
                Leaderboard = leaderboard
            });

            _logger.LogInformation(
                "Host đã kết thúc sớm trận Hải Chiến tại phòng {PinCode}. Kết quả: {Winner} ({Criterion})",
                pinCode, matchResult.WinningTeam, matchResult.PriorityCriterion);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi EndMatchEarly tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("NavalError", ex.Message);
        }
    }

    /// <summary>
    /// Chủ phòng (Host) thiết lập lại trận đấu về trạng thái phòng chờ (WAITING) để chơi lại ván mới.
    /// Giữ nguyên danh sách người chơi trong phòng.
    /// </summary>
    public async Task ResetMatch(string pinCode)
    {
        try
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode)
                ?? throw new KeyNotFoundException($"Không tìm thấy phòng {pinCode}.");

            room.Status = "WAITING";
            room.StartTime = null;
            room.EndTime = null;
            room.WinnerTeam = null;
            room.IsEarlyFinished = false;

            // Xóa đội tàu cũ và hành động tác chiến cũ
            var ships = await _db.NavalShips.Where(s => s.RoomId == room.Id).ToListAsync();
            _db.NavalShips.RemoveRange(ships);

            var actions = await _db.NavalActions.Where(a => a.RoomId == room.Id).ToListAsync();
            _db.NavalActions.RemoveRange(actions);

            // Khôi phục thông số kỹ năng của hai đội
            var teams = await _db.NavalTeams.Where(t => t.RoomId == room.Id).ToListAsync();
            foreach (var t in teams)
            {
                t.ShipsRemaining = 5;
                t.RadarRemaining = 2;
                t.ShieldRemaining = 2;
                t.PrecisionShotRemaining = 1;
                t.TeamCombo = 0;
            }

            // Reset chỉ số chiến đấu cá nhân nhưng giữ nguyên đội và tài khoản
            var players = await _db.RoomPlayers.Where(rp => rp.RoomId == room.Id).ToListAsync();
            foreach (var p in players)
            {
                p.ShotsEarned = 0;
                p.CurrentCombo = 0;
                p.MaxCombo = 0;
                p.EnergyPoints = 0;
                p.HitsCount = 0;
                p.ValidShotsCount = 0;
                p.ShipsSunkContribution = 0;
                p.SkillsUsedCount = 0;
                p.TotalScore = 0;
            }

            // Xóa cấu hình doubleShot trong GameSettings
            if (!string.IsNullOrEmpty(room.GameSettings))
            {
                try
                {
                    var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(room.GameSettings) ?? new();
                    dict.Remove("doubleShotPlayerId");
                    dict.Remove("doubleShotPlayerNickname");
                    dict.Remove("doubleShotTeam");
                    room.GameSettings = JsonSerializer.Serialize(dict);
                }
                catch {}
            }

            await _db.SaveChangesAsync();

            string roomGroup = $"naval_{pinCode}";

            // Phát sự kiện reset trận đấu về sảnh cho tất cả người chơi & host
            await Clients.Group(roomGroup).SendAsync("NavalMatchReset", new
            {
                RoomId = room.Id,
                PinCode = pinCode,
                Status = "WAITING"
            });

            // Đồng bộ lại danh sách phòng chờ
            await BroadcastLobbyStateAsync(room.Id, pinCode);

            _logger.LogInformation("Chủ phòng đã làm mới trận đấu phòng {PinCode} về trạng thái phòng chờ.", pinCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi ResetMatch tại phòng {PinCode}", pinCode);
            await Clients.Caller.SendAsync("NavalError", ex.Message);
        }
    }

    /// <summary>
    /// Lấy toàn bộ dữ liệu trạng thái trận đấu dành cho Host (Trọng tài quan sát toàn diện cả hai bên).
    /// </summary>
    public async Task<object> GetHostSpectatorStateAsync(Guid roomId, string pinCode, int mapSize)
    {
        var allShips = await _db.NavalShips.Where(s => s.RoomId == roomId).ToListAsync();

        var teamAShips = allShips.Where(s => s.TeamSide == "TEAM_A").Select(s => new
        {
            s.Id,
            s.ShipType,
            Coordinates = JsonSerializer.Deserialize<List<ShipCoordinate>>(s.Coordinates) ?? [],
            s.IsSunk
        }).ToList();

        var teamBShips = allShips.Where(s => s.TeamSide == "TEAM_B").Select(s => new
        {
            s.Id,
            s.ShipType,
            Coordinates = JsonSerializer.Deserialize<List<ShipCoordinate>>(s.Coordinates) ?? [],
            s.IsSunk
        }).ToList();

        var shotActions = await _db.NavalActions
            .Where(a => a.RoomId == roomId && (a.ActionType == "NORMAL_SHOT" || a.ActionType == "PRECISION_SHOT"))
            .OrderBy(a => a.CreatedAt)
            .ToListAsync();

        var teamAShotsAgainstB = shotActions
            .Where(a => a.TargetTeam == "TEAM_B")
            .Select(a => new { a.TargetRow, a.TargetCol, a.Result, a.SunkShipType })
            .ToList();

        var teamBShotsAgainstA = shotActions
            .Where(a => a.TargetTeam == "TEAM_A")
            .Select(a => new { a.TargetRow, a.TargetCol, a.Result, a.SunkShipType })
            .ToList();

        var teamA = await _db.NavalTeams.FirstOrDefaultAsync(t => t.RoomId == roomId && t.TeamSide == "TEAM_A");
        var teamB = await _db.NavalTeams.FirstOrDefaultAsync(t => t.RoomId == roomId && t.TeamSide == "TEAM_B");

        int teamAShipsRemaining = teamAShips.Count(s => !s.IsSunk);
        int teamBShipsRemaining = teamBShips.Count(s => !s.IsSunk);

        var leaderboard = await _combatService.GetPlayerContributionsAsync(roomId);

        var recentActions = await _db.NavalActions
            .Where(a => a.RoomId == roomId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(30)
            .ToListAsync();

        var combatLogs = recentActions.OrderBy(a => a.CreatedAt).Select(a => new
        {
            Id = a.Id.ToString(),
            Text = FormatActionLogText(a),
            Type = a.Result.Contains("HIT") ? "HIT" :
                   a.Result.Contains("SUNK") ? "SUNK" :
                   a.Result.Contains("SHIELD") ? "SHIELD" :
                   a.Result.Contains("RADAR") ? "RADAR" : "MISS",
            Time = a.CreatedAt.ToString("HH:mm:ss")
        }).ToList();

        return new
        {
            RoomId = roomId,
            PinCode = pinCode,
            MapSize = mapSize,
            TeamAShips = teamAShips,
            TeamBShips = teamBShips,
            TeamAShotsAgainstB = teamAShotsAgainstB,
            TeamBShotsAgainstA = teamBShotsAgainstA,
            TeamAShipsRemaining = teamAShipsRemaining,
            TeamBShipsRemaining = teamBShipsRemaining,
            TeamARadarRemaining = teamA?.RadarRemaining ?? 2,
            TeamAShieldRemaining = teamA?.ShieldRemaining ?? 2,
            TeamBRadarRemaining = teamB?.RadarRemaining ?? 2,
            TeamBShieldRemaining = teamB?.ShieldRemaining ?? 2,
            TeamACombo = teamA?.TeamCombo ?? 0,
            TeamBCombo = teamB?.TeamCombo ?? 0,
            Leaderboard = leaderboard,
            CombatLogs = combatLogs
        };
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    private async Task<(Room room, RoomPlayer player)> ResolveContextAsync(string pinCode)
    {
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.PinCode == pinCode)
            ?? throw new KeyNotFoundException($"Không tìm thấy phòng với mã PIN {pinCode}.");

        Guid? playerId = null;
        if (Context.Items.TryGetValue("PlayerId", out var pObj) && pObj is Guid pGuid)
        {
            playerId = pGuid;
        }

        RoomPlayer? player = null;
        if (playerId.HasValue)
        {
            player = await _db.RoomPlayers.FirstOrDefaultAsync(rp => rp.Id == playerId.Value && rp.RoomId == room.Id);
        }

        if (player == null)
        {
            // Fallback: Tìm qua UserId từ JWT claim nếu có
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? Context.User?.FindFirst("sub")?.Value;

            if (Guid.TryParse(userIdClaim, out var userId))
            {
                player = await _db.RoomPlayers.FirstOrDefaultAsync(rp => rp.UserId == userId && rp.RoomId == room.Id);
                if (player == null)
                {
                    var userObj = await _db.Users.FindAsync(userId);
                    player = new RoomPlayer
                    {
                        Id = (playerId.HasValue && playerId.Value != Guid.Empty) ? playerId.Value : Guid.NewGuid(),
                        RoomId = room.Id,
                        UserId = userId,
                        Nickname = userObj?.Nickname ?? "Thuyền Trưởng",
                        TeamSide = "TEAM_A",
                        JoinedAt = DateTime.UtcNow
                    };
                    _db.RoomPlayers.Add(player);
                    await _db.SaveChangesAsync();
                }
            }
        }

        if (player == null)
        {
            throw new InvalidOperationException("Không thể xác định danh tính người chơi trong phiên SignalR hiện tại. Vui lòng gọi JoinNavalRoom trước.");
        }

        return (room, player);
    }

    private static string FormatActionLogText(NavalAction a)
    {
        string attacker = a.AttackerTeam == "TEAM_A" ? "Hạm Đội Lam" : "Hạm Đội Xích";
        return a.ActionType switch
        {
            "RADAR_SCAN" => $"{attacker} kích hoạt Radar quét sóng tại ({a.TargetRow + 1}, {a.TargetCol + 1}) -> {(a.Result == "RADAR_DETECTED" ? "Phát hiện tàu!" : "Không có tín hiệu.")}",
            "SHIELD_ACTIVATE" => $"{attacker} bật Lá chắn bảo vệ tại ({a.TargetRow + 1}, {a.TargetCol + 1})",
            _ => a.Result switch
            {
                "HIT" => $"{attacker} bắn trúng tàu đối phương tại ({a.TargetRow + 1}, {a.TargetCol + 1})!",
                "SUNK" => $"{attacker} bắn chìm tàu chiến {a.SunkShipType} ô đối phương tại ({a.TargetRow + 1}, {a.TargetCol + 1})!",
                "BLOCKED_BY_SHIELD" => $"{attacker} khai hỏa vào ({a.TargetRow + 1}, {a.TargetCol + 1}) nhưng bị Lá chắn đối phương chặn đứng!",
                _ => $"{attacker} bắn trượt tại tọa độ ({a.TargetRow + 1}, {a.TargetCol + 1})."
            }
        };
    }
}
