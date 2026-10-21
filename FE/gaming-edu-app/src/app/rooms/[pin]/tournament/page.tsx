"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Lock,
  Trophy,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  LogOut,
} from "lucide-react";

interface AsyncQuestion {
  id: string;
  index: number;
  questionText: string;
  type: "QUIZ" | "FILL_IN_BLANK";
  options?: { id: string; label: string; content: string }[];
}

export default function AsyncTournamentPage({ params }: { params: Promise<{ pin: string }> }) {
  const unwrappedParams = use(params);
  const pin = unwrappedParams.pin;
  const router = useRouter();

  // 15 questions mock
  const questions: AsyncQuestion[] = useMemo(
    () => [
      {
        id: "q-1",
        index: 1,
        questionText: "Định luật I Newton còn được gọi với tên gọi là định luật gì?",
        type: "QUIZ",
        options: [
          { id: "opt-1", label: "A", content: "Định luật Quán tính" },
          { id: "opt-2", label: "B", content: "Định luật Gia tốc" },
          { id: "opt-3", label: "C", content: "Định luật Tác dụng và Phản tác dụng" },
          { id: "opt-4", label: "D", content: "Định luật Vạn vật hấp dẫn" },
        ],
      },
      {
        id: "q-2",
        index: 2,
        questionText: "Trong hệ SI, đơn vị đo của cường độ dòng điện là gì?",
        type: "QUIZ",
        options: [
          { id: "opt-5", label: "A", content: "Volt (V)" },
          { id: "opt-6", label: "B", content: "Ampe (A)" },
          { id: "opt-7", label: "C", content: "Ohm (Ω)" },
          { id: "opt-8", label: "D", content: "Watt (W)" },
        ],
      },
      {
        id: "q-3",
        index: 3,
        questionText: "Hiện tượng khúc xạ ánh sáng xảy ra khi ánh sáng truyền qua mặt phân cách giữa hai môi trường [...] khác nhau.",
        type: "FILL_IN_BLANK",
      },
      {
        id: "q-4",
        index: 4,
        questionText: "Quá trình biến đổi trạng thái trong đó nhiệt độ được giữ không đổi gọi là quá trình gì?",
        type: "QUIZ",
        options: [
          { id: "opt-9", label: "A", content: "Đẳng tích" },
          { id: "opt-10", label: "B", content: "Đẳng áp" },
          { id: "opt-11", label: "C", content: "Đẳng nhiệt" },
          { id: "opt-12", label: "D", content: "Đoạn nhiệt" },
        ],
      },
      {
        id: "q-5",
        index: 5,
        questionText: "Sóng điện từ có thể lan truyền được trong môi trường chân không với vận tốc xấp xỉ [...] km/s.",
        type: "FILL_IN_BLANK",
      },
    ],
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(20 * 60); // 20 phút cá nhân
  const [lastSavedTime, setLastSavedTime] = useState<string>("18:30:00");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const currentQ = questions[currentIndex];

  // Đồng hồ cá nhân đếm ngược
  useEffect(() => {
    if (isSubmitted || timeLeftSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          setIsSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, timeLeftSeconds]);

  // Trạng thái auto-save mỗi 30s
  useEffect(() => {
    if (isSubmitted) return;
    const autoSaveInterval = setInterval(() => {
      setIsAutoSaving(true);
      setTimeout(() => {
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];
        setLastSavedTime(timeStr);
        setIsAutoSaving(false);
      }, 800);
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [isSubmitted]);

  const handleSelectOption = (optId: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));
  };

  const handleFillBlank = (text: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: text }));
  };

  const handleSubmitExam = () => {
    setShowSubmitModal(false);
    setIsSubmitted(true);
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* ── DARK COSMIC GRADIENT BACKDROP ── */}
      <div className="fixed inset-0 pointer-events-none -z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#311042]" />
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/15 rounded-full blur-[120px]" />
      </div>

      {/* ── TOP HEADER TOURNAMENT ── */}
      <header className="relative z-20 h-18 px-4 md:px-8 flex items-center justify-between border-b border-white/10 backdrop-blur-xl bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center font-bold">
            <Trophy size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-heading">
                GIẢI ĐẤU ASYNC
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                PIN: {pin}
              </span>
            </div>
            <h1 className="text-sm md:text-base font-extrabold text-white font-heading">
              Kỳ Thi Khảo Sát Kiến Thức Trực Tuyến
            </h1>
          </div>
        </div>

        {/* Đồng hồ cá nhân & Auto-save status */}
        <div className="flex items-center gap-3 md:gap-5">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            {isAutoSaving ? (
              <span className="flex items-center gap-1.5 text-indigo-400">
                <RotateCcw size={13} className="animate-spin" /> Đang tự động lưu...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 size={14} /> Tự động lưu: {lastSavedTime}
              </span>
            )}
          </div>

          {/* Personal Timer */}
          <div
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border font-heading font-black text-lg md:text-xl ${
              timeLeftSeconds < 180
                ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
                : "bg-white/10 border-white/20 text-white"
            }`}
          >
            <Clock size={18} />
            <span className="font-mono">{formattedTime}</span>
          </div>

          {!isSubmitted && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 rounded-[12px] btn-3d btn-3d-emerald text-xs font-extrabold font-heading uppercase tracking-wider flex items-center gap-1.5"
            >
              <Send size={14} />
              <span>Nộp Bài</span>
            </button>
          )}
        </div>
      </header>

      {/* ── MÀN HÌNH KHÓA SAU KHI NỘP BÀI (SUBMISSION LOCKED SCREEN) ── */}
      {isSubmitted ? (
        <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-8 flex flex-col items-center justify-center relative z-10 text-center animate-in zoom-in-95">
          <div className="rounded-[32px] bg-white/[0.08] backdrop-blur-[20px] border border-white/15 p-8 md:p-12 shadow-2xl space-y-6 w-full">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.3)]">
              <Lock size={36} />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black font-heading uppercase">
                <ShieldCheck size={14} /> BÀI THI ĐÃ ĐƯỢC KHÓA BẢO MẬT
              </div>
              <h2 className="text-2xl md:text-3xl font-black font-heading text-white">
                Nộp Bài Thi Thành Công!
              </h2>
              <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Bạn đã hoàn thành <strong>{answeredCount}/{questions.length}</strong> câu hỏi. Hệ thống đã lưu trữ bài làm an toàn và khóa chỉnh sửa theo quy chế giải đấu Async.
              </p>
            </div>

            <div className="p-4 rounded-[16px] bg-white/5 border border-white/10 text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Thời gian nộp:</span>
                <span className="text-white font-bold">{lastSavedTime}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Thời gian làm bài:</span>
                <span className="text-white font-bold">{20 - Math.floor(timeLeftSeconds / 60)} phút</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Trạng thái kết quả:</span>
                <span className="text-amber-300 font-bold">Chờ giải đấu khép lại</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/library"
                className="px-6 py-3 rounded-[12px] btn-3d btn-3d-primary font-heading text-xs font-extrabold uppercase"
              >
                Về Kho Bộ Đề
              </Link>
            </div>
          </div>
        </main>
      ) : (
        /* ── GIAO DIỆN LÀM BÀI ASYNC ── */
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-6 relative z-10">
          {/* CỘT TRÁI: NỘI DUNG CÂU HỎI VÀ ĐÁP ÁN (FLEX-1) */}
          <div className="flex-1 flex flex-col justify-between rounded-[24px] bg-white/[0.08] backdrop-blur-[16px] border border-white/15 p-6 md:p-8 shadow-2xl">
            <div>
              {/* Question Index Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-extrabold text-indigo-300 font-heading">
                  CÂU HỎI {currentQ.index} / {questions.length}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {answers[currentQ.id] ? "✓ Đã trả lời" : "Chưa trả lời"}
                </span>
              </div>

              {/* Question Text */}
              <h2 className="text-lg md:text-2xl font-black font-heading text-white leading-relaxed mb-6">
                {currentQ.questionText}
              </h2>

              {/* Answer options */}
              {currentQ.type === "QUIZ" && currentQ.options && (
                <div className="space-y-3">
                  {currentQ.options.map((opt) => {
                    const selected = answers[currentQ.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectOption(opt.id)}
                        className={`w-full p-4 rounded-[16px] border-2 transition-all flex items-center gap-3 text-left ${
                          selected
                            ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                            : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-slate-400"
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-[8px] flex items-center justify-center font-black font-heading text-xs ${
                            selected ? "bg-white text-indigo-700" : "bg-white/10 text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="text-sm font-semibold flex-1 leading-snug">
                          {opt.content}
                        </span>
                        {selected && <Check size={18} className="text-white" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQ.type === "FILL_IN_BLANK" && (
                <div className="space-y-3 pt-2">
                  <input
                    type="text"
                    value={answers[currentQ.id] || ""}
                    onChange={(e) => handleFillBlank(e.target.value)}
                    placeholder="Gõ từ còn thiếu vào đây..."
                    className="w-full p-4 rounded-[16px] bg-slate-900/90 border-2 border-indigo-500 text-white font-bold text-base outline-none focus:border-indigo-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    Đáp án của bạn được tự động ghi nhận và đồng bộ mỗi 30 giây.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Question Switcher Buttons */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold flex items-center gap-1 text-slate-300 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
                <span>Câu Trước</span>
              </button>

              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="px-4 py-2 rounded-[10px] bg-indigo-600 hover:bg-indigo-500 text-xs font-bold flex items-center gap-1 text-white disabled:opacity-30"
              >
                <span>Câu Kế Tiếp</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: QUESTION PALETTE & TIẾN ĐỘ THI (280px) */}
          <aside className="w-full md:w-72 rounded-[24px] bg-white/[0.08] backdrop-blur-[16px] border border-white/15 p-6 shadow-2xl flex flex-col justify-between shrink-0 space-y-6">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 font-heading block mb-2">
                TIẾN ĐỘ BÀI THI
              </span>

              {/* Progress bar */}
              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-300 font-semibold mb-6">
                <span>{answeredCount} / {questions.length} đã làm</span>
                <span>{progressPercent}%</span>
              </div>

              {/* Number Matrix / Grid */}
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 font-heading block mb-3">
                DANH SÁCH CÂU HỎI
              </span>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isDone = !!answers[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-10 rounded-[10px] text-xs font-black font-heading transition-all ${
                        isCurrent
                          ? "bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md"
                          : isDone
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      {q.index}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <button
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-3 rounded-[12px] btn-3d btn-3d-emerald font-heading text-xs font-extrabold uppercase tracking-wider"
              >
                NỘP BÀI THI ĐẤU
              </button>
              <p className="text-[10px] text-center text-slate-400">
                Bài thi sẽ tự động khóa và chấm điểm khi nộp.
              </p>
            </div>
          </aside>
        </main>
      )}

      {/* ── MODAL XÁC NHẬN NỘP BÀI ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/15 rounded-[24px] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-[14px] bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-black font-heading text-white">
              Xác Nhận Nộp Bài Thi Đấu?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn đã hoàn thành <strong>{answeredCount}/{questions.length}</strong> câu hỏi. Bạn vẫn còn <strong>{formattedTime}</strong> để rà soát lại bài làm. Sau khi nộp, bạn sẽ không thể chỉnh sửa đáp án.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-[10px] text-xs font-bold text-slate-300 hover:bg-white/5"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={handleSubmitExam}
                className="px-5 py-2.5 rounded-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold font-heading text-xs shadow-md"
              >
                Đồng ý nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
