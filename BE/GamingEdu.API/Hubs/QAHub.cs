using GamingEdu.API.DTOs;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace GamingEdu.API.Hubs;

public class QAHub : Hub
{
    private readonly IQAService _qaService;
    private readonly ILogger<QAHub> _logger;

    public QAHub(IQAService qaService, ILogger<QAHub> logger)
    {
        _qaService = qaService;
        _logger = logger;
    }

    public async Task JoinRoom(Guid roomId)
    {
        var groupName = $"qa_room_{roomId}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        Context.Items["RoomId"] = roomId;
        Context.Items["GroupName"] = groupName;

        // Send current questions to the user joining
        var questions = await _qaService.GetQuestionsAsync(roomId);
        await Clients.Caller.SendAsync("LoadQuestions", questions);
    }

    public async Task LeaveRoom()
    {
        if (Context.Items["GroupName"] is string groupName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        }
    }

    public async Task AskQuestion(Guid playerId, AskQuestionRequest request)
    {
        if (Context.Items["RoomId"] is not Guid roomId) return;
        
        try
        {
            var newQuestion = await _qaService.AskQuestionAsync(roomId, playerId, request.Content);
            var groupName = Context.Items["GroupName"] as string ?? $"qa_room_{roomId}";
            await Clients.Group(groupName).SendAsync("QuestionAdded", newQuestion);
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("QAError", ex.Message);
        }
    }

    public async Task UpvoteQuestion(Guid questionId)
    {
        if (Context.Items["RoomId"] is not Guid roomId) return;

        try
        {
            var newUpvotes = await _qaService.UpvoteQuestionAsync(roomId, questionId);
            var groupName = Context.Items["GroupName"] as string ?? $"qa_room_{roomId}";
            await Clients.Group(groupName).SendAsync("QuestionUpvoted", new { QuestionId = questionId, Upvotes = newUpvotes });
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("QAError", ex.Message);
        }
    }

    [Authorize]
    public async Task PinQuestion(Guid questionId, bool isPinned)
    {
        if (Context.Items["RoomId"] is not Guid roomId) return;
        
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var hostId)) return;

        try
        {
            await _qaService.PinQuestionAsync(roomId, hostId, questionId, isPinned);
            var groupName = Context.Items["GroupName"] as string ?? $"qa_room_{roomId}";
            await Clients.Group(groupName).SendAsync("QuestionPinned", new { QuestionId = questionId, IsPinned = isPinned });
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("QAError", ex.Message);
        }
    }

    [Authorize]
    public async Task HideQuestion(Guid questionId)
    {
        if (Context.Items["RoomId"] is not Guid roomId) return;
        
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var hostId)) return;

        try
        {
            await _qaService.HideQuestionAsync(roomId, hostId, questionId);
            var groupName = Context.Items["GroupName"] as string ?? $"qa_room_{roomId}";
            await Clients.Group(groupName).SendAsync("QuestionHidden", questionId);
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("QAError", ex.Message);
        }
    }

    [Authorize]
    public async Task ResolveQuestion(Guid questionId)
    {
        if (Context.Items["RoomId"] is not Guid roomId) return;
        
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var hostId)) return;

        try
        {
            await _qaService.ResolveQuestionAsync(roomId, hostId, questionId);
            var groupName = Context.Items["GroupName"] as string ?? $"qa_room_{roomId}";
            await Clients.Group(groupName).SendAsync("QuestionResolved", questionId);
        }
        catch (Exception ex)
        {
            await Clients.Caller.SendAsync("QAError", ex.Message);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await LeaveRoom();
        await base.OnDisconnectedAsync(exception);
    }
}
