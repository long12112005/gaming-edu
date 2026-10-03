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

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("send-register-otp")]
    [EnableRateLimiting("OtpRateLimit")]
    public async Task<IActionResult> SendRegisterOtp([FromBody] SendRegisterOtpRequest request)
    {
        try
        {
            await _auth.SendRegisterOtpAsync(request);
            return Ok(new ApiResponse<string>(true, "Đã gửi mã OTP đăng ký.", null));
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
        await _auth.SendForgotPasswordOtpAsync(request);
        return Ok(new ApiResponse<string>(true, "Nếu email tồn tại, OTP sẽ được gửi.", null));
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
