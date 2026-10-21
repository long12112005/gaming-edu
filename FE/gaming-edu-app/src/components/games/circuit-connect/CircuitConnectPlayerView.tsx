"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Zap,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Save,
  TrendingUp,
  Cpu,
  RefreshCw,
  Lightbulb,
  Unlink,
  Check,
  X,
  Flame,
  Award,
  Radio,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { CircuitWireResult } from "@/hooks/useGameHub";

interface CircuitConnectPlayerViewProps {
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
    isFullCircuit?: boolean;
    totalCircuitWires?: number;
    connectedCorrectWires?: number;
    circuitWireResults?: CircuitWireResult[];
  } | null;
  roomMode?: string; // "HOST_PACED" | "PLAYER_PACED" | "ASYNC_TOURNAMENT"
  roomPlayerId?: string;
  currentRank?: number;
  onSubmitCircuit: (pairs: { leftId: string; rightContent: string }[]) => void;
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

export default function CircuitConnectPlayerView({
  currentSlide,
  slideTimeLeft,
  hasAnswered,
  answerResult,
  roomMode = "HOST_PACED",
  roomPlayerId,
  currentRank = 1,
  onSubmitCircuit,
}: CircuitConnectPlayerViewProps) {
  // Cột bên trái: Cực Nguồn Vế A
  const leftTerminals = useMemo(() => {
    if (!currentSlide?.options) return [];
    return currentSlide.options.map((opt, idx) => ({
      id: opt.id,
      content: opt.content,
      expected: opt.matchingPair || opt.content,
      color: WIRE_COLORS[idx % WIRE_COLORS.length],
      index: idx + 1,
    }));
  }, [currentSlide]);

  const totalWires = Math.max(1, leftTerminals.length);

  // Cột bên phải: Bóng Đèn / Thiết Bị Vế B (XÁO TRỘN THỨ TỰ)
  const [shuffledRightItems, setShuffledRightItems] = useState<{ id: string; text: string }[]>([]);

  useEffect(() => {
    if (!currentSlide?.options) return;
    const items = currentSlide.options
      .map((opt) => opt.matchingPair || opt.content)
      .filter(Boolean)
      .map((text, idx) => ({ id: `right-${idx}-${text}`, text }));

    // Xáo trộn thứ tự cho người chơi ghép nối
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setShuffledRightItems(shuffled);
  }, [currentSlide?.slideId]);

  // Trạng thái ghép nối hiện tại của người chơi: { [leftId]: rightContent }
  const [connections, setConnections] = useState<Record<string, string>>({});
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightText, setSelectedRightText] = useState<string | null>(null);

  // Auto-save states
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;

  // Reset khi đổi câu hỏi & load draft từ Redis nếu ở chế độ ASYNC_TOURNAMENT
  useEffect(() => {
    setConnections({});
    setSelectedLeftId(null);
    setSelectedRightText(null);
    setLastAutoSaveTime(null);

    if (roomMode === "ASYNC_TOURNAMENT" && roomPlayerId && currentSlide?.slideId) {
      api
        .get(`/answers/draft?roomPlayerId=${roomPlayerId}&slideId=${currentSlide.slideId}`)
        .then((res) => {
          if (res.data?.data) {
            try {
              const draftPairs = JSON.parse(res.data.data);
              if (Array.isArray(draftPairs)) {
                const map: Record<string, string> = {};
                draftPairs.forEach((p: { leftId: string; rightContent: string }) => {
                  if (p.leftId && p.rightContent) {
                    map[p.leftId] = p.rightContent;
                  }
                });
                setConnections(map);
              }
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [currentSlide?.slideId, roomMode, roomPlayerId]);

  // Auto-save draft mỗi 30s
  useEffect(() => {
    if (hasAnswered || !currentSlide?.slideId || !roomPlayerId) return;

    const interval = setInterval(async () => {
      const currentMap = connectionsRef.current;
      const pairs = Object.entries(currentMap).map(([leftId, rightContent]) => ({
        leftId,
        rightContent,
      }));

      if (pairs.length === 0) return;

      setIsAutoSaving(true);
      try {
        await api.put("/answers/draft", {
          roomPlayerId,
          slideId: currentSlide.slideId,
          answerData: JSON.stringify(pairs),
        });
        const now = new Date();
        setLastAutoSaveTime(
          `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`
        );
      } catch (err) {
        console.error("Auto-save circuit error:", err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [hasAnswered, currentSlide?.slideId, roomPlayerId]);

  // Xử lý chạm chọn cực nguồn A
  const handleSelectLeft = (leftId: string) => {
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;

    // Nếu đã chọn một bóng đèn bên phải trước đó -> Nối ngay!
    if (selectedRightText) {
      setConnections((prev) => ({
        ...prev,
        [leftId]: selectedRightText,
      }));
      setSelectedRightText(null);
      setSelectedLeftId(null);
      return;
    }

    // Toggle chọn cực bên trái
    if (selectedLeftId === leftId) {
      setSelectedLeftId(null);
    } else {
      setSelectedLeftId(leftId);
    }
  };

  // Xử lý chạm chọn bóng đèn B
  const handleSelectRight = (rightText: string) => {
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;

    // Nếu đã chọn một cực nguồn A trước đó -> Nối ngay!
    if (selectedLeftId) {
      setConnections((prev) => ({
        ...prev,
        [selectedLeftId]: rightText,
      }));
      setSelectedLeftId(null);
      setSelectedRightText(null);
      return;
    }

    // Toggle chọn bóng đèn bên phải
    if (selectedRightText === rightText) {
      setSelectedRightText(null);
    } else {
      setSelectedRightText(rightText);
    }
  };

  // Hủy nối một dây
  const handleDisconnect = (leftId: string) => {
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;
    setConnections((prev) => {
      const next = { ...prev };
      delete next[leftId];
      return next;
    });
  };

  // Tháo toàn bộ dây nối
  const handleResetAllWires = () => {
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;
    setConnections({});
    setSelectedLeftId(null);
    setSelectedRightText(null);
  };

  // Đóng cầu dao nộp bài
  const handleSubmit = () => {
    if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) return;
    const pairs = Object.entries(connections).map(([leftId, rightContent]) => ({
      leftId,
      rightContent,
    }));
    onSubmitCircuit(pairs);
  };

  const connectedCount = Object.keys(connections).length;
  const isTimeUp = slideTimeLeft !== null && slideTimeLeft <= 0;

  // Lấy màu dây đã nối cho một thiết bị bên phải
  const getWireColorForRight = (rightText: string) => {
    const connectedLeftId = Object.keys(connections).find(
      (k) => connections[k] === rightText
    );
    if (!connectedLeftId) return null;
    const leftTerm = leftTerminals.find((t) => t.id === connectedLeftId);
    return leftTerm ? leftTerm.color : "#eab308";
  };

  const getConnectedLeftIndex = (rightText: string) => {
    const connectedLeftId = Object.keys(connections).find(
      (k) => connections[k] === rightText
    );
    if (!connectedLeftId) return null;
    const leftTerm = leftTerminals.find((t) => t.id === connectedLeftId);
    return leftTerm ? leftTerm.index : null;
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* ── WORKBENCH TOP BAR ─────────────────────────────────────────────── */}
      <div className="bg-slate-950/95 backdrop-blur-xl border-4 border-amber-500/40 rounded-[28px] p-4 md:p-6 shadow-[0_15px_40px_rgba(245,158,11,0.2)] text-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 border border-amber-300 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider">
                  Nối Mạch Điện Cao Thế
                </span>
                <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 px-2 py-0.5 rounded-lg text-xs font-black">
                  {totalWires} Cặp Dây
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
                {roomMode === "ASYNC_TOURNAMENT" ? (
                  <span className="text-purple-400 font-bold flex items-center gap-1">
                    <ShieldCheck size={12} /> Giải Đấu Async • Két Sắt Khóa
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Radio size={12} className="animate-spin" /> Trực Tuyến Thời Gian Thực
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clock Timer & Auto-save status */}
          <div className="flex items-center gap-3">
            {roomMode === "ASYNC_TOURNAMENT" && (
              <div className="text-xs font-bold text-slate-400 flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <Save size={13} className={isAutoSaving ? "text-amber-400 animate-spin" : "text-emerald-400"} />
                <span>{lastAutoSaveTime ? `Đã lưu: ${lastAutoSaveTime}` : "Tự động lưu nháp"}</span>
              </div>
            )}

            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 font-mono font-black text-xl tabular-nums ${
                slideTimeLeft !== null && slideTimeLeft <= 5
                  ? "bg-rose-500/20 text-rose-300 border-rose-500 animate-pulse"
                  : "bg-slate-900 text-amber-300 border-amber-500/40"
              }`}
            >
              <Clock size={18} />
              <span>{slideTimeLeft !== null ? `${slideTimeLeft}s` : "–"}</span>
            </div>
          </div>
        </div>

        {/* Question Text */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
            {currentSlide?.questionText}
          </h2>
          <p className="text-xs font-bold text-amber-400/90 mt-1 flex items-center gap-1.5">
            <Zap size={14} className="fill-amber-400" />
            Hướng dẫn: Chạm Cực Nguồn bên trái rồi chạm Bóng Đèn bên phải để nối dây dẫn mạch điện.
          </p>
        </div>
      </div>

      {/* ── INTERACTIVE CIRCUIT WORKBENCH ──────────────────────────────────── */}
      {!hasAnswered && !answerResult && (
        <div className="bg-slate-950/90 backdrop-blur-xl border-4 border-slate-800 rounded-[32px] p-4 md:p-8 shadow-2xl relative overflow-hidden space-y-6">
          {/* Header Controls */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Bàn Ghép Nối Dây Dẫn (Đã Nối {connectedCount}/{totalWires} Nhánh)
              </span>
            </div>

            {connectedCount > 0 && (
              <button
                onClick={handleResetAllWires}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-xl transition-all"
              >
                <Unlink size={13} />
                Tháo Toàn Bộ Dây
              </button>
            )}
          </div>

          {/* Dual Columns Workbench */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* Column A: Cực Nguồn Điện (Terminals) */}
            <div className="space-y-3">
              <div className="text-xs font-black uppercase tracking-widest text-amber-400/90 px-2 flex items-center gap-1.5">
                <Zap size={13} className="fill-amber-400" />
                Cực Nguồn Điện (Cột A)
              </div>

              {leftTerminals.map((term) => {
                const isSelected = selectedLeftId === term.id;
                const connectedRight = connections[term.id];

                return (
                  <button
                    key={term.id}
                    onClick={() => handleSelectLeft(term.id)}
                    className={`w-full text-left p-4 rounded-[20px] border-2 transition-all relative overflow-hidden flex items-center justify-between gap-3 group active:scale-[0.98] ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/50"
                        : connectedRight
                        ? "bg-slate-900/90 border-slate-700 hover:border-slate-500"
                        : "bg-slate-900/60 border-slate-800 hover:border-amber-400/50"
                    }`}
                  >
                    {/* Wire color bar indicator */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 transition-all"
                      style={{
                        backgroundColor: connectedRight ? term.color : "#475569",
                        boxShadow: connectedRight ? `0 0 10px ${term.color}` : "none",
                      }}
                    />

                    <div className="flex items-center gap-3 pl-2 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs border shrink-0 transition-all"
                        style={{
                          backgroundColor: connectedRight ? term.color : "#334155",
                          borderColor: connectedRight ? term.color : "#475569",
                          boxShadow: connectedRight ? `0 0 12px ${term.color}80` : "none",
                        }}
                      >
                        A{term.index}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white leading-snug">
                          {term.content}
                        </div>
                        {connectedRight ? (
                          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: term.color }} />
                            Đã nối: <span className="text-white font-semibold truncate">{connectedRight}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                            Chưa cắm dây dẫn
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {connectedRight ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisconnect(term.id);
                          }}
                          className="w-7 h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 flex items-center justify-center transition-all"
                          title="Tháo dây này"
                        >
                          <X size={14} />
                        </button>
                      ) : (
                        <div
                          className={`w-4 h-4 rounded-full border-2 transition-all ${
                            isSelected
                              ? "bg-amber-400 border-white shadow-[0_0_8px_#f59e0b] animate-ping"
                              : "border-slate-600 bg-slate-800"
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Column B: Thiết Bị / Bóng Đèn (Loads) */}
            <div className="space-y-3">
              <div className="text-xs font-black uppercase tracking-widest text-yellow-400/90 px-2 flex items-center gap-1.5">
                <Lightbulb size={13} className="text-yellow-400" />
                Thiết Bị / Bóng Đèn (Cột B)
              </div>

              {shuffledRightItems.map((item, idx) => {
                const isSelected = selectedRightText === item.text;
                const wireColor = getWireColorForRight(item.text);
                const connectedLeftIdx = getConnectedLeftIndex(item.text);
                const isPaired = !!wireColor;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectRight(item.text)}
                    className={`w-full text-left p-4 rounded-[20px] border-2 transition-all relative overflow-hidden flex items-center justify-between gap-3 group active:scale-[0.98] ${
                      isSelected
                        ? "bg-yellow-500/20 border-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.5)] ring-2 ring-yellow-400/50"
                        : isPaired
                        ? "bg-slate-900/90 border-slate-700 hover:border-slate-500"
                        : "bg-slate-900/60 border-slate-800 hover:border-yellow-400/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-all ${
                          isPaired
                            ? "bg-yellow-400 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.8)]"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                        }`}
                      >
                        💡
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white leading-snug">
                          {item.text}
                        </div>
                        {isPaired ? (
                          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: wireColor }} />
                            Nhận nguồn từ:{" "}
                            <span className="text-amber-300 font-mono font-bold">
                              Cực A{connectedLeftIdx}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                            Bóng đèn chưa có điện
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isPaired ? (
                        <span
                          className="text-[10px] font-black px-2.5 py-1 rounded-lg border font-mono text-white"
                          style={{
                            backgroundColor: `${wireColor}30`,
                            borderColor: wireColor,
                            color: wireColor,
                          }}
                        >
                          Dây A{connectedLeftIdx}
                        </span>
                      ) : (
                        <div
                          className={`w-4 h-4 rounded-full border-2 transition-all ${
                            isSelected
                              ? "bg-yellow-400 border-white shadow-[0_0_8px_#eab308] animate-ping"
                              : "border-slate-600 bg-slate-800"
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button: Đóng cầu dao nộp bài */}
          <div className="pt-4 border-t border-slate-800/80">
            <button
              onClick={handleSubmit}
              disabled={connectedCount === 0 || isTimeUp}
              className="w-full py-5 rounded-[24px] bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-lg md:text-xl shadow-[0_8px_0_0_#b45309] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <Zap size={24} className="fill-slate-950 animate-bounce" />
              <span>
                ĐÓNG CẦU DAO KÍCH HOẠT ĐIỆN ÁP ({connectedCount}/{totalWires} Nhánh)
              </span>
            </button>
            <p className="text-center text-xs font-semibold text-slate-500 mt-2">
              Hệ thống áp dụng tính điểm từng phần (Partial Credit) cho mỗi dây nối chuẩn xác
            </p>
          </div>
        </div>
      )}

      {/* ── ANSWER RESULT VISUALIZATION (TRỰC QUAN HÓA KẾT QUẢ NỐI MẠCH) ─────── */}
      {(hasAnswered || answerResult) && answerResult && (
        <div className="bg-slate-950/95 backdrop-blur-2xl border-4 border-amber-500/50 rounded-[32px] p-6 md:p-8 shadow-[0_20px_50px_rgba(245,158,11,0.25)] text-white animate-fade-in-up space-y-6">
          {/* Result Badge */}
          <div className="text-center">
            {answerResult.isTournamentLocked ? (
              <div>
                <div className="w-20 h-20 bg-purple-500/20 border-2 border-purple-400 text-purple-300 rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                  <Lock size={40} />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-purple-300">
                  Đã Lưu Mạch Điện Vào Két Sắt Giải Đấu An Toàn!
                </h3>
                <p className="text-sm font-semibold text-slate-400 mt-2 max-w-lg mx-auto">
                  Điểm số và sơ đồ điện chuẩn được bảo mật tuyệt đối cho đến khi ban tổ chức kết thúc giải đấu.
                </p>
              </div>
            ) : answerResult.isFullCircuit || answerResult.isCorrect ? (
              <div>
                <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-bounce">
                  <CheckCircle2 size={44} />
                </div>
                <h3 className="text-2xl md:text-4xl font-black text-emerald-300 tracking-tight">
                  ⚡ MẠCH ĐIỆN HOÀN TOÀN THÔNG SUỐT!
                </h3>
                <p className="text-sm font-bold text-slate-300 mt-1">
                  Toàn bộ bóng đèn đã phát sáng rực rỡ • Đạt trọn vẹn điểm thưởng
                </p>
              </div>
            ) : (answerResult.connectedCorrectWires || 0) > 0 ? (
              <div>
                <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-400 text-amber-300 rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                  <Zap size={44} className="fill-amber-400" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-amber-300 tracking-tight">
                  KÍCH HOẠT {answerResult.connectedCorrectWires}/{answerResult.totalCircuitWires || totalWires} NHÁNH ĐIỆN
                </h3>
                <p className="text-sm font-bold text-slate-300 mt-1">
                  Nhận điểm từng phần (Partial Credit) tương ứng số bóng đèn sáng
                </p>
              </div>
            ) : (
              <div>
                <div className="w-20 h-20 bg-rose-500/20 border-2 border-rose-400 text-rose-300 rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(244,63,94,0.5)]">
                  <Flame size={44} />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-rose-400 tracking-tight">
                  ⚡ CHẬP ĐIỆN! CẦU CHÌ NGẮT BẢO VỆ
                </h3>
                <p className="text-sm font-bold text-slate-300 mt-1">
                  Các dây nối chưa khớp với thiết bị tiêu thụ chuẩn
                </p>
              </div>
            )}
          </div>

          {/* Score & Breakdown Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Điểm Nhận Được
              </div>
              <div className="text-2xl md:text-3xl font-black text-amber-400 font-mono mt-0.5">
                +{answerResult.scoreAwarded || 0}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Tốc Độ Nối Mạch
              </div>
              <div className="text-2xl md:text-3xl font-black text-cyan-400 font-mono mt-0.5">
                {answerResult.speedMultiplier ? `x${answerResult.speedMultiplier}` : "x1.0"}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Chuỗi Thắng (Streak)
              </div>
              <div className="text-2xl md:text-3xl font-black text-emerald-400 font-mono mt-0.5">
                {answerResult.streak ? `🔥 ${answerResult.streak}` : "0"}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-center">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Xếp Hạng
              </div>
              <div className="text-2xl md:text-3xl font-black text-white font-mono mt-0.5 flex items-center justify-center gap-1">
                #{answerResult.rank || currentRank}
                {answerResult.rankChange && answerResult.rankChange > 0 ? (
                  <span className="text-xs text-emerald-400 font-bold">
                    ↑{answerResult.rankChange}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Chi tiết từng dây dẫn & Minh họa phát sáng / chập điện */}
          {answerResult.circuitWireResults && answerResult.circuitWireResults.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                CHI TIẾT KIỂM THỬ TỪNG NHÁNH DÂY DẪN (CIRCUIT WIRING RESULTS)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {answerResult.circuitWireResults.map((wire) => (
                  <div
                    key={`res-${wire.wireIndex}`}
                    className={`border-2 rounded-[20px] p-4 flex flex-col justify-between gap-3 relative overflow-hidden ${
                      wire.isCorrect
                        ? "bg-slate-900/90 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                        : "bg-slate-950/90 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                    }`}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2"
                      style={{
                        backgroundColor: wire.isCorrect ? "#10b981" : "#f43f5e",
                        boxShadow: wire.isCorrect ? "0 0 10px #10b981" : "0 0 10px #f43f5e",
                      }}
                    />

                    <div className="flex items-center justify-between pl-2">
                      <span className="text-xs font-black font-mono text-slate-400">
                        NHÁNH A{wire.wireIndex}
                      </span>
                      {wire.isCorrect ? (
                        <span className="text-xs font-black text-emerald-300 flex items-center gap-1 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/40">
                          <CheckCircle2 size={12} />
                          💡 Sáng Rực Rỡ
                        </span>
                      ) : (
                        <span className="text-xs font-black text-rose-300 flex items-center gap-1 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-400/40">
                          <XCircle size={12} />
                          ⚡ Chập Điện
                        </span>
                      )}
                    </div>

                    <div className="pl-2 space-y-1">
                      <div className="text-xs font-bold text-amber-400">
                        Cực nguồn: <span className="text-white font-black">{wire.leftContent}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-300">
                        Bạn đã nối với:{" "}
                        <span className={wire.isCorrect ? "text-emerald-400 font-black" : "text-rose-400 line-through"}>
                          {wire.userRightContent || "(Chưa nối)"}
                        </span>
                      </div>
                      {!wire.isCorrect && (
                        <div className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl mt-1 flex items-center gap-1.5">
                          <ArrowRight size={13} className="shrink-0" />
                          <span>Đúng chuẩn: <span className="font-black text-white">{wire.expectedRightContent}</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
