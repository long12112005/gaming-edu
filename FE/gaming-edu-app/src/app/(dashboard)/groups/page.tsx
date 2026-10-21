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

export default function GroupsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "hosted" | "joined">("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

                    <Link
                      href={`/groups/${group.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <span>Vào Nhóm</span>
                      <ChevronRight size={14} />
                    </Link>
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

      <Footer />
    </div>
  );
}
