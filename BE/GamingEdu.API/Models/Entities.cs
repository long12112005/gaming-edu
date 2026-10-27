using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace GamingEdu.API.Models;

// ============================================================
// maps to: users table
// ============================================================
public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Nickname { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? AvatarUrl { get; set; }

    [MaxLength(100)]
    public string? AvatarFrame { get; set; } = "default";

    public bool IsAdmin { get; set; } = false; // maps to BIT

    [MaxLength(50)]
    public string Status { get; set; } = "ACTIVE"; // ACTIVE | LOCKED | DELETED

    public DateTime? LockedUntil { get; set; } // maps to DATETIME2

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public UserQuota? UserQuota { get; set; }
    public ICollection<Group> HostedGroups { get; set; } = [];
    public ICollection<GroupMember> GroupMemberships { get; set; } = [];
    public ICollection<Quiz> Quizzes { get; set; } = [];
    public ICollection<AIJob> AIJobs { get; set; } = [];
    public ICollection<Room> HostedRooms { get; set; } = [];
}

// ============================================================
// maps to: user_quotas table
// ============================================================
public class UserQuota
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public int AIGenerationLimit { get; set; } = 10;
    public int AIUsedToday { get; set; } = 0;
    public int MaxRoomCapacity { get; set; } = 50;
    public DateOnly? ResetDate { get; set; }

    // Navigation
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}

// ============================================================
// maps to: groups table
// ============================================================
public class Group
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid HostId { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required, MaxLength(10)]
    public string GroupCode { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Status { get; set; } = "ACTIVE"; // ACTIVE | DISBANDED

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(HostId))]
    public User Host { get; set; } = null!;
    public ICollection<GroupMember> Members { get; set; } = [];
}

// ============================================================
// maps to: group_members table
// ============================================================
public class GroupMember
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "PENDING"; // PENDING | ACTIVE | REJECTED

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(GroupId))]
    public Group Group { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}

// ============================================================
// maps to: quizzes table
// ============================================================
public class Quiz
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CreatorId { get; set; }

    [Required, MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? CoverImageUrl { get; set; }

    [MaxLength(100)]
    public string? Topic { get; set; }

    public bool IsPublic { get; set; } = false;
    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(CreatorId))]
    public User Creator { get; set; } = null!;
    public ICollection<Slide> Slides { get; set; } = [];
    public ICollection<AIJob> AIJobs { get; set; } = [];
    public ICollection<Room> Rooms { get; set; } = [];
}

// ============================================================
// maps to: slides table
// ============================================================
public class Slide
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid QuizId { get; set; }

    [Required, MaxLength(50)]
    public string Type { get; set; } = string.Empty;
    // QUIZ | FILL_IN_BLANK | MATCHING | POLL | WORD_CLOUD

    [Required]
    public string QuestionText { get; set; } = string.Empty;

    public int TimeLimit { get; set; } = 30;
    public int Points { get; set; } = 1000;

    [MaxLength(50)]
    public string Status { get; set; } = "PUBLISHED"; // DRAFT | PUBLISHED

    public int OrderIndex { get; set; }
    public bool IsAIGenerated { get; set; } = false;
    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(QuizId))]
    public Quiz Quiz { get; set; } = null!;
    public ICollection<SlideOption> Options { get; set; } = [];
    public ICollection<PlayerResponse> PlayerResponses { get; set; } = [];
}

// ============================================================
// maps to: slide_options table
// ============================================================
public class SlideOption
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid SlideId { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public bool IsCorrect { get; set; } = false;
    public string? MatchingPair { get; set; }     // for MATCHING type
    public string? BlankKeywords { get; set; }    // for FILL_IN_BLANK type
    public int OrderIndex { get; set; } = 0;

    // Navigation
    [ForeignKey(nameof(SlideId))]
    public Slide Slide { get; set; } = null!;
}

// ============================================================
// maps to: ai_jobs table
// ============================================================
public class AIJob
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public Guid? QuizId { get; set; }

    [Required, MaxLength(500)]
    public string FileUrl { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Status { get; set; } = "PENDING";
    // PENDING | PROCESSING | COMPLETED | FAILED

    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Navigation
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(QuizId))]
    public Quiz? Quiz { get; set; }
}

// ============================================================
// maps to: rooms table
// ============================================================
public class Room
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid HostId { get; set; }
    public Guid QuizId { get; set; }

    [Required, MaxLength(20)]
    public string PinCode { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Mode { get; set; } = string.Empty;
    // HOST_PACED | PLAYER_PACED | ASYNC_TOURNAMENT

    [MaxLength(50)]
    public string Status { get; set; } = "WAITING";
    // WAITING | PLAYING | FINISHED

    public int CurrentSlideIndex { get; set; } = 0;

    public int MapSize { get; set; } = 15;
    public string? GameSettings { get; set; } // JSON configuration: radar, shield, combo mode, etc.
    public bool IsEarlyFinished { get; set; } = false; // Ghi nhận chủ phòng kết thúc sớm
    [MaxLength(10)]
    public string? WinnerTeam { get; set; } // 'TEAM_A' | 'TEAM_B' | 'DRAW'

    public DateTime? StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(HostId))]
    public User Host { get; set; } = null!;

    [ForeignKey(nameof(QuizId))]
    public Quiz Quiz { get; set; } = null!;

    public ICollection<RoomPlayer> Players { get; set; } = [];
    public ICollection<QuestionQA> Questions { get; set; } = [];
    public ICollection<NavalTeam> NavalTeams { get; set; } = [];
    public ICollection<NavalShip> NavalShips { get; set; } = [];
    public ICollection<NavalAction> NavalActions { get; set; } = [];
}

// ============================================================
// maps to: room_players table
// ============================================================
public class RoomPlayer
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid RoomId { get; set; }
    public Guid? UserId { get; set; } // nullable → allows guest players

    [Required, MaxLength(100)]
    public string Nickname { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? AvatarUrl { get; set; }

    public int TotalScore { get; set; } = 0;
    public int? Rank { get; set; }

    [MaxLength(10)]
    public string? TeamSide { get; set; } // 'TEAM_A' | 'TEAM_B'

    public int CurrentCombo { get; set; } = 0;
    public int MaxCombo { get; set; } = 0;
    public int EnergyPoints { get; set; } = 0;
    public int ShotsEarned { get; set; } = 0;
    public int ValidShotsCount { get; set; } = 0;
    public int HitsCount { get; set; } = 0;
    public int ShipsSunkContribution { get; set; } = 0;
    public int SkillsUsedCount { get; set; } = 0;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(RoomId))]
    public Room Room { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    public ICollection<PlayerResponse> Responses { get; set; } = [];
    public ICollection<QuestionQA> Questions { get; set; } = [];
    public ICollection<NavalAction> NavalActions { get; set; } = [];
}

// ============================================================
// maps to: player_responses table
// ============================================================
public class PlayerResponse
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid RoomPlayerId { get; set; }
    public Guid SlideId { get; set; }

    public string? AnswerData { get; set; } // stored as JSON string
    public bool IsCorrect { get; set; } = false;
    public int ScoreAwarded { get; set; } = 0;
    public int? ResponseTimeMs { get; set; }
    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(RoomPlayerId))]
    public RoomPlayer RoomPlayer { get; set; } = null!;

    [ForeignKey(nameof(SlideId))]
    public Slide Slide { get; set; } = null!;
}

// ============================================================
// maps to: questions_qa table
// ============================================================
public class QuestionQA
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid RoomId { get; set; }
    public Guid PlayerId { get; set; }

    [Required, MaxLength(1000)]
    public string Content { get; set; } = string.Empty;

    public int Upvotes { get; set; } = 0;

    [MaxLength(50)]
    public string Status { get; set; } = "PENDING";
    // PENDING | PINNED | HIDDEN | RESOLVED

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(RoomId))]
    public Room Room { get; set; } = null!;

    [ForeignKey(nameof(PlayerId))]
    public RoomPlayer Player { get; set; } = null!;
}

// ============================================================
// maps to: naval_teams table
// ============================================================
public class NavalTeam
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid RoomId { get; set; }

    [Required, MaxLength(10)]
    public string TeamSide { get; set; } = string.Empty; // 'TEAM_A' | 'TEAM_B'

    public int RadarRemaining { get; set; } = 2;
    public int ShieldRemaining { get; set; } = 2;
    public int PrecisionShotRemaining { get; set; } = 1;
    public int TeamCombo { get; set; } = 0;
    public int ShipsRemaining { get; set; } = 5;

    // Navigation
    [ForeignKey(nameof(RoomId))]
    public Room Room { get; set; } = null!;
}

// ============================================================
// maps to: naval_ships table
// ============================================================
public class NavalShip
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid RoomId { get; set; }

    [Required, MaxLength(10)]
    public string TeamSide { get; set; } = string.Empty; // 'TEAM_A' | 'TEAM_B'

    public int ShipType { get; set; } // Kích thước tàu: 1, 2, 3, 4, 5

    [Required]
    public string Coordinates { get; set; } = "[]"; // JSON array: [{"r":1,"c":2,"hit":false,"shielded":false}, ...]

    public bool IsSunk { get; set; } = false;

    // Navigation
    [ForeignKey(nameof(RoomId))]
    public Room Room { get; set; } = null!;
}

// ============================================================
// maps to: naval_actions table
// ============================================================
public class NavalAction
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid RoomId { get; set; }
    public Guid PlayerId { get; set; }

    [Required, MaxLength(10)]
    public string AttackerTeam { get; set; } = string.Empty; // 'TEAM_A' | 'TEAM_B'

    [Required, MaxLength(10)]
    public string TargetTeam { get; set; } = string.Empty; // 'TEAM_A' | 'TEAM_B'

    [Required, MaxLength(30)]
    public string ActionType { get; set; } = "NORMAL_SHOT"; // 'NORMAL_SHOT' | 'PRECISION_SHOT' | 'RADAR_SCAN' | 'SHIELD_ACTIVATE'

    public int TargetRow { get; set; }
    public int TargetCol { get; set; }

    [Required, MaxLength(30)]
    public string Result { get; set; } = string.Empty; // 'MISS' | 'HIT' | 'SUNK' | 'BLOCKED_BY_SHIELD' | 'RADAR_DETECTED' | 'RADAR_EMPTY'

    public int? SunkShipType { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(RoomId))]
    public Room Room { get; set; } = null!;

    [ForeignKey(nameof(PlayerId))]
    public RoomPlayer Player { get; set; } = null!;
}

/// <summary>
/// Helper class representing a single cell of a naval ship.
/// </summary>
public class ShipCoordinate
{
    [JsonPropertyName("r")]
    public int R { get; set; }

    [JsonPropertyName("c")]
    public int C { get; set; }

    [JsonPropertyName("hit")]
    public bool Hit { get; set; } = false;

    [JsonPropertyName("shielded")]
    public bool Shielded { get; set; } = false;
}

