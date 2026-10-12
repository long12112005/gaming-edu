namespace GamingEdu.API.Services;

public enum TimerCheckStatus { Ok, NotStarted, Expired }

public record TimerCheckResult(TimerCheckStatus Status, int ElapsedMs);

/// <summary>
/// Đồng hồ phía server (chống gian lận): thời gian trả lời được tính từ mốc
/// server ghi nhận khi câu hỏi hiển thị, KHÔNG tin ResponseTimeMs do client gửi.
/// - Phòng Thường/Tự động: 1 mốc chung cho cả phòng (slide_start:{room}:{slide}).
/// - Giải đấu/Tự học (Async): mốc riêng từng thí sinh (player_slide_start:{player}:{slide}).
/// Lưu trên ICacheStore (Redis) để dùng chung giữa các instance.
/// </summary>
public interface ISlideTimerService
{
    Task StartRoomSlideAsync(Guid roomId, Guid slideId, int timeLimitSeconds);
    Task<bool> StartPlayerSlideAsync(Guid playerId, Guid slideId, int timeLimitSeconds);
    Task<TimerCheckResult> CheckAsync(Guid roomId, Guid playerId, Guid slideId);
}

public class SlideTimerService : ISlideTimerService
{
    /// <summary>Độ trễ mạng cho phép sau khi hết giờ.</summary>
    public const int GraceMs = 2000;
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(6);

    private readonly ICacheStore _store;
    public SlideTimerService(ICacheStore store) => _store = store;

    private static string RoomKey(Guid roomId, Guid slideId) => $"slide_start:{roomId}:{slideId}";
    private static string PlayerKey(Guid playerId, Guid slideId) => $"player_slide_start:{playerId}:{slideId}";

    // Giá trị lưu: "{unixMs}|{timeLimitSeconds}"
    private static string Encode(int timeLimitSeconds) =>
        $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}|{timeLimitSeconds}";

    public async Task StartRoomSlideAsync(Guid roomId, Guid slideId, int timeLimitSeconds) =>
        await _store.SetStringAsync(RoomKey(roomId, slideId), Encode(timeLimitSeconds), Ttl);

    /// <summary>Idempotent: gọi lại không reset đồng hồ (chống F5 để câu giờ).</summary>
    public Task<bool> StartPlayerSlideAsync(Guid playerId, Guid slideId, int timeLimitSeconds) =>
        _store.SetIfNotExistsAsync(PlayerKey(playerId, slideId), Encode(timeLimitSeconds), Ttl);

    public async Task<TimerCheckResult> CheckAsync(Guid roomId, Guid playerId, Guid slideId)
    {
        var raw = await _store.GetStringAsync(PlayerKey(playerId, slideId))
                  ?? await _store.GetStringAsync(RoomKey(roomId, slideId));
        if (raw is null) return new TimerCheckResult(TimerCheckStatus.NotStarted, 0);

        var parts = raw.Split('|');
        if (parts.Length != 2
            || !long.TryParse(parts[0], out var startMs)
            || !int.TryParse(parts[1], out var limitSec))
            return new TimerCheckResult(TimerCheckStatus.NotStarted, 0);

        var elapsed = (int)Math.Max(0, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - startMs);
        var status = elapsed > limitSec * 1000L + GraceMs ? TimerCheckStatus.Expired : TimerCheckStatus.Ok;
        return new TimerCheckResult(status, elapsed);
    }
}
