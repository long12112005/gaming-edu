"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { BookOpen, Sparkles, ArrowRight, Globe, Lock, Layers, Zap, CheckCircle2, Loader2 } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import BulkImportModal from "@/components/modals/BulkImportModal";
import { ParsedSlide } from "@/lib/quizParser";

const TOPICS = [
  { value: "TOÁN HỌC", label: "Toán Học", icon: "🔢", desc: "Đại số, hình học & toán tư duy" },
  { value: "KHOA HỌC", label: "Khoa Học", icon: "🔬", desc: "Vật lý, Hóa học & Sinh học" },
  { value: "LỊCH SỬ", label: "Lịch Sử", icon: "📜", desc: "Lịch sử VN & thế giới" },
  { value: "NGỮ VĂN", label: "Ngữ Văn", icon: "📖", desc: "Văn học & tiếng Việt" },
  { value: "ĐỊA LÝ", label: "Địa Lý", icon: "🌍", desc: "Tự nhiên, kinh tế & xã hội" },
  { value: "ANH VĂN", label: "Tiếng Anh", icon: "🌐", desc: "Từ vựng & ngữ pháp" },
  { value: "TIN HỌC", label: "Tin Học", icon: "💻", desc: "Lập trình & công nghệ" },
  { value: "KHÁC", label: "Tổng Hợp", icon: "✨", desc: "Kiến thức chung & đố vui" },
];

function CreateQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const returnUrlParam = searchParams.get("returnUrl");

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("KHOA HỌC");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const isFromRoom =
    fromParam === "create_room" ||
    (typeof window !== "undefined" && sessionStorage.getItem("quiz_create_source") === "create_room");
  const returnUrl =
    returnUrlParam ||
    (typeof window !== "undefined" ? sessionStorage.getItem("quiz_create_return_url") : null) ||
    "/";

  useEffect(() => {
    if (fromParam !== "create_room" && typeof window !== "undefined") {
      // Nếu vào trực tiếp không có cờ from=create_room thì dọn dẹp sessionStorage cũ
      sessionStorage.removeItem("quiz_create_source");
      sessionStorage.removeItem("quiz_create_return_url");
    }
  }, [fromParam]);

  const handleImportQuestions = (list: ParsedSlide[]) => {
    if (list.length === 0) return;
    if (!title.trim()) {
      setTitle(`Bộ Đề Tự Động (${list.length} câu)`);
    }
    setImportedCount(list.length);
    const mapped = list.map((p) => ({
      id: `slide-${Math.random().toString(36).slice(2, 9)}`,
      type: p.type,
      questionText: p.questionText,
      timeLimit: p.timeLimit,
      points: p.points,
      status: "PUBLISHED",
      options: p.options.map((opt) => ({
        id: `opt-${Math.random().toString(36).slice(2, 9)}`,
        content: opt.content,
        isCorrect: opt.isCorrect,
        matchingPair: opt.matchingPair,
        blankKeywords: opt.blankKeywords,
      })),
    }));
    sessionStorage.setItem("pending_import_slides", JSON.stringify(mapped));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tên bộ đề trắc nghiệm.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/quizzes", {
        title: title.trim(),
        topic,
        isPublic,
        coverImageUrl: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=600&h=350&fit=crop",
      });
      if (res.data?.success || res.data?.data?.id) {
        const quizId = res.data?.data?.id || res.data?.id;
        let nextUrl = `/quiz/${quizId}/edit`;
        if (isFromRoom) {
          nextUrl += `?from=create_room${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ""}`;
        }
        router.push(nextUrl);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message ?? "Lỗi khi tạo bộ đề. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans relative overflow-x-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-amber-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute -bottom-20 right-0 w-96 h-96 bg-purple-500/5 blur-3xl pointer-events-none rounded-full" />

      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-3xl mx-auto w-full relative z-10 space-y-6">
        <div className="bg-white border border-[#E2E8F0] rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 md:p-10 shadow-xs relative">
          {/* Header Title */}
          <div className="text-center mb-7 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full font-heading font-extrabold text-xs tracking-wider uppercase shadow-2xs">
              <Sparkles size={14} className="text-indigo-600" />
              <span>Khởi Tạo Bộ Đề Mới</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-[#0F172A] tracking-tight">
              Tạo Bộ Đề Học Tập Mới
            </h1>
            <p className="text-slate-500 font-medium text-xs sm:text-sm max-w-md mx-auto">
              Nhập tiêu đề và chọn phân loại để bắt đầu soạn câu hỏi trắc nghiệm, hình ảnh & tương tác thời gian thực.
            </p>
          </div>

          {/* Banner Nhập Nhanh Hàng Loạt */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/60 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <Layers size={20} />
              </div>
              <div>
                <div className="font-heading font-extrabold text-xs sm:text-sm text-amber-950 flex items-center gap-1.5">
                  <span>Bạn đã có sẵn tài liệu hoặc file Excel?</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 text-[10px] font-bold">Khuyên dùng</span>
                </div>
                <p className="text-[11px] text-amber-800/80 font-medium">
                  Tự động bóc tách Trắc nghiệm, Ghép cặp và Điền khuyết từ Word/PDF hoặc dán bảng tính Excel chỉ trong 1 cú click!
                </p>
                {importedCount > 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mt-1">
                    <CheckCircle2 size={13} />
                    <span>Đã nạp sẵn {importedCount} câu hỏi chuẩn bị đưa vào bộ đề!</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-heading font-extrabold text-xs shadow-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Zap size={14} />
              <span>{importedCount > 0 ? "Nhập Lại / Xem Thêm" : "Nhập Nhanh Ngay"}</span>
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl text-center shadow-2xs animate-in fade-in">
                {error}
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-heading font-bold text-slate-800">
                <BookOpen size={16} className="text-indigo-600" />
                <span>Tên Bộ Đề / Giáo Án</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Khám Phá Hệ Mặt Trời - Khoa Học Lớp 6..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-2xs"
                autoFocus
              />
            </div>

            {/* Topic Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-heading font-bold text-slate-800">
                <Sparkles size={16} className="text-amber-500" />
                <span>Môn Học / Chủ Đề</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {TOPICS.map((t) => {
                  const isActive = topic === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTopic(t.value)}
                      className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all duration-150 cursor-pointer ${
                        isActive
                          ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-xs ring-2 ring-indigo-500/20 scale-[1.02]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      <span className="text-2xl mb-1">{t.icon}</span>
                      <span className="font-heading font-bold text-xs sm:text-sm text-slate-900">{t.label}</span>
                      <span className="text-[11px] text-slate-500 font-medium line-clamp-1">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-heading font-bold text-slate-800">
                <span>Quyền Truy Cập</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isPublic
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      isPublic ? "bg-emerald-600 text-white shadow-2xs" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Globe size={18} />
                  </div>
                  <div className="text-left">
                    <div className="font-heading font-bold text-slate-900 text-xs sm:text-sm">Công Khai</div>
                    <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      Mọi người đều có thể tìm thấy và trải nghiệm
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    !isPublic
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      !isPublic ? "bg-indigo-600 text-white shadow-2xs" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Lock size={18} />
                  </div>
                  <div className="text-left">
                    <div className="font-heading font-bold text-slate-900 text-xs sm:text-sm">Riêng Tư</div>
                    <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      Chỉ bạn mới có quyền xem và tổ chức thi
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isFromRoom) {
                    if (typeof window !== "undefined") {
                      sessionStorage.removeItem("quiz_create_source");
                      sessionStorage.removeItem("quiz_create_return_url");
                    }
                    const cleanReturn = returnUrl && returnUrl.startsWith("/") ? returnUrl.split("?")[0] : "/";
                    router.push(`${cleanReturn}?openCreateRoom=true`);
                  } else {
                    router.push("/quizzes");
                  }
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs sm:text-sm border border-slate-200 transition-all cursor-pointer"
              >
                Quay Lại
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-600 text-white font-heading font-black text-xs sm:text-sm rounded-xl shadow-[0_4px_14px_rgba(245,158,11,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                {!loading && <ArrowRight size={18} />}
                <span>{loading ? "Đang Thiết Lập..." : "Hoàn Tất & Bắt Đầu Soạn Câu Hỏi"}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Modal Nhập Hàng Loạt */}
      <BulkImportModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onImport={handleImportQuestions}
      />
    </div>
  );
}

export default function CreateQuizPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      }
    >
      <CreateQuizContent />
    </Suspense>
  );
}
