using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services;

public class QAService : IQAService
{
    private readonly ApplicationDbContext _db;

    public QAService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<QuestionQADto> AskQuestionAsync(Guid roomId, Guid playerId, string content)
    {
        var player = await _db.RoomPlayers.FindAsync(playerId) 
            ?? throw new KeyNotFoundException("Player not found");
        
        if (player.RoomId != roomId) throw new ArgumentException("Player does not belong to this room");

        var qa = new QuestionQA
        {
            Id = Guid.NewGuid(),
            RoomId = roomId,
            PlayerId = playerId,
            Content = content,
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
            Upvotes = 0
        };

        _db.QuestionsQA.Add(qa);
        await _db.SaveChangesAsync();

        return new QuestionQADto(
            qa.Id, qa.RoomId, qa.PlayerId, player.Nickname, player.AvatarUrl,
            qa.Content, qa.Upvotes, qa.Status, qa.CreatedAt
        );
    }

    public async Task<int> UpvoteQuestionAsync(Guid roomId, Guid questionId)
    {
        var qa = await _db.QuestionsQA.FirstOrDefaultAsync(q => q.Id == questionId && q.RoomId == roomId)
            ?? throw new KeyNotFoundException("Question not found");

        qa.Upvotes += 1;
        await _db.SaveChangesAsync();
        
        return qa.Upvotes;
    }

    public async Task PinQuestionAsync(Guid roomId, Guid hostId, Guid questionId, bool isPinned)
    {
        var room = await _db.Rooms.FindAsync(roomId) ?? throw new KeyNotFoundException("Room not found");
        if (room.HostId != hostId) throw new UnauthorizedAccessException("Only host can pin questions");

        var qa = await _db.QuestionsQA.FirstOrDefaultAsync(q => q.Id == questionId && q.RoomId == roomId)
            ?? throw new KeyNotFoundException("Question not found");

        // If pinning, unpin the currently pinned one (only allow 1 pinned at a time or just leave as is? Usually 1 pinned)
        if (isPinned)
        {
            var currentlyPinned = await _db.QuestionsQA.Where(q => q.RoomId == roomId && q.Status == "PINNED").ToListAsync();
            foreach (var p in currentlyPinned) p.Status = "PENDING";
            qa.Status = "PINNED";
        }
        else
        {
            qa.Status = "PENDING";
        }
        
        await _db.SaveChangesAsync();
    }

    public async Task HideQuestionAsync(Guid roomId, Guid hostId, Guid questionId)
    {
        var room = await _db.Rooms.FindAsync(roomId) ?? throw new KeyNotFoundException("Room not found");
        if (room.HostId != hostId) throw new UnauthorizedAccessException("Only host can hide questions");

        var qa = await _db.QuestionsQA.FirstOrDefaultAsync(q => q.Id == questionId && q.RoomId == roomId)
            ?? throw new KeyNotFoundException("Question not found");

        qa.Status = "HIDDEN";
        await _db.SaveChangesAsync();
    }

    public async Task ResolveQuestionAsync(Guid roomId, Guid hostId, Guid questionId)
    {
        var room = await _db.Rooms.FindAsync(roomId) ?? throw new KeyNotFoundException("Room not found");
        if (room.HostId != hostId) throw new UnauthorizedAccessException("Only host can resolve questions");

        var qa = await _db.QuestionsQA.FirstOrDefaultAsync(q => q.Id == questionId && q.RoomId == roomId)
            ?? throw new KeyNotFoundException("Question not found");

        qa.Status = "RESOLVED";
        await _db.SaveChangesAsync();
    }

    public async Task<IEnumerable<QuestionQADto>> GetQuestionsAsync(Guid roomId)
    {
        return await _db.QuestionsQA
            .AsNoTracking()
            .Include(q => q.Player)
            .Where(q => q.RoomId == roomId && q.Status != "HIDDEN")
            .OrderByDescending(q => q.Status == "PINNED") // Pinned first
            .ThenByDescending(q => q.Upvotes)             // Then by most upvotes
            .ThenBy(q => q.CreatedAt)
            .Select(q => new QuestionQADto(
                q.Id, q.RoomId, q.PlayerId, q.Player.Nickname, q.Player.AvatarUrl,
                q.Content, q.Upvotes, q.Status, q.CreatedAt
            ))
            .ToListAsync();
    }
}
