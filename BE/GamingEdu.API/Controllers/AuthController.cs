using GamingEdu.API.DTOs;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GamingEdu.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IConfiguration _config;

    public AuthController(IAuthService auth, IConfiguration config)
    {
        _auth = auth;
        _config = config;
    }

    [HttpPost("send-register-otp")]
    [EnableRateLimiting("OtpRateLimit")]
    public async Task<IActionResult> SendRegisterOtp([FromBody] SendRegisterOtpRequest request)
    {
        try
        {
            var otp = await _auth.SendRegisterOtpAsync(request);
            var isMock = string.IsNullOrEmpty(_config["Smtp:User"]) || _config["Smtp:User"]?.Contains("YOUR_GMAIL") == true;
            var message = isMock 
                ? $"[DEV] Mã OTP là {otp} (Chưa cấu hình Gmail SMTP thực tế)" 
                : "Đã gửi mã OTP đăng ký tới email của bạn.";
            return Ok(new ApiResponse<string>(true, message, isMock ? otp : null));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await _auth.RegisterAsync(request);
            return CreatedAtAction(nameof(Register), new ApiResponse<AuthResponse>(true, "Đăng ký thành công!", result));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _auth.LoginAsync(request);
            return Ok(new ApiResponse<AuthResponse>(true, "Đăng nhập thành công!", result));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("OtpRateLimit")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var otp = await _auth.SendForgotPasswordOtpAsync(request);
        var isMock = string.IsNullOrEmpty(_config["Smtp:User"]) || _config["Smtp:User"]?.Contains("YOUR_GMAIL") == true;
        var message = isMock && otp != null
            ? $"[DEV] Mã OTP là {otp} (Chưa cấu hình Gmail SMTP thực tế)"
            : "Nếu email tồn tại, OTP sẽ được gửi.";
        return Ok(new ApiResponse<string>(true, message, isMock ? otp : null));
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        try
        {
            await _auth.ResetPasswordAsync(request);
            return Ok(new ApiResponse<string>(true, "Đặt lại mật khẩu thành công.", null));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }
}
