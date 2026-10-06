using System.ComponentModel.DataAnnotations;

namespace GamingEdu.API.DTOs;

// ─── Auth DTOs ─────────────────────────────────────────────────────────────

public record SendRegisterOtpRequest(
    [Required, EmailAddress, MaxLength(255)] string Email
);

public record RegisterRequest(
    [Required, MaxLength(100)] string Nickname,
    [Required, EmailAddress, MaxLength(255)] string Email,
    [Required, MinLength(6), MaxLength(100)] string Password,
    [Required, MaxLength(6)] string Otp
);

public record ForgotPasswordRequest(
    [Required, EmailAddress, MaxLength(255)] string Email
);

public record ResetPasswordRequest(
    [Required, EmailAddress, MaxLength(255)] string Email,
    [Required, MaxLength(6)] string Otp,
    [Required, MinLength(6), MaxLength(100)] string NewPassword
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

public record UpdateProfileRequest(
    [MaxLength(100)] string? Nickname,
    [MaxLength(500)] string? AvatarUrl
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

public record UpdateQuizRequest(
    [MaxLength(255)] string? Title,
    string? CoverImageUrl,
    string? Topic,
    bool? IsPublic
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

// ─── Slide Request DTOs ────────────────────────────────────────────────────

public record SlideOptionRequest(
    [System.ComponentModel.DataAnnotations.Required] string Content,
    bool IsCorrect = false,
    string? MatchingPair  = null,   // dành cho loại MATCHING
    string? BlankKeywords = null    // dành cho loại FILL_IN_BLANK, format: "kw1,kw2"
);

public record CreateSlideRequest(
    [System.ComponentModel.DataAnnotations.Required,
     System.ComponentModel.DataAnnotations.MaxLength(50)]
    string Type,                    // QUIZ | FILL_IN_BLANK | MATCHING | POLL | WORD_CLOUD

    [System.ComponentModel.DataAnnotations.Required]
    string QuestionText,

    int TimeLimit = 30,             // giây
    int Points = 1000,
    string? Status = null,          // nếu null → DRAFT; AI slides luôn là DRAFT
    int? OrderIndex = null,         // nếu null → tự động thêm vào cuối
    bool IsAIGenerated = false,
    List<SlideOptionRequest>? Options = null
);

public record UpdateSlideRequest(
    string? Type          = null,
    string? QuestionText  = null,
    int?    TimeLimit     = null,
    int?    Points        = null,
    string? Status        = null,   // "DRAFT" | "PUBLISHED"
    int?    OrderIndex    = null,
    List<SlideOptionRequest>? Options = null  // null = giữ nguyên options cũ
);

public record SlideOrderItem(Guid SlideId, int OrderIndex);

public record ApproveAllResult(int ApprovedCount);

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

public record UpdateGroupRequest(
    [MaxLength(255)] string? Name,
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

public record GroupMemberDto(
    Guid Id,
    Guid UserId,
    string Nickname,
    string? AvatarUrl,
    string Status,
    DateTime JoinedAt
);

public record JoinGroupRequest(
    [Required, MaxLength(10)] string GroupCode
);

public record RespondJoinRequest(
    [Required] bool IsApproved // true = ACCEPT, false = REJECT
);

public record SaveDraftRequest(
    [Required] Guid RoomPlayerId,
    [Required] Guid SlideId,
    [Required] string AnswerData
);

// ─── Q&A DTOs ──────────────────────────────────────────────────────────────
public record QuestionQADto(
    Guid Id,
    Guid RoomId,
    Guid PlayerId,
    string PlayerName,
    string? PlayerAvatar,
    string Content,
    int Upvotes,
    string Status,
    DateTime CreatedAt
);

public record AskQuestionRequest(
    [Required] string Content
);

// ─── Common ────────────────────────────────────────────────────────────────

public record ApiResponse<T>(bool Success, string? Message, T? Data);
public record PaginatedResponse<T>(IEnumerable<T> Items, int Total, int Page, int PageSize);
