using GamingEdu.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GamingEdu.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<UploadController> _logger;

    private const long MaxFileSizeBytes = 15 * 1024 * 1024; // 15 MB
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".docx",
        ".txt"
    };

    public UploadController(IWebHostEnvironment env, ILogger<UploadController> logger)
    {
        _env = env;
        _logger = logger;
    }

    /// <summary>
    /// Tiếp nhận tải file tài liệu (PDF, DOCX, TXT) với dung lượng tối đa 15MB.
    /// Trả về URL tĩnh /uploads/{guid}_{filename} để chuyển tiếp vào AI Job.
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(16 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<FileUploadResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Upload([FromForm] IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new ApiResponse<string>(false, "Vui lòng chọn file hợp lệ để tải lên.", null));
        }

        if (file.Length > MaxFileSizeBytes)
        {
            return BadRequest(new ApiResponse<string>(
                false,
                $"Dung lượng file vượt quá giới hạn 15MB (dung lượng file gửi lên: {file.Length / (1024.0 * 1024.0):F2}MB).",
                null));
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(extension) || !AllowedExtensions.Contains(extension))
        {
            return BadRequest(new ApiResponse<string>(
                false,
                $"Định dạng file '{extension}' không được hỗ trợ. Hệ thống chỉ hỗ trợ: {string.Join(", ", AllowedExtensions)}.",
                null));
        }

        try
        {
            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsFolder = Path.Combine(webRoot, "uploads");

            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var originalName = Path.GetFileNameWithoutExtension(file.FileName);
            var sanitizedName = string.Concat(originalName.Split(Path.GetInvalidFileNameChars())).Replace(" ", "_");
            if (string.IsNullOrWhiteSpace(sanitizedName))
            {
                sanitizedName = "document";
            }
            if (sanitizedName.Length > 50)
            {
                sanitizedName = sanitizedName[..50];
            }

            var uniqueFileName = $"{Guid.NewGuid():N}_{sanitizedName}{extension}";
            var physicalPath = Path.Combine(uploadsFolder, uniqueFileName);

            await using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var fileUrl = $"/uploads/{uniqueFileName}";
            _logger.LogInformation("Đã tải file lên thành công: {Original} -> {Saved} ({Size} bytes)",
                file.FileName, uniqueFileName, file.Length);

            var result = new FileUploadResponseDto(fileUrl, file.FileName, file.Length, extension);
            return Ok(new ApiResponse<FileUploadResponseDto>(true, "Tải file lên thành công.", result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi xảy ra khi lưu trữ file tải lên {FileName}", file.FileName);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ApiResponse<string>(false, "Đã xảy ra lỗi trên máy chủ khi lưu file tải lên.", null));
        }
    }
}
