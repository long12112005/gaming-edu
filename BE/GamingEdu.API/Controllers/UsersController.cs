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

    // 1.4 Lấy thông tin cá nhân & hạn mức Quota
    [HttpGet("profile")]
    [ProducesResponseType(typeof(ApiResponse<UserProfileDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetCurrentUserId();
        var user = await _db.Users
            .AsNoTracking()
            .Include(u => u.UserQuota)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Status == "DELETED")
            return NotFound(new ApiResponse<string>(false, "Không tìm thấy người dùng.", null));

        // Kiểm tra và reset quota nếu sang ngày mới
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var quota = user.UserQuota;
        if (quota != null && (quota.ResetDate == null || quota.ResetDate < today))
        {
            var dbQuota = await _db.UserQuotas.FirstOrDefaultAsync(q => q.UserId == userId);
            if (dbQuota != null)
            {
                dbQuota.ResetDate = today;
                dbQuota.AIUsedToday = 0;
                await _db.SaveChangesAsync();
                quota = dbQuota;
            }
        }

        var quotaDto = quota is null ? null : new UserQuotaDto(
            quota.AIGenerationLimit,
            quota.AIUsedToday,
            quota.MaxRoomCapacity,
            quota.ResetDate
        );

        // Thống kê: tổng số bộ đề đã tạo, tổng số phòng đã host
        var totalQuizzes = await _db.Quizzes
            .AsNoTracking()
            .CountAsync(q => q.CreatorId == userId);

        var totalRoomsHosted = await _db.Rooms
            .AsNoTracking()
            .CountAsync(r => r.HostId == userId);

        var stats = new UserStatsDto(totalQuizzes, totalRoomsHosted);

        var profile = new UserProfileDto(
            user.Id,
            user.Email,
            user.Nickname,
            user.AvatarUrl,
            user.IsAdmin,
            user.Status,
            quotaDto,
            stats
        );

        return Ok(new ApiResponse<UserProfileDto>(true, "Lấy thông tin hồ sơ thành công.", profile));
    }

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

    // Lấy danh sách toàn bộ người dùng (phân trang, tìm kiếm, lọc theo trạng thái)
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PaginatedResponse<AdminUserItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var query = _db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u => u.Email.ToLower().Contains(term) || u.Nickname.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim().ToUpper();
            query = query.Where(u => u.Status == st);
        }

        var total = await query.CountAsync();

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new AdminUserItemDto(
                u.Id,
                u.Email,
                u.Nickname,
                u.AvatarUrl,
                u.IsAdmin,
                u.Status,
                u.LockedUntil,
                u.CreatedAt,
                u.UpdatedAt
            ))
            .ToListAsync();

        var paginated = new PaginatedResponse<AdminUserItemDto>(users, total, page, pageSize);
        return Ok(new ApiResponse<PaginatedResponse<AdminUserItemDto>>(true, "Lấy danh sách người dùng thành công.", paginated));
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
