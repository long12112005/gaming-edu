"use client";

import React, { useState, useEffect, useRef } from "react";
import { Clock, Send, CheckCircle2, Sparkles, Flame, HelpCircle, Link2, Check, ArrowRight, Zap, Crosshair, ShieldAlert } from "lucide-react";

export interface QuestionSlideOption {
  id: string;
  content: string;
  orderIndex: number;
  matchingPair?: string;
  blankKeywords?: string;
}

export interface QuestionSlide {
  id: string;
  type: string; // QUIZ | FILL_IN_BLANK | MATCHING
  questionText: string;
  timeLimit: number;
  points: number;
  orderIndex: number;
  options: QuestionSlideOption[];
}

interface NavalQuestionHUDProps {
  currentSlide: QuestionSlide | null;
  hasAnswered: boolean;
  onSubmit: (slideId: string, answerData: string, timeMs: number) => void;
  shotsEarned: number;
  currentCombo: number;
  onNextQuestion?: () => void;
  currentQuestionIndex?: number;
  totalQuestions?: number;
  isDoubleShot?: boolean;
  isMyTeamTurn?: boolean;
  currentTurnTeam?: "TEAM_A" | "TEAM_B" | null;
  myTeamSide?: "TEAM_A" | "TEAM_B" | "HOST" | null;
  turnNumber?: number;
  onTimeout?: () => void;
}

const OPTION_COLORS = [
  { label: "A", color: "bg-red-500 hover:bg-red-600 border-red-700 text-white" },
  { label: "B", color: "bg-blue-500 hover:bg-blue-600 border-blue-700 text-white" },
  { label: "C", color: "bg-amber-500 hover:bg-amber-600 border-amber-700 text-white" },
  { label: "D", color: "bg-emerald-500 hover:bg-emerald-600 border-emerald-700 text-white" },
];

export const NavalQuestionHUD: React.FC<NavalQuestionHUDProps> = ({
  currentSlide,
  hasAnswered,
  onSubmit,
  shotsEarned,
  currentCombo,
  onNextQuestion,
  currentQuestionIndex = 0,
  totalQuestions = 1,
  isDoubleShot = false,
  isMyTeamTurn = true,
  currentTurnTeam = "TEAM_A",
  turnNumber = 1,
  onTimeout,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [startTime, setStartTime] = useState<number>(Date.now());
  const timeoutReportedRef = useRef<boolean>(false);

  // Trạng thái cho dạng MATCHING (Ghép cặp tự động)
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [userMatches, setUserMatches] = useState<Record<string, string>>({}); // leftId -> rightText

  const timeLimit = currentSlide?.timeLimit && currentSlide.timeLimit > 0 ? currentSlide.timeLimit : 30;
  const isTimeUp = isMyTeamTurn && timeLeft <= 0;

  // Báo cáo hết giờ để chuyển lượt bắn sang đội đối phương
  useEffect(() => {
    if (isMyTeamTurn && isTimeUp && !hasAnswered && !timeoutReportedRef.current) {
      timeoutReportedRef.current = true;
      onTimeout?.();
    }
  }, [isMyTeamTurn, isTimeUp, hasAnswered, onTimeout]);

  // Reset timer và state khi sang slide mới hoặc khi chuyển sang lượt của đội mình
  useEffect(() => {
    if (currentSlide && isMyTeamTurn) {
      setTimeLeft(currentSlide.timeLimit && currentSlide.timeLimit > 0 ? currentSlide.timeLimit : 30);
      setSelectedOptionId(null);
      setTextAnswer("");
      setSelectedLeftId(null);
      setUserMatches({});
      setStartTime(Date.now());
      timeoutReportedRef.current = false;
    }
  }, [currentSlide, isMyTeamTurn, turnNumber]);

  // Đếm ngược thời gian (chỉ đếm ngược khi ĐANG LÀ LƯỢT CỦA ĐỘI MÌNH)
  useEffect(() => {
    if (!currentSlide || !isMyTeamTurn || hasAnswered || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentSlide, isMyTeamTurn, hasAnswered, timeLeft]);

  // Xử lý chọn đáp án trắc nghiệm QUIZ
  const handleSelectQuizOption = (optId: string) => {
    if (hasAnswered || timeLeft <= 0 || !currentSlide) return;
    setSelectedOptionId(optId);
    const elapsedMs = Date.now() - startTime;
    onSubmit(currentSlide.id, optId, elapsedMs);
  };

  // Xử lý nộp câu hỏi điền khuyết FILL_IN_BLANK
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasAnswered || timeLeft <= 0 || !currentSlide || !textAnswer.trim()) return;
    const elapsedMs = Date.now() - startTime;
    // Gửi dạng mảng 1 phần tử cho backend FuzzyMatchingService
    const payload = JSON.stringify([textAnswer.trim()]);
    onSubmit(currentSlide.id, payload, elapsedMs);
  };

  // Xử lý ghép cặp MATCHING
  const handleSelectMatchingLeft = (optId: string) => {
    if (hasAnswered || timeLeft <= 0) return;
    setSelectedLeftId(optId);
  };

  const handleSelectMatchingRight = (rightContent: string) => {
    if (hasAnswered || timeLeft <= 0 || !selectedLeftId) return;

    setUserMatches((prev) => ({
      ...prev,
      [selectedLeftId]: rightContent,
    }));
    setSelectedLeftId(null);
  };

  const handleSubmitMatching = () => {
    if (hasAnswered || timeLeft <= 0 || !currentSlide) return;
    const elapsedMs = Date.now() - startTime;
    const pairsPayload = Object.entries(userMatches).map(([leftId, rightContent]) => ({
      leftId,
      rightContent,
    }));
    onSubmit(currentSlide.id, JSON.stringify(pairsPayload), elapsedMs);
  };

  const timerPercent = (timeLeft / timeLimit) * 100;
  const timerColor =
    timerPercent > 50
      ? "from-emerald-500 to-cyan-500"
      : timerPercent > 25
      ? "from-amber-500 to-orange-500"
      : "from-red-500 to-rose-600 animate-pulse";

  if (!isMyTeamTurn) {
    const enemyTeamName = currentTurnTeam === "TEAM_A" ? "HẠM ĐỘI LAM (PHE A)" : "HẠM ĐỘI XÍCH (PHE B)";
    const isEnemyBlue = currentTurnTeam === "TEAM_A";

    return (
      <div className="w-full bg-slate-900/90 border-2 border-slate-700/80 rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[250px] backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div
          className={`absolute inset-0 opacity-10 pointer-events-none ${
            isEnemyBlue
              ? "bg-gradient-to-br from-cyan-500 via-transparent to-blue-600"
              : "bg-gradient-to-br from-rose-500 via-transparent to-red-600"
          }`}
        />
        <div className="relative z-10 flex flex-col items-center max-w-md">
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-800 text-amber-300 border border-amber-500/30 mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
            <span>Lượt Bắn #{turnNumber} — Chờ Lượt Đội Bạn</span>
          </span>

          <ShieldAlert
            className={`w-12 h-12 mb-3 animate-pulse ${
              isEnemyBlue ? "text-cyan-400" : "text-rose-400"
            }`}
          />

          <h3 className="text-base sm:text-lg font-extrabold text-white uppercase tracking-wide">
            Đang Là Lượt Của{" "}
            <span className={isEnemyBlue ? "text-cyan-400" : "text-rose-400"}>
              {enemyTeamName}
            </span>
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Trong chế độ <strong>Hải Tặc Tri Thức</strong>, hai hạm đội trả lời và khai hỏa theo lượt.{" "}
            <span className="text-amber-300 font-semibold">
              Câu hỏi sẽ xuất hiện ngay khi đến lượt bắn của đội bạn!
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (!currentSlide) {
    return (
      <div className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 text-center text-slate-400 flex flex-col items-center justify-center min-h-[220px] backdrop-blur-md">
        <HelpCircle className="w-10 h-10 text-cyan-400 animate-bounce mb-2" />
        <p className="text-base font-semibold text-white">Đang chuẩn bị câu hỏi tiếp theo...</p>
        <p className="text-xs text-slate-400 mt-1">Hãy quan sát bản đồ và nạp sẵn đại bác để khai hỏa!</p>
      </div>
    );
  }

  // Danh sách các vế phải cho MATCHING
  const matchingRightPool = currentSlide.options
    .map((o) => o.matchingPair)
    .filter((mp): mp is string => Boolean(mp && mp.trim()));

  return (
    <div className="w-full bg-slate-900/90 border-2 border-emerald-500/50 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
      {/* Thanh đếm ngược thời gian */}
      <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden mb-4 border border-slate-800">
        <div
          className={`h-full bg-gradient-to-r ${timerColor} transition-all duration-1000 ease-linear rounded-full`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Thông tin câu hỏi */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
            🎯 LƯỢT ĐỘI BẠN (#{turnNumber})
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Câu {currentQuestionIndex + 1}/{totalQuestions}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
            {currentSlide.type === "QUIZ"
              ? "Trắc Nghiệm"
              : currentSlide.type === "MATCHING"
              ? "Ghép Cặp"
              : "Điền Khuyết"}
          </span>
          {currentCombo >= 2 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-bold animate-flame-flicker">
              <Flame className="w-3.5 h-3.5" /> Chuỗi {currentCombo}x
            </div>
          )}
          {isDoubleShot && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-black animate-pulse">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>X2 BẮN PHÁO</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Nội dung câu hỏi */}
      <div className="my-2">
        <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
          {currentSlide.questionText}
        </h3>
      </div>

      {/* Khu vực tương tác trả lời theo từng dạng tự động chấm */}
      <div className="mt-4">
        {/* 1. DẠNG TRẮC NGHIỆM (QUIZ) */}
        {currentSlide.type === "QUIZ" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentSlide.options.map((opt, idx) => {
              const style = OPTION_COLORS[idx % OPTION_COLORS.length];
              const isSelected = selectedOptionId === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectQuizOption(opt.id)}
                  disabled={hasAnswered || timeLeft <= 0}
                  className={`w-full p-3 rounded-xl border-b-4 font-semibold text-sm flex items-center gap-3 transition-all duration-150 active:translate-y-1 text-left ${style.color} ${
                    isSelected ? "ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900" : ""
                  } ${hasAnswered && !isSelected ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="w-6 h-6 rounded-lg bg-black/25 flex items-center justify-center font-bold text-xs shrink-0">
                    {style.label}
                  </span>
                  <span className="truncate">{opt.content}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 2. DẠNG ĐIỀN KHUYẾT (FILL_IN_BLANK) */}
        {(currentSlide.type === "FILL_IN_BLANK" || currentSlide.type === "FILL_IN_THE_BLANK") && (
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={hasAnswered || timeLeft <= 0}
              placeholder="Nhập từ khóa chính xác để nạp đạn đại bác..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={hasAnswered || timeLeft <= 0 || !textAnswer.trim()}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
            >
              <Send className="w-4 h-4" /> Nạp Đạn
            </button>
          </form>
        )}

        {/* 3. DẠNG GHÉP CẶP (MATCHING) */}
        {currentSlide.type === "MATCHING" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Cột Vế Trái */}
              <div className="space-y-2">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Cột Vấn Đề</span>
                {currentSlide.options.map((opt) => {
                  const isSelected = selectedLeftId === opt.id;
                  const matchedRight = userMatches[opt.id];

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectMatchingLeft(opt.id)}
                      disabled={hasAnswered || timeLeft <= 0}
                      className={`w-full p-2.5 rounded-xl border text-left font-medium transition-all ${
                        isSelected
                          ? "bg-cyan-900/60 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                          : matchedRight
                          ? "bg-emerald-950/60 border-emerald-500/70 text-emerald-300"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{opt.content}</span>
                        {matchedRight && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      {matchedRight && (
                        <span className="text-[10px] text-emerald-400 font-mono block mt-1 truncate">
                          ↳ {matchedRight}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Cột Vế Phải */}
              <div className="space-y-2">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Cột Ghép Nối</span>
                {matchingRightPool.map((rightText, idx) => {
                  const isChosen = Object.values(userMatches).includes(rightText);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectMatchingRight(rightText)}
                      disabled={hasAnswered || timeLeft <= 0 || !selectedLeftId}
                      className={`w-full p-2.5 rounded-xl border text-left font-medium transition-all ${
                        selectedLeftId && !isChosen
                          ? "bg-indigo-950/70 border-indigo-500/80 text-white hover:scale-102 cursor-pointer shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                          : isChosen
                          ? "bg-slate-900/70 border-slate-800 text-slate-500"
                          : "bg-slate-950 border-slate-800 text-slate-400 opacity-60"
                      }`}
                    >
                      <span className="truncate block">{rightText}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nút gửi kết quả ghép cặp */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSubmitMatching}
                disabled={hasAnswered || timeLeft <= 0 || Object.keys(userMatches).length === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
              >
                <Link2 className="w-4 h-4" /> Xác Nhận Ghép Cặp
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Phản hồi trạng thái nộp câu trả lời hoặc hết thời gian */}
      {(hasAnswered || isTimeUp) && (
        <div
          className={`mt-3 p-3 rounded-xl bg-slate-800/90 border flex flex-wrap items-center justify-between gap-2 text-xs ${
            !hasAnswered && isTimeUp
              ? "border-rose-500/40 text-rose-300"
              : shotsEarned > 0
              ? "border-amber-400/60 text-amber-200 bg-amber-950/30"
              : "border-cyan-500/30 text-cyan-300"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {!hasAnswered && isTimeUp ? (
              <>
                <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Đã hết thời gian! (0 điểm — Đang chuyển lượt bắn sang đối phương...)</span>
              </>
            ) : shotsEarned > 0 ? (
              <>
                <Crosshair className="w-4 h-4 text-amber-400 animate-spin shrink-0" style={{ animationDuration: "4s" }} />
                <span className="font-bold">
                  Chính xác! Hãy nhấp vào ô trên bản đồ <strong>Hải Phận Đối Phương</strong> để bắn đại bác ({shotsEarned} lượt bắn còn lại)!
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Đã ghi nhận câu trả lời! Đang chuyển lượt sang đối phương...</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {shotsEarned > 0 && (
              <div className="font-extrabold text-amber-300 flex items-center gap-1 animate-pulse px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40">
                <Sparkles className="w-3.5 h-3.5" /> Còn {shotsEarned} phát bắn!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
