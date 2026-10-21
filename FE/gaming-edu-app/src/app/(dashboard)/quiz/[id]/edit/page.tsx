"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
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
  Gamepad2,
  CheckCircle2,
  Sparkles,
  Upload,
  AlignLeft,
  CheckCheck,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────
type SlideType = "QUIZ" | "FILL_IN_BLANK" | "MATCHING" | "POLL" | "WORD_CLOUD";
type SlideStatus = "DRAFT" | "PUBLISHED";

interface OptionDraft {
  id: string; // temp uuid for UI
  content: string;
  isCorrect: boolean;
  matchingPair?: string;
  blankKeywords?: string;
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
  isAIGenerated?: boolean;
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

const tempId = () => `new-${Math.random().toString(36).slice(2, 9)}`;

const blankSlide = (type: SlideType = "QUIZ"): SlideDraft => {
  if (type === "MATCHING") {
    return {
      id: tempId(),
      type,
      questionText: "",
      timeLimit: 45,
      points: 1000,
      status: "DRAFT",
      options: [
        { id: tempId(), content: "", matchingPair: "", isCorrect: true },
        { id: tempId(), content: "", matchingPair: "", isCorrect: true },
        { id: tempId(), content: "", matchingPair: "", isCorrect: true },
      ],
      isExpanded: true,
      isSaving: false,
    };
  }

  if (type === "FILL_IN_BLANK") {
    return {
      id: tempId(),
      type,
      questionText: "",
      timeLimit: 30,
      points: 1000,
      status: "DRAFT",
      options: [
        { id: tempId(), content: "", blankKeywords: "", isCorrect: true },
      ],
      isExpanded: true,
      isSaving: false,
    };
  }

  return {
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
  };
};

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
        className="flex-1 px-5 py-3.5 text-base font-bold border-4 border-gray-100 rounded-[20px] bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition-all placeholder-gray-400 text-gray-800"
      />

      {/* Correct check toggle */}
      {isCorrectable && (
        <button
          type="button"
          onClick={onToggleCorrect}
          title={opt.isCorrect ? "Đáp án đúng" : "Đánh dấu là đúng"}
          className={`w-12 h-12 rounded-[16px] flex items-center justify-center border-4 transition-all flex-shrink-0 ${
            opt.isCorrect
              ? "bg-emerald-500 border-emerald-600 text-white shadow-[0_4px_0_#059669] translate-y-[-2px]"
              : "bg-gray-100 border-gray-200 text-gray-400 hover:border-gray-300"
          }`}
        >
          <Check size={22} className="stroke-[3.5px]" />
        </button>
      )}

      {/* Delete option */}
      <button
        type="button"
        onClick={onDelete}
        className="w-10 h-10 rounded-[14px] bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors flex-shrink-0"
      >
        <X size={18} className="stroke-[3px]" />
      </button>
    </div>
  );
}

// ─── Slide Card ────────────────────────────────────────────────────────────────
function SlideCard({
  slide,
  index,
  onUpdate,
  onDelete,
  onSave,
  onApprove,
}: {
  slide: SlideDraft;
  index: number;
  onUpdate: (patch: Partial<SlideDraft>) => void;
  onDelete: () => void;
  onSave: () => void;
  onApprove: () => void;
}) {
  const hasError =
    !slide.questionText.trim() ||
    ((slide.type === "QUIZ" || slide.type === "FILL_IN_BLANK") &&
      !slide.options.some((o) => o.isCorrect && o.content.trim())) ||
    (slide.type === "MATCHING" &&
      slide.options.filter((o) => o.content.trim() && o.matchingPair?.trim()).length < 2);

  const addOption = () => {
    if (slide.options.length >= 6) return;
    onUpdate({
      options: [
        ...slide.options,
        { id: tempId(), content: "", isCorrect: false },
      ],
    });
  };

  const addMatchingPair = () => {
    if (slide.options.length >= 8) return;
    onUpdate({
      options: [
        ...slide.options,
        { id: tempId(), content: "", matchingPair: "", isCorrect: true },
      ],
    });
  };

  const updateOption = (optId: string, content: string) => {
    onUpdate({
      options: slide.options.map((o) =>
        o.id === optId ? { ...o, content } : o
      ),
    });
  };

  const updateOptionMatchingPair = (optId: string, matchingPair: string) => {
    onUpdate({
      options: slide.options.map((o) =>
        o.id === optId ? { ...o, matchingPair } : o
      ),
    });
  };

  const updateOptionBlankKeywords = (optId: string, blankKeywords: string) => {
    onUpdate({
      options: slide.options.map((o) =>
        o.id === optId ? { ...o, blankKeywords } : o
      ),
    });
  };

  const toggleOptionCorrect = (optId: string) => {
    onUpdate({
      options: slide.options.map((o) =>
        o.id === optId ? { ...o, isCorrect: !o.isCorrect } : o
      ),
    });
  };

  const deleteOption = (optId: string) => {
    if (slide.options.length <= 1) return;
    onUpdate({
      options: slide.options.filter((o) => o.id !== optId),
    });
  };

  return (
    <div
      className={`bg-white rounded-[32px] border-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-300 animate-fade-in-up ${
        slide.isExpanded
          ? "border-violet-300 shadow-[0_12px_32px_rgba(124,58,237,0.1)] scale-[1.01]"
          : "border-gray-100 hover:border-gray-200"
      }`}
    >
      {/* Card Header */}
      <div
        className="flex items-center gap-4 p-5 cursor-pointer select-none"
        onClick={() => onUpdate({ isExpanded: !slide.isExpanded })}
      >
        <GripVertical
          size={24}
          className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 cursor-grab"
        />
        <div className="w-10 h-10 bg-gray-100 rounded-[16px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.05)] flex items-center justify-center text-sm font-black text-gray-500 flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-[12px]">
              {slideTypes.find((t) => t.type === slide.type)?.icon}{" "}
              {slideTypes.find((t) => t.type === slide.type)?.label}
            </span>

            {/* Trạng thái PUBLISHED / DRAFT */}
            <span
              className={`text-xs font-black px-3 py-1 rounded-[12px] border-2 ${
                slide.status === "PUBLISHED"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-amber-100 text-amber-800 border-amber-200"
              }`}
            >
              {slide.status === "PUBLISHED" ? "✓ ĐÃ DUYỆT" : "DRAFT (BẢN NHÁP)"}
            </span>

            {slide.isAIGenerated && (
              <span className="text-xs font-black px-2.5 py-0.5 rounded-[12px] bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                <Bot size={12} /> AI Tạo
              </span>
            )}

            {hasError && <AlertCircle size={18} className="text-amber-500" />}
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
                onChange={(e) => onUpdate({ timeLimit: Number(e.target.value) })}
                className="w-full px-4 py-2.5 h-11 text-sm border-4 border-gray-200 rounded-[16px] bg-white focus:bg-white focus:border-violet-400 outline-none transition-all font-bold text-gray-800"
              >
                {[10, 15, 20, 30, 45, 60, 90, 120].map((t) => (
                  <option key={t} value={t}>
                    {t} giây
                  </option>
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
                  <option key={p} value={p}>
                    {p} pts
                  </option>
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
                    <span className="text-gray-400 font-bold ml-2 text-xs">
                      (Đánh dấu ✔️ cho câu đúng)
                    </span>
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
                    onChange={(val) => updateOption(opt.id, val)}
                    onToggleCorrect={() => toggleOptionCorrect(opt.id)}
                    onDelete={() => deleteOption(opt.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* FILL_IN_BLANK helper */}
          {slide.type === "FILL_IN_BLANK" && (
            <div className="bg-white p-5 rounded-[24px] border-4 border-gray-100 space-y-4">
              <div>
                <label className="text-sm font-black text-gray-800 block mb-1">
                  Từ Khóa Đáp Án Chuẩn (Bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="Nhập từ hoặc cụm từ học sinh cần điền vào (VD: Hà Nội)"
                  value={slide.options[0]?.content || ""}
                  onChange={(e) => updateOption(slide.options[0]?.id || "", e.target.value)}
                  className="w-full px-5 py-3.5 text-base font-bold border-4 border-gray-100 rounded-[20px] bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition-all placeholder-gray-400 text-gray-800"
                />
              </div>
              <div>
                <label className="text-sm font-black text-gray-800 block mb-1">
                  Từ Khóa Biến Thể / Đồng Nghĩa (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Các biến thể ngăn cách bằng dấu phẩy (VD: ha noi, hn, thủ đô hà nội)"
                  value={slide.options[0]?.blankKeywords || ""}
                  onChange={(e) => updateOptionBlankKeywords(slide.options[0]?.id || "", e.target.value)}
                  className="w-full px-5 py-3 text-sm font-bold border-2 border-gray-200 rounded-[16px] bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition-all placeholder-gray-400 text-gray-700"
                />
                <p className="text-xs text-gray-400 font-bold mt-1.5">
                  Hệ thống tự động chấm đúng nếu học sinh gõ trùng với từ chuẩn hoặc bất kỳ biến thể nào trên đây.
                </p>
              </div>
            </div>
          )}

          {/* MATCHING section */}
          {slide.type === "MATCHING" && (
            <div className="bg-white p-5 rounded-[24px] border-4 border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-sm font-black text-gray-800 block">
                    Các Cặp Khái Niệm Ghép Nối
                  </label>
                  <span className="text-gray-400 font-bold text-xs">
                    (Vế Trái sẽ được ghép tương ứng với Vế Phải khi học sinh làm bài)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addMatchingPair}
                  disabled={slide.options.length >= 8}
                  className="text-xs font-black text-violet-600 hover:text-white bg-violet-50 hover:bg-violet-500 flex items-center gap-1.5 px-3 py-2 rounded-[12px] transition-colors disabled:opacity-50"
                >
                  <Plus size={14} className="stroke-[3px]" /> Thêm Cặp Ghép
                </button>
              </div>
              <div className="space-y-3">
                {slide.options.map((opt, optIdx) => (
                  <div key={opt.id} className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-[20px] border-2 border-gray-200">
                    <div className="w-8 h-8 rounded-[12px] bg-violet-600 text-white font-black flex items-center justify-center text-xs flex-shrink-0">
                      {optIdx + 1}
                    </div>
                    <input
                      type="text"
                      placeholder="Vế A (Ví dụ: Thủ đô Việt Nam)"
                      value={opt.content}
                      onChange={(e) => updateOption(opt.id, e.target.value)}
                      className="flex-1 px-4 py-2.5 text-sm font-bold border-2 border-gray-200 rounded-[14px] bg-white focus:border-violet-400 outline-none text-gray-800"
                    />
                    <span className="text-gray-400 font-black text-base flex-shrink-0">↔</span>
                    <input
                      type="text"
                      placeholder="Vế B (Ví dụ: Hà Nội)"
                      value={opt.matchingPair || ""}
                      onChange={(e) => updateOptionMatchingPair(opt.id, e.target.value)}
                      className="flex-1 px-4 py-2.5 text-sm font-bold border-2 border-gray-200 rounded-[14px] bg-white focus:border-violet-400 outline-none text-gray-800"
                    />
                    <button
                      type="button"
                      onClick={() => deleteOption(opt.id)}
                      disabled={slide.options.length <= 2}
                      className="w-9 h-9 rounded-[12px] bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-40"
                    >
                      <X size={16} className="stroke-[3px]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between pt-6 border-t-4 border-gray-50 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {slide.status === "DRAFT" ? (
                <button
                  type="button"
                  onClick={onApprove}
                  className="text-xs font-black px-4 py-3 rounded-[16px] bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_4px_0_#059669] active:translate-y-[2px] transition-all flex items-center gap-1.5"
                  title="Phê duyệt câu hỏi này để xuất bản"
                >
                  <CheckCircle2 size={16} /> Phê Duyệt Slide
                </button>
              ) : (
                <span className="text-xs font-black px-4 py-2.5 rounded-[16px] bg-emerald-100 text-emerald-800 border-2 border-emerald-300 flex items-center gap-1">
                  ✓ Đã Phê Duyệt
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
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

  const [quiz, setQuiz] = useState<{ id: string; title: string; slides?: SlideDraft[] } | null>(null);
  const [slides, setSlides] = useState<SlideDraft[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // AI Modal States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiInputTab, setAiInputTab] = useState<"upload" | "text">("upload");
  const [aiFileUrl, setAiFileUrl] = useState("");
  const [lectureText, setLectureText] = useState("");
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "polling" | "completed" | "error">("idle");
  const [aiStep, setAiStep] = useState<1 | 2 | 3>(1); // 1: Quét tài liệu, 2: Gọi AI, 3: Định dạng câu hỏi
  const [aiProgress, setAiProgress] = useState(0);
  const [aiError, setAiError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!Cookies.get("token")) {
      router.push("/login");
    }
  }, [router]);

  const loadQuizDetail = () => {
    api
      .get(`/quizzes/${quizId}`)
      .then((res) => {
        if (res.data?.success) {
          const q = res.data.data;
          setQuiz(q);
          const draftSlides: SlideDraft[] = (q.slides ?? []).map(
            (s: { id: string; type: SlideType; questionText: string; timeLimit?: number; points?: number; status?: SlideStatus; options?: { id: string; content: string; isCorrect?: boolean; matchingPair?: string; blankKeywords?: string }[]; isAIGenerated?: boolean }, idx: number) => ({
              id: s.id,
              type: s.type,
              questionText: s.questionText,
              timeLimit: s.timeLimit ?? 30,
              points: s.points ?? 1000,
              status: s.status ?? "DRAFT",
              isAIGenerated: s.isAIGenerated ?? false,
              options: (s.options ?? []).map((o) => ({
                id: o.id,
                content: o.content ?? "",
                isCorrect: o.isCorrect ?? false,
                matchingPair: o.matchingPair ?? "",
                blankKeywords: o.blankKeywords ?? "",
              })),
              isExpanded: idx === 0,
              isSaving: false,
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

  // Polling AI Job Status & Cập nhật tiến trình 3 bước
  useEffect(() => {
    if (aiStatus !== "polling" || !aiJobId) return;

    // Simulation tiến trình cho sinh động
    const progressTimer = setInterval(() => {
      setAiProgress((prev) => {
        if (prev < 35) {
          setAiStep(1);
          return prev + 5;
        } else if (prev < 75) {
          setAiStep(2);
          return prev + 4;
        } else if (prev < 95) {
          setAiStep(3);
          return prev + 2;
        }
        return prev;
      });
    }, 1200);

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/aijobs/${aiJobId}`);
        const job = res.data?.data;
        if (job?.status === "COMPLETED") {
          setAiProgress(100);
          setAiStatus("completed");
          setAiModalOpen(false);
          showToast("AI đã sinh đề thành công! Các câu hỏi đang ở trạng thái DRAFT.", "ok");
          loadQuizDetail();
          clearInterval(interval);
          clearInterval(progressTimer);
        } else if (job?.status === "FAILED") {
          setAiStatus("error");
          setAiError(job.errorMessage || "Có lỗi xảy ra trong quá trình gọi AI.");
          clearInterval(interval);
          clearInterval(progressTimer);
        }
      } catch (e: unknown) {
        console.error("Polling error", e);
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(progressTimer);
    };
  }, [aiStatus, aiJobId]);

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
      if (res.data?.success) {
        const uploadedPath = res.data.data?.fileUrl || (typeof res.data.data === "string" ? res.data.data : "");
        setAiFileUrl(uploadedPath);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setAiError(errorObj.response?.data?.message || "Không thể tải file lên.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartAIJob = async () => {
    setAiError("");
    let targetUrl = aiFileUrl.trim();

    // Nếu người dùng chọn tab dán bài giảng
    if (aiInputTab === "text") {
      if (!lectureText.trim()) {
        return setAiError("Vui lòng dán nội dung bài giảng trước khi tạo.");
      }
      try {
        setIsUploading(true);
        const textBlob = new Blob([lectureText.trim()], { type: "text/plain" });
        const textFile = new File([textBlob], "lecture_notes.txt", { type: "text/plain" });
        const formData = new FormData();
        formData.append("file", textFile);
        const resUpload = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (resUpload.data?.success) {
          const uploadedPath = resUpload.data.data?.fileUrl || (typeof resUpload.data.data === "string" ? resUpload.data.data : "");
          targetUrl = uploadedPath;
        } else {
          throw new Error("Không thể lưu văn bản bài giảng.");
        }
      } catch (err: unknown) {
        const errorObj = err as { response?: { data?: { message?: string } } };
        setIsUploading(false);
        return setAiError(errorObj.response?.data?.message || "Không thể tải lên bài giảng.");
      } finally {
        setIsUploading(false);
      }
    }

    if (!targetUrl) {
      return setAiError("Vui lòng tải file hoặc nhập đường dẫn tài liệu.");
    }

    setAiStatus("polling");
    setAiStep(1);
    setAiProgress(10);

    try {
      const res = await api.post("/aijobs", { quizId, fileUrl: targetUrl });
      if (res.data?.data?.id) {
        setAiJobId(res.data.data.id);
      }
    } catch (e: unknown) {
      const errorObj = e as { response?: { data?: { message?: string } } };
      setAiStatus("error");
      setAiError(errorObj.response?.data?.message || "Lỗi tạo AI Job.");
    }
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

  // Duyệt một câu hỏi bằng PUT /api/quizzes/{quizId}/slides/{slideId}/approve
  const handleApproveSlide = async (slideId: string) => {
    if (slideId.startsWith("new-")) {
      showToast("Vui lòng lưu câu hỏi trước khi phê duyệt.", "err");
      return;
    }
    try {
      const res = await api.put(`/quizzes/${quizId}/slides/${slideId}/approve`);
      if (res.data?.success) {
        updateSlide(slideId, { status: "PUBLISHED" });
        showToast("Đã phê duyệt câu hỏi thành công!", "ok");
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      showToast(errorObj.response?.data?.message || "Lỗi khi phê duyệt câu hỏi", "err");
    }
  };

  // Duyệt tất cả câu hỏi DRAFT
  const handleApproveAll = async () => {
    const draftSlides = slides.filter((s) => s.status === "DRAFT" && !s.id.startsWith("new-"));
    if (draftSlides.length === 0) {
      showToast("Không có câu hỏi DRAFT nào cần duyệt.", "ok");
      return;
    }

    try {
      await api.post(`/quizzes/${quizId}/slides/approve-all`).catch(async () => {
        // Fallback: Duyệt từng slide qua PUT /quizzes/{quizId}/slides/{slideId}/approve
        await Promise.all(
          draftSlides.map((s) => api.put(`/quizzes/${quizId}/slides/${s.id}/approve`))
        );
      });

      setSlides((prev) => prev.map((s) => ({ ...s, status: "PUBLISHED" })));
      showToast(`Đã phê duyệt toàn bộ ${draftSlides.length} câu hỏi thành công!`, "ok");
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      showToast(errorObj.response?.data?.message || "Phê duyệt hàng loạt thất bại", "err");
    }
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
          content: o.content.trim(),
          isCorrect: slide.type === "MATCHING" ? true : o.isCorrect,
          matchingPair: slide.type === "MATCHING" ? (o.matchingPair?.trim() || null) : null,
          blankKeywords: slide.type === "FILL_IN_BLANK" ? (o.blankKeywords?.trim() || null) : null,
          orderIndex: i,
        })),
    };

    try {
      if (slide.id.startsWith("new-")) {
        const res = await api.post(`/quizzes/${quizId}/slides`, payload);
        if (res.data?.success) {
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
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      updateSlide(id, { isSaving: false });
      showToast(errorObj.response?.data?.message ?? "Lỗi khi lưu câu hỏi", "err");
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
  const draftCount = slides.filter((s) => s.status === "DRAFT").length;

  return (
    <div className="min-h-screen bg-[#F4F1FA] font-sans pb-20">
      {/* ── HEADER TOOLBAR ────────────────────────────────────────── */}
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
              <span className="text-lg font-black text-gray-900 leading-tight truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {quiz?.title ?? "Bộ đề chưa đặt tên"}
              </span>
              <span className="text-xs sm:text-sm font-bold text-gray-500">
                {slides.length} câu &bull;{" "}
                <span className="text-emerald-600 font-extrabold">{publishedCount} đã duyệt</span>
                {draftCount > 0 && (
                  <span className="text-amber-600 font-extrabold ml-1">({draftCount} bản nháp)</span>
                )}
              </span>
            </div>
          </div>

          {/* Nút Tạo Đề Bằng AI trên Toolbar */}
          <button
            type="button"
            onClick={() => {
              setAiModalOpen(true);
              setAiStatus("idle");
              setAiError("");
              setAiProgress(0);
            }}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-[16px] bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-[0_4px_12px_rgba(168,85,247,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles size={16} className="text-yellow-300 animate-pulse" />
            <span>Tạo Đề Bằng AI</span>
          </button>

          {/* Nút Duyệt Tất Cả DRAFT nếu có */}
          {draftCount > 0 && (
            <button
              onClick={handleApproveAll}
              className="hidden md:flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-300 font-black rounded-[16px] text-xs transition-all"
              title="Phê duyệt toàn bộ câu hỏi nháp"
            >
              <CheckCheck size={16} /> Duyệt Tất Cả ({draftCount})
            </button>
          )}

          <Link
            href={`/quiz/${quizId}`}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-bold rounded-[16px] shadow-[0_4px_0_#1f2937] active:translate-y-[4px] active:shadow-none hover:bg-black transition-all text-xs sm:text-sm"
          >
            <Eye size={16} className="stroke-[3px]" /> Xem Trước
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Info bar */}
        <div className="bg-white border-4 border-violet-200 rounded-[32px] p-6 mb-8 flex items-center justify-between gap-5 shadow-[4px_4px_0_#ddd6fe] animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-600 rounded-[16px] flex items-center justify-center flex-shrink-0 shadow-sm text-white">
              <Zap size={24} />
            </div>
            <div>
              <div className="font-black text-gray-900 text-lg mb-0.5">
                Chế độ soạn đề & Trí tuệ nhân tạo
              </div>
              <div className="text-sm font-bold text-gray-500">
                Sử dụng nút <span className="text-purple-600 font-black">Tạo Đề Bằng AI</span> để quét file PDF/DOCX hoặc dán nội dung bài giảng. Các câu hỏi AI tạo sẽ lưu ở dạng DRAFT để bạn chỉnh sửa và bấm Phê Duyệt.
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách Slides */}
        <div className="space-y-6 mb-10">
          {slides.length === 0 ? (
            <div className="bg-white rounded-[40px] border-4 border-dashed border-gray-300 p-16 text-center animate-fade-in-up">
              <div className="text-6xl mb-6">📝</div>
              <p className="font-black text-2xl text-gray-900 mb-2">Trang giấy trắng!</p>
              <p className="text-base font-bold text-gray-500 mb-8">
                Bắt đầu thêm câu hỏi đầu tiên của bạn vào bộ đề này ngay hoặc để AI tạo tự động.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button
                  onClick={() => addNewSlide("QUIZ")}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 text-white font-black text-lg rounded-[20px] shadow-[0_6px_0_#5b21b6] active:translate-y-[6px] active:shadow-none hover:bg-violet-500 transition-all"
                >
                  <Plus size={20} className="stroke-[4px]" /> Thêm Câu Hỏi
                </button>
                <button
                  onClick={() => {
                    setAiModalOpen(true);
                    setAiStatus("idle");
                  }}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-black text-lg rounded-[20px] shadow-[0_6px_0_#7c3aed] active:translate-y-[6px] active:shadow-none hover:brightness-110 transition-all"
                >
                  <Sparkles size={20} /> Sinh Đề Bằng AI
                </button>
              </div>
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
                onApprove={() => handleApproveSlide(slide.id)}
              />
            ))
          )}
        </div>

        {/* Panel thêm câu hỏi phía dưới */}
        <div className="bg-white rounded-[40px] border-4 border-gray-100 shadow-[0_8px_24px_rgba(0,0,0,0.03)] p-8 animate-fade-in-up flex flex-col items-center">
          <p className="text-lg font-black text-gray-900 mb-5">Thêm khối nội dung mới</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setAiModalOpen(true);
                setAiStatus("idle");
                setAiFileUrl("");
                setLectureText("");
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

      {/* ── MODAL: AI GENERATION VỚI TIẾN TRÌNH 3 BƯỚC ───────────── */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-[40px] w-full max-w-xl p-8 shadow-[0_24px_64px_rgba(0,0,0,0.25)] border-4 border-white relative overflow-hidden animate-fade-in-up max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => {
                if (aiStatus !== "polling") setAiModalOpen(false);
              }}
              className="absolute top-6 right-6 w-10 h-10 rounded-[16px] bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
            >
              <X size={20} className="stroke-[3px]" />
            </button>

            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center mb-4 border-4 border-pink-200 shadow-sm">
              <Bot size={34} className="text-violet-600" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1 tracking-tight">
              Tạo Đề Bằng AI Tự Động
            </h3>
            <p className="text-sm font-bold text-gray-500 mb-6">
              Tải tài liệu PDF, DOCX, TXT hoặc dán trực tiếp nội dung bài giảng. AI sẽ phân tích và tạo trắc nghiệm hoàn chỉnh.
            </p>

            {aiError && (
              <div className="p-4 mb-6 bg-red-100 text-red-600 text-sm font-bold rounded-[20px] border-2 border-red-200 text-center">
                {aiError}
              </div>
            )}

            {/* Trạng thái đang xử lý: TIẾN TRÌNH 3 GIAI ĐOẠN */}
            {aiStatus === "polling" ? (
              <div className="bg-violet-50/80 rounded-[28px] p-6 border-4 border-violet-100 flex flex-col items-center py-8">
                {/* Thanh tiến trình */}
                <div className="w-full bg-violet-200/60 h-3 rounded-full overflow-hidden mb-6">
                  <div
                    className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 h-full rounded-full transition-all duration-700"
                    style={{ width: `${aiProgress}%` }}
                  />
                </div>

                {/* 3 Giai đoạn */}
                <div className="w-full space-y-4 mb-6">
                  <div
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                      aiStep >= 1
                        ? "bg-white border-violet-400 text-violet-900 shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-400"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        aiStep > 1
                          ? "bg-emerald-500 text-white"
                          : aiStep === 1
                          ? "bg-violet-600 text-white animate-pulse"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {aiStep > 1 ? "✓" : "1"}
                    </div>
                    <div>
                      <p className="font-black text-sm">Giai đoạn 1: Quét tài liệu</p>
                      <p className="text-xs text-gray-500">Bóc tách và nhận dạng văn bản nguồn</p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                      aiStep >= 2
                        ? "bg-white border-violet-400 text-violet-900 shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-400"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        aiStep > 2
                          ? "bg-emerald-500 text-white"
                          : aiStep === 2
                          ? "bg-violet-600 text-white animate-pulse"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {aiStep > 2 ? "✓" : "2"}
                    </div>
                    <div>
                      <p className="font-black text-sm">Giai đoạn 2: Gọi AI phân tích</p>
                      <p className="text-xs text-gray-500">Gemini trích xuất câu hỏi và đáp án đúng</p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                      aiStep >= 3
                        ? "bg-white border-violet-400 text-violet-900 shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-400"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        aiStep === 3
                          ? "bg-violet-600 text-white animate-pulse"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      3
                    </div>
                    <div>
                      <p className="font-black text-sm">Giai đoạn 3: Định dạng câu hỏi</p>
                      <p className="text-xs text-gray-500">Chuẩn hóa cấu trúc và lưu nháp (DRAFT)</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-bold text-violet-600 text-center animate-pulse">
                  Đang xử lý {aiProgress}%... Vui lòng không đóng cửa sổ này!
                </p>
              </div>
            ) : (
              /* Form chọn cách nạp nội dung */
              <div className="space-y-6">
                {/* Tabs chọn tải file hoặc dán bài giảng */}
                <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setAiInputTab("upload")}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
                      aiInputTab === "upload"
                        ? "bg-white text-violet-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Upload size={16} /> Tải File (PDF/DOCX/TXT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiInputTab("text")}
                    className={`flex-1 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
                      aiInputTab === "text"
                        ? "bg-white text-violet-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <AlignLeft size={16} /> Dán Bài Giảng Trực Tiếp
                  </button>
                </div>

                {/* Tab Tải file */}
                {aiInputTab === "upload" ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-5 rounded-[24px] border-4 border-gray-100">
                      <label className="block text-sm font-black text-gray-900 mb-2">
                        Chọn file từ máy tính
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="w-full text-sm font-bold text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-[16px] file:border-0 file:text-sm file:font-black file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200 cursor-pointer transition-colors outline-none"
                      />
                      {isUploading && (
                        <p className="text-sm text-violet-600 mt-3 font-bold animate-pulse">
                          Đang tải file lên máy chủ...
                        </p>
                      )}
                      {aiFileUrl && !isUploading && (
                        <p className="text-xs text-emerald-600 mt-2 font-bold flex items-center gap-1">
                          ✓ File đã sẵn sàng: {aiFileUrl.split("/").pop()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-1 bg-gray-100 flex-1 rounded-full"></div>
                      <span className="text-[11px] text-gray-400 font-black uppercase tracking-wider">
                        Hoặc Dán Đường Dẫn Trực Tiếp
                      </span>
                      <div className="h-1 bg-gray-100 flex-1 rounded-full"></div>
                    </div>

                    <div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FileText size={20} className="text-gray-400" />
                        </div>
                        <input
                          type="url"
                          placeholder="https://truong.edu.vn/tai-lieu.pdf"
                          value={aiFileUrl}
                          onChange={(e) => setAiFileUrl(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 text-sm font-bold border-4 border-gray-100 rounded-[20px] bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition-all placeholder-gray-400 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Tab Dán bài giảng */
                  <div>
                    <label className="block text-sm font-black text-gray-900 mb-2">
                      Nội Dung Bài Giảng / Tóm Tắt Kiến Thức
                    </label>
                    <textarea
                      rows={8}
                      placeholder="Dán toàn bộ bài giảng, tài liệu ôn tập hoặc đề cương vào đây (tối thiểu 100 từ)..."
                      value={lectureText}
                      onChange={(e) => setLectureText(e.target.value)}
                      className="w-full p-4 text-sm font-bold border-4 border-gray-100 rounded-[24px] bg-gray-50 focus:bg-white focus:border-violet-400 outline-none transition-all placeholder-gray-400 text-gray-900 resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1 font-semibold">
                      Đã nhập: {lectureText.length} ký tự
                    </p>
                  </div>
                )}

                <button
                  onClick={handleStartAIJob}
                  disabled={isUploading}
                  className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white font-black text-lg rounded-[20px] shadow-[0_6px_0_#4c1d95] active:translate-y-[6px] active:shadow-none transition-all uppercase tracking-wider flex justify-center items-center gap-2 disabled:opacity-60"
                >
                  <Bot size={22} />
                  <span>{isUploading ? "Đang Xử Lý..." : "Bắt Đầu Sinh Câu Hỏi"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-[20px] shadow-[0_12px_24px_rgba(0,0,0,0.15)] text-sm sm:text-base font-black text-white flex items-center gap-3 animate-fade-in-up z-50 border-4 ${
            toast.type === "ok"
              ? "bg-emerald-500 border-emerald-600"
              : "bg-red-500 border-red-600"
          }`}
        >
          {toast.type === "ok" ? (
            <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center">
              <Check size={16} className="stroke-[3px]" />
            </div>
          ) : (
            <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center">
              <X size={16} className="stroke-[3px]" />
            </div>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
