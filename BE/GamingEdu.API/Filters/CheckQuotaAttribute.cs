using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GamingEdu.API.Filters;

public class CheckQuotaAttribute : TypeFilterAttribute
{
    public CheckQuotaAttribute(QuotaAction action) : base(typeof(CheckQuotaFilter))
    {
        Arguments = new object[] { action };
    }
}

public enum QuotaAction
{
    GenerateAI,
    CreateRoom
}

public class CheckQuotaFilter : IAsyncActionFilter
{
    private readonly ApplicationDbContext _db;
    private readonly QuotaAction _action;

    public CheckQuotaFilter(ApplicationDbContext db, QuotaAction action)
    {
        _db = db;
        _action = action;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var userIdClaim = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
        {
            context.Result = new UnauthorizedObjectResult(new ApiResponse<string>(false, "Unauthorized", null));
            return;
        }

        var quota = await _db.UserQuotas.FirstOrDefaultAsync(q => q.UserId == userId);
        if (quota == null)
        {
            context.Result = new BadRequestObjectResult(new ApiResponse<string>(false, "Không tìm thấy thông tin hạn mức.", null));
            return;
        }

        // Reset Quota logic (if ResetDate has passed)
        if (quota.ResetDate.HasValue && quota.ResetDate.Value <= DateOnly.FromDateTime(DateTime.UtcNow))
        {
            quota.AIUsedToday = 0;
            quota.ResetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
            await _db.SaveChangesAsync();
        }

        if (_action == QuotaAction.GenerateAI)
        {
            if (quota.AIUsedToday >= quota.AIGenerationLimit)
            {
                context.Result = new ObjectResult(new ApiResponse<string>(false, "Bạn đã hết lượt sử dụng AI trong ngày. Vui lòng quay lại vào ngày mai.", null))
                {
                    StatusCode = 429
                };
                return;
            }
        }
        else if (_action == QuotaAction.CreateRoom)
        {
            // You can add logic for CreateRoom limits here if there is a daily limit for rooms.
            // Currently, MaxRoomCapacity is for players per room, not room count.
        }

        await next();
    }
}
