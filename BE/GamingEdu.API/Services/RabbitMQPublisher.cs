using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace GamingEdu.API.Services;

public class RabbitMQPublisher
{
    private readonly IConnectionFactory _factory;

    public RabbitMQPublisher(IConnectionFactory factory)
    {
        _factory = factory;
    }

    public async Task PublishAsync<T>(string queueName, T message)
    {
        await using var connection = await _factory.CreateConnectionAsync();
        await using var channel = await connection.CreateChannelAsync();
        
        await channel.QueueDeclareAsync(queue: queueName, durable: true, exclusive: false, autoDelete: false);
        
        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));
        
        var properties = new BasicProperties
        {
            Persistent = true
        };
        
        await channel.BasicPublishAsync(exchange: string.Empty, routingKey: queueName, mandatory: true, basicProperties: properties, body: body);
    }
}
