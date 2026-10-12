using System.Collections.Concurrent;
using StackExchange.Redis;

namespace GamingEdu.API.Services;

public record LeaderboardRow(Guid PlayerId, int Score, int Rank);

/// <summary>
/// Bảng xếp hạng realtime theo phòng (spec 5.3: xếp hạng sau từng câu, Top 5/10,
/// thông báo leo hạng). Redis: Sorted Set key "lb:{roomId}", member = playerId, score = tổng điểm.
/// Fallback bộ nhớ trong khi chưa cấu hình Redis. DB (room_players.total_score) vẫn là nguồn sự thật
/// để dựng lại khi Redis mất dữ liệu.
/// </summary>
public interface ILeaderboardStore
{
    Task<bool> ExistsAsync(Guid roomId);
    Task SetScoreAsync(Guid roomId, Guid playerId, int score);
    /// <summary>Hạng 1-based (điểm cao = hạng nhỏ); null nếu chưa có.</summary>
    Task<int?> GetRankAsync(Guid roomId, Guid playerId);
    /// <summary>top = 0 → lấy tất cả.</summary>
    Task<IReadOnlyList<LeaderboardRow>> GetTopAsync(Guid roomId, int top);
    Task RemoveAsync(Guid roomId, Guid playerId);
}

public class RedisLeaderboardStore : ILeaderboardStore
{
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(24);
    private readonly IDatabase _db;
    public RedisLeaderboardStore(IConnectionMultiplexer mux) => _db = mux.GetDatabase();

    private static RedisKey Key(Guid roomId) => $"lb:{roomId}";

    public Task<bool> ExistsAsync(Guid roomId) => _db.KeyExistsAsync(Key(roomId));

    public async Task SetScoreAsync(Guid roomId, Guid playerId, int score)
    {
        await _db.SortedSetAddAsync(Key(roomId), playerId.ToString(), score);
        await _db.KeyExpireAsync(Key(roomId), Ttl);
    }

    public async Task<int?> GetRankAsync(Guid roomId, Guid playerId)
    {
        var r = await _db.SortedSetRankAsync(Key(roomId), playerId.ToString(), Order.Descending);
        return r.HasValue ? (int)r.Value + 1 : null;
    }

    public async Task<IReadOnlyList<LeaderboardRow>> GetTopAsync(Guid roomId, int top)
    {
        var stop = top <= 0 ? -1 : top - 1;
        var entries = await _db.SortedSetRangeByRankWithScoresAsync(Key(roomId), 0, stop, Order.Descending);
        var list = new List<LeaderboardRow>(entries.Length);
        for (int i = 0; i < entries.Length; i++)
        {
            if (Guid.TryParse(entries[i].Element.ToString(), out var id))
                list.Add(new LeaderboardRow(id, (int)entries[i].Score, i + 1));
        }
        return list;
    }

    public Task RemoveAsync(Guid roomId, Guid playerId) =>
        _db.SortedSetRemoveAsync(Key(roomId), playerId.ToString());
}

public class MemoryLeaderboardStore : ILeaderboardStore
{
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, int>> _rooms = new();

    public Task<bool> ExistsAsync(Guid roomId) => Task.FromResult(_rooms.ContainsKey(roomId));

    public Task SetScoreAsync(Guid roomId, Guid playerId, int score)
    {
        _rooms.GetOrAdd(roomId, _ => new()).AddOrUpdate(playerId, score, (_, _) => score);
        return Task.CompletedTask;
    }

    // Cùng quy tắc với Redis: điểm giảm dần, hòa điểm → member (chuỗi) giảm dần
    private static List<KeyValuePair<Guid, int>> Sorted(ConcurrentDictionary<Guid, int> room) =>
        room.OrderByDescending(kv => kv.Value)
            .ThenByDescending(kv => kv.Key.ToString(), StringComparer.Ordinal)
            .ToList();

    public Task<int?> GetRankAsync(Guid roomId, Guid playerId)
    {
        if (!_rooms.TryGetValue(roomId, out var room)) return Task.FromResult<int?>(null);
        var sorted = Sorted(room);
        var idx = sorted.FindIndex(kv => kv.Key == playerId);
        return Task.FromResult<int?>(idx < 0 ? null : idx + 1);
    }

    public Task<IReadOnlyList<LeaderboardRow>> GetTopAsync(Guid roomId, int top)
    {
        if (!_rooms.TryGetValue(roomId, out var room))
            return Task.FromResult<IReadOnlyList<LeaderboardRow>>([]);
        var rows = Sorted(room)
            .Select((kv, i) => new LeaderboardRow(kv.Key, kv.Value, i + 1));
        if (top > 0) rows = rows.Take(top);
        return Task.FromResult<IReadOnlyList<LeaderboardRow>>(rows.ToList());
    }

    public Task RemoveAsync(Guid roomId, Guid playerId)
    {
        if (_rooms.TryGetValue(roomId, out var room)) room.TryRemove(playerId, out _);
        return Task.CompletedTask;
    }
}
