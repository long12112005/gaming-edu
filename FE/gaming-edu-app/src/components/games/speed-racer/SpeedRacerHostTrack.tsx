"use client";

import React, { useMemo, useState } from "react";
import {
  Trophy,
  Zap,
  Flame,
  Users,
  Check,
  ChevronRight,
  BarChart2,
  Clock,
  Crown,
  Sparkles,
  Flag,
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

interface PlayerItem {
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  totalScore?: number;
}

interface AnswerProgress {
  slideId: string;
  answeredCount: number;
  totalPlayers: number;
  distribution?: {
    totalAnswers: number;
    totalPlayers: number;
    options: Array<{
      optionId: string;
      content: string;
      orderIndex: number;
      isCorrect: boolean;
      count: number;
      percentage: number;
    }>;
  };
}

interface SpeedRacerHostTrackProps {
  currentSlide: CurrentSlide | null;
  players: PlayerItem[];
  leaderboard: any[];
  answerProgress: AnswerProgress | null;
  distribution: any | null;
  gameState: string;
  slideTimeLeft: number | null;
  onNextSlide: () => void;
  onEndGame: () => void;
}

// Car color palettes for dynamic racers
const CAR_PALETTES = [
  { body: "from-red-500 to-rose-700", glow: "rgba(239, 68, 68, 0.4)", text: "text-red-400" },
  { body: "from-blue-500 to-cyan-600", glow: "rgba(59, 130, 246, 0.4)", text: "text-blue-400" },
  { body: "from-amber-400 to-orange-500", glow: "rgba(245, 158, 11, 0.4)", text: "text-amber-400" },
  { body: "from-emerald-400 to-teal-600", glow: "rgba(16, 185, 129, 0.4)", text: "text-emerald-400" },
  { body: "from-purple-500 to-indigo-600", glow: "rgba(168, 85, 247, 0.4)", text: "text-purple-400" },
  { body: "from-pink-500 to-rose-500", glow: "rgba(236, 72, 153, 0.4)", text: "text-pink-400" },
  { body: "from-yellow-300 to-amber-500", glow: "rgba(251, 191, 36, 0.4)", text: "text-yellow-300" },
  { body: "from-cyan-400 to-blue-600", glow: "rgba(6, 182, 212, 0.4)", text: "text-cyan-400" },
];

export default function SpeedRacerHostTrack({
  currentSlide,
  players,
  leaderboard,
  answerProgress,
  distribution,
  gameState,
  slideTimeLeft,
  onNextSlide,
  onEndGame,
}: SpeedRacerHostTrackProps) {
  const [showDistributionModal, setShowDistributionModal] = useState(false);

  // Merge leaderboard score into player items
  const racers = useMemo(() => {
    const list = players.map((p, idx) => {
      const lbEntry = leaderboard.find(
        (l) => l.playerId === p.playerId || l.nickname === p.nickname
      );
      const score = lbEntry ? lbEntry.totalScore : p.totalScore || 0;
      const rank = lbEntry ? lbEntry.rank : idx + 1;
      return {
        ...p,
        score,
        rank,
        palette: CAR_PALETTES[idx % CAR_PALETTES.length],
      };
    });

    // Sort by score desc
    list.sort((a, b) => b.score - a.score);

    // Compute progress % along racetrack (5% at start, up to 92% at finish line)
    const maxScore = Math.max(1000, ...list.map((r) => r.score));
    return list.map((r, i) => {
      const trackPct =
        r.score === 0
          ? 6 + (i % 3) * 2 // slight stagger on start grid
          : Math.min(92, 8 + (r.score / maxScore) * 82);
      return {
        ...r,
        trackPct,
      };
    });
  }, [players, leaderboard]);

  // Answer count calculation
  const totalRacers = players.length > 0 ? players.length : answerProgress?.totalPlayers || 1;
  const answeredCount = answerProgress?.answeredCount || 0;
  const answeredPercent = Math.min(100, Math.round((answeredCount / totalRacers) * 100));

  // Distribution options data
  const distOptions = useMemo(() => {
    const activeDist = distribution || answerProgress?.distribution;
    if (activeDist?.options && activeDist.options.length > 0) {
      return activeDist.options;
    }
    // Fallback based on slide options
    return (currentSlide?.options || []).map((o, idx) => ({
      optionId: o.id,
      content: o.content,
      orderIndex: o.orderIndex ?? idx,
      isCorrect: false,
      count: 0,
      percentage: 0,
    }));
  }, [distribution, answerProgress, currentSlide]);

  const optionLetters = ["A", "B", "C", "D"];
  const optionBgColors = [
    "from-red-500 to-rose-600 border-red-400 text-white shadow-[0_6px_0_0_#991b1b]",
    "from-blue-500 to-indigo-600 border-blue-400 text-white shadow-[0_6px_0_0_#1e40af]",
    "from-amber-400 to-orange-500 border-amber-300 text-amber-950 shadow-[0_6px_0_0_#b45309]",
    "from-emerald-500 to-teal-600 border-emerald-400 text-white shadow-[0_6px_0_0_#065f46]",
  ];

  const isSlideEnded = gameState === "LEADERBOARD" || slideTimeLeft === 0;

  return (
    <div className="w-full space-y-6 animate-fade-in-up font-sans">
      {/* ── 1. RACE HUD / TOP BAR ────────────────────────────────────── */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-2 border-orange-500/40 rounded-[28px] p-5 shadow-[0_10px_30px_rgba(249,115,22,0.15)] text-white flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Title & Theme */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shrink-0">
            🏎️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Speed Racer
              </span>
              <span className="text-xs font-semibold text-gray-400">
                Câu {currentSlide?.index !== undefined ? currentSlide.index + 1 : "?"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Đấu Trường Tốc Độ
            </h2>
          </div>
        </div>

        {/* Live Answer Progress (Số xe đã nộp bài) */}
        <div className="flex-1 max-w-md w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 px-4">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1.5 text-orange-300">
              <Flame size={14} className="text-orange-400 animate-pulse" />
              Tiến Độ Nộp Bài Vòng Đua
            </span>
            <span className="font-mono text-white text-sm font-black">
              {answeredCount} / {totalRacers} xe ({answeredPercent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(249,115,22,0.8)]"
              style={{ width: `${answeredPercent}%` }}
            />
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 font-mono font-black text-2xl ${
              slideTimeLeft !== null && slideTimeLeft <= 5
                ? "bg-red-500/20 border-red-500 text-red-300 animate-pulse"
                : "bg-slate-800 border-slate-600 text-amber-300"
            }`}
          >
            <Clock size={20} />
            <span>{slideTimeLeft !== null ? slideTimeLeft : currentSlide?.timeLimit || 30}s</span>
          </div>
        </div>
      </div>

      {/* ── 2. QUESTION & DISTRIBUTION SECTION ──────────────────────── */}
      {currentSlide && (
        <div className="bg-white rounded-[36px] border-4 border-slate-200/90 shadow-[0_12px_36px_rgba(0,0,0,0.06)] p-6 md:p-8 text-center relative overflow-hidden">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 mb-8 leading-tight tracking-tight max-w-4xl mx-auto">
            {currentSlide.questionText}
          </h2>

          {/* 4 Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto mb-4">
            {currentSlide.options &&
              currentSlide.options.map((opt, idx) => {
                const dist = distOptions.find(
                  (d: any) =>
                    d.optionId === opt.id ||
                    d.orderIndex === opt.orderIndex ||
                    d.content === opt.content
                );
                const isCorrect = isSlideEnded && dist?.isCorrect;

                return (
                  <div
                    key={opt.id}
                    className={`relative rounded-[24px] border-4 p-5 text-left transition-all overflow-hidden ${
                      isSlideEnded
                        ? isCorrect
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-300 text-white shadow-[0_0_24px_rgba(16,185,129,0.5)] ring-4 ring-emerald-400/40 scale-[1.02]"
                          : "bg-slate-100 border-slate-200 text-slate-500 opacity-60"
                        : `bg-gradient-to-r ${optionBgColors[idx % 4]}`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl border-2 border-white/30 flex items-center justify-center text-xl font-black shrink-0 shadow-inner">
                          {optionLetters[idx]}
                        </div>
                        <span className="font-extrabold text-xl md:text-2xl leading-snug">
                          {opt.content}
                        </span>
                      </div>

                      {/* Distribution badge when slide ended */}
                      {isSlideEnded && dist && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-3 py-1 rounded-xl text-sm font-black border ${
                              isCorrect
                                ? "bg-white text-emerald-800 border-emerald-200"
                                : "bg-slate-200 text-slate-700 border-slate-300"
                            }`}
                          >
                            {dist.count} xe ({dist.percentage}%)
                          </span>
                          {isCorrect && (
                            <span className="w-7 h-7 rounded-full bg-white text-emerald-600 flex items-center justify-center font-black">
                              <Check size={16} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Distribution Bar Fill behind option when ended */}
                    {isSlideEnded && dist && (
                      <div
                        className={`absolute left-0 bottom-0 top-0 opacity-20 pointer-events-none transition-all duration-700 ${
                          isCorrect ? "bg-emerald-300" : "bg-slate-400"
                        }`}
                        style={{ width: `${dist.percentage}%` }}
                      />
                    )}
                  </div>
                );
              })}
          </div>

          {/* Answer Distribution Summary Pill when ended */}
          {isSlideEnded && (
            <div className="inline-flex items-center gap-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 px-5 py-2.5 rounded-2xl text-sm font-black shadow-sm mt-2">
              <Sparkles size={16} className="text-emerald-500" />
              <span>Chốt Đáp Án & Cập Nhật Tọa Độ Xe Đua Trên Bảng Xếp Hạng</span>
            </div>
          )}
        </div>
      )}

      {/* ── 3. INTERACTIVE 3D NEON RACETRACK ────────────────────────── */}
      <div className="bg-[#0b1119] border-4 border-slate-800 rounded-[36px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Track Title & Finish Line Flag */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏁</span>
            <div>
              <h3 className="text-lg font-black text-white tracking-wider uppercase">
                Đường Đua Siêu Tốc (Live Racetrack)
              </h3>
              <p className="text-xs text-slate-400">
                Vị trí xe đua được cập nhật tức thời theo điểm số từ Redis Sorted Set
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700 text-xs font-black text-amber-300">
            <Trophy size={14} />
            <span>Top {Math.min(racers.length, 8)} Tay Đua Dẫn Đầu</span>
          </div>
        </div>

        {/* Asphalt Road Canvas */}
        <div className="relative rounded-3xl bg-[#141b24] border-2 border-slate-700/80 p-4 min-h-[360px] overflow-hidden flex flex-col justify-around gap-3">
          {/* Top & Bottom Curbs (Red & White checkered rumble strip) */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-red-600 via-white to-red-600 bg-[length:30px_10px]" />
          <div className="absolute bottom-0 left-0 right-0 h-2.5 bg-gradient-to-r from-red-600 via-white to-red-600 bg-[length:30px_10px]" />

          {/* Finish Line Checkered Strip (at 92%) */}
          <div
            className="absolute top-0 bottom-0 w-8 z-10 flex flex-col justify-between opacity-80 pointer-events-none"
            style={{ left: "92%" }}
          >
            <div className="w-full h-full bg-[linear-gradient(45deg,#000_25%,transparent_25%),linear-gradient(-45deg,#000_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#000_75%),linear-gradient(-45deg,transparent_75%,#000_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] bg-white border-l-2 border-r-2 border-amber-400" />
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded uppercase tracking-widest shadow">
              FINISH
            </div>
          </div>

          {/* Start Line Marker (at 5%) */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-cyan-400/50 z-10 border-r border-dashed border-cyan-300"
            style={{ left: "5%" }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-cyan-500 text-slate-950 font-black text-[9px] rounded uppercase tracking-wider">
              START
            </div>
          </div>

          {/* Lanes for each player (max 8 visible on screen) */}
          {racers.slice(0, 8).map((racer, idx) => (
            <div
              key={racer.playerId}
              className="relative h-12 w-full flex items-center border-b border-dashed border-slate-700/60 last:border-b-0"
            >
              {/* Lane number */}
              <div className="absolute left-1 text-[11px] font-black text-slate-600 font-mono">
                L{idx + 1}
              </div>

              {/* Racing Car Entity */}
              <div
                className="absolute z-20 flex items-center transition-all duration-700 ease-out"
                style={{
                  left: `${racer.trackPct}%`,
                  transform: "translateX(-50%)",
                }}
              >
                {/* Nitro Flame Particles (shown when moving/scoring) */}
                {racer.score > 0 && (
                  <div className="absolute -left-5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
                    <span className="text-orange-500 text-base animate-pulse">🔥</span>
                  </div>
                )}

                {/* Car Icon & Name Tag */}
                <div className="flex items-center gap-2 group cursor-pointer">
                  {/* Styled Racer Body */}
                  <div
                    className={`relative w-12 h-9 rounded-xl bg-gradient-to-r ${racer.palette.body} border-2 border-white/80 shadow-[0_0_16px_${racer.palette.glow}] flex items-center justify-center text-lg transform hover:scale-110 transition-transform`}
                  >
                    <span>🏎️</span>
                    {/* Rank Badge */}
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-950 border border-white/80 text-[10px] font-black text-amber-300 flex items-center justify-center shadow">
                      {racer.rank === 1 ? (
                        <Crown size={11} className="text-yellow-400" />
                      ) : (
                        racer.rank
                      )}
                    </div>
                  </div>

                  {/* Nickname & Score Chip */}
                  <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1 text-left shadow-lg shrink-0">
                    <div className="text-xs font-black text-white max-w-[90px] truncate leading-tight">
                      {racer.nickname}
                    </div>
                    <div className="text-[10px] font-mono font-bold text-amber-400">
                      {racer.score.toLocaleString("vi-VN")} pts
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {racers.length === 0 && (
            <div className="h-40 flex flex-col items-center justify-center text-slate-500">
              <span className="text-3xl mb-2">🏎️</span>
              <p className="text-sm font-bold">Chưa có xe đua nào vào làn xuất phát</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. HOST BOTTOM CONTROLS ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-3xl border-2 border-slate-200 p-4 px-6 shadow-sm">
        <div className="text-sm font-bold text-slate-600 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <span>Trận đấu đang kết nối trực tiếp với {players.length} người chơi</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onNextSlide}
            className="flex-1 sm:flex-initial px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-base rounded-2xl shadow-[0_4px_0_0_#c2410c] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <span>Qua Câu Tiếp Theo</span>
            <ChevronRight size={18} strokeWidth={2.8} />
          </button>

          <button
            type="button"
            onClick={onEndGame}
            className="px-5 py-3.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 font-bold text-sm rounded-2xl border-2 border-slate-200 hover:border-red-200 transition-colors"
          >
            Kết Thúc
          </button>
        </div>
      </div>
    </div>
  );
}
