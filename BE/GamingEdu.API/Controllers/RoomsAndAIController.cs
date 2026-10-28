using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
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

    // GET /api/rooms/{id:guid}
    /// <summary>Find a room by ID. Used for room detail and report views.</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<RoomDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetRoomById(Guid id)
    {
        var room = await _roomService.GetRoomByIdAsync(id);
        if (room is null)
            return NotFound(new ApiResponse<string>(false, "Không tìm thấy phòng với ID này.", null));

        var qrCode = _roomService.GenerateQrCodeBase64(room.PinCode);
        var theme = await _roomService.GetRoomThemeAsync(room.Id);
        var slideCount = await _db.Slides.CountAsync(s => s.QuizId == room.QuizId && !s.IsDeleted);
        int? questionTimeLimit = null;
        if (!string.IsNullOrEmpty(room.GameSettings))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(room.GameSettings);
                if (doc.RootElement.TryGetProperty("questionTimeLimit", out var qtlProp))
                {
                    questionTimeLimit = qtlProp.GetInt32();
                }
            }
            catch {}
        }
        var dto = new RoomDto(
            room.Id, room.PinCode, room.Mode, room.Status,
            room.QuizId, room.Quiz?.Title ?? "", room.CreatedAt, qrCode, theme, slideCount, room.HostId,
            room.EndTime, questionTimeLimit, room.IsEarlyFinished);

        return Ok(new ApiResponse<RoomDto>(true, null, dto));
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

        var qrCode = _roomService.GenerateQrCodeBase64(room.PinCode);
        var theme = await _roomService.GetRoomThemeAsync(room.Id);
        var slideCount = await _db.Slides.CountAsync(s => s.QuizId == room.QuizId && !s.IsDeleted);
        int? questionTimeLimit = null;
        if (!string.IsNullOrEmpty(room.GameSettings))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(room.GameSettings);
                if (doc.RootElement.TryGetProperty("questionTimeLimit", out var qtlProp))
                {
                    questionTimeLimit = qtlProp.GetInt32();
                }
            }
            catch {}
        }
        var dto = new RoomDto(
            room.Id, room.PinCode, room.Mode, room.Status,
            room.QuizId, room.Quiz?.Title ?? "", room.CreatedAt, qrCode, theme, slideCount, room.HostId,
            room.EndTime, questionTimeLimit, room.IsEarlyFinished);

        return Ok(new ApiResponse<RoomDto>(true, null, dto));
    }

    // GET /api/rooms/{id}/arena-progress
    /// <summary>Get 60 FPS arena players progress for a room.</summary>
    [HttpGet("{id:guid}/arena-progress")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<PlayerArenaProgressDto>>), 200)]
    public async Task<IActionResult> GetArenaProgress(Guid id)
    {
        var progress = await _roomService.GetRoomPlayersArenaProgressAsync(id);
        return Ok(new ApiResponse<List<PlayerArenaProgressDto>>(true, null, progress));
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

    // POST /api/rooms/{id}/invite-group/{groupId}
    /// <summary>Send SignalR invite to all members of a group to join the room.</summary>
    [HttpPost("{id:guid}/invite-group/{groupId:guid}")]
    public async Task<IActionResult> InviteGroup(Guid id, Guid groupId)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            await _roomService.InviteGroupAsync(userId.Value, id, groupId);
            return Ok(new ApiResponse<string>(true, "Đã gửi lời mời đến tất cả thành viên trong nhóm.", null));
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse<string>(false, ex.Message, null)); }
        catch (KeyNotFoundException ex) { return NotFound(new ApiResponse<string>(false, ex.Message, null)); }
    }

    // PUT /api/rooms/answers/draft or PUT /api/answers/draft
    /// <summary>Auto-save draft answer every 30s to Redis cache.</summary>
    [HttpPut("answers/draft")]
    [HttpPut("/api/answers/draft")]
    public async Task<IActionResult> SaveDraftAnswer([FromBody] SaveDraftRequest request)
    {
        await _roomService.SaveDraftAnswerAsync(request.RoomPlayerId, request.SlideId, request.AnswerData);
        return Ok(new ApiResponse<string>(true, "Đã lưu bản nháp vào Redis Cache.", null));
    }

    // GET /api/rooms/answers/draft or GET /api/answers/draft
    /// <summary>Lấy bản nháp câu trả lời từ Redis cache khi thí sinh tải lại trang.</summary>
    [HttpGet("answers/draft")]
    [HttpGet("/api/answers/draft")]
    public async Task<IActionResult> GetDraftAnswer([FromQuery] Guid roomPlayerId, [FromQuery] Guid slideId)
    {
        var draft = await _roomService.GetDraftAnswerAsync(roomPlayerId, slideId);
        if (draft is null)
        {
            return NotFound(new ApiResponse<string>(false, "Không có bản nháp nào được lưu.", null));
        }

        return Ok(new ApiResponse<string>(true, "Lấy bản nháp thành công.", draft));
    }

    // POST /api/rooms/{id}/start
    /// <summary>Start the room and transition status to PLAYING.</summary>
    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> StartRoom(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var room = await _roomService.GetRoomByIdAsync(id);
        if (room is null) return NotFound(new ApiResponse<string>(false, "Không tìm thấy phòng.", null));
        if (room.HostId != userId.Value) return StatusCode(403, new ApiResponse<string>(false, "Bạn không phải chủ phòng này.", null));

        await _roomService.UpdateRoomStatusAsync(id, "PLAYING");
        return Ok(new ApiResponse<string>(true, "Phòng đã bắt đầu thi đấu.", null));
    }

    // POST /api/rooms/{id}/finish
    /// <summary>Finish the room and return top 3 for podium.</summary>
    [HttpPost("{id:guid}/finish")]
    public async Task<IActionResult> FinishRoom(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var top3 = await _roomService.FinishRoomAsync(id, userId.Value);
            return Ok(new ApiResponse<IEnumerable<LeaderboardEntryDto>>(true, "Phòng đã kết thúc.", top3));
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse<string>(false, ex.Message, null)); }
        catch (KeyNotFoundException ex) { return NotFound(new ApiResponse<string>(false, ex.Message, null)); }
    }

    // PUT /api/rooms/{id}/tournament-settings
    /// <summary>Chủ phòng cập nhật thời gian kết thúc và thời gian câu hỏi cho phòng giải đấu.</summary>
    [HttpPut("{id:guid}/tournament-settings")]
    public async Task<IActionResult> UpdateTournamentSettings(Guid id, [FromBody] UpdateTournamentSettingsRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var updated = await _roomService.UpdateTournamentSettingsAsync(id, userId.Value, request);
            return Ok(new ApiResponse<RoomDto>(true, "Đã cập nhật cài đặt giải đấu thành công.", updated));
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse<string>(false, ex.Message, null)); }
        catch (KeyNotFoundException ex) { return NotFound(new ApiResponse<string>(false, ex.Message, null)); }
    }

    // GET /api/rooms/history/hosted
    /// <summary>Lấy danh sách các phòng do user đã tạo/chủ trì.</summary>
    [HttpGet("history/hosted")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<HostedRoomHistoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHostedRoomsHistory()
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var history = await _roomService.GetHostedRoomsHistoryAsync(userId.Value);
        return Ok(new ApiResponse<IEnumerable<HostedRoomHistoryDto>>(true, "Lấy lịch sử phòng đã tạo thành công.", history));
    }

    // GET /api/rooms/history/played
    /// <summary>Lấy lịch sử các phòng user đã tham gia chơi.</summary>
    [HttpGet("history/played")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<PlayedRoomHistoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlayedRoomsHistory()
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var history = await _roomService.GetPlayedRoomsHistoryAsync(userId.Value);
        return Ok(new ApiResponse<IEnumerable<PlayedRoomHistoryDto>>(true, "Lấy lịch sử phòng đã chơi thành công.", history));
    }

    // GET /api/rooms/{id}/report
    /// <summary>Lấy dữ liệu báo cáo phân tích chi tiết của phòng chơi (JSON).</summary>
    [HttpGet("{id:guid}/report")]
    [ProducesResponseType(typeof(ApiResponse<RoomDetailReportDto>), 200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetRoomDetailReport(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var report = await _roomService.GetRoomReportDetailAsync(id, userId.Value);
            return Ok(new ApiResponse<RoomDetailReportDto>(true, "Lấy báo cáo chi tiết thành công.", report));
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse<string>(false, ex.Message, null)); }
        catch (KeyNotFoundException ex) { return NotFound(new ApiResponse<string>(false, ex.Message, null)); }
    }

    // GET /api/rooms/history
    /// <summary>Lấy tổng hợp lịch sử cả phòng đã host và phòng đã chơi.</summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetCombinedRoomHistory()
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var hosted = await _roomService.GetHostedRoomsHistoryAsync(userId.Value);
        var played = await _roomService.GetPlayedRoomsHistoryAsync(userId.Value);

        return Ok(new ApiResponse<object>(true, "Lấy lịch sử phòng thành công.", new
        {
            hosted,
            played
        }));
    }

    // GET /api/rooms/{id}/export
    /// <summary>Export room results to Excel.</summary>
    [HttpGet("{id:guid}/export")]
    public async Task<IActionResult> ExportRoomReport(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var fileBytes = await _roomService.ExportRoomReportAsync(id, userId.Value);
            var fileName = $"Room_{id}_Report.xlsx";
            Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");
            return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse<string>(false, ex.Message, null)); }
        catch (KeyNotFoundException ex) { return NotFound(new ApiResponse<string>(false, ex.Message, null)); }
    }

    // GET /api/rooms/{id}/detailed-report
    /// <summary>Get detailed results for room.</summary>
    [HttpGet("{id:guid}/detailed-report")]
    public async Task<IActionResult> GetDetailedReport(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var report = await _roomService.GetRoomDetailedReportAsync(id, userId.Value);
            return Ok(new ApiResponse<RoomDetailedReportDto>(true, "Lấy báo cáo chi tiết phòng thành công.", report));
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse<string>(false, ex.Message, null)); }
        catch (KeyNotFoundException ex) { return NotFound(new ApiResponse<string>(false, ex.Message, null)); }
    }

    // POST /api/rooms/{id}/close
    /// <summary>Close room permanently.</summary>
    [HttpPost("{id:guid}/close")]
    public async Task<IActionResult> CloseRoom(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            await _roomService.CloseRoomAsync(id, userId.Value);
            return Ok(new ApiResponse<string>(true, "Đã đóng phòng thành công.", null));
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse<string>(false, ex.Message, null)); }
        catch (KeyNotFoundException ex) { return NotFound(new ApiResponse<string>(false, ex.Message, null)); }
    }

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}

/// <summary>
/// AI Job endpoints: POST /api/aijobs (queue), GET /api/aijobs/{id} (status check)
/// </summary>
public record QuickParseAIRequest(string? Text, string? FileUrl = null, int? QuestionCount = null, string? Topic = null);

[ApiController]
[Route("api/aijobs")]
[Produces("application/json")]
[Authorize]
public class AIJobsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICacheStore _cache;
    private readonly IGeminiApiService _geminiService;

    public AIJobsController(ApplicationDbContext db, ICacheStore cache, IGeminiApiService geminiService)
    {
        _db = db;
        _cache = cache;
        _geminiService = geminiService;
    }

    // POST /api/aijobs/quick-parse
    /// <summary>Phân tích nhanh tài liệu văn bản thành câu hỏi qua Gemini AI.</summary>
    [HttpPost("quick-parse")]
    [AllowAnonymous]
    public async Task<IActionResult> QuickParseText([FromBody] QuickParseAIRequest request)
    {
        string text = request.Text ?? "";
        if (!string.IsNullOrWhiteSpace(request.FileUrl))
        {
            var webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var localPath = Path.Combine(webRoot, request.FileUrl.TrimStart('/', '\\'));
            var fileText = GeminiApiService.ExtractTextFromFile(localPath);
            if (!string.IsNullOrWhiteSpace(fileText))
            {
                text = $"{text}\n\n--- NỘI DUNG TÀI LIỆU ---\n{fileText}";
            }
        }

        if (string.IsNullOrWhiteSpace(text))
            return BadRequest(new ApiResponse<string>(false, "Vui lòng cung cấp nội dung văn bản hoặc file tài liệu để phân tích.", null));

        try
        {
            var json = await _geminiService.GenerateQuizJsonAsync(text, request.FileUrl, request.QuestionCount);
            return Ok(new ApiResponse<string>(true, "Phân tích tài liệu thành công.", json));
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    // POST /api/aijobs/parse-document
    /// <summary>Phân tích trực tiếp file tài liệu (PDF, DOCX, TXT) hoặc prompt văn bản với số lượng câu hỏi tùy chọn.</summary>
    [HttpPost("parse-document")]
    [AllowAnonymous]
    [RequestSizeLimit(30 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ParseDocument([FromForm] IFormFile? file, [FromForm] string? prompt, [FromForm] int? questionCount)
    {
        try
        {
            string extractedText = string.Empty;
            string? fileUrl = null;

            if (file != null && file.Length > 0)
            {
                var webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var uploadsFolder = Path.Combine(webRoot, "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                var savedName = $"{Guid.NewGuid():N}_{Path.GetFileNameWithoutExtension(file.FileName)}{extension}";
                var physicalPath = Path.Combine(uploadsFolder, savedName);

                await using (var stream = new FileStream(physicalPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                fileUrl = $"/uploads/{savedName}";
                extractedText = GeminiApiService.ExtractTextFromFile(physicalPath);
            }

            var combinedPrompt = new StringBuilder();
            if (!string.IsNullOrWhiteSpace(prompt))
            {
                combinedPrompt.AppendLine(prompt.Trim());
            }

            if (!string.IsNullOrWhiteSpace(extractedText))
            {
                if (extractedText.Length > 100000) extractedText = extractedText[..100000];
                combinedPrompt.AppendLine();
                combinedPrompt.AppendLine("--- NỘI DUNG TÀI LIỆU CẦN PHÂN TÍCH ---");
                combinedPrompt.AppendLine(extractedText);
            }

            if (combinedPrompt.Length == 0)
            {
                return BadRequest(new ApiResponse<string>(false, "Vui lòng nhập chủ đề hoặc tải file tài liệu để AI phân tích.", null));
            }

            var json = await _geminiService.GenerateQuizJsonAsync(combinedPrompt.ToString(), fileUrl, questionCount);
            return Ok(new ApiResponse<string>(true, "Phân tích tài liệu và sinh đề thành công.", json));
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

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

        if (quota is not null)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (!quota.ResetDate.HasValue || quota.ResetDate.Value <= today)
            {
                quota.AIUsedToday = 0;
                quota.ResetDate = today.AddDays(1);
                await _db.SaveChangesAsync();
            }

            if (quota.AIUsedToday >= quota.AIGenerationLimit)
                return StatusCode(429, new ApiResponse<string>(
                    false,
                    $"Bạn đã dùng hết {quota.AIGenerationLimit} lượt sinh đề AI hôm nay. Reset lúc {quota.ResetDate}.",
                    null));
        }

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

    // GET /api/aijobs/{id}/draft
    /// <summary>Get the JSON draft of an AI job. Only available when COMPLETED.</summary>
    [HttpGet("{id:guid}/draft")]
    [ProducesResponseType(typeof(ApiResponse<string>), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> GetJobDraft(Guid id)
    {
        var job = await _db.AIJobs.FindAsync(id);
        if (job is null)
            return NotFound(new ApiResponse<string>(false, "Không tìm thấy AI Job.", null));

        if (job.Status != "COMPLETED")
            return BadRequest(new ApiResponse<string>(false, "Job chưa hoàn thành.", null));

        var draftKey = $"ai_draft:{id}";
        var draftJson = await _cache.GetStringAsync(draftKey);
        if (draftJson is null)
        {
            return NotFound(new ApiResponse<string>(false, "Bản nháp đã hết hạn hoặc không tồn tại.", null));
        }

        return Ok(new ApiResponse<string>(true, "Lấy bản nháp thành công", draftJson));
    }

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
