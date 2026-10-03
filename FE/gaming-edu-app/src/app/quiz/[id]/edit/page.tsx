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
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
  "bg-red-500",
  "bg-blue-500",
  "bg-yellow-500",
  "bg-green-500",
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
    <div className="flex items-center gap-2">
      {/* Letter badge */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-800 text-white flex-shrink-0 ${
          optionBgColors[idx % 4]
        }`}
      >
        {letters[idx]}
      </div>

      {/* Text Input */}
      <input
        type="text"
        placeholder={`Đáp án ${letters[idx]}`}
        value={opt.content}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-500 text-gray-900"
        id={`input-option-${opt.id}`}
      />

      {/* Correct toggle */}
      {isCorrectable && (
        <button
          type="button"
          onClick={onToggleCorrect}
          title={opt.isCorrect ? "Đáp án đúng" : "Đánh dấu đúng"}
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all border-2 ${
            opt.isCorrect
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-gray-300 text-gray-400 hover:border-emerald-400 hover:text-emerald-500"
          }`}
          id={`btn-correct-${opt.id}`}
        >
          <Check size={14} />
        </button>
      )}

      {/* Delete option */}
      <button
        type="button"
        onClick={onDelete}
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
        id={`btn-delete-opt-${opt.id}`}
      >
        <X size={14} />
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
      className={`bg-white rounded-2xl border shadow-sm transition-all animate-fade-in-up ${
        slide.isExpanded ? "border-violet-300" : "border-gray-100"
      }`}
      id={`slide-card-${slide.id}`}
    >
      {/* Card Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => onUpdate({ isExpanded: !slide.isExpanded })}
      >
        <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
        <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-800 text-gray-500 flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-600 text-gray-500">
              {slideTypes.find((t) => t.type === slide.type)?.icon}{" "}
              {slideTypes.find((t) => t.type === slide.type)?.label}
            </span>
            <span
              className={`text-xs font-700 px-2 py-0.5 rounded-full ${
                slide.status === "PUBLISHED"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {slide.status === "PUBLISHED" ? "✓ Published" : "Draft"}
            </span>
            {hasError && (
              <AlertCircle size={13} className="text-amber-500" />
            )}
          </div>
          <p className="text-sm font-700 text-gray-900 truncate mt-0.5">
            {slide.questionText || (
              <span className="text-gray-400 font-400 italic">
                Chưa có câu hỏi...
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {slide.isExpanded ? (
            <ChevronUp size={15} className="text-gray-400" />
          ) : (
            <ChevronDown size={15} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Body */}
      {slide.isExpanded && (
        <div className="border-t border-gray-100 p-5 space-y-5">
          {/* Type + Config Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Type selector */}
            <div className="col-span-2">
              <label className="text-xs font-700 text-gray-600 block mb-1.5 uppercase tracking-wide">
                Loại câu hỏi
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {slideTypes.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => onUpdate({ type: t.type })}
                    className={`text-xs font-700 px-2.5 py-1.5 rounded-lg border transition-all ${
                      slide.type === t.type
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    id={`btn-type-${t.type}-slide-${slide.id}`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            <div>
              <label className="text-xs font-700 text-gray-600 block mb-1.5 uppercase tracking-wide">
                <Clock size={11} className="inline mr-1" />
                Thời gian (s)
              </label>
              <select
                value={slide.timeLimit}
                onChange={(e) =>
                  onUpdate({ timeLimit: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-600"
                id={`sel-time-${slide.id}`}
              >
                {[10, 15, 20, 30, 45, 60, 90, 120].map((t) => (
                  <option key={t} value={t}>
                    {t}s
                  </option>
                ))}
              </select>
            </div>

            {/* Points */}
            <div>
              <label className="text-xs font-700 text-gray-600 block mb-1.5 uppercase tracking-wide">
                <Zap size={11} className="inline mr-1" />
                Điểm thưởng
              </label>
              <select
                value={slide.points}
                onChange={(e) => onUpdate({ points: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-600"
                id={`sel-points-${slide.id}`}
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
            <label className="text-xs font-700 text-gray-600 block mb-1.5 uppercase tracking-wide">
              Nội Dung Câu Hỏi
            </label>
            <textarea
              value={slide.questionText}
              onChange={(e) => onUpdate({ questionText: e.target.value })}
              placeholder="Nhập câu hỏi của bạn vào đây..."
              rows={3}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all resize-none font-500 text-gray-900"
              id={`textarea-question-${slide.id}`}
            />
          </div>

          {/* Options (for QUIZ / POLL types) */}
          {(slide.type === "QUIZ" || slide.type === "POLL") && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-700 text-gray-600 uppercase tracking-wide">
                  Đáp Án{" "}
                  {slide.type === "QUIZ" && (
                    <span className="text-gray-400 font-500 normal-case tracking-normal">
                      (bấm ✓ để chọn đáp án đúng)
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  disabled={slide.options.length >= 6}
                  className="text-xs font-700 text-violet-600 hover:text-violet-800 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  id={`btn-add-opt-${slide.id}`}
                >
                  <Plus size={12} /> Thêm đáp án
                </button>
              </div>
              <div className="space-y-2">
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
            <div>
              <label className="text-xs font-700 text-gray-600 block mb-1.5 uppercase tracking-wide">
                Từ khóa đáp án đúng
              </label>
              <input
                type="text"
                placeholder="VD: hà nội, thủ đô (phân cách bằng dấu phẩy)"
                value={slide.options[0]?.content ?? ""}
                onChange={(e) =>
                  updateOption(0, { content: e.target.value, isCorrect: true })
                }
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-500"
                id={`input-fill-blank-${slide.id}`}
              />
            </div>
          )}

          {/* WORD_CLOUD hint */}
          {slide.type === "WORD_CLOUD" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
              ☁️ Người chơi sẽ nhập từ bất kỳ. Hệ thống tạo đám mây từ tự động.
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    status:
                      slide.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                  })
                }
                className={`text-xs font-700 px-3 py-1.5 rounded-lg border transition-all ${
                  slide.status === "PUBLISHED"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-600"
                }`}
                id={`btn-toggle-status-${slide.id}`}
              >
                {slide.status === "PUBLISHED"
                  ? "✓ Published – Bỏ publish"
                  : "○ Draft – Publish ngay"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDelete}
                className="text-xs font-600 text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1.5 hover:bg-red-50 rounded-lg transition-colors"
                id={`btn-delete-slide-${slide.id}`}
              >
                <Trash2 size={12} /> Xóa
              </button>
              <Button
                variant="primary"
                size="sm"
                loading={slide.isSaving}
                onClick={onSave}
                id={`btn-save-slide-${slide.id}`}
              >
                <Save size={13} />
                {slide.isSaving ? "Đang lưu..." : "Lưu Câu Hỏi"}
              </Button>
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
  const [savingAll, setSavingAll] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Auth guard
  useEffect(() => {
    if (!Cookies.get("token")) {
      router.push("/auth/login");
    }
  }, [router]);

  // Load quiz detail
  useEffect(() => {
    api
      .get(`/quizzes/${quizId}`)
      .then((res) => {
        if (res.data.success) {
          const q = res.data.data;
          setQuiz(q);
          // Convert server slides to draft format
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
              isSaving: false,
            })
          );
          setSlides(draftSlides);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingQuiz(false));
  }, [quizId]);

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
    // Collapse all others
    setSlides((prev) => [
      ...prev.map((s) => ({ ...s, isExpanded: false })),
      newSlide,
    ]);
  };

  const deleteSlide = (id: string) => {
    if (!confirm("Xóa câu hỏi này?")) return;
    setSlides((prev) => prev.filter((s) => s.id !== id));
    // TODO: if slide is saved in DB, call api.delete
  };

  // Save a single slide (create or update)
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
      // If slide id starts with "new-", it's not in DB yet
      if (slide.id.startsWith("new-")) {
        const res = await api.post(`/quizzes/${quizId}/slides`, payload);
        if (res.data.success) {
          const savedSlide = res.data.data;
          // Replace temp id with real id
          setSlides((prev) =>
            prev.map((s) =>
              s.id === id
                ? { ...s, id: savedSlide.id ?? id, isSaving: false }
                : s
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
      showToast(
        err.response?.data?.message ?? "Lỗi khi lưu câu hỏi",
        "err"
      );
    }
  };

  if (loadingQuiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-600">Đang tải bộ đề...</p>
        </div>
      </div>
    );
  }

  const publishedCount = slides.filter((s) => s.status === "PUBLISHED").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            id="btn-back"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2 mr-auto">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Trophy size={14} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-800 text-gray-900 leading-tight truncate max-w-[180px] sm:max-w-xs">
                {quiz?.title ?? "Bộ đề chưa đặt tên"}
              </span>
              <span className="text-xs text-gray-500">
                {slides.length} câu hỏi &bull; {publishedCount} đã publish
              </span>
            </div>
          </div>

          <Button variant="outline" size="sm" id="btn-preview-quiz" href={`/quiz/${quizId}`}>
            <Eye size={13} /> Xem Trước
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Info bar */}
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-6 flex items-center gap-3 animate-fade-in-up">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="font-700 text-violet-900 text-sm">
              Chế độ chỉnh sửa câu hỏi
            </div>
            <div className="text-xs text-violet-700">
              Thêm, sửa, xóa câu hỏi. Nhấn{" "}
              <strong>Lưu Câu Hỏi</strong> để lưu từng câu. Publish câu hỏi
              trước khi bắt đầu trò chơi.
            </div>
          </div>
        </div>

        {/* Slides */}
        <div className="space-y-3 mb-6">
          {slides.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center animate-fade-in-up">
              <div className="text-4xl mb-3">📝</div>
              <p className="font-700 text-gray-700 mb-1">
                Chưa có câu hỏi nào
              </p>
              <p className="text-sm text-gray-500 mb-5">
                Thêm câu hỏi đầu tiên của bộ đề này
              </p>
              <Button
                variant="primary"
                onClick={() => addNewSlide("QUIZ")}
                id="btn-add-first-slide"
              >
                <Plus size={15} /> Thêm Câu Hỏi
              </Button>
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-fade-in-up">
          <p className="text-sm font-700 text-gray-700 mb-3">
            Thêm câu hỏi mới
          </p>
          <div className="flex flex-wrap gap-2">
            {slideTypes.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => addNewSlide(t.type)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-gray-200 hover:border-violet-400 hover:bg-violet-50 text-sm font-600 text-gray-700 hover:text-violet-700 transition-all"
                id={`btn-add-slide-${t.type}`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl shadow-lg text-sm font-700 text-white flex items-center gap-2 animate-fade-in-up z-50 ${
            toast.type === "ok" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.type === "ok" ? <Check size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
