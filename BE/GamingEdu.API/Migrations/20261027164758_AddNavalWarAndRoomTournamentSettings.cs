using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GamingEdu.API.Migrations
{
    /// <inheritdoc />
    public partial class AddNavalWarAndRoomTournamentSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "avatar_frame",
                table: "users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "game_settings",
                table: "rooms",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_early_finished",
                table: "rooms",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "map_size",
                table: "rooms",
                type: "int",
                nullable: false,
                defaultValue: 15);

            migrationBuilder.AddColumn<string>(
                name: "winner_team",
                table: "rooms",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "current_combo",
                table: "room_players",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "energy_points",
                table: "room_players",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "hits_count",
                table: "room_players",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "max_combo",
                table: "room_players",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ships_sunk_contribution",
                table: "room_players",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "shots_earned",
                table: "room_players",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "skills_used_count",
                table: "room_players",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "team_side",
                table: "room_players",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "valid_shots_count",
                table: "room_players",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "naval_actions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    room_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    player_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    attacker_team = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    target_team = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    action_type = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    target_row = table.Column<int>(type: "int", nullable: false),
                    target_col = table.Column<int>(type: "int", nullable: false),
                    result = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    sunk_ship_type = table.Column<int>(type: "int", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_naval_actions", x => x.id);
                    table.ForeignKey(
                        name: "fk_naval_actions_room_players_player_id",
                        column: x => x.player_id,
                        principalTable: "room_players",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "fk_naval_actions_rooms_room_id",
                        column: x => x.room_id,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "naval_ships",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    room_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    team_side = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ship_type = table.Column<int>(type: "int", nullable: false),
                    coordinates = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    is_sunk = table.Column<bool>(type: "bit", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_naval_ships", x => x.id);
                    table.ForeignKey(
                        name: "fk_naval_ships_rooms_room_id",
                        column: x => x.room_id,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "naval_teams",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    room_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    team_side = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    radar_remaining = table.Column<int>(type: "int", nullable: false, defaultValue: 2),
                    shield_remaining = table.Column<int>(type: "int", nullable: false, defaultValue: 2),
                    precision_shot_remaining = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    team_combo = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    ships_remaining = table.Column<int>(type: "int", nullable: false, defaultValue: 5)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_naval_teams", x => x.id);
                    table.ForeignKey(
                        name: "fk_naval_teams_rooms_room_id",
                        column: x => x.room_id,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_naval_actions_room",
                table: "naval_actions",
                columns: new[] { "room_id", "target_team", "target_row", "target_col" });

            migrationBuilder.CreateIndex(
                name: "ix_naval_actions_player_id",
                table: "naval_actions",
                column: "player_id");

            migrationBuilder.CreateIndex(
                name: "idx_naval_ships_room",
                table: "naval_ships",
                columns: new[] { "room_id", "team_side" });

            migrationBuilder.CreateIndex(
                name: "ix_naval_teams_room_id_team_side",
                table: "naval_teams",
                columns: new[] { "room_id", "team_side" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "naval_actions");

            migrationBuilder.DropTable(
                name: "naval_ships");

            migrationBuilder.DropTable(
                name: "naval_teams");

            migrationBuilder.DropColumn(
                name: "avatar_frame",
                table: "users");

            migrationBuilder.DropColumn(
                name: "game_settings",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "is_early_finished",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "map_size",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "winner_team",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "current_combo",
                table: "room_players");

            migrationBuilder.DropColumn(
                name: "energy_points",
                table: "room_players");

            migrationBuilder.DropColumn(
                name: "hits_count",
                table: "room_players");

            migrationBuilder.DropColumn(
                name: "max_combo",
                table: "room_players");

            migrationBuilder.DropColumn(
                name: "ships_sunk_contribution",
                table: "room_players");

            migrationBuilder.DropColumn(
                name: "shots_earned",
                table: "room_players");

            migrationBuilder.DropColumn(
                name: "skills_used_count",
                table: "room_players");

            migrationBuilder.DropColumn(
                name: "team_side",
                table: "room_players");

            migrationBuilder.DropColumn(
                name: "valid_shots_count",
                table: "room_players");
        }
    }
}
