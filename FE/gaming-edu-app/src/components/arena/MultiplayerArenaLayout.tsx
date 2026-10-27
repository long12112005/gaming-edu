"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Trophy,
  Crown,
  Sparkles,
  BarChart2,
  Clock,
  CheckCircle2,
  Flame,
  MessageCircle,
  X,
  LogOut,
  Maximize2,
  Award,
  Zap,
} from "lucide-react";
import GlobalMinimapBar from "./GlobalMinimapBar";
import UniversalQuestionHUD from "./UniversalQuestionHUD";
import { PlayerArenaProgress, SlideStartedPayload } from "@/hooks/useGameHub";

interface MultiplayerArenaLayoutProps {
  viewMode: "player" | "host";
  themeId?: string;
  players: PlayerArenaProgress[];
  currentUserId?: string;
  currentSlide: SlideStartedPayload | null;
  slideTimeLeft: number | null;
  hasAnswered?: boolean;
  answerResult?: any;
  onSubmitQuiz?: (optionId: string) => void;
  onSubmitBlank?: (answer: string) => void;
  onSubmitMatching?: (pairs: { leftId: string; rightContent: string }[]) => void;
  onSubmitWordCloud?: (word: string) => void;
  isPacedMode?: boolean;
  onPacedNext?: () => void;
  isLastQuestion?: boolean;
  // Host props
  answeredCount?: number;
  totalPlayersCount?: number;
  autoAdvanceSecondsLeft?: number | null;
  onNextSlide?: () => void;
  onEndGame?: () => void;
  isRoomLocked?: boolean;
  onToggleLock?: (locked: boolean) => void;
  distribution?: any;
  onOpenDistributionModal?: () => void;
  // Integrated header & navigation props
  pinCode?: string;
  playerNickname?: string;
  roomMode?: string;
  onToggleQA?: () => void;
  qaCount?: number;
  onToggleDashboard?: () => void;
  onExit?: () => void;
}

const QUIZ_OPTION_STYLES = [
  { bg: "from-rose-500 to-red-600", border: "border-red-400", key: "A", shape: "▲" },
  { bg: "from-blue-500 to-indigo-600", border: "border-blue-400", key: "B", shape: "◆" },
  { bg: "from-amber-500 to-yellow-600", border: "border-amber-400", key: "C", shape: "●" },
  { bg: "from-emerald-500 to-green-600", border: "border-emerald-400", key: "D", shape: "■" },
];

export default function MultiplayerArenaLayout({
  viewMode,
  themeId = "STANDARD_ARENA",
  players,
  currentUserId,
  currentSlide,
  slideTimeLeft,
  hasAnswered = false,
  answerResult,
  onSubmitQuiz,
  onSubmitBlank,
  onSubmitMatching,
  onSubmitWordCloud,
  isPacedMode = false,
  onPacedNext,
  isLastQuestion = false,
  answeredCount = 0,
  totalPlayersCount = 0,
  autoAdvanceSecondsLeft,
  onNextSlide,
  onEndGame,
  isRoomLocked = false,
  onToggleLock,
  distribution,
  onOpenDistributionModal,
  pinCode,
  playerNickname,
  roomMode,
  onToggleQA,
  qaCount = 0,
  onToggleDashboard,
  onExit,
}: MultiplayerArenaLayoutProps) {
  // Sorted Leaderboard (Top Players)
  const leaderboard = useMemo(() => {
    return [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [players]);

  const totalEffectivePlayers = totalPlayersCount || players.length || 1;
  const answeredPercentage = Math.min(
    100,
    Math.round((answeredCount / totalEffectivePlayers) * 100)
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. GIAO DIỆN MÀN HÌNH CHỦ PHÒNG (HOST VIEW - PROJECTOR STAGE)
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewMode === "host") {
    const questionType = currentSlide?.type?.toUpperCase() || "QUIZ";
    const options = currentSlide?.options || [];

    return (
      <div className="relative w-full h-screen bg-[#070B19] text-white flex flex-col overflow-hidden font-sans select-none">
        {/* Radar Toàn Chặng Minimap trên đỉnh màn hình */}
        <GlobalMinimapBar players={players} currentUserId={currentUserId} />

        {/* ── TOP HUD HEADER (HOST CONTROLS & LIVE STATS) ── */}
        <header className="relative z-30 h-16 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xl shadow-md shadow-indigo-600/30">
              🎮
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-sm sm:text-base text-white leading-tight">
                  ĐẤU TRƯỜNG THI ĐẤU TRỰC TIẾP
                </h1>
                {pinCode && (
                  <span className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 text-[11px] font-mono font-black text-amber-300">
                    PIN {pinCode}
                  </span>
                )}
                {roomMode && (
                  <span className="hidden sm:inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    {roomMode === "ASYNC_TOURNAMENT" ? "⚡ Phòng Giải Đấu" : "🔴 Phòng Thường"}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] font-mono text-indigo-300">
                {players.length} THÍ SINH ĐANG THI ĐẤU • ĐỒNG BỘ THỜI GIAN THỰC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bộ đếm số người đã trả lời */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Đã nộp:
              </span>
              <span className="text-sm font-heading font-black text-emerald-400">
                {answeredCount}/{totalEffectivePlayers} ({answeredPercentage}%)
              </span>
            </div>

            {/* Slide Question Counter */}
            <div className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 font-heading font-bold text-xs">
              CÂU {currentSlide?.index !== undefined ? currentSlide.index + 1 : "?"}
              {currentSlide?.totalSlides ? ` / ${currentSlide.totalSlides}` : ""}
            </div>

            {/* Timer */}
            {slideTimeLeft !== null && (
              <div
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-heading font-black text-xs sm:text-sm border ${
                  slideTimeLeft <= 5
                    ? "bg-rose-500/20 border-rose-400/50 text-rose-300 animate-pulse"
                    : "bg-white/10 border-white/20 text-white"
                }`}
              >
                <Clock size={14} />
                <span>{slideTimeLeft}s</span>
              </div>
            )}

            {/* Biểu đồ phân bổ đáp án Button */}
            {onOpenDistributionModal && (
              <button
                type="button"
                onClick={onOpenDistributionModal}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 hover:text-white transition-all cursor-pointer"
                title="Xem phân bổ đáp án"
              >
                <BarChart2 size={16} />
              </button>
            )}

            {/* Hỏi Đáp Q&A Button */}
            {onToggleQA && (
              <button
                type="button"
                onClick={onToggleQA}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white flex items-center gap-1.5 text-xs font-black cursor-pointer transition-all"
                title="Mở kênh hỏi đáp"
              >
                <MessageCircle size={16} className="text-teal-400" />
                <span className="hidden md:inline">Hỏi Đáp</span>
                {qaCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                    {qaCount}
                  </span>
                )}
              </button>
            )}

            {/* Bảng Điều Khiển Button */}
            {onToggleDashboard && (
              <button
                type="button"
                onClick={onToggleDashboard}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600/70 text-slate-200 hover:text-white text-xs font-bold cursor-pointer transition-all hover:border-amber-400/50 shadow-xs"
                title="Chuyển sang Bảng điều khiển chi tiết"
              >
                <Maximize2 size={14} className="text-amber-400" />
                <span className="hidden sm:inline">Bảng Điều Khiển</span>
              </button>
            )}

            {/* Nút Kết Thúc Trò Chơi */}
            {onEndGame && (
              <button
                type="button"
                onClick={onEndGame}
                className="px-3.5 py-2 rounded-xl btn-3d btn-3d-red font-heading font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Kết thúc trò chơi"
              >
                <X size={14} />
                <span className="hidden sm:inline">Kết Thúc</span>
              </button>
            )}

            {/* Nút Thoát Về Dashboard */}
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-slate-300 hover:text-rose-200 flex items-center gap-1 text-xs font-bold cursor-pointer transition-all"
                title="Thoát phòng về Dashboard"
              >
                <LogOut size={14} />
                <span className="hidden lg:inline">Thoát</span>
              </button>
            )}

            {/* Auto Advance Countdown Indicator */}
            {autoAdvanceSecondsLeft !== null && autoAdvanceSecondsLeft !== undefined && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/25 border border-amber-400/60 text-amber-300 font-heading font-black text-xs animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <Sparkles size={14} className="text-amber-400 animate-spin" />
                <span>Qua câu sau {autoAdvanceSecondsLeft}s</span>
              </div>
            )}
          </div>
        </header>

        {/* ── STAGE CHÍNH CHO MÁY CHIẾU (HOST MAIN STAGE) ── */}
        <main className="relative flex-1 w-full overflow-hidden flex flex-col justify-between p-4 sm:p-6 md:p-8">
          {/* Subtle Ambient Background */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Section: QUESTION CARD DISPLAY */}
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center items-center relative z-10">
            <div className="w-full bg-slate-900/85 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-4">
              {/* Question Badge */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-heading font-black tracking-wider uppercase">
                  {questionType === "QUIZ" && "Trắc Nghiệm (Quiz)"}
                  {questionType === "BLANK" && "Điền Khuyết (Fill-in)"}
                  {questionType === "MATCHING" && "Ghép Cặp (Matching)"}
                  {questionType === "WORDCLOUD" && "Đám Mây Từ Khóa (Word Cloud)"}
                </span>
                {currentSlide?.points && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
                    +{currentSlide.points} Điểm
                  </span>
                )}
              </div>

              {/* Question Text */}
              <h2 className="font-heading font-black text-2xl sm:text-3xl md:text-4xl text-white leading-tight max-w-4xl">
                {currentSlide?.questionText || "Đang chuẩn bị câu hỏi..."}
              </h2>

              {/* Question Media (Image if available) */}
              {currentSlide?.imageUrl && (
                <div className="max-w-md max-h-56 rounded-2xl overflow-hidden border border-white/20 shadow-lg mt-2">
                  <img
                    src={currentSlide.imageUrl}
                    alt="Question Media"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Quiz Options Preview for Host Display */}
              {questionType === "QUIZ" && options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl mt-4 text-left">
                  {options.map((opt: any, idx: number) => {
                    const style = QUIZ_OPTION_STYLES[idx % QUIZ_OPTION_STYLES.length];
                    return (
                      <div
                        key={opt.id || idx}
                        className={`p-4 rounded-2xl border-2 bg-gradient-to-r ${style.bg} ${style.border} text-white font-heading font-bold text-sm sm:text-base flex items-center gap-3 shadow-md`}
                      >
                        <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm shrink-0">
                          {style.shape}
                        </span>
                        <span className="truncate">{opt.text || opt.content || "Tùy chọn"}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Live Progress Bar for Submissions */}
              <div className="w-full max-w-xl mt-4 pt-4 border-t border-white/10 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                  <span>Tiến độ nộp câu trả lời</span>
                  <span className="text-emerald-400 font-mono">
                    {answeredCount}/{totalEffectivePlayers} thí sinh ({answeredPercentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${answeredPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: LIVE LEADERBOARD STANDINGS RIBBON */}
          <div className="w-full max-w-5xl mx-auto mt-4 shrink-0 relative z-10">
            <div className="bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 shrink-0">
                <Trophy size={18} className="text-amber-400" />
                <span className="text-xs font-heading font-black text-amber-300 uppercase tracking-wider">
                  Bảng Xếp Hạng:
                </span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto">
                {leaderboard.slice(0, 5).map((player, idx) => (
                  <div
                    key={player.playerId}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shrink-0 ${
                      idx === 0
                        ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
                        : idx === 1
                        ? "bg-slate-300/20 border-slate-300/40 text-slate-200"
                        : idx === 2
                        ? "bg-orange-500/20 border-orange-400/40 text-orange-200"
                        : "bg-white/5 border-white/10 text-slate-300"
                    }`}
                  >
                    <span className="font-black font-mono">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </span>
                    <span className="font-bold truncate max-w-[100px]">
                      {player.nickname}
                    </span>
                    <span className="font-mono font-black text-emerald-400 text-[11px]">
                      {player.score || 0}đ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. GIAO DIỆN MÀN HÌNH NGƯỜI CHƠI (PLAYER VIEW - FULL HEIGHT QUIZ HUD)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="relative w-full h-screen bg-[#070B19] text-white flex flex-col overflow-hidden font-sans select-none">
      {/* ── INTEGRATED PLAYER TOP BAR (PIN, MODE, MINIMAP, USER, QA) ── */}
      <header className="relative z-30 h-12 shrink-0 px-3 bg-slate-950/95 border-b border-white/10 flex items-center justify-between gap-2.5 select-none backdrop-blur-xl">
        {/* Left: PIN & Room Mode */}
        <div className="flex items-center gap-2 shrink-0">
          {pinCode && (
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl border border-white/20 shadow-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase">PIN</span>
              <span className="text-xs sm:text-sm font-mono font-black text-amber-300">
                {pinCode}
              </span>
            </div>
          )}
          {roomMode && (
            <span
              className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border ${
                roomMode === "ASYNC_TOURNAMENT"
                  ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                  : "bg-indigo-500/20 text-indigo-300 border-indigo-400/40"
              }`}
            >
              {roomMode === "ASYNC_TOURNAMENT" ? "⚡ Phòng Giải Đấu" : "🔴 Phòng Thường"}
            </span>
          )}
        </div>

        {/* Center: Minimap progress track embedded */}
        <div className="flex-1 max-w-xl mx-1 sm:mx-3 overflow-hidden">
          <GlobalMinimapBar
            players={players}
            currentUserId={currentUserId}
            className="bg-transparent border-none py-0 px-0"
          />
        </div>

        {/* Right: Thí sinh nickname & QA toggle button */}
        <div className="flex items-center gap-2 shrink-0">
          {playerNickname && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-black shadow-xs">
              <span className="text-[10px] text-teal-400/70 hidden sm:inline">Thí sinh:</span>
              <span className="truncate max-w-[80px] sm:max-w-[120px]">{playerNickname}</span>
            </div>
          )}

          {onToggleQA && (
            <button
              type="button"
              onClick={onToggleQA}
              className="relative p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white flex items-center gap-1.5 text-xs font-black cursor-pointer transition-all"
              title="Mở kênh hỏi đáp cùng phòng thi"
            >
              <MessageCircle size={15} className="text-teal-400" />
              <span className="hidden md:inline">Hỏi Đáp</span>
              {qaCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {qaCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* ── INTERACTIVE QUESTION HUD (TAKES 100% OF REMAINING SCREEN HEIGHT) ── */}
      <section className="relative flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        <UniversalQuestionHUD
          themeId={themeId}
          currentSlide={currentSlide}
          slideTimeLeft={slideTimeLeft}
          hasAnswered={hasAnswered}
          answerResult={answerResult}
          onSubmitQuiz={onSubmitQuiz || (() => {})}
          onSubmitBlank={onSubmitBlank || (() => {})}
          onSubmitMatching={onSubmitMatching || (() => {})}
          onSubmitWordCloud={onSubmitWordCloud}
          isPacedMode={isPacedMode}
          onPacedNext={onPacedNext}
          isLastQuestion={isLastQuestion}
        />
      </section>
    </div>
  );
}
