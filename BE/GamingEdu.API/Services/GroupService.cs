using GamingEdu.API.Data;
using GamingEdu.API.DTOs;
using GamingEdu.API.Hubs;
using GamingEdu.API.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace GamingEdu.API.Services;

public interface IGroupService
{
    Task<GroupDto> CreateGroupAsync(Guid hostId, CreateGroupRequest request);
    Task RequestJoinGroupAsync(Guid userId, string groupCode);
    Task ApproveOrRejectJoinRequestAsync(Guid hostId, Guid groupId, Guid memberId, bool isApproved);
    Task RemoveMemberAsync(Guid hostId, Guid groupId, Guid memberId);
    Task DisbandGroupAsync(Guid hostId, Guid groupId);
    Task<IEnumerable<GroupDto>> GetMyGroupsAsync(Guid userId);
    Task<IEnumerable<GroupMemberDto>> GetGroupMembersAsync(Guid groupId);
}

public class GroupService : IGroupService
{
    private readonly ApplicationDbContext _db;
    private readonly IHubContext<NotificationHub> _hubContext;

    public GroupService(ApplicationDbContext db, IHubContext<NotificationHub> hubContext)
    {
        _db = db;
        _hubContext = hubContext;
    }

    private string GenerateGroupCode() => Random.Shared.Next(100000, 999999).ToString();

    // 2.1 Tạo nhóm / Không gian chơi
    public async Task<GroupDto> CreateGroupAsync(Guid hostId, CreateGroupRequest request)
    {
        var host = await _db.Users.FindAsync(hostId) ?? throw new KeyNotFoundException("Không tìm thấy user.");
        
        string code;
        do { code = GenerateGroupCode(); } 
        while (await _db.Groups.AnyAsync(g => g.GroupCode == code && g.Status != "DISBANDED"));

        var group = new Group
        {
            Id = Guid.NewGuid(),
            HostId = hostId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            GroupCode = code,
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Groups.Add(group);
        await _db.SaveChangesAsync();

        return new GroupDto(group.Id, group.Name, group.Description, group.GroupCode, group.Status, host.Nickname, 0, group.CreatedAt);
    }

    // 2.2 Yêu cầu gia nhập nhóm
    public async Task RequestJoinGroupAsync(Guid userId, string groupCode)
    {
        var group = await _db.Groups.FirstOrDefaultAsync(g => g.GroupCode == groupCode && g.Status == "ACTIVE")
            ?? throw new InvalidOperationException("Không tìm thấy nhóm hoặc mã đã hết hạn.");

        if (group.HostId == userId) throw new InvalidOperationException("Bạn là chủ phòng của nhóm này.");

        var existing = await _db.GroupMembers.FirstOrDefaultAsync(gm => gm.GroupId == group.Id && gm.UserId == userId);
        if (existing != null)
        {
            if (existing.Status == "PENDING") throw new InvalidOperationException("Yêu cầu của bạn đang chờ duyệt.");
            if (existing.Status == "ACTIVE") throw new InvalidOperationException("Bạn đã là thành viên của nhóm này.");
            
            // Nếu bị REJECTED trước đó thì cho phép xin lại
            existing.Status = "PENDING";
            existing.JoinedAt = DateTime.UtcNow;
        }
        else
        {
            _db.GroupMembers.Add(new GroupMember
            {
                Id = Guid.NewGuid(),
                GroupId = group.Id,
                UserId = userId,
                Status = "PENDING",
                JoinedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        
        // Push notification cho Chủ phòng
        await _hubContext.Clients.Group($"user_{group.HostId}").SendAsync("NotificationReceived", 
            new { Message = $"{user?.Nickname} đã xin gia nhập nhóm {group.Name}.", Type = "JOIN_REQUEST" });
    }

    // 2.3 Phê duyệt thành viên
    public async Task ApproveOrRejectJoinRequestAsync(Guid hostId, Guid groupId, Guid memberId, bool isApproved)
    {
        var group = await _db.Groups.FindAsync(groupId) ?? throw new KeyNotFoundException("Không tìm thấy nhóm.");
        if (group.HostId != hostId) throw new UnauthorizedAccessException("Bạn không có quyền duyệt nhóm này.");

        var member = await _db.GroupMembers.FirstOrDefaultAsync(gm => gm.Id == memberId && gm.GroupId == groupId && gm.Status == "PENDING")
            ?? throw new InvalidOperationException("Yêu cầu không hợp lệ hoặc đã được xử lý.");

        member.Status = isApproved ? "ACTIVE" : "REJECTED";
        await _db.SaveChangesAsync();

        // Push notification cho Người chơi
        string resultMsg = isApproved ? $"Yêu cầu gia nhập nhóm {group.Name} đã được CHẤP THUẬN." : $"Yêu cầu gia nhập nhóm {group.Name} đã bị TỪ CHỐI.";
        await _hubContext.Clients.Group($"user_{member.UserId}").SendAsync("NotificationReceived", 
            new { Message = resultMsg, Type = "JOIN_RESULT" });
    }

    // 2.4 Quản lý - Xóa thành viên
    public async Task RemoveMemberAsync(Guid hostId, Guid groupId, Guid memberId)
    {
        var group = await _db.Groups.FindAsync(groupId) ?? throw new KeyNotFoundException("Không tìm thấy nhóm.");
        if (group.HostId != hostId) throw new UnauthorizedAccessException("Bạn không có quyền quản lý nhóm này.");

        var member = await _db.GroupMembers.FirstOrDefaultAsync(gm => gm.Id == memberId && gm.GroupId == groupId)
            ?? throw new KeyNotFoundException("Không tìm thấy thành viên.");

        _db.GroupMembers.Remove(member); // Hoặc đổi status = BANNED/KICKED
        await _db.SaveChangesAsync();

        await _hubContext.Clients.Group($"user_{member.UserId}").SendAsync("NotificationReceived", 
            new { Message = $"Bạn đã bị quản trị viên xóa khỏi nhóm {group.Name}.", Type = "MEMBER_KICKED" });
    }

    // 2.4 Quản lý - Giải tán nhóm
    public async Task DisbandGroupAsync(Guid hostId, Guid groupId)
    {
        var group = await _db.Groups.Include(g => g.Members).FirstOrDefaultAsync(g => g.Id == groupId)
            ?? throw new KeyNotFoundException("Không tìm thấy nhóm.");
        if (group.HostId != hostId) throw new UnauthorizedAccessException("Bạn không có quyền quản lý nhóm này.");

        group.Status = "DISBANDED";
        group.GroupCode = "DISB_" + group.GroupCode; // Vô hiệu hóa mã code
        group.UpdatedAt = DateTime.UtcNow;

        var memberUserIds = group.Members.Where(m => m.Status == "ACTIVE").Select(m => m.UserId).ToList();

        await _db.SaveChangesAsync();

        foreach (var uId in memberUserIds)
        {
            await _hubContext.Clients.Group($"user_{uId}").SendAsync("NotificationReceived", 
                new { Message = $"Nhóm {group.Name} đã bị chủ phòng giải tán.", Type = "GROUP_DISBANDED" });
        }
    }

    public async Task<IEnumerable<GroupDto>> GetMyGroupsAsync(Guid userId)
    {
        var groups = await _db.Groups
            .AsNoTracking()
            .Include(g => g.Host)
            .Include(g => g.Members)
            .Where(g => (g.HostId == userId || g.Members.Any(m => m.UserId == userId && m.Status == "ACTIVE")) && g.Status != "DISBANDED")
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => new GroupDto(
                g.Id, g.Name, g.Description, 
                g.HostId == userId ? g.GroupCode : "HIDDEN", // Giấu mã code nếu ko phải host
                g.Status, g.Host.Nickname, 
                g.Members.Count(m => m.Status == "ACTIVE"), g.CreatedAt))
            .ToListAsync();

        return groups;
    }

    public async Task<IEnumerable<GroupMemberDto>> GetGroupMembersAsync(Guid groupId)
    {
        var members = await _db.GroupMembers
            .AsNoTracking()
            .Include(gm => gm.User)
            .Where(gm => gm.GroupId == groupId)
            .Select(gm => new GroupMemberDto(gm.Id, gm.UserId, gm.User.Nickname, gm.User.AvatarUrl, gm.Status, gm.JoinedAt))
            .ToListAsync();
        return members;
    }
}
