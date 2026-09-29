using System.ComponentModel.DataAnnotations;

namespace GamingEdu.API.DTOs;

// ─── Auth DTOs ─────────────────────────────────────────────────────────────

public record RegisterRequest(
    [Required, MaxLength(100)] string Nickname,
    [Required, EmailAddress, MaxLength(255)] string Email,
    [Required, MinLength(6), MaxLength(100)] string Password
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record AuthResponse(
    string Token,
    string TokenType,
    int ExpiresInSeconds,
    UserProfileDto User
);

// ─── User DTOs ─────────────────────────────────────────────────────────────

public record UserProfileDto(
    Guid Id,
    string Email,
    string Nickname,
    string? AvatarUrl,
    bool IsAdmin,
    string Status,
    UserQuotaDto? Quota
);

public record UserQuotaDto(
    int AIGenerationLimit,
    int AIUsedToday,
    int MaxRoomCapacity,
    DateOnly? ResetDate
);

// ─── Quiz DTOs ─────────────────────────────────────────────────────────────

public record QuizSummaryDto(
    Guid Id,
    string Title,
    string? CoverImageUrl,
    string? Topic,
    bool IsPublic,
    int SlideCount,
    DateTime CreatedAt,
    string CreatorNickname,
    string? CreatorAvatar
);

public record QuizDetailDto(
    Guid Id,
    string Title,
    string? CoverImageUrl,
    string? Topic,
    bool IsPublic,
    DateTime CreatedAt,
    string CreatorNickname,
    IEnumerable<SlideDto> Slides
);

public record CreateQuizRequest(
    [Required, MaxLength(255)] string Title,
    string? CoverImageUrl,
    string? Topic,
    bool IsPublic = false
);

// ─── Slide DTOs ────────────────────────────────────────────────────────────

public record SlideDto(
    Guid Id,
    string Type,
    string QuestionText,
    int TimeLimit,
    int Points,
    string Status,
    int OrderIndex,
    bool IsAIGenerated,
    IEnumerable<SlideOptionDto> Options
);

public record SlideOptionDto(
    Guid Id,
    string Content,
    bool IsCorrect,
    string? MatchingPair,
    string? BlankKeywords,
    int OrderIndex
);

// ─── Room DTOs ─────────────────────────────────────────────────────────────

public record CreateRoomRequest(
    [Required] Guid QuizId,
    [Required] string Mode   // HOST_PACED | PLAYER_PACED | ASYNC_TOURNAMENT
);

public record RoomDto(
    Guid Id,
    string PinCode,
    string Mode,
    string Status,
    Guid QuizId,
    string QuizTitle,
    DateTime CreatedAt
);

public record JoinRoomRequest(
    [Required, MaxLength(20)] string PinCode,
    [Required, MaxLength(100)] string Nickname,
    string? AvatarUrl
);

// ─── Game (SignalR) DTOs ───────────────────────────────────────────────────

public record SubmitAnswerRequest(
    Guid SlideId,
    string AnswerData,   // JSON string (flexible for all slide types)
    int ResponseTimeMs
);

public record AnswerResultDto(
    bool IsCorrect,
    int ScoreAwarded,
    int TotalScore,
    string CorrectAnswer
);

public record LeaderboardEntryDto(
    int Rank,
    string Nickname,
    string? AvatarUrl,
    int TotalScore
);

public record SlideStartedDto(
    int SlideIndex,
    Guid SlideId,
    string Type,
    string QuestionText,
    int TimeLimit,
    int Points,
    IEnumerable<SlideOptionPublicDto> Options
);

/// <summary>Public options sent to players (IsCorrect hidden)</summary>
public record SlideOptionPublicDto(
    Guid Id,
    string Content,
    string? MatchingPair,
    int OrderIndex
);

// ─── AI Job DTOs ───────────────────────────────────────────────────────────

public record CreateAIJobRequest(
    [Required] Guid QuizId,
    [Required] string FileUrl
);

public record AIJobStatusDto(
    Guid Id,
    string Status,
    string FileUrl,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    string? ErrorMessage
);

// ─── Group DTOs ────────────────────────────────────────────────────────────

public record CreateGroupRequest(
    [Required, MaxLength(255)] string Name,
    string? Description
);

public record GroupDto(
    Guid Id,
    string Name,
    string? Description,
    string GroupCode,
    string Status,
    string HostNickname,
    int MemberCount,
    DateTime CreatedAt
);

// ─── Common ────────────────────────────────────────────────────────────────

public record ApiResponse<T>(bool Success, string? Message, T? Data);
public record PaginatedResponse<T>(IEnumerable<T> Items, int Total, int Page, int PageSize);
