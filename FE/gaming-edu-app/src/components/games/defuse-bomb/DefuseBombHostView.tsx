"use client";

import { useMemo, useState } from "react";
import {
  Bomb,
  ShieldCheck,
  Flame,
  Clock,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Eye,
  Terminal,
  Trophy,
  Crown,
  Sparkles,
  Radio,
  Cpu,
} from "lucide-react";
import { BombDefusalState } from "@/hooks/useGameHub";

interface DefuseBombHostViewProps {
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
  } | null;
  leaderboard: {
    rank: number;
    nickname: string;
    avatarUrl?: string;
    score: number;
  }[];
  bombDefusalState: BombDefusalState | null;
  onNextSlide: () => void;
  onShowAnswer?: () => void;
}

const WIRE_COLORS_MAP: Record<
  string,
  { name: string; hex: string; bg: string; text: string; border: string; glow: string }
> = {
  red: {
    name: "Dây Đỏ (Core Logic)",
    hex: "#ef4444",
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/50",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.4)]",
  },
  blue: {
    name: "Dây Xanh (Memory Bus)",
    hex: "#3b82f6",
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/50",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.4)]",
  },
  yellow: {
    name: "Dây Vàng (Timer Relay)",
    hex: "#eab308",
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    border: "border-yellow-500/50",
    glow: "shadow-[0_0_15px_rgba(234,179,8,0.4)]",
  },
  green: {
    name: "Dây Xanh Lá (Safety Ground)",
    hex: "#22c55e",
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    border: "border-emerald-500/50",
    glow: "shadow-[0_0_15px_rgba(34,197,94,0.4)]",
  },
  purple: {
    name: "Dây Tím (Crypto Pulse)",
    hex: "#a855f7",
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/50",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.4)]",
  },
  orange: {
    name: "Dây Cam (Detonator Fuse)",
    hex: "#f97316",
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    border: "border-orange-500/50",
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.4)]",
  },
};

export default function DefuseBombHostView({
  currentSlide,
  slideTimeLeft,
  answerProgress,
  leaderboard,
  bombDefusalState,
  onNextSlide,
  onShowAnswer,
}: DefuseBombHostViewProps) {
  const [showNormalizedManual, setShowNormalizedManual] = useState(false);

  const totalPlayers = answerProgress?.totalPlayers || bombDefusalState?.totalBombs || 1;
  const defusedCount = bombDefusalState?.defusedBombs ?? 0;
  const explodedCount = bombDefusalState?.explodedBombs ?? 0;
  const inProgressCount = Math.max(0, totalPlayers - defusedCount - explodedCount);

  const defusedPercent = Math.min(100, Math.round((defusedCount / totalPlayers) * 100));

  const wires = useMemo(() => {
    if (bombDefusalState?.wireStats && bombDefusalState.wireStats.length > 0) {
      return bombDefusalState.wireStats;
    }
    const optionCount = currentSlide?.options?.length || 1;
    const fallbackPalette = ["red", "blue", "yellow", "green", "purple", "orange"];
    return Array.from({ length: optionCount }).map((_, idx) => ({
      wireIndex: idx + 1,
      wireColor: fallbackPalette[idx % fallbackPalette.length],
      cutCount: 0,
      totalCount: totalPlayers,
      cutPercent: 0,
    }));
  }, [bombDefusalState, currentSlide, totalPlayers]);

  const standardKeywords = bombDefusalState?.standardKeywords || [];

  return (
    <div className="flex-1 flex flex-col gap-6 text-white select-none">
      {/* ── TOP HUD HEADER ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Bombs Active */}
        <div className="bg-gradient-to-br from-slate-900/90 to-red-950/60 border-2 border-red-500/40 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <Bomb size={32} className="animate-pulse" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-red-300 font-bold flex items-center gap-1.5">
              <Radio size={12} className="text-red-400 animate-ping" />
              Tổng Bom C4 Kích Hoạt
            </div>
            <div className="text-3xl font-black font-mono text-white tracking-tight mt-0.5">
              {totalPlayers} <span className="text-sm font-normal text-slate-400">quả</span>
            </div>
          </div>
        </div>

        {/* Defused Safe */}
        <div className="bg-gradient-to-br from-slate-900/90 to-emerald-950/60 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <ShieldCheck size={32} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-emerald-300 font-bold">
              Đã Gỡ An Toàn (Defused)
            </div>
            <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight mt-0.5 flex items-baseline gap-2">
              <span>{defusedCount}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                {defusedPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Exploded / Detonated */}
        <div className="bg-gradient-to-br from-slate-900/90 to-amber-950/60 border-2 border-amber-500/40 rounded-2xl p-4 shadow-lg backdrop-blur-md relative overflow-hidden flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Flame size={32} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-amber-300 font-bold">
              Phát Nổ (Detonated)
            </div>
            <div className="text-3xl font-black font-mono text-amber-400 tracking-tight mt-0.5">
              {explodedCount} <span className="text-sm font-normal text-slate-400">quả</span>
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
                Ngòi Nổ Hẹn Giờ
              </div>
              <div className="text-xs text-slate-300">
                {inProgressCount > 0 ? `${inProgressCount} thí sinh đang gỡ` : "Đã chốt kết quả"}
              </div>
            </div>
          </div>
          <div
            className={`font-mono text-3xl md:text-4xl font-black px-4 py-1.5 rounded-xl border-2 tracking-widest ${
              slideTimeLeft !== null && slideTimeLeft <= 5
                ? "bg-red-500/20 text-red-400 border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                : "bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            }`}
          >
            {slideTimeLeft !== null ? `${String(Math.floor(slideTimeLeft / 60)).padStart(2, "0")}:${String(slideTimeLeft % 60).padStart(2, "0")}` : "00:00"}
          </div>
        </div>
      </div>

      {/* ── QUESTION DISPLAY / BOMB DEFUSAL MANUAL ── */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/90 border-2 border-amber-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500" />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-xs uppercase font-bold flex items-center gap-1.5">
              <Terminal size={14} /> MẬT MÃ GỠ BOM #{currentSlide?.index !== undefined ? currentSlide.index + 1 : 1}
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-semibold">
              Loại: Điền Khuyết (Fuzzy Matching 4 Bước)
            </span>
            <span className="px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold">
              +{currentSlide?.points || 1000} Điểm Chuẩn
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNormalizedManual(!showNormalizedManual)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 shadow"
            >
              <Eye size={15} />
              {showNormalizedManual ? "Ẩn Bảng Từ Khóa Chuẩn" : "Xem Mã Lệnh Chuẩn Hóa"}
            </button>
            <button
              onClick={onNextSlide}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-sm transition-all flex items-center gap-2 shadow-[0_4px_15px_rgba(245,158,11,0.4)] active:scale-95"
            >
              <span>Tiếp Tục</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-black font-sans text-slate-100 leading-relaxed tracking-wide">
          {currentSlide?.questionText}
        </h2>
      </div>

      {/* ── NORMALIZED KEYWORDS MANUAL DRAWER ── */}
      {showNormalizedManual && standardKeywords.length > 0 && (
        <div className="bg-slate-900/95 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl animate-fade-in-up">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-bold">
              <Cpu size={18} />
              <span>BẢNG MÃ LỆNH CHUẨN ĐÃ QUA 4 BƯỚC CHUẨN HÓA FUZZY MATCHING</span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Quy tắc: Chữ thường → Khử dấu Tiếng Việt → Chuẩn hóa khoảng trắng → Dung sai Levenshtein (0-2)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {standardKeywords.map((kw, idx) => {
              const colorInfo = WIRE_COLORS_MAP[kw.wireColor] || WIRE_COLORS_MAP.red;
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border ${colorInfo.border} ${colorInfo.bg} flex flex-col gap-1.5`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold ${colorInfo.text} flex items-center gap-1.5`}>
                      <Scissors size={14} /> Dây {kw.wireIndex}: {colorInfo.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-300">
                      Vị Trí #{kw.wireIndex}
                    </span>
                  </div>
                  <div className="text-sm font-black text-white font-mono">
                    Đáp án gốc: <span className="text-amber-300">{kw.originalKeywords}</span>
                  </div>
                  <div className="text-xs font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded">
                    Mã chuẩn hóa: <span className="font-bold underline">{kw.normalizedKeyword}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT GRID: WIRE PROGRESS & LEADERBOARD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Real-time Wire Defusal Statistics (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border-2 border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Scissors size={20} className="text-amber-400" />
                <h3 className="font-mono font-bold text-base text-slate-200 uppercase tracking-wider">
                  Tiến Độ Cắt Từng Dây Bom (Wire Status)
                </h3>
              </div>
              <div className="text-xs font-mono text-slate-400">
                {wires.length} dây dẫn mạch điện
              </div>
            </div>

            <div className="space-y-4">
              {wires.map((wire) => {
                const colorInfo = WIRE_COLORS_MAP[wire.wireColor] || WIRE_COLORS_MAP.red;
                return (
                  <div
                    key={wire.wireIndex}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-3.5 h-3.5 rounded-full ${colorInfo.glow}`}
                          style={{ backgroundColor: colorInfo.hex }}
                        />
                        <span className={`font-mono font-bold text-sm ${colorInfo.text}`}>
                          Dây {wire.wireIndex}: {colorInfo.name}
                        </span>
                      </div>
                      <div className="font-mono text-xs flex items-center gap-2">
                        <span className="text-slate-300 font-bold">{wire.cutCount}/{totalPlayers} đã cắt</span>
                        <span className={`font-black ${colorInfo.text}`}>
                          ({wire.cutPercent}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                      <div
                        className="h-full rounded-full transition-all duration-700 shadow-md"
                        style={{
                          width: `${Math.max(4, wire.cutPercent)}%`,
                          backgroundColor: colorInfo.hex,
                          boxShadow: `0 0 10px ${colorInfo.hex}`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" /> Cắt đúng 100% dây = Gỡ bom thành công
            </span>
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-400" /> Cắt đúng từng phần = Nhận Partial Credit
            </span>
          </div>
        </div>

        {/* Right: Bomb Squad Leaderboard (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border-2 border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-yellow-400" />
              <h3 className="font-mono font-bold text-base text-slate-200 uppercase tracking-wider">
                Biệt Đội Gỡ Bom (Top Defusers)
              </h3>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Live Ranking
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar">
            {leaderboard.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 font-mono text-sm gap-2">
                <Radio size={24} className="animate-spin text-slate-600" />
                Đang chờ tín hiệu gỡ bom từ các thí sinh...
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
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                        <CheckCircle2 size={10} /> Chuyên Gia Gỡ Bom
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
