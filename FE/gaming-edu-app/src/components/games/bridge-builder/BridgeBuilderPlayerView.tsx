"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Clock,
  Compass,
  Footprints,
  ShieldCheck,
  Zap,
  TrendingUp,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Waves,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";
import { api } from "@/lib/api";
import { BridgeSpanResult } from "@/hooks/useGameHub";

interface BridgeBuilderPlayerViewProps {
  currentSlide: {
    index?: number;
    slideId: string;
    type: string;
    questionText: string;
    timeLimit: number;
    points: number;
    options: {
      id: string;
      content: string;
      orderIndex: number;
      blankKeywords?: string;
    }[];
  } | null;
  slideTimeLeft: number | null;
  hasAnswered: boolean;
  answerResult: {
    isCorrect?: boolean;
    scoreAwarded?: number;
    totalScore?: number;
    correctAnswer?: string;
    rank?: number;
    rankChange?: number;
    isTournamentLocked?: boolean;
    streak?: number;
    speedMultiplier?: number;
    streakBonus?: number;
    partialRatio?: number;
    isBridgeCrossed?: boolean;
    totalSpans?: number;
    builtSpans?: number;
    spanResults?: BridgeSpanResult[];
  } | null;
  roomMode?: string; // "HOST_PACED" | "PLAYER_PACED" | "ASYNC_TOURNAMENT"
  roomPlayerId?: string;
  currentRank?: number;
  onSubmitBridge: (userAnswers: string[]) => void;
}

export default function BridgeBuilderPlayerView({
  currentSlide,
  slideTimeLeft,
  hasAnswered,
  answerResult,
  roomMode = "HOST_PACED",
  roomPlayerId,
  currentRank = 1,
  onSubmitBridge,
}: BridgeBuilderPlayerViewProps) {
  const totalSpans = useMemo(() => {
    return Math.max(1, currentSlide?.options?.length || 1);
  }, [currentSlide]);

  const [inputs, setInputs] = useState<string[]>(() => Array(totalSpans).fill(""));
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  // Reset khi đổi slide hoặc load draft từ Redis
  useEffect(() => {
    setInputs(Array(totalSpans).fill(""));
    setLastAutoSaveTime(null);

    if (roomMode === "ASYNC_TOURNAMENT" && roomPlayerId && currentSlide?.slideId) {
      api
        .get(`/answers/draft?roomPlayerId=${roomPlayerId}&slideId=${currentSlide.slideId}`)
        .then((res) => {
          if (res.data?.data) {
            try {
              const draftArray = JSON.parse(res.data.data);
              if (Array.isArray(draftArray)) {
                setInputs(draftArray);
              }
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [currentSlide?.slideId, totalSpans, roomMode, roomPlayerId]);

  // Auto-save draft mỗi 30s
  useEffect(() => {
    if (hasAnswered || !currentSlide?.slideId || !roomPlayerId) return;

    const interval = setInterval(async () => {
      const currentInputs = inputsRef.current;
      const hasContent = currentInputs.some((val) => val.trim().length > 0);
      if (!hasContent) return;

      setIsAutoSaving(true);
      try {
        await api.put("/answers/draft", {
          roomPlayerId,
          slideId: currentSlide.slideId,
          draftData: JSON.stringify(currentInputs),
        });
        const now = new Date();
        setLastAutoSaveTime(
          `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`
        );
      } catch (err) {
        console.warn("Auto-save draft bridge error:", err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [hasAnswered, currentSlide?.slideId, roomPlayerId]);

  const handleInputChange = (index: number, value: string) => {
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;
    setInputs((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;
    onSubmitBridge(inputs);
  };

  const isFormValid = inputs.some((val) => val.trim().length > 0);

  // Vị trí nhân vật trên cầu
  const currentStep = useMemo(() => {
    if (answerResult?.builtSpans !== undefined) {
      return answerResult.builtSpans;
    }
    // Nếu chưa nộp, đếm số nhịp người chơi đã điền
    return inputs.filter((val) => val.trim().length > 0).length;
  }, [answerResult?.builtSpans, inputs]);

  const bridgePercent = Math.round((currentStep / totalSpans) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* ── TOP HUD ────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-3 border-cyan-500/30 rounded-[28px] p-4 md:p-6 shadow-xl text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 border border-cyan-300 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              🌉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase">
                  Xây Cầu Qua Sông
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Hạng #{currentRank}
                </span>
              </div>
              <h3 className="font-black text-white text-base md:text-lg">
                Câu {currentSlide?.index !== undefined ? currentSlide.index + 1 : 1}: Ghép {totalSpans} Nhịp Cầu
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-xl ${
                slideTimeLeft !== null && slideTimeLeft <= 5
                  ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
                  : "bg-cyan-500/20 border-cyan-400 text-cyan-300"
              }`}
            >
              <Clock size={18} />
              <span>{slideTimeLeft !== null ? `${slideTimeLeft}s` : "--"}</span>
            </div>

            {/* Auto-save status */}
            {lastAutoSaveTime && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
                <Save size={12} className="text-cyan-400" />
                <span>Đã lưu {lastAutoSaveTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cây cầu thu nhỏ (Bridge Progress Visualizer) */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs font-black text-slate-300 mb-2">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Footprints size={14} /> TIẾN ĐỘ VƯỢT SÔNG: {currentStep}/{totalSpans} NHỊP ({bridgePercent}%)
            </span>
            <span className="text-amber-300 font-bold">
              {currentStep === totalSpans ? "🏆 Đã chạm bờ vinh quang!" : "Đang tiến bước qua sông..."}
            </span>
          </div>

          {/* Dòng sông và các nhịp cầu */}
          <div className="relative w-full h-12 bg-slate-950/80 rounded-2xl p-2 border-2 border-slate-700 flex items-center justify-between gap-1 overflow-hidden">
            {/* Nước cuộn sóng ngầm */}
            <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-cyan-600/20 to-transparent pointer-events-none" />

            {/* Bờ Tây (Start) */}
            <div className="px-2 py-1 rounded-lg bg-amber-900/60 border border-amber-600/40 text-[10px] font-black text-amber-300 shrink-0">
              🏕️ Bờ Tây
            </div>

            {/* Các nhịp cầu tương tác */}
            <div className="flex-1 flex items-center gap-1.5 px-2">
              {Array.from({ length: totalSpans }).map((_, idx) => {
                const isPassed = idx < currentStep;
                return (
                  <div
                    key={idx}
                    className={`flex-1 h-6 rounded-lg border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                      isPassed
                        ? "bg-gradient-to-r from-cyan-500 to-emerald-400 border-emerald-300 text-slate-950 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                        : "bg-slate-800/80 border-slate-600 text-slate-500 border-dashed"
                    }`}
                  >
                    {isPassed ? "✓" : `#${idx + 1}`}
                  </div>
                );
              })}
            </div>

            {/* Bờ Đông (Goal) */}
            <div className="px-2 py-1 rounded-lg bg-emerald-900/60 border border-emerald-500/40 text-[10px] font-black text-emerald-300 shrink-0">
              🏆 Bờ Đông
            </div>
          </div>
        </div>
      </div>

      {/* ── QUESTION PASSAGE ──────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 border-3 border-slate-800 rounded-[28px] p-6 text-center shadow-lg">
        <span className="inline-block bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-black px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-2">
          Đoạn Văn Cần Hoàn Thiện
        </span>
        <h4 className="text-xl md:text-2xl font-black text-white leading-relaxed">
          {currentSlide?.questionText}
        </h4>
      </div>

      {/* ── INTERACTIVE SPAN INPUTS FORM ───────────────────────────────────── */}
      {!hasAnswered && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-900/90 border-3 border-cyan-500/30 rounded-[32px] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-black text-cyan-300 flex items-center gap-2">
                <Compass size={16} /> Điền từ khóa vào từng nhịp cầu
              </span>
              <span className="text-xs text-slate-400 font-bold">
                Tối ưu chấm Partial Credit theo từng nhịp đúng
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: totalSpans }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border-2 border-slate-700 focus-within:border-cyan-400 rounded-2xl p-3.5 transition-all shadow-inner"
                >
                  <div className="flex items-center justify-between text-xs font-black text-slate-400 mb-1.5">
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <span className="w-5 h-5 rounded-md bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span>Nhịp Cầu Số {idx + 1}</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {inputs[idx]?.length || 0} ký tự
                    </span>
                  </div>

                  <input
                    type="text"
                    value={inputs[idx] || ""}
                    onChange={(e) => handleInputChange(idx, e.target.value)}
                    placeholder={`Gõ từ khóa nhịp ${idx + 1}...`}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-black text-base outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all placeholder:text-slate-600"
                    autoFocus={idx === 0}
                  />
                </div>
              ))}
            </div>

            {/* Nút gửi bài */}
            <button
              type="submit"
              disabled={!isFormValid || (slideTimeLeft !== null && slideTimeLeft <= 0)}
              className="w-full mt-2 py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-black text-lg rounded-2xl shadow-[0_6px_0_0_#0284c7] active:translate-y-1 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={20} />
              <span>NỐI CẦU & BƯỚC QUA SÔNG</span>
            </button>
          </div>
        </form>
      )}

      {/* ── ANSWER RESULT & DETAILED PARTIAL CREDIT FEEDBACK ───────────────── */}
      {hasAnswered && answerResult && (
        <div className="bg-slate-900/95 border-4 border-cyan-500/40 rounded-[32px] p-6 md:p-8 shadow-2xl text-center space-y-6 animate-fade-in-up">
          {/* Tournament Locked View */}
          {answerResult.isTournamentLocked ? (
            <div className="py-8 space-y-4">
              <div className="w-16 h-16 bg-cyan-500/20 text-cyan-300 border-2 border-cyan-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                <Lock size={32} />
              </div>
              <h3 className="text-2xl font-black text-white">Đã Nộp Bài Thi Giải Đấu!</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Các nhịp cầu đã được niêm phong an toàn trên Redis. Điểm số và cây cầu hoàn chỉnh sẽ được công bố khi giải đấu kết thúc.
              </p>
            </div>
          ) : (
            /* Live Feedback Screen */
            <>
              {/* Header Icon & Status */}
              <div className="space-y-3">
                <div
                  className={`w-20 h-20 rounded-[28px] border-4 mx-auto flex items-center justify-center text-4xl shadow-xl transform ${
                    answerResult.isBridgeCrossed
                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.5)] -rotate-3"
                      : (answerResult.builtSpans || 0) > 0
                      ? "bg-amber-500 border-amber-400 text-white shadow-[0_0_30px_rgba(245,158,11,0.5)]"
                      : "bg-rose-500 border-rose-400 text-white shadow-[0_0_30px_rgba(244,63,94,0.5)] rotate-3"
                  }`}
                >
                  {answerResult.isBridgeCrossed ? "🏆" : (answerResult.builtSpans || 0) > 0 ? "🚶" : "🌊"}
                </div>

                <h3
                  className={`text-3xl font-black tracking-tight ${
                    answerResult.isBridgeCrossed
                      ? "text-emerald-400"
                      : (answerResult.builtSpans || 0) > 0
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {answerResult.isBridgeCrossed
                    ? "VƯỢT SÔNG HOÀN HẢO!"
                    : (answerResult.builtSpans || 0) > 0
                    ? `BƯỚC QUA ĐƯỢC ${answerResult.builtSpans}/${answerResult.totalSpans} NHỊP CẦU`
                    : "CẦU BỊ GÃY - CHƯA THỂ QUA SÔNG"}
                </h3>

                <p className="text-sm font-bold text-slate-300">
                  {answerResult.isBridgeCrossed
                    ? "Bạn đã hoàn thành chính xác 100% các từ khóa và đặt chân lên Bờ Vinh Quang!"
                    : (answerResult.builtSpans || 0) > 0
                    ? `Nhận Partial Credit tương ứng với ${(answerResult.partialRatio ? Math.round(answerResult.partialRatio * 100) : 0)}% nhịp cầu đã xây thành công.`
                    : "Không sao cả, hãy quan sát từ khóa chuẩn bên dưới để rút kinh nghiệm cho câu tiếp theo!"}
                </p>
              </div>

              {/* Score & Multiplier Pill Cards */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="bg-slate-800/80 border-2 border-slate-700 px-5 py-3 rounded-2xl">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Điểm Nhận Được
                  </div>
                  <div className="text-3xl font-black text-cyan-300">
                    +{answerResult.scoreAwarded || 0}
                  </div>
                </div>

                {answerResult.speedMultiplier && answerResult.speedMultiplier > 1 && (
                  <div className="bg-amber-950/60 border-2 border-amber-500/40 px-5 py-3 rounded-2xl">
                    <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1 justify-center">
                      <Zap size={12} /> Tốc Độ Xây
                    </div>
                    <div className="text-3xl font-black text-amber-300">
                      x{answerResult.speedMultiplier.toFixed(1)}
                    </div>
                  </div>
                )}

                <div className="bg-slate-800/80 border-2 border-slate-700 px-5 py-3 rounded-2xl">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Tổng Điểm Hiện Tại
                  </div>
                  <div className="text-3xl font-black text-white">
                    {answerResult.totalScore?.toLocaleString() || 0}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown of each bridge span */}
              {answerResult.spanResults && answerResult.spanResults.length > 0 && (
                <div className="text-left bg-slate-950/80 border-2 border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="text-xs font-black text-cyan-300 uppercase tracking-wider mb-2">
                    Chi tiết từng nhịp cầu đã thi công:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {answerResult.spanResults.map((span) => (
                      <div
                        key={span.spanIndex}
                        className={`p-3 rounded-xl border-2 flex items-center justify-between gap-3 ${
                          span.isBuilt
                            ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                            : "bg-rose-950/30 border-rose-500/40 text-rose-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {span.isBuilt ? (
                            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle size={20} className="text-rose-400 shrink-0" />
                          )}
                          <div>
                            <div className="text-xs font-black">
                              Nhịp #{span.spanIndex}: {span.isBuilt ? "Vững chắc" : "Gãy nhịp"}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-400">
                              Bạn điền: <span className="font-bold text-white">&quot;{span.userInput || "(trống)"}&quot;</span>
                            </div>
                          </div>
                        </div>

                        {!span.isBuilt && (
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 block">Chuẩn:</span>
                            <span className="text-xs font-black text-emerald-400">
                              {span.expectedKeyword}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
