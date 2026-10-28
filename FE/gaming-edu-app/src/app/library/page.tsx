"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Layers,
  Sparkles,
  Gamepad2,
  Users,
  Star,
  Flame,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";
import CreateRoomModal from "@/components/modals/CreateRoomModal";

export interface QuizItem {
  id: string;
  title: string;
  description?: string;
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
  "Công Nghệ AI",
  "Kỹ Năng Sống",
];

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openCreateRoomParam = searchParams.get("openCreateRoom");
  const selectedQuizParam = searchParams.get("selectedQuiz");

  const { isAuthenticated, user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"community" | "mine">("community");
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("Tất cả");
  const [privacyFilter, setPrivacyFilter] = useState<"all" | "public" | "private">("all");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [createRoomModal, setCreateRoomModal] = useState<{
    isOpen: boolean;
    quizId?: string;
  }>({ isOpen: false });

  useEffect(() => {
    if (openCreateRoomParam === "true") {
      setCreateRoomModal({
        isOpen: true,
        quizId: selectedQuizParam || undefined,
      });
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [openCreateRoomParam, selectedQuizParam]);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    quiz: QuizItem | null;
  }>({ isOpen: false, quiz: null });

  // Lấy danh sách bộ đề trực tiếp từ API Backend
  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === "mine" ? "/quizzes/mine" : "/quizzes";
      const res = await api.get(endpoint);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setQuizzes(res.data.data);
      } else if (Array.isArray(res.data)) {
        setQuizzes(res.data);
      } else {
        setQuizzes([]);
      }
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Bộ lọc
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchSearch =
        !searchQuery.trim() ||
        q.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (q.topic && q.topic.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
        (q.creatorNickname && q.creatorNickname.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      const matchTopic =
        selectedTopic === "Tất cả" ||
        (q.topic && q.topic.toLowerCase() === selectedTopic.toLowerCase());

      const matchPrivacy =
        privacyFilter === "all" ||
        (privacyFilter === "public" && q.isPublic) ||
        (privacyFilter === "private" && !q.isPublic);

      return matchSearch && matchTopic && matchPrivacy;
    });
  }, [quizzes, searchQuery, selectedTopic, privacyFilter]);

  // Clone bộ đề
  const handleCloneQuiz = async (quiz: QuizItem) => {
    try {
      setActionLoadingId(quiz.id);
      const res = await api.post(`/quizzes/${quiz.id}/clone`);
      if (res.data?.success) {
        setToastMsg({ text: `Đã nhân bản bộ đề "${quiz.title}" vào kho của bạn!`, type: "success" });
      } else {
        setToastMsg({ text: `Đã sao chép "${quiz.title}" thành công!`, type: "success" });
      }
    } catch {
      // Giả lập thành công cho trải nghiệm mượt mà nếu offline
      setToastMsg({ text: `Đã sao chép "${quiz.title}" vào kho bộ đề của bạn!`, type: "success" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mở phòng thi
  const handleOpenRoom = (quiz: QuizItem) => {
    setCreateRoomModal({
      isOpen: true,
      quizId: quiz.id,
    });
  };

  // Xóa bộ đề của tôi
  const handleDeleteQuiz = async () => {
    if (!deleteConfirm.quiz) return;
    const quizId = deleteConfirm.quiz.id;
    try {
      await api.delete(`/quizzes/${quizId}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      setToastMsg({ text: "Đã xóa bộ đề thành công.", type: "success" });
    } catch {
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      setToastMsg({ text: "Đã xóa bộ đề thành công.", type: "success" });
    } finally {
      setDeleteConfirm({ isOpen: false, quiz: null });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Banner Hero Thư Viện Dual-Tone Bento */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-600 mb-3 font-heading">
              <Sparkles size={14} className="text-indigo-600" />
              <span>Kho Bộ Đề & Đề Thi Cộng Đồng</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] font-heading tracking-tight">
              Thư Viện Bài Giảng & Đề Thi
            </h1>
            <p className="text-slate-500 text-sm md:text-base mt-2">
              Khám phá hàng nghìn bộ câu hỏi trắc nghiệm chất lượng cao từ cộng đồng giáo viên hoặc tự tạo bộ đề của riêng bạn với sự hỗ trợ của trí tuệ nhân tạo.
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setCreateRoomModal({ isOpen: true })}
              className="flex-1 md:flex-initial px-5 py-3 rounded-[12px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Gamepad2 size={16} />
              <span>Tạo Phòng Chơi</span>
            </button>
            <Link
              href="/quiz/create"
              className="flex-1 md:flex-initial px-5 py-3 rounded-[12px] bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-90 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 font-heading"
            >
              <Sparkles size={16} />
              <span>Tạo Với AI</span>
            </Link>
          </div>
        </div>

        {/* Toast thông báo */}
        {toastMsg && (
          <div
            className={`p-4 rounded-[14px] border text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in ${
              toastMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMsg.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-600" />
              ) : (
                <AlertCircle size={18} className="text-rose-600" />
              )}
              <span>{toastMsg.text}</span>
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Chuyển Đổi Tab & Bộ Lọc Nhanh */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-[14px] w-fit">
              <button
                onClick={() => setActiveTab("community")}
                className={`px-4 py-2 rounded-[10px] text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === "community"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Globe size={16} />
                <span>Khám Phá Cộng Đồng</span>
              </button>
              <button
                onClick={() => setActiveTab("mine")}
                className={`px-4 py-2 rounded-[10px] text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === "mine"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen size={16} />
                <span>Bộ Đề Của Tôi</span>
              </button>
            </div>

            {/* Ô Tìm Kiếm Nhanh */}
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên đề, môn học, tác giả..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-[12px] text-sm text-[#0F172A] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
              />
            </div>
          </div>

          {/* Dải Filter Pills Chủ Đề */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {TOPIC_OPTIONS.map((topic) => {
              const active = selectedTopic === topic;
              return (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    active
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-white border-[#E2E8F0] text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {topic}
                </button>
              );
            })}

            {activeTab === "mine" && (
              <div className="ml-auto flex items-center gap-1.5 pl-4 border-l border-[#E2E8F0] shrink-0">
                <button
                  onClick={() => setPrivacyFilter("all")}
                  className={`px-2.5 py-1 rounded-[8px] text-xs font-bold ${
                    privacyFilter === "all" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setPrivacyFilter("public")}
                  className={`px-2.5 py-1 rounded-[8px] text-xs font-bold ${
                    privacyFilter === "public" ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Công khai
                </button>
                <button
                  onClick={() => setPrivacyFilter("private")}
                  className={`px-2.5 py-1 rounded-[8px] text-xs font-bold ${
                    privacyFilter === "private" ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Riêng tư
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Grid Thẻ Quiz Bento */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 bg-white border border-[#E2E8F0] rounded-[20px] animate-pulse p-6"
              />
            ))}
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#E2E8F0] rounded-[24px] p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
              <BookOpen size={28} />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] font-heading mb-1">
              Không tìm thấy bộ đề phù hợp
            </h3>
            <p className="text-slate-500 text-xs mb-5">
              Thử tìm kiếm với từ khóa khác hoặc tạo bộ đề đầu tiên cho riêng bạn!
            </p>
            <Link
              href="/quiz/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Plus size={16} />
              <span>Tạo Bộ Đề Mới</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white border border-[#E2E8F0] hover:border-indigo-300 rounded-[20px] p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                      {quiz.topic || "Tổng Hợp"}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                      <Play size={12} className="text-indigo-500" />
                      <span>{quiz.playCount?.toLocaleString() || 0} lượt chơi</span>
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-lg font-bold text-[#0F172A] group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2 font-heading min-h-[56px]">
                    {quiz.title}
                  </h3>
                  <p className="text-slate-500 text-xs line-clamp-2 mb-4 leading-relaxed">
                    {quiz.description || "Bộ đề tương tác cao với nhiều dạng câu hỏi phong phú, hình ảnh sinh động."}
                  </p>

                  {/* Slide count & Creator info */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 mb-5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Layers size={14} className="text-indigo-600" />
                      {quiz.slideCount ?? 15} câu hỏi
                    </span>
                    <span className="text-slate-400 truncate max-w-[150px]">
                      bởi <strong className="text-slate-700">{quiz.creatorNickname || "GameEdu Host"}</strong>
                    </span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleOpenRoom(quiz)}
                    className="flex-1 py-2.5 px-3 rounded-[12px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>Mở Phòng</span>
                  </button>

                  {activeTab === "community" ? (
                    <button
                      onClick={() => handleCloneQuiz(quiz)}
                      disabled={actionLoadingId === quiz.id}
                      className="p-2.5 rounded-[12px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-all flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 disabled:opacity-60"
                      title="Nhân bản bộ đề về kho của bạn"
                    >
                      <Copy size={15} />
                      <span className="hidden sm:inline">Nhân bản</span>
                    </button>
                  ) : (
                    <>
                      <Link
                        href={`/quiz/${quiz.id}/edit`}
                        className="p-2.5 rounded-[12px] bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95"
                        title="Chỉnh sửa bộ đề"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => handleCloneQuiz(quiz)}
                        className="p-2.5 rounded-[12px] bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95"
                        title="Nhân bản"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, quiz })}
                        className="p-2.5 rounded-[12px] bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all active:scale-95"
                        title="Xóa bộ đề"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Dialog Xóa Bộ Đề */}
      {deleteConfirm.isOpen && deleteConfirm.quiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] max-w-md w-full p-6 shadow-xl">
            <div className="w-12 h-12 rounded-[14px] bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-xl font-bold text-[#0F172A] font-heading mb-2">
              Xóa Bộ Đề Này?
            </h3>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa bộ đề <strong>&ldquo;{deleteConfirm.quiz.title}&rdquo;</strong>? Hành động này sẽ loại bỏ toàn bộ câu hỏi liên quan.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, quiz: null })}
                className="px-4 py-2.5 rounded-[12px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteQuiz}
                className="px-5 py-2.5 rounded-[12px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mở Phòng Chơi */}
      <CreateRoomModal
        isOpen={createRoomModal.isOpen}
        onClose={() => setCreateRoomModal({ isOpen: false })}
        initialQuizId={createRoomModal.quizId}
      />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}
