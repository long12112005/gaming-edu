"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Bomb,
  Scissors,
  Clock,
  ShieldCheck,
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Save,
  Zap,
  TrendingUp,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { WireDefuseResult } from "@/hooks/useGameHub";

interface DefuseBombPlayerViewProps {
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
  hasAnswered: boolean;
  answerResult: {
    isCorrect?: boolean;
    scoreAwarded?: number;
    totalScore?: number;
    correctAnswer?: string;
    rank?: number;
    rankChange?: number;
    isTournamentLocked?: boolean;
    streak?: number;
    speedMultiplier?: number;
    streakBonus?: number;
    partialRatio?: number;
    isBombDefused?: boolean;
    totalWires?: number;
    defusedWires?: number;
    wireResults?: WireDefuseResult[];
  } | null;
  roomMode?: string; // "HOST_PACED" | "PLAYER_PACED" | "ASYNC_TOURNAMENT"
  roomPlayerId?: string;
  currentRank?: number;
  onSubmitDefusal: (userAnswers: string[]) => void;
}

const WIRE_PALETTES = [
  {
    name: "Dây Đỏ (Core Logic)",
    color: "red",
    hex: "#ef4444",
    bg: "bg-red-500/15",
    border: "border-red-500/50",
    text: "text-red-400",
    ring: "focus:ring-red-500",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.3)]",
  },
  {
    name: "Dây Xanh (Memory Bus)",
    color: "blue",
    hex: "#3b82f6",
    bg: "bg-blue-500/15",
    border: "border-blue-500/50",
    text: "text-blue-400",
    ring: "focus:ring-blue-500",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]",
  },
  {
    name: "Dây Vàng (Timer Relay)",
    color: "yellow",
    hex: "#eab308",
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/50",
    text: "text-yellow-400",
    ring: "focus:ring-yellow-500",
    glow: "shadow-[0_0_15px_rgba(234,179,8,0.3)]",
  },
  {
    name: "Dây Xanh Lá (Safety Ground)",
    color: "green",
    hex: "#22c55e",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/50",
    text: "text-emerald-400",
    ring: "focus:ring-emerald-500",
    glow: "shadow-[0_0_15px_rgba(34,197,94,0.3)]",
  },
  {
    name: "Dây Tím (Crypto Pulse)",
    color: "purple",
    hex: "#a855f7",
    bg: "bg-purple-500/15",
    border: "border-purple-500/50",
    text: "text-purple-400",
    ring: "focus:ring-purple-500",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
  },
  {
    name: "Dây Cam (Detonator Fuse)",
    color: "orange",
    hex: "#f97316",
    bg: "bg-orange-500/15",
    border: "border-orange-500/50",
    text: "text-orange-400",
    ring: "focus:ring-orange-500",
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.3)]",
  },
];

export default function DefuseBombPlayerView({
  currentSlide,
  slideTimeLeft,
  hasAnswered,
  answerResult,
  roomMode = "HOST_PACED",
  roomPlayerId,
  currentRank = 1,
  onSubmitDefusal,
}: DefuseBombPlayerViewProps) {
  const wireCount = useMemo(() => {
    return Math.max(1, currentSlide?.options?.length || 1);
  }, [currentSlide]);

  const [inputs, setInputs] = useState<string[]>(() => Array(wireCount).fill(""));
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  // Khi chuyển slide mới: reset inputs hoặc load nháp
  useEffect(() => {
    setInputs(Array(wireCount).fill(""));
    setLastAutoSaveTime(null);

    // Ở chế độ ASYNC_TOURNAMENT: thử phục hồi bản nháp từ Redis Cache
    if (roomMode === "ASYNC_TOURNAMENT" && roomPlayerId && currentSlide?.slideId) {
      api
        .get(`/answers/draft?roomPlayerId=${roomPlayerId}&slideId=${currentSlide.slideId}`)
        .then((res) => {
          if (res.data?.data) {
            try {
              const draftArray = JSON.parse(res.data.data);
              if (Array.isArray(draftArray)) {
                setInputs(draftArray);
                setLastAutoSaveTime("Đã phục hồi từ bộ nhớ nháp");
              }
            } catch {
              // fallback nếu là single string
              setInputs([res.data.data]);
            }
          }
        })
        .catch(() => {});
    }
  }, [currentSlide?.slideId, wireCount, roomMode, roomPlayerId]);

  // Tự động lưu nháp mỗi 30 giây ở chế độ ASYNC_TOURNAMENT
  useEffect(() => {
    if (roomMode !== "ASYNC_TOURNAMENT" || !roomPlayerId || !currentSlide?.slideId || hasAnswered) {
      return;
    }

    const intervalId = setInterval(async () => {
      const currentInputs = inputsRef.current;
      const hasContent = currentInputs.some((val) => val.trim().length > 0);
      if (!hasContent) return;

      try {
        setIsAutoSaving(true);
        await api.put("/answers/draft", {
          roomPlayerId,
          slideId: currentSlide.slideId,
          answerData: JSON.stringify(currentInputs),
        });
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];
        setLastAutoSaveTime(`Đã lưu nháp lúc ${timeStr}`);
      } catch (err) {
        console.error("Auto-save draft error:", err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 30000); // 30s

    return () => clearInterval(intervalId);
  }, [roomMode, roomPlayerId, currentSlide?.slideId, hasAnswered]);

  const handleInputChange = (index: number, value: string) => {
    setInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleDefuseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;
    onSubmitDefusal(inputs);
  };

  const isTimeCritical = slideTimeLeft !== null && slideTimeLeft <= 5;

  // ── MÀN HÌNH SAU KHI NỘP BÀI HOẶC HẾT GIỜ ──
  if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0 && answerResult)) {
    // 1. Chế độ ASYNC_TOURNAMENT bị khóa điểm
    if (answerResult?.isTournamentLocked) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_25px_rgba(245,158,11,0.3)]">
              <Lock size={40} />
            </div>

            <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold mb-3">
              GIẢI ĐẤU ASYNC: BẢO MẬT TUYỆT ĐỐI
            </div>

            <h3 className="text-2xl font-black font-sans text-white mb-2">
              Mã Gỡ Bom Đã Được Niêm Phong!
            </h3>
            <p className="text-sm font-sans text-slate-300 leading-relaxed mb-6">
              Hệ thống đã mã hóa và lưu bài nộp an toàn vào Redis Cache. Điểm số, tỷ lệ cắt dây và đối chiếu từ khóa chuẩn sẽ được công bố khi giải đấu khép lại!
            </p>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left font-mono text-xs text-slate-400 space-y-1.5">
              <div className="text-slate-300 font-bold mb-1">Dữ liệu mã gỡ bom đã ghi nhận:</div>
              {inputs.map((ans, idx) => (
                <div key={idx} className="flex items-center justify-between text-slate-400">
                  <span>Dây #{idx + 1}:</span>
                  <span className="text-amber-300 font-bold">"{ans.trim() || "(bỏ trống)"}"</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 2. Chế độ Thường hoặc Tự động: Có kết quả chấm điểm
    const isDefused = answerResult?.isBombDefused ?? answerResult?.isCorrect ?? false;
    const totalWires = answerResult?.totalWires ?? wireCount;
    const defusedWires = answerResult?.defusedWires ?? (isDefused ? totalWires : 0);
    const wireResults = answerResult?.wireResults ?? [];

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div
          className={`max-w-xl w-full rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl border-4 text-center relative overflow-hidden transition-all ${
            isDefused
              ? "bg-gradient-to-b from-slate-900/95 via-emerald-950/60 to-slate-950/95 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
              : "bg-gradient-to-b from-slate-900/95 via-red-950/60 to-slate-950/95 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)]"
          }`}
        >
          {/* Status Header Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-xs font-black uppercase mb-4 tracking-wider border shadow-sm">
            {isDefused ? (
              <span className="text-emerald-400 bg-emerald-500/20 border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <ShieldCheck size={16} /> NHIỆM VỤ HOÀN THÀNH (BOMB DEFUSED)
              </span>
            ) : (
              <span className="text-red-400 bg-red-500/20 border-red-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Flame size={16} /> BOM ĐÃ PHÁT NỔ (DETONATION)
              </span>
            )}
          </div>

          {/* Big Graphic Icon */}
          <div
            className={`w-24 h-24 rounded-3xl mx-auto flex items-center justify-center mb-4 border-2 shadow-2xl ${
              isDefused
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                : "bg-red-500/20 border-red-400 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-bounce"
            }`}
          >
            {isDefused ? <ShieldCheck size={56} /> : <Bomb size={56} />}
          </div>

          <h3 className="text-2xl md:text-3xl font-black font-sans text-white mb-2">
            {isDefused ? "VÔ HIỆU HÓA THÀNH CÔNG!" : "NGÒI NỔ KÍCH HOẠT!"}
          </h3>

          <p className="text-sm font-sans text-slate-300 mb-6">
            {isDefused
              ? `Xuất sắc! Bạn đã cắt chuẩn xác cả ${defusedWires}/${totalWires} dây bom và bảo toàn phòng chơi an toàn.`
              : `Bạn đã cắt được ${defusedWires}/${totalWires} dây bom. Áp dụng Partial Credit để bảo tồn điểm.`}
          </p>

          {/* Score & Rewards Box */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6">
            <div className="text-left font-mono">
              <div className="text-xs text-slate-400">Điểm Nhận Được:</div>
              <div className="text-2xl font-black text-amber-400">
                +{(answerResult?.scoreAwarded || 0).toLocaleString()} pts
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-xs text-slate-400">Tổng Điểm Hiện Tại:</div>
              <div className="text-2xl font-black text-white">
                {(answerResult?.totalScore || 0).toLocaleString()} pts
              </div>
            </div>
          </div>

          {/* Wire-by-Wire Inspection Table */}
          {wireResults.length > 0 && (
            <div className="space-y-2.5 text-left mb-6">
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Scissors size={14} /> Đối Chiếu Dây Bom Đã Cắt (Fuzzy Matching):
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {wireResults.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                      w.isCut
                        ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                        : "bg-red-950/30 border-red-500/40 text-red-300"
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        {w.isCut ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        Dây {w.wireIndex} ({w.wireColor.toUpperCase()}): {w.isCut ? "Cắt Thành Công" : "Cắt Hỏng"}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1">
                        Bạn gõ: <span className="font-bold underline">{w.userInput || "(trống)"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Mã chuẩn:</div>
                      <div className="font-bold text-amber-300">{w.expectedKeyword}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rank Change Indicator */}
          {(answerResult?.rankChange || 0) > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-mono text-sm font-black animate-pulse">
              <TrendingUp size={16} /> Leo Hạng Ngoạn Mục: +{answerResult?.rankChange} Bậc (Hạng #{answerResult?.rank})
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MÀN HÌNH ĐANG LÀM BÀI GỠ BOM ──
  return (
    <div className="flex-1 flex flex-col justify-between max-w-2xl mx-auto w-full p-4 animate-fade-in-up">
      {/* ── TOP BOMB HUD ── */}
      <div className="bg-slate-900/90 border-2 border-red-500/40 rounded-3xl p-5 backdrop-blur-xl shadow-2xl relative overflow-hidden mb-5">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-500" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Bomb size={22} className={isTimeCritical ? "animate-ping" : "animate-pulse"} />
            </div>
            <div>
              <div className="text-xs font-mono text-red-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                C4 DEFUSAL UNIT #{currentSlide?.index !== undefined ? currentSlide.index + 1 : 1}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {wireCount} Dây Dẫn • Điền Khuyết Tiếng Việt
              </div>
            </div>
          </div>

          {/* Countdown Clock */}
          <div
            className={`font-mono text-2xl md:text-3xl font-black px-4 py-1 rounded-xl border-2 tracking-widest flex items-center gap-2 ${
              isTimeCritical
                ? "bg-red-500/20 text-red-400 border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                : "bg-amber-500/10 text-amber-400 border-amber-500/40"
            }`}
          >
            <Clock size={20} />
            <span>
              {slideTimeLeft !== null
                ? `${String(Math.floor(slideTimeLeft / 60)).padStart(2, "0")}:${String(slideTimeLeft % 60).padStart(2, "0")}`
                : "00:30"}
            </span>
          </div>
        </div>

        {/* Question Text */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-base md:text-lg font-bold font-sans text-slate-100 leading-relaxed">
            {currentSlide?.questionText}
          </p>
        </div>

        {/* Async Mode Auto-Save Badge */}
        {roomMode === "ASYNC_TOURNAMENT" && (
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <Save size={12} /> {lastAutoSaveTime || "Tự động lưu nháp mỗi 30s vào Redis"}
            </span>
            {isAutoSaving && <RefreshCw size={12} className="animate-spin text-amber-400" />}
          </div>
        )}
      </div>

      {/* ── WIRE INPUTS FORM ── */}
      <form onSubmit={handleDefuseSubmit} className="flex-1 flex flex-col justify-between gap-5">
        <div className="space-y-3.5">
          {Array.from({ length: wireCount }).map((_, idx) => {
            const palette = WIRE_PALETTES[idx % WIRE_PALETTES.length];
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border-2 transition-all ${palette.border} ${palette.bg} backdrop-blur-md flex flex-col gap-2`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: palette.hex, boxShadow: `0 0 10px ${palette.hex}` }}
                    />
                    <span className={`font-mono font-bold text-xs ${palette.text}`}>
                      DÂY #{idx + 1}: {palette.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {currentSlide?.options?.[idx]?.content || `Vị trí trống #${idx + 1}`}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus={idx === 0}
                    value={inputs[idx] || ""}
                    onChange={(e) => handleInputChange(idx, e.target.value)}
                    placeholder={`Gõ từ khóa để cắt dây #${idx + 1}...`}
                    className={`w-full px-4 py-3 bg-slate-950/80 border-2 ${palette.border} rounded-xl font-mono text-base md:text-lg text-white placeholder-slate-500 outline-none ${palette.ring} transition-all shadow-inner`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <Scissors size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── DEFUSE CONFIRM BUTTON ── */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={inputs.every((val) => !val.trim())}
            className="w-full py-4 px-6 bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:via-amber-500 hover:to-yellow-400 text-slate-950 font-black font-mono text-lg rounded-2xl shadow-[0_6px_0_0_#991b1b] active:translate-y-1 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-wider"
          >
            <Scissors size={24} className="stroke-[2.5px]" />
            <span>KÍCH HOẠT CẮT DÂY (CONFIRM DEFUSAL)</span>
          </button>
          <p className="text-center text-xs font-mono text-slate-400 mt-2">
            Hỗ trợ gõ nhanh không dấu hoặc sai lệch 1-2 ký tự (Fuzzy Matching 4 Bước)
          </p>
        </div>
      </form>
    </div>
  );
}
