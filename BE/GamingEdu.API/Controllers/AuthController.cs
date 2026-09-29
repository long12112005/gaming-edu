using GamingEdu.API.DTOs;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace GamingEdu.API.Controllers;

/// <summary>
/// Authentication endpoints: POST /api/auth/register, POST /api/auth/login
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    // POST /api/auth/register
    /// <summary>Register a new user. Maps to users + user_quotas tables.</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 201)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 409)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await _auth.RegisterAsync(request);
            return CreatedAtAction(nameof(Register),
                new ApiResponse<AuthResponse>(true, "Đăng ký thành công!", result));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    // POST /api/auth/login
    /// <summary>Login and receive JWT token. Checks users.status and locked_until.</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 401)]
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
}
