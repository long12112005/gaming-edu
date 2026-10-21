"use client";

import { useMemo, useState } from "react";
import {
  Coins,
  Flame,
  Dices,
  Clock,
  Trophy,
  ChevronRight,
  BarChart3,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  Crown,
} from "lucide-react";
import { WagerPoolState } from "@/hooks/useGameHub";

interface QuizWagerHostViewProps {
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
  } | null;
  slideTimeLeft: number | null;
  answerProgress: {
    slideId: string;
    answeredCount: number;
    totalPlayers: number;
    distribution?: {
      options: {
        optionId: string;
        content: string;
        count: number;
        percentage: number;
        isCorrect: boolean;
        orderIndex: number;
      }[];
      totalAnswers: number;
    };
    wagerPool?: WagerPoolState;
  } | null;
  distribution: {
    options: {
      optionId: string;
      content: string;
      count: number;
      percentage: number;
      isCorrect: boolean;
      orderIndex: number;
    }[];
    totalAnswers: number;
  } | null;
  wagerPool: WagerPoolState | null;
  leaderboard: {
    rank: number;
    nickname: string;
    avatarUrl?: string;
    totalScore: number;
  }[];
  players: {
    playerId: string;
    nickname: string;
    avatarUrl?: string;
  }[];
  onNextSlide: () => void;
  onEndGame: () => void;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];
const OPTION_PALETTES = [
  {
    bg: "bg-red-500",
    border: "border-red-400",
    text: "text-red-400",
    gradient: "from-red-600 to-rose-700",
  },
  {
    bg: "bg-blue-500",
    border: "border-blue-400",
    text: "text-blue-400",
    gradient: "from-blue-600 to-cyan-700",
  },
  {
    bg: "bg-amber-500",
    border: "border-amber-400",
    text: "text-amber-400",
    gradient: "from-amber-600 to-yellow-700",
  },
  {
    bg: "bg-emerald-500",
    border: "border-emerald-400",
    text: "text-emerald-400",
    gradient: "from-emerald-600 to-teal-700",
  },
];

export default function QuizWagerHostView({
  currentSlide,
  slideTimeLeft,
  answerProgress,
  distribution,
  wagerPool,
  leaderboard,
  players,
  onNextSlide,
  onEndGame,
}: QuizWagerHostViewProps) {
  const [showChartManually, setShowChartManually] = useState(false);

  const totalPlayersCount =
    answerProgress?.totalPlayers || players.length || 1;
  const answeredCount = answerProgress?.answeredCount || 0;
  const answeredPercent = Math.min(
    100,
    Math.round((answeredCount / Math.max(1, totalPlayersCount)) * 100)
  );

  const activePool = wagerPool || answerProgress?.wagerPool || null;
  const totalWagerAmount = activePool?.totalWagerAmount || 0;
  const allInCount = activePool?.allInCount || 0;
  const totalWagersPlaced = activePool?.totalWagersPlaced || 0;

  const activeDist = distribution || answerProgress?.distribution || null;
  const isTimeUp = slideTimeLeft !== null && slideTimeLeft <= 0;
  const showDistChart = isTimeUp || showChartManually || !!distribution;

  // Build map of player wagers for display on leaderboard
  const wagersMap = useMemo(() => {
    const map = new Map<string, { percent: number; amount: number; isAllIn: boolean }>();
    if (activePool?.wagers) {
      for (const w of activePool.wagers) {
        map.set(w.nickname, {
          percent: w.wagerPercent,
          amount: w.wagerAmount,
          isAllIn: w.isAllIn,
        });
      }
    }
    return map;
  }, [activePool]);

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto space-y-4 px-2 sm:px-4 py-2 font-sans select-none">
      {/* ════════════════════════════════════════════════════════════
          1. TOP STATUS BAR: TOTAL WAGER POT, ALL-IN COUNT, TIMER
      ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/90 backdrop-blur-xl border-2 border-purple-500/30 rounded-[28px] p-3 sm:p-4 shadow-[0_10px_40px_rgba(168,85,247,0.15)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent pointer-events-none" />

        {/* Cột 1: Tổng điểm cược cả phòng */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-950/40 to-purple-950/40 border border-amber-500/30 rounded-[20px] p-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-teal-950 shadow-[0_0_20px_rgba(251,191,36,0.4)] animate-pulse">
            <Coins size={26} className="fill-amber-950" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-amber-300">
              Tổng Cược Sàn Đấu
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-baseline gap-1">
              <span>{totalWagerAmount.toLocaleString()}</span>
              <span className="text-xs text-amber-400 font-bold">pts</span>
            </div>
          </div>
        </div>

        {/* Cột 2: Số người chơi All-in */}
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-700/50 rounded-[20px] p-3 relative z-10">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white border transition-all ${
              allInCount > 0
                ? "bg-gradient-to-br from-red-600 to-rose-600 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-bounce"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <Flame size={26} className={allInCount > 0 ? "fill-white" : ""} />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Cược Tất Tay (All-In)
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight flex items-baseline gap-1">
              <span>{allInCount}</span>
              <span className="text-xs text-slate-400 font-bold">người</span>
            </div>
          </div>
        </div>

        {/* Cột 3: Tỷ lệ nộp bài */}
        <div className="flex flex-col justify-center bg-slate-900/60 border border-slate-700/50 rounded-[20px] p-3 relative z-10">
          <div className="flex items-center justify-between text-xs font-black text-purple-200 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-purple-400 fill-purple-400" />
              ĐÃ NỘP BÀI
            </span>
            <span className="text-white font-mono">
              {answeredCount}/{totalPlayersCount} ({answeredPercent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${answeredPercent}%` }}
            />
          </div>
        </div>

        {/* Cột 4: Đồng hồ đếm ngược */}
        <div className="flex items-center justify-between sm:justify-center gap-3 bg-slate-900/80 border border-slate-700/60 rounded-[20px] p-3 relative z-10">
          <div className="flex items-center gap-2">
            <Clock
              size={22}
              className={
                slideTimeLeft && slideTimeLeft <= 5
                  ? "text-rose-400 animate-bounce"
                  : "text-amber-400"
              }
            />
            <div className="text-xs font-black uppercase tracking-wider text-slate-300 sm:hidden">
              Thời Gian
            </div>
          </div>
          <div
            className={`font-mono font-black text-3xl sm:text-4xl tabular-nums ${
              slideTimeLeft && slideTimeLeft <= 5
                ? "text-rose-500 animate-pulse drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]"
                : "text-white"
            }`}
          >
            {slideTimeLeft !== null ? `${slideTimeLeft}s` : "–"}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          2. CENTRAL QUESTION & DISTRIBUTION CHART
      ════════════════════════════════════════════════════════════ */}
      {currentSlide && (
        <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-purple-500/40 rounded-[32px] p-4 sm:p-6 shadow-[0_12px_45px_rgba(0,0,0,0.6)] relative overflow-hidden">
          {/* Neon energy beam top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-purple-500 to-pink-500 animate-pulse" />

          {/* Question Header tags */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-3 py-1 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5">
                <Dices size={16} />
                CÂU {currentSlide.index !== undefined ? currentSlide.index + 1 : 1}
              </span>
              <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider">
                ĐẶT CƯỢC TRÍ TUỆ (ALL-IN)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
                ★ {currentSlide.points} Điểm Gốc
              </span>
              <button
                type="button"
                onClick={() => setShowChartManually((prev) => !prev)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <BarChart3 size={15} />
                {showDistChart ? "Ẩn Phân Bổ" : "Xem Phân Bổ"}
              </button>
            </div>
          </div>

          {/* Question text */}
          <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white text-center py-2 sm:py-3 leading-snug tracking-tight">
            {currentSlide.questionText}
          </h2>

          {/* Biểu đồ phân bổ A, B, C, D */}
          {showDistChart && activeDist?.options && (
            <div className="mt-4 pt-4 border-t border-purple-500/20 animate-fade-in-up">
              <div className="flex items-center justify-between mb-3 text-xs font-black text-purple-300 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <BarChart3 size={16} className="text-purple-400" />
                  Biểu Đồ Phân Bổ Đáp Án
                </span>
                <span className="text-slate-400">
                  Tổng lượt chọn: {activeDist.totalAnswers}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeDist.options.map((opt, idx) => {
                  const style = OPTION_PALETTES[idx % OPTION_PALETTES.length];
                  return (
                    <div
                      key={opt.optionId}
                      className={`relative p-3.5 rounded-[20px] border-2 transition-all overflow-hidden ${
                        opt.isCorrect
                          ? "bg-emerald-950/40 border-emerald-400/90 shadow-[0_0_25px_rgba(16,185,129,0.25)]"
                          : "bg-slate-900/60 border-slate-700/60"
                      }`}
                    >
                      {/* Percent background bar */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 opacity-20 pointer-events-none transition-all duration-500 ${
                          opt.isCorrect ? "bg-emerald-500" : style.bg
                        }`}
                        style={{ width: `${opt.percentage}%` }}
                      />

                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center text-white shrink-0 ${
                              opt.isCorrect ? "bg-emerald-500" : style.bg
                            }`}
                          >
                            {OPTION_LABELS[idx] || idx + 1}
                          </span>
                          <span className="font-bold text-sm text-slate-100 truncate">
                            {opt.content}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {opt.isCorrect && (
                            <span className="text-emerald-400 flex items-center gap-1 text-xs font-black bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded-lg">
                              <CheckCircle2 size={14} /> Đúng
                            </span>
                          )}
                          <span className="font-mono font-black text-base text-white">
                            {opt.count}
                          </span>
                          <span className="text-xs font-bold text-slate-400 font-mono">
                            ({opt.percentage}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          3. HIGH-STAKES LEADERBOARD WITH WAGER CHIPS
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950/80 border-2 border-slate-800 rounded-[32px] p-4 sm:p-5 shadow-xl flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-400" size={20} />
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              Bảng Xếp Hạng & Mức Cược Đấu Thủ
            </h3>
          </div>
          <span className="text-xs font-bold text-purple-300">
            Thắng cược nhân đôi điểm • Thua cược trừ điểm
          </span>
        </div>

        {/* Danh sách xếp hạng */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
          {leaderboard.map((player) => {
            const wager = wagersMap.get(player.nickname);
            const isTop1 = player.rank === 1;

            return (
              <div
                key={player.nickname}
                className={`relative rounded-[22px] p-3.5 border-2 transition-all flex items-center justify-between gap-3 overflow-hidden ${
                  isTop1
                    ? "bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                    : "bg-slate-900/90 border-slate-800 hover:border-purple-500/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank badge */}
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${
                      isTop1
                        ? "bg-amber-400 text-teal-950 border-amber-300 shadow-md"
                        : player.rank <= 3
                        ? "bg-slate-800 text-purple-300 border-purple-500/30"
                        : "bg-slate-800/80 text-slate-400 border-slate-700"
                    }`}
                  >
                    #{player.rank}
                  </div>

                  {/* Avatar & Nickname */}
                  <div className="relative shrink-0">
                    <img
                      src={
                        player.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${player.nickname}&background=7e22ce&color=fff&size=40`
                      }
                      alt={player.nickname}
                      className="w-10 h-10 rounded-2xl border border-slate-700 object-cover"
                    />
                    {isTop1 && (
                      <Crown
                        size={14}
                        className="absolute -top-2 -right-1 text-amber-400 fill-amber-400 animate-bounce"
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-black text-white truncate max-w-[110px]">
                      {player.nickname}
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-400">
                      {player.totalScore.toLocaleString()} pts
                    </div>
                  </div>
                </div>

                {/* Wager Chip Badge */}
                <div className="shrink-0 text-right">
                  {wager ? (
                    <div
                      className={`text-[11px] font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
                        wager.isAllIn
                          ? "bg-red-500/20 text-red-300 border-red-500/50 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                          : wager.percent === 50
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                          : wager.percent === 25
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {wager.isAllIn ? (
                        <>
                          <Flame size={12} className="text-red-400 fill-red-400" />
                          <span>ALL-IN</span>
                        </>
                      ) : (
                        <span>🎲 {wager.percent}%</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-bold">
                      Chưa cược
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          4. HOST ACTION CONTROLS
      ════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border-2 border-slate-800 rounded-[24px] p-3 sm:p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Sparkles size={16} className="text-amber-400" />
          <span>Mini-Game 03: Đặt Cược Trí Tuệ (Quiz Wager / All-in)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEndGame}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-bold border border-slate-700 transition-all"
          >
            Kết Thúc Sớm
          </button>

          <button
            type="button"
            onClick={onNextSlide}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:opacity-90 text-white font-black text-xs sm:text-sm shadow-[0_4px_16px_rgba(168,85,247,0.4)] flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <span>Câu Tiếp Theo</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
