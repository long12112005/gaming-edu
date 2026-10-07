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
            _logger.LogInformation("MOCK EMAIL SENDED: \nTo: {Email}\nSubject: {Subject}\nBody: {Body}", toEmail, subject, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            throw new InvalidOperationException("Không thể gửi email OTP, vui lòng thử lại sau.");
        }
    }
}
