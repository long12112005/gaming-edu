"use client";

import { useMemo, useState } from "react";
import {
  Zap,
  Clock,
  ChevronRight,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldCheck,
  Eye,
  Activity,
  Flame,
  Gauge,
  Lightbulb,
  Radio,
  Cpu,
} from "lucide-react";
import { CircuitConnectState } from "@/hooks/useGameHub";

interface CircuitConnectHostViewProps {
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
      matchingPair?: string;
      orderIndex: number;
    }[];
  } | null;
  slideTimeLeft: number | null;
  answerProgress: {
    answeredCount: number;
    totalPlayers: number;
    circuitConnect?: CircuitConnectState;
  } | null;
  leaderboard: any[];
  circuitConnectState: CircuitConnectState | null;
  onNextSlide: () => void;
}

const WIRE_COLORS = [
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#eab308", // Yellow
  "#10b981", // Green
  "#a855f7", // Purple
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#ec4899", // Pink
];

export default function CircuitConnectHostView({
  currentSlide,
  slideTimeLeft,
  answerProgress,
  leaderboard,
  circuitConnectState,
  onNextSlide,
}: CircuitConnectHostViewProps) {
  const [showFullSchematic, setShowFullSchematic] = useState(false);

  // Danh sách các cặp ghép chuẩn (Vế A -> Vế B)
  const matchingPairs = useMemo(() => {
    if (!currentSlide?.options) return [];
    return currentSlide.options
      .filter((opt) => !!opt.matchingPair || !!opt.content)
      .map((opt, idx) => ({
        index: idx + 1,
        id: opt.id,
        leftContent: opt.content,
        rightContent: opt.matchingPair || opt.content,
        color: WIRE_COLORS[idx % WIRE_COLORS.length],
      }));
  }, [currentSlide]);

  const totalWires = Math.max(1, matchingPairs.length);
  const state = circuitConnectState || answerProgress?.circuitConnect;
  const isTimeUp = slideTimeLeft !== null && slideTimeLeft <= 0;
  const totalPlayers = state?.totalPlayers || answerProgress?.totalPlayers || 1;
  const submittedCount = state?.submittedCount || answerProgress?.answeredCount || 0;
  const fullCircuits = state?.fullCircuits || 0;
  const partialCircuits = state?.partialCircuits || 0;
  const shortCircuits = state?.shortCircuits || 0;

  const fullCircuitPercent = totalPlayers > 0 ? Math.round((fullCircuits / totalPlayers) * 100) : 0;
  const submissionPercent = totalPlayers > 0 ? Math.round((submittedCount / totalPlayers) * 100) : 0;

  // Lưới điện ổn định (%)
  const gridStability = totalPlayers > 0
    ? Math.min(100, Math.round(((fullCircuits * 1.0 + partialCircuits * 0.5) / totalPlayers) * 100))
    : 100;

  const gridVoltage = Math.round(180 + (gridStability * 0.4)); // 180V -> 220V

  // Thống kê từng nhánh dây
  const wireStats = useMemo(() => {
    if (state?.wireStats && state.wireStats.length > 0) {
      return state.wireStats;
    }
    return matchingPairs.map((p, idx) => ({
      wireIndex: idx + 1,
      leftId: p.id,
      leftContent: p.leftContent,
      expectedRightContent: p.rightContent,
      correctCount: 0,
      totalCount: 0,
      correctPercent: 0,
      wireColor: p.color,
    }));
  }, [state?.wireStats, matchingPairs]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* ── TOP HUD & ELECTRICAL STATUS BAR ─────────────────────────────────── */}
      <div className="bg-slate-950/95 backdrop-blur-2xl border-4 border-amber-500/40 rounded-[36px] p-6 md:p-8 shadow-[0_20px_60px_rgba(245,158,11,0.2)] text-white relative overflow-hidden">
        {/* Animated hazard electric background grid */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #f59e0b 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          {/* Header & Question Info */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-18 h-18 w-16 h-16 rounded-[24px] bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 border-2 border-amber-200 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-pulse">
                ⚡
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                <Radio size={12} className="text-white animate-spin" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/50 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                  <Zap size={12} className="fill-amber-400" />
                  Mini-Game 08: Nối Mạch Điện Cao Thế
                </span>
                <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 px-3 py-1 rounded-xl text-xs font-black">
                  {totalWires} Nhánh Mạch Ghép Đôi
                </span>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-3 py-1 rounded-xl text-xs font-black font-mono">
                  {gridVoltage}V / {gridStability}% Ổn Định
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
                {currentSlide?.questionText || "Trình chiếu Bảng Mạch Điện Tổng..."}
              </h1>
            </div>
          </div>

          {/* Real-time Timer & Voltmeter Clock */}
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-3 px-6 py-3 rounded-[24px] border-4 transition-all shadow-xl ${
                slideTimeLeft !== null && slideTimeLeft <= 5
                  ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-bounce shadow-[0_0_25px_rgba(244,63,94,0.4)]"
                  : "bg-slate-900/90 border-amber-500/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              }`}
            >
              <Gauge size={28} className="animate-spin-slow" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Thời Gian Đóng Điện
                </div>
                <div className="text-3xl md:text-4xl font-black font-mono tabular-nums leading-none">
                  {slideTimeLeft !== null ? `${slideTimeLeft}s` : "–"}
                </div>
              </div>
            </div>

            {/* Next Question Button */}
            <button
              onClick={onNextSlide}
              className="px-6 py-4 rounded-[22px] bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-base shadow-[0_6px_0_0_#b45309] active:translate-y-1.5 active:shadow-none transition-all flex items-center gap-2"
            >
              <span>Câu Kế Tiếp</span>
              <ChevronRight size={20} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/80 border-2 border-emerald-500/40 rounded-[20px] p-4 text-center shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden group">
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] animate-ping" />
            <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1.5 mb-1">
              <Lightbulb size={14} className="fill-emerald-400" />
              Mạch Hoàn Hảo (100%)
            </div>
            <div className="text-3xl md:text-4xl font-black text-white font-mono">
              {fullCircuits}{" "}
              <span className="text-base font-bold text-emerald-400/80">
                ({fullCircuitPercent}%)
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Đạt trọn vẹn điểm thưởng</p>
          </div>

          <div className="bg-slate-900/80 border-2 border-amber-500/40 rounded-[20px] p-4 text-center shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1.5 mb-1">
              <Zap size={14} className="fill-amber-400" />
              Mạch Từng Phần (Partial)
            </div>
            <div className="text-3xl md:text-4xl font-black text-white font-mono">
              {partialCircuits}{" "}
              <span className="text-base font-bold text-amber-400/80">
                ({totalPlayers > 0 ? Math.round((partialCircuits / totalPlayers) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Tính điểm theo % cặp đúng</p>
          </div>

          <div className="bg-slate-900/80 border-2 border-rose-500/40 rounded-[20px] p-4 text-center shadow-[0_0_20px_rgba(244,63,94,0.15)]">
            <div className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center justify-center gap-1.5 mb-1">
              <Flame size={14} />
              Chập Mạch (Short Circuit)
            </div>
            <div className="text-3xl md:text-4xl font-black text-white font-mono">
              {shortCircuits}{" "}
              <span className="text-base font-bold text-rose-400/80">
                ({totalPlayers > 0 ? Math.round((shortCircuits / totalPlayers) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">0 điểm - ngắt cầu chì</p>
          </div>

          <div className="bg-slate-900/80 border-2 border-cyan-500/40 rounded-[20px] p-4 text-center shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <div className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center justify-center gap-1.5 mb-1">
              <Users size={14} />
              Đã Đóng Mạch
            </div>
            <div className="text-3xl md:text-4xl font-black text-white font-mono">
              {submittedCount} / {totalPlayers}{" "}
              <span className="text-base font-bold text-cyan-400/80">
                ({submissionPercent}%)
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Tiến độ nộp bài phòng</p>
          </div>
        </div>
      </div>

      {/* ── MASTER ELECTRICAL GRID / BẢNG MẠCH ĐIỆN TỔNG ────────────────────── */}
      <div className="bg-slate-950/90 backdrop-blur-2xl border-4 border-slate-800 rounded-[36px] p-6 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                BẢNG ĐIỀU KHIỂN ĐIỆN CAO THẾ (GRID CONTROL PANEL)
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
              Sơ Đồ Mạch Điện Ghép Cặp & Thống Kê Điểm Nhánh
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFullSchematic((prev) => !prev)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border-2 transition-all ${
                showFullSchematic || isTimeUp
                  ? "bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                  : "bg-slate-900 text-amber-300 border-amber-500/40 hover:bg-slate-800"
              }`}
            >
              <Eye size={16} />
              <span>{showFullSchematic || isTimeUp ? "Đang Hiện Sơ Đồ Chuẩn" : "Xem Sơ Đồ Mạch Chuẩn"}</span>
            </button>
          </div>
        </div>

        {/* Master Circuit Board View */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column A: Cực Nguồn Điện (Power Terminals) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Activity size={14} className="text-amber-400" />
                  Cột Nguồn Điện (Cực A)
                </span>
                <span className="text-xs font-bold text-slate-500">Đầu vào điện thế</span>
              </div>

              {matchingPairs.map((pair, idx) => {
                const stat = wireStats.find((s) => s.wireIndex === pair.index);
                const pct = stat ? stat.correctPercent : 0;
                return (
                  <div
                    key={pair.id || idx}
                    className="bg-slate-900/90 border-2 rounded-[22px] p-4 flex items-center justify-between gap-4 transition-all shadow-md relative overflow-hidden group hover:border-amber-400"
                    style={{ borderColor: `${pair.color}60` }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2.5 shadow-[0_0_12px]"
                      style={{ backgroundColor: pair.color, boxShadow: `0 0 12px ${pair.color}` }}
                    />
                    
                    <div className="flex items-center gap-4 pl-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-inner border border-white/20 shrink-0"
                        style={{ backgroundColor: pair.color }}
                      >
                        A{pair.index}
                      </div>
                      <div>
                        <div className="text-sm md:text-base font-black text-white leading-tight">
                          {pair.leftContent}
                        </div>
                        <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mt-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pair.color }} />
                          Cực nguồn {pair.index}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-amber-300 font-mono">
                        {stat?.correctCount || 0} / {submittedCount} Nối Đúng
                      </div>
                      <div className="w-24 h-2 bg-slate-800 rounded-full mt-1.5 overflow-hidden border border-slate-700">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pair.color,
                            boxShadow: `0 0 8px ${pair.color}`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Column B: Thiết Bị / Bóng Đèn (Electrical Loads) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Lightbulb size={14} className="text-yellow-400" />
                  Bóng Đèn / Thiết Bị (Cột B)
                </span>
                <span className="text-xs font-bold text-slate-500">Tải tiêu thụ</span>
              </div>

              {matchingPairs.map((pair, idx) => {
                const stat = wireStats.find((s) => s.wireIndex === pair.index);
                const isLit = (stat?.correctCount || 0) > 0 || showFullSchematic || isTimeUp;

                return (
                  <div
                    key={`right-${pair.id || idx}`}
                    className={`border-2 rounded-[22px] p-4 flex items-center justify-between gap-4 transition-all shadow-md relative overflow-hidden ${
                      isLit
                        ? "bg-slate-900/90 shadow-[0_0_20px_rgba(234,179,8,0.15)]"
                        : "bg-slate-950/60 opacity-80"
                    }`}
                    style={{ borderColor: isLit ? pair.color : "#334155" }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all ${
                          isLit
                            ? "bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.8)] animate-pulse"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                        }`}
                      >
                        💡
                      </div>
                      <div>
                        <div className="text-sm md:text-base font-black text-white leading-tight">
                          {pair.rightContent}
                        </div>
                        <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mt-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: isLit ? pair.color : "#64748b" }}
                          />
                          Thiết bị {pair.index}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {showFullSchematic || isTimeUp ? (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3 py-1 rounded-xl text-xs font-black">
                          Cực A{pair.index} → Chuẩn
                        </span>
                      ) : isLit ? (
                        <span className="text-xs font-black text-yellow-300 font-mono flex items-center gap-1">
                          <Zap size={12} className="fill-yellow-300" />
                          Đang Sáng ({stat?.correctCount || 0} Đèn)
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500">Chưa nối</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sơ đồ Mạch Điện Chuẩn Chi Tiết (Master Schematic Full Reveal) */}
          {(showFullSchematic || isTimeUp) && (
            <div className="mt-8 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-4 border-amber-500/50 rounded-[30px] p-6 md:p-8 shadow-[0_0_40px_rgba(245,158,11,0.2)] animate-fade-in-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-white">
                    SƠ ĐỒ NỐI MẠCH ĐIỆN CAO THẾ CHUẨN (SCHEMATIC BLUEPRINT)
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Đối chiếu toàn bộ các cặp cực nguồn điện và tải tiêu thụ chuẩn xác
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchingPairs.map((pair) => (
                  <div
                    key={`schematic-${pair.index}`}
                    className="bg-slate-950/80 border-2 rounded-2xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden"
                    style={{ borderColor: `${pair.color}80` }}
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5 shadow-[0_0_10px]"
                      style={{ backgroundColor: pair.color }}
                    />
                    <div className="flex items-center justify-between text-xs font-black text-slate-400">
                      <span>NHÁNH SỐ {pair.index}</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Khép Kín Mạch
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-amber-400/90 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Cực Nguồn A:
                      </div>
                      <div className="text-sm font-black text-white pl-3 border-l-2 border-slate-700">
                        {pair.leftContent}
                      </div>
                    </div>

                    <div className="flex items-center justify-center my-0.5">
                      <div className="w-full flex items-center gap-2">
                        <div className="flex-1 h-0.5" style={{ backgroundColor: `${pair.color}50` }} />
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border text-white" style={{ borderColor: pair.color }}>
                          ⚡ 220V
                        </span>
                        <div className="flex-1 h-0.5" style={{ backgroundColor: `${pair.color}50` }} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-cyan-400/90 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        Thiết Bị Tiêu Thụ B:
                      </div>
                      <div className="text-sm font-black text-emerald-300 pl-3 border-l-2 border-slate-700">
                        {pair.rightContent}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── LIVE ELECTRICIANS FEED / BẢNG GIÁM SÁT KỸ THUẬT VIÊN ────────────── */}
      <div className="bg-slate-950/90 backdrop-blur-2xl border-4 border-slate-800 rounded-[36px] p-6 md:p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Cpu size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">
                Bảng Giám Sát Kỹ Thuật Viên Nối Mạch (Live Trainee Feed)
              </h3>
              <p className="text-xs font-bold text-slate-400">
                Ghi nhận thời gian thực kết quả kiểm thử mạch điện của từng người chơi
              </p>
            </div>
          </div>

          <span className="text-xs font-black bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl font-mono text-amber-400">
            {state?.recentSubmissions?.length || 0} bài nộp gần nhất
          </span>
        </div>

        {state?.recentSubmissions && state.recentSubmissions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.recentSubmissions.map((sub, idx) => (
              <div
                key={sub.playerId || idx}
                className="bg-slate-900/90 border-2 rounded-[22px] p-4 flex items-center justify-between gap-4 shadow-sm hover:border-slate-600 transition-all"
                style={{
                  borderColor: sub.isFullCircuit
                    ? "#10b98160"
                    : sub.correctWires > 0
                    ? "#f59e0b60"
                    : "#f43f5e60",
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={
                      sub.avatarUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.nickname}`
                    }
                    alt={sub.nickname}
                    className="w-11 h-11 rounded-xl border-2 border-slate-700 bg-slate-800 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-black text-white text-sm truncate">
                      {sub.nickname}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{(sub.responseTimeMs / 1000).toFixed(1)}s</span>
                      <span>•</span>
                      <span className="font-mono text-amber-400 font-bold">
                        +{sub.scoreAwarded} pts
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-3 py-1 rounded-xl text-xs font-black ${
                      sub.isFullCircuit
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : sub.correctWires > 0
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    }`}
                  >
                    {sub.isFullCircuit
                      ? "100% Hoàn Hảo"
                      : `${sub.correctWires}/${sub.totalWires} Dây Chuẩn`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-3xl">
            <Radio size={36} className="text-amber-500 mx-auto mb-3 animate-pulse" />
            <p className="text-sm font-bold text-slate-400">
              Đang chờ các kỹ thuật viên đóng cầu dao nối mạch điện...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
