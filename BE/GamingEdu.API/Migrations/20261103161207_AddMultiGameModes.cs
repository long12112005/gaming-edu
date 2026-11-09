using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GamingEdu.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiGameModes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "game_type",
                table: "rooms",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "NAVAL_WAR");

            migrationBuilder.AddColumn<int>(
                name: "action_points",
                table: "room_players",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "is_isolated",
                table: "room_players",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "player_role",
                table: "room_players",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "MEMBER");

            migrationBuilder.CreateTable(
                name: "room_game_actions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    room_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    player_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    slide_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    action_type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    action_payload_json = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    action_result = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_room_game_actions", x => x.id);
                    table.ForeignKey(
                        name: "fk_room_game_actions_room_players_player_id",
                        column: x => x.player_id,
                        principalTable: "room_players",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_room_game_actions_rooms_room_id",
                        column: x => x.room_id,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_room_game_actions_slides_slide_id",
                        column: x => x.slide_id,
                        principalTable: "slides",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "room_game_states",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    room_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    team_or_group = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    hp_or_progress = table.Column<int>(type: "int", nullable: false, defaultValue: 100),
                    board_state_json = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    skills_state_json = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_room_game_states", x => x.id);
                    table.ForeignKey(
                        name: "fk_room_game_states_rooms_room_id",
                        column: x => x.room_id,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_game_actions_room",
                table: "room_game_actions",
                column: "room_id");

            migrationBuilder.CreateIndex(
                name: "idx_game_actions_room_created",
                table: "room_game_actions",
                columns: new[] { "room_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_room_game_actions_player_id",
                table: "room_game_actions",
                column: "player_id");

            migrationBuilder.CreateIndex(
                name: "ix_room_game_actions_slide_id",
                table: "room_game_actions",
                column: "slide_id");

            migrationBuilder.CreateIndex(
                name: "ix_room_game_states_room_id_team_or_group",
                table: "room_game_states",
                columns: new[] { "room_id", "team_or_group" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "room_game_actions");

            migrationBuilder.DropTable(
                name: "room_game_states");

            migrationBuilder.DropColumn(
                name: "game_type",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "action_points",
                table: "room_players");

            migrationBuilder.DropColumn(
                name: "is_isolated",
                table: "room_players");

            migrationBuilder.DropColumn(
                name: "player_role",
                table: "room_players");
        }
    }
}
