using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GamingEdu.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDeleteForQuizAndSlide : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    password_hash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    nickname = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    avatar_url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    is_admin = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "ACTIVE"),
                    locked_until = table.Column<DateTime>(type: "datetime2", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "groups",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    host_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    group_code = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "ACTIVE"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_groups", x => x.id);
                    table.ForeignKey(
                        name: "fk_groups_users_host_id",
                        column: x => x.host_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quizzes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    creator_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    cover_image_url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    topic = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    is_public = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_quizzes", x => x.id);
                    table.ForeignKey(
                        name: "fk_quizzes_users_creator_id",
                        column: x => x.creator_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "user_quotas",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    user_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ai_generation_limit = table.Column<int>(type: "int", nullable: false, defaultValue: 10),
                    ai_used_today = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    max_room_capacity = table.Column<int>(type: "int", nullable: false, defaultValue: 50),
                    reset_date = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_quotas", x => x.id);
                    table.ForeignKey(
                        name: "fk_user_quotas_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "group_members",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    group_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    user_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "PENDING"),
                    joined_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_group_members", x => x.id);
                    table.ForeignKey(
                        name: "fk_group_members_groups_group_id",
                        column: x => x.group_id,
                        principalTable: "groups",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_group_members_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "ai_jobs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    user_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    quiz_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    file_url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "PENDING"),
                    error_message = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    completed_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ai_jobs", x => x.id);
                    table.ForeignKey(
                        name: "fk_ai_jobs_quizzes_quiz_id",
                        column: x => x.quiz_id,
                        principalTable: "quizzes",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_ai_jobs_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "rooms",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    host_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    quiz_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    pin_code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    mode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "WAITING"),
                    start_time = table.Column<DateTime>(type: "datetime2", nullable: true),
                    end_time = table.Column<DateTime>(type: "datetime2", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_rooms", x => x.id);
                    table.ForeignKey(
                        name: "fk_rooms_quizzes_quiz_id",
                        column: x => x.quiz_id,
                        principalTable: "quizzes",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_rooms_users_host_id",
                        column: x => x.host_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "slides",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    quiz_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    question_text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    time_limit = table.Column<int>(type: "int", nullable: false, defaultValue: 30),
                    points = table.Column<int>(type: "int", nullable: false, defaultValue: 1000),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "PUBLISHED"),
                    order_index = table.Column<int>(type: "int", nullable: false),
                    is_ai_generated = table.Column<bool>(type: "bit", nullable: false),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_slides", x => x.id);
                    table.ForeignKey(
                        name: "fk_slides_quizzes_quiz_id",
                        column: x => x.quiz_id,
                        principalTable: "quizzes",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "room_players",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    room_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    user_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    nickname = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    avatar_url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    total_score = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    rank = table.Column<int>(type: "int", nullable: true),
                    joined_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_room_players", x => x.id);
                    table.ForeignKey(
                        name: "fk_room_players_rooms_room_id",
                        column: x => x.room_id,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_room_players_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "slide_options",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    slide_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    is_correct = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    matching_pair = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    blank_keywords = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    order_index = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_slide_options", x => x.id);
                    table.ForeignKey(
                        name: "fk_slide_options_slides_slide_id",
                        column: x => x.slide_id,
                        principalTable: "slides",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "player_responses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    room_player_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    slide_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    answer_data = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_correct = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    score_awarded = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    response_time_ms = table.Column<int>(type: "int", nullable: true),
                    answered_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_player_responses", x => x.id);
                    table.ForeignKey(
                        name: "fk_player_responses_room_players_room_player_id",
                        column: x => x.room_player_id,
                        principalTable: "room_players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_player_responses_slides_slide_id",
                        column: x => x.slide_id,
                        principalTable: "slides",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "questions_qa",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    room_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    player_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    content = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    upvotes = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "PENDING"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_questions_qa", x => x.id);
                    table.ForeignKey(
                        name: "fk_questions_qa_room_players_player_id",
                        column: x => x.player_id,
                        principalTable: "room_players",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_questions_qa_rooms_room_id",
                        column: x => x.room_id,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_ai_jobs_status",
                table: "ai_jobs",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_ai_jobs_quiz_id",
                table: "ai_jobs",
                column: "quiz_id");

            migrationBuilder.CreateIndex(
                name: "ix_ai_jobs_user_id",
                table: "ai_jobs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_group_members_group_id_user_id",
                table: "group_members",
                columns: new[] { "group_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_group_members_user_id",
                table: "group_members",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_groups_group_code",
                table: "groups",
                column: "group_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_groups_host_id",
                table: "groups",
                column: "host_id");

            migrationBuilder.CreateIndex(
                name: "idx_player_responses_room_player",
                table: "player_responses",
                column: "room_player_id");

            migrationBuilder.CreateIndex(
                name: "idx_player_responses_slide",
                table: "player_responses",
                column: "slide_id");

            migrationBuilder.CreateIndex(
                name: "ix_questions_qa_player_id",
                table: "questions_qa",
                column: "player_id");

            migrationBuilder.CreateIndex(
                name: "ix_questions_qa_room_id",
                table: "questions_qa",
                column: "room_id");

            migrationBuilder.CreateIndex(
                name: "ix_quizzes_creator_id",
                table: "quizzes",
                column: "creator_id");

            migrationBuilder.CreateIndex(
                name: "idx_room_players_room",
                table: "room_players",
                column: "room_id");

            migrationBuilder.CreateIndex(
                name: "ix_room_players_user_id",
                table: "room_players",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_rooms_host_id",
                table: "rooms",
                column: "host_id");

            migrationBuilder.CreateIndex(
                name: "ix_rooms_pin_code",
                table: "rooms",
                column: "pin_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_rooms_quiz_id",
                table: "rooms",
                column: "quiz_id");

            migrationBuilder.CreateIndex(
                name: "idx_slide_options_slide",
                table: "slide_options",
                column: "slide_id");

            migrationBuilder.CreateIndex(
                name: "idx_slides_quiz",
                table: "slides",
                column: "quiz_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_quotas_user_id",
                table: "user_quotas",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_jobs");

            migrationBuilder.DropTable(
                name: "group_members");

            migrationBuilder.DropTable(
                name: "player_responses");

            migrationBuilder.DropTable(
                name: "questions_qa");

            migrationBuilder.DropTable(
                name: "slide_options");

            migrationBuilder.DropTable(
                name: "user_quotas");

            migrationBuilder.DropTable(
                name: "groups");

            migrationBuilder.DropTable(
                name: "room_players");

            migrationBuilder.DropTable(
                name: "slides");

            migrationBuilder.DropTable(
                name: "rooms");

            migrationBuilder.DropTable(
                name: "quizzes");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
