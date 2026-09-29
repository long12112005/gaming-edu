using System.Security.Claims;
using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Controllers;

/// <summary>
/// Room endpoints: POST /api/rooms (create), GET /api/rooms/{pin} (find by PIN)
/// Answer submission is done via SignalR (GameHub.SubmitAnswer).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class RoomsController : ControllerBase
{
    private readonly IRoomService _roomService;
    private readonly ApplicationDbContext _db;

    public RoomsController(IRoomService roomService, ApplicationDbContext db)
    {
        _roomService = roomService;
        _db          = db;
    }

    // POST /api/rooms
    /// <summary>
    /// Create a new game room. Maps to rooms table.
    /// Requires authenticated user (host). Generates unique PIN code.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<RoomDto>), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var room = await _roomService.CreateRoomAsync(userId.Value, request);
            return CreatedAtAction(nameof(GetRoomByPin), new { pin = room.PinCode },
                new ApiResponse<RoomDto>(true, $"Phòng tạo thành công! Mã PIN: {room.PinCode}", room));
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    // GET /api/rooms/pin/{pin}
    /// <summary>Find a room by PIN code. Used before joining via SignalR.</summary>
    [HttpGet("pin/{pin}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<RoomDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetRoomByPin(string pin)
    {
        var room = await _roomService.GetRoomByPinAsync(pin);
        if (room is null)
            return NotFound(new ApiResponse<string>(false, "Không tìm thấy phòng với mã PIN này.", null));

        var dto = new RoomDto(
            room.Id, room.PinCode, room.Mode, room.Status,
            room.QuizId, room.Quiz?.Title ?? "", room.CreatedAt);

        return Ok(new ApiResponse<RoomDto>(true, null, dto));
    }

    // GET /api/rooms/{id}/leaderboard
    /// <summary>Get current leaderboard for a room. Maps to room_players ordered by total_score.</summary>
    [HttpGet("{id:guid}/leaderboard")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<LeaderboardEntryDto>>), 200)]
    public async Task<IActionResult> GetLeaderboard(Guid id)
    {
        var leaderboard = await _roomService.GetLeaderboardAsync(id);
        return Ok(new ApiResponse<IEnumerable<LeaderboardEntryDto>>(true, null, leaderboard));
    }

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

/// <summary>
/// AI Job endpoints: POST /api/aijobs (queue), GET /api/aijobs/{id} (status check)
/// </summary>
[ApiController]
[Route("api/aijobs")]
[Produces("application/json")]
[Authorize]
public class AIJobsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public AIJobsController(ApplicationDbContext db) => _db = db;

    // POST /api/aijobs
    /// <summary>Queue an AI quiz generation job. Maps to ai_jobs table.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<AIJobStatusDto>), 202)]
    public async Task<IActionResult> CreateJob([FromBody] CreateAIJobRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        // Check quota (maps to user_quotas.ai_used_today vs ai_generation_limit)
        var quota = await _db.UserQuotas
            .FirstOrDefaultAsync(q => q.UserId == userId.Value);

        if (quota is not null && quota.AIUsedToday >= quota.AIGenerationLimit)
            return StatusCode(429, new ApiResponse<string>(
                false,
                $"Bạn đã dùng hết {quota.AIGenerationLimit} lượt sinh đề AI hôm nay. Reset lúc {quota.ResetDate}.",
                null));

        var job = new AIJob
        {
            Id        = Guid.NewGuid(),
            UserId    = userId.Value,
            QuizId    = request.QuizId,
            FileUrl   = request.FileUrl,
            Status    = "PENDING",
            CreatedAt = DateTime.UtcNow,
        };

        _db.AIJobs.Add(job);
        await _db.SaveChangesAsync();

        var dto = new AIJobStatusDto(
            job.Id, job.Status, job.FileUrl,
            job.CreatedAt, job.CompletedAt, job.ErrorMessage);

        return Accepted(new ApiResponse<AIJobStatusDto>(
            true, "Yêu cầu sinh đề AI đã được đặt vào hàng đợi.", dto));
    }

    // GET /api/aijobs/{id}
    /// <summary>Check status of an AI job. Client polls until status = COMPLETED or FAILED.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AIJobStatusDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetJobStatus(Guid id)
    {
        var job = await _db.AIJobs.FindAsync(id);
        if (job is null)
            return NotFound(new ApiResponse<string>(false, "Không tìm thấy AI Job.", null));

        var dto = new AIJobStatusDto(
            job.Id, job.Status, job.FileUrl,
            job.CreatedAt, job.CompletedAt, job.ErrorMessage);

        return Ok(new ApiResponse<AIJobStatusDto>(true, null, dto));
    }

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
