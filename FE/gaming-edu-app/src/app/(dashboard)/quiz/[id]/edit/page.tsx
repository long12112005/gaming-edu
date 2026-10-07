"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  Trophy,
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Zap,
  Check,
  X,
  Save,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Bot,
  FileText,
  Gamepad2
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────
type SlideType = "QUIZ" | "FILL_IN_BLANK" | "MATCHING" | "POLL" | "WORD_CLOUD";
type SlideStatus = "DRAFT" | "PUBLISHED";

interface OptionDraft {
  id: string; // temp uuid for UI
  content: string;
  isCorrect: boolean;
}

interface SlideDraft {
  id: string; // "new-xxx" if not saved
  type: SlideType;
  questionText: string;
  timeLimit: number;
  points: number;
  status: SlideStatus;
  options: OptionDraft[];
  isExpanded: boolean;
  isSaving: boolean;
}

const slideTypes: { type: SlideType; label: string; icon: string }[] = [
  { type: "QUIZ", label: "Trắc Nghiệm", icon: "🎯" },
  { type: "FILL_IN_BLANK", label: "Điền Khuyết", icon: "✏️" },
  { type: "MATCHING", label: "Ghép Nối", icon: "🔗" },
  { type: "POLL", label: "Bình Chọn", icon: "📊" },
  { type: "WORD_CLOUD", label: "Đám Mây Từ", icon: "☁️" },
];

const optionBgColors = [
  "bg-red-500 shadow-[0_4px_0_#991b1b]",
  "bg-blue-500 shadow-[0_4px_0_#1e3a8a]",
  "bg-yellow-500 shadow-[0_4px_0_#854d0e]",
  "bg-green-500 shadow-[0_4px_0_#14532d]",
];

// ─── Generate temp ID ──────────────────────────────────────────────────────────
const tempId = () => `new-${Math.random().toString(36).slice(2, 9)}`;

// ─── Blank Slide Factory ───────────────────────────────────────────────────────
const blankSlide = (type: SlideType = "QUIZ"): SlideDraft => ({
  id: tempId(),
  type,
  questionText: "",
  timeLimit: 30,
  points: 1000,
  status: "DRAFT",
  options: [
    { id: tempId(), content: "", isCorrect: true },
    { id: tempId(), content: "", isCorrect: false },
    { id: tempId(), content: "", isCorrect: false },
    { id: tempId(), content: "", isCorrect: false },
  ],
  isExpanded: true,
  isSaving: false,
});

// ─── Option Input Row ──────────────────────────────────────────────────────────
function OptionRow({
  opt,
  idx,
  slideType,
  onChange,
  onToggleCorrect,
  onDelete,
}: {
  opt: OptionDraft;
  idx: number;
  slideType: SlideType;
  onChange: (val: string) => void;
  onToggleCorrect: () => void;
  onDelete: () => void;
}) {
  const letters = ["A", "B", "C", "D", "E", "F"];
  const isCorrectable = slideType === "QUIZ" || slideType === "FILL_IN_BLANK";

  return (
    <div className="flex items-center gap-3 mb-3">
      {/* Letter badge */}
      <div
        className={`w-12 h-12 rounded-[16px] flex items-center justify-center text-xl font-black text-white flex-shrink-0 ${
          optionBgColors[idx % 4]
        } translate-y-[-2px]`}
      >
        {letters[idx]}
      </div>

      {/* Text Input */}
      <input
        type="text"
        placeholder={`Nhập đáp án ${letters[idx]}`}
        value={opt.content}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-4 py-3 h-12 text-base font-bold border-4 border-gray-100 rounded-[20px] bg-gray-50 focus:bg-white focus:border-violet-400 focus:shadow-[0_4px_12px_rgba(124,58,237,0.1)] outline-none transition-all text-gray-900 placeholder-gray-400"
      />

      {/* Correct toggle */}
      {isCorrectable && (
        <button
          type="button"
          onClick={onToggleCorrect}
          title={opt.isCorrect ? "Đáp án đúng" : "Đánh dấu đúng"}
          className={`w-12 h-12 rounded-[16px] flex items-center justify-center flex-shrink-0 transition-all border-4 ${
            opt.isCorrect
              ? "bg-emerald-500 border-emerald-600 shadow-[0_4px_0_#047857] text-white translate-y-[-4px]"
              : "bg-gray-100 border-gray-200 text-gray-400 hover:border-emerald-200 hover:text-emerald-500 hover:bg-emerald-50"
          }`}
        >
          <Check size={20} className={opt.isCorrect ? "stroke-[4px]" : "stroke-[3px]"} />
        </button>
      )}

      {/* Delete option */}
      <button
        type="button"
        onClick={onDelete}
        className="w-12 h-12 rounded-[16px] border-4 border-transparent flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all"
      >
        <X size={20} className="stroke-[3px]" />
      </button>
    </div>
  );
}

// ─── Slide Editor Card ─────────────────────────────────────────────────────────
function SlideCard({
  slide,
  index,
  onUpdate,
  onDelete,
  onSave,
}: {
  slide: SlideDraft;
  index: number;
  onUpdate: (patch: Partial<SlideDraft>) => void;
  onDelete: () => void;
  onSave: () => void;
}) {
  const updateOption = (optIdx: number, patch: Partial<OptionDraft>) => {
    const options = slide.options.map((o, i) =>
      i === optIdx ? { ...o, ...patch } : o
    );
    onUpdate({ options });
  };

  const toggleCorrect = (optIdx: number) => {
    const options = slide.options.map((o, i) => ({
      ...o,
      isCorrect: i === optIdx,
    }));
    onUpdate({ options });
  };

  const addOption = () => {
    if (slide.options.length >= 6) return;
    onUpdate({
      options: [...slide.options, { id: tempId(), content: "", isCorrect: false }],
    });
  };

  const deleteOption = (optIdx: number) => {
    if (slide.options.length <= 2) return;
    onUpdate({ options: slide.options.filter((_, i) => i !== optIdx) });
  };

  const hasError =
    !slide.questionText.trim() ||
    (slide.type === "QUIZ" && slide.options.every((o) => !o.isCorrect));

  return (
    <div
      className={`bg-white rounded-[32px] border-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-300 animate-fade-in-up ${
        slide.isExpanded ? "border-violet-300 shadow-[0_12px_32px_rgba(124,58,237,0.1)] scale-[1.01]" : "border-gray-100 hover:border-gray-200"
      }`}
    >
      {/* Card Header */}
      <div
        className="flex items-center gap-4 p-5 cursor-pointer select-none"
        onClick={() => onUpdate({ isExpanded: !slide.isExpanded })}
      >
        <GripVertical size={24} className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 cursor-grab" />
        <div className="w-10 h-10 bg-gray-100 rounded-[16px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.05)] flex items-center justify-center text-sm font-black text-gray-500 flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-[12px]">
              {slideTypes.find((t) => t.type === slide.type)?.icon}{" "}
              {slideTypes.find((t) => t.type === slide.type)?.label}
            </span>
            <span
              className={`text-xs font-black px-3 py-1 rounded-[12px] border-2 ${
                slide.status === "PUBLISHED"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}
            >
              {slide.status === "PUBLISHED" ? "✓ PUBLISHED" : "DRAFT"}
            </span>
            {hasError && (
              <AlertCircle size={18} className="text-amber-500" />
            )}
          </div>
          <p className="text-lg font-black text-gray-900 truncate mt-2">
            {slide.questionText || (
              <span className="text-gray-400 font-bold italic">
                Chưa nhập câu hỏi...
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 w-10 h-10 justify-center bg-gray-50 rounded-full">
          {slide.isExpanded ? (
            <ChevronUp size={20} className="text-gray-500" />
          ) : (
            <ChevronDown size={20} className="text-gray-500" />
          )}
        </div>
      </div>

      {/* Expanded Body */}
      {slide.isExpanded && (
        <div className="border-t-4 border-gray-50 p-6 space-y-6">
          {/* Type + Config Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gray-50 p-5 rounded-[24px]">
            {/* Type selector */}
            <div className="md:col-span-2">
              <label className="text-xs font-black text-gray-500 block mb-2 uppercase tracking-wider">
                Loại câu hỏi
              </label>
              <div className="flex gap-2 flex-wrap">
                {slideTypes.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => onUpdate({ type: t.type })}
                    className={`text-xs font-bold px-3 py-2 rounded-[12px] border-2 transition-all ${
                      slide.type === t.type
                        ? "border-violet-500 bg-violet-100 text-violet-700 shadow-[0_2px_0_#8b5cf6] translate-y-[-2px]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            <div>
              <label className="text-xs font-black text-gray-500 block mb-2 uppercase tracking-wider flex items-center gap-1">
                <Clock size={14} /> Thời gian
              </label>
              <select
                value={slide.timeLimit}
                onChange={(e) =>
                  onUpdate({ timeLimit: Number(e.target.value) })
                }
                className="w-full px-4 py-2.5 h-11 text-sm border-4 border-gray-200 rounded-[16px] bg-white focus:bg-white focus:border-violet-400 outline-none transition-all font-bold text-gray-800"
              >
                {[10, 15, 20, 30, 45, 60, 90, 120].map((t) => (
                  <option key={t} value={t}>{t} giây</option>
                ))}
              </select>
            </div>

            {/* Points */}
            <div>
              <label className="text-xs font-black text-gray-500 block mb-2 uppercase tracking-wider flex items-center gap-1">
                <Zap size={14} /> Điểm
              </label>
              <select
                value={slide.points}
                onChange={(e) => onUpdate({ points: Number(e.target.value) })}
                className="w-full px-4 py-2.5 h-11 text-sm border-4 border-gray-200 rounded-[16px] bg-white focus:bg-white focus:border-violet-400 outline-none transition-all font-bold text-gray-800"
              >
                {[500, 1000, 1500, 2000].map((p) => (
                  <option key={p} value={p}>{p} pts</option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="text-sm font-black text-gray-800 block mb-2">
              Nội Dung Câu Hỏi
            </label>
            <textarea
              value={slide.questionText}
              onChange={(e) => onUpdate({ questionText: e.target.value })}
              placeholder="Nhập câu hỏi của bạn vào đây..."
              rows={3}
              className="w-full px-5 py-4 text-lg border-4 border-gray-100 rounded-[24px] bg-gray-50 focus:bg-white focus:border-violet-400 focus:shadow-[0_8px_24px_rgba(124,58,237,0.1)] outline-none transition-all resize-none font-bold text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Options */}
          {(slide.type === "QUIZ" || slide.type === "POLL") && (
            <div className="bg-white p-5 rounded-[24px] border-4 border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-black text-gray-800">
                  Các Lựa Chọn Đáp Án{" "}
                  {slide.type === "QUIZ" && (
                    <span className="text-gray-400 font-bold ml-2 text-xs">(Đánh dấu ✔️ cho câu đúng)</span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  disabled={slide.options.length >= 6}
                  className="text-xs font-black text-violet-600 hover:text-white bg-violet-50 hover:bg-violet-500 flex items-center gap-1.5 px-3 py-2 rounded-[12px] transition-colors disabled:opacity-50"
                >
                  <Plus size={14} className="stroke-[3px]" /> Thêm Lựa Chọn
                </button>
              </div>
              <div>
                {slide.options.map((opt, optIdx) => (
                  <OptionRow
                    key={opt.id}
                    opt={opt}
                    idx={optIdx}
                    slideType={slide.type}
                    onChange={(val) => updateOption(optIdx, { content: val })}
                    onToggleCorrect={() => toggleCorrect(optIdx)}
                    onDelete={() => deleteOption(optIdx)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* FILL_IN_BLANK hint */}
          {slide.type === "FILL_IN_BLANK" && (
            <div className="bg-white p-5 rounded-[24px] border-4 border-gray-100">
              <label className="text-sm font-black text-gray-800 block mb-2">
                Từ khóa đáp án đúng
              </label>
              <input
                type="text"
                placeholder="VD: hà nội, thủ đô (phân cách bằng dấu phẩy)"
                value={slide.options[0]?.content ?? ""}
                onChange={(e) =>
                  updateOption(0, { content: e.target.value, isCorrect: true })
                }
                className="w-full px-5 py-4 text-base border-4 border-gray-100 rounded-[20px] bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition-all font-bold"
              />
            </div>
          )}

          {/* WORD_CLOUD hint */}
          {slide.type === "WORD_CLOUD" && (
            <div className="bg-emerald-50 border-4 border-emerald-200 rounded-[24px] p-5 text-base font-bold text-emerald-800 flex items-center gap-3">
              <span className="text-3xl">☁️</span> Người chơi sẽ nhập từ bất kỳ. Hệ thống tạo đám mây từ tự động.
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between pt-6 border-t-4 border-gray-50">
            <div>
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    status:
                      slide.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                  })
                }
                className={`text-sm font-black px-4 py-3 rounded-[16px] border-4 transition-all ${
                  slide.status === "PUBLISHED"
                    ? "border-emerald-500 bg-emerald-100 text-emerald-700 shadow-[0_4px_0_#10b981] translate-y-[-2px]"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                {slide.status === "PUBLISHED"
                  ? "✓ ĐÃ XUẤT BẢN"
                  : "○ BẢN NHÁP"}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onDelete}
                className="text-sm font-black text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 flex items-center gap-2 px-4 py-3 rounded-[16px] transition-colors"
              >
                <Trash2 size={16} className="stroke-[3px]" /> Xóa
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={slide.isSaving}
                className="text-sm font-black text-white bg-violet-600 flex items-center gap-2 px-6 py-3 rounded-[16px] shadow-[0_4px_0_#5b21b6] active:translate-y-[4px] active:shadow-none hover:bg-violet-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Save size={18} className="stroke-[3px]" />
                {slide.isSaving ? "Đang lưu..." : "Lưu Câu Hỏi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuizEditorPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<any>(null);
  const [slides, setSlides] = useState<SlideDraft[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // AI Modal States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiFileUrl, setAiFileUrl] = useState("");
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "polling" | "completed" | "error">("idle");
  const [aiError, setAiError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setAiError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        setAiFileUrl("http://localhost:5000" + res.data.data);
      }
    } catch (err: any) {
      setAiError(err.response?.data?.message || "Không thể tải file lên.");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!Cookies.get("token")) {
      router.push("/login");
    }
  }, [router]);

  const loadQuizDetail = () => {
    api
      .get(`/quizzes/${quizId}`)
      .then((res) => {
        if (res.data.success) {
          const q = res.data.data;
          setQuiz(q);
          const draftSlides: SlideDraft[] = (q.slides ?? []).map(
            (s: any, idx: number) => ({
              id: s.id,
              type: s.type,
              questionText: s.questionText,
              timeLimit: s.timeLimit ?? 30,
              points: s.points ?? 1000,
              status: s.status ?? "DRAFT",
              options: (s.options ?? []).map((o: any) => ({
                id: o.id,
                content: o.content,
                isCorrect: o.isCorrect ?? false,
              })),
              isExpanded: idx === 0,
            })
          );
          setSlides(draftSlides);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingQuiz(false));
  };

  useEffect(() => {
    loadQuizDetail();
  }, [quizId]);

  useEffect(() => {
    if (aiStatus !== "polling" || !aiJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/aijobs/${aiJobId}`);
        const job = res.data.data;
        if (job.status === "COMPLETED") {
          setAiStatus("completed");
          setAiModalOpen(false);
          showToast("Đã sinh đề thành công!", "ok");
          loadQuizDetail();
          clearInterval(interval);
        } else if (job.status === "FAILED") {
          setAiStatus("error");
          setAiError(job.errorMessage || "Có lỗi khi sinh đề.");
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [aiStatus, aiJobId]);

  const handleStartAIJob = async () => {
    if (!aiFileUrl.trim()) return setAiError("Vui lòng nhập URL tài liệu");
    setAiError("");
    setAiStatus("polling");
    try {
      const res = await api.post("/aijobs", { quizId, fileUrl: aiFileUrl });
      setAiJobId(res.data.data.id);
    } catch (e: any) {
      setAiStatus("error");
      setAiError(e.response?.data?.message || "Lỗi tạo AI Job");
    }
  };

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateSlide = (id: string, patch: Partial<SlideDraft>) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const addNewSlide = (type: SlideType = "QUIZ") => {
    const newSlide = blankSlide(type);
    setSlides((prev) => [
      ...prev.map((s) => ({ ...s, isExpanded: false })),
      newSlide,
    ]);
  };

  const deleteSlide = (id: string) => {
    if (!confirm("Xóa câu hỏi này?")) return;
    setSlides((prev) => prev.filter((s) => s.id !== id));
  };

  const saveSlide = async (id: string) => {
    const slide = slides.find((s) => s.id === id);
    if (!slide) return;
    if (!slide.questionText.trim()) {
      showToast("Vui lòng nhập nội dung câu hỏi", "err");
      return;
    }
    updateSlide(id, { isSaving: true });
    const payload = {
      quizId,
      type: slide.type,
      questionText: slide.questionText,
      timeLimit: slide.timeLimit,
      points: slide.points,
      status: slide.status,
      orderIndex: slides.findIndex((s) => s.id === id),
      options: slide.options
        .filter((o) => o.content.trim())
        .map((o, i) => ({
          content: o.content,
          isCorrect: o.isCorrect,
          orderIndex: i,
        })),
    };

    try {
      if (slide.id.startsWith("new-")) {
        const res = await api.post(`/quizzes/${quizId}/slides`, payload);
        if (res.data.success) {
          const savedSlide = res.data.data;
          setSlides((prev) =>
            prev.map((s) =>
              s.id === id ? { ...s, id: savedSlide.id ?? id, isSaving: false } : s
            )
          );
          showToast("Câu hỏi đã được thêm thành công!");
        }
      } else {
        await api.put(`/quizzes/${quizId}/slides/${slide.id}`, payload);
        updateSlide(id, { isSaving: false });
        showToast("Câu hỏi đã được lưu!");
      }
    } catch (err: any) {
      updateSlide(id, { isSaving: false });
      showToast(err.response?.data?.message ?? "Lỗi khi lưu câu hỏi", "err");
    }
  };

  if (loadingQuiz) {
    return (
      <div className="min-h-screen bg-[#F4F1FA] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-8 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-gray-900 font-black text-xl">Đang tải trình chỉnh sửa...</p>
        </div>
      </div>
    );
  }

  const publishedCount = slides.filter((s) => s.status === "PUBLISHED").length;

  return (
    <div className="min-h-screen bg-[#F4F1FA] font-sans pb-20">
      {/* ── HEADER (Claymorphism) ────────────────────────────────────── */}
      <header className="bg-white border-b-4 border-violet-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-[12px] bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} className="stroke-[3px]" />
          </button>

          <div className="flex items-center gap-3 mr-auto">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-[0_4px_8px_rgba(124,58,237,0.3)]">
              <Gamepad2 size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-gray-900 leading-tight truncate max-w-[200px] sm:max-w-md">
                {quiz?.title ?? "Bộ đề chưa đặt tên"}
              </span>
              <span className="text-sm font-bold text-gray-500">
                {slides.length} câu hỏi &bull; <span className="text-emerald-500">{publishedCount} đã xuất bản</span>
              </span>
            </div>
          </div>

          <Link 
            href={`/quiz/${quizId}`}
            className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-bold rounded-[16px] shadow-[0_4px_0_#1f2937] active:translate-y-[4px] active:shadow-none hover:bg-black transition-all"
          >
            <Eye size={18} className="stroke-[3px]" /> Xem Trước
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Info bar */}
        <div className="bg-white border-4 border-violet-200 rounded-[32px] p-6 mb-8 flex items-center gap-5 shadow-[4px_4px_0_#ddd6fe] animate-fade-in-up">
          <div className="w-12 h-12 bg-violet-600 rounded-[16px] flex items-center justify-center flex-shrink-0 shadow-sm">
            <Zap size={24} className="text-white" />
          </div>
          <div>
            <div className="font-black text-gray-900 text-lg mb-1">
              Chế độ chỉnh sửa thông minh
            </div>
            <div className="text-sm font-bold text-gray-500">
              Bạn đang ở giao diện tạo nội dung. Nhấn <span className="text-violet-600">Lưu Câu Hỏi</span> cho từng câu sau khi sửa xong.
            </div>
          </div>
        </div>

        {/* Slides */}
        <div className="space-y-6 mb-10">
          {slides.length === 0 ? (
            <div className="bg-white rounded-[40px] border-4 border-dashed border-gray-300 p-16 text-center animate-fade-in-up">
              <div className="text-6xl mb-6">📝</div>
              <p className="font-black text-2xl text-gray-900 mb-2">
                Trang giấy trắng!
              </p>
              <p className="text-base font-bold text-gray-500 mb-8">
                Bắt đầu thêm câu hỏi đầu tiên của bạn vào bộ đề này ngay.
              </p>
              <button
                onClick={() => addNewSlide("QUIZ")}
                className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 text-white font-black text-lg rounded-[20px] shadow-[0_6px_0_#5b21b6] active:translate-y-[6px] active:shadow-none hover:bg-violet-500 transition-all"
              >
                <Plus size={20} className="stroke-[4px]" /> Thêm Câu Hỏi
              </button>
            </div>
          ) : (
            slides.map((slide, idx) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                index={idx}
                onUpdate={(patch) => updateSlide(slide.id, patch)}
                onDelete={() => deleteSlide(slide.id)}
                onSave={() => saveSlide(slide.id)}
              />
            ))
          )}
        </div>

        {/* Add new slide panel */}
        <div className="bg-white rounded-[40px] border-4 border-gray-100 shadow-[0_8px_24px_rgba(0,0,0,0.03)] p-8 animate-fade-in-up flex flex-col items-center">
          <p className="text-lg font-black text-gray-900 mb-5">
            Thêm khối nội dung mới
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setAiModalOpen(true);
                setAiStatus("idle");
                setAiFileUrl("");
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-[20px] bg-gradient-to-r from-pink-500 to-violet-500 shadow-[0_6px_0_#7c3aed] active:translate-y-[6px] active:shadow-none hover:brightness-110 text-base font-black text-white transition-all mr-2"
            >
              <Bot size={20} /> Sinh Đề Bằng AI ✨
            </button>

            {slideTypes.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => addNewSlide(t.type)}
                className="flex items-center gap-2 px-5 py-3 rounded-[20px] border-4 border-gray-200 hover:border-violet-400 hover:bg-violet-50 text-sm font-black text-gray-600 hover:text-violet-700 transition-all bg-gray-50"
              >
                <span className="text-lg">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* AI Modal (Claymorphism) */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-[0_24px_64px_rgba(0,0,0,0.2)] border-4 border-white relative overflow-hidden animate-fade-in-up">
            <button
              onClick={() => {
                if (aiStatus !== "polling") setAiModalOpen(false);
              }}
              className="absolute top-6 right-6 w-10 h-10 rounded-[16px] bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
            >
              <X size={20} className="stroke-[3px]" />
            </button>
            
            <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center mb-6 border-4 border-pink-200 shadow-sm">
              <Bot size={40} className="text-violet-600" />
            </div>
            
            <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Sinh Đề Tự Động</h3>
            <p className="text-base font-bold text-gray-500 mb-8">
              Cung cấp tài liệu (PDF/Word), Robot của chúng tôi sẽ phân tích và tạo ra câu hỏi siêu tốc.
            </p>

            <div className="space-y-6">
              {aiError && (
                <div className="p-4 bg-red-100 text-red-600 text-sm font-bold rounded-[20px] border-2 border-red-200 text-center">
                  {aiError}
                </div>
              )}

              <div className="bg-gray-50 p-5 rounded-[24px] border-4 border-gray-100">
                <label className="block text-sm font-black text-gray-900 mb-3">Tải File Lên (PDF, DOCX)</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  disabled={aiStatus === "polling" || isUploading}
                  className="w-full text-sm font-bold text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-[16px] file:border-0 file:text-sm file:font-black file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200 cursor-pointer transition-colors outline-none"
                />
                {isUploading && <p className="text-sm text-violet-600 mt-3 font-bold animate-pulse">Đang tải file...</p>}
              </div>

              <div className="flex items-center gap-3">
                 <div className="h-1 bg-gray-100 flex-1 rounded-full"></div>
                 <span className="text-xs text-gray-400 font-black uppercase tracking-widest">Hoặc Nhập URL</span>
                 <div className="h-1 bg-gray-100 flex-1 rounded-full"></div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-900 mb-3">Đường dẫn tài liệu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FileText size={20} className="text-gray-400" />
                  </div>
                  <input
                    type="url"
                    placeholder="https://truong.edu.vn/tai-lieu.pdf"
                    value={aiFileUrl}
                    onChange={(e) => setAiFileUrl(e.target.value)}
                    disabled={aiStatus === "polling" || isUploading}
                    className="w-full pl-12 pr-4 py-4 text-base font-bold border-4 border-gray-100 rounded-[20px] bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition-all placeholder-gray-400"
                  />
                </div>
              </div>

              {aiStatus === "polling" ? (
                <div className="bg-violet-50 rounded-[24px] p-6 border-4 border-violet-100 flex flex-col items-center justify-center py-10 mt-6">
                  <div className="w-12 h-12 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin mb-4" />
                  <p className="font-black text-violet-900 text-lg">Đang đọc tài liệu...</p>
                  <p className="text-sm font-bold text-violet-600 mt-1">Đừng đóng cửa sổ này nhé!</p>
                </div>
              ) : (
                <button 
                  onClick={handleStartAIJob}
                  className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xl rounded-[20px] shadow-[0_6px_0_#4c1d95] active:translate-y-[6px] active:shadow-none hover:brightness-110 transition-all mt-6 uppercase tracking-wider flex justify-center items-center gap-2"
                >
                  <Bot size={24} /> Bắt Đầu Tạo Câu Hỏi
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast notification (Clay) */}
      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-[20px] shadow-[0_12px_24px_rgba(0,0,0,0.15)] text-base font-black text-white flex items-center gap-3 animate-fade-in-up z-50 border-4 ${
            toast.type === "ok" ? "bg-emerald-500 border-emerald-600" : "bg-red-500 border-red-600"
          }`}
        >
          {toast.type === "ok" ? (
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center"><Check size={18} className="stroke-[3px]" /></div>
          ) : (
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center"><X size={18} className="stroke-[3px]" /></div>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
