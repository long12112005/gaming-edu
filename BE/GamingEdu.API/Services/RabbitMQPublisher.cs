using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace GamingEdu.API.Services;

public class RabbitMQPublisher
{
    private readonly ILogger<RabbitMQPublisher> _logger;

    public RabbitMQPublisher(ILogger<RabbitMQPublisher> logger)
    {
        _logger = logger;
    }

    public Task PublishAsync<T>(string queueName, T message)
    {
        _logger.LogInformation("Mocked RabbitMQ Publish to {Queue}: {Message}", queueName, JsonSerializer.Serialize(message));
        return Task.CompletedTask;
    }
}
