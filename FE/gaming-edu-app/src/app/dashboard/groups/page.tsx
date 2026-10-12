"use client";

import { useEffect, useState } from "react";
import { Users, Plus, UserPlus, Check, X, Trash2, Settings } from "lucide-react";
import { GroupAPI } from "@/lib/api";
import Cookies from "js-cookie";

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res: any = await GroupAPI.getAll();
      if (res.success) {
        // BE chỉ trả thông tin nhóm → gọi thêm danh sách thành viên cho từng nhóm
        const withMembers = await Promise.all(
          (res.data as any[]).map(async (g) => {
            try {
              const mRes: any = await GroupAPI.getMembers(g.id);
              return { ...g, members: mRes.success ? mRes.data : [] };
            } catch {
              return { ...g, members: [] };
            }
          })
        );
        setGroups(withMembers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = Cookies.get("user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
    fetchGroups();
  }, []);

  const handleCreateGroup = async () => {
    const name = prompt("Nhập tên nhóm mới:");
    if (!name) return;
    try {
      await GroupAPI.create({ name: name.trim(), description: "" });
      fetchGroups();
    } catch (err: any) {
      alert(err.message || "Lỗi tạo nhóm!");
    }
  };

  const handleJoinGroup = async () => {
    const code = prompt("Nhập mã nhóm (6 ký tự):");
    if (!code) return;
    try {
      await GroupAPI.join(code);
      alert("Đã gửi yêu cầu tham gia. Vui lòng chờ nhóm trưởng duyệt.");
      fetchGroups();
    } catch (err: any) {
      alert(err.message || "Lỗi tham gia nhóm!");
    }
  };

  const handleApprove = async (groupId: string, memberId: string) => {
    try {
      await GroupAPI.approveMember(groupId, memberId);
      fetchGroups();
    } catch (err: any) {
      alert(err.message || "Lỗi duyệt thành viên!");
    }
  };

  const handleReject = async (groupId: string, memberId: string) => {
    try {
      await GroupAPI.rejectMember(groupId, memberId);
      fetchGroups();
    } catch (err: any) {
      alert(err.message || "Lỗi từ chối thành viên!");
    }
  };

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    if (!confirm("Xóa thành viên này khỏi nhóm?")) return;
    try {
      await GroupAPI.removeMember(groupId, memberId);
      fetchGroups();
    } catch (err: any) {
      alert(err.message || "Lỗi xóa thành viên!");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Bạn có chắc muốn giải tán nhóm này? Hành động này không thể hoàn tác.")) return;
    try {
      await GroupAPI.deleteGroup(groupId);
      fetchGroups();
    } catch (err: any) {
      alert(err.message || "Lỗi xóa nhóm!");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Nhóm</h1>
          <p className="text-gray-500 mt-1">Tạo nhóm học tập hoặc tham gia bằng mã code</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleJoinGroup}
            className="flex items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            <UserPlus className="w-5 h-5 mr-2 text-indigo-500" />
            Tham gia nhóm
          </button>
          <button 
            onClick={handleCreateGroup}
            className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Tạo nhóm mới
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">Đang tải dữ liệu...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Chưa tham gia nhóm nào</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">Bạn có thể tạo nhóm mới để làm chủ phòng hoặc dùng Mã Code để tham gia nhóm có sẵn.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groups.map((group) => {
            // BE chỉ trả groupCode thật cho chủ nhóm, thành viên sẽ nhận "HIDDEN"
            const isHost = group.groupCode !== "HIDDEN" || group.hostNickname === currentUser?.nickname;
            const myMembership = group.members.find((m: any) => m.userId === currentUser?.id);
            const pendingMembers = group.members.filter((m: any) => m.status === "PENDING");
            const activeMembers = group.members.filter((m: any) => m.status === "ACTIVE" || m.status === "HOST");

            return (
              <div key={group.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/50">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-bold text-xl text-gray-900 dark:text-white">{group.name}</h3>
                      {isHost && (
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">HOST</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Mã nhóm: <strong className="font-mono text-gray-900 dark:text-white tracking-widest">{group.groupCode}</strong></span>
                      <span>Thành viên: <strong>{activeMembers.length}</strong></span>
                    </div>
                  </div>
                  {isHost && (
                    <button onClick={() => handleDeleteGroup(group.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="p-5 flex-1">
                  {!isHost && myMembership?.status === "PENDING" && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm font-medium text-center mb-4 border border-blue-200 dark:border-blue-800">
                      Yêu cầu tham gia của bạn đang chờ Host duyệt.
                    </div>
                  )}

                  {isHost && pendingMembers.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                        <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                        Chờ duyệt ({pendingMembers.length})
                      </h4>
                      <div className="space-y-2">
                        {pendingMembers.map((pm: any) => (
                          <div key={pm.id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{pm.nickname}</span>
                            <div className="flex space-x-2">
                              <button onClick={() => handleApprove(group.id, pm.id)} className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors" title="Duyệt">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleReject(group.id, pm.id)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors" title="Từ chối">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                      Thành viên ({activeMembers.length})
                    </h4>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {activeMembers.map((member: any) => (
                        <div key={member.id} className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-200 dark:from-indigo-900 dark:to-blue-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs mr-3">
                            {(member.nickname ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                              {member.nickname}
                              {member.status === "HOST" && <span className="ml-2 text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-bold">HOST</span>}
                            </p>
                          </div>
                          {isHost && member.status !== "HOST" && (
                            <button onClick={() => handleRemoveMember(group.id, member.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Xóa khỏi nhóm">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
