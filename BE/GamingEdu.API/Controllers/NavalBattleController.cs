using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class NavalBattleController : ControllerBase
{
    private readonly INavalMapService _mapService;
    private readonly INavalCombatService _combatService;
    private readonly ApplicationDbContext _db;
    private readonly ILogger<NavalBattleController> _logger;

    public NavalBattleController(
        INavalMapService mapService,
        INavalCombatService combatService,
        ApplicationDbContext db,
        ILogger<NavalBattleController> logger)
    {
        _mapService = mapService;
        _combatService = combatService;
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Khởi tạo lưới bản đồ và đặt ngẫu nhiên 5 tàu (kích thước 1, 2, 3, 4, 5 ô) cho 2 đội (TEAM_A, TEAM_B).
    /// </summary>
    [Authorize]
    [HttpPost("rooms/{roomId:guid}/initialize-map")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> InitializeBattleMap(Guid roomId, [FromQuery] int mapSize = 15)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var (teamAShips, teamBShips) = await _mapService.InitializeBattleMapAsync(roomId, mapSize);

            return Ok(new ApiResponse<object>(true, $"Khởi tạo bản đồ {mapSize}x{mapSize} thành công cho 2 đội.", new
            {
                roomId,
                mapSize,
                teamAShipsCount = teamAShips.Count,
                teamBShipsCount = teamBShips.Count
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi khởi tạo bản đồ thủy chiến cho phòng {RoomId}", roomId);
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    /// <summary>
    /// Lấy thông tin trạng thái 2 đội trong phòng (Lá chắn, Radar, Số tàu còn lại, Combo đội).
    /// </summary>
    [HttpGet("rooms/{roomId:guid}/teams")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<NavalTeamStateDto>>), 200)]
    public async Task<IActionResult> GetRoomTeams(Guid roomId)
    {
        var teams = await _db.NavalTeams
            .Where(t => t.RoomId == roomId)
            .Select(t => new NavalTeamStateDto(
                t.Id,
                t.RoomId,
                t.TeamSide,
                t.RadarRemaining,
                t.ShieldRemaining,
                t.PrecisionShotRemaining,
                t.TeamCombo,
                t.ShipsRemaining
            ))
            .ToListAsync();

        return Ok(new ApiResponse<IEnumerable<NavalTeamStateDto>>(true, "Lấy danh sách đội thành công.", teams));
    }

    /// <summary>
    /// Lấy danh sách tàu chiến của đội mình (chỉ hiển thị tọa độ tàu của đội mà người chơi thuộc về).
    /// </summary>
    [HttpGet("rooms/{roomId:guid}/my-ships")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<NavalShipDto>>), 200)]
    public async Task<IActionResult> GetMyShips(Guid roomId, [FromQuery] Guid playerId)
    {
        var player = await _db.RoomPlayers.FindAsync(playerId);
        if (player == null || player.RoomId != roomId)
        {
            return NotFound(new ApiResponse<string>(false, "Không tìm thấy người chơi trong phòng.", null));
        }

        if (string.IsNullOrEmpty(player.TeamSide))
        {
            return BadRequest(new ApiResponse<string>(false, "Người chơi chưa được phân đội.", null));
        }

        var ships = await _mapService.GetTeamShipsAsync(roomId, player.TeamSide);
        var shipDtos = ships.Select(s => new NavalShipDto(
            s.Id,
            s.RoomId,
            s.TeamSide,
            s.ShipType,
            JsonSerializer.Deserialize<List<ShipCoordinate>>(s.Coordinates) ?? [],
            s.IsSunk
        ));

        return Ok(new ApiResponse<IEnumerable<NavalShipDto>>(true, "Lấy đội tàu thành công.", shipDtos));
    }

    /// <summary>
    /// Gửi câu trả lời Slide để kiểm tra đáp án, tăng combo & energy và cấp quyền bắn (shots_earned).
    /// </summary>
    [HttpPost("rooms/{roomId:guid}/players/{playerId:guid}/answers")]
    [ProducesResponseType(typeof(ApiResponse<NavalAnswerResultDto>), 200)]
    public async Task<IActionResult> SubmitNavalAnswer(
        Guid roomId, Guid playerId, [FromBody] NavalAnswerRequest request)
    {
        try
        {
            var result = await _combatService.ProcessAnswerAsync(
                roomId, playerId, request.SlideId, request.AnswerData, request.ResponseTimeMs);

            return Ok(new ApiResponse<NavalAnswerResultDto>(true, result.IsCorrect ? "Trả lời chính xác! Bạn nhận được 1 quyền bắn." : "Rất tiếc, câu trả lời chưa chính xác.", result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xử lý đáp án Hải Chiến của người chơi {PlayerId}", playerId);
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    /// <summary>
    /// Bắn vào tọa độ (row, col) trên bản đồ đối phương.
    /// Kiểm tra trùng ô, kiểm tra Lá chắn shielded, cập nhật HIT/MISS/SUNK và kiểm tra điều kiện kết thúc trận đấu.
    /// </summary>
    [HttpPost("rooms/{roomId:guid}/players/{playerId:guid}/shots")]
    [ProducesResponseType(typeof(ApiResponse<NavalShotResultDto>), 200)]
    public async Task<IActionResult> FireShot(
        Guid roomId, Guid playerId, [FromBody] NavalShotRequest request)
    {
        try
        {
            var result = await _combatService.FireShotAsync(
                roomId, playerId, request.TargetRow, request.TargetCol, request.ActionType);

            return Ok(new ApiResponse<NavalShotResultDto>(true, result.Message, result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi thực hiện phát bắn cho người chơi {PlayerId}", playerId);
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    /// <summary>
    /// Kích hoạt Radar dò tìm quét khu vực 3x3 quanh (centerRow, centerCol).
    /// </summary>
    [HttpPost("rooms/{roomId:guid}/players/{playerId:guid}/skills/radar")]
    [ProducesResponseType(typeof(ApiResponse<RadarScanResultDto>), 200)]
    public async Task<IActionResult> UseRadar(
        Guid roomId, Guid playerId, [FromBody] RadarScanRequest request)
    {
        try
        {
            var result = await _combatService.UseRadarScanAsync(
                roomId, playerId, request.CenterRow, request.CenterCol);

            return Ok(new ApiResponse<RadarScanResultDto>(result.Success, result.Message, result));
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    /// <summary>
    /// Kích hoạt Lá chắn phòng thủ cho 1 ô tàu của đội mình.
    /// </summary>
    [HttpPost("rooms/{roomId:guid}/players/{playerId:guid}/skills/shield")]
    [ProducesResponseType(typeof(ApiResponse<ShieldActivateResultDto>), 200)]
    public async Task<IActionResult> ActivateShield(
        Guid roomId, Guid playerId, [FromBody] ShieldActivateRequest request)
    {
        try
        {
            var result = await _combatService.ActivateShieldAsync(
                roomId, playerId, request.TargetRow, request.TargetCol);

            return Ok(new ApiResponse<ShieldActivateResultDto>(result.Success, result.Message, result));
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    /// <summary>
    /// Kiểm tra kết quả trận đấu hoặc Chủ phòng kết thúc trận đấu sớm.
    /// Phân định thắng thua theo đúng 4 tiêu chí ưu tiên trong tài liệu thiết kế game.
    /// </summary>
    [HttpGet("rooms/{roomId:guid}/evaluate")]
    [ProducesResponseType(typeof(ApiResponse<NavalMatchResultDto>), 200)]
    public async Task<IActionResult> EvaluateMatchResult(Guid roomId, [FromQuery] bool isEarlyTermination = false)
    {
        try
        {
            var result = await _combatService.EvaluateMatchResultAsync(roomId, isEarlyTermination);
            return Ok(new ApiResponse<NavalMatchResultDto>(true, result.WinReason, result));
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    /// <summary>
    /// Lấy bảng xếp hạng đóng góp thành tích cá nhân trong trận Hải Chiến.
    /// </summary>
    [HttpGet("rooms/{roomId:guid}/contributions")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<NavalPlayerContributionDto>>), 200)]
    public async Task<IActionResult> GetPlayerContributions(Guid roomId)
    {
        try
        {
            var list = await _combatService.GetPlayerContributionsAsync(roomId);
            return Ok(new ApiResponse<IEnumerable<NavalPlayerContributionDto>>(true, "Lấy danh sách thành tích cá nhân thành công.", list));
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
