using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace GamingEdu.API.Services;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string body);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        try
        {
            var host = _config["Smtp:Host"];
            var portStr = _config["Smtp:Port"];
            var user = _config["Smtp:User"];
            var pass = _config["Smtp:Pass"];

            // Mock email sending for local development if SMTP is not configured
            if (string.IsNullOrEmpty(user) || user == "your-email@gmail.com")
            {
                _logger.LogWarning("⚠️ MOCK EMAIL (Không có cấu hình SMTP). Sẽ không gửi mail thực tế.");
                _logger.LogWarning("Mô phỏng gửi email tới: {Email}\nNội dung: {Body}", toEmail, body);
                return;
            }

            int port = int.TryParse(portStr, out int p) ? p : 587;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Gaming Edu", user));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;

            message.Body = new TextPart("html")
            {
                Text = body
            };

            using var client = new SmtpClient();
            await client.ConnectAsync(host ?? "smtp.gmail.com", port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(user, pass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            throw new InvalidOperationException("Không thể gửi email OTP do lỗi cấu hình SMTP.");
        }
    }
}
