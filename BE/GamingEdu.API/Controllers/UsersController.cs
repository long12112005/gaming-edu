using System.Security.Claims;
using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuthService _auth;

    public UsersController(ApplicationDbContext db, IAuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    private Guid GetCurrentUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // 1.5 Cập nhật thông tin cá nhân
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetCurrentUserId();
        var user = await _db.Users.FindAsync(userId);
        
        if (user == null || user.Status == "DELETED") 
            return NotFound(new ApiResponse<string>(false, "Không tìm thấy người dùng.", null));

        if (!string.IsNullOrWhiteSpace(request.Nickname))
            user.Nickname = request.Nickname.Trim();
            
        if (request.AvatarUrl != null) // Cho phép xóa avatar nếu truyền ""
            user.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl;

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new ApiResponse<string>(true, "Cập nhật hồ sơ thành công.", null));
    }

    // 1.6 Xóa tài khoản cá nhân (Soft delete)
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMyAccount()
    {
        var userId = GetCurrentUserId();
        var user = await _db.Users.FindAsync(userId);
        
        if (user == null) return NotFound();

        user.Status = "DELETED";
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _auth.LogoutAsync(userId); // Xóa session

        return Ok(new ApiResponse<string>(true, "Tài khoản đã được đưa vào trạng thái chờ xóa vĩnh viễn.", null));
    }
}

[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = "RequireAdmin")]
public class AdminUsersController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuthService _auth;

    public AdminUsersController(ApplicationDbContext db, IAuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    // Khóa tài khoản vi phạm
    [HttpPut("{userId}/lock")]
    public async Task<IActionResult> LockUser(Guid userId, [FromQuery] int lockMinutes = 1440)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound(new ApiResponse<string>(false, "User not found", null));

        user.Status = "LOCKED";
        user.LockedUntil = DateTime.UtcNow.AddMinutes(lockMinutes);
        user.UpdatedAt = DateTime.UtcNow;
        
        await _db.SaveChangesAsync();
        await _auth.LogoutAsync(userId); // Kick user

        return Ok(new ApiResponse<string>(true, $"Đã khóa tài khoản {user.Email} trong {lockMinutes} phút.", null));
    }

    // Xóa vĩnh viễn hoặc vô hiệu hóa tài khoản
    [HttpDelete("{userId}")]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound(new ApiResponse<string>(false, "User not found", null));

        user.Status = "DELETED";
        user.UpdatedAt = DateTime.UtcNow;
        
        await _db.SaveChangesAsync();
        await _auth.LogoutAsync(userId);

        return Ok(new ApiResponse<string>(true, $"Đã xóa tài khoản {user.Email}.", null));
    }
}
