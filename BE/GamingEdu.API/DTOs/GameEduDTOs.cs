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

public record UserStatsDto(
    int TotalQuizzesCreated,
    int TotalRoomsHosted
);

public record UserProfileDto(
    Guid Id,
    string Email,
    string Nickname,
    string? AvatarUrl,
    bool IsAdmin,
    string Status,
    UserQuotaDto? Quota,
    UserStatsDto? Stats = null,
    string? AvatarFrame = "default"
);

public record UserQuotaDto(
    int AIGenerationLimit,
    int AIUsedToday,
    int MaxRoomCapacity,
    DateOnly? ResetDate
);

public record UpdateProfileRequest(
    [MaxLength(100)] string? Nickname,
    [MaxLength(500)] string? AvatarUrl,
    [MaxLength(100)] string? AvatarFrame = null
);

public record AdminUserItemDto(
    Guid Id,
    string Email,
    string Nickname,
    string? AvatarUrl,
    bool IsAdmin,
    string Status,
    DateTime? LockedUntil,
    DateTime CreatedAt,
    DateTime UpdatedAt
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
    bool? IsPublic,
    List<CreateSlideRequest>? Slides = null
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
    [Required] string Mode,   // HOST_PACED | PLAYER_PACED | ASYNC_TOURNAMENT
    string? GameModeTheme = "CLASSIC",
    DateTime? EndTime = null,
    int? QuestionTimeLimit = null
);

public record UpdateTournamentSettingsRequest(
    DateTime? EndTime,
    int? QuestionTimeLimit
);

public record RoomDto(
    Guid Id,
    string PinCode,
    string Mode,
    string Status,
    Guid QuizId,
    string QuizTitle,
    DateTime CreatedAt,
    string? QrCodeBase64 = null,
    string? GameModeTheme = "CLASSIC",
    int SlideCount = 0,
    Guid? HostId = null,
    DateTime? EndTime = null,
    int? QuestionTimeLimit = null,
    bool IsEarlyFinished = false
);

public record JoinRoomRequest(
    [Required, MaxLength(20)] string PinCode,
    [Required, MaxLength(100)] string Nickname,
    string? AvatarUrl = null,
    Guid? UserId = null
);

public record HostedRoomHistoryDto(
    Guid RoomId,
    string PinCode,
    string QuizTitle,
    string Mode,
    string Status,
    int PlayerCount,
    DateTime CreatedAt,
    DateTime? EndTime = null,
    bool IsEarlyFinished = false
)
{
    public Guid Id => RoomId;
}

public record PlayedRoomHistoryDto(
    Guid RoomId,
    string PinCode,
    string QuizTitle,
    string HostNickname,
    int TotalScore,
    int Rank,
    DateTime PlayedAt,
    string? Status = null
)
{
    public Guid Id => RoomId;
    public int Score => TotalScore;
    public DateTime CreatedAt => PlayedAt;
}

public record RoomDetailReportDto(
    Guid RoomId,
    string PinCode,
    string QuizTitle,
    string Mode,
    string Status,
    DateTime CreatedAt,
    int TotalPlayers,
    double OverallAccuracy,
    string? HardestQuestion,
    string? EasiestQuestion,
    List<PlayerReportItemDto> Players,
    List<QuestionReportItemDto> Questions
);

public record PlayerReportItemDto(
    int Rank,
    string Nickname,
    int TotalScore,
    int CorrectCount,
    int WrongCount,
    double Accuracy,
    double AvgResponseTimeSec
);

public record QuestionReportItemDto(
    int OrderIndex,
    string QuestionText,
    string Type,
    int TotalAnswers,
    int CorrectAnswers,
    double Accuracy,
    string Difficulty
);

// ─── Game (SignalR) DTOs ───────────────────────────────────────────────────

public record SubmitAnswerRequest(
    Guid SlideId,
    string AnswerData,   // JSON string (flexible for all slide types)
    int ResponseTimeMs,
    int WagerPercent = 0,
    int WagerAmount = 0
);

public record WireDefuseResultDto(
    int WireIndex,
    string WireColor,
    bool IsCut,
    string UserInput,
    string ExpectedKeyword,
    string NormalizedKeyword
);

public record AnswerResultDto(
    bool IsCorrect,
    int ScoreAwarded,
    int TotalScore,
    string CorrectAnswer,
    int Rank = 0,          // hạng hiện tại (1-based), 0 = chưa xác định
    int RankChange = 0,    // >0: leo hạng, <0: tụt hạng
    bool IsTournamentLocked = false,
    int Streak = 0,
    double SpeedMultiplier = 1.0,
    int StreakBonus = 0,
    int CurrentHp = 100,
    int MaxHp = 100,
    int HpDeducted = 0,
    bool IsEliminated = false,
    double PartialRatio = 1.0,
    int WagerPercent = 0,
    int WagerAmount = 0,
    int WagerNetGain = 0,
    bool IsBombDefused = false,
    int TotalWires = 0,
    int DefusedWires = 0,
    List<WireDefuseResultDto>? WireResults = null,
    bool IsDecoded = false,
    string? RevealedWord = null,
    bool IsBridgeCrossed = false,
    int TotalSpans = 0,
    int BuiltSpans = 0,
    List<BridgeSpanResultDto>? SpanResults = null,
    bool IsFullCircuit = false,
    int TotalCircuitWires = 0,
    int ConnectedCorrectWires = 0,
    List<CircuitWireResultDto>? CircuitWireResults = null
);

public record OptionDistributionDto(
    Guid OptionId,
    string Content,
    int OrderIndex,
    bool IsCorrect,
    int Count,
    double Percentage
);

public record SlideDistributionDto(
    Guid SlideId,
    int TotalAnswers,
    int TotalPlayers,
    List<OptionDistributionDto> Options
);

public record PlayerSurvivalStatusDto(
    Guid PlayerId,
    string Nickname,
    string? AvatarUrl,
    int CurrentHp,
    int MaxHp,
    bool IsEliminated,
    int Score,
    int Rank
);

public record BattleRoyaleStateDto(
    int TotalPlayers,
    int SurvivorsCount,
    int EliminatedCount,
    List<PlayerSurvivalStatusDto> Players
);

public record PlayerArenaProgressDto(
    Guid PlayerId,
    string Nickname,
    string? AvatarUrl,
    int Score,
    int Rank,
    double ProgressRatio,   // 0.0 -> 1.0 (vạch xuất phát đến đích trên Minimap và Arena)
    int Streak,
    bool IsAnswered,        // Đã nộp bài câu hỏi hiện tại hay chưa
    bool IsJustBoosted,     // Vừa mới nộp đúng & tăng điểm để bật hiệu ứng Boost lướt nhanh
    int LastScoreAwarded,
    bool IsGhost = false    // Đối thủ bóng ma trong phòng Async
);

public record PlayerWagerDto(
    Guid PlayerId,
    string Nickname,
    int WagerPercent,
    int WagerAmount,
    bool IsAllIn
);

public record WagerPoolStateDto(
    Guid SlideId,
    int TotalWagerAmount,
    int TotalWagersPlaced,
    int AllInCount,
    List<PlayerWagerDto> Wagers
);

public record WireDistributionDto(
    int WireIndex,
    string WireColor,
    int CutCount,
    int TotalCount,
    double CutPercent
);

public record NormalizedKeywordDto(
    int WireIndex,
    string WireColor,
    string OriginalKeywords,
    string NormalizedKeyword
);

public record BombDefusalStateDto(
    Guid SlideId,
    int TotalBombs,
    int DefusedBombs,
    int ExplodedBombs,
    int InProgressBombs,
    List<WireDistributionDto> WireStats,
    List<NormalizedKeywordDto> StandardKeywords
);

public record WordHunterGuessSummaryDto(
    Guid PlayerId,
    string Nickname,
    string? AvatarUrl,
    string Guess,
    bool IsCorrect,
    int ResponseTimeMs,
    int ScoreAwarded
);

public record WordHunterSolutionDto(
    int WordIndex,
    string SolutionText,
    int TotalLength,
    List<string> AcceptedKeywords
);

public record WordHunterStateDto(
    Guid SlideId,
    int TotalPlayers,
    int DecodedCount,
    int SubmittedCount,
    List<WordHunterGuessSummaryDto> RecentGuesses,
    List<WordHunterSolutionDto> Solutions
);

public record BridgeSpanResultDto(
    int SpanIndex,
    bool IsBuilt,
    string UserInput,
    string ExpectedKeyword,
    string NormalizedKeyword
);

public record BridgeSpanDistributionDto(
    int SpanIndex,
    int BuiltCount,
    int TotalCount,
    double BuiltPercent,
    string ExpectedKeyword
);

public record BridgeBuilderPlayerCrossingDto(
    Guid PlayerId,
    string Nickname,
    string? AvatarUrl,
    int BuiltSpans,
    int TotalSpans,
    bool IsFullyCrossed,
    int ResponseTimeMs,
    int ScoreAwarded
);

public record BridgeBuilderStateDto(
    Guid SlideId,
    int TotalPlayers,
    int FullCrossings,
    int PartialCrossings,
    int FallenCount,
    int SubmittedCount,
    List<BridgeSpanDistributionDto> SpanStats,
    List<BridgeBuilderPlayerCrossingDto> RecentCrossings
);

public record CircuitWireResultDto(
    int WireIndex,
    Guid LeftId,
    string LeftContent,
    string UserRightContent,
    string ExpectedRightContent,
    bool IsConnected,
    bool IsCorrect,
    string WireColor
);

public record CircuitWireDistributionDto(
    int WireIndex,
    Guid LeftId,
    string LeftContent,
    string ExpectedRightContent,
    int CorrectCount,
    int TotalCount,
    double CorrectPercent,
    string WireColor
);

public record CircuitConnectPlayerResultDto(
    Guid PlayerId,
    string Nickname,
    string? AvatarUrl,
    int CorrectWires,
    int TotalWires,
    bool IsFullCircuit,
    int ResponseTimeMs,
    int ScoreAwarded
);

public record CircuitConnectStateDto(
    Guid SlideId,
    int TotalPlayers,
    int FullCircuits,
    int PartialCircuits,
    int ShortCircuits,
    int SubmittedCount,
    List<CircuitWireDistributionDto> WireStats,
    List<CircuitConnectPlayerResultDto> RecentSubmissions
);

public record PlayerRejoinDataDto(
    Guid RoomId,
    Guid PlayerId,
    string PinCode,
    string Mode,
    string Status,
    string PlayerNickname,
    int TotalScore,
    int Rank,
    string Theme,
    int CurrentHp = 100,
    int MaxHp = 100,
    bool IsEliminated = false
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
    IEnumerable<SlideOptionPublicDto> Options,
    int? TotalSlides = null
);

/// <summary>Public options sent to players (IsCorrect hidden, only lengths shown for Word Hunter)</summary>
public record SlideOptionPublicDto(
    Guid Id,
    string Content,
    string? MatchingPair,
    int OrderIndex,
    int? BlankLength = null,
    List<int>? WordLengths = null
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

// ─── File Upload DTOs ──────────────────────────────────────────────────────
public record FileUploadResponseDto(
    string FileUrl,
    string FileName,
    long FileSize,
    string Extension
);

// ─── Common ────────────────────────────────────────────────────────────────

public record ApiResponse<T>(bool Success, string? Message, T? Data);
public record PaginatedResponse<T>(IEnumerable<T> Items, int Total, int Page, int PageSize);

// ─── Room Detailed Report DTOs ─────────────────────────────────────────────
public record PlayerAnswerSummaryDto(
    Guid SlideId,
    int QuestionIndex,
    bool IsCorrect,
    int ScoreAwarded,
    int? ResponseTimeMs,
    string? UserAnswer
);

public record PlayerReportSummaryDto(
    Guid PlayerId,
    string Nickname,
    string? AvatarUrl,
    int TotalScore,
    int? Rank,
    int CorrectCount,
    int WrongCount,
    double AccuracyRate,
    List<PlayerAnswerSummaryDto> Answers,
    int AnsweredCount = 0,
    int TotalQuestions = 0,
    bool IsCompleted = false
);

public record QuestionSummaryDto(
    Guid SlideId,
    int OrderIndex,
    string QuestionText,
    string Type,
    string CorrectAnswer,
    int TotalAnswers,
    int CorrectAnswers,
    double AccuracyRate
);

public record RoomDetailedReportDto(
    Guid RoomId,
    string PinCode,
    string QuizTitle,
    string Mode,
    string Status,
    DateTime CreatedAt,
    int TotalPlayers,
    List<QuestionSummaryDto> Questions,
    List<PlayerReportSummaryDto> Players,
    DateTime? EndTime = null,
    bool IsEarlyFinished = false,
    int? QuestionTimeLimit = null
);

