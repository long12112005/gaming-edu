namespace GamingEdu.API.Services.GameEngines;

public class GameEngineFactory : IGameEngineFactory
{
    private readonly IEnumerable<IGameModeEngine> _engines;

    public GameEngineFactory(IEnumerable<IGameModeEngine> engines)
    {
        _engines = engines;
    }

    public IGameModeEngine GetEngine(string gameType)
    {
        var cleanType = gameType?.Trim().ToUpperInvariant() ?? "HEX_CONQUEST";
        var engine = _engines.FirstOrDefault(e => e.GameType.Equals(cleanType, StringComparison.OrdinalIgnoreCase));
        if (engine == null)
        {
            // Mặc định fallback về HexConquestEngine nếu truyền sai tên
            return _engines.FirstOrDefault(e => e.GameType == "HEX_CONQUEST")
                ?? throw new InvalidOperationException($"Không tìm thấy Engine cho GameType '{gameType}'");
        }
        return engine;
    }
}

