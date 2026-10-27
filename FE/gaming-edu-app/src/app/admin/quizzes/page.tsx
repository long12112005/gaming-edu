"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  BookOpen,
  Search,
  Filter,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Play,
  Layers,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";
import AdminNavHeader from "@/components/admin/AdminNavHeader";

interface AdminQuizItem {
  id: string;
  title: string;
  topic?: string;
  description?: string;
  is_public?: boolean;
  isPublic?: boolean;
  slide_count?: number;
  total_slides?: number;
  play_count?: number;
  creator_nickname?: string;
  created_at?: string;
  cover_image_url?: string;
}

export default function AdminQuizzesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isAdminUser, setIsAdminUser] = useState(false);

  const [quizzes, setQuizzes] = useState<AdminQuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLIC" | "PRIVATE">("ALL");

  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal Xóa Bộ Đề
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    quiz: AdminQuizItem | null;
  }>({
    isOpen: false,
    quiz: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Kiểm tra quyền Admin
  useEffect(() => {
    const token = Cookies.get("token");
    const hasAdminRole = !!(user?.isAdmin || (user as any)?.is_admin);
    setIsAdminUser(!!token && hasAdminRole);
  }, [user, isAuthenticated]);

  // 2. Tải danh sách toàn bộ bộ đề
  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/quizzes");
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list)) {
        setQuizzes(list);
      } else {
        setQuizzes([]);
      }
    } catch (err: unknown) {
      console.warn("Lỗi khi tải danh sách bộ đề cho admin:", err);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Danh sách chủ đề
  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((q) => {
      if (q.topic) set.add(q.topic);
    });
    return Array.from(set);
  }, [quizzes]);

  // Lọc bộ đề
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.topic && q.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.creator_nickname && q.creator_nickname.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTopic =
        selectedTopic === "ALL" ||
        (q.topic && q.topic.toUpperCase() === selectedTopic.toUpperCase());

      const isPublic = q.is_public ?? q.isPublic ?? true;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PUBLIC" && isPublic) ||
        (statusFilter === "PRIVATE" && !isPublic);

      return matchSearch && matchTopic && matchStatus;
    });
  }, [quizzes, searchQuery, selectedTopic, statusFilter]);

  // Xóa bộ đề
  const handleDeleteQuiz = async () => {
    if (!deleteConfirm.quiz) return;
    if (!isAdminUser) {
      setToastMsg({
        text: "Bạn đang ở Chế độ xem trước! Hãy đăng nhập tài khoản Quản trị viên để thực hiện thao tác xóa bộ đề.",
        type: "error",
      });
      setDeleteConfirm({ isOpen: false, quiz: null });
      return;
    }
    try {
      setIsDeleting(true);
      await api.delete(`/quizzes/${deleteConfirm.quiz.id}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== deleteConfirm.quiz?.id));
      setToastMsg({
        text: `Đã xóa bộ đề "${deleteConfirm.quiz.title}" thành công!`,
        type: "success",
      });
      setDeleteConfirm({ isOpen: false, quiz: null });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setToastMsg({
        text: errorObj.response?.data?.message || "Không thể xóa bộ đề này.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full space-y-6">
        {!isAdminUser && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-600 shrink-0" />
              <span>
                Chế độ xem trước giao diện Quản Trị (Admin Preview Mode). Hãy đăng nhập tài khoản có quyền Quản trị viên để thực hiện các thao tác xóa hoặc kiểm duyệt bộ đề.
              </span>
            </div>
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs whitespace-nowrap shadow-xs transition-colors shrink-0"
            >
              Đăng Nhập Admin
            </Link>
          </div>
        )}

        {/* Navigation & Header */}
        <AdminNavHeader
          title="Quản Trị Bộ Đề & Trò Chơi"
          subtitle="Kiểm duyệt nội dung câu hỏi, theo dõi lượt chơi cộng đồng và xử lý các bộ đề vi phạm bản quyền hoặc chuẩn mực học tập."
          badge="Quản Lý Nội Dung"
          actionButton={
            <Link
              href="/quiz/create"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-heading font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Tạo Bộ Đề Mới</span>
            </Link>
          }
        />

        {/* Toast thông báo */}
        {toastMsg && (
          <div
            className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in ${
              toastMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-600" />
              ) : (
                <AlertCircle size={18} className="text-rose-600" />
              )}
              <span>{toastMsg.text}</span>
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── BỘ LỌC & TÌM KIẾM ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, chủ đề hoặc tên người tạo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Lọc theo chủ đề */}
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Chủ đề: Tất cả</option>
              {availableTopics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>

            {/* Lọc theo trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Chế độ: Tất cả</option>
              <option value="PUBLIC">Công khai (Public)</option>
              <option value="PRIVATE">Riêng tư (Private)</option>
            </select>

            <button
              onClick={fetchQuizzes}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors shrink-0 cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── BẢNG DANH SÁCH BỘ ĐỀ ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-14 text-center text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw size={32} className="animate-spin mb-3 text-indigo-600" />
              <p className="font-bold text-sm">Đang tải danh sách bộ đề...</p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="p-14 text-center text-slate-400">
              <BookOpen size={44} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-base text-slate-700">Không tìm thấy bộ đề nào phù hợp!</p>
              <p className="text-xs text-slate-400 mt-1">Hãy thử tìm với từ khóa hoặc bộ lọc khác.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider text-slate-400 font-heading font-bold">
                    <th className="py-4 px-6">Bộ Đề</th>
                    <th className="py-4 px-6">Chủ Đề</th>
                    <th className="py-4 px-6">Người Tạo</th>
                    <th className="py-4 px-6">Trạng Thái</th>
                    <th className="py-4 px-6">Lượt Chơi</th>
                    <th className="py-4 px-6 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredQuizzes.map((quiz) => {
                    const isPublic = quiz.is_public ?? quiz.isPublic ?? true;
                    const slideCount = quiz.slide_count ?? quiz.total_slides ?? 0;
                    return (
                      <tr key={quiz.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black shrink-0">
                              📚
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-heading font-black text-slate-900 text-sm truncate max-w-xs">
                                {quiz.title}
                              </h4>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {slideCount} câu hỏi
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-bold">
                            {quiz.topic || "Tổng Hợp"}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-slate-600 text-xs font-bold">
                          {quiz.creator_nickname || "Người dùng"}
                        </td>

                        <td className="py-4 px-6">
                          {isPublic ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                              <Globe size={11} /> Công Khai
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                              <Lock size={11} /> Riêng Tư
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 font-bold text-slate-700 text-xs">
                          {quiz.play_count || 0} lượt
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/quiz/${quiz.id}`}
                              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                              title="Xem chi tiết bộ đề"
                            >
                              <Eye size={15} />
                            </Link>

                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, quiz })}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                              title="Xóa bộ đề khỏi hệ thống"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL XÁC NHẬN XÓA BỘ ĐỀ ── */}
      {deleteConfirm.isOpen && deleteConfirm.quiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setDeleteConfirm({ isOpen: false, quiz: null })}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 size={26} />
            </div>

            <h3 className="text-xl font-heading font-black text-slate-900 mb-2">
              Xác Nhận Xóa Bộ Đề
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa bộ đề{" "}
              <strong className="text-slate-900 font-bold">&ldquo;{deleteConfirm.quiz.title}&rdquo;</strong>{" "}
              khỏi hệ thống? Hành động này sẽ gỡ bỏ bộ đề khỏi thư viện công khai.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, quiz: null })}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs font-heading transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteQuiz}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs font-heading shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? "Đang xóa..." : "Xác Nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
