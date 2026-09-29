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

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
