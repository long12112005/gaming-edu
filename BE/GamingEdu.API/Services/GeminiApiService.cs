using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace GamingEdu.API.Services;

public interface IGeminiApiService
{
    Task<string> GenerateQuizJsonAsync(string prompt, string? fileUrl);
}

public class GeminiApiService : IGeminiApiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<GeminiApiService> _logger;

    public GeminiApiService(HttpClient httpClient, IConfiguration config, ILogger<GeminiApiService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public async Task<string> GenerateQuizJsonAsync(string prompt, string? fileUrl)
    {
        var apiKey = _config["Gemini:ApiKey"];
        var model = _config["Gemini:Model"] ?? "gemini-1.5-flash";

        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException("Gemini API Key is not configured.");
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

        var systemInstruction = @"Bạn là chuyên gia sư phạm và khảo thí AI chuyên nghiệp cho nền tảng Gaming Edu.
Nhiệm vụ của bạn là phân tích tài liệu học tập hoặc chủ đề được cung cấp để sinh ra bộ câu hỏi chất lượng cao (3 đến 5 câu) gồm các định dạng đa dạng:
1. QUIZ (Trắc nghiệm 4 lựa chọn):
   - questionText: Nội dung câu hỏi rõ ràng.
   - options: Đúng 4 phương án, trong đó có duy nhất 1 phương án isCorrect: true, 3 phương án còn lại isCorrect: false.
2. FILL_IN_BLANK (Điền từ khuyết / tự luận ngắn):
   - questionText: Câu hỏi hoặc câu chứa vị trí cần điền (dùng dấu [...] để biểu thị ô trống).
   - options: Đúng 1 phương án duy nhất với isCorrect: true, content là từ/cụm từ chuẩn; blankKeywords là danh sách các biến thể/từ đồng nghĩa không dấu phân cách bằng dấu phẩy.
3. MATCHING (Ghép nối cặp khái niệm tương ứng):
   - questionText: Yêu cầu ghép nối phù hợp.
   - options: 3 hoặc 4 phương án với isCorrect: true, trong đó content là vế bên trái, matchingPair là vế bên phải tương ứng.

QUY TẮC BẮT BUỘC:
- Trả về JSON THUẦN TÚY (mảng các đối tượng).
- TUYỆT ĐỐI KHÔNG DÙNG MARKDOWN BLOCK (```json hoặc ```).
- KHÔNG KÈM THEO BẤT KỲ LỜI DẪN HAY VĂN BẢN NÀO NGOÀI JSON.

Ví dụ định dạng mẫu:
[
  {
    ""type"": ""QUIZ"",
    ""questionText"": ""Hệ điều hành nào sau đây là mã nguồn mở?"",
    ""timeLimit"": 30,
    ""points"": 1000,
    ""options"": [
      { ""content"": ""Linux"", ""isCorrect"": true, ""orderIndex"": 0 },
      { ""content"": ""Windows"", ""isCorrect"": false, ""orderIndex"": 1 },
      { ""content"": ""macOS"", ""isCorrect"": false, ""orderIndex"": 2 },
      { ""content"": ""iOS"", ""isCorrect"": false, ""orderIndex"": 3 }
    ]
  },
  {
    ""type"": ""FILL_IN_BLANK"",
    ""questionText"": ""Giao thức truyền tải siêu văn bản an toàn trên Internet có tên viết tắt là [...]"",
    ""timeLimit"": 30,
    ""points"": 1000,
    ""options"": [
      { ""content"": ""HTTPS"", ""isCorrect"": true, ""orderIndex"": 0, ""blankKeywords"": ""https, http secure"" }
    ]
  },
  {
    ""type"": ""MATCHING"",
    ""questionText"": ""Hãy ghép nối các cổng mạng mặc định với giao thức tương ứng:"",
    ""timeLimit"": 45,
    ""points"": 1000,
    ""options"": [
      { ""content"": ""HTTP"", ""matchingPair"": ""80"", ""isCorrect"": true, ""orderIndex"": 0 },
      { ""content"": ""HTTPS"", ""matchingPair"": ""443"", ""isCorrect"": true, ""orderIndex"": 1 },
      { ""content"": ""SSH"", ""matchingPair"": ""22"", ""isCorrect"": true, ""orderIndex"": 2 }
    ]
  }
]";

        var requestBody = new
        {
            system_instruction = new
            {
                parts = new[] { new { text = systemInstruction } }
            },
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                response_mime_type = "application/json"
            }
        };

        var jsonOptions = new JsonSerializerOptions { DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };
        var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody, jsonOptions), Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync(url, jsonContent);
        
        var responseString = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Gemini API Error: {StatusCode} - {Response}", response.StatusCode, responseString);
            throw new Exception($"Gemini API Error: {response.StatusCode}");
        }

        using var jsonDoc = JsonDocument.Parse(responseString);
        var root = jsonDoc.RootElement;

        if (root.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
        {
            var content = candidates[0].GetProperty("content");
            if (content.TryGetProperty("parts", out var parts) && parts.GetArrayLength() > 0)
            {
                var text = parts[0].GetProperty("text").GetString();
                return CleanJson(text ?? "[]");
            }
        }

        return "[]";
    }

    private static string CleanJson(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "[]";
        var trimmed = raw.Trim();
        if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = trimmed[7..];
        }
        else if (trimmed.StartsWith("```"))
        {
            trimmed = trimmed[3..];
        }
        if (trimmed.EndsWith("```"))
        {
            trimmed = trimmed[..^3];
        }
        return trimmed.Trim();
    }
}
