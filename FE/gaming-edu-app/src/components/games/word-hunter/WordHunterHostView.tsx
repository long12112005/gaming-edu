"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Sparkles,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronRight,
  Crown,
  KeyRound,
  FileQuestion,
  Users,
  Zap,
} from "lucide-react";
import { WordHunterState } from "@/hooks/useGameHub";

interface WordHunterHostViewProps {
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
      blankLength?: number;
      wordLengths?: number[];
    }[];
  } | null;
  slideTimeLeft: number | null;
  answerProgress: {
    slideId: string;
    answeredCount: number;
    totalPlayers: number;
  } | null;
  leaderboard: {
    rank: number;
    nickname: string;
    avatarUrl?: string;
    score: number;
  }[];
  wordHunterState: WordHunterState | null;
  onNextSlide: () => void;
  onShowAnswer?: () => void;
}

export default function WordHunterHostView({
  currentSlide,
  slideTimeLeft,
  answerProgress,
  leaderboard,
  wordHunterState,
  onNextSlide,
  onShowAnswer,
}: WordHunterHostViewProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  // Tự động lật mở khi hết giờ
  useEffect(() => {
    if (slideTimeLeft !== null && slideTimeLeft <= 0) {
      setIsRevealed(true);
    }
  }, [slideTimeLeft]);

  // Reset trạng thái lật mở khi chuyển slide mới
  useEffect(() => {
    setIsRevealed(false);
  }, [currentSlide?.slideId]);

  const totalPlayers = answerProgress?.totalPlayers || wordHunterState?.totalPlayers || 1;
  const decodedCount = wordHunterState?.decodedCount ?? 0;
  const submittedCount = wordHunterState?.submittedCount ?? answerProgress?.answeredCount ?? 0;
  const inProgressCount = Math.max(0, totalPlayers - submittedCount);

  const decodedPercent = Math.min(100, Math.round((decodedCount / totalPlayers) * 100));

  // Lấy giải pháp ô chữ từ state hoặc options
  const solutions = useMemo(() => {
    if (wordHunterState?.solutions && wordHunterState.solutions.length > 0) {
      return wordHunterState.solutions;
    }
    // Fallback nếu chưa có solutions
    const opt = currentSlide?.options?.[0];
    const len = opt?.blankLength || 6;
    return [
      {
        wordIndex: 1,
        solutionText: "???",
        totalLength: len,
        acceptedKeywords: [],
      },
    ];
  }, [wordHunterState, currentSlide]);

  const recentGuesses = wordHunterState?.recentGuesses || [];

  return (
    <div className="flex-1 flex flex-col gap-6 text-white select-none">
      {/* ── TOP HUD HEADER ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Word Hunters */}
        <div className="bg-gradient-to-br from-slate-900/90 to-teal-950/60 border-2 border-teal-500/40 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
            <Search size={32} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-teal-300 font-bold">
              Tổng Thợ Săn Ô Chữ
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-tight mt-0.5">
              {totalPlayers} <span className="text-sm font-normal text-slate-400">người</span>
            </div>
          </div>
        </div>

        {/* Decoded Solvers */}
        <div className="bg-gradient-to-br from-slate-900/90 to-emerald-950/60 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Sparkles size={32} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-emerald-300 font-bold">
              Đã Giải Mã Thành Công
            </div>
            <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight mt-0.5 flex items-baseline gap-2">
              <span>{decodedCount}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                {decodedPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-gradient-to-br from-slate-900/90 to-amber-950/60 border-2 border-amber-500/40 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <KeyRound size={30} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-amber-300 font-bold">
              Đang Tìm Kiếm
            </div>
            <div className="text-3xl font-black font-mono text-amber-400 tracking-tight mt-0.5">
              {inProgressCount} <span className="text-sm font-normal text-slate-400">thí sinh</span>
            </div>
          </div>
        </div>

        {/* Digital Countdown Timer */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-2 border-slate-700/60 rounded-2xl p-4 shadow-lg backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Clock size={26} />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase font-semibold">
                Thời Gian Còn Lại
              </div>
              <div className="text-xs text-slate-300 font-mono">
                {slideTimeLeft !== null && slideTimeLeft <= 5 ? "Sắp hết giờ!" : "Đang đếm ngược"}
              </div>
            </div>
          </div>
          <div
            className={`font-mono text-3xl md:text-4xl font-black px-4 py-1.5 rounded-xl border-2 tracking-widest ${
              slideTimeLeft !== null && slideTimeLeft <= 5
                ? "bg-red-500/20 text-red-400 border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                : "bg-teal-500/10 text-teal-400 border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.2)]"
            }`}
          >
            {slideTimeLeft !== null ? `${String(Math.floor(slideTimeLeft / 60)).padStart(2, "0")}:${String(slideTimeLeft % 60).padStart(2, "0")}` : "00:00"}
          </div>
        </div>
      </div>

      {/* ── QUESTION & MYSTERY CROSSWORD BOARD ── */}
      <div className="bg-gradient-to-r from-slate-900/95 via-teal-950/40 to-slate-900/95 border-2 border-teal-500/30 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-400" />

        {/* Top Controls Bar */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 font-mono text-xs uppercase font-bold flex items-center gap-1.5 shadow-sm">
              <Search size={14} /> Ô CHỮ BÍ ẨN #{currentSlide?.index !== undefined ? currentSlide.index + 1 : 1}
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-semibold">
              Định Dạng: Điền Khuyết (Word Hunter)
            </span>
            <span className="px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold">
              +{currentSlide?.points || 1000} Điểm Chuẩn
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRevealed(!isRevealed)}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 shadow border ${
                isRevealed
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600"
              }`}
            >
              <Eye size={15} />
              {isRevealed ? "Ẩn Ô Chữ" : "Lật Mở Toàn Bộ Ô Chữ"}
            </button>
            <button
              onClick={onNextSlide}
              className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-sm transition-all flex items-center gap-2 shadow-[0_4px_15px_rgba(20,184,166,0.4)] active:scale-95"
            >
              <span>Tiếp Tục</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Question Text Prompt */}
        <h2 className="text-xl md:text-3xl font-black font-sans text-center text-slate-100 leading-relaxed mb-8 max-w-4xl tracking-wide">
          {currentSlide?.questionText}
        </h2>

        {/* ── THE MYSTERY CROSSWORD TILES ── */}
        <div className="w-full flex flex-col items-center justify-center gap-6 my-2">
          {solutions.map((sol, wordIdx) => {
            const letters = sol.solutionText.split("");
            const wordLengths = currentSlide?.options?.[wordIdx]?.wordLengths;

            return (
              <div key={wordIdx} className="flex flex-col items-center gap-3">
                <div className="text-xs font-mono font-bold text-teal-300 uppercase tracking-widest flex items-center gap-2">
                  <KeyRound size={14} />
                  <span>
                    Từ khóa #{wordIdx + 1} ({sol.totalLength || letters.length} Ký Tự)
                  </span>
                </div>

                {/* Tiles Row */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3.5 max-w-4xl p-4 rounded-3xl bg-slate-950/60 border border-teal-500/20 shadow-inner">
                  {letters.map((char, charIdx) => {
                    const isSpace = char === " ";
                    if (isSpace) {
                      return <div key={charIdx} className="w-4 md:w-6" />;
                    }

                    return (
                      <div
                        key={charIdx}
                        className={`w-12 h-14 md:w-16 md:h-20 rounded-2xl border-2 flex items-center justify-center font-mono text-2xl md:text-4xl font-black transition-all duration-700 transform ${
                          isRevealed
                            ? "bg-gradient-to-b from-emerald-500 to-teal-700 border-emerald-300 text-white shadow-[0_8px_20px_rgba(16,185,129,0.5)] rotate-y-180 scale-105"
                            : "bg-slate-900/90 border-teal-500/40 text-teal-400/50 shadow-[0_4px_12px_rgba(0,0,0,0.4)] hover:border-teal-400"
                        }`}
                        style={{
                          transitionDelay: isRevealed ? `${charIdx * 100}ms` : "0ms",
                        }}
                      >
                        {isRevealed ? (
                          <span className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] animate-fade-in uppercase">
                            {char}
                          </span>
                        ) : (
                          <span className="text-lg md:text-xl font-bold opacity-40 select-none">
                            ?
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Solution Reveal Caption */}
                {isRevealed && (
                  <div className="text-xs font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-4 py-1 rounded-full animate-fade-in flex items-center gap-1.5 shadow">
                    <CheckCircle2 size={14} />
                    <span>
                      Đáp án chính xác: <strong className="text-white uppercase">{sol.solutionText}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── LOWER GRID: LIVE GUESS FEED & LEADERBOARD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Real-time Player Guess Activity (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border-2 border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-amber-400" />
                <h3 className="font-mono font-bold text-base text-slate-200 uppercase tracking-wider">
                  Nhật Ký Giải Mã Thời Gian Thực
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {recentGuesses.length} lượt nộp bài
              </span>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
              {recentGuesses.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 font-mono text-sm gap-2">
                  <Search size={24} className="animate-pulse text-teal-600" />
                  Đang chờ các thợ săn nộp từ khóa giải mã...
                </div>
              ) : (
                recentGuesses.map((guess, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      guess.isCorrect
                        ? "bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : "bg-slate-950/50 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center font-bold text-xs shrink-0">
                        {guess.avatarUrl ? (
                          <img src={guess.avatarUrl} alt={guess.nickname} className="w-full h-full object-cover" />
                        ) : (
                          guess.nickname.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                          <span>{guess.nickname}</span>
                          {guess.isCorrect && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              CHÍNH XÁC
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-slate-400">
                          Đã đoán: <span className="text-amber-300 font-bold">"{guess.guess}"</span>
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-right">
                      {guess.isCorrect ? (
                        <div className="text-emerald-400 font-black text-sm">
                          +{(guess.scoreAwarded || 1000).toLocaleString()} pts
                        </div>
                      ) : (
                        <div className="text-slate-500 text-xs">Chưa khớp</div>
                      )}
                      <div className="text-[10px] text-slate-500">
                        {(guess.responseTimeMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Áp dụng Fuzzy Matching 4 bước (không phạt dấu/viết hoa)</span>
            <span className="text-amber-400">Trả lời càng nhanh, Speed Multiplier càng cao</span>
          </div>
        </div>

        {/* Right: Word Hunter Leaderboard (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border-2 border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-yellow-400" />
              <h3 className="font-mono font-bold text-base text-slate-200 uppercase tracking-wider">
                Bảng Vàng Thợ Săn (Top Decoders)
              </h3>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Live Ranking
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar">
            {leaderboard.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 font-mono text-sm gap-2">
                <Users size={24} className="text-slate-600 animate-pulse" />
                Đang chờ bảng xếp hạng cập nhật...
              </div>
            ) : (
              leaderboard.slice(0, 7).map((player, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                return (
                  <div
                    key={player.nickname + idx}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      isTop1
                        ? "bg-gradient-to-r from-yellow-500/20 to-amber-950/40 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                        : isTop2
                        ? "bg-slate-800/80 border-slate-600/50"
                        : isTop3
                        ? "bg-amber-950/20 border-amber-800/40"
                        : "bg-slate-950/40 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center ${
                          isTop1
                            ? "bg-yellow-400 text-slate-950"
                            : isTop2
                            ? "bg-slate-300 text-slate-900"
                            : isTop3
                            ? "bg-amber-600 text-white"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isTop1 ? <Crown size={14} /> : `#${idx + 1}`}
                      </div>

                      <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center font-bold text-xs">
                        {player.avatarUrl ? (
                          <img src={player.avatarUrl} alt={player.nickname} className="w-full h-full object-cover" />
                        ) : (
                          player.nickname.substring(0, 2).toUpperCase()
                        )}
                      </div>

                      <div className="font-sans font-bold text-sm text-slate-100 max-w-[120px] truncate">
                        {player.nickname}
                      </div>
                    </div>

                    <div className="font-mono text-right">
                      <div className="text-amber-400 font-black text-sm">
                        {player.score.toLocaleString()} pts
                      </div>
                      <div className="text-[10px] text-teal-400 font-semibold flex items-center justify-end gap-1">
                        <CheckCircle2 size={10} /> Thợ Săn Ô Chữ
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
