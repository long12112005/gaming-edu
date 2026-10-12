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

        var systemInstruction = @"Bạn là một chuyên gia tạo câu hỏi trắc nghiệm. 
Bắt buộc trả về kết quả dưới dạng JSON (mảng các đối tượng). KHÔNG CÓ MARKDOWN HAY BẤT KỲ VĂN BẢN NÀO KHÁC BÊN NGOÀI JSON.
Cấu trúc mỗi object trong JSON phải như sau:
{
  ""type"": ""QUIZ"" | ""FILL_IN_BLANK"" | ""MATCHING"",
  ""questionText"": ""Nội dung câu hỏi"",
  ""timeLimit"": 30,
  ""points"": 1000,
  ""options"": [
    {
      ""content"": ""Đáp án A"",
      ""isCorrect"": true,
      ""orderIndex"": 0,
      ""matchingPair"": null,
      ""blankKeywords"": null
    }
  ]
}";

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
                return text ?? "[]";
            }
        }

        return "[]";
    }
}
