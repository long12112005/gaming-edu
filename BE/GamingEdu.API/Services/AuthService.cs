using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;

namespace GamingEdu.API.Services;

public interface IAuthService
{
    Task SendRegisterOtpAsync(SendRegisterOtpRequest request);
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task SendForgotPasswordOtpAsync(ForgotPasswordRequest request);
    Task ResetPasswordAsync(ResetPasswordRequest request);
    Task LogoutAsync(Guid userId);
}

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;
    private readonly IEmailService _email;
    private readonly IDatabase _redis;

    public AuthService(
        ApplicationDbContext db,
        IConfiguration config,
        ILogger<AuthService> logger,
        IEmailService email,
        IConnectionMultiplexer redis)
    {
        _db = db;
        _config = config;
        _logger = logger;
        _email = email;
        _redis = redis.GetDatabase();
    }

    private string GenerateOtp() => Random.Shared.Next(100000, 999999).ToString();

    // ── SEND OTP ──────────────────────────────────────────────────────
    public async Task SendRegisterOtpAsync(SendRegisterOtpRequest request)
    {
        var email = request.Email.ToLower().Trim();
        bool emailExists = await _db.Users.AnyAsync(u => u.Email == email);
        if (emailExists) throw new InvalidOperationException("Email này đã được đăng ký.");

        var otp = GenerateOtp();
        var cacheKey = $"otp:register:{email}";
        await _redis.StringSetAsync(cacheKey, otp, TimeSpan.FromMinutes(5));

        var body = $"<h3>Mã xác thực đăng ký Gaming Edu</h3><p>Mã OTP của bạn là: <b>{otp}</b></p><p>Mã này có hiệu lực trong 5 phút.</p>";
        await _email.SendEmailAsync(email, "Mã xác thực Đăng ký", body);
    }

    // ── REGISTER ──────────────────────────────────────────────────────
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var email = request.Email.ToLower().Trim();
        var cacheKey = $"otp:register:{email}";
        
        var cachedOtp = await _redis.StringGetAsync(cacheKey);
        if (!cachedOtp.HasValue || cachedOtp.ToString() != request.Otp)
            throw new InvalidOperationException("Mã OTP không chính xác hoặc đã hết hạn.");

        bool emailExists = await _db.Users.AnyAsync(u => u.Email == email);
        if (emailExists) throw new InvalidOperationException("Email này đã được đăng ký.");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12);

        var user = new User
        {
            Id         = Guid.NewGuid(),
            Email      = email,
            PasswordHash = passwordHash,
            Nickname   = request.Nickname.Trim(),
            Status     = "ACTIVE",
            IsAdmin    = false,
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow,
        };

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

        await _redis.KeyDeleteAsync(cacheKey); // Xóa OTP sau khi dùng

        _logger.LogInformation("New user registered: {Email}", user.Email);

        var token = await GenerateAndStoreJwtToken(user);
        return BuildAuthResponse(token, user, quota);
    }

    // ── LOGIN ──────────────────────────────────────────────────────────
    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var email = request.Email.ToLower().Trim();
        var user = await _db.Users
            .Include(u => u.UserQuota)
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user is null)
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");

        // Check account status
        if (user.Status == "DELETED")
            throw new UnauthorizedAccessException("Tài khoản này đã bị xóa.");

        if (user.Status == "LOCKED")
        {
            if (user.LockedUntil.HasValue && user.LockedUntil > DateTime.UtcNow)
                throw new UnauthorizedAccessException($"Tài khoản bị khóa đến {user.LockedUntil:dd/MM/yyyy HH:mm} UTC.");

            // Auto-unlock
            user.Status = "ACTIVE";
            user.LockedUntil = null;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        var attemptKey = $"login:attempts:{email}";
        
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            var attempts = await _redis.StringIncrementAsync(attemptKey);
            if (attempts == 1) await _redis.KeyExpireAsync(attemptKey, TimeSpan.FromMinutes(15));

            if (attempts >= 5)
            {
                user.Status = "LOCKED";
                user.LockedUntil = DateTime.UtcNow.AddMinutes(15);
                await _db.SaveChangesAsync();
                await _redis.KeyDeleteAsync(attemptKey);
                throw new UnauthorizedAccessException("Tài khoản bị khóa 15 phút do nhập sai mật khẩu quá 5 lần.");
            }
            throw new UnauthorizedAccessException("Email hoặc mật khẩu không đúng.");
        }

        await _redis.KeyDeleteAsync(attemptKey); // Xóa bộ đếm sai mật khẩu

        var token = await GenerateAndStoreJwtToken(user);
        return BuildAuthResponse(token, user, user.UserQuota);
    }

    // ── FORGOT PASSWORD ────────────────────────────────────────────────
    public async Task SendForgotPasswordOtpAsync(ForgotPasswordRequest request)
    {
        var email = request.Email.ToLower().Trim();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null || user.Status == "DELETED")
            return; // Không ném lỗi để tránh lộ email (security)

        var otp = GenerateOtp();
        var cacheKey = $"otp:reset:{email}";
        await _redis.StringSetAsync(cacheKey, otp, TimeSpan.FromMinutes(5));

        var body = $"<h3>Đặt lại mật khẩu Gaming Edu</h3><p>Mã OTP của bạn là: <b>{otp}</b></p><p>Mã này có hiệu lực trong 5 phút.</p>";
        await _email.SendEmailAsync(email, "Mã xác thực Quên mật khẩu", body);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request)
    {
        var email = request.Email.ToLower().Trim();
        var cacheKey = $"otp:reset:{email}";
        
        var cachedOtp = await _redis.StringGetAsync(cacheKey);
        if (!cachedOtp.HasValue || cachedOtp.ToString() != request.Otp)
            throw new InvalidOperationException("Mã OTP không chính xác hoặc đã hết hạn.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) throw new InvalidOperationException("Không tìm thấy người dùng.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _redis.KeyDeleteAsync(cacheKey);
        await LogoutAsync(user.Id); // Hủy mọi session cũ
    }

    public async Task LogoutAsync(Guid userId)
    {
        var sessionKey = $"session:{userId}";
        await _redis.KeyDeleteAsync(sessionKey);
    }

    // ── JWT TOKEN GENERATION ───────────────────────────────────────────
    private async Task<string> GenerateAndStoreJwtToken(User user)
    {
        var jwtKey = _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var sessionId = Guid.NewGuid().ToString();

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("nickname", user.Nickname),
            new Claim("is_admin", user.IsAdmin.ToString().ToLower()),
            new Claim(JwtRegisteredClaimNames.Jti, sessionId),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
        };

        var expiryMinutes = int.TryParse(_config["Jwt:ExpiryMinutes"], out var m) ? m : 1440; // 24h

        var token = new JwtSecurityToken(
            issuer:   _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims:   claims,
            expires:  DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        // Lưu sessionId vào Redis để tracking Single Session
        await _redis.StringSetAsync($"session:{user.Id}", sessionId, TimeSpan.FromMinutes(expiryMinutes));

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
