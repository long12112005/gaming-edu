"use client";

import { useMemo, useState } from "react";
import {
  Heart,
  Skull,
  Shield,
  Clock,
  Users,
  Flame,
  Award,
  ChevronRight,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Swords,
  Crown,
} from "lucide-react";
import { BattleRoyaleState } from "@/hooks/useGameHub";

interface BattleRoyaleHostArenaProps {
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
  leaderboard: {
    rank: number;
    nickname: string;
    avatarUrl?: string;
    totalScore: number;
  }[];
  battleRoyaleState: BattleRoyaleState | null;
  players: {
    playerId: string;
    nickname: string;
    avatarUrl?: string;
  }[];
  onNextSlide: () => void;
  onEndGame: () => void;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];
const OPTION_COLORS = [
  {
    bg: "bg-red-500",
    border: "border-red-400",
    text: "text-red-400",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.35)]",
    gradient: "from-red-600 to-rose-700",
  },
  {
    bg: "bg-blue-500",
    border: "border-blue-400",
    text: "text-blue-400",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.35)]",
    gradient: "from-blue-600 to-cyan-700",
  },
  {
    bg: "bg-amber-500",
    border: "border-amber-400",
    text: "text-amber-400",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.35)]",
    gradient: "from-amber-600 to-yellow-700",
  },
  {
    bg: "bg-emerald-500",
    border: "border-emerald-400",
    text: "text-emerald-400",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.35)]",
    gradient: "from-emerald-600 to-teal-700",
  },
];

export default function BattleRoyaleHostArena({
  currentSlide,
  slideTimeLeft,
  answerProgress,
  distribution,
  leaderboard,
  battleRoyaleState,
  players,
  onNextSlide,
  onEndGame,
}: BattleRoyaleHostArenaProps) {
  const [showChartManually, setShowChartManually] = useState(false);

  const totalPlayersCount =
    battleRoyaleState?.totalPlayers ||
    answerProgress?.totalPlayers ||
    players.length ||
    1;

  const answeredCount = answerProgress?.answeredCount || 0;
  const answeredPercent = Math.min(
    100,
    Math.round((answeredCount / Math.max(1, totalPlayersCount)) * 100)
  );

  const survivorsCount =
    battleRoyaleState?.survivorsCount ??
    battleRoyaleState?.players?.filter((p) => !p.isEliminated).length ??
    totalPlayersCount;

  const eliminatedCount =
    battleRoyaleState?.eliminatedCount ??
    Math.max(0, totalPlayersCount - survivorsCount);

  const activeDist = distribution || answerProgress?.distribution || null;
  const isTimeUp = slideTimeLeft !== null && slideTimeLeft <= 0;
  const showDistChart = isTimeUp || showChartManually || !!distribution;

  // Map players into gladiators list with HP, rank, score
  const gladiators = useMemo(() => {
    if (battleRoyaleState?.players && battleRoyaleState.players.length > 0) {
      return battleRoyaleState.players;
    }

    // Fallback: Combine players with leaderboard
    return players.map((p, idx) => {
      const lb = leaderboard.find((l) => l.nickname === p.nickname);
      return {
        playerId: p.playerId,
        nickname: p.nickname,
        avatarUrl: p.avatarUrl,
        currentHp: 100,
        maxHp: 100,
        isEliminated: false,
        score: lb?.totalScore || 0,
        rank: lb?.rank || idx + 1,
      };
    });
  }, [battleRoyaleState, players, leaderboard]);

  // Check if multiple correct answers exist in distribution
  const isMultiChoice = useMemo(() => {
    if (!activeDist?.options) return false;
    const correctCount = activeDist.options.filter((o) => o.isCorrect).length;
    return correctCount > 1;
  }, [activeDist]);

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto space-y-4 px-2 sm:px-4 py-2 font-sans select-none">
      {/* ════════════════════════════════════════════════════════════
          1. TOP STATUS BAR: SURVIVOR COUNT, ANSWER FUEL, TIMER
      ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/90 backdrop-blur-xl border-2 border-rose-500/30 rounded-[28px] p-3 sm:p-4 shadow-[0_10px_40px_rgba(244,63,94,0.15)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-red-500/10 to-transparent pointer-events-none" />

        {/* Cột 1: Sống sót (Survivors) */}
        <div className="flex items-center gap-3 bg-rose-950/40 border border-rose-500/30 rounded-[20px] p-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse">
            <Heart size={26} className="fill-white" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-rose-300/80">
              Chiến Binh Trụ Hạng
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-baseline gap-1">
              <span>{survivorsCount}</span>
              <span className="text-xs text-rose-300 font-bold">
                / {totalPlayersCount}
              </span>
            </div>
          </div>
        </div>

        {/* Cột 2: Đã loại (Eliminated) */}
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-700/50 rounded-[20px] p-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300 shadow-sm">
            <Skull size={24} />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Đã Bị Loại Trừ
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight">
              {eliminatedCount}
            </div>
          </div>
        </div>

        {/* Cột 3: Tiến độ nộp câu trả lời */}
        <div className="flex flex-col justify-center bg-slate-900/60 border border-slate-700/50 rounded-[20px] p-3 relative z-10">
          <div className="flex items-center justify-between text-xs font-black text-cyan-200 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400 fill-amber-400" />
              ĐÃ NỘP BÀI
            </span>
            <span className="text-white font-mono">
              {answeredCount}/{totalPlayersCount} ({answeredPercent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-rose-500 rounded-full transition-all duration-300"
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
          2. CENTRAL QUESTION & A, B, C, D DISTRIBUTION CARD
      ════════════════════════════════════════════════════════════ */}
      {currentSlide && (
        <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-rose-500/40 rounded-[32px] p-4 sm:p-6 shadow-[0_12px_45px_rgba(0,0,0,0.6)] relative overflow-hidden">
          {/* Neon energy beam border top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 animate-pulse" />

          {/* Question Header tags */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5">
                <Swords size={16} />
                CÂU {currentSlide.index !== undefined ? currentSlide.index + 1 : 1}
              </span>
              <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider">
                {isMultiChoice
                  ? "ĐA ĐÁP ÁN (PARTIAL CREDIT)"
                  : "TRẮC NGHIỆM SINH TỒN"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
                ★ {currentSlide.points} Điểm
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

          {/* Question Title */}
          <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white text-center py-2 sm:py-3 leading-snug tracking-tight">
            {currentSlide.questionText}
          </h2>

          {/* ════ BIỂU ĐỒ PHÂN BỔ ĐÁP ÁN A, B, C, D ════ */}
          {showDistChart && activeDist?.options && (
            <div className="mt-4 pt-4 border-t border-rose-500/20 animate-fade-in-up">
              <div className="flex items-center justify-between mb-3 text-xs font-black text-rose-300 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <BarChart3 size={16} className="text-rose-400" />
                  Biểu Đồ Phân Bổ Đáp Án
                </span>
                <span className="text-slate-400">
                  Tổng lượt chọn: {activeDist.totalAnswers}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeDist.options.map((opt, idx) => {
                  const style = OPTION_COLORS[idx % OPTION_COLORS.length];
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
          3. SÀN ĐẤU CHIẾN BINH (GLADIATOR ARENA GRID)
      ════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950/80 border-2 border-slate-800 rounded-[32px] p-4 sm:p-5 shadow-xl flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="text-rose-500" size={20} />
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              Võ Đài Sinh Tồn (Đấu Thủ Trên Sàn)
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Hạ gục khi máu về 0 HP
          </span>
        </div>

        {/* Grid các đấu thủ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
          {gladiators.map((player) => {
            const isDead = player.isEliminated || player.currentHp <= 0;
            const hpRatio = Math.max(0, Math.min(100, player.currentHp));

            // Heart count (100 = 3 hearts, 65 = 2 hearts, 30 = 1 heart, 0 = 0)
            const hearts =
              player.currentHp >= 70
                ? 3
                : player.currentHp >= 35
                ? 2
                : player.currentHp > 0
                ? 1
                : 0;

            return (
              <div
                key={player.playerId}
                className={`relative rounded-[22px] p-3 border-2 transition-all flex flex-col justify-between overflow-hidden ${
                  isDead
                    ? "bg-slate-950/80 border-slate-800 opacity-60 grayscale hover:grayscale-0"
                    : "bg-slate-900/90 border-rose-500/30 hover:border-rose-400 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                }`}
              >
                {/* Top: Rank badge & Heart Icons */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${
                      player.rank === 1
                        ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    #{player.rank}
                  </span>

                  {/* 3 Hearts Indicator */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3].map((hIdx) => (
                      <Heart
                        key={hIdx}
                        size={13}
                        className={
                          hIdx <= hearts
                            ? "text-rose-500 fill-rose-500"
                            : "text-slate-700 fill-slate-800"
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Center: Avatar & Nickname */}
                <div className="flex flex-col items-center my-1 text-center">
                  <div className="relative">
                    <img
                      src={
                        player.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${player.nickname}&background=be123c&color=fff&size=56`
                      }
                      alt={player.nickname}
                      className={`w-12 h-12 rounded-2xl border-2 object-cover ${
                        isDead
                          ? "border-slate-700"
                          : player.rank === 1
                          ? "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                          : "border-rose-500/40"
                      }`}
                    />
                    {isDead && (
                      <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center text-rose-400 font-bold text-xs">
                        <Skull size={20} />
                      </div>
                    )}
                    {player.rank === 1 && !isDead && (
                      <Crown
                        size={16}
                        className="absolute -top-2 -right-1 text-amber-400 fill-amber-400 animate-bounce"
                      />
                    )}
                  </div>

                  <span className="text-xs font-black text-white mt-1.5 truncate max-w-[120px]">
                    {player.nickname}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-rose-300/80">
                    {player.score.toLocaleString()} pts
                  </span>
                </div>

                {/* Bottom: HP Bar & Status */}
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 mb-1">
                    <span>HP</span>
                    <span
                      className={
                        player.currentHp > 50
                          ? "text-emerald-400"
                          : player.currentHp > 0
                          ? "text-amber-400"
                          : "text-rose-500 font-black"
                      }
                    >
                      {player.currentHp}/100
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                    <div
                      className={`h-full transition-all duration-300 ${
                        player.currentHp > 60
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : player.currentHp > 30
                          ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                          : "bg-gradient-to-r from-rose-600 to-red-500 animate-pulse"
                      }`}
                      style={{ width: `${hpRatio}%` }}
                    />
                  </div>

                  {isDead && (
                    <div className="text-[9px] font-black uppercase text-center text-slate-400 mt-1">
                      👻 Khán giả
                    </div>
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
          <Flame size={16} className="text-rose-500" />
          <span>Mini-Game 02: Sàn Đấu Sinh Tồn (Battle Royale)</span>
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
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs sm:text-sm shadow-[0_4px_16px_rgba(244,63,94,0.4)] flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <span>Câu Tiếp Theo</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
