"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import {
  Clock,
  Check,
  X,
  Send,
  Sparkles,
  Flame,
  HelpCircle,
  Link2,
  Unlink2,
  ChevronRight,
  Lock,
  Layers,
  Zap,
} from "lucide-react";
import { SlideStartedPayload } from "@/hooks/useGameHub";

interface UniversalQuestionHUDProps {
  themeId?: string;
  currentSlide: SlideStartedPayload | null;
  slideTimeLeft: number | null;
  hasAnswered: boolean;
  answerResult: any;
  onSubmitQuiz: (optionId: string) => void;
  onSubmitBlank: (answer: string) => void;
  onSubmitMatching: (pairs: { leftId: string; rightContent: string }[]) => void;
  onSubmitWordCloud?: (word: string) => void;
  isPacedMode?: boolean;
  onPacedNext?: () => void;
  isLastQuestion?: boolean;
  className?: string;
}

const QUIZ_STYLES = [
  { color: "btn-3d-red", shape: "▲", key: "A" },
  { color: "btn-3d-blue", shape: "◆", key: "B" },
  { color: "btn-3d-amber", shape: "●", key: "C" },
  { color: "btn-3d-emerald", shape: "■", key: "D" },
];

export default function UniversalQuestionHUD({
  themeId = "SPEED_RACER",
  currentSlide,
  slideTimeLeft,
  hasAnswered,
  answerResult,
  onSubmitQuiz,
  onSubmitBlank,
  onSubmitMatching,
  onSubmitWordCloud,
  isPacedMode = false,
  onPacedNext,
  isLastQuestion = false,
  className = "",
}: UniversalQuestionHUDProps) {
  // Input states
  const [blankText, setBlankText] = useState("");
  const [isKeyBouncing, setIsKeyBouncing] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  // Matching states: { [leftId]: rightContent }
  const [matchingPairs, setMatchingPairs] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<{ id: string; content: string } | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);

  // Container & Element refs cho việc vẽ dây cong SVG phát sáng
  const matchingContainerRef = useRef<HTMLDivElement>(null);
  const leftItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rightItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [svgCurves, setSvgCurves] = useState<
    { id: string; leftId: string; rightContent: string; d: string; midX: number; midY: number }[]
  >([]);

  // Reset states khi slideId thay đổi
  useEffect(() => {
    setBlankText("");
    setSelectedQuizId(null);
    setMatchingPairs({});
    setSelectedLeft(null);
    setSelectedRight(null);
    setSvgCurves([]);
  }, [currentSlide?.slideId]);

  // Click particle sparks
  const triggerParticles = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 28,
      spread: 65,
      origin: { x, y },
      colors: ["#6366f1", "#06b6d4", "#ec4899", "#fbbf24"],
      disableForReducedMotion: true,
      zIndex: 9999,
    });
  };

  const handleSelectQuiz = (optId: string, e: React.MouseEvent) => {
    if (hasAnswered) return;
    triggerParticles(e);
    setSelectedQuizId(optId);
    onSubmitQuiz(optId);
  };

  const handleBlankKeyDown = () => {
    setIsKeyBouncing(true);
    setTimeout(() => setIsKeyBouncing(false), 90);
  };

  const handleSubmitBlank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blankText.trim() || hasAnswered) return;
    onSubmitBlank(blankText.trim());
  };

  // ── LOGIC NỐI DÂY MATCHING CẶP GHÉP ────────────────────────────────────────

  const handleLeftClick = (item: { id: string; content: string }) => {
    if (hasAnswered) return;
    if (matchingPairs[item.id]) {
      // Bỏ liên kết
      setMatchingPairs((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }

    if (selectedRight) {
      setMatchingPairs((prev) => ({ ...prev, [item.id]: selectedRight }));
      setSelectedRight(null);
      setSelectedLeft(null);
    } else {
      setSelectedLeft(item);
    }
  };

  const handleRightClick = (rightContent: string) => {
    if (hasAnswered) return;
    // Kiểm tra nếu ô bên phải đã được nối
    const existingLeft = Object.keys(matchingPairs).find(
      (k) => matchingPairs[k] === rightContent
    );
    if (existingLeft) {
      setMatchingPairs((prev) => {
        const next = { ...prev };
        delete next[existingLeft];
        return next;
      });
      return;
    }

    if (selectedLeft) {
      setMatchingPairs((prev) => ({ ...prev, [selectedLeft.id]: rightContent }));
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      setSelectedRight(rightContent);
    }
  };

  const handleUnlinkPair = (leftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMatchingPairs((prev) => {
      const next = { ...prev };
      delete next[leftId];
      return next;
    });
  };

  const handleSubmitMatchingPairs = (e: React.MouseEvent) => {
    if (hasAnswered) return;
    triggerParticles(e);
    const list = Object.entries(matchingPairs).map(([leftId, rightContent]) => ({
      leftId,
      rightContent,
    }));
    onSubmitMatching(list);
  };

  // ── TÍNH TOÁN TỌA ĐỘ VÀ VẼ ĐƯỜNG CONG SVG CÚP BEZIER NỐI DÂY PHÁT SÁNG ──────
  const updateSvgCurves = useCallback(() => {
    if (!matchingContainerRef.current) return;
    const containerRect = matchingContainerRef.current.getBoundingClientRect();
    const newCurves: {
      id: string;
      leftId: string;
      rightContent: string;
      d: string;
      midX: number;
      midY: number;
    }[] = [];

    Object.entries(matchingPairs).forEach(([leftId, rightContent]) => {
      const leftEl = leftItemRefs.current[leftId];
      const rightEl = rightItemRefs.current[rightContent];

      if (leftEl && rightEl) {
        const leftRect = leftEl.getBoundingClientRect();
        const rightRect = rightEl.getBoundingClientRect();

        // Tọa độ mép phải ô A và mép trái ô B
        const x1 = leftRect.right - containerRect.left;
        const y1 = leftRect.top + leftRect.height / 2 - containerRect.top;
        const x2 = rightRect.left - containerRect.left;
        const y2 = rightRect.top + rightRect.height / 2 - containerRect.top;

        // Điểm kiểm soát Bezier tạo độ cong mượt mà
        const dx = Math.abs(x2 - x1) * 0.55;
        const cp1x = x1 + dx;
        const cp1y = y1;
        const cp2x = x2 - dx;
        const cp2y = y2;

        const pathData = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        newCurves.push({
          id: `${leftId}-${rightContent}`,
          leftId,
          rightContent,
          d: pathData,
          midX,
          midY,
        });
      }
    });

    setSvgCurves(newCurves);
  }, [matchingPairs]);

  useLayoutEffect(() => {
    updateSvgCurves();
    window.addEventListener("resize", updateSvgCurves);
    return () => window.removeEventListener("resize", updateSvgCurves);
  }, [updateSvgCurves]);

  const slideType = currentSlide?.type?.toUpperCase() || "QUIZ";
  const questionNumber = currentSlide?.index !== undefined ? currentSlide.index + 1 : 1;
  const isTimeCritical = slideTimeLeft !== null && slideTimeLeft <= 5;

  return (
    <div
      className={`h-full flex flex-col justify-between p-2 sm:p-3 bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 select-none overflow-y-auto no-scrollbar relative z-20 ${className}`}
    >
      {/* ── TOP QUESTION CONSOLE BAR ── */}
      <div className="flex items-center justify-between gap-2 mb-1.5 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-heading font-black text-xs sm:text-sm">
            CÂU {questionNumber}
            {currentSlide?.totalSlides ? ` / ${currentSlide.totalSlides}` : ""}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 uppercase">
            {slideType === "QUIZ"
              ? "Trắc Nghiệm"
              : slideType === "FILL_IN_BLANK" || slideType === "FILL_IN_THE_BLANK"
              ? "Điền Khuyết (Fuzzy Matching)"
              : slideType === "MATCHING"
              ? "Ghép Nối Dây SVG"
              : "Khảo Sát"}
          </span>
        </div>

        {/* Timer */}
        {slideTimeLeft !== null && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-heading font-black text-xs sm:text-sm border transition-all ${
              isTimeCritical
                ? "bg-rose-500/20 border-rose-400/50 text-rose-300 animate-pulse"
                : "bg-white/5 border-white/10 text-slate-200"
            }`}
          >
            <Clock size={14} className={isTimeCritical ? "text-rose-400" : "text-amber-400"} />
            <span>{slideTimeLeft}s</span>
          </div>
        )}
      </div>

      {/* ── QUESTION PROMPT ── */}
      <div className="text-center py-1 px-2 shrink-0">
        <h2 className="text-sm sm:text-base md:text-lg font-heading font-black text-white leading-snug line-clamp-2">
          {currentSlide?.questionText || "Đang tải câu hỏi thi đấu..."}
        </h2>
      </div>

      {/* ── INTERACTIVE BODY (TACTILE 3D HUD) ── */}
      <div className="flex-1 flex flex-col justify-center my-1 max-w-2xl w-full mx-auto">
        {hasAnswered ? (
          /* TRẠNG THÁI ĐÃ NỘP BÀI */
          <div className="py-4 px-4 rounded-2xl bg-white/[0.04] border border-white/15 text-center space-y-2.5 animate-in zoom-in-95 backdrop-blur-md">
            {answerResult ? (
              <>
                <div
                  className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center mx-auto shadow-lg ${
                    answerResult.isCorrect
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                      : "bg-rose-500/20 border-rose-400 text-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.3)]"
                  }`}
                >
                  {answerResult.isCorrect ? (
                    <Check size={32} className="stroke-[3.5px]" />
                  ) : (
                    <X size={32} className="stroke-[3.5px]" />
                  )}
                </div>

                <h3
                  className={`text-xl sm:text-2xl font-heading font-black ${
                    answerResult.isCorrect ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {answerResult.isCorrect ? "CHÍNH XÁC!" : "CHƯA CHÍNH XÁC!"}
                </h3>

                {/* Điểm số & Streak bonus */}
                {!answerResult.isTournamentLocked && (
                  <div className="flex items-center justify-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-300/40 text-amber-300 font-black text-sm">
                      +{answerResult.scoreAwarded || 0} pts
                    </span>
                    {answerResult.streak >= 2 && (
                      <span className="px-2.5 py-1 rounded-xl bg-orange-500/20 border border-orange-400/40 text-orange-300 font-black text-xs flex items-center gap-1">
                        <Flame size={12} fill="currentColor" />
                        <span>Streak {answerResult.streak}x</span>
                      </span>
                    )}
                  </div>
                )}

                {answerResult.isTournamentLocked && (
                  <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center justify-center gap-2">
                    <Lock size={14} className="text-purple-400" />
                    <span>Điểm số và đáp án được bảo mật đến khi đóng giải đấu.</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
                  <Check size={28} className="stroke-[3px]" />
                </div>
                <h4 className="text-lg font-heading font-black text-white">
                  ĐÃ GHI NHẬN ĐÁP ÁN!
                </h4>
                <p className="text-xs text-slate-400">
                  Hãy quan sát đấu trường ở phía trên để theo dõi hiệu ứng bứt phá!
                </p>
              </>
            )}

            {isPacedMode && onPacedNext && (
              <button
                type="button"
                onClick={onPacedNext}
                className="w-full mt-2 py-2.5 rounded-xl btn-3d btn-3d-amber text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0"
              >
                <span>{isLastQuestion ? "Hoàn Thành Bài Thi" : "Câu Tiếp Theo"}</span>
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        ) : (
          /* TRẠNG THÁI CHƯA NỘP BÀI: 3 DẠNG CÂU HỎI */
          <>
            {/* 1. DẠNG TRẮC NGHIỆM (QUIZ) 4 NÚT 3D TACTILE */}
            {slideType === "QUIZ" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                  {(currentSlide?.options && currentSlide.options.length > 0
                    ? currentSlide.options
                    : [
                        { id: "opt-1", content: "Phương án A" },
                        { id: "opt-2", content: "Phương án B" },
                        { id: "opt-3", content: "Phương án C" },
                        { id: "opt-4", content: "Phương án D" },
                      ]
                  ).map((opt, idx) => {
                    const style = QUIZ_STYLES[idx % QUIZ_STYLES.length];
                    return (
                      <button
                        key={opt.id}
                        onClick={(e) => handleSelectQuiz(opt.id, e)}
                        className={`btn-3d ${style.color} p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-white flex flex-col items-center justify-center gap-1 min-h-[64px] sm:min-h-[72px] cursor-pointer`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-black opacity-90">
                            {style.shape}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-black/25 text-[9px] sm:text-[10px] font-mono font-black tracking-wider">
                            {style.key}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-bold font-heading text-center leading-snug line-clamp-2">
                          {opt.content}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. DẠNG ĐIỀN KHUYẾT (FILL_IN_BLANK) VỚI KEY-BOUNCE & FUZZY MATCHING */}
            {(slideType === "FILL_IN_BLANK" || slideType === "FILL_IN_THE_BLANK") && (
              <form onSubmit={handleSubmitBlank} className="space-y-3">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 py-1 px-2.5 rounded-lg text-center">
                  <Zap size={11} className="text-amber-400" />
                  <span>Chấm Fuzzy Matching 4 bước • Điểm số từng phần (Partial Credit)</span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={blankText}
                    onKeyDown={handleBlankKeyDown}
                    onChange={(e) => setBlankText(e.target.value)}
                    placeholder="Gõ từ khóa điền vào chỗ trống..."
                    className={`w-full px-3.5 py-3 rounded-xl sm:rounded-2xl bg-slate-950/90 border-2 border-indigo-500 text-white font-bold text-center text-sm sm:text-base outline-none focus:border-amber-400 shadow-inner transition-transform duration-75 ${
                      isKeyBouncing ? "scale-[1.015] border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]" : "scale-100"
                    }`}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!blankText.trim()}
                  className="w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl btn-3d btn-3d-emerald text-white font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Send size={15} />
                  <span>Xác Nhận & Nộp Đáp Án</span>
                </button>
              </form>
            )}

            {/* 3. DẠNG GHÉP CẶP (MATCHING) KÉO/CHẠM NỐI DÂY CONG SVG PHÁT SÁNG */}
            {slideType === "MATCHING" && (
              <div ref={matchingContainerRef} className="relative space-y-2 py-1">
                <p className="text-[11px] text-center text-slate-400 mb-1">
                  Chạm 1 mục ở Cột A rồi chạm 1 mục ở Cột B để nối dây năng lượng phát sáng
                </p>

                {/* ── CANVAS / SVG VẼ DÂY CONG CÚP BEZIER PHÁT SÁNG ── */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                  <defs>
                    <linearGradient id="neonGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                    <filter id="neonGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3.5" result="glow" />
                      <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {svgCurves.map((curve) => (
                    <g key={curve.id}>
                      {/* Lớp hào quang ngoài */}
                      <path
                        d={curve.d}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="6"
                        opacity="0.35"
                        filter="url(#neonGlowFilter)"
                      />
                      {/* Dây neon chính */}
                      <path
                        d={curve.d}
                        fill="none"
                        stroke="url(#neonGlowGradient)"
                        strokeWidth="3.2"
                        strokeDasharray="6 3"
                        className="animate-pulse"
                      />
                      {/* Điểm hạt năng lượng chạy giữa dây */}
                      <circle cx={curve.midX} cy={curve.midY} r="4.5" fill="#34d399" className="animate-ping" />
                    </g>
                  ))}
                </svg>

                <div className="grid grid-cols-2 gap-3 sm:gap-6 relative z-20">
                  {/* Cột Trái (A) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block text-center">
                      Cột A
                    </span>
                    {(currentSlide?.options || []).map((opt) => {
                      const isPaired = Boolean(matchingPairs[opt.id]);
                      const isSelected = selectedLeft?.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          ref={(el) => {
                            leftItemRefs.current[opt.id] = el;
                          }}
                          type="button"
                          onClick={() => handleLeftClick(opt)}
                          className={`w-full p-2.5 rounded-xl border-2 text-xs font-bold transition-all text-left truncate flex items-center justify-between cursor-pointer ${
                            isPaired
                              ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                              : isSelected
                              ? "bg-indigo-600 border-cyan-400 text-white shadow-lg ring-2 ring-cyan-400/50"
                              : "bg-slate-950/80 border-white/15 text-slate-200 hover:border-white/30"
                          }`}
                        >
                          <span className="truncate">{opt.content}</span>
                          {isPaired && (
                            <span
                              onClick={(e) => handleUnlinkPair(opt.id, e)}
                              className="p-0.5 rounded-md hover:bg-rose-500/20 text-emerald-400 hover:text-rose-400 transition-colors"
                              title="Ngắt liên kết"
                            >
                              <Check size={14} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Cột Phải (B) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-amber-400 block text-center">
                      Cột B
                    </span>
                    {(currentSlide?.options || []).map((opt, idx) => {
                      const rightText = opt.matchingPair || `Phương án ${idx + 1}`;
                      const isPaired = Object.values(matchingPairs).includes(rightText);
                      const isSelected = selectedRight === rightText;
                      return (
                        <button
                          key={`right-${idx}`}
                          ref={(el) => {
                            rightItemRefs.current[rightText] = el;
                          }}
                          type="button"
                          onClick={() => handleRightClick(rightText)}
                          className={`w-full p-2.5 rounded-xl border-2 text-xs font-bold transition-all text-left truncate flex items-center justify-between cursor-pointer ${
                            isPaired
                              ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.25)]"
                              : isSelected
                              ? "bg-amber-600 border-amber-300 text-white shadow-lg ring-2 ring-amber-400/50"
                              : "bg-slate-950/80 border-white/15 text-slate-200 hover:border-white/30"
                          }`}
                        >
                          <span className="truncate">{rightText}</span>
                          {isPaired && <Check size={14} className="text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nút nộp cặp ghép */}
                <button
                  type="button"
                  onClick={handleSubmitMatchingPairs}
                  disabled={Object.keys(matchingPairs).length === 0}
                  className="w-full py-2.5 rounded-xl btn-3d btn-3d-ai text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 mt-2 relative z-20"
                >
                  <Link2 size={14} />
                  <span>
                    Hoàn Tất Ghép Nối ({Object.keys(matchingPairs).length}/
                    {(currentSlide?.options || []).length} cặp • Chấm Partial Credit)
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
