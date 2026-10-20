"use client";

import { useState, useMemo } from "react";
import {
  Heart,
  Skull,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Flame,
  Award,
  Check,
  Send,
} from "lucide-react";

interface BattleRoyalePlayerArenaProps {
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
    }[];
  };
  slideTimeLeft: number | null;
  hasAnswered: boolean;
  answerResult: {
    isCorrect: boolean;
    scoreAwarded: number;
    totalScore: number;
    correctAnswer?: string;
    rank?: number;
    rankChange?: number;
    currentHp?: number;
    maxHp?: number;
    hpDeducted?: number;
    isEliminated?: boolean;
    partialRatio?: number;
  } | null;
  totalScore: number;
  currentRank: number;
  playerHp?: number;
  isEliminated?: boolean;
  onSubmitAnswer: (answerData: string) => void;
}

const OPTION_BADGES = ["A", "B", "C", "D", "E", "F"];
const OPTION_STYLES = [
  {
    bg: "bg-red-500/20 hover:bg-red-500/30",
    border: "border-red-500/40 hover:border-red-400",
    active: "bg-red-500/40 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]",
    badge: "bg-red-500 text-white",
  },
  {
    bg: "bg-blue-500/20 hover:bg-blue-500/30",
    border: "border-blue-500/40 hover:border-blue-400",
    active: "bg-blue-500/40 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)]",
    badge: "bg-blue-500 text-white",
  },
  {
    bg: "bg-amber-500/20 hover:bg-amber-500/30",
    border: "border-amber-500/40 hover:border-amber-400",
    active: "bg-amber-500/40 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]",
    badge: "bg-amber-500 text-white",
  },
  {
    bg: "bg-emerald-500/20 hover:bg-emerald-500/30",
    border: "border-emerald-500/40 hover:border-emerald-400",
    active: "bg-emerald-500/40 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]",
    badge: "bg-emerald-500 text-white",
  },
];

export default function BattleRoyalePlayerArena({
  currentSlide,
  slideTimeLeft,
  hasAnswered,
  answerResult,
  totalScore,
  currentRank,
  playerHp = 100,
  isEliminated = false,
  onSubmitAnswer,
}: BattleRoyalePlayerArenaProps) {
  // Support both single choice and multiple choices
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Computed HP
  const currentHp = answerResult?.currentHp ?? playerHp ?? 100;
  const isDead = answerResult?.isEliminated ?? isEliminated ?? currentHp <= 0;
  const hpPercent = Math.max(0, Math.min(100, currentHp));

  // 3 Hearts calculation
  const heartsCount =
    currentHp >= 70 ? 3 : currentHp >= 35 ? 2 : currentHp > 0 ? 1 : 0;

  const toggleOption = (optionId: string) => {
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;

    // By default for standard QUIZ, single click selects & allows submitting
    setSelectedIds((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleSingleSubmit = (optionId: string) => {
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;
    setSelectedIds([optionId]);
    onSubmitAnswer(optionId);
  };

  const handleMultiSubmit = () => {
    if (
      selectedIds.length === 0 ||
      hasAnswered ||
      (slideTimeLeft !== null && slideTimeLeft <= 0)
    )
      return;
    // Send as JSON array if multiple, or single id
    if (selectedIds.length === 1) {
      onSubmitAnswer(selectedIds[0]);
    } else {
      onSubmitAnswer(JSON.stringify(selectedIds));
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto select-none font-sans relative py-2">
      {/* ════════════════════════════════════════════════════════════
          1. TOP HUD: HP HEARTS, NUMERICAL HP BAR, TIMER, RANK
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950/90 backdrop-blur-xl border-2 border-rose-500/40 rounded-[28px] p-4 shadow-[0_10px_35px_rgba(244,63,94,0.18)] mb-4 relative overflow-hidden">
        {/* Subtle background glow */}
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
            isDead
              ? "bg-purple-950/30"
              : currentHp <= 35
              ? "bg-red-950/40 animate-pulse"
              : "bg-rose-950/15"
          }`}
        />

        <div className="relative z-10 space-y-3">
          {/* Header Row: Rank badge, Hearts, Timer */}
          <div className="flex items-center justify-between">
            {/* Rank & Score */}
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-black border ${
                  currentRank === 1
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/50"
                    : "bg-slate-800 text-slate-200 border-slate-700"
                }`}
              >
                Hạng #{currentRank}
              </span>
              <span className="font-mono text-xs font-black text-rose-300">
                {totalScore.toLocaleString()} pts
              </span>
            </div>

            {/* 3 Glowing Hearts */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-xl border border-slate-800">
              {[1, 2, 3].map((hIdx) => (
                <Heart
                  key={hIdx}
                  size={18}
                  className={
                    hIdx <= heartsCount
                      ? "text-rose-500 fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                      : "text-slate-700 fill-slate-800"
                  }
                />
              ))}
            </div>

            {/* Countdown Clock */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono font-black text-base border ${
                slideTimeLeft && slideTimeLeft <= 5
                  ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse"
                  : "bg-slate-900 text-slate-200 border-slate-700"
              }`}
            >
              <Clock size={16} />
              <span>{slideTimeLeft !== null ? `${slideTimeLeft}s` : "0s"}</span>
            </div>
          </div>

          {/* Health Gauge Row */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
              <span className="flex items-center gap-1 text-slate-300">
                {isDead ? (
                  <>
                    <Skull size={14} className="text-purple-400" />
                    <span className="text-purple-300 font-black">
                      BÓNG MA (KHÁN GIẢ)
                    </span>
                  </>
                ) : (
                  <>
                    <Shield size={14} className="text-rose-400" />
                    <span className="text-slate-200">SINH LỰC CHIẾN BINH</span>
                  </>
                )}
              </span>
              <span
                className={`font-black ${
                  currentHp > 60
                    ? "text-emerald-400"
                    : currentHp > 30
                    ? "text-amber-400"
                    : "text-rose-500"
                }`}
              >
                {currentHp}/100 HP
              </span>
            </div>

            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDead
                    ? "bg-purple-600/50"
                    : currentHp > 60
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    : currentHp > 30
                    ? "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    : "bg-gradient-to-r from-rose-600 to-red-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Status Message */}
          {isDead && (
            <div className="text-[11px] font-bold text-center text-purple-300/90 bg-purple-950/40 border border-purple-500/30 rounded-xl py-1 px-2 animate-fade-in">
              👻 Bạn đã hết máu! Vẫn có thể trả lời để tích 50% điểm phụ vào
              bảng xếp hạng.
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          2. QUESTION DISPLAY
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950/90 border-2 border-slate-800 rounded-[28px] p-5 shadow-lg mb-4 text-center">
        <div className="inline-flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-black px-3 py-1 rounded-xl mb-3">
          <span>Câu {currentSlide.index !== undefined ? currentSlide.index + 1 : "?"}</span>
          <span>•</span>
          <span>Trắc Nghiệm Sinh Tồn</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white leading-relaxed">
          {currentSlide.questionText}
        </h3>
      </div>

      {/* ════════════════════════════════════════════════════════════
          3. TACTICAL COMBAT OPTIONS (A, B, C, D)
      ════════════════════════════════════════════════════════════ */}
      <div className="space-y-3 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentSlide.options.map((opt, idx) => {
            const style = OPTION_STYLES[idx % OPTION_STYLES.length];
            const isSelected = selectedIds.includes(opt.id);

            return (
              <button
                key={opt.id}
                type="button"
                disabled={hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)}
                onClick={() => {
                  toggleOption(opt.id);
                  // For quick mobile play: also trigger single submit if user just taps
                  if (!hasAnswered) {
                    handleSingleSubmit(opt.id);
                  }
                }}
                className={`relative p-4 rounded-[24px] border-2 text-left transition-all flex items-center justify-between gap-3 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSelected ? style.active : `${style.bg} ${style.border}`
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-md ${style.badge}`}
                  >
                    {OPTION_BADGES[idx] || idx + 1}
                  </div>
                  <span className="font-bold text-white text-base truncate">
                    {opt.content}
                  </span>
                </div>

                <div
                  className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? "bg-rose-500 border-rose-400 text-white"
                      : "border-slate-600 bg-slate-900/50"
                  }`}
                >
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Multi-choice Confirmation Button (if more than 1 option selected) */}
        {selectedIds.length > 1 && !hasAnswered && (
          <button
            type="button"
            onClick={handleMultiSubmit}
            className="w-full py-4 rounded-[22px] bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-base shadow-[0_6px_25px_rgba(244,63,94,0.5)] active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Send size={18} />
            <span>XÁC NHẬN {selectedIds.length} ĐÁP ÁN ĐÃ CHỌN</span>
          </button>
        )}

        {/* Waiting after answered */}
        {hasAnswered && (
          <div className="text-center py-3 px-4 bg-slate-900/80 border border-slate-700/60 rounded-[20px] text-xs font-bold text-slate-300 animate-pulse">
            ⚔️ ĐÃ NỘP PHƯƠNG ÁN! ĐANG CHỜ PHÁN QUYẾT SÀN ĐẤU...
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          4. DAMAGE / SHIELD / SURVIVE FEEDBACK OVERLAY
      ════════════════════════════════════════════════════════════ */}
      {answerResult && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-slate-950 border-4 border-rose-500/60 rounded-[36px] p-6 sm:p-8 max-w-sm w-full text-center shadow-[0_20px_60px_rgba(244,63,94,0.3)] animate-scale-up space-y-4">
            {/* Icon Header */}
            {answerResult.isCorrect ? (
              <div className="w-24 h-24 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-bounce">
                <Shield size={50} className="fill-emerald-400/20" />
              </div>
            ) : (answerResult.partialRatio ?? 0) > 0 ? (
              <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                <Zap size={50} />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto rounded-3xl bg-rose-500/20 border-2 border-rose-400 text-rose-500 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.5)] animate-pulse">
                <Heart size={50} className="fill-rose-500/20" />
              </div>
            )}

            {/* Title */}
            <div>
              <h2
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  answerResult.isCorrect
                    ? "text-emerald-400"
                    : (answerResult.partialRatio ?? 0) > 0
                    ? "text-amber-400"
                    : "text-rose-500"
                }`}
              >
                {answerResult.isCorrect
                  ? "PHÒNG THỦ HOÀN HẢO!"
                  : (answerResult.partialRatio ?? 0) > 0
                  ? "ĐÚNG TỪNG PHẦN!"
                  : "BỊ TRÚNG ĐÒN!"}
              </h2>

              <p className="text-xs font-bold text-slate-300 mt-1">
                {answerResult.isCorrect
                  ? "Giữ nguyên 100% sinh lực!"
                  : (answerResult.partialRatio ?? 0) > 0
                  ? `Nhờ Partial Credit, chỉ bị trừ -${answerResult.hpDeducted || 0} HP`
                  : `Bị trừ -${answerResult.hpDeducted || 35} HP`}
              </p>
            </div>

            {/* Score & HP change stats */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-[10px] font-black uppercase text-slate-400">
                  Điểm Thưởng
                </div>
                <div className="text-xl font-black text-white">
                  +{answerResult.scoreAwarded}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-black uppercase text-slate-400">
                  Máu Còn Lại
                </div>
                <div
                  className={`text-xl font-black ${
                    (answerResult.currentHp ?? 100) > 0
                      ? "text-emerald-400"
                      : "text-rose-500"
                  }`}
                >
                  {answerResult.currentHp ?? 100}/100
                </div>
              </div>
            </div>

            {/* Rank Change Indicator */}
            {answerResult.rankChange !== undefined &&
              answerResult.rankChange !== 0 && (
                <div className="text-xs font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 py-1.5 px-3 rounded-xl">
                  {answerResult.rankChange > 0
                    ? `🚀 Leo hạng: +${answerResult.rankChange} bậc!`
                    : `⚠️ Tụt hạng: ${answerResult.rankChange} bậc`}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
