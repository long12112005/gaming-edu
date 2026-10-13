"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Play,
  Pencil,
  Copy,
  Trash2,
  Lock,
  Globe,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  MoreVertical,
  Layers,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";

export interface QuizItem {
  id: string;
  title: string;
  coverImageUrl?: string | null;
  topic?: string | null;
  isPublic: boolean;
  slideCount?: number;
  playCount?: number;
  createdAt: string;
  creatorNickname?: string;
  creatorAvatar?: string | null;
}

const TOPIC_OPTIONS = [
  "Tất cả",
  "Toán Học",
  "Khoa Học",
  "Lịch Sử",
  "Ngữ Văn",
  "Tiếng Anh",
  "Địa Lý",
  "Tin Học",
  "Khác",
];

export default function MyQuizzesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("Tất cả");
  const [privacyFilter, setPrivacyFilter] = useState<"all" | "public" | "private">("all");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Confirm delete dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    quiz: QuizItem | null;
  }>({
    isOpen: false,
    quiz: null,
  });

  const fetchMyQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/quizzes/mine");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setQuizzes(res.data.data);
      } else if (Array.isArray(res.data)) {
        setQuizzes(res.data);
      }
    } catch (err: unknown) {
      console.error("Lỗi khi tải danh sách bộ đề:", err);
      // Fallback nếu API /mine chưa sẵn sàng, thử /quizzes
      try {
        const fallback = await api.get("/quizzes");
        if (fallback.data?.success && Array.isArray(fallback.data.data)) {
          setQuizzes(fallback.data.data);
        }
      } catch {
        setToastMsg({ text: "Không thể kết nối đến máy chủ lấy danh sách bộ đề.", type: "error" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated && !Cookies.get("token")) {
      router.push("/login");
      return;
    }
    fetchMyQuizzes();
  }, [isAuthenticated, router, fetchMyQuizzes]);

  // Bộ lọc danh sách
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      // Search
      const matchSearch =
        !searchQuery.trim() ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (q.topic && q.topic.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      // Topic
      const matchTopic =
        selectedTopic === "Tất cả" ||
        (q.topic && q.topic.toLowerCase() === selectedTopic.toLowerCase());

      // Privacy
      const matchPrivacy =
        privacyFilter === "all" ||
        (privacyFilter === "public" && q.isPublic) ||
        (privacyFilter === "private" && !q.isPublic);

      return matchSearch && matchTopic && matchPrivacy;
    });
  }, [quizzes, searchQuery, selectedTopic, privacyFilter]);

  // Nhân bản bộ đề
  const handleCloneQuiz = async (quiz: QuizItem) => {
    try {
      setActionLoadingId(quiz.id);
      const res = await api.post(`/quizzes/${quiz.id}/clone`);
      if (res.data?.success) {
        setToastMsg({ text: `Đã nhân bản bộ đề "${quiz.title}" thành công!`, type: "success" });
        await fetchMyQuizzes();
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setToastMsg({
        text: errorObj.response?.data?.message || "Nhân bản bộ đề thất bại.",
        type: "error",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mở phòng thi ngay
  const handleCreateRoom = async (quiz: QuizItem) => {
    try {
      setActionLoadingId(quiz.id);
      const res = await api.post("/rooms", {
        quizId: quiz.id,
        mode: "HOST_PACED",
      });
      if (res.data?.success) {
        router.push(`/host/${res.data.data.id}`);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setToastMsg({
        text: errorObj.response?.data?.message || "Tạo phòng thi đấu thất bại.",
        type: "error",
      });
      setActionLoadingId(null);
    }
  };

  // Xóa bộ đề (xóa mềm)
  const handleDeleteQuiz = async () => {
    if (!deleteConfirm.quiz) return;
    const quizId = deleteConfirm.quiz.id;
    try {
      await api.delete(`/quizzes/${quizId}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      setToastMsg({ text: "Đã xóa bộ đề thành công.", type: "success" });
      setDeleteConfirm({ isOpen: false, quiz: null });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setToastMsg({
        text: errorObj.response?.data?.message || "Xóa bộ đề thất bại.",
        type: "error",
      });
    }
  };

  return (
    <div className="min-h-screen text-[#1B2A2E] font-serif flex flex-col relative">
      {/* Background Tiên môn huyền ảo */}
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-xs font-bold text-teal-900 uppercase tracking-wider mb-2">
              <BookOpen size={14} className="text-teal-700" /> Thư Viện Đề Thi
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#08282e] tracking-tight">
              Kho Bộ Đề Của Bạn
            </h1>
            <p className="text-teal-800/80 text-sm md:text-base mt-1 max-w-xl">
              Quản lý toàn bộ câu hỏi và bộ đề trắc nghiệm, điền khuyết, ghép nối. Sẵn sàng mở phòng thi đấu mọi lúc.
            </p>
          </div>

          <Link
            href="/quiz/create"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-black text-sm shadow-[0_6px_20px_rgba(251,191,36,0.35)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0"
          >
            <Plus size={18} className="stroke-[3px]" />
            <span>Tạo Bộ Đề Mới</span>
          </Link>
        </div>

        {/* Toast thông báo */}
        {toastMsg && (
          <div
            className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between animate-in fade-in ${
              toastMsg.type === "success"
                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-950"
                : "bg-rose-500/20 border-rose-400/50 text-rose-950"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-700" />
              ) : (
                <AlertCircle size={18} className="text-rose-700" />
              )}
              <span>{toastMsg.text}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-gray-600 hover:text-black">
              ✕
            </button>
          </div>
        )}

        {/* Thanh Tìm Kiếm & Bộ Lọc Đa Chiều */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[24px] p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Ô Tìm Kiếm */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-700/50" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề hoặc chủ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white/80 border border-teal-200/60 rounded-xl text-teal-950 text-sm font-medium outline-none focus:border-teal-500 transition-colors placeholder-teal-600/40"
            />
          </div>

          {/* Lọc Theo Chủ Đề */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              aria-label="Chọn chủ đề"
              className="px-3 py-2.5 bg-white/80 border border-teal-200/60 rounded-xl text-xs md:text-sm font-bold text-teal-900 outline-none focus:border-teal-500 cursor-pointer"
            >
              {TOPIC_OPTIONS.map((topic) => (
                <option key={topic} value={topic}>
                  Chủ đề: {topic}
                </option>
              ))}
            </select>

            {/* Lọc Công Khai / Riêng Tư */}
            <div className="flex items-center bg-white/80 border border-teal-200/60 rounded-xl p-1 text-xs font-bold text-teal-900">
              <button
                onClick={() => setPrivacyFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  privacyFilter === "all" ? "bg-teal-600 text-white" : "hover:bg-teal-50"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setPrivacyFilter("public")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  privacyFilter === "public" ? "bg-teal-600 text-white" : "hover:bg-teal-50"
                }`}
              >
                <Globe size={12} /> Công khai
              </button>
              <button
                onClick={() => setPrivacyFilter("private")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  privacyFilter === "private" ? "bg-teal-600 text-white" : "hover:bg-teal-50"
                }`}
              >
                <Lock size={12} /> Riêng tư
              </button>
            </div>

            <button
              onClick={fetchMyQuizzes}
              className="p-2.5 rounded-xl bg-white hover:bg-teal-50 border border-teal-200/60 text-teal-800 transition-colors shrink-0"
              title="Làm mới danh sách"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Danh Sách Bộ Đề */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-60 bg-white/60 backdrop-blur-xl rounded-[28px] border border-white/80 animate-pulse p-6"
              />
            ))}
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="bg-white/65 backdrop-blur-xl rounded-[32px] border-2 border-dashed border-teal-300/50 p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-20 h-20 bg-teal-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-teal-300/40">
              <BookOpen size={36} className="text-teal-700" />
            </div>
            <h3 className="text-xl font-bold font-serif text-[#08282e] mb-2">Không tìm thấy bộ đề nào</h3>
            <p className="text-teal-800/80 text-sm mb-6">
              {searchQuery || selectedTopic !== "Tất cả" || privacyFilter !== "all"
                ? "Không có bộ đề nào khớp với tiêu chí tìm kiếm. Hãy thử xóa bộ lọc!"
                : "Bạn chưa tạo bộ đề nào. Hãy khởi tạo bài kiểm tra đầu tiên ngay bây giờ!"}
            </p>
            <Link
              href="/quiz/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={18} />
              <span>Tạo Bộ Đề Mới</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white/70 backdrop-blur-xl rounded-[28px] border border-white/90 p-6 shadow-[0_10px_30px_rgba(8,38,42,0.06)] hover:shadow-[0_16px_40px_rgba(8,38,42,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Badge Hàng Đầu: Chủ Đề & Chế Độ Riêng Tư */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                      {quiz.topic || "Tổng Hợp"}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        quiz.isPublic
                          ? "bg-cyan-50 text-cyan-800 border-cyan-200"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                      title={quiz.isPublic ? "Bất kỳ ai cũng có thể tìm thấy" : "Chỉ mình bạn thấy"}
                    >
                      {quiz.isPublic ? <Globe size={11} /> : <Lock size={11} />}
                      {quiz.isPublic ? "Công khai" : "Riêng tư"}
                    </span>
                  </div>

                  {/* Tiêu Đề */}
                  <h3 className="text-xl font-bold font-serif text-[#08282e] group-hover:text-teal-800 transition-colors line-clamp-2 mb-3 min-h-[56px]">
                    {quiz.title}
                  </h3>

                  {/* Thông Số Số Câu / Lượt Chơi */}
                  <div className="flex items-center gap-4 text-xs font-bold text-teal-800/70 mb-5">
                    <span className="flex items-center gap-1.5">
                      <Layers size={14} className="text-teal-600" />
                      {quiz.slideCount ?? 0} câu hỏi
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Play size={14} className="text-teal-600" />
                      {quiz.playCount ?? 0} lượt chơi
                    </span>
                  </div>
                </div>

                {/* Hàng Nút Thao Tác */}
                <div className="pt-4 border-t border-teal-200/50 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCreateRoom(quiz)}
                    disabled={actionLoadingId === quiz.id}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>{actionLoadingId === quiz.id ? "Đang mở..." : "Mở Phòng Chơi"}</span>
                  </button>

                  <Link
                    href={`/quiz/${quiz.id}/edit`}
                    className="p-2.5 rounded-xl bg-white hover:bg-teal-50 border border-teal-200/60 text-teal-800 transition-colors shadow-sm"
                    title="Chỉnh sửa bộ đề"
                  >
                    <Pencil size={15} />
                  </Link>

                  <button
                    onClick={() => handleCloneQuiz(quiz)}
                    disabled={actionLoadingId === quiz.id}
                    className="p-2.5 rounded-xl bg-white hover:bg-teal-50 border border-teal-200/60 text-teal-800 transition-colors shadow-sm disabled:opacity-60"
                    title="Nhân bản bộ đề"
                  >
                    <Copy size={15} />
                  </button>

                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, quiz })}
                    className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-colors shadow-sm"
                    title="Xóa bộ đề"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── CONFIRM DIALOG XÓA BỘ ĐỀ ── */}
      {deleteConfirm.isOpen && deleteConfirm.quiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[32px] max-w-md w-full p-6 md:p-8 shadow-[0_25px_60px_rgba(8,38,42,0.3)] font-sans">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-600 mb-5">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-2xl font-bold font-serif text-[#08282e] mb-2">Xóa Bộ Đề?</h3>
            <p className="text-teal-900/80 text-sm mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa bộ đề <b>&ldquo;{deleteConfirm.quiz.title}&rdquo;</b>? Toàn bộ câu hỏi bên trong sẽ bị loại bỏ.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, quiz: null })}
                className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteQuiz}
                className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
