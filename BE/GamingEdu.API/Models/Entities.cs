using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey(nameof(RoomId))]
    public Room Room { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    public ICollection<PlayerResponse> Responses { get; set; } = [];
    public ICollection<QuestionQA> Questions { get; set; } = [];
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
