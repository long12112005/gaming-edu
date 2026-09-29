using System.Text;
using GamingEdu.API.Data;
using GamingEdu.API.Hubs;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

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

        // Allow JWT tokens via SignalR query string (?access_token=...)
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var accessToken = ctx.Request.Query["access_token"];
                var path        = ctx.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    ctx.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ─── SIGNALR ──────────────────────────────────────────────────────────────
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.MaximumReceiveMessageSize = 32 * 1024; // 32 KB
});

// ─── CACHING (IMemoryCache) ───────────────────────────────────────────────
builder.Services.AddMemoryCache(options =>
{
    options.SizeLimit = 1024; // MB equivalent entries
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
            .AllowCredentials(); // Required for SignalR
    });
});

// ─── APPLICATION SERVICES ─────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService,  AuthService>();
builder.Services.AddScoped<IQuizService,  QuizService>();
builder.Services.AddScoped<IRoomService,  RoomService>();

// Background Service: AI Job Worker (polls ai_jobs table every 10s)
builder.Services.AddHostedService<AIJobWorker>();

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

    // Auto-apply migrations in development (do NOT use in production)
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.EnsureCreatedAsync();
}

app.UseHttpsRedirection();

// CORS must be before Auth
app.UseCors("GamingEduFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ─── SIGNALR HUB ──────────────────────────────────────────────────────────
app.MapHub<GameHub>("/hubs/game");

app.Run();
