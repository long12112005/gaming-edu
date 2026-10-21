"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Lock,
  Save,
  RefreshCw,
  Send,
  KeyRound,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";

interface WordHunterPlayerViewProps {
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
    isDecoded?: boolean;
    revealedWord?: string;
  } | null;
  roomMode?: string;
  roomPlayerId?: string;
  totalScore?: number;
  currentRank?: number;
  onSubmitWord: (answer: string) => void;
}

export default function WordHunterPlayerView({
  currentSlide,
  slideTimeLeft,
  hasAnswered,
  answerResult,
  roomMode = "HOST_PACED",
  roomPlayerId,
  totalScore = 0,
  currentRank = 1,
  onSubmitWord,
}: WordHunterPlayerViewProps) {
  const [guessInput, setGuessInput] = useState("");
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const guessRef = useRef(guessInput);
  guessRef.current = guessInput;

  // Tính số lượng ô chữ cần hiển thị (chỉ lấy độ dài, không lộ ký tự)
  const targetLength = useMemo(() => {
    const opt = currentSlide?.options?.[0];
    if (opt?.blankLength && opt.blankLength > 0) {
      return opt.blankLength;
    }
    return 8; // fallback độ dài gợi ý
  }, [currentSlide]);

  const wordLengths = useMemo(() => {
    return currentSlide?.options?.[0]?.wordLengths || null;
  }, [currentSlide]);

  // Reset khi đổi slide & load nháp nếu ở phòng ASYNC_TOURNAMENT
  useEffect(() => {
    setGuessInput("");
    setLastAutoSaveTime(null);

    if (roomMode === "ASYNC_TOURNAMENT" && roomPlayerId && currentSlide?.slideId) {
      api
        .get(`/answers/draft?roomPlayerId=${roomPlayerId}&slideId=${currentSlide.slideId}`)
        .then((res) => {
          if (res.data?.data) {
            try {
              const draft = JSON.parse(res.data.data);
              if (typeof draft === "string") setGuessInput(draft);
              else if (Array.isArray(draft) && draft[0]) setGuessInput(draft[0]);
              setLastAutoSaveTime("Đã phục hồi từ bộ nhớ nháp");
            } catch {
              setGuessInput(res.data.data);
            }
          }
        })
        .catch(() => {});
    }
  }, [currentSlide?.slideId, roomMode, roomPlayerId]);

  // Tự động lưu nháp mỗi 30 giây ở ASYNC_TOURNAMENT
  useEffect(() => {
    if (roomMode !== "ASYNC_TOURNAMENT" || !roomPlayerId || !currentSlide?.slideId || hasAnswered) {
      return;
    }

    const intervalId = setInterval(async () => {
      const currentVal = guessRef.current.trim();
      if (!currentVal) return;

      try {
        setIsAutoSaving(true);
        await api.put("/answers/draft", {
          roomPlayerId,
          slideId: currentSlide.slideId,
          answerData: JSON.stringify([currentVal]),
        });
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];
        setLastAutoSaveTime(`Đã lưu nháp lúc ${timeStr}`);
      } catch (err) {
        console.error("Auto-save draft error:", err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [roomMode, roomPlayerId, currentSlide?.slideId, hasAnswered]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0)) {
      return;
    }
    onSubmitWord(guessInput.trim());
  };

  const isTimeCritical = slideTimeLeft !== null && slideTimeLeft <= 5;

  // Chuyển chuỗi nhập thành mảng ký tự để render vào ô
  const inputChars = useMemo(() => {
    return guessInput.toUpperCase().split("");
  }, [guessInput]);

  // ── MÀN HÌNH SAU KHI NỘP BÀI HOẶC HẾT GIỜ ──
  if (hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0 && answerResult)) {
    // 1. Chế độ ASYNC_TOURNAMENT bị khóa điểm
    if (answerResult?.isTournamentLocked) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900/95 border-2 border-teal-500/50 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="w-20 h-20 bg-teal-500/20 border-2 border-teal-500/50 text-teal-400 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_25px_rgba(20,184,166,0.3)]">
              <Lock size={40} />
            </div>

            <div className="inline-block px-4 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 font-mono text-xs font-bold mb-3">
              GIẢI ĐẤU ASYNC: BẢO MẬT TUYỆT ĐỐI
            </div>

            <h3 className="text-2xl font-black font-sans text-white mb-2">
              Từ Khóa Đã Được Niêm Phong!
            </h3>
            <p className="text-sm font-sans text-slate-300 leading-relaxed mb-6">
              Hệ thống đã mã hóa và lưu bài nộp vào Redis Cache. Kết quả ô chữ chuẩn và điểm số chi tiết sẽ được công bố khi giải đấu khép lại!
            </p>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left font-mono text-xs text-slate-400 space-y-1">
              <div className="text-slate-300 font-bold">Từ khóa bạn đã giải mã:</div>
              <div className="text-lg font-black text-amber-300 uppercase tracking-widest mt-1">
                "{guessInput.trim() || "(bỏ trống)"}"
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 2. Chế độ Thường hoặc Tự Động: Công bố kết quả
    const isCorrect = answerResult?.isCorrect ?? false;
    const revealedAnswer = answerResult?.correctAnswer || answerResult?.revealedWord || "";

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div
          className={`max-w-lg w-full rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-2xl border-4 text-center relative overflow-hidden transition-all ${
            isCorrect
              ? "bg-gradient-to-b from-slate-900/95 via-emerald-950/60 to-slate-950/95 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.35)]"
              : "bg-gradient-to-b from-slate-900/95 via-rose-950/60 to-slate-950/95 border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.3)]"
          }`}
        >
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-xs font-black uppercase mb-4 tracking-wider border shadow-sm">
            {isCorrect ? (
              <span className="text-emerald-400 bg-emerald-500/20 border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles size={16} /> GIẢI MÃ THÀNH CÔNG (WORD DECODED)
              </span>
            ) : (
              <span className="text-rose-400 bg-rose-500/20 border-rose-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <XCircle size={16} /> CHƯA CHÍNH XÁC (MISSED)
              </span>
            )}
          </div>

          {/* Big Centerpiece Icon */}
          <div
            className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-4 border-2 shadow-2xl ${
              isCorrect
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                : "bg-rose-500/20 border-rose-400 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.5)]"
            }`}
          >
            {isCorrect ? <Sparkles size={44} /> : <Search size={44} />}
          </div>

          <h3 className="text-2xl md:text-3xl font-black font-sans text-white mb-2">
            {isCorrect ? "XUẤT SẮC! BẠN ĐÃ TÌM RA Ô CHỮ" : "RẤT TIẾC, CHƯA ĐÚNG TỪ KHÓA!"}
          </h3>

          <p className="text-sm font-sans text-slate-300 mb-6">
            {isCorrect
              ? "Trực giác ngôn ngữ của bạn thật đáng nể! Bạn đã nhận trọn vẹn điểm thưởng kèm hệ số tốc độ."
              : "Đừng nản lòng! Hãy giữ vững phong độ cho những ô chữ bí ẩn tiếp theo."}
          </p>

          {/* Solution Tiles Reveal */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center gap-2">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Đáp Án Chuẩn Của Ô Chữ:
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              {revealedAnswer.split("").map((ch, idx) => (
                <div
                  key={idx}
                  className="w-10 h-12 md:w-12 md:h-14 rounded-xl bg-gradient-to-b from-teal-500 to-emerald-700 border-2 border-emerald-300 text-white font-mono text-xl md:text-2xl font-black flex items-center justify-center shadow-lg uppercase"
                >
                  {ch}
                </div>
              ))}
            </div>
            <div className="text-xs font-mono text-slate-400 mt-2">
              Từ khóa bạn đã đoán: <span className="text-amber-300 font-bold uppercase">"{guessInput}"</span>
            </div>
          </div>

          {/* Score & Multiplier Breakdown */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6 font-mono">
            <div className="text-left">
              <div className="text-xs text-slate-400">Điểm Nhận Được:</div>
              <div className="text-2xl font-black text-amber-400">
                +{(answerResult?.scoreAwarded || 0).toLocaleString()} pts
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Hệ Số Tốc Độ:</div>
              <div className="text-xl font-black text-teal-400 flex items-center justify-end gap-1">
                <Zap size={16} /> x{answerResult?.speedMultiplier || 1.0}
              </div>
            </div>
          </div>

          {/* Rank Change Indicator */}
          {(answerResult?.rankChange || 0) > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-mono text-sm font-black animate-pulse">
              <TrendingUp size={16} /> Leo Hạng: +{answerResult?.rankChange} Bậc (Hạng #{answerResult?.rank})
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MÀN HÌNH ĐANG GIẢI MÃ Ô CHỮ ──
  return (
    <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full p-4 animate-fade-in-up">
      {/* ── TOP HUD ── */}
      <div className="bg-slate-900/90 border-2 border-teal-500/40 rounded-3xl p-5 backdrop-blur-xl shadow-2xl relative overflow-hidden mb-5">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-400" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Search size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-mono text-teal-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                GIẢI MÃ Ô CHỮ #{currentSlide?.index !== undefined ? currentSlide.index + 1 : 1}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {targetLength} Chữ Cái • Điền Khuyết Không Lo Sai Dấu
              </div>
            </div>
          </div>

          {/* Countdown Clock */}
          <div
            className={`font-mono text-2xl md:text-3xl font-black px-4 py-1 rounded-xl border-2 tracking-widest flex items-center gap-2 ${
              isTimeCritical
                ? "bg-red-500/20 text-red-400 border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                : "bg-teal-500/10 text-teal-400 border-teal-500/40"
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

        {/* Question Text Prompt */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-base md:text-lg font-bold font-sans text-slate-100 leading-relaxed text-center">
            {currentSlide?.questionText}
          </p>
        </div>

        {/* Async Auto-save Info */}
        {roomMode === "ASYNC_TOURNAMENT" && (
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <Save size={12} /> {lastAutoSaveTime || "Tự động lưu nháp mỗi 30s"}
            </span>
            {isAutoSaving && <RefreshCw size={12} className="animate-spin text-amber-400" />}
          </div>
        )}
      </div>

      {/* ── INTERACTIVE LETTER TILE GRID ── */}
      <div className="flex-1 flex flex-col items-center justify-center my-4">
        <div className="text-xs font-mono font-bold text-teal-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <KeyRound size={14} /> Ô Chữ Bí Ẩn ({targetLength} Ký Tự)
        </div>

        {/* Dynamic Boxes Grid */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md p-4 rounded-3xl bg-slate-950/80 border-2 border-teal-500/30 shadow-inner">
          {Array.from({ length: targetLength }).map((_, idx) => {
            const letter = inputChars[idx] || "";
            const isFilled = letter.length > 0;
            const isCurrentFocus = idx === inputChars.length;

            return (
              <div
                key={idx}
                className={`w-11 h-13 md:w-13 md:h-16 rounded-2xl border-2 flex items-center justify-center font-mono text-xl md:text-2xl font-black transition-all transform ${
                  isFilled
                    ? "bg-gradient-to-b from-teal-500 to-teal-700 border-teal-300 text-white shadow-[0_4px_12px_rgba(20,184,166,0.4)] scale-105"
                    : isCurrentFocus
                    ? "bg-slate-900 border-teal-400 text-teal-400 animate-pulse ring-2 ring-teal-500/40"
                    : "bg-slate-900/60 border-slate-700 text-slate-600"
                }`}
              >
                {letter || "?"}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FAST TYPING FORM & SUBMIT ── */}
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <input
            type="text"
            required
            autoFocus
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            placeholder="Gõ từ khóa vào đây (tự động điền vào ô chữ)..."
            className="w-full px-5 py-4 bg-slate-900/90 border-2 border-teal-500/50 rounded-2xl font-mono text-lg text-white placeholder-slate-500 outline-none focus:ring-4 focus:ring-teal-500/30 transition-all text-center tracking-widest uppercase shadow-inner"
          />
        </div>

        <button
          type="submit"
          disabled={!guessInput.trim()}
          className="w-full py-4 px-6 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 hover:from-teal-400 hover:via-emerald-400 hover:to-green-400 text-slate-950 font-black font-mono text-lg rounded-2xl shadow-[0_6px_0_0_#0f766e] active:translate-y-1 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-wider"
        >
          <Send size={22} className="stroke-[2.5px]" />
          <span>GIẢI MÃ TỪ KHÓA (CONFIRM GUESS)</span>
        </button>

        <p className="text-center text-xs font-mono text-slate-400">
          Thuật toán Fuzzy Matching 4 bước: không phạt lỗi viết hoa/thường hay thiếu dấu
        </p>
      </form>
    </div>
  );
}
