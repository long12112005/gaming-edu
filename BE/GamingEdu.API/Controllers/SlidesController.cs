using System.Security.Claims;
using System.Text.Json;
using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Controllers;

/// <summary>
/// Slide management under a Quiz:
///   POST   /api/quizzes/{quizId}/slides                    → Tạo slide mới
///   PUT    /api/quizzes/{quizId}/slides/{slideId}          → Cập nhật slide
///   DELETE /api/quizzes/{quizId}/slides/{slideId}          → Xóa slide
///   PATCH  /api/quizzes/{quizId}/slides/reorder            → Đổi thứ tự hàng loạt
///   POST   /api/quizzes/{quizId}/slides/{slideId}/approve  → Approve AI slide (DRAFT→PUBLISHED)
///   POST   /api/quizzes/{quizId}/slides/{slideId}/reject   → Reject AI slide (xóa)
///   POST   /api/quizzes/{quizId}/slides/approve-all        → Approve toàn bộ DRAFT AI slides
/// </summary>
[ApiController]
[Route("api/quizzes/{quizId:guid}/slides")]
[Produces("application/json")]
[Authorize]
public class SlidesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IQuizService         _quizService;
    private readonly ILogger<SlidesController> _logger;

    public SlidesController(
        ApplicationDbContext db,
        IQuizService quizService,
        ILogger<SlidesController> logger)
    {
        _db          = db;
        _quizService = quizService;
        _logger      = logger;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POST /api/quizzes/{quizId}/slides
    // ═══════════════════════════════════════════════════════════════════════════
    /// <summary>
    /// Tạo một slide mới trong bộ đề.
    /// Bắt buộc xác thực. Người dùng phải là chủ của quiz.
    /// AI-generated slides luôn được tạo với Status = "DRAFT".
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<SlideDto>), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> CreateSlide(Guid quizId, [FromBody] CreateSlideRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        // Kiểm tra quiz tồn tại và người dùng là chủ
        var quiz = await _db.Quizzes
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == quizId);
        if (quiz is null)
            return NotFound(Fail("Không tìm thấy bộ đề."));
        if (quiz.CreatorId != userId.Value)
            return StatusCode(403, Fail("Bạn không có quyền chỉnh sửa bộ đề này."));

        // Xác định OrderIndex (cuối danh sách nếu không truyền)
        int orderIndex = request.OrderIndex ?? await _db.Slides
            .Where(s => s.QuizId == quizId)
            .CountAsync();

        var slide = new Slide
        {
            Id            = Guid.NewGuid(),
            QuizId        = quizId,
            Type          = request.Type,
            QuestionText  = request.QuestionText.Trim(),
            TimeLimit     = request.TimeLimit,
            Points        = request.Points,
            // AI-generated slides bắt buộc là DRAFT; manual slides dùng status yêu cầu
            Status        = request.IsAIGenerated ? "DRAFT" : (request.Status ?? "DRAFT"),
            OrderIndex    = orderIndex,
            IsAIGenerated = request.IsAIGenerated,
            CreatedAt     = DateTime.UtcNow,
        };

        _db.Slides.Add(slide);

        // Tạo các options nếu có
        if (request.Options is { Count: > 0 })
        {
            ValidateOptions(request.Type, request.Options, out var validationError);
            if (validationError is not null)
                return BadRequest(Fail(validationError));

            for (int i = 0; i < request.Options.Count; i++)
            {
                var opt = request.Options[i];
                _db.SlideOptions.Add(new SlideOption
                {
                    Id            = Guid.NewGuid(),
                    SlideId       = slide.Id,
                    Content       = opt.Content.Trim(),
                    IsCorrect     = opt.IsCorrect,
                    MatchingPair  = opt.MatchingPair?.Trim(),
                    BlankKeywords = opt.BlankKeywords?.Trim(),
                    OrderIndex    = i,
                });
            }
        }

        // Cập nhật UpdatedAt của Quiz
        var quizTracked = await _db.Quizzes.FindAsync(quizId);
        if (quizTracked is not null) quizTracked.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Invalidate cache của quiz này
        await _quizService.InvalidatePublicQuizCacheAsync();

        _logger.LogInformation(
            "Slide {SlideId} created in Quiz {QuizId} by User {UserId} (AI={IsAI})",
            slide.Id, quizId, userId, request.IsAIGenerated);

        // Load lại slide với options để trả về
        var created = await LoadSlideDtoAsync(slide.Id);
        return CreatedAtAction(null, null,
            new ApiResponse<SlideDto>(true, "Câu hỏi đã được tạo thành công!", created));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUT /api/quizzes/{quizId}/slides/{slideId}
    // ═══════════════════════════════════════════════════════════════════════════
    /// <summary>
    /// Cập nhật nội dung một slide (bao gồm cả options).
    /// Xóa toàn bộ options cũ và tạo lại theo danh sách mới gửi lên.
    /// </summary>
    [HttpPut("{slideId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<SlideDto>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateSlide(
        Guid quizId, Guid slideId, [FromBody] UpdateSlideRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var (slide, error) = await GetSlideWithAuthCheckAsync(quizId, slideId, userId.Value);
        if (error is not null) return error;

        // Cập nhật các trường được truyền lên (null = giữ nguyên)
        if (request.Type         is not null) slide!.Type         = request.Type;
        if (request.QuestionText is not null) slide!.QuestionText = request.QuestionText.Trim();
        if (request.TimeLimit    is not null) slide!.TimeLimit    = request.TimeLimit.Value;
        if (request.Points       is not null) slide!.Points       = request.Points.Value;
        if (request.Status       is not null) slide!.Status       = request.Status;
        if (request.OrderIndex   is not null) slide!.OrderIndex   = request.OrderIndex.Value;

        // Nếu có options mới → xóa cũ và tạo lại
        if (request.Options is not null)
        {
            ValidateOptions(slide!.Type, request.Options, out var validationError);
            if (validationError is not null)
                return BadRequest(Fail(validationError));

            // Xóa options cũ
            var oldOptions = await _db.SlideOptions
                .Where(o => o.SlideId == slideId)
                .ToListAsync();
            _db.SlideOptions.RemoveRange(oldOptions);

            // Thêm options mới
            for (int i = 0; i < request.Options.Count; i++)
            {
                var opt = request.Options[i];
                _db.SlideOptions.Add(new SlideOption
                {
                    Id            = Guid.NewGuid(),
                    SlideId       = slideId,
                    Content       = opt.Content.Trim(),
                    IsCorrect     = opt.IsCorrect,
                    MatchingPair  = opt.MatchingPair?.Trim(),
                    BlankKeywords = opt.BlankKeywords?.Trim(),
                    OrderIndex    = i,
                });
            }
        }

        await _db.SaveChangesAsync();
        await _quizService.InvalidatePublicQuizCacheAsync();

        _logger.LogInformation("Slide {SlideId} updated by User {UserId}", slideId, userId);

        var updated = await LoadSlideDtoAsync(slideId);
        return new OkObjectResult(
            new ApiResponse<SlideDto>(true, "Câu hỏi đã được cập nhật.", updated));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE /api/quizzes/{quizId}/slides/{slideId}
    // ═══════════════════════════════════════════════════════════════════════════
    /// <summary>Xóa một slide và toàn bộ options của nó (CASCADE).</summary>
    [HttpDelete("{slideId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<string>), 200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DeleteSlide(Guid quizId, Guid slideId)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var (slide, error) = await GetSlideWithAuthCheckAsync(quizId, slideId, userId.Value);
        if (error is not null) return error;

        _db.Slides.Remove(slide!);
        await _db.SaveChangesAsync();
        await _quizService.InvalidatePublicQuizCacheAsync();

        _logger.LogInformation("Slide {SlideId} deleted by User {UserId}", slideId, userId);

        return new OkObjectResult(
            new ApiResponse<string>(true, "Câu hỏi đã được xóa.", null));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PATCH /api/quizzes/{quizId}/slides/reorder
    // ═══════════════════════════════════════════════════════════════════════════
    /// <summary>
    /// Đổi thứ tự slides hàng loạt.
    /// Body: [{ "slideId": "...", "orderIndex": 0 }, ...]
    /// </summary>
    [HttpPatch("reorder")]
    [ProducesResponseType(typeof(ApiResponse<string>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> ReorderSlides(
        Guid quizId, [FromBody] List<SlideOrderItem> items)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var quiz = await _db.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == quizId);
        if (quiz is null) return NotFound(Fail("Không tìm thấy bộ đề."));
        if (quiz.CreatorId != userId.Value)
            return StatusCode(403, Fail("Bạn không có quyền chỉnh sửa bộ đề này."));

        foreach (var item in items)
        {
            var slide = await _db.Slides
                .FirstOrDefaultAsync(s => s.Id == item.SlideId && s.QuizId == quizId);
            if (slide is not null)
                slide.OrderIndex = item.OrderIndex;
        }

        await _db.SaveChangesAsync();
        await _quizService.InvalidatePublicQuizCacheAsync();

        return new OkObjectResult(
            new ApiResponse<string>(true, "Thứ tự câu hỏi đã được cập nhật.", null));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POST /api/quizzes/{quizId}/slides/{slideId}/approve
    // ═══════════════════════════════════════════════════════════════════════════
    /// <summary>
    /// Human-in-the-loop: Phê duyệt một AI slide từ trạng thái DRAFT → PUBLISHED.
    /// Chỉ áp dụng cho slides có IsAIGenerated = true.
    /// </summary>
    [HttpPost("{slideId:guid}/approve")]
    [ProducesResponseType(typeof(ApiResponse<SlideDto>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ApproveSlide(Guid quizId, Guid slideId)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var (slide, error) = await GetSlideWithAuthCheckAsync(quizId, slideId, userId.Value);
        if (error is not null) return error;

        if (!slide!.IsAIGenerated)
            return BadRequest(Fail("Chỉ có thể duyệt câu hỏi được tạo bởi AI."));
        if (slide.Status == "PUBLISHED")
            return BadRequest(Fail("Câu hỏi này đã được duyệt rồi."));

        slide.Status = "PUBLISHED";
        await _db.SaveChangesAsync();
        await _quizService.InvalidatePublicQuizCacheAsync();

        _logger.LogInformation(
            "AI Slide {SlideId} approved by Host {UserId}", slideId, userId);

        var dto = await LoadSlideDtoAsync(slideId);
        return new OkObjectResult(
            new ApiResponse<SlideDto>(true, "Câu hỏi AI đã được phê duyệt và thêm vào thư viện.", dto));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POST /api/quizzes/{quizId}/slides/{slideId}/reject
    // ═══════════════════════════════════════════════════════════════════════════
    /// <summary>
    /// Human-in-the-loop: Từ chối và xóa một AI slide DRAFT.
    /// Chỉ áp dụng cho slides có IsAIGenerated = true và Status = DRAFT.
    /// </summary>
    [HttpPost("{slideId:guid}/reject")]
    [ProducesResponseType(typeof(ApiResponse<string>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> RejectSlide(Guid quizId, Guid slideId)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var (slide, error) = await GetSlideWithAuthCheckAsync(quizId, slideId, userId.Value);
        if (error is not null) return error;

        if (!slide!.IsAIGenerated)
            return BadRequest(Fail("Chỉ có thể từ chối câu hỏi được tạo bởi AI."));
        if (slide.Status == "PUBLISHED")
            return BadRequest(Fail("Không thể từ chối câu hỏi đã được duyệt. Hãy xóa nếu muốn."));

        _db.Slides.Remove(slide);
        await _db.SaveChangesAsync();
        await _quizService.InvalidatePublicQuizCacheAsync();

        _logger.LogInformation(
            "AI Slide {SlideId} rejected & deleted by Host {UserId}", slideId, userId);

        return new OkObjectResult(
            new ApiResponse<string>(true, "Câu hỏi AI đã bị từ chối và xóa khỏi hệ thống.", null));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POST /api/quizzes/{quizId}/slides/approve-all
    // ═══════════════════════════════════════════════════════════════════════════
    /// <summary>
    /// Duyệt hàng loạt toàn bộ AI slides đang ở trạng thái DRAFT trong quiz này.
    /// Thuận tiện cho host muốn chấp nhận tất cả gợi ý AI cùng lúc.
    /// </summary>
    [HttpPost("approve-all")]
    [ProducesResponseType(typeof(ApiResponse<ApproveAllResult>), 200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ApproveAllAiSlides(Guid quizId)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();

        var quiz = await _db.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == quizId);
        if (quiz is null) return NotFound(Fail("Không tìm thấy bộ đề."));
        if (quiz.CreatorId != userId.Value)
            return StatusCode(403, Fail("Bạn không có quyền chỉnh sửa bộ đề này."));

        var draftAiSlides = await _db.Slides
            .Where(s => s.QuizId == quizId && s.IsAIGenerated && s.Status == "DRAFT")
            .ToListAsync();

        int approvedCount = draftAiSlides.Count;
        foreach (var s in draftAiSlides)
            s.Status = "PUBLISHED";

        await _db.SaveChangesAsync();
        await _quizService.InvalidatePublicQuizCacheAsync();

        _logger.LogInformation(
            "Host {UserId} approved {Count} AI slides in Quiz {QuizId}",
            userId, approvedCount, quizId);

        return new OkObjectResult(
            new ApiResponse<ApproveAllResult>(
                true,
                $"Đã duyệt {approvedCount} câu hỏi AI thành công.",
                new ApproveAllResult(approvedCount)));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ── HELPERS ────────────────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Load slide kèm options và map sang SlideDto.
    /// Trả null nếu không tìm thấy.
    /// </summary>
    private async Task<SlideDto?> LoadSlideDtoAsync(Guid slideId)
    {
        var s = await _db.Slides
            .AsNoTracking()
            .Include(x => x.Options.OrderBy(o => o.OrderIndex))
            .FirstOrDefaultAsync(x => x.Id == slideId);
        if (s is null) return null;

        return new SlideDto(
            s.Id, s.Type, s.QuestionText, s.TimeLimit, s.Points,
            s.Status, s.OrderIndex, s.IsAIGenerated,
            s.Options.Select(o => new SlideOptionDto(
                o.Id, o.Content, o.IsCorrect, o.MatchingPair,
                o.BlankKeywords, o.OrderIndex)));
    }

    /// <summary>
    /// Tìm slide, kiểm tra thuộc quizId và userId là chủ quiz.
    /// Trả (slide, null) nếu OK, hoặc (null, errorResult) nếu lỗi.
    /// </summary>
    private async Task<(Slide? slide, IActionResult? error)> GetSlideWithAuthCheckAsync(
        Guid quizId, Guid slideId, Guid userId)
    {
        var quiz = await _db.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == quizId);
        if (quiz is null)
            return (null, NotFound(Fail("Không tìm thấy bộ đề.")));
        if (quiz.CreatorId != userId)
            return (null, StatusCode(403, Fail("Bạn không có quyền chỉnh sửa bộ đề này.")));

        var slide = await _db.Slides
            .Include(s => s.Options)
            .FirstOrDefaultAsync(s => s.Id == slideId && s.QuizId == quizId);
        if (slide is null)
            return (null, NotFound(Fail("Không tìm thấy câu hỏi.")));

        return (slide, null);
    }

    /// <summary>
    /// Validate options theo loại slide.
    /// Trả validationError = null nếu hợp lệ.
    /// </summary>
    private static void ValidateOptions(
        string slideType,
        IList<SlideOptionRequest> options,
        out string? validationError)
    {
        validationError = null;
        switch (slideType)
        {
            case "QUIZ":
                if (options.Count < 2)
                { validationError = "Câu trắc nghiệm cần ít nhất 2 đáp án."; return; }
                if (!options.Any(o => o.IsCorrect))
                { validationError = "Câu trắc nghiệm cần ít nhất 1 đáp án đúng."; return; }
                break;

            case "FILL_IN_BLANK":
                if (options.Count == 0)
                { validationError = "Câu điền khuyết cần ít nhất 1 từ khóa đúng."; return; }
                if (options.Any(o => string.IsNullOrWhiteSpace(o.BlankKeywords)))
                { validationError = "Từ khóa đúng (BlankKeywords) không được để trống."; return; }
                break;

            case "MATCHING":
                if (options.Count < 2)
                { validationError = "Câu ghép nối cần ít nhất 2 cặp."; return; }
                if (options.Any(o => string.IsNullOrWhiteSpace(o.MatchingPair)))
                { validationError = "Mỗi đáp án trong câu ghép nối cần có cặp tương ứng (MatchingPair)."; return; }
                break;
        }
    }

    // ── Response helpers ────────────────────────────────────────────────────────
    private static ApiResponse<string> Fail(string message)
        => new(false, message, null);

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
