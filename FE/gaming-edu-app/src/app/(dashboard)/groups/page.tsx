"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  Users,
  Plus,
  LogIn,
  Copy,
  Check,
  Shield,
  UserCheck,
  UserX,
  LogOut,
  Trash2,
  Clock,
  Sparkles,
  ChevronRight,
  RefreshCw,
  X,
  AlertTriangle,
  Edit3,
  Gamepad2,
  BookOpen,
  Layers,
  Lock,
  Play,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";

export interface GroupItem {
  id: string;
  name: string;
  description?: string | null;
  groupCode: string;
  status: "ACTIVE" | "DISBANDED";
  hostNickname: string;
  memberCount: number;
  createdAt: string;
  isHost?: boolean;
}

export interface GroupMemberItem {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  joinedAt: string;
}

export interface QuizOptionItem {
  id: string;
  title: string;
  slideCount?: number;
  coverImage?: string;
}

export default function GroupsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "hosted" | "joined">("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Edit Group Modal
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  // Organize Room for Group Modal
  const [organizeGroup, setOrganizeGroup] = useState<GroupItem | null>(null);
  const [hostQuizzes, setHostQuizzes] = useState<QuizOptionItem[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [selectedRoomMode, setSelectedRoomMode] = useState<"HOST_PACED" | "PLAYER_PACED" | "ASYNC_TOURNAMENT">("HOST_PACED");
  const [launchingRoom, setLaunchingRoom] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: "danger" | "warning";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "",
    variant: "danger",
    onConfirm: () => {},
  });

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/groups");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setGroups(res.data.data);
      } else if (Array.isArray(res.data)) {
        setGroups(res.data);
      }
    } catch (err: unknown) {
      console.warn("Lỗi khi tải danh sách nhóm:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !Cookies.get("token")) {
      router.push("/auth");
      return;
    }
    fetchGroups();
  }, [isAuthenticated, router, fetchGroups]);

  const copyGroupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await api.post("/groups", createForm);
      if (res.data?.success) {
        setShowCreateModal(false);
        setCreateForm({ name: "", description: "" });
        setSuccessMsg("Tạo nhóm mới thành công!");
        fetchGroups();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Không thể tạo nhóm.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await api.post("/groups/join", { groupCode: joinCode.trim() });
      if (res.data?.success) {
        setShowJoinModal(false);
        setJoinCode("");
        setSuccessMsg("Đã gửi yêu cầu tham gia nhóm thành công!");
        fetchGroups();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Mã nhóm không hợp lệ hoặc bạn đã ở trong nhóm.");
    } finally {
      setSubmitting(false);
    }
  };

  // 2.4 Chỉnh sửa Tên & Mô tả Nhóm
  const openEditGroup = (group: GroupItem) => {
    setEditingGroup(group);
    setEditForm({
      name: group.name,
      description: group.description || "",
    });
    setErrorMsg("");
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    if (!editForm.name.trim()) {
      setErrorMsg("Vui lòng nhập tên nhóm.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await api.put(`/groups/${editingGroup.id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
      });

      if (res.data?.success || res.status === 200) {
        setSuccessMsg("Cập nhật thông tin nhóm thành công!");
        setEditingGroup(null);
        if (selectedGroup && selectedGroup.id === editingGroup.id) {
          setSelectedGroup((prev) =>
            prev
              ? {
                  ...prev,
                  name: editForm.name.trim(),
                  description: editForm.description.trim(),
                }
              : null
          );
        }
        await fetchGroups();
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMsg(errorObj.response?.data?.message || "Không thể cập nhật thông tin nhóm.");
    } finally {
      setSubmitting(false);
    }
  };

  // 4.2 Tổ chức phòng chơi cho nhóm (Private Mode)
  const openOrganizeGroup = async (group: GroupItem) => {
    setOrganizeGroup(group);
    setLoadingQuizzes(true);
    setErrorMsg("");
    try {
      let quizList: QuizOptionItem[] = [];
      try {
        const resMine = await api.get("/quizzes/mine");
        if (resMine.data?.success && Array.isArray(resMine.data.data)) {
          quizList = resMine.data.data;
        } else if (Array.isArray(resMine.data)) {
          quizList = resMine.data;
        }
      } catch {
        const resAll = await api.get("/quizzes");
        if (resAll.data?.success && Array.isArray(resAll.data.data)) {
          quizList = resAll.data.data;
        } else if (Array.isArray(resAll.data)) {
          quizList = resAll.data;
        }
      }
      setHostQuizzes(quizList);
      if (quizList.length > 0) {
        setSelectedQuizId(quizList[0].id);
      }
    } catch (err) {
      console.error("Lỗi tải bộ đề:", err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const handleLaunchGroupRoom = async () => {
    if (!organizeGroup) return;
    if (!selectedQuizId) {
      setErrorMsg("Vui lòng chọn một bộ câu hỏi để mở phòng chơi.");
      return;
    }

    try {
      setLaunchingRoom(true);
      setErrorMsg("");

      // 1. Khởi tạo phòng chơi
      const roomRes = await api.post("/rooms", {
        quizId: selectedQuizId,
        mode: selectedRoomMode,
      });

      const roomId = roomRes.data?.data?.id || roomRes.data?.id;
      if (!roomId) throw new Error("Không thể khởi tạo phòng chơi.");

      // 2. Bắn tín hiệu NotificationHub mời toàn bộ thành viên trong nhóm
      try {
        await api.post(`/rooms/${roomId}/invite-group/${organizeGroup.id}`);
      } catch (inviteErr) {
        console.warn("Không thể gửi thông báo mời nhóm:", inviteErr);
      }

      setOrganizeGroup(null);
      // 3. Điều hướng Host tới phòng điều khiển
      router.push(`/host/${roomId}`);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMsg(errorObj.response?.data?.message || "Khởi tạo phòng chơi thất bại.");
      setLaunchingRoom(false);
    }
  };

  const fetchMembers = async (groupId: string) => {
    try {
      setLoadingMembers(true);
      const res = await api.get(`/groups/${groupId}/members`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setMembers(res.data.data);
      } else if (Array.isArray(res.data)) {
        setMembers(res.data);
      }
    } catch (err: unknown) {
      console.error("Lỗi khi tải thành viên:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const openGroupDetails = (group: GroupItem) => {
    setSelectedGroup(group);
    fetchMembers(group.id);
  };

  const handleRespondJoin = async (memberId: string, isApproved: boolean) => {
    if (!selectedGroup) return;
    try {
      await api.put(`/groups/${selectedGroup.id}/members/${memberId}`, { isApproved });
      await fetchMembers(selectedGroup.id);
      await fetchGroups();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      alert(errorObj.response?.data?.message || "Thao tác thất bại.");
    }
  };

  const handleKickMember = (member: GroupMemberItem) => {
    if (!selectedGroup) return;
    setConfirmDialog({
      isOpen: true,
      title: "Loại Thành Viên",
      description: `Bạn có chắc chắn muốn loại "${member.nickname}" khỏi nhóm "${selectedGroup.name}"?`,
      confirmText: "Loại khỏi nhóm",
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.delete(`/groups/${selectedGroup.id}/members/${member.id}`);
          await fetchMembers(selectedGroup.id);
          await fetchGroups();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: unknown) {
          const errorObj = err as { response?: { data?: { message?: string } } };
          alert(errorObj.response?.data?.message || "Không thể xóa thành viên.");
        }
      },
    });
  };

  const handleDisbandGroup = (group: GroupItem) => {
    setConfirmDialog({
      isOpen: true,
      title: "Giải Tán Nhóm",
      description: `CẢNH BÁO: Nhóm "${group.name}" sẽ bị xóa vĩnh viễn và toàn bộ thành viên sẽ bị giải tán. Thao tác này không thể hoàn tác!`,
      confirmText: "Giải tán nhóm vĩnh viễn",
      variant: "danger",
      onConfirm: async () => {
        try {
          await api.delete(`/groups/${group.id}`);
          setSelectedGroup(null);
          await fetchGroups();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: unknown) {
          const errorObj = err as { response?: { data?: { message?: string } } };
          alert(errorObj.response?.data?.message || "Không thể giải tán nhóm.");
        }
      },
    });
  };

  const handleLeaveGroup = (group: GroupItem) => {
    setConfirmDialog({
      isOpen: true,
      title: "Rời Khỏi Nhóm",
      description: `Bạn có chắc chắn muốn rời khỏi nhóm "${group.name}"? Bạn sẽ cần nhập lại mã mời để gia nhập sau này.`,
      confirmText: "Rời nhóm",
      variant: "warning",
      onConfirm: async () => {
        try {
          // Gửi request rời nhóm (BE hỗ trợ POST /groups/{id}/leave và DELETE /groups/{id}/leave)
          await api.post(`/groups/${group.id}/leave`).catch(async () => {
            await api.delete(`/groups/${group.id}/leave`);
          });
          setSelectedGroup(null);
          await fetchGroups();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: unknown) {
          const errorObj = err as { response?: { data?: { message?: string } } };
          alert(errorObj.response?.data?.message || "Rời nhóm thất bại.");
        }
      },
    });
  };

  // Lọc nhóm: User là host nếu groupCode khác "HIDDEN" hoặc hostNickname trùng user.nickname
  const isHost = (group: GroupItem) => group.groupCode !== "HIDDEN" || (user?.nickname && group.hostNickname === user.nickname);
  const hostedGroups = groups.filter(isHost);
  const joinedGroups = groups.filter((g) => !isHost(g));

  const filteredGroups =
    activeTab === "hosted" ? hostedGroups : activeTab === "joined" ? joinedGroups : groups;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* HEADER & ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 mb-2">
              <Users size={14} />
              <span>Không Gian Học Tập Nhóm</span>
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-900">
              Danh Sách Không Gian Nhóm
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Quản lý lớp học, chia sẻ bộ đề riêng tư và tổ chức thi đấu nội bộ.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <LogIn size={15} />
              <span>Gia Nhập Bằng Mã</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5 active:translate-y-0.5"
            >
              <Plus size={16} />
              <span>Tạo Nhóm Mới</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK ALERT */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check size={18} />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-900">
              <X size={16} />
            </button>
          </div>
        )}

        {/* TABS */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { id: "all", label: "Tất cả nhóm" },
            { id: "hosted", label: "Nhóm tôi quản lý" },
            { id: "joined", label: "Nhóm tôi tham gia" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* BENTO GROUPS GRID */}
        {loading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">Đang tải danh sách nhóm...</p>
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGroups.map((group) => {
              const isOwner = group.hostNickname === user?.nickname;
              const userIsHost = isHost(group);
              return (
                <div
                  key={group.id}
                  className="bento-card p-6 flex flex-col justify-between group hover:border-indigo-300 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                        <Users size={20} />
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isOwner
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isOwner ? "Chủ Nhóm" : "Thành Viên"}
                      </span>
                    </div>

                    <h3 className="font-heading font-black text-lg text-slate-900 group-hover:text-indigo-600 transition-colors mb-1.5">
                      {group.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                      {group.description || "Không gian giao lưu học tập và thi đua GameEdu."}
                    </p>

                    {/* Group Code Pill */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between mb-4">
                      <div className="text-[11px] font-semibold text-slate-500">
                        Mã Mời:{" "}
                        <span className="font-mono font-bold text-indigo-700 ml-1">
                          {group.groupCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyGroupCode(group.groupCode)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Sao chép mã"
                      >
                        {copiedCode === group.groupCode ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <Users size={14} className="text-slate-400" />
                      <span>{group.memberCount || 1} thành viên</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {userIsHost && (
                        <>
                          <button
                            onClick={() => openOrganizeGroup(group)}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                            title="Tổ chức phòng chơi cho nhóm"
                          >
                            <Gamepad2 size={15} />
                          </button>
                          <button
                            onClick={() => openEditGroup(group)}
                            className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 transition-colors"
                            title="Chỉnh sửa thông tin nhóm"
                          >
                            <Edit3 size={15} />
                          </button>
                        </>
                      )}

                      {userIsHost ? (
                        <button
                          onClick={() => handleDisbandGroup(group)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                          title="Giải tán nhóm"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLeaveGroup(group)}
                          className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                          title="Rời nhóm"
                        >
                          <LogOut size={15} />
                        </button>
                      )}

                      <Link
                        href={`/groups/${group.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <span>Vào Nhóm</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Users size={32} />
            </div>
            <h3 className="font-heading font-black text-lg text-slate-800 mb-1">
              Chưa có nhóm nào trong mục này
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              Bạn có thể tự tạo nhóm mới cho lớp học của mình hoặc dùng mã mời từ giáo viên để gia nhập.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Tạo Nhóm Mới
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
              >
                Gia Nhập Bằng Mã
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL TẠO NHÓM */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-black text-xl text-slate-900">Tạo Không Gian Nhóm Mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">{errorMsg}</div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tên Nhóm / Lớp Học</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Lớp 10A1 – Toán Học"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mô Tả Ngắn</label>
                <textarea
                  rows={3}
                  placeholder="Không gian ôn tập và thi đấu trắc nghiệm hàng tuần..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                >
                  {submitting ? "Đang tạo..." : "Xác Nhận Tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GIA NHẬP NHÓM BẰNG MÃ */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-black text-xl text-slate-900">Gia Nhập Nhóm</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleJoinGroup} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">{errorMsg}</div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mã Nhóm (Invite Code)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: GRP-8921"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center font-mono font-bold outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                >
                  {submitting ? "Đang gửi..." : "Gia Nhập"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CHI TIẾT & QUẢN LÝ THÀNH VIÊN NHÓM ── */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[32px] max-w-2xl w-full p-6 md:p-8 shadow-[0_25px_60px_rgba(8,38,42,0.25)] font-sans relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedGroup(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header Modal */}
            <div className="mb-6 pb-4 border-b border-teal-200/50">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-800 text-xs font-bold">
                    {isHost(selectedGroup) ? "Bạn là Host" : `Host: ${selectedGroup.hostNickname}`}
                  </span>
                  {isHost(selectedGroup) && selectedGroup.groupCode !== "HIDDEN" && (
                    <span className="font-mono text-xs font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      Code: {selectedGroup.groupCode}
                    </span>
                  )}
                </div>

                {isHost(selectedGroup) && (
                  <div className="flex items-center gap-2 mr-8">
                    <button
                      onClick={() => openEditGroup(selectedGroup)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-xs font-bold transition-all flex items-center gap-1"
                      title="Chỉnh sửa thông tin nhóm"
                    >
                      <Edit3 size={13} />
                      <span>Sửa Nhóm</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedGroup(null);
                        openOrganizeGroup(selectedGroup);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                      title="Mở phòng thi đấu cho nhóm"
                    >
                      <Gamepad2 size={13} />
                      <span>Tổ Chức Chơi</span>
                    </button>
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-bold font-serif text-[#08282e]">{selectedGroup.name}</h2>
              {selectedGroup.description && (
                <p className="text-teal-800/70 text-xs mt-1">{selectedGroup.description}</p>
              )}
            </div>

            {/* Nội dung danh sách thành viên */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {loadingMembers ? (
                <div className="py-12 flex flex-col items-center justify-center text-teal-700">
                  <RefreshCw size={24} className="animate-spin mb-2" />
                  <span className="text-sm font-semibold">Đang tải danh sách thành viên...</span>
                </div>
              ) : (
                <>
                  {/* Danh sách chờ duyệt (Chỉ Host thấy) */}
                  {isHost(selectedGroup) && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-3 flex items-center gap-1.5">
                        <Clock size={14} className="text-amber-600" />
                        Yêu Cầu Chờ Duyệt ({members.filter((m) => m.status === "PENDING").length})
                      </h4>
                      {members.filter((m) => m.status === "PENDING").length === 0 ? (
                        <p className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded-xl">
                          Không có yêu cầu nào đang chờ duyệt.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {members
                            .filter((m) => m.status === "PENDING")
                            .map((member) => (
                              <div
                                key={member.id}
                                className="p-3.5 bg-amber-500/10 border border-amber-300/40 rounded-2xl flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-amber-200 border border-amber-300 flex items-center justify-center font-bold text-amber-800 text-sm">
                                    {member.nickname.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-teal-950 text-sm">{member.nickname}</p>
                                    <p className="text-[11px] text-teal-800/60">
                                      Xin gia nhập lúc {new Date(member.joinedAt).toLocaleDateString("vi-VN")}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleRespondJoin(member.id, true)}
                                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                                    title="Chấp nhận"
                                  >
                                    <UserCheck size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleRespondJoin(member.id, false)}
                                    className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-600 transition-colors"
                                    title="Từ chối"
                                  >
                                    <UserX size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Danh sách thành viên chính thức */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-3 flex items-center gap-1.5">
                      <Users size={14} className="text-teal-600" />
                      Thành Viên Chính Thức ({members.filter((m) => m.status === "ACTIVE").length})
                    </h4>
                    {members.filter((m) => m.status === "ACTIVE").length === 0 ? (
                      <p className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded-xl">
                        Chưa có thành viên nào khác trong nhóm.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {members
                          .filter((m) => m.status === "ACTIVE")
                          .map((member) => (
                            <div
                              key={member.id}
                              className="p-3 bg-white border border-teal-200/60 rounded-2xl flex items-center justify-between gap-3 shadow-sm hover:border-teal-400 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-teal-100 border border-teal-300 flex items-center justify-center font-bold text-teal-800 text-sm">
                                  {member.nickname.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-teal-950 text-sm">{member.nickname}</p>
                                  <p className="text-[11px] text-teal-800/60">
                                    Tham gia từ {new Date(member.joinedAt).toLocaleDateString("vi-VN")}
                                  </p>
                                </div>
                              </div>

                              {/* Nút loại thành viên (Nếu user là Host) */}
                              {isHost(selectedGroup) && (
                                <button
                                  onClick={() => handleKickMember(member)}
                                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                                  title="Loại khỏi nhóm"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CHỈNH SỬA THÔNG TIN NHÓM (MỤC 2.4) ── */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[32px] max-w-lg w-full p-8 shadow-[0_25px_60px_rgba(8,38,42,0.25)] font-sans relative">
            <button
              onClick={() => setEditingGroup(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-700 mb-5">
              <Edit3 size={28} />
            </div>

            <h2 className="text-2xl font-bold font-serif text-[#08282e] mb-1">Chỉnh Sửa Thông Tin Nhóm</h2>
            <p className="text-teal-800/70 text-sm mb-6">
              Cập nhật lại tên và mục tiêu hoạt động của nhóm học tập này.
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/15 border border-red-400/40 text-red-700 text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider mb-1.5">
                  Tên Nhóm / Lớp Học *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Ôn Thi Toán Học 12A1"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-teal-200 rounded-2xl text-teal-950 font-semibold focus:border-teal-600 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider mb-1.5">
                  Mô Tả Nhóm (Tùy chọn)
                </label>
                <textarea
                  rows={3}
                  placeholder="Giới thiệu mục tiêu nhóm, lịch sinh hoạt học tập..."
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-teal-200 rounded-2xl text-teal-950 font-semibold focus:border-teal-600 outline-none transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 text-white font-bold text-sm shadow-md transition-all disabled:opacity-60"
                >
                  {submitting ? "Đang Lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TỔ CHỨC PHÒNG CHƠI CHO NHÓM (MỤC 4.2) ── */}
      {organizeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[32px] max-w-xl w-full p-6 md:p-8 shadow-[0_25px_60px_rgba(8,38,42,0.25)] font-sans relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setOrganizeGroup(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-700 mb-4">
              <Gamepad2 size={28} />
            </div>

            <h2 className="text-2xl font-bold font-serif text-[#08282e] mb-1">
              Tổ Chức Phòng Chơi Cho Nhóm
            </h2>
            <p className="text-teal-800/70 text-xs md:text-sm mb-4">
              Khởi tạo phòng chơi và tự động gửi thông báo tức thời tới toàn bộ thành viên của nhóm{" "}
              <strong className="text-teal-950 font-bold">"{organizeGroup.name}"</strong>.
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/15 border border-red-400/40 text-red-700 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Chọn Bộ Đề */}
              <div>
                <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-teal-600" />
                  Chọn Bộ Câu Hỏi ({hostQuizzes.length})
                </label>

                {loadingQuizzes ? (
                  <div className="py-8 flex flex-col items-center justify-center text-teal-700">
                    <RefreshCw size={20} className="animate-spin mb-2" />
                    <span className="text-xs font-semibold">Đang tải danh sách bộ câu hỏi...</span>
                  </div>
                ) : hostQuizzes.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                    <p className="text-xs text-amber-900 mb-2">Bạn chưa có bộ câu hỏi nào trong Thư viện cá nhân.</p>
                    <button
                      onClick={() => router.push("/quiz/create")}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      Tạo Bộ Đề Mới Ngay
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {hostQuizzes.map((quiz) => {
                      const isSelected = selectedQuizId === quiz.id;
                      return (
                        <div
                          key={quiz.id}
                          onClick={() => setSelectedQuizId(quiz.id)}
                          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-teal-500/15 border-teal-600 text-teal-950 shadow-sm"
                              : "bg-white border-teal-200/60 hover:border-teal-400 text-teal-900"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center font-bold text-teal-700 text-sm">
                              <BookOpen size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-sm line-clamp-1">{quiz.title}</p>
                              <p className="text-[11px] text-teal-800/60 flex items-center gap-1">
                                <Layers size={11} /> {quiz.slideCount || 0} câu hỏi
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chọn Chế Độ Vận Hành */}
              <div>
                <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider mb-2">
                  Chế Độ Vận Hành Phòng
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "HOST_PACED", title: "Phòng Thường", desc: "Host chủ động chuyển câu" },
                    { id: "PLAYER_PACED", title: "Tự Động", desc: "Học sinh tự làm bài" },
                    { id: "ASYNC_TOURNAMENT", title: "Giải Đấu", desc: "Async timer độc lập" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSelectedRoomMode(mode.id as any)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all ${
                        selectedRoomMode === mode.id
                          ? "bg-emerald-500/15 border-emerald-600 text-emerald-950 shadow-sm"
                          : "bg-white border-teal-200/60 hover:border-teal-300 text-teal-900"
                      }`}
                    >
                      <p className="font-bold text-xs">{mode.title}</p>
                      <p className="text-[10px] text-teal-800/70 mt-0.5">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-teal-200/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOrganizeGroup(null)}
                className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleLaunchGroupRoom}
                disabled={launchingRoom || !selectedQuizId}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm shadow-md transition-all disabled:opacity-60 flex items-center gap-2"
              >
                <Gamepad2 size={16} />
                <span>{launchingRoom ? "Đang Mở Phòng..." : "Mở Phòng & Mời Cả Nhóm"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DIALOG CHUYÊN NGHIỆP ── */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[32px] max-w-md w-full p-6 md:p-8 shadow-[0_25px_60px_rgba(8,38,42,0.3)] font-sans">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-600 mb-5">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-2xl font-bold font-serif text-[#08282e] mb-2">{confirmDialog.title}</h3>
            <p className="text-teal-900/80 text-sm mb-6 leading-relaxed">{confirmDialog.description}</p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-all active:scale-95 ${
                  confirmDialog.variant === "danger"
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-amber-600 hover:bg-amber-500"
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
