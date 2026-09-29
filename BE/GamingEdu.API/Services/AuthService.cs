using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace GamingEdu.API.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
}

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        ApplicationDbContext db,
        IConfiguration config,
        ILogger<AuthService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    // ── REGISTER ──────────────────────────────────────────────────────
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Check duplicate email (maps to users.email UNIQUE constraint)
        bool emailExists = await _db.Users
            .AnyAsync(u => u.Email == request.Email.ToLower());

        if (emailExists)
            throw new InvalidOperationException("Email này đã được đăng ký.");

        // Hash password before storing in password_hash column
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12);

        var user = new User
        {
            Id         = Guid.NewGuid(),
            Email      = request.Email.ToLower().Trim(),
            PasswordHash = passwordHash,
            Nickname   = request.Nickname.Trim(),
            Status     = "ACTIVE",
            IsAdmin    = false,
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow,
        };

        // Create default quota record (maps to user_quotas table)
        var quota = new UserQuota
        {
            Id                  = Guid.NewGuid(),
            UserId              = user.Id,
            AIGenerationLimit   = 10,
            AIUsedToday         = 0,
            MaxRoomCapacity     = 50,
            ResetDate           = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)),
        };

        _db.Users.Add(user);
        _db.UserQuotas.Add(quota);
        await _db.SaveChangesAsync();

        _logger.LogInformation("New user registered: {Email}", user.Email);

        var token = GenerateJwtToken(user);
        return BuildAuthResponse(token, user, quota);
    }

    // ── LOGIN ──────────────────────────────────────────────────────────
    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users
            .Include(u => u.UserQuota)
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLower());

        if (user is null)
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");

        // Verify password against stored hash
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");

        // Check account status (uses users.status and locked_until columns)
        if (user.Status == "DELETED")
            throw new UnauthorizedAccessException("Tài khoản này đã bị xóa.");

        if (user.Status == "LOCKED")
        {
            if (user.LockedUntil.HasValue && user.LockedUntil > DateTime.UtcNow)
                throw new UnauthorizedAccessException(
                    $"Tài khoản bị khóa đến {user.LockedUntil:dd/MM/yyyy HH:mm} UTC.");

            // Auto-unlock if lock period expired
            user.Status     = "ACTIVE";
            user.LockedUntil = null;
            user.UpdatedAt  = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        var token = GenerateJwtToken(user);
        return BuildAuthResponse(token, user, user.UserQuota);
    }

    // ── JWT TOKEN GENERATION ───────────────────────────────────────────
    private string GenerateJwtToken(User user)
    {
        var jwtKey = _config["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT Key not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("nickname", user.Nickname),
            new Claim("is_admin", user.IsAdmin.ToString().ToLower()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),
        };

        var expiryMinutes = int.TryParse(_config["Jwt:ExpiryMinutes"], out var m) ? m : 1440; // 24h

        var token = new JwtSecurityToken(
            issuer:   _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims:   claims,
            expires:  DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static AuthResponse BuildAuthResponse(string token, User user, UserQuota? quota)
    {
        var quotaDto = quota is null ? null : new UserQuotaDto(
            quota.AIGenerationLimit,
            quota.AIUsedToday,
            quota.MaxRoomCapacity,
            quota.ResetDate
        );

        var profile = new UserProfileDto(
            user.Id,
            user.Email,
            user.Nickname,
            user.AvatarUrl,
            user.IsAdmin,
            user.Status,
            quotaDto
        );

        return new AuthResponse(token, "Bearer", 86400, profile);
    }
}
