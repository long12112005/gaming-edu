"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Info,
  ChevronRight,
  RefreshCw,
  X,
  AlertTriangle,
  Edit3,
  Gamepad2,
  BookOpen,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";

export interface GroupItem {
  id: string;
  name: string;
  description?: string | null;
  groupCode: string;
  status: "ACTIVE" | "DISBANDED";
  hostNickname: string;
  memberCount: number;
  createdAt: string;
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

  // Copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: "danger" | "warning";
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "Xác nhận",
    variant: "danger",
    onConfirm: async () => {},
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
      console.error("Lỗi khi tải danh sách nhóm:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !Cookies.get("token")) {
      router.push("/login");
      return;
    }
    fetchGroups();
  }, [isAuthenticated, router, fetchGroups]);

  const copyToClipboard = (code: string) => {
    if (!code || code === "HIDDEN") return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setErrorMsg("Vui lòng nhập tên nhóm.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await api.post("/groups", {
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
      });

      if (res.data?.success) {
        setSuccessMsg(`Nhóm đã được tạo thành công! Mã tham gia: ${res.data.data.groupCode}`);
        setCreateForm({ name: "", description: "" });
        setShowCreateModal(false);
        await fetchGroups();
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMsg(errorObj.response?.data?.message || "Không thể tạo nhóm. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || joinCode.trim().length !== 6) {
      setErrorMsg("Mã nhóm phải gồm đúng 6 ký tự số.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await api.post("/groups/join", {
        groupCode: joinCode.trim(),
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.message || "Yêu cầu gia nhập đã được gửi tới chủ phòng và đang chờ duyệt.");
        setJoinCode("");
        setShowJoinModal(false);
        await fetchGroups();
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMsg(errorObj.response?.data?.message || "Mã nhóm không hợp lệ hoặc nhóm không tồn tại.");
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

  const displayGroups =
    activeTab === "hosted" ? hostedGroups : activeTab === "joined" ? joinedGroups : groups;

  return (
    <div className="min-h-screen text-[#1B2A2E] font-serif flex flex-col relative">
      {/* Background tiên môn huyền ảo */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-misty-white.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />
      <div className="fixed inset-0 z-0 bg-[#f4f9f7]/70 backdrop-blur-[2px]" />

      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto w-full relative z-10 space-y-8 font-sans">
        {/* Header Section */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-[32px] p-6 md:p-8 shadow-[0_16px_40px_rgba(8,38,42,0.1)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
              <Users size={14} className="text-emerald-600" /> Không Gian Học Tập
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#08282e] tracking-tight">
              Quản Lý Nhóm & Lớp Học
            </h1>
            <p className="text-teal-800/80 text-sm md:text-base mt-1 max-w-xl">
              Tạo phòng học tập, mời học viên tham gia bằng mã số bí mật 6 chữ số và quản lý danh sách thành viên dễ dàng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setErrorMsg("");
                setShowJoinModal(true);
              }}
              className="px-5 py-3 rounded-2xl bg-white/80 hover:bg-white text-teal-900 border border-teal-300/60 font-bold text-sm shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <LogIn size={18} className="text-teal-700" />
              <span>Gia Nhập Bằng Mã</span>
            </button>

            <button
              onClick={() => {
                setErrorMsg("");
                setShowCreateModal(true);
              }}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-[0_6px_20px_rgba(13,148,136,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Tạo Nhóm Mới</span>
            </button>
          </div>
        </div>

        {/* Thông báo thành công */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-900 text-sm font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check size={18} className="text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-700 hover:text-emerald-900">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab Bộ Lọc */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-2 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 shadow-sm">
            {[
              { id: "all", label: `Tất cả (${groups.length})` },
              { id: "hosted", label: `Nhóm tôi làm Host (${hostedGroups.length})` },
              { id: "joined", label: `Nhóm tham gia (${joinedGroups.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "all" | "hosted" | "joined")}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm"
                    : "text-teal-900/70 hover:text-teal-950 hover:bg-white/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchGroups}
            className="p-2.5 rounded-xl bg-white/60 hover:bg-white border border-teal-200/50 text-teal-800 transition-colors shadow-sm"
            title="Làm mới danh sách"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Danh Sách Thẻ Nhóm */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 bg-white/60 backdrop-blur-xl rounded-[28px] border border-white/80 animate-pulse p-6"
              />
            ))}
          </div>
        ) : displayGroups.length === 0 ? (
          <div className="bg-white/65 backdrop-blur-xl rounded-[32px] border-2 border-dashed border-teal-300/50 p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-20 h-20 bg-teal-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-teal-300/40">
              <Users size={36} className="text-teal-700" />
            </div>
            <h3 className="text-xl font-bold font-serif text-[#08282e] mb-2">Chưa có nhóm nào</h3>
            <p className="text-teal-800/80 text-sm mb-6">
              Bạn chưa tham gia hoặc làm chủ nhóm học tập nào. Hãy tạo một nhóm mới hoặc nhập mã để bắt đầu gắn kết cùng mọi người!
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md transition-all"
              >
                Tạo Nhóm Mới
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-teal-50 text-teal-900 border border-teal-200 font-bold text-sm transition-all"
              >
                Gia Nhập Bằng Mã
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayGroups.map((group) => {
              const userIsHost = isHost(group);
              return (
                <div
                  key={group.id}
                  className="bg-white/70 backdrop-blur-xl rounded-[28px] border border-white/90 p-6 shadow-[0_10px_30px_rgba(8,38,42,0.06)] hover:shadow-[0_16px_40px_rgba(8,38,42,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header Thẻ: Host Badge & Thành viên */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {userIsHost ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-900 text-xs font-bold">
                          <Shield size={12} className="text-amber-600" /> Bạn là Host
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-teal-900 text-xs font-semibold">
                          Host: {group.hostNickname}
                        </span>
                      )}

                      <span className="text-xs font-bold text-teal-800/70 flex items-center gap-1">
                        <Users size={14} />
                        {group.memberCount} thành viên
                      </span>
                    </div>

                    {/* Tên nhóm & Mô tả */}
                    <h3 className="text-xl font-bold font-serif text-[#08282e] group-hover:text-teal-800 transition-colors line-clamp-1 mb-2">
                      {group.name}
                    </h3>
                    <p className="text-xs text-teal-900/70 line-clamp-2 min-h-[32px] mb-4">
                      {group.description || "Không gian giao lưu học tập và thi đua điểm số."}
                    </p>

                    {/* Mã Group Code (nếu là host) */}
                    {userIsHost && group.groupCode !== "HIDDEN" && (
                      <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent rounded-2xl border border-teal-300/30 flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800/70">Mã Nhóm (6 Ký Tự)</p>
                          <p className="font-mono text-lg font-black text-teal-950 tracking-wider">
                            {group.groupCode}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(group.groupCode)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                          title="Sao chép mã nhóm"
                        >
                          {copiedCode === group.groupCode ? (
                            <>
                              <Check size={14} className="text-emerald-600" />
                              <span className="text-emerald-700">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions Chân Thẻ */}
                  <div className="pt-4 border-t border-teal-300/20 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openGroupDetails(group)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Xem Thành Viên</span>
                      <ChevronRight size={14} />
                    </button>

                    {userIsHost && (
                      <>
                        <button
                          onClick={() => openOrganizeGroup(group)}
                          className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                          title="Tổ chức phòng chơi cho nhóm"
                        >
                          <Gamepad2 size={16} />
                        </button>
                        <button
                          onClick={() => openEditGroup(group)}
                          className="p-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 transition-colors"
                          title="Chỉnh sửa thông tin nhóm"
                        >
                          <Edit3 size={16} />
                        </button>
                      </>
                    )}

                    {userIsHost ? (
                      <button
                        onClick={() => handleDisbandGroup(group)}
                        className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                        title="Giải tán nhóm"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLeaveGroup(group)}
                        className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                        title="Rời nhóm"
                      >
                        <LogOut size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── MODAL: TẠO NHÓM MỚI ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[32px] max-w-lg w-full p-8 shadow-[0_25px_60px_rgba(8,38,42,0.25)] font-sans relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-700 mb-5">
              <Plus size={28} />
            </div>

            <h2 className="text-2xl font-bold font-serif text-[#08282e] mb-1">Tạo Không Gian Nhóm Mới</h2>
            <p className="text-teal-800/70 text-sm mb-6">
              Hệ thống sẽ tự động cấp một mã số 6 chữ số để bạn chia sẻ cho học sinh và bạn bè.
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/15 border border-red-400/40 text-red-700 text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider mb-1.5">
                  Tên Nhóm / Lớp Học *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Ôn Thi Toán Học 12A1"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
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
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-teal-200 rounded-2xl text-teal-950 font-semibold focus:border-teal-600 outline-none transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm shadow-md transition-all disabled:opacity-60"
                >
                  {submitting ? "Đang Khởi Tạo..." : "Xác Nhận Tạo Nhóm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: GIA NHẬP BẰNG MÃ ── */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[32px] max-w-md w-full p-8 shadow-[0_25px_60px_rgba(8,38,42,0.25)] font-sans relative">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-teal-700 mb-5">
              <LogIn size={28} />
            </div>

            <h2 className="text-2xl font-bold font-serif text-[#08282e] mb-1">Gia Nhập Không Gian Nhóm</h2>
            <p className="text-teal-800/70 text-sm mb-6">
              Nhập mã nhóm gồm 6 chữ số được Host cung cấp. Yêu cầu của bạn sẽ được chuyển tới Host để phê duyệt.
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/15 border border-red-400/40 text-red-700 text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider mb-1.5 text-center">
                  Nhập Mã Nhóm (6 Chữ Số)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-4 bg-white border-2 border-teal-200 rounded-2xl text-teal-950 font-mono text-center tracking-[0.4em] text-3xl font-black focus:border-teal-600 outline-none transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-sm shadow-md transition-all disabled:opacity-60"
                >
                  {submitting ? "Đang Gửi..." : "Gửi Yêu Cầu Gia Nhập"}
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
    </div>
  );
}
