using GamingEdu.API.Data;
using GamingEdu.API.Models;

namespace GamingEdu.API.Services.GameEngines;

public record SlideAnswerProcessResult(
    bool Success,
    bool IsCorrect,
    int ScoreAwarded,
    int ActionPointsEarned,
    int TotalActionPoints,
    string Message,
    object? ExtraState = null
);

public record GameActionResult(
    bool Success,
    string ActionType,
    string Result,
    string Message,
    object? Data = null,
    bool MatchEnded = false,
    string? WinnerTeam = null
);

public record GameMatchStatus(
    string Status, // WAITING | PLAYING | FINISHED
    int CurrentSlideIndex,
    int TotalSlides,
    bool IsFinished,
    string? Winner = null,
    object? Summary = null
);

public interface IGameModeEngine
{
    string GameType { get; }

    /// <summary>
    /// Khởi tạo trạng thái game lúc bắt đầu trận (bản đồ, đội chơi, vai trò bí mật).
    /// </summary>
    Task InitializeRoomAsync(Room room, List<RoomPlayer> players, ApplicationDbContext db);

    /// <summary>
    /// Xử lý nộp câu trả lời slide.
    /// LUẬT BẮT BUỘC:
    /// - Chặn nộp trùng slide_id.
    /// - Chỉ nhận action_points khi trả lời ĐÚNG từ bảng slides & slide_options.
    /// </summary>
    Task<SlideAnswerProcessResult> ProcessSlideAnswerAsync(
        Room room,
        RoomPlayer player,
        Slide slide,
        string answerData,
        int responseTimeMs,
        ApplicationDbContext db
    );

    /// <summary>
    /// Thực hiện hành động trong game (chiếm ô, xây tháp, chèo thuyền, ghép ray, bắn pháo, sửa/phá trạm, đặt bom).
    /// </summary>
    Task<GameActionResult> PerformActionAsync(
        Room room,
        RoomPlayer player,
        string actionType,
        string payloadJson,
        ApplicationDbContext db
    );

    /// <summary>
    /// Kích hoạt kỹ năng đặc trưng của từng chế độ game.
    /// </summary>
    Task<GameActionResult> UseSkillAsync(
        Room room,
        RoomPlayer player,
        string skillName,
        string payloadJson,
        ApplicationDbContext db
    );

    /// <summary>
    /// Đánh giá điều kiện thắng/thua thời gian thực.
    /// </summary>
    Task<GameMatchStatus> EvaluateMatchStatusAsync(Room room, ApplicationDbContext db);

    /// <summary>
    /// Lấy trạng thái game để gửi về client (bảo mật vai trò bí mật, radar, sương mù chiến tranh).
    /// </summary>
    Task<object> GetClientGameStateAsync(Room room, Guid? requestingPlayerId, ApplicationDbContext db);
}

public interface IGameEngineFactory
{
    IGameModeEngine GetEngine(string gameType);
}

