"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Link2,
  Layers,
  Copy,
  Sliders,
  HelpCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import { api } from "@/lib/api";
import BulkImportModal from "@/components/modals/BulkImportModal";
import { ParsedSlide } from "@/lib/quizParser";

export type SlideType = "QUIZ" | "FILL_IN_BLANK" | "MATCHING" | "POLL" | "WORD_CLOUD";
export type SlideStatus = "DRAFT" | "PUBLISHED";

export interface OptionDraft {
  id: string;
  content: string;
  isCorrect: boolean;
  matchingPair?: string;
  blankKeywords?: string;
}

export interface SlideDraft {
  id: string;
  type: SlideType;
  questionText: string;
  timeLimit: number;
  points: number;
  status: SlideStatus;
  options: OptionDraft[];
  isAIGenerated?: boolean;
}

const slideTypes: { type: SlideType; label: string; icon: string; desc: string }[] = [
  { type: "QUIZ", label: "Trắc Nghiệm", icon: "🎯", desc: "4 phương án chọn 1 hoặc nhiều đáp án đúng" },
  { type: "FILL_IN_BLANK", label: "Điền Khuyết", icon: "✏️", desc: "Học sinh gõ từ khóa còn thiếu vào chỗ trống" },
  { type: "MATCHING", label: "Ghép Nối", icon: "🔗", desc: "Nối các cặp khái niệm ở 2 cột tương ứng" },
  { type: "POLL", label: "Bình Chọn", icon: "📊", desc: "Khảo sát ý kiến người chơi không tính điểm" },
  { type: "WORD_CLOUD", label: "Đám Mây Từ", icon: "☁️", desc: "Thu thập từ khóa trực quan trên màn hình" },
];

const tempId = () => `slide-${Math.random().toString(36).slice(2, 9)}`;

const createDefaultSlide = (type: SlideType = "QUIZ"): SlideDraft => {
  let defaultOptions: OptionDraft[] = [];
  let defaultQuestion = "";

  if (type === "MATCHING") {
    defaultQuestion = "";
    defaultOptions = [
      { id: tempId(), content: "", isCorrect: true, matchingPair: "" },
      { id: tempId(), content: "", isCorrect: true, matchingPair: "" },
    ];
  } else if (type === "FILL_IN_BLANK") {
    defaultQuestion = "";
    defaultOptions = [
      { id: tempId(), content: "", isCorrect: true, blankKeywords: "" },
    ];
  } else if (type === "WORD_CLOUD") {
    defaultQuestion = "";
    defaultOptions = [];
  } else if (type === "POLL") {
    defaultQuestion = "";
    defaultOptions = [
      { id: tempId(), content: "", isCorrect: false },
      { id: tempId(), content: "", isCorrect: false },
    ];
  } else {
    defaultQuestion = "";
    defaultOptions = [
      { id: tempId(), content: "", isCorrect: true },
      { id: tempId(), content: "", isCorrect: false },
      { id: tempId(), content: "", isCorrect: false },
      { id: tempId(), content: "", isCorrect: false },
    ];
  }

  return {
    id: tempId(),
    type,
    questionText: defaultQuestion,
    timeLimit: 30,
    points: 1000,
    status: "DRAFT",
    options: defaultOptions,
  };
};

export default function SlideBuilder3Column({ quizId }: { quizId: string }) {
  const router = useRouter();

  const [quizTitle, setQuizTitle] = useState("Bộ Đề Học Tập Mới");
  const [slides, setSlides] = useState<SlideDraft[]>([createDefaultSlide("QUIZ")]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // AI Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiQuestionCount, setAiQuestionCount] = useState<number | "">("");
  const [aiStatus, setAiStatus] = useState<"idle" | "polling" | "success" | "error">("idle");
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStep, setAiStep] = useState(1);

  // Bulk Import Modal
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const activeSlide = slides[activeSlideIndex] || slides[0];

  // Fetch dữ liệu quiz nếu có trên server
  useEffect(() => {
    async function loadQuiz() {
      if (!quizId || quizId === "new") return;
      try {
        setLoading(true);
        const res = await api.get(`/quizzes/${quizId}`);
        const data = res.data?.data || res.data;
        if (data?.title) setQuizTitle(data.title);
        if (Array.isArray(data?.slides) && data.slides.length > 0) {
          setSlides(
            data.slides.map((s: any) => ({
              id: s.id || tempId(),
              type: s.type || "QUIZ",
              questionText: s.questionText || s.title || "",
              timeLimit: s.timeLimit || 30,
              points: s.points || 1000,
              status: s.status || "DRAFT",
              options: Array.isArray(s.options)
                ? s.options.map((o: any) => ({
                    id: o.id || tempId(),
                    content: o.content || o.text || "",
                    isCorrect: !!o.isCorrect,
                    matchingPair: o.matchingPair,
                    blankKeywords: o.blankKeywords,
                  }))
                : [],
            }))
          );
        } else {
          // Kiểm tra xem có slide vừa import từ trang quiz/create không
          const pendingStr = sessionStorage.getItem("pending_import_slides");
          if (pendingStr) {
            try {
              const pending = JSON.parse(pendingStr);
              if (Array.isArray(pending) && pending.length > 0) {
                setSlides(pending);
                sessionStorage.removeItem("pending_import_slides");
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Không tải được slides từ server:", err);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId]);

  // Cập nhật slide hiện tại
  const updateActiveSlide = (patch: Partial<SlideDraft>) => {
    setSlides((prev) => {
      const next = [...prev];
      if (next[activeSlideIndex]) {
        next[activeSlideIndex] = { ...next[activeSlideIndex], ...patch };
      }
      return next;
    });
    setSaveStatus("unsaved");
  };

  // Thêm slide mới
  const handleAddSlide = (type: SlideType) => {
    const newSlide = createDefaultSlide(type);
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideIndex(slides.length);
    setSaveStatus("unsaved");
  };

  // Xóa slide
  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      setToastMsg({ text: "Bộ đề cần có ít nhất 1 slide câu hỏi!", type: "error" });
      return;
    }
    setSlides((prev) => prev.filter((_, i) => i !== index));
    if (activeSlideIndex >= index && activeSlideIndex > 0) {
      setActiveSlideIndex(activeSlideIndex - 1);
    }
    setSaveStatus("unsaved");
  };

  // Nhân bản slide
  const handleDuplicateSlide = (index: number) => {
    const target = slides[index];
    const clone: SlideDraft = {
      ...target,
      id: tempId(),
      questionText: `${target.questionText} (Bản sao)`,
      options: target.options.map((o) => ({ ...o, id: tempId() })),
    };
    setSlides((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
    setActiveSlideIndex(index + 1);
    setSaveStatus("unsaved");
  };

  // Đổi thứ tự slide
  const handleMoveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      const item = next.splice(from, 1)[0];
      next.splice(to, 0, item);
      return next;
    });
    setActiveSlideIndex(to);
    setSaveStatus("unsaved");
  };

  // Lưu toàn bộ slide
  const handleSaveAll = async () => {
    try {
      setSaveStatus("saving");
      await api.put(`/quizzes/${quizId}`, {
        title: quizTitle,
        slides: slides.map((s, idx) => ({
          type: s.type,
          questionText: s.questionText,
          timeLimit: s.timeLimit || 30,
          points: s.points || 1000,
          status: "PUBLISHED",
          orderIndex: idx,
          isAIGenerated: s.isAIGenerated || false,
          options: (s.options || []).map((opt, oIdx) => ({
            content: opt.content || "",
            isCorrect: opt.isCorrect ?? false,
            orderIndex: oIdx,
            matchingPair: opt.matchingPair || null,
            blankKeywords: opt.blankKeywords || null,
          })),
        })),
      });
      setSaveStatus("saved");
      setToastMsg({ text: "Đã lưu bộ đề và xuất bản thành công!", type: "success" });
    } catch (err: any) {
      setSaveStatus("unsaved");
      setToastMsg({
        text: err?.response?.data?.message || "Không thể lưu bộ đề lên máy chủ. Vui lòng thử lại!",
        type: "error",
      });
    }
  };

  // Sinh đề AI
  const handleStartAiGenerate = async () => {
    if (!aiPrompt.trim() && !aiFile) {
      setToastMsg({ text: "Vui lòng nhập chủ đề hoặc tải file tài liệu!", type: "error" });
      return;
    }

    setAiStatus("polling");
    setAiProgress(20);
    setAiStep(1);

    try {
      const formData = new FormData();
      if (aiFile) {
        formData.append("file", aiFile);
      }
      if (aiPrompt.trim()) {
        formData.append("prompt", aiPrompt.trim());
      }
      if (typeof aiQuestionCount === "number" && aiQuestionCount > 0) {
        formData.append("questionCount", aiQuestionCount.toString());
      }

      setAiProgress(45);
      setAiStep(2);

      const res = await api.post("/aijobs/parse-document", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setAiProgress(85);
      setAiStep(3);

      const rawData = res.data?.data || res.data;
      let generatedItems: any[] = [];
      if (typeof rawData === "string") {
        try {
          generatedItems = JSON.parse(rawData);
        } catch {
          generatedItems = [];
        }
      } else if (Array.isArray(rawData)) {
        generatedItems = rawData;
      }

      if (!Array.isArray(generatedItems) || generatedItems.length === 0) {
        throw new Error("Không thể trích xuất câu hỏi từ tài liệu này.");
      }

      const newAiSlides: SlideDraft[] = generatedItems.map((item: any) => {
        const rawType = (item.type || item.questionType || "QUIZ").toUpperCase();
        const slideType = ["QUIZ", "FILL_IN_BLANK", "MATCHING", "POLL", "WORD_CLOUD"].includes(rawType)
          ? (rawType as SlideType)
          : "QUIZ";
        return {
          id: tempId(),
          type: slideType,
          questionText: item.questionText || "Câu hỏi",
        timeLimit: item.timeLimit > 0 ? item.timeLimit : 30,
        points: item.points > 0 ? item.points : 1000,
        status: "PUBLISHED",
        isAIGenerated: true,
        options: Array.isArray(item.options)
          ? item.options.map((opt: any) => ({
              id: tempId(),
              content: opt.content || opt.text || "",
              isCorrect: !!opt.isCorrect,
              matchingPair: opt.matchingPair,
              blankKeywords: opt.blankKeywords,
            }))
          : [],
        };
      });

      setAiProgress(100);
      setAiStatus("success");

      setTimeout(() => {
        const startIdx = slides.length;
        setSlides((prev) => [...prev, ...newAiSlides]);
        setActiveSlideIndex(startIdx);
        setSaveStatus("unsaved");
        setAiModalOpen(false);
        setAiStatus("idle");
        setAiFile(null);
        setAiPrompt("");
        setAiQuestionCount("");
        setToastMsg({
          text: `✨ AI đã tạo thành công ${newAiSlides.length} câu hỏi vào bộ đề!`,
          type: "success",
        });
      }, 500);
    } catch (err: any) {
      console.error("Lỗi khi sinh đề AI:", err);
      setAiStatus("idle");
      setToastMsg({
        text: err?.response?.data?.message || err?.message || "Lỗi khi sinh đề AI. Vui lòng thử lại!",
        type: "error",
      });
    }
  };

  // Nhập hàng loạt câu hỏi từ Modal (Text/Word/PDF/Excel)
  const handleBulkImportQuestions = (importedList: ParsedSlide[]) => {
    if (!importedList || importedList.length === 0) return;

    const newSlides: SlideDraft[] = importedList.map((p) => ({
      id: tempId(),
      type: p.type,
      questionText: p.questionText,
      timeLimit: p.timeLimit,
      points: p.points,
      status: "PUBLISHED",
      isAIGenerated: false,
      options: p.options.map((opt) => ({
        id: tempId(),
        content: opt.content,
        isCorrect: opt.isCorrect,
        matchingPair: opt.matchingPair,
        blankKeywords: opt.blankKeywords,
      })),
    }));

    const startIdx = slides.length;
    setSlides((prev) => [...prev, ...newSlides]);
    setActiveSlideIndex(startIdx);
    setSaveStatus("unsaved");
    setToastMsg({
      text: `🎉 Đã nhập thành công ${newSlides.length} câu hỏi vào bộ đề!`,
      type: "success",
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans h-screen overflow-hidden">
      {/* ── TOP HEADER ── */}
      <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 md:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/library"
            className="p-2 rounded-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Quay lại Thư viện"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => {
                setQuizTitle(e.target.value);
                setSaveStatus("unsaved");
              }}
              className="text-base md:text-lg font-bold font-heading text-[#0F172A] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 px-2 py-0.5 rounded outline-none transition-all"
              placeholder="Nhập tên bộ đề..."
            />
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium mr-2">
            {saveStatus === "saving" ? (
              <span className="flex items-center gap-1.5 text-indigo-600">
                <RotateCcw size={13} className="animate-spin" /> Đang lưu...
              </span>
            ) : saveStatus === "unsaved" ? (
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Chưa lưu
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 size={14} /> Đã lưu
              </span>
            )}
          </div>

          <button
            onClick={() => setBulkImportOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-heading font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Nhập hàng loạt từ Word/PDF/Excel"
          >
            <Layers size={14} className="text-amber-600" />
            <span>📥 Nhập Hàng Loạt</span>
          </button>

          <button
            onClick={() => setAiModalOpen(true)}
            className="px-3.5 py-2 rounded-[10px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white font-bold text-xs shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 font-heading active:scale-95 transition-all"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">✨ AI Generator</span>
          </button>

          <button
            onClick={handleSaveAll}
            className="px-4 py-2 rounded-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 font-heading active:scale-95 transition-all"
          >
            <Save size={14} />
            <span>Lưu & Xuất Bản</span>
          </button>
        </div>
      </header>

      {/* Toast */}
      {toastMsg && (
        <div
          className={`absolute top-20 right-6 z-50 p-3.5 rounded-[12px] border text-xs font-bold shadow-md flex items-center gap-2 animate-in fade-in ${
            toastMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toastMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* ── 3-COLUMN WORKSPACE LAYOUT ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── CỘT 1: THUMBNAILS DANH SÁCH SLIDE (TRÁI - 260px) ── */}
        <aside className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-heading">
              Slides ({slides.length})
            </span>

            {/* Nút thêm slide & Nhập nhanh */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setBulkImportOpen(true)}
                className="px-2 py-1 rounded-[8px] bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold flex items-center gap-1 transition-all border border-amber-200 cursor-pointer"
                title="Nhập nhanh từ Word/PDF/Excel"
              >
                <Layers size={12} />
                <span>Nhập file</span>
              </button>

              <div className="relative group">
                <button
                  className="px-2.5 py-1 rounded-[8px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 transition-all"
                  title="Thêm slide câu hỏi"
                >
                  <Plus size={14} />
                  <span>Thêm</span>
                </button>

              {/* Menu chọn loại câu hỏi khi hover/click */}
              <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-[#E2E8F0] rounded-[14px] shadow-lg p-1.5 hidden group-hover:block z-40 animate-in fade-in">
                {slideTypes.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => handleAddSlide(t.type)}
                    className="w-full text-left p-2 rounded-[8px] hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 text-slate-700 transition-colors"
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

          {/* List thumbnails */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {slides.map((s, idx) => {
              const active = idx === activeSlideIndex;
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`group relative p-2.5 rounded-[12px] border text-left cursor-pointer transition-all duration-150 flex items-start gap-2 ${
                    active
                      ? "bg-indigo-50/70 border-indigo-500 shadow-sm ring-1 ring-indigo-400/40"
                      : "bg-white border-[#E2E8F0] hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-[6px] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                      active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1">
                      <span>{slideTypes.find((t) => t.type === s.type)?.icon}</span>
                      <span className="truncate">{slideTypes.find((t) => t.type === s.type)?.label}</span>
                      {s.isAIGenerated && (
                        <span className="text-[9px] px-1 rounded bg-purple-100 text-purple-700 font-bold ml-auto">
                          AI
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                      {s.questionText || "(Chưa nhập nội dung)"}
                    </p>
                  </div>

                  {/* Actions mini */}
                  <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateSlide(idx);
                      }}
                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                      title="Nhân bản"
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlide(idx);
                      }}
                      className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                      title="Xóa"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── CỘT 2: CANVAS TRUNG TÂM (SOẠN THẢO VÀ TRẢI NGHIỆM TRỰC QUAN) ── */}
        <main className="flex-1 bg-slate-100/70 p-4 md:p-8 overflow-y-auto flex flex-col items-center justify-start">
          <div className="w-full max-w-3xl bg-white border border-[#E2E8F0] rounded-[24px] p-6 md:p-8 shadow-sm space-y-6">
            {/* Slide Question Prompt Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                  Câu hỏi #{activeSlideIndex + 1} • {slideTypes.find((t) => t.type === activeSlide.type)?.label}
                </span>
                <span className="text-xs text-slate-400">
                  {activeSlide.timeLimit}s • {activeSlide.points} pts
                </span>
              </div>
              <textarea
                value={activeSlide.questionText}
                onChange={(e) => updateActiveSlide({ questionText: e.target.value })}
                placeholder="Nhập nội dung câu hỏi tại đây..."
                rows={3}
                className="w-full text-lg md:text-xl font-bold font-sans text-[#0F172A] bg-slate-50 border border-[#E2E8F0] focus:border-indigo-500 focus:bg-white rounded-[14px] p-4 outline-none transition-all placeholder-slate-300 resize-none"
              />
            </div>

            {/* ── 5 DẠNG CÂU HỎI INTERACTIVE CANVAS ── */}

            {/* DẠNG 1: TRẮC NGHIỆM (QUIZ - 4 NÚT ĐÁP ÁN ĐA SẮC) */}
            {activeSlide.type === "QUIZ" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                {activeSlide.options.map((opt, oIdx) => {
                  const colors = [
                    { border: "border-red-400", badge: "bg-red-500", label: "A" },
                    { border: "border-blue-400", badge: "bg-blue-500", label: "B" },
                    { border: "border-amber-400", badge: "bg-amber-500", label: "C" },
                    { border: "border-emerald-400", badge: "bg-emerald-500", label: "D" },
                  ];
                  const c = colors[oIdx % colors.length];

                  return (
                    <div
                      key={opt.id}
                      className={`relative rounded-[16px] border-2 p-3.5 transition-all flex items-center gap-3 ${
                        opt.isCorrect
                          ? `${c.border} bg-white shadow-sm ring-2 ring-indigo-500/30`
                          : "border-slate-200 bg-slate-50/50 hover:bg-white"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-[8px] text-white font-extrabold text-xs flex items-center justify-center shrink-0 ${c.badge}`}
                      >
                        {c.label}
                      </span>

                      <input
                        type="text"
                        value={opt.content}
                        onChange={(e) => {
                          const newOpts = [...activeSlide.options];
                          newOpts[oIdx] = { ...opt, content: e.target.value };
                          updateActiveSlide({ options: newOpts });
                        }}
                        placeholder={`Nội dung đáp án ${c.label}...`}
                        className="flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder-slate-400"
                      />

                      {/* Nút check đúng/sai */}
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = [...activeSlide.options];
                          newOpts[oIdx] = { ...opt, isCorrect: !opt.isCorrect };
                          updateActiveSlide({ options: newOpts });
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                          opt.isCorrect
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                            : "border-slate-300 hover:border-slate-400 text-transparent"
                        }`}
                        title={opt.isCorrect ? "Đáp án ĐÚNG" : "Bấm để chọn làm đáp án đúng"}
                      >
                        <Check size={14} className="stroke-[3px]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DẠNG 2: ĐIỀN KHUYẾT (FILL_IN_BLANK) */}
            {activeSlide.type === "FILL_IN_BLANK" && (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-[14px] bg-slate-50 border border-slate-200 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800 mb-1">Quy cách định dạng:</p>
                  Sử dụng ký hiệu <code className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">[...]</code> trong câu hỏi ở trên để chỉ định vị trí cần điền.
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">
                    Từ khóa chấp nhận (phân cách bằng dấu phẩy):
                  </label>
                  <input
                    type="text"
                    value={activeSlide.options[0]?.blankKeywords || activeSlide.options[0]?.content || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateActiveSlide({
                        options: [
                          {
                            id: activeSlide.options[0]?.id || tempId(),
                            content: val.split(",")[0]?.trim() || "",
                            isCorrect: true,
                            blankKeywords: val,
                          },
                        ],
                      });
                    }}
                    placeholder="Ví dụ: Hà Nội, Ha Noi, HaNoi"
                    className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-[12px] text-sm font-semibold outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Người chơi nhập bất kỳ từ khóa nào trong danh sách trên đều được tính điểm.
                  </p>
                </div>
              </div>
            )}

            {/* DẠNG 3: GHÉP NỐI (MATCHING) */}
            {activeSlide.type === "MATCHING" && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-slate-500">CÁC CẶP GHÉP TƯƠNG ỨNG:</p>
                {activeSlide.options.map((opt, oIdx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.content}
                      onChange={(e) => {
                        const newOpts = [...activeSlide.options];
                        newOpts[oIdx] = { ...opt, content: e.target.value };
                        updateActiveSlide({ options: newOpts });
                      }}
                      placeholder={`Vế A #${oIdx + 1}`}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-[12px] text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white"
                    />

                    <div className="p-2 text-indigo-500 shrink-0">
                      <Link2 size={16} />
                    </div>

                    <input
                      type="text"
                      value={opt.matchingPair || ""}
                      onChange={(e) => {
                        const newOpts = [...activeSlide.options];
                        newOpts[oIdx] = { ...opt, matchingPair: e.target.value };
                        updateActiveSlide({ options: newOpts });
                      }}
                      placeholder={`Vế B tương ứng #${oIdx + 1}`}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-[12px] text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white"
                    />

                    <button
                      onClick={() => {
                        const newOpts = activeSlide.options.filter((_, i) => i !== oIdx);
                        updateActiveSlide({ options: newOpts });
                      }}
                      className="p-2 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => {
                    updateActiveSlide({
                      options: [
                        ...activeSlide.options,
                        { id: tempId(), content: "", matchingPair: "", isCorrect: true },
                      ],
                    });
                  }}
                  className="px-3 py-1.5 rounded-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus size={14} /> Thêm cặp nối
                </button>
              </div>
            )}

            {/* DẠNG 4: BÌNH CHỌN (POLL) */}
            {activeSlide.type === "POLL" && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-slate-500">CÁC TÙY CHỌN KHẢO SÁT:</p>
                {activeSlide.options.map((opt, oIdx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {oIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={opt.content}
                      onChange={(e) => {
                        const newOpts = [...activeSlide.options];
                        newOpts[oIdx] = { ...opt, content: e.target.value };
                        updateActiveSlide({ options: newOpts });
                      }}
                      placeholder={`Tùy chọn ${oIdx + 1}...`}
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-[12px] text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white"
                    />
                    <button
                      onClick={() => {
                        const newOpts = activeSlide.options.filter((_, i) => i !== oIdx);
                        updateActiveSlide({ options: newOpts });
                      }}
                      className="p-2 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    updateActiveSlide({
                      options: [
                        ...activeSlide.options,
                        { id: tempId(), content: `Phương án ${activeSlide.options.length + 1}`, isCorrect: false },
                      ],
                    });
                  }}
                  className="px-3 py-1.5 rounded-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus size={14} /> Thêm tùy chọn
                </button>
              </div>
            )}

            {/* DẠNG 5: ĐÁM MÂY TỪ (WORD_CLOUD) */}
            {activeSlide.type === "WORD_CLOUD" && (
              <div className="p-6 rounded-[18px] bg-indigo-50/50 border border-indigo-100 text-center space-y-3">
                <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
                  <span className="px-3 py-1 bg-white text-indigo-600 font-bold text-xs rounded-full shadow-sm">
                    Sáng tạo 💡
                  </span>
                  <span className="px-4 py-1.5 bg-indigo-600 text-white font-extrabold text-sm rounded-full shadow-sm">
                    Hào hứng 🔥
                  </span>
                  <span className="px-2.5 py-1 bg-white text-purple-600 font-bold text-xs rounded-full shadow-sm">
                    Bổ ích ✨
                  </span>
                  <span className="px-3 py-1 bg-white text-emerald-600 font-bold text-xs rounded-full shadow-sm">
                    Vui vẻ 🎉
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Người chơi sẽ nhập các từ khóa từ điện thoại. Các từ được nhập nhiều lần sẽ phóng to và đổi màu rực rỡ trên màn hình Host.
                </p>
              </div>
            )}
          </div>
        </main>

        {/* ── CỘT 3: CÀI ĐẶT THÔNG SỐ & AI TRỢ LÝ (PHẢI - 300px) ── */}
        <aside className="w-72 bg-white border-l border-[#E2E8F0] p-5 overflow-y-auto shrink-0 space-y-6">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading block mb-3">
              Cài Đặt Câu Hỏi
            </span>

            {/* Loại câu hỏi */}
            <div className="space-y-1.5 mb-5">
              <label className="text-xs font-bold text-slate-700">Loại slide</label>
              <select
                value={activeSlide.type}
                onChange={(e) => updateActiveSlide({ type: e.target.value as SlideType })}
                className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-[10px] text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
              >
                {slideTypes.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Thời gian */}
            <div className="space-y-1.5 mb-5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" /> Thời gian trả lời
                </span>
                <span className="text-indigo-600 font-extrabold">{activeSlide.timeLimit}s</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[15, 30, 60, 90].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => updateActiveSlide({ timeLimit: sec })}
                    className={`py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                      activeSlide.timeLimit === sec
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Điểm số */}
            <div className="space-y-1.5 mb-5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-500" /> Điểm thưởng
                </span>
                <span className="text-amber-600 font-extrabold">{activeSlide.points} pts</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Chuẩn", pts: 1000 },
                  { label: "Gấp đôi", pts: 2000 },
                  { label: "Không", pts: 0 },
                ].map((p) => (
                  <button
                    key={p.pts}
                    onClick={() => updateActiveSlide({ points: p.pts })}
                    className={`py-1.5 rounded-[8px] text-xs font-bold transition-all ${
                      activeSlide.points === p.pts
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Trạng thái slide */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Trạng thái phát hành</label>
              <div className="flex rounded-[10px] bg-slate-100 p-1">
                <button
                  onClick={() => updateActiveSlide({ status: "DRAFT" })}
                  className={`flex-1 py-1 text-xs font-bold rounded-[8px] ${
                    activeSlide.status === "DRAFT" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Nháp
                </button>
                <button
                  onClick={() => updateActiveSlide({ status: "PUBLISHED" })}
                  className={`flex-1 py-1 text-xs font-bold rounded-[8px] ${
                    activeSlide.status === "PUBLISHED" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500"
                  }`}
                >
                  Duyệt
                </button>
              </div>
            </div>
          </div>

          {/* AI Helper Card Box */}
          <div className="p-4 rounded-[16px] bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-purple-200/60 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs font-heading">
              <Sparkles size={15} />
              <span>Gợi ý câu hỏi tương tự</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Bạn có thể nhờ AI đề xuất thêm 3 phương án bẫy trắc nghiệm hoặc gợi ý câu hỏi tiếp theo dựa trên nội dung bài giảng hiện tại.
            </p>
            <button
              onClick={() => {
                setAiPrompt(activeSlide.questionText || "Toán học và logic");
                setAiModalOpen(true);
              }}
              className="w-full py-2 rounded-[10px] bg-white hover:bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Bot size={14} />
              <span>Sinh bẫy trắc nghiệm</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ── MODAL AI GENERATOR TIẾN TRÌNH 3 BƯỚC ── */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A] font-heading">
                    ✨ AI Generator Bộ Đề
                  </h3>
                  <p className="text-xs text-slate-400">Sinh trắc nghiệm tự động từ chủ đề hoặc tài liệu</p>
                </div>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {aiStatus === "polling" ? (
              <div className="py-6 space-y-4">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${aiProgress}%` }}
                  />
                </div>

                <div className="space-y-2 text-xs font-semibold">
                  <div className={`p-2.5 rounded-lg flex items-center gap-2 ${aiStep >= 1 ? "bg-indigo-50 text-indigo-700" : "text-slate-400"}`}>
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center font-bold">1</span>
                    <span>Bóc tách văn bản và nhận diện chủ đề</span>
                  </div>
                  <div className={`p-2.5 rounded-lg flex items-center gap-2 ${aiStep >= 2 ? "bg-purple-50 text-purple-700" : "text-slate-400"}`}>
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center font-bold">2</span>
                    <span>Tạo phương án nhiễu & đáp án chuẩn</span>
                  </div>
                  <div className={`p-2.5 rounded-lg flex items-center gap-2 ${aiStep >= 3 ? "bg-pink-50 text-pink-700" : "text-slate-400"}`}>
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center font-bold">3</span>
                    <span>Định dạng 5 loại slide tương tác</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Chủ đề hoặc nội dung tóm tắt:
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ví dụ: Lịch sử nhà Trần, định luật bảo toàn năng lượng, từ vựng IELTS band 7..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-[12px] text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Hoặc tải lên tài liệu (.pdf, .docx, .txt):
                  </label>
                  <label className="border-2 border-dashed border-[#E2E8F0] hover:border-indigo-400 rounded-[14px] p-4 text-center cursor-pointer block bg-slate-50 hover:bg-indigo-50/30 transition-all">
                    <Upload size={20} className="mx-auto text-indigo-500 mb-1" />
                    <span className="text-xs font-bold text-slate-600 block">
                      {aiFile ? aiFile.name : "Kéo thả hoặc nhấp để chọn tệp tài liệu"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => setAiFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Số lượng câu hỏi muốn sinh:
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Tùy chọn</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={aiQuestionCount}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                      setAiQuestionCount(val);
                    }}
                    placeholder="Để trống để sinh toàn bộ theo tài liệu (ví dụ: 5, 10, 20...)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-[12px] text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                  />
                  <p className="text-[11px] text-indigo-600 mt-1.5 flex items-start gap-1 font-medium leading-relaxed">
                    <span className="shrink-0">💡</span>
                    <span>
                      Nếu không nhập, AI sẽ tự động phân tích và sinh ra số lượng câu hỏi bằng đúng số lượng câu hỏi có trong tài liệu đã đưa.
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAiModalOpen(false)}
                    className="px-4 py-2 rounded-[10px] text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleStartAiGenerate}
                    className="px-5 py-2 rounded-[10px] bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    Bắt Đầu Tạo Với AI
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL NHẬP HÀNG LOẠT (BULK IMPORT) ── */}
      <BulkImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImport={handleBulkImportQuestions}
      />
    </div>
  );
}
