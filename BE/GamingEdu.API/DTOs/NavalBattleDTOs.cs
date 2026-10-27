using GamingEdu.API.Models;

namespace GamingEdu.API.DTOs;

public record NavalAnswerRequest(
    Guid SlideId,
    string AnswerData,
    int ResponseTimeMs
);

public record NavalAnswerResultDto(
    bool IsCorrect,
    int ScoreAwarded,
    int CurrentCombo,
    int MaxCombo,
    int EnergyPoints,
    int ShotsEarned,
    string? CorrectAnswer,
    bool IsDoubleShot = false
);

public record NavalShotRequest(
    int TargetRow,
    int TargetCol,
    string ActionType = "NORMAL_SHOT"
);

public record NavalShotResultDto(
    bool Success,
    string Message,
    string AttackerTeam,
    string TargetTeam,
    int TargetRow,
    int TargetCol,
    string Result, // 'MISS' | 'HIT' | 'SUNK' | 'BLOCKED_BY_SHIELD'
    int? SunkShipType,
    int ShotsEarnedRemaining,
    bool IsGameOver,
    string? WinningTeam,
    string? WinReason
);

public record RadarScanRequest(
    int CenterRow,
    int CenterCol
);

public record RadarScanResultDto(
    bool Success,
    string Message,
    int CenterRow,
    int CenterCol,
    bool Detected,
    int RadarRemaining
);

public record ShieldActivateRequest(
    int TargetRow,
    int TargetCol
);

public record ShieldActivateResultDto(
    bool Success,
    string Message,
    int TargetRow,
    int TargetCol,
    int ShieldRemaining
);

public record NavalTeamSummaryDto(
    string TeamSide,
    int ShipsRemaining,
    int ShipsSunk,
    int TotalHitCells,
    int TotalQuestions,
    int CorrectAnswers,
    double AccuracyRate,
    int TotalResponseTimeMs
);

public record NavalMatchResultDto(
    bool IsGameOver,
    bool IsEarlyTermination,
    string? WinningTeam, // "TEAM_A", "TEAM_B", or "DRAW"
    string? WinReason,
    string? PriorityCriterion, // "CRITERION_1_SHIPS_SUNK" | "CRITERION_2_CELLS_HIT" | "CRITERION_3_ACCURACY" | "CRITERION_4_RESPONSE_TIME" | "NORMAL_VICTORY" | "DRAW"
    NavalTeamSummaryDto TeamA,
    NavalTeamSummaryDto TeamB
);

public record NavalShipDto(
    Guid Id,
    Guid RoomId,
    string TeamSide,
    int ShipType,
    List<ShipCoordinate> Coordinates,
    bool IsSunk
);

public record NavalTeamStateDto(
    Guid Id,
    Guid RoomId,
    string TeamSide,
    int RadarRemaining,
    int ShieldRemaining,
    int PrecisionShotRemaining,
    int TeamCombo,
    int ShipsRemaining
);

public record NavalActionDto(
    Guid Id,
    Guid PlayerId,
    string AttackerTeam,
    string TargetTeam,
    string ActionType,
    int TargetRow,
    int TargetCol,
    string Result,
    int? SunkShipType,
    DateTime CreatedAt
);

public record NavalPlayerContributionDto(
    Guid PlayerId,
    string Nickname,
    string? AvatarUrl,
    string? TeamSide,
    int TotalScore,
    int CurrentCombo,
    int MaxCombo,
    int EnergyPoints,
    int ShotsEarned,
    int ValidShotsCount,
    int HitsCount,
    int ShipsSunkContribution,
    int SkillsUsedCount,
    double HitAccuracy
);
