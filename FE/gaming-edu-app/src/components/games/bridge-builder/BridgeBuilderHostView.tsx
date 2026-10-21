"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  Clock,
  ChevronRight,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Users,
  Compass,
  Footprints,
  ShieldCheck,
  Zap,
  Waves,
  Eye,
  Award,
} from "lucide-react";
import { BridgeBuilderState } from "@/hooks/useGameHub";

interface BridgeBuilderHostViewProps {
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
      blankKeywords?: string;
    }[];
  } | null;
  slideTimeLeft: number | null;
  answerProgress: {
    answeredCount: number;
    totalPlayers: number;
    bridgeBuilder?: BridgeBuilderState;
  } | null;
  leaderboard: any[];
  bridgeBuilderState: BridgeBuilderState | null;
  onNextSlide: () => void;
}

export default function BridgeBuilderHostView({
  currentSlide,
  slideTimeLeft,
  answerProgress,
  leaderboard,
  bridgeBuilderState,
  onNextSlide,
}: BridgeBuilderHostViewProps) {
  const [showFullSolution, setShowFullSolution] = useState(false);

  // Tổng số nhịp cầu (tối thiểu 1)
  const totalSpans = useMemo(() => {
    return Math.max(1, currentSlide?.options?.length || 1);
  }, [currentSlide]);

  const state = bridgeBuilderState || answerProgress?.bridgeBuilder;
  const isTimeUp = slideTimeLeft !== null && slideTimeLeft <= 0;
  const totalPlayers = state?.totalPlayers || answerProgress?.totalPlayers || 1;
  const submittedCount = state?.submittedCount || answerProgress?.answeredCount || 0;
  const fullCrossings = state?.fullCrossings || 0;
  const partialCrossings = state?.partialCrossings || 0;
  const fallenCount = state?.fallenCount || 0;

  const fullCrossingPercent = totalPlayers > 0 ? Math.round((fullCrossings / totalPlayers) * 100) : 0;
  const submissionPercent = totalPlayers > 0 ? Math.round((submittedCount / totalPlayers) * 100) : 0;

  // Lấy danh sách thống kê từng nhịp cầu
  const spanStats = useMemo(() => {
    if (state?.spanStats && state.spanStats.length > 0) {
      return state.spanStats;
    }
    return Array.from({ length: totalSpans }, (_, i) => ({
      spanIndex: i + 1,
      builtCount: 0,
      totalCount: 0,
      builtPercent: 0,
      expectedKeyword: currentSlide?.options?.[i]?.content || `Từ khóa ${i + 1}`,
    }));
  }, [state?.spanStats, totalSpans, currentSlide]);

  // Phân bổ người chơi vào các vị trí trên cầu
  const playersByPosition = useMemo(() => {
    const crossings = state?.recentCrossings || [];
    // 0: Bờ xuất phát / rơi sông, 1..totalSpans-1: trên nhịp tương ứng, totalSpans: Bờ đích
    const map: Record<number, typeof crossings> = {};
    for (let i = 0; i <= totalSpans; i++) {
      map[i] = [];
    }
    crossings.forEach((p) => {
      const pos = Math.min(totalSpans, Math.max(0, p.builtSpans));
      map[pos].push(p);
    });
    return map;
  }, [state?.recentCrossings, totalSpans]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* ── TOP HUD & PROGRESS BAR ────────────────────────────────────────── */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-4 border-cyan-500/30 rounded-[36px] p-6 md:p-8 shadow-[0_20px_50px_rgba(6,182,212,0.15)] text-white">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Header & Question Index */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-cyan-300 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(6,182,212,0.5)]">
              🌉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider">
                  Mini-Game 06: Xây Cầu Qua Sông
                </span>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/40 px-3 py-1 rounded-xl text-xs font-black">
                  {totalSpans} Nhịp Cầu
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                Câu {currentSlide?.index !== undefined ? currentSlide.index + 1 : 1}: Thử Thách Vượt Sông
              </h2>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Qua sông hoàn toàn */}
            <div className="bg-emerald-950/60 border-2 border-emerald-500/40 rounded-2xl px-5 py-3 text-center min-w-[120px]">
              <div className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1">
                <Trophy size={14} /> Qua Sông
              </div>
              <div className="text-2xl font-black text-emerald-300 mt-0.5">
                {fullCrossings} <span className="text-xs text-emerald-400/70">({fullCrossingPercent}%)</span>
              </div>
            </div>

            {/* Đang trên cầu */}
            <div className="bg-amber-950/60 border-2 border-amber-500/40 rounded-2xl px-5 py-3 text-center min-w-[120px]">
              <div className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1">
                <Footprints size={14} /> Trên Cầu
              </div>
              <div className="text-2xl font-black text-amber-300 mt-0.5">
                {partialCrossings} <span className="text-xs text-amber-400/70">người</span>
              </div>
            </div>

            {/* Chưa qua / Rơi sông */}
            <div className="bg-rose-950/60 border-2 border-rose-500/40 rounded-2xl px-5 py-3 text-center min-w-[120px]">
              <div className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center justify-center gap-1">
                <Waves size={14} /> Rơi Sông
              </div>
              <div className="text-2xl font-black text-rose-300 mt-0.5">
                {fallenCount} <span className="text-xs text-rose-400/70">người</span>
              </div>
            </div>

            {/* Đồng hồ đếm ngược */}
            <div
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl border-2 font-black text-2xl transition-all ${
                slideTimeLeft !== null && slideTimeLeft <= 5
                  ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                  : "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              }`}
            >
              <Clock size={22} className="animate-spin-slow" />
              <span>{slideTimeLeft !== null ? `${slideTimeLeft}s` : "--"}</span>
            </div>

            {/* Nút Next Slide */}
            <button
              onClick={onNextSlide}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black px-6 py-3.5 rounded-2xl shadow-[0_6px_0_0_#0284c7] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
            >
              <span>{isTimeUp ? "Xem Điểm / Tiếp Tục" : "Tiếp Theo"}</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Thanh tiến độ xây cầu toàn phòng */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs font-black text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Compass size={14} /> TIẾN ĐỘ THI CÔNG CẦU: {submittedCount}/{totalPlayers} THÍ SINH ĐÃ NỘP BÀI ({submissionPercent}%)
            </span>
            <span className="text-emerald-400 font-bold">
              Tỷ lệ qua sông thành công: {fullCrossingPercent}%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${submissionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── QUESTION DISPLAY ──────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border-4 border-slate-800 rounded-[32px] p-6 md:p-8 text-center shadow-xl">
        <span className="inline-block bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-black px-4 py-1.5 rounded-full text-xs uppercase tracking-widest mb-3">
          Văn Bản Cần Điền Khuyết Để Xây {totalSpans} Nhịp Cầu
        </span>
        <h3 className="text-2xl md:text-3xl font-black text-white leading-relaxed max-w-4xl mx-auto">
          {currentSlide?.questionText}
        </h3>
      </div>

      {/* ── PANORAMIC RIVER & BRIDGE ARENA ─────────────────────────────────── */}
      <div className="relative bg-gradient-to-b from-sky-950 via-slate-900 to-cyan-950 border-4 border-cyan-600/40 rounded-[40px] p-6 md:p-10 shadow-[0_25px_60px_rgba(2,132,199,0.2)] overflow-hidden">
        {/* Animated Water Background Effect */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cyan-600/20 via-blue-600/10 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(6,182,212,0.15),transparent_70%)] pointer-events-none" />

        {/* River Banks & Bridge Grid */}
        <div className="relative z-10 flex flex-col lg:flex-row items-stretch justify-between gap-4">
          {/* BỜ XUẤT PHÁT (BỜ TÂY) */}
          <div className="w-full lg:w-44 bg-gradient-to-br from-amber-900/80 to-slate-900 border-3 border-amber-600/50 rounded-3xl p-4 flex flex-col items-center justify-between text-center shadow-lg shrink-0">
            <div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl border-2 border-amber-400/40 flex items-center justify-center text-2xl mx-auto mb-2">
                🏕️
              </div>
              <div className="font-black text-amber-300 text-sm">BỜ KHỞI HÀNH</div>
              <div className="text-[11px] font-bold text-amber-400/70">Điểm xuất phát</div>
            </div>

            {/* Thí sinh tại bờ xuất phát / chưa qua nhịp 1 */}
            <div className="w-full mt-4 bg-black/40 rounded-2xl p-2.5 border border-amber-500/30">
              <div className="text-[10px] font-black text-amber-200/80 mb-1.5 uppercase">
                Chờ qua sông ({playersByPosition[0]?.length || 0})
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-24 overflow-y-auto">
                {(playersByPosition[0] || []).slice(0, 6).map((p) => (
                  <div
                    key={p.playerId}
                    title={`${p.nickname} (0/${totalSpans} nhịp)`}
                    className="w-7 h-7 rounded-full bg-slate-800 border-2 border-amber-400 overflow-hidden shadow-sm"
                  >
                    <img
                      src={p.avatarUrl || `https://ui-avatars.com/api/?name=${p.nickname}&background=d97706&color=fff`}
                      alt={p.nickname}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {(playersByPosition[0]?.length || 0) > 6 && (
                  <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded-full border border-amber-500/40">
                    +{playersByPosition[0].length - 6}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CÁC NHỊP CẦU Ở GIỮA DÒNG SÔNG */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
            {spanStats.map((span, idx) => {
              const builtRatio = span.totalCount > 0 ? span.builtCount / span.totalCount : 0;
              const isSolid = builtRatio >= 0.5;
              const playersOnThisSpan = playersByPosition[idx + 1] || [];

              return (
                <div
                  key={span.spanIndex}
                  className={`relative flex flex-col justify-between p-4 rounded-3xl border-3 transition-all duration-300 ${
                    isSolid
                      ? "bg-slate-900/90 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                      : "bg-slate-900/70 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  {/* Span Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-black text-xs flex items-center justify-center">
                        #{span.spanIndex}
                      </span>
                      <span className="font-black text-white text-sm">Nhịp Cầu {span.spanIndex}</span>
                    </div>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                        span.builtPercent >= 70
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : span.builtPercent >= 40
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {span.builtPercent}% hoàn thành
                    </span>
                  </div>

                  {/* Visual Wooden/Stone Plank Illustration */}
                  <div className="my-2 p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-800 to-amber-950/60 border-2 border-amber-700/50 shadow-inner text-center">
                    <div className="text-xs font-bold text-slate-400 mb-1 flex items-center justify-center gap-1">
                      <span>🌉 Mặt cầu nhịp {span.spanIndex}</span>
                    </div>

                    {/* Hiển thị đáp án (khi hết giờ hoặc khi host bật) */}
                    {isTimeUp || showFullSolution ? (
                      <div className="font-black text-emerald-300 text-sm md:text-base bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl animate-flip-in">
                        🔑 {span.expectedKeyword}
                      </div>
                    ) : (
                      <div className="font-black text-slate-500 text-xs md:text-sm tracking-widest bg-black/40 border border-slate-700 px-3 py-1.5 rounded-xl">
                        🔒 ĐANG ĐỐI CHIẾU...
                      </div>
                    )}
                  </div>

                  {/* Progress bar of this span */}
                  <div className="w-full mt-2">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>Đúng: {span.builtCount} người</span>
                      <span>{span.builtPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${span.builtPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Avatars of players on this span */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                    <div className="text-[10px] font-black text-cyan-300/80 mb-1 uppercase flex items-center justify-between">
                      <span>Đứng tại nhịp này</span>
                      <span>({playersOnThisSpan.length})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 min-h-[28px]">
                      {playersOnThisSpan.slice(0, 4).map((p) => (
                        <div
                          key={p.playerId}
                          title={`${p.nickname} (qua ${p.builtSpans}/${totalSpans} nhịp)`}
                          className="w-6 h-6 rounded-full bg-slate-800 border-2 border-cyan-400 overflow-hidden shadow-sm"
                        >
                          <img
                            src={p.avatarUrl || `https://ui-avatars.com/api/?name=${p.nickname}&background=06b6d4&color=fff`}
                            alt={p.nickname}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {playersOnThisSpan.length > 4 && (
                        <span className="text-[9px] font-black text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded-full border border-cyan-500/40">
                          +{playersOnThisSpan.length - 4}
                        </span>
                      )}
                      {playersOnThisSpan.length === 0 && (
                        <span className="text-[10px] font-semibold text-slate-500 italic">Trống</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BỜ ĐÍCH VINH QUANG (BỜ ĐÔNG) */}
          <div className="w-full lg:w-44 bg-gradient-to-br from-emerald-900/80 to-slate-900 border-3 border-emerald-500/50 rounded-3xl p-4 flex flex-col items-center justify-between text-center shadow-lg shrink-0">
            <div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl border-2 border-emerald-400/40 flex items-center justify-center text-2xl mx-auto mb-2 animate-bounce">
                🏆
              </div>
              <div className="font-black text-emerald-300 text-sm">BỜ VINH QUANG</div>
              <div className="text-[11px] font-bold text-emerald-400/70">Đúng 100% các nhịp</div>
            </div>

            {/* Thí sinh đã qua sông thành công */}
            <div className="w-full mt-4 bg-black/40 rounded-2xl p-2.5 border border-emerald-500/30">
              <div className="text-[10px] font-black text-emerald-200/80 mb-1.5 uppercase flex items-center justify-center gap-1">
                <span>Về đích ({playersByPosition[totalSpans]?.length || 0})</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-24 overflow-y-auto">
                {(playersByPosition[totalSpans] || []).slice(0, 6).map((p) => (
                  <div
                    key={p.playerId}
                    title={`${p.nickname} (Hoàn thành ${totalSpans}/${totalSpans} nhịp 🎉)`}
                    className="w-7 h-7 rounded-full bg-slate-800 border-2 border-emerald-400 overflow-hidden shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                  >
                    <img
                      src={p.avatarUrl || `https://ui-avatars.com/api/?name=${p.nickname}&background=10b981&color=fff`}
                      alt={p.nickname}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {(playersByPosition[totalSpans]?.length || 0) > 6 && (
                  <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-500/40">
                    +{playersByPosition[totalSpans].length - 6}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE BUILDERS CROSSING FEED & REVEAL ACCORDION ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột 1 & 2: Dòng thời gian thí sinh vượt sông */}
        <div className="lg:col-span-2 bg-slate-900/90 border-4 border-slate-800 rounded-[32px] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-black text-white flex items-center gap-2">
              <Footprints className="text-cyan-400" size={20} />
              Dòng Hoạt Động Xây Cầu & Vượt Sông
            </h4>
            <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
              {state?.recentCrossings?.length || 0} lượt nộp
            </span>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {(!state?.recentCrossings || state.recentCrossings.length === 0) ? (
              <div className="text-center py-10 text-slate-500 font-bold text-sm">
                Đang chờ các thí sinh gửi đáp án xây cầu...
              </div>
            ) : (
              state.recentCrossings.map((crossing) => (
                <div
                  key={crossing.playerId}
                  className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                    crossing.isFullyCrossed
                      ? "bg-emerald-950/30 border-emerald-500/40"
                      : crossing.builtSpans > 0
                      ? "bg-cyan-950/20 border-cyan-500/30"
                      : "bg-rose-950/20 border-rose-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        crossing.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${crossing.nickname}&background=0284c7&color=fff`
                      }
                      alt={crossing.nickname}
                      className="w-10 h-10 rounded-xl border border-slate-700 object-cover"
                    />
                    <div>
                      <div className="font-black text-white text-sm flex items-center gap-2">
                        <span>{crossing.nickname}</span>
                        {crossing.isFullyCrossed && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-md font-black">
                            VƯỢT SÔNG THÀNH CÔNG
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>
                          Xây được:{" "}
                          <strong className={crossing.builtSpans > 0 ? "text-cyan-300" : "text-rose-400"}>
                            {crossing.builtSpans}/{crossing.totalSpans} nhịp
                          </strong>
                        </span>
                        <span>•</span>
                        <span>{(crossing.responseTimeMs / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-cyan-300 text-sm">
                      +{crossing.scoreAwarded} pts
                    </div>
                    <div className="text-[11px] font-bold text-slate-400">
                      {Math.round((crossing.builtSpans / crossing.totalSpans) * 100)}% điểm
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cột 3: Tùy chọn mở đáp án chuẩn và Top Điểm Cao */}
        <div className="space-y-6">
          {/* Box Nút Lật Mở Đáp Án */}
          <div className="bg-gradient-to-br from-slate-900 to-cyan-950 border-4 border-cyan-500/30 rounded-[32px] p-6 shadow-xl">
            <h4 className="text-base font-black text-white flex items-center gap-2 mb-3">
              <Eye className="text-cyan-400" size={18} />
              Trình Chiếu Đáp Án
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Hiển thị từ khóa chuẩn của tất cả các nhịp cầu lên màn hình chiếu lớn cho cả phòng đối chiếu.
            </p>
            <button
              onClick={() => setShowFullSolution((prev) => !prev)}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm rounded-xl border border-cyan-400 shadow-[0_4px_0_0_#0284c7] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              <span>{showFullSolution ? "Ẩn Từ Khóa Chuẩn" : "Lật Mở Toàn Bộ Nhịp Cầu"}</span>
            </button>
          </div>

          {/* Top 3 Bảng Xếp Hạng Nhanh */}
          <div className="bg-slate-900/90 border-4 border-slate-800 rounded-[32px] p-6 shadow-xl">
            <h4 className="text-base font-black text-white flex items-center gap-2 mb-3">
              <Award className="text-amber-400" size={18} />
              Top Thợ Xây Dẫn Đầu
            </h4>
            <div className="space-y-2">
              {leaderboard.slice(0, 3).map((p, idx) => (
                <div
                  key={p.playerId || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-black text-white text-xs truncate max-w-[120px]">
                      {p.nickname}
                    </span>
                  </div>
                  <span className="font-black text-cyan-300 text-xs">
                    {p.totalScore?.toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
