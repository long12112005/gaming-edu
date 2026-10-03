using System.Security.Claims;
using GamingEdu.API.DTOs;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GamingEdu.API.Controllers;

/// <summary>
/// Quiz management: GET /api/quizzes (public), GET /api/quizzes/{id}, POST /api/quizzes
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class QuizzesController : ControllerBase
{
    private readonly IQuizService _quizService;

    public QuizzesController(IQuizService quizService) => _quizService = quizService;

    // GET /api/quizzes
    /// <summary>
    /// Returns public quizzes (is_public = 1). Results are memory-cached.
    /// Maps to: quizzes table with Creator join.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<QuizSummaryDto>>), 200)]
    public async Task<IActionResult> GetPublicQuizzes()
    {
        var quizzes = await _quizService.GetPublicQuizzesAsync();
        return Ok(new ApiResponse<IEnumerable<QuizSummaryDto>>(true, null, quizzes));
    }

    // GET /api/quizzes/{id}
    /// <summary>Returns quiz detail with slides and options. Uses per-quiz cache.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<QuizDetailDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetQuizDetail(Guid id)
    {
        var quiz = await _quizService.GetQuizDetailAsync(id);
        if (quiz is null)
            return NotFound(new ApiResponse<string>(false, "Không tìm thấy bộ đề.", null));

        return Ok(new ApiResponse<QuizDetailDto>(true, null, quiz));
    }

    // POST /api/quizzes
    /// <summary>Create a new quiz (authenticated). Maps to quizzes table.</summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<QuizSummaryDto>), 201)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> CreateQuiz([FromBody] CreateQuizRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var quiz = await _quizService.CreateQuizAsync(userId.Value, request);
        return CreatedAtAction(nameof(GetQuizDetail), new { id = quiz.Id },
            new ApiResponse<QuizSummaryDto>(true, "Tạo bộ đề thành công!", quiz));
    }
    // PUT /api/quizzes/{id}
    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> UpdateQuiz(Guid id, [FromBody] UpdateQuizRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var quiz = await _quizService.UpdateQuizAsync(userId.Value, id, request);
            return Ok(new ApiResponse<QuizSummaryDto>(true, "Cập nhật bộ đề thành công!", quiz));
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse<string>(false, ex.Message, null)); }
        catch (KeyNotFoundException ex) { return NotFound(new ApiResponse<string>(false, ex.Message, null)); }
    }

    // DELETE /api/quizzes/{id}
    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteQuiz(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            await _quizService.DeleteQuizAsync(userId.Value, id);
            return Ok(new ApiResponse<string>(true, "Đã xóa bộ đề.", null));
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse<string>(false, ex.Message, null)); }
        catch (KeyNotFoundException ex) { return NotFound(new ApiResponse<string>(false, ex.Message, null)); }
    }

    // POST /api/quizzes/{id}/clone
    [HttpPost("{id:guid}/clone")]
    [Authorize]
    public async Task<IActionResult> CloneQuiz(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            var clone = await _quizService.CloneQuizAsync(userId.Value, id);
            return CreatedAtAction(nameof(GetQuizDetail), new { id = clone.Id },
                new ApiResponse<QuizSummaryDto>(true, "Đã nhân bản bộ đề thành công.", clone));
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse<string>(false, ex.Message, null)); }
        catch (KeyNotFoundException ex) { return NotFound(new ApiResponse<string>(false, ex.Message, null)); }
    }

    // PUT /api/quizzes/{quizId}/slides/{slideId}/approve
    [HttpPut("{quizId:guid}/slides/{slideId:guid}/approve")]
    [Authorize]
    public async Task<IActionResult> ApproveAISlide(Guid quizId, Guid slideId)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        try
        {
            await _quizService.ApproveAISlideAsync(userId.Value, quizId, slideId);
            return Ok(new ApiResponse<string>(true, "Đã duyệt slide.", null));
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse<string>(false, ex.Message, null)); }
        catch (KeyNotFoundException ex) { return NotFound(new ApiResponse<string>(false, ex.Message, null)); }
    }
    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
