"use client";

import { useState, useMemo } from "react";
import {
  Coins,
  Flame,
  Dices,
  Clock,
  Sparkles,
  Trophy,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface QuizWagerPlayerViewProps {
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
    wagerPercent?: number;
    wagerAmount?: number;
    wagerNetGain?: number;
  } | null;
  totalScore: number;
  currentRank: number;
  onPlaceWager: (wagerPercent: number, wagerAmount: number) => void;
  onSubmitAnswer: (optionId: string, wagerPercent: number, wagerAmount: number) => void;
}

const CHIP_OPTIONS = [
  {
    percent: 0,
    label: "0%",
    title: "An Toàn",
    desc: "Không cược điểm",
    color: "from-slate-700 to-slate-800",
    border: "border-slate-500",
    badge: "bg-slate-700 text-slate-300",
    glow: "",
  },
  {
    percent: 25,
    label: "25%",
    title: "Thăm Dò",
    desc: "Cược 1/4 số điểm",
    color: "from-blue-600 to-cyan-600",
    border: "border-blue-400",
    badge: "bg-blue-500 text-white",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.4)]",
  },
  {
    percent: 50,
    label: "50%",
    title: "Tự Tin",
    desc: "Cược nửa số điểm",
    color: "from-purple-600 to-indigo-600",
    border: "border-purple-400",
    badge: "bg-purple-500 text-white",
    glow: "shadow-[0_0_18px_rgba(168,85,247,0.4)]",
  },
  {
    percent: 100,
    label: "ALL-IN",
    title: "Tất Tay",
    desc: "Nhân đôi toàn bộ!",
    color: "from-amber-500 via-orange-500 to-red-600",
    border: "border-amber-300",
    badge: "bg-amber-400 text-teal-950 font-black",
    glow: "shadow-[0_0_25px_rgba(251,191,36,0.6)]",
  },
];

const OPTION_BADGES = ["A", "B", "C", "D", "E", "F"];
const OPTION_COLORS = [
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

export default function QuizWagerPlayerView({
  currentSlide,
  slideTimeLeft,
  hasAnswered,
  answerResult,
  totalScore,
  currentRank,
  onPlaceWager,
  onSubmitAnswer,
}: QuizWagerPlayerViewProps) {
  const [selectedPercent, setSelectedPercent] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Bankroll for betting: If totalScore is 0, give player an initial bankroll equal to slide points
  const effectiveBankroll = useMemo(() => {
    return Math.max(totalScore, currentSlide.points || 100);
  }, [totalScore, currentSlide.points]);

  const calculatedWagerAmount = useMemo(() => {
    return Math.round(effectiveBankroll * (selectedPercent / 100.0));
  }, [effectiveBankroll, selectedPercent]);

  const handleSelectChip = (percent: number) => {
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;
    setSelectedPercent(percent);
    const amount = Math.round(effectiveBankroll * (percent / 100.0));
    onPlaceWager(percent, amount);
  };

  const handleChooseOption = (optionId: string) => {
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;
    setSelectedOptionId(optionId);
    onSubmitAnswer(optionId, selectedPercent, calculatedWagerAmount);
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto select-none font-sans relative py-2">
      {/* ════════════════════════════════════════════════════════════
          1. TOP HUD: SCORE, CHIP STATUS, TIMER, RANK
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950/90 backdrop-blur-xl border-2 border-purple-500/40 rounded-[28px] p-4 shadow-[0_10px_35px_rgba(168,85,247,0.18)] mb-4 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-purple-500/15 to-transparent pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
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
            <div className="flex items-center gap-1 font-mono text-sm font-black text-amber-300">
              <Coins size={15} />
              <span>{totalScore.toLocaleString()} pts</span>
            </div>
          </div>

          {/* Current Wager Badge */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Cược:</span>
            <span
              className={`text-xs font-black ${
                selectedPercent === 100
                  ? "text-rose-400 animate-pulse"
                  : selectedPercent > 0
                  ? "text-purple-300"
                  : "text-slate-300"
              }`}
            >
              {selectedPercent === 100 ? "🔥 ALL-IN" : `${selectedPercent}%`}
            </span>
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
      </div>

      {/* ════════════════════════════════════════════════════════════
          2. QUESTION DISPLAY
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950/90 border-2 border-slate-800 rounded-[28px] p-5 shadow-lg mb-4 text-center">
        <div className="inline-flex items-center gap-1.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-black px-3 py-1 rounded-xl mb-3">
          <Dices size={14} />
          <span>Câu {currentSlide.index !== undefined ? currentSlide.index + 1 : "?"}</span>
          <span>•</span>
          <span>Đặt Cược Trí Tuệ</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white leading-relaxed">
          {currentSlide.questionText}
        </h3>
      </div>

      {/* ════════════════════════════════════════════════════════════
          3. CHIP SELECTION BAR (CHỌN MỨC CƯỢC 0%, 25%, 50%, ALL-IN)
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950/80 border-2 border-slate-800/90 rounded-[26px] p-3 mb-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 px-1">
          <span className="flex items-center gap-1 text-purple-300">
            <Coins size={14} />
            Chọn Mức Cược Câu Này:
          </span>
          <span className="text-amber-400 font-mono font-black">
            {calculatedWagerAmount.toLocaleString()} pts
          </span>
        </div>

        {/* 4 Chips */}
        <div className="grid grid-cols-4 gap-2">
          {CHIP_OPTIONS.map((chip) => {
            const isSelected = selectedPercent === chip.percent;
            return (
              <button
                key={chip.percent}
                type="button"
                disabled={hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)}
                onClick={() => handleSelectChip(chip.percent)}
                className={`relative py-2.5 px-1 rounded-2xl border-2 transition-all flex flex-col items-center justify-center active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSelected
                    ? `bg-gradient-to-b ${chip.color} ${chip.border} ${chip.glow} scale-105 z-10`
                    : "bg-slate-900 border-slate-700/80 hover:border-slate-500"
                }`}
              >
                <div
                  className={`text-xs sm:text-sm font-black ${
                    isSelected ? "text-white" : "text-slate-300"
                  }`}
                >
                  {chip.label}
                </div>
                <div
                  className={`text-[9px] font-bold ${
                    isSelected ? "text-white/90" : "text-slate-400"
                  }`}
                >
                  {chip.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          4. TACTICAL OPTIONS (A, B, C, D)
      ════════════════════════════════════════════════════════════ */}
      <div className="space-y-3 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentSlide.options.map((opt, idx) => {
            const style = OPTION_COLORS[idx % OPTION_COLORS.length];
            const isSelected = selectedOptionId === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                disabled={hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)}
                onClick={() => handleChooseOption(opt.id)}
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
                      ? "bg-purple-500 border-purple-400 text-white"
                      : "border-slate-600 bg-slate-900/50"
                  }`}
                >
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Waiting status */}
        {hasAnswered && (
          <div className="text-center py-3 px-4 bg-slate-900/80 border border-slate-700/60 rounded-[20px] text-xs font-bold text-slate-300 animate-pulse">
            🎲 ĐÃ GỬI BÀI VÀ MỨC CƯỢC! ĐANG CHỜ CÔNG BỐ KẾT QUẢ...
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          5. WIN / LOSS WAGER RESULT OVERLAY
      ════════════════════════════════════════════════════════════ */}
      {answerResult && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-slate-950 border-4 border-purple-500/60 rounded-[36px] p-6 sm:p-8 max-w-sm w-full text-center shadow-[0_20px_60px_rgba(168,85,247,0.3)] animate-scale-up space-y-4">
            {/* Header Icon */}
            {answerResult.isCorrect ? (
              <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-500 text-teal-950 flex items-center justify-center shadow-[0_0_35px_rgba(251,191,36,0.6)] animate-bounce">
                <Coins size={50} />
              </div>
            ) : (
              <div className="w-24 h-24 mx-auto rounded-3xl bg-rose-500/20 border-2 border-rose-400 text-rose-500 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.5)] animate-pulse">
                <Flame size={50} className="fill-rose-500/20" />
              </div>
            )}

            {/* Title */}
            <div>
              <h2
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  answerResult.isCorrect ? "text-amber-400" : "text-rose-500"
                }`}
              >
                {answerResult.isCorrect
                  ? answerResult.wagerPercent && answerResult.wagerPercent >= 100
                    ? "JACKPOT ALL-IN!"
                    : "THẮNG CƯỢC XUẤT SẮC!"
                  : "CHÁY CƯỢC ĐÁNG TIẾC!"}
              </h2>

              <p className="text-xs font-bold text-slate-300 mt-1">
                {answerResult.isCorrect
                  ? `Nhận trọn điểm câu hỏi + thưởng cược ${answerResult.wagerPercent || 0}%!`
                  : `Bị trừ -${Math.abs(answerResult.wagerNetGain || answerResult.wagerAmount || 0)} điểm cược`}
              </p>
            </div>

            {/* Score Stats */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-[10px] font-black uppercase text-slate-400">
                  {answerResult.isCorrect ? "Điểm Nhận Được" : "Điểm Bị Trừ"}
                </div>
                <div
                  className={`text-xl font-black ${
                    answerResult.isCorrect ? "text-emerald-400" : "text-rose-500"
                  }`}
                >
                  {answerResult.isCorrect
                    ? `+${answerResult.scoreAwarded}`
                    : `-${Math.abs(answerResult.scoreAwarded)}`}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-black uppercase text-slate-400">
                  Tổng Điểm Mới
                </div>
                <div className="text-xl font-black text-amber-400">
                  {answerResult.totalScore.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Rank Change Indicator */}
            {answerResult.rankChange !== undefined &&
              answerResult.rankChange !== 0 && (
                <div className="text-xs font-black text-amber-300 bg-amber-500/10 border border-amber-500/30 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5">
                  <TrendingUp size={16} />
                  <span>
                    {answerResult.rankChange > 0
                      ? `🚀 Lội ngược dòng: +${answerResult.rankChange} bậc trên BXH!`
                      : `⚠️ Tụt hạng: ${answerResult.rankChange} bậc`}
                  </span>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
