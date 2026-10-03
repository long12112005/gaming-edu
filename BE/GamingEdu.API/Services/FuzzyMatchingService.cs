using System.Text;
using System.Text.RegularExpressions;

namespace GamingEdu.API.Services;

/// <summary>
/// Dịch vụ so khớp chuỗi mờ (Fuzzy Matching) dành riêng cho câu hỏi điền khuyết Tiếng Việt.
///
/// Quy trình chuẩn hóa 4 bước bắt buộc:
///   1. Chuyển toàn bộ về chữ thường (ToLowerInvariant)
///   2. Khử sạch dấu Tiếng Việt (Unicode decompose → strip combining marks)
///   3. Loại bỏ khoảng trắng đầu/cuối và chuẩn hóa khoảng trắng giữa về 1
///   4. So khớp với mảng từ khóa chuẩn, dùng Levenshtein với dung sai ký tự nhỏ
/// </summary>
public class FuzzyMatchingService
{
    // ── Bảng map trực tiếp Unicode Tiếng Việt → ASCII (bao gồm cả hoa lẫn thường) ──
    // Dùng dictionary thay vì Normalize(FormD) để tránh dependency hệ thống và
    // đảm bảo kết quả nhất quán trên mọi OS.
    private static readonly Dictionary<char, char> _vietMap = new()
    {
        // ── a ──────────────────────────────────────────────────────────────
        {'à','a'},{'á','a'},{'ả','a'},{'ã','a'},{'ạ','a'},
        {'ă','a'},{'ằ','a'},{'ắ','a'},{'ẳ','a'},{'ẵ','a'},{'ặ','a'},
        {'â','a'},{'ầ','a'},{'ấ','a'},{'ẩ','a'},{'ẫ','a'},{'ậ','a'},
        {'À','a'},{'Á','a'},{'Ả','a'},{'Ã','a'},{'Ạ','a'},
        {'Ă','a'},{'Ằ','a'},{'Ắ','a'},{'Ẳ','a'},{'Ẵ','a'},{'Ặ','a'},
        {'Â','a'},{'Ầ','a'},{'Ấ','a'},{'Ẩ','a'},{'Ẫ','a'},{'Ậ','a'},
        // ── e ──────────────────────────────────────────────────────────────
        {'è','e'},{'é','e'},{'ẻ','e'},{'ẽ','e'},{'ẹ','e'},
        {'ê','e'},{'ề','e'},{'ế','e'},{'ể','e'},{'ễ','e'},{'ệ','e'},
        {'È','e'},{'É','e'},{'Ẻ','e'},{'Ẽ','e'},{'Ẹ','e'},
        {'Ê','e'},{'Ề','e'},{'Ế','e'},{'Ể','e'},{'Ễ','e'},{'Ệ','e'},
        // ── i ──────────────────────────────────────────────────────────────
        {'ì','i'},{'í','i'},{'ỉ','i'},{'ĩ','i'},{'ị','i'},
        {'Ì','i'},{'Í','i'},{'Ỉ','i'},{'Ĩ','i'},{'Ị','i'},
        // ── o ──────────────────────────────────────────────────────────────
        {'ò','o'},{'ó','o'},{'ỏ','o'},{'õ','o'},{'ọ','o'},
        {'ô','o'},{'ồ','o'},{'ố','o'},{'ổ','o'},{'ỗ','o'},{'ộ','o'},
        {'ơ','o'},{'ờ','o'},{'ớ','o'},{'ở','o'},{'ỡ','o'},{'ợ','o'},
        {'Ò','o'},{'Ó','o'},{'Ỏ','o'},{'Õ','o'},{'Ọ','o'},
        {'Ô','o'},{'Ồ','o'},{'Ố','o'},{'Ổ','o'},{'Ỗ','o'},{'Ộ','o'},
        {'Ơ','o'},{'Ờ','o'},{'Ớ','o'},{'Ở','o'},{'Ỡ','o'},{'Ợ','o'},
        // ── u ──────────────────────────────────────────────────────────────
        {'ù','u'},{'ú','u'},{'ủ','u'},{'ũ','u'},{'ụ','u'},
        {'ư','u'},{'ừ','u'},{'ứ','u'},{'ử','u'},{'ữ','u'},{'ự','u'},
        {'Ù','u'},{'Ú','u'},{'Ủ','u'},{'Ũ','u'},{'Ụ','u'},
        {'Ư','u'},{'Ừ','u'},{'Ứ','u'},{'Ử','u'},{'Ữ','u'},{'Ự','u'},
        // ── y ──────────────────────────────────────────────────────────────
        {'ỳ','y'},{'ý','y'},{'ỷ','y'},{'ỹ','y'},{'ỵ','y'},
        {'Ỳ','y'},{'Ý','y'},{'Ỷ','y'},{'Ỹ','y'},{'Ỵ','y'},
        // ── đ ──────────────────────────────────────────────────────────────
        {'đ','d'},{'Đ','d'},
    };

    // ── BƯỚC 1-3: Chuẩn hóa chuỗi ─────────────────────────────────────────────
    /// <summary>
    /// Chuẩn hóa chuỗi đầu vào theo 3 bước đầu:
    ///   1. Chuyển chữ thường
    ///   2. Khử dấu Tiếng Việt
    ///   3. Chuẩn hóa khoảng trắng
    /// </summary>
    public static string Normalize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        // Bước 1: Chữ thường
        var lower = input.ToLowerInvariant();

        // Bước 2: Khử dấu Tiếng Việt theo bảng map
        var sb = new StringBuilder(lower.Length);
        foreach (char c in lower)
            sb.Append(_vietMap.TryGetValue(c, out char mapped) ? mapped : c);

        // Bước 3: Trim + collapse whitespace
        var result = Regex.Replace(sb.ToString().Trim(), @"\s+", " ");
        return result;
    }

    // ── BƯỚC 4: Levenshtein Distance ──────────────────────────────────────────
    /// <summary>
    /// Tính khoảng cách chỉnh sửa Levenshtein giữa hai chuỗi.
    /// Dùng mảng 1D rolling để tiết kiệm bộ nhớ O(min(n,m)).
    /// </summary>
    public static int LevenshteinDistance(string a, string b)
    {
        if (a.Length == 0) return b.Length;
        if (b.Length == 0) return a.Length;

        // Đảm bảo a là chuỗi ngắn hơn để tối ưu bộ nhớ
        if (a.Length > b.Length) (a, b) = (b, a);

        int n = a.Length, m = b.Length;
        var prev = new int[n + 1];
        var curr = new int[n + 1];

        for (int i = 0; i <= n; i++) prev[i] = i;

        for (int j = 1; j <= m; j++)
        {
            curr[0] = j;
            for (int i = 1; i <= n; i++)
            {
                int cost = a[i - 1] == b[j - 1] ? 0 : 1;
                curr[i] = Math.Min(
                    Math.Min(curr[i - 1] + 1, prev[i] + 1),
                    prev[i - 1] + cost);
            }
            (prev, curr) = (curr, prev);
        }

        return prev[n];
    }

    // ── So khớp đơn ───────────────────────────────────────────────────────────
    /// <summary>
    /// So khớp một đáp án với một từ khóa chuẩn.
    /// Tự động tính dung sai dựa trên độ dài từ khóa:
    ///   - Từ khóa ≤ 3 ký tự → dung sai 0 (bắt buộc chính xác)
    ///   - Từ khóa 4-7 ký tự  → dung sai 1
    ///   - Từ khóa ≥ 8 ký tự  → dung sai 2
    /// </summary>
    public bool IsMatch(string? input, string? keyword, int? overrideTolerance = null)
    {
        var normInput   = Normalize(input);
        var normKeyword = Normalize(keyword);

        if (string.IsNullOrEmpty(normInput) || string.IsNullOrEmpty(normKeyword))
            return false;

        // Tính dung sai tự động nếu không override
        int tolerance = overrideTolerance ?? normKeyword.Length switch
        {
            <= 3 => 0,
            <= 7 => 1,
            _    => 2,
        };

        return LevenshteinDistance(normInput, normKeyword) <= tolerance;
    }

    // ── So khớp với nhiều từ khóa (OR logic) ──────────────────────────────────
    /// <summary>
    /// Kiểm tra xem đáp án có khớp với bất kỳ từ khóa nào trong danh sách không.
    /// </summary>
    public bool IsMatchAny(string? input, IEnumerable<string> keywords, int? overrideTolerance = null)
        => keywords.Any(kw => IsMatch(input, kw, overrideTolerance));

    // ── Chấm điểm FILL_IN_BLANK có nhiều ô trống ──────────────────────────────
    /// <summary>
    /// Chấm điểm câu hỏi điền khuyết nhiều chỗ trống.
    ///
    /// <para><b>Encoding quy ước cho BlankKeywords:</b></para>
    /// Mỗi SlideOption tương ứng 1 chỗ trống (blank).
    /// BlankKeywords = "kw1,kw2,kw3" (phân cách bằng dấu phẩy, OR logic trong 1 blank).
    ///
    /// <para><b>AnswerData JSON format:</b></para>
    /// ["đáp án blank 1", "đáp án blank 2", ...]
    ///
    /// <para><b>Scoring:</b></para>
    /// Tính tỷ lệ % số blank điền đúng × điểm tối đa của slide.
    /// </summary>
    /// <param name="userAnswers">Danh sách đáp án người dùng (theo thứ tự blank)</param>
    /// <param name="blankKeywordSets">
    ///   Danh sách keyword sets theo thứ tự blank.
    ///   keywordSets[i] = danh sách từ khóa chấp nhận cho blank thứ i (OR).
    /// </param>
    /// <param name="overrideTolerance">Nếu null, dùng dung sai tự động theo độ dài.</param>
    /// <returns>
    ///   (isFullyCorrect, scoreRatio, correctCount, totalBlanks)
    /// </returns>
    public (bool IsFullyCorrect, double ScoreRatio, int CorrectCount, int TotalBlanks)
        GradeFillInBlank(
            IList<string> userAnswers,
            IList<IList<string>> blankKeywordSets,
            int? overrideTolerance = null)
    {
        int totalBlanks  = blankKeywordSets.Count;
        int correctCount = 0;

        for (int i = 0; i < totalBlanks; i++)
        {
            // Nếu người dùng không điền đủ → blank i sai
            if (i >= userAnswers.Count) continue;

            bool blankCorrect = IsMatchAny(userAnswers[i], blankKeywordSets[i], overrideTolerance);
            if (blankCorrect) correctCount++;
        }

        double scoreRatio     = totalBlanks == 0 ? 0 : (double)correctCount / totalBlanks;
        bool   isFullyCorrect = correctCount == totalBlanks && totalBlanks > 0;

        return (isFullyCorrect, scoreRatio, correctCount, totalBlanks);
    }

    // ── Helper: Parse BlankKeywords string → keyword list ─────────────────────
    /// <summary>
    /// Parse chuỗi BlankKeywords từ DB về danh sách keyword.
    /// Format: "từ khóa 1,từ khóa 2,từ khóa 3"
    /// </summary>
    public static List<string> ParseKeywords(string? blankKeywords)
    {
        if (string.IsNullOrWhiteSpace(blankKeywords)) return [];

        return blankKeywords
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(k => !string.IsNullOrWhiteSpace(k))
            .ToList();
    }
}
