"use client";

import React, { useMemo } from "react";
import {
  Trophy,
  Zap,
  Flame,
  Check,
  X,
  Clock,
  Gauge,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

interface OptionItem {
  id: string;
  content: string;
  orderIndex: number;
}

interface CurrentSlide {
  slideId: string;
  index: number;
  questionText: string;
  timeLimit: number;
  points: number;
  options: OptionItem[];
}

interface AnswerResult {
  isCorrect: boolean;
  scoreAwarded: number;
  totalScore: number;
  correctAnswer?: string;
  rank?: number;
  rankChange?: number;
  streak?: number;
  speedMultiplier?: number;
  streakBonus?: number;
}

interface SpeedRacerPlayerCockpitProps {
  currentSlide: CurrentSlide | null;
  slideTimeLeft: number | null;
  hasAnswered: boolean;
  answerResult: AnswerResult | null;
  totalScore: number;
  currentRank: number;
  onSelectOption: (optionId: string) => void;
  selectedOptionId?: string | null;
}

export default function SpeedRacerPlayerCockpit({
  currentSlide,
  slideTimeLeft,
  hasAnswered,
  answerResult,
  totalScore,
  currentRank,
  onSelectOption,
  selectedOptionId,
}: SpeedRacerPlayerCockpitProps) {
  // Speed Multiplier & Streak
  const streak = answerResult?.streak ?? 0;
  const speedMultiplier = answerResult?.speedMultiplier ?? 1.0;
  const rankChange = answerResult?.rankChange ?? 0;

  // Approximate Speedometer in KM/H (120 - 280 km/h) based on remaining time
  const currentSpeedKmH = useMemo(() => {
    if (!currentSlide || slideTimeLeft === null) return 160;
    const ratio = slideTimeLeft / currentSlide.timeLimit;
    return Math.round(120 + ratio * 160);
  }, [slideTimeLeft, currentSlide]);

  const optionLetters = ["A", "B", "C", "D"];
  const optionStyles = [
    {
      btn: "from-red-500 to-rose-600 border-red-700 shadow-[0_6px_0_0_#991b1b] active:translate-y-1 active:shadow-none",
      badge: "bg-red-900/40 text-red-100",
    },
    {
      btn: "from-blue-500 to-indigo-600 border-blue-700 shadow-[0_6px_0_0_#1e40af] active:translate-y-1 active:shadow-none",
      badge: "bg-blue-900/40 text-blue-100",
    },
    {
      btn: "from-amber-400 to-orange-500 border-amber-600 shadow-[0_6px_0_0_#b45309] active:translate-y-1 active:shadow-none",
      badge: "bg-amber-900/40 text-amber-100",
    },
    {
      btn: "from-emerald-500 to-teal-600 border-emerald-700 shadow-[0_6px_0_0_#065f46] active:translate-y-1 active:shadow-none",
      badge: "bg-emerald-900/40 text-emerald-100",
    },
  ];

  return (
    <div className="w-full flex-1 flex flex-col font-sans space-y-4">
      {/* ── 1. COCKPIT DASHBOARD (BUỒNG LÁI TAY ĐUA) ─────────────────── */}
      <div className="bg-[#0b131e] border-2 border-orange-500/50 rounded-[28px] p-4 text-white shadow-[0_12px_30px_rgba(249,115,22,0.2)] relative overflow-hidden">
        {/* Neon Speed Line Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center text-center">
          {/* Gauge 1: Speedometer */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400 uppercase">
              <Gauge size={13} className="text-cyan-400" />
              <span>Tốc Độ</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 mt-0.5">
              {currentSpeedKmH}{" "}
              <span className="text-[10px] font-bold text-slate-400">km/h</span>
            </div>
          </div>

          {/* Gauge 2: Streak Bonus */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-orange-400 uppercase">
              <Flame size={13} className="text-orange-500 animate-pulse" />
              <span>Streak</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-orange-400 mt-0.5 flex items-center justify-center gap-1">
              <span>x{streak > 0 ? streak : 0}</span>
              {streak >= 2 && <span className="text-xs">🔥</span>}
            </div>
          </div>

          {/* Gauge 3: Current Rank */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-300 uppercase">
              <Trophy size={13} className="text-amber-400" />
              <span>Vị Trí</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-0.5 flex items-center justify-center gap-1">
              <span>#{currentRank > 0 ? currentRank : 1}</span>
              {rankChange > 0 && (
                <span className="text-xs font-bold text-emerald-400">+{rankChange}</span>
              )}
            </div>
          </div>
        </div>

        {/* Mini Racetrack Progress Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-3 text-xs">
          <span className="font-bold text-slate-400 text-[11px] shrink-0">Vạch Đua:</span>
          <div className="flex-1 relative h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 via-orange-500 to-amber-400 rounded-full w-3/4 opacity-60" />
            <div className="absolute right-1 top-0 bottom-0 flex items-center text-[10px]">
              🏁
            </div>
          </div>
          <span className="font-mono font-bold text-amber-400 text-xs shrink-0">
            {totalScore.toLocaleString("vi-VN")} pts
          </span>
        </div>
      </div>

      {/* ── 2. QUESTION & COUNTDOWN ──────────────────────────────────── */}
      {currentSlide && !answerResult && (
        <div className="flex-1 flex flex-col justify-between space-y-4">
          {/* Question Box */}
          <div className="bg-white/90 backdrop-blur-md rounded-[28px] border-2 border-teal-200/80 p-5 shadow-sm text-center relative">
            <div className="flex items-center justify-between mb-3 text-xs font-bold">
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-xl border border-orange-200">
                Câu {currentSlide.index !== undefined ? currentSlide.index + 1 : "?"}
              </span>

              <div
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-xl font-mono font-black text-base border ${
                  slideTimeLeft !== null && slideTimeLeft <= 5
                    ? "bg-rose-100 text-rose-600 border-rose-300 animate-pulse"
                    : "bg-slate-100 text-slate-800 border-slate-200"
                }`}
              >
                <Clock size={16} />
                <span>{slideTimeLeft !== null ? slideTimeLeft : currentSlide.timeLimit}s</span>
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {currentSlide.questionText}
            </h3>
          </div>

          {/* 4 Nitro Choice Tap Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
            {currentSlide.options &&
              currentSlide.options.map((opt, idx) => {
                const style = optionStyles[idx % 4];
                const isSelected = selectedOptionId === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={hasAnswered || slideTimeLeft === 0}
                    onClick={() => onSelectOption(opt.id)}
                    className={`relative p-5 rounded-[22px] border-4 text-white text-left font-black transition-all flex items-center gap-4 bg-gradient-to-r ${
                      style.btn
                    } ${
                      hasAnswered && !isSelected ? "opacity-40 grayscale-[40%]" : ""
                    } ${
                      isSelected
                        ? "ring-4 ring-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.6)] scale-[1.02]"
                        : ""
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 ${style.badge}`}
                    >
                      {optionLetters[idx]}
                    </div>
                    <span className="text-lg sm:text-xl font-bold leading-tight flex-1">
                      {opt.content}
                    </span>
                    {isSelected && (
                      <div className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center font-black shrink-0 shadow">
                        <Check size={18} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Waiting for Round Finish Banner */}
          {hasAnswered && (
            <div className="bg-slate-900/90 border-2 border-orange-500/60 rounded-2xl p-4 text-center text-white animate-pulse">
              <div className="flex items-center justify-center gap-2 text-sm font-black text-orange-400 uppercase tracking-wider">
                <Flame size={16} className="text-orange-500" />
                <span>Đã Nhấn Ga! Đang Chờ Bứt Tốc Về Đích...</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tốc độ và thứ hạng sẽ được cộng dồn khi câu hỏi kết thúc
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 3. POST-ANSWER BOOST OVERLAY / RESULTS ───────────────────── */}
      {answerResult && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/95 backdrop-blur-xl rounded-[32px] border-4 border-slate-200 shadow-xl space-y-5 animate-fade-in-up">
          {answerResult.isCorrect ? (
            <>
              {/* Nitro Boost Icon */}
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 via-orange-500 to-red-500 text-white rounded-3xl border-4 border-white shadow-[0_12px_30px_rgba(249,115,22,0.5)] flex items-center justify-center transform -rotate-6 animate-bounce">
                  <span className="text-5xl">🏎️</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-1.5 border-2 border-white shadow">
                  <Check size={20} strokeWidth={3} />
                </div>
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200 text-xs font-black uppercase tracking-widest">
                  NITRO BOOST KÍCH HOẠT!
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1 tracking-tight">
                  Bứt Tốc Thành Công! 🚀
                </h2>
              </div>

              {/* Points & Breakdown Card */}
              <div className="bg-gradient-to-br from-slate-900 to-[#101b2b] text-white p-5 rounded-2xl border-2 border-orange-500/40 w-full max-w-sm shadow-md space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Điểm Thưởng Tốc Độ
                </div>
                <div className="text-4xl font-black font-mono text-amber-400">
                  +{answerResult.scoreAwarded.toLocaleString("vi-VN")}
                </div>
                <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-800 text-xs text-slate-300">
                  <span className="flex items-center gap-1 text-cyan-400 font-bold">
                    <Zap size={13} /> {speedMultiplier}x Speed
                  </span>
                  {streak >= 2 && (
                    <span className="flex items-center gap-1 text-orange-400 font-bold">
                      <Flame size={13} /> Streak x{streak} (+{answerResult.streakBonus || 50}pts)
                    </span>
                  )}
                </div>
              </div>

              {/* Rank Change Callout */}
              {rankChange > 0 ? (
                <div className="inline-flex items-center gap-2 bg-emerald-100 border-2 border-emerald-300 text-emerald-900 px-5 py-2.5 rounded-2xl font-black text-sm">
                  <ArrowUpRight size={18} strokeWidth={3} className="text-emerald-600" />
                  <span>VƯỢT MẶT! LEO HẠNG +{rankChange} BẬC (Lên Hạng #{answerResult.rank})</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl">
                  <span>Vị trí hiện tại: Hạng #{answerResult.rank}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Spin-out / Miss Icon */}
              <div className="w-24 h-24 bg-rose-500 text-white rounded-3xl border-4 border-white shadow-[0_10px_25px_rgba(244,63,94,0.4)] flex items-center justify-center transform rotate-6">
                <span className="text-5xl">💥</span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                  Mất Lái / Va Chạm! 💨
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  Đáp án chưa chính xác, chuỗi thắng đã bị reset. Hãy giữ vững tay lái câu tiếp theo!
                </p>
              </div>

              {answerResult.correctAnswer && (
                <div className="bg-slate-50 border-2 border-slate-200 p-3 rounded-2xl text-xs font-bold text-slate-700">
                  Đáp án chuẩn xác: <span className="text-emerald-700 font-black">{answerResult.correctAnswer}</span>
                </div>
              )}
            </>
          )}

          <div className="text-xs font-bold text-slate-500 pt-2">
            Đang chờ chủ phòng chuyển sang đoạn đua tiếp theo...
          </div>
        </div>
      )}
    </div>
  );
}
