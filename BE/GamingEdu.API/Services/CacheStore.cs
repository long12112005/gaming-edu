using Microsoft.Extensions.Caching.Memory;
using StackExchange.Redis;

namespace GamingEdu.API.Services;

/// <summary>
/// Abstraction cho kho key-value dùng chung (OTP, session, đếm đăng nhập sai...).
/// Production: Redis. Dev (chưa cấu hình Redis): fallback sang MemoryCache.
/// </summary>
public interface ICacheStore
{
    Task<string?> GetStringAsync(string key);
    Task SetStringAsync(string key, string value, TimeSpan ttl);
    Task<bool> RemoveAsync(string key);
    /// <summary>Tăng bộ đếm nguyên tử; đặt TTL nếu key mới được tạo.</summary>
    Task<long> IncrementAsync(string key, TimeSpan ttl);
    Task<bool> ExistsAsync(string key);
    /// <summary>Ghi nếu key chưa tồn tại (nguyên tử). Trả về true nếu đã ghi.</summary>
    Task<bool> SetIfNotExistsAsync(string key, string value, TimeSpan ttl);
}

public class RedisCacheStore : ICacheStore
{
    private readonly IDatabase _db;
    public RedisCacheStore(IConnectionMultiplexer mux) => _db = mux.GetDatabase();

    public async Task<string?> GetStringAsync(string key)
    {
        var v = await _db.StringGetAsync(key);
        return v.HasValue ? v.ToString() : null;
    }

    public Task SetStringAsync(string key, string value, TimeSpan ttl) =>
        _db.StringSetAsync(key, value, ttl);

    public Task<bool> RemoveAsync(string key) => _db.KeyDeleteAsync(key);

    public async Task<long> IncrementAsync(string key, TimeSpan ttl)
    {
        var n = await _db.StringIncrementAsync(key);
        if (n == 1) await _db.KeyExpireAsync(key, ttl);
        return n;
    }

    public Task<bool> ExistsAsync(string key) => _db.KeyExistsAsync(key);

    public Task<bool> SetIfNotExistsAsync(string key, string value, TimeSpan ttl) =>
        _db.StringSetAsync(key, value, ttl, When.NotExists);
}

public class MemoryCacheStore : ICacheStore
{
    private readonly IMemoryCache _cache;
    private static readonly object _lock = new();
    public MemoryCacheStore(IMemoryCache cache) => _cache = cache;

    public Task<string?> GetStringAsync(string key) =>
        Task.FromResult(_cache.TryGetValue(key, out string? v) ? v : null);

    public Task SetStringAsync(string key, string value, TimeSpan ttl)
    {
        _cache.Set(key, value, ttl);
        return Task.CompletedTask;
    }

    public Task<bool> RemoveAsync(string key)
    {
        var existed = _cache.TryGetValue(key, out _);
        _cache.Remove(key);
        return Task.FromResult(existed);
    }

    public Task<long> IncrementAsync(string key, TimeSpan ttl)
    {
        lock (_lock)
        {
            long n = _cache.TryGetValue(key, out long cur) ? cur + 1 : 1;
            // Bản fallback dev: TTL được gia hạn mỗi lần tăng (Redis giữ TTL gốc)
            if (n == 1) _cache.Set(key, n, ttl);
            else
            {
                var entry = _cache.CreateEntry(key);
                entry.Value = n;
                entry.AbsoluteExpirationRelativeToNow = ttl;
                entry.Dispose();
            }
            return Task.FromResult(n);
        }
    }

    public Task<bool> ExistsAsync(string key) => Task.FromResult(_cache.TryGetValue(key, out _));

    public Task<bool> SetIfNotExistsAsync(string key, string value, TimeSpan ttl)
    {
        lock (_lock)
        {
            if (_cache.TryGetValue(key, out _)) return Task.FromResult(false);
            _cache.Set(key, value, ttl);
            return Task.FromResult(true);
        }
    }
}
