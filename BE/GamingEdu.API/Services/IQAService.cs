using GamingEdu.API.DTOs;

namespace GamingEdu.API.Services;

public interface IQAService
{
    Task<QuestionQADto> AskQuestionAsync(Guid roomId, Guid playerId, string content);
    Task<int> UpvoteQuestionAsync(Guid roomId, Guid questionId);
    Task PinQuestionAsync(Guid roomId, Guid hostId, Guid questionId, bool isPinned);
    Task HideQuestionAsync(Guid roomId, Guid hostId, Guid questionId);
    Task ResolveQuestionAsync(Guid roomId, Guid hostId, Guid questionId);
    Task<IEnumerable<QuestionQADto>> GetQuestionsAsync(Guid roomId);
}
