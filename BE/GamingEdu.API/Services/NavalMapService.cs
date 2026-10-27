using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services;

public interface INavalMapService
{
    /// <summary>
    /// Sinh ngẫu nhiên 5 tàu chiến (kích thước 1, 2, 3, 4, 5 ô) trên bản đồ NxN cho 1 đội.
    /// Tàu chỉ đặt ngang hoặc dọc, nằm trọn trong bản đồ và tuyệt đối không chồng lên nhau.
    /// </summary>
    List<NavalShip> GenerateShipsForTeam(Guid roomId, string teamSide, int mapSize = 15);

    /// <summary>
    /// Khởi tạo và lưu trữ bản đồ thủy chiến cho cả 2 đội (TEAM_A và TEAM_B) trong phòng.
    /// Khởi tạo trạng thái naval_teams và lưu các tàu vào CSDL.
    /// </summary>
    Task<(List<NavalShip> TeamAShips, List<NavalShip> TeamBShips)> InitializeBattleMapAsync(Guid roomId, int mapSize = 15);

    /// <summary>
    /// Kiểm tra tính hợp lệ của việc đặt tàu (đúng kích thước, nằm trong biên, không chồng lấn, ngang/dọc liên tục).
    /// </summary>
    bool ValidateShipPlacement(IEnumerable<NavalShip> ships, int mapSize);

    /// <summary>
    /// Lấy danh sách tàu chiến của một đội trong phòng.
    /// </summary>
    Task<List<NavalShip>> GetTeamShipsAsync(Guid roomId, string teamSide);
}

public class NavalMapService : INavalMapService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<NavalMapService> _logger;

    // 5 loại tàu theo đặc tả: kích thước 1, 2, 3, 4, 5 ô
    private static readonly int[] ShipSizes = [5, 4, 3, 2, 1]; // Đặt tàu lớn trước để tối ưu xác suất không va chạm

    public NavalMapService(ApplicationDbContext db, ILogger<NavalMapService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Thuật toán ngẫu nhiên đặt 5 tàu lên bản đồ NxN.
    /// </summary>
    public List<NavalShip> GenerateShipsForTeam(Guid roomId, string teamSide, int mapSize = 15)
    {
        if (mapSize < 5)
        {
            throw new ArgumentException("Kích thước bản đồ tối thiểu phải là 5x5 để chứa tàu kích thước 5.", nameof(mapSize));
        }

        const int maxTeamAttempts = 100;
        int teamAttempt = 0;

        while (teamAttempt < maxTeamAttempts)
        {
            teamAttempt++;
            var occupiedCells = new HashSet<(int r, int c)>();
            var placedShips = new List<NavalShip>();
            bool teamSuccess = true;

            foreach (var shipSize in ShipSizes)
            {
                bool shipPlaced = false;
                const int maxShipAttempts = 500;

                for (int attempt = 0; attempt < maxShipAttempts; attempt++)
                {
                    // 0: Ngang (Horizontal), 1: Dọc (Vertical)
                    bool isVertical = Random.Shared.Next(2) == 1;

                    int startRow, startCol;
                    if (isVertical)
                    {
                        startRow = Random.Shared.Next(0, mapSize - shipSize + 1);
                        startCol = Random.Shared.Next(0, mapSize);
                    }
                    else
                    {
                        startRow = Random.Shared.Next(0, mapSize);
                        startCol = Random.Shared.Next(0, mapSize - shipSize + 1);
                    }

                    var coords = new List<ShipCoordinate>();
                    bool hasCollision = false;

                    for (int offset = 0; offset < shipSize; offset++)
                    {
                        int r = isVertical ? startRow + offset : startRow;
                        int c = isVertical ? startCol : startCol + offset;

                        if (occupiedCells.Contains((r, c)))
                        {
                            hasCollision = true;
                            break;
                        }

                        coords.Add(new ShipCoordinate
                        {
                            R = r,
                            C = c,
                            Hit = false,
                            Shielded = false
                        });
                    }

                    if (!hasCollision)
                    {
                        // Đánh dấu ô đã có tàu
                        foreach (var coord in coords)
                        {
                            occupiedCells.Add((coord.R, coord.C));
                        }

                        var ship = new NavalShip
                        {
                            Id = Guid.NewGuid(),
                            RoomId = roomId,
                            TeamSide = teamSide,
                            ShipType = shipSize,
                            Coordinates = JsonSerializer.Serialize(coords),
                            IsSunk = false
                        };

                        placedShips.Add(ship);
                        shipPlaced = true;
                        break;
                    }
                }

                if (!shipPlaced)
                {
                    teamSuccess = false;
                    break;
                }
            }

            if (teamSuccess && placedShips.Count == ShipSizes.Length)
            {
                // Sắp xếp lại danh sách theo kích thước tăng dần 1 -> 5 cho trực quan
                return placedShips.OrderBy(s => s.ShipType).ToList();
            }
        }

        throw new InvalidOperationException($"Không thể tạo bản đồ tàu hợp lệ cho {teamSide} trên lưới {mapSize}x{mapSize} sau {maxTeamAttempts} lần thử.");
    }

    /// <summary>
    /// Khởi tạo và lưu bản đồ cho cả TEAM_A và TEAM_B.
    /// </summary>
    public async Task<(List<NavalShip> TeamAShips, List<NavalShip> TeamBShips)> InitializeBattleMapAsync(Guid roomId, int mapSize = 15)
    {
        var room = await _db.Rooms.FindAsync(roomId)
            ?? throw new KeyNotFoundException($"Không tìm thấy phòng với ID {roomId}");

        room.MapSize = mapSize;

        // Xóa các tàu và lịch sử hành động cũ của phòng nếu có (đảm bảo idempotency)
        var oldShips = await _db.NavalShips.Where(s => s.RoomId == roomId).ToListAsync();
        if (oldShips.Count > 0)
        {
            _db.NavalShips.RemoveRange(oldShips);
        }

        var oldActions = await _db.NavalActions.Where(a => a.RoomId == roomId).ToListAsync();
        if (oldActions.Count > 0)
        {
            _db.NavalActions.RemoveRange(oldActions);
        }

        // Đảm bảo tồn tại bản ghi naval_teams cho cả 2 đội
        await EnsureNavalTeamAsync(roomId, "TEAM_A");
        await EnsureNavalTeamAsync(roomId, "TEAM_B");

        // Sinh 5 tàu ngẫu nhiên cho TEAM_A và 5 tàu ngẫu nhiên cho TEAM_B
        var teamAShips = GenerateShipsForTeam(roomId, "TEAM_A", mapSize);
        var teamBShips = GenerateShipsForTeam(roomId, "TEAM_B", mapSize);

        _db.NavalShips.AddRange(teamAShips);
        _db.NavalShips.AddRange(teamBShips);

        await _db.SaveChangesAsync();

        _logger.LogInformation("Đã khởi tạo thành công bản đồ Hải Chiến Tri Thức {MapWidth}x{MapHeight} cho phòng {RoomId}", mapSize, mapSize, roomId);

        return (teamAShips, teamBShips);
    }

    /// <summary>
    /// Kiểm tra tính hợp lệ của việc đặt tàu
    /// </summary>
    public bool ValidateShipPlacement(IEnumerable<NavalShip> ships, int mapSize)
    {
        var shipList = ships.ToList();
        if (shipList.Count != 5) return false;

        var expectedTypes = new HashSet<int> { 1, 2, 3, 4, 5 };
        var actualTypes = shipList.Select(s => s.ShipType).ToHashSet();
        if (!expectedTypes.SetEquals(actualTypes)) return false;

        var allCells = new HashSet<(int r, int c)>();

        foreach (var ship in shipList)
        {
            var coords = JsonSerializer.Deserialize<List<ShipCoordinate>>(ship.Coordinates);
            if (coords == null || coords.Count != ship.ShipType) return false;

            // Kiểm tra từng ô nằm trong biên
            foreach (var c in coords)
            {
                if (c.R < 0 || c.R >= mapSize || c.C < 0 || c.C >= mapSize)
                {
                    return false;
                }

                // Không được chồng ô
                if (!allCells.Add((c.R, c.C)))
                {
                    return false;
                }
            }

            // Kiểm tra tính liên tục theo chiều ngang hoặc dọc
            if (coords.Count > 1)
            {
                bool isHorizontal = coords.All(c => c.R == coords[0].R);
                bool isVertical = coords.All(c => c.C == coords[0].C);

                if (!isHorizontal && !isVertical) return false;

                if (isHorizontal)
                {
                    var sortedCols = coords.Select(c => c.C).OrderBy(c => c).ToList();
                    for (int i = 0; i < sortedCols.Count - 1; i++)
                    {
                        if (sortedCols[i + 1] - sortedCols[i] != 1) return false;
                    }
                }
                else
                {
                    var sortedRows = coords.Select(c => c.R).OrderBy(r => r).ToList();
                    for (int i = 0; i < sortedRows.Count - 1; i++)
                    {
                        if (sortedRows[i + 1] - sortedRows[i] != 1) return false;
                    }
                }
            }
        }

        return true;
    }

    public async Task<List<NavalShip>> GetTeamShipsAsync(Guid roomId, string teamSide)
    {
        return await _db.NavalShips
            .Where(s => s.RoomId == roomId && s.TeamSide == teamSide)
            .OrderBy(s => s.ShipType)
            .ToListAsync();
    }

    private async Task EnsureNavalTeamAsync(Guid roomId, string teamSide)
    {
        var team = await _db.NavalTeams
            .FirstOrDefaultAsync(t => t.RoomId == roomId && t.TeamSide == teamSide);

        if (team == null)
        {
            team = new NavalTeam
            {
                Id = Guid.NewGuid(),
                RoomId = roomId,
                TeamSide = teamSide,
                RadarRemaining = 2,
                ShieldRemaining = 2,
                PrecisionShotRemaining = 1,
                TeamCombo = 0,
                ShipsRemaining = 5
            };
            _db.NavalTeams.Add(team);
        }
        else
        {
            // Reset về trạng thái khởi đầu trận đấu
            team.RadarRemaining = 2;
            team.ShieldRemaining = 2;
            team.PrecisionShotRemaining = 1;
            team.TeamCombo = 0;
            team.ShipsRemaining = 5;
        }
    }
}
