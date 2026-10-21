using System.Text;
using System.Threading.RateLimiting;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using GamingEdu.API.Data;
using GamingEdu.API.Hubs;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.Extensions.Caching.Memory;

var builder = WebApplication.CreateBuilder(args);

// ─── CONTROLLERS + JSON ───────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// ─── SWAGGER ──────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title       = "Gaming Edu API",
        Version     = "v1",
        Description = "Backend API cho nền tảng học tập gamified Gaming Edu.\n\n" +
                      "Auth: POST /api/auth/register + /api/auth/login → lấy JWT token.\n" +
                      "SignalR Hub: /hubs/game",
        Contact     = new OpenApiContact { Name = "Gaming Edu Team" },
    });

    // Add JWT Bearer auth button in Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.ApiKey,
        Scheme       = "Bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Nhập: Bearer {your_jwt_token}",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ─── DATABASE (EF Core + SQL Server) ─────────────────────────────────────
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options
        .UseSqlServer(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            sqlOptions =>
            {
                sqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(10),
                    errorNumbersToAdd: null);
            }
        )
        .UseSnakeCaseNamingConvention()
);

// ─── AUTHENTICATION (JWT) ─────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is required in appsettings.json");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew                = TimeSpan.FromMinutes(1),
        };

        // Allow JWT tokens via SignalR query string (?access_token=...) and Validate Single Session
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var accessToken = ctx.Request.Query["access_token"];
                var path        = ctx.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    ctx.Token = accessToken;
                return Task.CompletedTask;
            },
            OnTokenValidated = async ctx =>
            {
                var userId = ctx.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? ctx.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                    ?? ctx.Principal?.FindFirst("sub")?.Value;
                var jti = ctx.Principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value
                    ?? ctx.Principal?.FindFirst("jti")?.Value;
                if (userId != null && jti != null)
                {
                    var store = ctx.HttpContext.RequestServices.GetRequiredService<ICacheStore>();
                    var activeSession = await store.GetStringAsync($"session:{userId}");
                    if (activeSession == null)
                    {
                        // Cache was reset or server restarted: re-populate session from cryptographically valid token
                        await store.SetStringAsync($"session:{userId}", jti, TimeSpan.FromDays(1));
                    }
                    else if (activeSession != jti)
                    {
                        ctx.Fail("Phiên đăng nhập không hợp lệ hoặc bạn đã đăng nhập ở nơi khác.");
                    }
                }
            },
            OnChallenge = async ctx =>
            {
                if (!ctx.Response.HasStarted)
                {
                    ctx.HandleResponse();
                    ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    ctx.Response.ContentType = "application/json";
                    var message = ctx.AuthenticateFailure?.Message
                        ?? (ctx.ErrorDescription ?? "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
                    var result = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        success = false,
                        message = message,
                        data = (object?)null
                    });
                    await ctx.Response.WriteAsync(result);
                }
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdmin", policy => policy.RequireClaim("is_admin", "true"));
});

var redisConn = builder.Configuration.GetConnectionString("Redis");
var useRedis = !string.IsNullOrWhiteSpace(redisConn);

// ─── SIGNALR ──────────────────────────────────────────────────────────────
var signalRBuilder = builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.MaximumReceiveMessageSize = 32 * 1024; // 32 KB
});

// Redis backplane: nhiều instance API vẫn broadcast đúng tới người chơi ở instance khác
if (useRedis)
{
    signalRBuilder.AddStackExchangeRedis(redisConn!, o =>
        o.Configuration.ChannelPrefix = StackExchange.Redis.RedisChannel.Literal("GamingEdu"));
}

// ─── CACHING (Redis nếu có cấu hình, fallback MemoryCache) ───────────────
builder.Services.AddMemoryCache();
if (useRedis)
{
    builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(
        _ => StackExchange.Redis.ConnectionMultiplexer.Connect(redisConn!));
    builder.Services.AddSingleton<ICacheStore, RedisCacheStore>();
    builder.Services.AddSingleton<ILeaderboardStore, RedisLeaderboardStore>();
}
else
{
    builder.Services.AddSingleton<ICacheStore, MemoryCacheStore>();
    builder.Services.AddSingleton<ILeaderboardStore, MemoryLeaderboardStore>();
}


// ─── RATE LIMITING ────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? httpContext.Request.Headers.Host.ToString(),
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));
            
    options.AddPolicy("OtpRateLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = builder.Environment.IsDevelopment() ? 100 : 5, // 5 requests per hour in Prod, 100 in Dev
                QueueLimit = 0,
                Window = TimeSpan.FromHours(1)
            }));
    options.RejectionStatusCode = 429;
});

// ─── CORS ─────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("GamingEduFrontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:3000",  // Next.js dev
                "http://localhost:5173"   // Vite dev (optional)
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials() // Required for SignalR
            .WithExposedHeaders("Content-Disposition");
    });
});

// ─── APPLICATION SERVICES ─────────────────────────────────────────────────
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHttpClient<IGeminiApiService, GeminiApiService>();
builder.Services.AddScoped<IAuthService,  AuthService>();
builder.Services.AddScoped<IQuizService,  QuizService>();
builder.Services.AddScoped<IRoomService,  RoomService>();
builder.Services.AddScoped<IGroupService, GroupService>();
builder.Services.AddScoped<IQAService,    QAService>();

// FuzzyMatchingService: stateless, dùng Singleton để tránh allocation mỗi request
builder.Services.AddSingleton<FuzzyMatchingService>();

// Queue Service for Answer processing
builder.Services.AddSingleton<AnswerQueueService>();
builder.Services.AddSingleton<ISlideTimerService, SlideTimerService>();

// Background Service: AI Job Worker (polls ai_jobs table every 10s)
builder.Services.AddHostedService<AIJobWorker>();

// Background Service: Answer Processing Worker (Message Queue simulation)
builder.Services.AddHostedService<AnswerProcessingWorker>();

// ─── LOGGING ──────────────────────────────────────────────────────────────
builder.Services.AddLogging(logging =>
{
    logging.ClearProviders();
    logging.AddConsole();
    if (builder.Environment.IsDevelopment())
        logging.SetMinimumLevel(LogLevel.Debug);
});

// ─────────────────────────────────────────────────────────────────────────
var app = builder.Build();
// ─────────────────────────────────────────────────────────────────────────

// ─── MIDDLEWARE PIPELINE ──────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Gaming Edu API v1");
        c.RoutePrefix = string.Empty; // Swagger at root URL
    });

    // Auto-apply migrations in development (with safe fallback)
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        await db.Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "MigrateAsync encountered an issue. Falling back to EnsureCreatedAsync.");
        await db.Database.EnsureCreatedAsync();
    }
}

// Ensure uploads folder exists
var uploadsPath = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(builder.Environment.ContentRootPath, "wwwroot"), "uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}

app.UseStaticFiles();

// CORS must be before Auth
app.UseCors("GamingEduFrontend");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ─── SIGNALR HUB ──────────────────────────────────────────────────────────
app.MapHub<GameHub>("/hubs/game");
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapHub<QAHub>("/hubs/qa");

app.Run();
