

using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Data;

/// <summary>
/// EF Core DbContext configured with Fluent API to match the SQL Server schema exactly.
/// </summary>
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    // ─── DbSets (maps to SQL tables) ───────────────────────────────────
    public DbSet<User>           Users           => Set<User>();
    public DbSet<UserQuota>      UserQuotas      => Set<UserQuota>();
    public DbSet<Group>          Groups          => Set<Group>();
    public DbSet<GroupMember>    GroupMembers    => Set<GroupMember>();
    public DbSet<Quiz>           Quizzes         => Set<Quiz>();
    public DbSet<Slide>          Slides          => Set<Slide>();
    public DbSet<SlideOption>    SlideOptions    => Set<SlideOption>();
    public DbSet<AIJob>          AIJobs          => Set<AIJob>();
    public DbSet<Room>           Rooms           => Set<Room>();
    public DbSet<RoomPlayer>     RoomPlayers     => Set<RoomPlayer>();
    public DbSet<PlayerResponse> PlayerResponses => Set<PlayerResponse>();
    public DbSet<QuestionQA>     QuestionsQA     => Set<QuestionQA>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── users ──────────────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(u => u.Id);
            e.Property(u => u.Id).ValueGeneratedNever(); // UNIQUEIDENTIFIER — we generate in app
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(255).IsRequired();
            e.Property(u => u.PasswordHash).HasMaxLength(255).IsRequired();
            e.Property(u => u.Nickname).HasMaxLength(100).IsRequired();
            e.Property(u => u.AvatarUrl).HasMaxLength(500);
            e.Property(u => u.IsAdmin).HasDefaultValue(false);
            e.Property(u => u.Status).HasMaxLength(50).HasDefaultValue("ACTIVE");
            e.Property(u => u.LockedUntil).HasColumnType("datetime2");
            e.Property(u => u.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            e.Property(u => u.UpdatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
        });

        // ── user_quotas ────────────────────────────────────────────────
        modelBuilder.Entity<UserQuota>(e =>
        {
            e.ToTable("user_quotas");
            e.HasKey(q => q.Id);
            e.Property(q => q.Id).ValueGeneratedNever();
            e.HasIndex(q => q.UserId).IsUnique();
            e.Property(q => q.AIGenerationLimit).HasDefaultValue(10);
            e.Property(q => q.AIUsedToday).HasDefaultValue(0);
            e.Property(q => q.MaxRoomCapacity).HasDefaultValue(50);

            e.HasOne(q => q.User)
                .WithOne(u => u.UserQuota)
                .HasForeignKey<UserQuota>(q => q.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── groups ─────────────────────────────────────────────────────
        modelBuilder.Entity<Group>(e =>
        {
            e.ToTable("groups");
            e.HasKey(g => g.Id);
            e.Property(g => g.Id).ValueGeneratedNever();
            e.HasIndex(g => g.GroupCode).IsUnique();
            e.Property(g => g.Name).HasMaxLength(255).IsRequired();
            e.Property(g => g.GroupCode).HasMaxLength(10).IsRequired();
            e.Property(g => g.Status).HasMaxLength(50).HasDefaultValue("ACTIVE");
            e.Property(g => g.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            e.Property(g => g.UpdatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");

            e.HasOne(g => g.Host)
                .WithMany(u => u.HostedGroups)
                .HasForeignKey(g => g.HostId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── group_members ──────────────────────────────────────────────
        modelBuilder.Entity<GroupMember>(e =>
        {
            e.ToTable("group_members");
            e.HasKey(gm => gm.Id);
            e.Property(gm => gm.Id).ValueGeneratedNever();
            // Unique constraint: (group_id, user_id)
            e.HasIndex(gm => new { gm.GroupId, gm.UserId }).IsUnique();
            e.Property(gm => gm.Status).HasMaxLength(50).HasDefaultValue("PENDING");
            e.Property(gm => gm.JoinedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");

            e.HasOne(gm => gm.Group)
                .WithMany(g => g.Members)
                .HasForeignKey(gm => gm.GroupId)
                .OnDelete(DeleteBehavior.NoAction);

            e.HasOne(gm => gm.User)
                .WithMany(u => u.GroupMemberships)
                .HasForeignKey(gm => gm.UserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // ── quizzes ────────────────────────────────────────────────────
        modelBuilder.Entity<Quiz>(e =>
        {
            e.ToTable("quizzes");
            e.HasKey(q => q.Id);
            e.Property(q => q.Id).ValueGeneratedNever();
            e.Property(q => q.Title).HasMaxLength(255).IsRequired();
            e.Property(q => q.CoverImageUrl).HasMaxLength(500);
            e.Property(q => q.Topic).HasMaxLength(100);
            e.Property(q => q.IsPublic).HasDefaultValue(false);
            e.Property(q => q.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            e.Property(q => q.UpdatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");

            e.HasOne(q => q.Creator)
                .WithMany(u => u.Quizzes)
                .HasForeignKey(q => q.CreatorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── slides ─────────────────────────────────────────────────────
        modelBuilder.Entity<Slide>(e =>
        {
            e.ToTable("slides");
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).ValueGeneratedNever();
            e.Property(s => s.Type).HasMaxLength(50).IsRequired();
            e.Property(s => s.TimeLimit).HasDefaultValue(30);
            e.Property(s => s.Points).HasDefaultValue(1000);
            e.Property(s => s.Status).HasMaxLength(50).HasDefaultValue("PUBLISHED");
            e.Property(s => s.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");

            e.HasOne(s => s.Quiz)
                .WithMany(q => q.Slides)
                .HasForeignKey(s => s.QuizId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── slide_options ──────────────────────────────────────────────
        modelBuilder.Entity<SlideOption>(e =>
        {
            e.ToTable("slide_options");
            e.HasKey(so => so.Id);
            e.Property(so => so.Id).ValueGeneratedNever();
            e.Property(so => so.IsCorrect).HasDefaultValue(false);
            e.Property(so => so.OrderIndex).HasDefaultValue(0);

            e.HasOne(so => so.Slide)
                .WithMany(s => s.Options)
                .HasForeignKey(so => so.SlideId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ai_jobs ────────────────────────────────────────────────────
        modelBuilder.Entity<AIJob>(e =>
        {
            e.ToTable("ai_jobs");
            e.HasKey(j => j.Id);
            e.Property(j => j.Id).ValueGeneratedNever();
            e.Property(j => j.FileUrl).HasMaxLength(500).IsRequired();
            e.Property(j => j.Status).HasMaxLength(50).HasDefaultValue("PENDING");
            e.Property(j => j.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            e.Property(j => j.CompletedAt).HasColumnType("datetime2");

            e.HasOne(j => j.User)
                .WithMany(u => u.AIJobs)
                .HasForeignKey(j => j.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            e.HasOne(j => j.Quiz)
                .WithMany(q => q.AIJobs)
                .HasForeignKey(j => j.QuizId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // ── rooms ──────────────────────────────────────────────────────
        modelBuilder.Entity<Room>(e =>
        {
            e.ToTable("rooms");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).ValueGeneratedNever();
            e.HasIndex(r => r.PinCode).IsUnique();
            e.Property(r => r.PinCode).HasMaxLength(20).IsRequired();
            e.Property(r => r.Mode).HasMaxLength(50).IsRequired();
            e.Property(r => r.Status).HasMaxLength(50).HasDefaultValue("WAITING");
            e.Property(r => r.StartTime).HasColumnType("datetime2");
            e.Property(r => r.EndTime).HasColumnType("datetime2");
            e.Property(r => r.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");
            e.Ignore(r => r.CurrentSlideIndex); // runtime state, not persisted

            e.HasOne(r => r.Host)
                .WithMany(u => u.HostedRooms)
                .HasForeignKey(r => r.HostId)
                .OnDelete(DeleteBehavior.NoAction);

            e.HasOne(r => r.Quiz)
                .WithMany(q => q.Rooms)
                .HasForeignKey(r => r.QuizId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // ── room_players ───────────────────────────────────────────────
        modelBuilder.Entity<RoomPlayer>(e =>
        {
            e.ToTable("room_players");
            e.HasKey(rp => rp.Id);
            e.Property(rp => rp.Id).ValueGeneratedNever();
            e.Property(rp => rp.Nickname).HasMaxLength(100).IsRequired();
            e.Property(rp => rp.AvatarUrl).HasMaxLength(500);
            e.Property(rp => rp.TotalScore).HasDefaultValue(0);
            e.Property(rp => rp.JoinedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");

            e.HasOne(rp => rp.Room)
                .WithMany(r => r.Players)
                .HasForeignKey(rp => rp.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(rp => rp.User)
                .WithMany()
                .HasForeignKey(rp => rp.UserId)
                .OnDelete(DeleteBehavior.NoAction)
                .IsRequired(false);
        });

        // ── player_responses ───────────────────────────────────────────
        modelBuilder.Entity<PlayerResponse>(e =>
        {
            e.ToTable("player_responses");
            e.HasKey(pr => pr.Id);
            e.Property(pr => pr.Id).ValueGeneratedNever();
            e.Property(pr => pr.IsCorrect).HasDefaultValue(false);
            e.Property(pr => pr.ScoreAwarded).HasDefaultValue(0);
            e.Property(pr => pr.AnsweredAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");

            e.HasOne(pr => pr.RoomPlayer)
                .WithMany(rp => rp.Responses)
                .HasForeignKey(pr => pr.RoomPlayerId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(pr => pr.Slide)
                .WithMany(s => s.PlayerResponses)
                .HasForeignKey(pr => pr.SlideId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // ── questions_qa ───────────────────────────────────────────────
        modelBuilder.Entity<QuestionQA>(e =>
        {
            e.ToTable("questions_qa");
            e.HasKey(qa => qa.Id);
            e.Property(qa => qa.Id).ValueGeneratedNever();
            e.Property(qa => qa.Content).HasMaxLength(1000).IsRequired();
            e.Property(qa => qa.Upvotes).HasDefaultValue(0);
            e.Property(qa => qa.Status).HasMaxLength(50).HasDefaultValue("PENDING");
            e.Property(qa => qa.CreatedAt).HasColumnType("datetime2").HasDefaultValueSql("GETUTCDATE()");

            e.HasOne(qa => qa.Room)
                .WithMany(r => r.Questions)
                .HasForeignKey(qa => qa.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(qa => qa.Player)
                .WithMany(rp => rp.Questions)
                .HasForeignKey(qa => qa.PlayerId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // ── Indexes from SQL schema ────────────────────────────────────
        // idx_users_email — covered by HasIndex above
        // idx_groups_code — covered by HasIndex above
        // idx_rooms_pin — covered by HasIndex above
        modelBuilder.Entity<AIJob>()
            .HasIndex(j => j.Status)
            .HasDatabaseName("idx_ai_jobs_status");

        modelBuilder.Entity<Slide>()
            .HasIndex(s => s.QuizId)
            .HasDatabaseName("idx_slides_quiz");

        modelBuilder.Entity<SlideOption>()
            .HasIndex(so => so.SlideId)
            .HasDatabaseName("idx_slide_options_slide");

        modelBuilder.Entity<RoomPlayer>()
            .HasIndex(rp => rp.RoomId)
            .HasDatabaseName("idx_room_players_room");

        modelBuilder.Entity<PlayerResponse>()
            .HasIndex(pr => pr.RoomPlayerId)
            .HasDatabaseName("idx_player_responses_room_player");

        // Extra index for slide-centric leaderboard queries
        modelBuilder.Entity<PlayerResponse>()
            .HasIndex(pr => pr.SlideId)
            .HasDatabaseName("idx_player_responses_slide");
    }
}
