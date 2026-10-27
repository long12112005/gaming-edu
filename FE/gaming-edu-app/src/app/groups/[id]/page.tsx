"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  Users,
  Shield,
  Copy,
  Check,
  UserCheck,
  UserX,
  Lock,
  Play,
  ArrowLeft,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Gamepad2,
  BookOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import CreateRoomModal from "@/components/modals/CreateRoomModal";

interface MemberItem {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string | null;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  joinedAt: string;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const { user, isAuthenticated } = useAuthStore();

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"members" | "pending" | "quizzes">("members");
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Private Room Modal
  const [isPrivateRoomModalOpen, setIsPrivateRoomModalOpen] = useState(false);

  const fetchGroupDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [gRes, mRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/groups/${groupId}/members`).catch(() => ({ data: { data: [] } })),
      ]);

      if (gRes.data?.data) {
        setGroup(gRes.data.data);
      }
      if (mRes.data?.data && Array.isArray(mRes.data.data)) {
        setMembers(mRes.data.data);
      }
    } catch (err: any) {
      setToastMsg({ text: "Không thể tải thông tin nhóm.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!isAuthenticated && !Cookies.get("token")) {
      router.push("/auth");
      return;
    }
    fetchGroupDetails();
  }, [isAuthenticated, router, fetchGroupDetails]);

  const isOwner = group?.hostNickname === user?.nickname;

  const handleCopyCode = () => {
    if (group?.groupCode) {
      navigator.clipboard.writeText(group.groupCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleApprove = async (memberId: string) => {
    try {
      await api.put(`/groups/${groupId}/members/${memberId}/approve`);
      setToastMsg({ text: "Đã duyệt thành viên thành công!", type: "success" });
      fetchGroupDetails();
    } catch (e: any) {
      setToastMsg({ text: e.response?.data?.message || "Duyệt thất bại.", type: "error" });
    }
  };

  const handleReject = async (memberId: string) => {
    try {
      await api.put(`/groups/${groupId}/members/${memberId}/reject`);
      setToastMsg({ text: "Đã từ chối yêu cầu gia nhập.", type: "success" });
      fetchGroupDetails();
    } catch (e: any) {
      setToastMsg({ text: e.response?.data?.message || "Từ chối thất bại.", type: "error" });
    }
  };

  const handleKick = async (memberId: string) => {
    if (!confirm("Bạn chắc chắn muốn kích thành viên này ra khỏi nhóm?")) return;
    try {
      await api.delete(`/groups/${groupId}/members/${memberId}`);
      setToastMsg({ text: "Đã xóa thành viên khỏi nhóm.", type: "success" });
      fetchGroupDetails();
    } catch (e: any) {
      setToastMsg({ text: e.response?.data?.message || "Kích thành viên thất bại.", type: "error" });
    }
  };

  const activeMembers = members.filter((m) => m.status === "ACTIVE");
  const pendingMembers = members.filter((m) => m.status === "PENDING");

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Back Link */}
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách nhóm</span>
        </Link>

        {/* Toast */}
        {toastMsg && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold border animate-in fade-in ${
              toastMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {toastMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* GROUP HEADER BENTO CARD */}
        {group && (
          <div className="bento-card p-6 sm:p-8 mb-8 relative overflow-hidden bg-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                  <Users size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 uppercase">
                      Không Gian Lớp Học
                    </span>
                    {isOwner && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        Chủ Nhóm
                      </span>
                    )}
                  </div>
                  <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-900">
                    {group.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
                    {group.description || "Không gian chia sẻ kiến thức và thi đấu nội bộ cho các thành viên trong nhóm."}
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS: PRIVATE MODE & COPY CODE */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
                {/* 1-Click Copy Code */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors shrink-0"
                >
                  <span className="text-slate-400">Mã:</span>
                  <span className="font-mono text-indigo-700">{group.groupCode}</span>
                  {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>

                {/* Private Mode Host Button */}
                <button
                  type="button"
                  onClick={() => setIsPrivateRoomModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:translate-y-0.5 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all shrink-0"
                >
                  <Lock size={14} />
                  <span>Tạo Phòng Riêng Tư (Private Mode)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TABS: THÀNH VIÊN / CHỜ DUYỆT */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6 pb-2">
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "members"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users size={16} />
            <span>Thành Viên Chính Thức ({activeMembers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 relative ${
              activeTab === "pending"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Clock size={16} />
            <span>Yêu Cầu Chờ Duyệt</span>
            {pendingMembers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                {pendingMembers.length}
              </span>
            )}
          </button>
        </div>

        {/* ── TAB 1: THÀNH VIÊN CHÍNH THỨC ── */}
        {activeTab === "members" && (
          <div className="bento-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Học Viên / Thành Viên</span>
              <span>Ngày Tham Gia & Tác Vụ</span>
            </div>

            <div className="divide-y divide-slate-100">
              {activeMembers.length > 0 ? (
                activeMembers.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm overflow-hidden">
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span>{m.nickname ? m.nickname.charAt(0).toUpperCase() : "U"}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span>{m.nickname}</span>
                          {m.nickname === group?.hostNickname && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-bold">
                              Chủ Nhóm
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">ID: {m.userId.substring(0, 8)}...</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        {new Date(m.joinedAt).toLocaleDateString("vi-VN")}
                      </span>
                      {isOwner && m.nickname !== group?.hostNickname && (
                        <button
                          type="button"
                          onClick={() => handleKick(m.id)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <UserX size={14} />
                          <span>Kích</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 font-bold">
                  Chưa có thành viên nào khác trong nhóm.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: YÊU CẦU CHỜ DUYỆT (PENDING) ── */}
        {activeTab === "pending" && (
          <div className="bento-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Người Yêu Cầu Gia Nhập</span>
              <span>Hành Động Xét Duyệt</span>
            </div>

            <div className="divide-y divide-slate-100">
              {pendingMembers.length > 0 ? (
                pendingMembers.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                        {m.nickname.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{m.nickname}</h4>
                        <span className="text-xs text-slate-400">Đang chờ xét duyệt</span>
                      </div>
                    </div>

                    {isOwner ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(m.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                        >
                          <UserCheck size={14} />
                          <span>Duyệt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(m.id)}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                        >
                          <span>Từ chối</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Chỉ chủ nhóm mới có quyền duyệt</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-xs text-slate-400 font-bold">
                  Không có yêu cầu tham gia nào đang chờ duyệt.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Tạo Phòng Riêng Tư (Private Mode) */}
      <CreateRoomModal
        isOpen={isPrivateRoomModalOpen}
        onClose={() => setIsPrivateRoomModalOpen(false)}
      />

      <Footer />
    </div>
  );
}
