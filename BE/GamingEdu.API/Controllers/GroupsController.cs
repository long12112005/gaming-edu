using System.Security.Claims;
using GamingEdu.API.DTOs;
using GamingEdu.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GamingEdu.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly IGroupService _groupService;

    public GroupsController(IGroupService groupService)
    {
        _groupService = groupService;
    }

    private Guid GetCurrentUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetMyGroups()
    {
        var groups = await _groupService.GetMyGroupsAsync(GetCurrentUserId());
        return Ok(new ApiResponse<IEnumerable<GroupDto>>(true, "Success", groups));
    }

    [HttpPost]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest request)
    {
        var group = await _groupService.CreateGroupAsync(GetCurrentUserId(), request);
        return CreatedAtAction(nameof(GetMyGroups), new ApiResponse<GroupDto>(true, "Nhóm đã được tạo thành công.", group));
    }

    [HttpPost("join")]
    public async Task<IActionResult> RequestJoinGroup([FromBody] JoinGroupRequest request)
    {
        try
        {
            await _groupService.RequestJoinGroupAsync(GetCurrentUserId(), request.GroupCode.Trim());
            return Ok(new ApiResponse<string>(true, "Yêu cầu gia nhập đã được gửi tới chủ phòng.", null));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    [HttpGet("{groupId}/members")]
    public async Task<IActionResult> GetGroupMembers(Guid groupId)
    {
        var members = await _groupService.GetGroupMembersAsync(groupId);
        return Ok(new ApiResponse<IEnumerable<GroupMemberDto>>(true, "Success", members));
    }

    [HttpPut("{groupId}/members/{memberId}")]
    public async Task<IActionResult> RespondJoinRequest(Guid groupId, Guid memberId, [FromBody] RespondJoinRequest request)
    {
        try
        {
            await _groupService.ApproveOrRejectJoinRequestAsync(GetCurrentUserId(), groupId, memberId, request.IsApproved);
            return Ok(new ApiResponse<string>(true, "Đã xử lý yêu cầu gia nhập.", null));
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    [HttpDelete("{groupId}/members/{memberId}")]
    public async Task<IActionResult> RemoveMember(Guid groupId, Guid memberId)
    {
        try
        {
            await _groupService.RemoveMemberAsync(GetCurrentUserId(), groupId, memberId);
            return Ok(new ApiResponse<string>(true, "Đã xóa thành viên khỏi nhóm.", null));
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }

    [HttpDelete("{groupId}")]
    public async Task<IActionResult> DisbandGroup(Guid groupId)
    {
        try
        {
            await _groupService.DisbandGroupAsync(GetCurrentUserId(), groupId);
            return Ok(new ApiResponse<string>(true, "Nhóm đã bị giải tán.", null));
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<string>(false, ex.Message, null));
        }
    }
}
