"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useGameHub } from "@/hooks/useGameHub";
import { useQAHub } from "@/hooks/useQAHub";
import {
  Trophy,
  Check,
  X,
  Clock,
  MessageCircle,
  ThumbsUp,
  Send,
  Loader2,
  HelpCircle,
  Link as LinkIcon,
  Cloud,
  Edit3,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import SpeedRacerPlayerCockpit from "@/components/games/speed-racer/SpeedRacerPlayerCockpit";
import BattleRoyalePlayerArena from "@/components/games/battle-royale/BattleRoyalePlayerArena";
import QuizWagerPlayerView from "@/components/games/quiz-wager/QuizWagerPlayerView";

type ActionButtonProps = {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "disabled";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
};

// ─── Nút Bấm 3D Toàn Cục ───────────────────────────────────────────────────
function ActionButton({
  icon: Icon,
  label,
  variant = "primary",
  onClick,
  disabled,
  className = "",
  type = "button",
}: ActionButtonProps) {
  const baseClasses = `relative flex items-center justify-center gap-2 font-900 rounded-[20px] border-4 transition-all duration-200 active:translate-y-2 px-6 py-4 text-lg ${className}`;
  const variants: Record<string, string> = {
    primary:
      "bg-teal-600 border-teal-800 text-white shadow-[0_6px_0_0_#115e59] hover:bg-teal-500 active:shadow-none",
    secondary:
      "bg-amber-400 border-amber-600 text-amber-950 shadow-[0_6px_0_0_#d97706] hover:bg-amber-300 active:shadow-none",
    disabled:
      "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed shadow-[0_6px_0_0_#9ca3af]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${disabled ? variants.disabled : variants[variant] || variants.primary}`}
    >
      {Icon && <Icon size={24} className={disabled ? "text-gray-400" : "text-white"} />}
      {label}
    </button>
  );
}

export default function PlayerGameRoom() {
  const params = useParams();
  const router = useRouter();
  const pinCode = params.pin as string;

  const {
    isConnected,
    gameState,
    error,
    roomInfo,
    currentSlide,
    slideTimeLeft,
    answerResult,
    leaderboard,
    joinRoom,
    rejoinRoom,
    placeWager,
    submitAnswer: hubSubmitAnswer,
  } = useGameHub();

  const {
    questions,
    askQuestion,
    upvoteQuestion,
  } = useQAHub(roomInfo?.roomId || null);

  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedQuizOptionId, setSelectedQuizOptionId] = useState<string | null>(null);
  const [showQA, setShowQA] = useState(false);
  const [qaText, setQaText] = useState("");

  const activeTheme = useMemo(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const t = urlParams.get("theme");
      if (t) return t.toUpperCase();
    }
    return (roomInfo?.theme || roomInfo?.Theme || "SPEED_RACER").toUpperCase();
  }, [roomInfo?.theme, roomInfo?.Theme]);

  const isSpeedRacer = activeTheme === "SPEED_RACER";
  const isBattleRoyale = activeTheme === "BATTLE_ROYALE";
  const isQuizWager = activeTheme === "QUIZ_WAGER";

  // States riêng cho từng dạng câu hỏi
  const [blankAnswer, setBlankAnswer] = useState("");
  const [wordCloudAnswer, setWordCloudAnswer] = useState("");

  // Matching states
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchingPairs, setMatchingPairs] = useState<Record<string, string>>({}); // { leftId: rightContent }

  // Tự động kết nối hoặc khôi phục phiên (Rejoin)
  useEffect(() => {
    if (isConnected) {
      const guestName = Cookies.get("guest_nickname");
      const userStr = Cookies.get("user");
      let nickname = "Anonymous";
      if (guestName) {
        nickname = guestName;
      } else if (userStr) {
        try {
          nickname = JSON.parse(userStr).nickname || "Anonymous";
        } catch {
          // ignore
        }
      }

      const savedPlayerKey = `player_session_${pinCode}`;
      const savedPlayerId = typeof window !== "undefined" ? localStorage.getItem(savedPlayerKey) : null;

      if (savedPlayerId && rejoinRoom) {
        rejoinRoom(pinCode, savedPlayerId, nickname);
      } else {
        joinRoom(pinCode, nickname);
      }
    }
  }, [isConnected, joinRoom, rejoinRoom, pinCode]);

  // Lưu playerId khi đã vào phòng để hỗ trợ Rejoin tự động khi rớt mạng
  useEffect(() => {
    if (roomInfo?.playerId && typeof window !== "undefined") {
      localStorage.setItem(`player_session_${pinCode}`, roomInfo.playerId);
    }
  }, [roomInfo?.playerId, pinCode]);

  // Reset answer states khi chuyển slide mới
  useEffect(() => {
    if (gameState === "PLAYING") {
      setHasAnswered(false);
      setSelectedQuizOptionId(null);
      setBlankAnswer("");
      setWordCloudAnswer("");
      setSelectedLeft(null);
      setSelectedRight(null);
      setMatchingPairs({});
    }
  }, [gameState, currentSlide?.slideId]);

  // Danh sách thẻ bên phải cho MATCHING
  const matchingRightOptions = useMemo(() => {
    if (currentSlide?.type !== "MATCHING" || !currentSlide.options) return [];
    // Lấy matchingPair từ options
    return currentSlide.options
      .map((opt) => opt.matchingPair || opt.content)
      .filter(Boolean);
  }, [currentSlide]);

  // Submit cho trắc nghiệm QUIZ / POLL
  const submitQuizChoice = (optionId: string) => {
    if (hasAnswered || !slideTimeLeft || slideTimeLeft === 0 || !currentSlide) return;
    setHasAnswered(true);
    setSelectedQuizOptionId(optionId);
    const elapsedMs = Math.max(0, (currentSlide.timeLimit - slideTimeLeft) * 1000);
    hubSubmitAnswer(currentSlide.slideId, {
      answerData: optionId,
      responseTimeMs: elapsedMs,
    });
  };

  // Submit cho FILL_IN_BLANK
  const submitBlankAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blankAnswer.trim() || hasAnswered || !slideTimeLeft || slideTimeLeft === 0 || !currentSlide)
      return;
    setHasAnswered(true);
    const elapsedMs = Math.max(0, (currentSlide.timeLimit - slideTimeLeft) * 1000);
    hubSubmitAnswer(currentSlide.slideId, {
      answerData: blankAnswer.trim(),
      responseTimeMs: elapsedMs,
    });
  };

  // Submit cho WORD_CLOUD
  const submitWordCloudAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !wordCloudAnswer.trim() ||
      hasAnswered ||
      !slideTimeLeft ||
      slideTimeLeft === 0 ||
      !currentSlide
    )
      return;
    setHasAnswered(true);
    const elapsedMs = Math.max(0, (currentSlide.timeLimit - slideTimeLeft) * 1000);
    hubSubmitAnswer(currentSlide.slideId, {
      answerData: wordCloudAnswer.trim(),
      responseTimeMs: elapsedMs,
    });
  };

  // Logic ghép cặp cho MATCHING
  const handleSelectMatching = (side: "left" | "right", value: string) => {
    if (hasAnswered || !slideTimeLeft || slideTimeLeft === 0) return;

    if (side === "left") {
      // Nếu đã ghép cặp rồi thì bấm vào để hủy ghép
      if (matchingPairs[value]) {
        setMatchingPairs((prev) => {
          const next = { ...prev };
          delete next[value];
          return next;
        });
        return;
      }

      if (selectedRight) {
        // Hoàn thành cặp ghép
        setMatchingPairs((prev) => ({ ...prev, [value]: selectedRight }));
        setSelectedLeft(null);
        setSelectedRight(null);
      } else {
        setSelectedLeft(selectedLeft === value ? null : value);
      }
    } else {
      // Bên phải
      // Kiểm tra xem value phải này đã được ghép với left nào chưa
      const pairedLeft = Object.keys(matchingPairs).find((k) => matchingPairs[k] === value);
      if (pairedLeft) {
        setMatchingPairs((prev) => {
          const next = { ...prev };
          delete next[pairedLeft];
          return next;
        });
        return;
      }

      if (selectedLeft) {
        setMatchingPairs((prev) => ({ ...prev, [selectedLeft]: value }));
        setSelectedLeft(null);
        setSelectedRight(null);
      } else {
        setSelectedRight(selectedRight === value ? null : value);
      }
    }
  };

  // Submit cho MATCHING
  const submitMatchingAnswer = () => {
    if (hasAnswered || !slideTimeLeft || slideTimeLeft === 0 || !currentSlide) return;
    setHasAnswered(true);
    const elapsedMs = Math.max(0, (currentSlide.timeLimit - slideTimeLeft) * 1000);

    // Format DTO: [{ leftId, rightContent }]
    const payloadPairs = Object.entries(matchingPairs).map(([leftId, rightContent]) => ({
      leftId,
      rightContent,
    }));

    hubSubmitAnswer(currentSlide.slideId, {
      answerData: JSON.stringify(payloadPairs),
      responseTimeMs: elapsedMs,
    });
  };

  const optionStyles = [
    "bg-red-500 border-red-700 shadow-[0_8px_0_0_#b91c1c]",
    "bg-blue-500 border-blue-700 shadow-[0_8px_0_0_#1d4ed8]",
    "bg-amber-400 border-amber-600 shadow-[0_8px_0_0_#b45309]",
    "bg-emerald-500 border-emerald-700 shadow-[0_8px_0_0_#047857]",
  ];

  // 1. Loading khi đang kết nối
  if (!isConnected && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans relative overflow-hidden">
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: "url('/bg-misty-white.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="fixed inset-0 z-0 bg-[#f0f9f6]/75 backdrop-blur-md" />
        <div className="relative z-10 flex flex-col items-center p-8 bg-white/85 backdrop-blur-xl rounded-[32px] border border-white/90 shadow-[0_16px_40px_rgba(8,38,42,0.12)]">
          <Loader2 size={54} className="text-teal-700 animate-spin mb-4" />
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Đang kết nối vào phòng...</h2>
          <p className="text-sm font-semibold text-teal-800/80 mt-1 mb-4">
            Đang đồng bộ tín hiệu với máy chủ Gaming Edu
          </p>
          <div className="px-6 py-2 bg-white/90 rounded-full border-2 border-teal-200 shadow-sm font-black text-teal-900 text-lg tracking-widest">
            PIN: {pinCode}
          </div>
        </div>
      </div>
    );
  }

  // 2. Lỗi kết nối
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: "url('/bg-misty-white.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="fixed inset-0 z-0 bg-[#f0f9f6]/75 backdrop-blur-md" />
        <div className="relative z-10 bg-white/85 backdrop-blur-xl p-10 rounded-[40px] border border-white/90 shadow-[0_16px_40px_rgba(8,38,42,0.15)] max-w-md w-full flex flex-col items-center">
          <div className="w-20 h-20 bg-rose-100 border-2 border-rose-200 rounded-[24px] flex items-center justify-center mb-6">
            <WifiOff size={40} className="text-rose-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Sự Cố Kết Nối</h1>
          <p className="text-sm font-bold text-gray-600 mb-8 leading-relaxed">{error}</p>
          <ActionButton
            onClick={() => router.push("/")}
            variant="primary"
            label="Trở Về Trang Chủ"
            className="w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#1B2A2E] flex flex-col font-sans relative overflow-hidden">
      {/* Background tiên phong cảnh đồng bộ */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-misty-white.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="fixed inset-0 z-0 bg-[#f0f9f6]/75 backdrop-blur-md" />

      {/* ── HEADER THÍ SINH ── */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-teal-500/20 p-4 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 bg-white/90 px-4 py-1.5 rounded-[16px] border border-teal-200 shadow-sm">
          <span className="text-xs font-black text-teal-800/60 uppercase">PIN</span>
          <span className="font-black text-xl text-teal-950 font-mono">{pinCode}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-teal-800/80 hidden sm:inline-block">Thí sinh:</span>
          <div className="bg-teal-600 text-white px-4 py-1.5 rounded-[16px] border border-teal-700 font-black text-sm md:text-base shadow-sm">
            {roomInfo?.playerNickname || "Bạn"}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full relative z-10">
        {/* ════════════════════════════════════════════════════════════
            WAITING STATE (CHỜ HOST BẮT ĐẦU)
        ════════════════════════════════════════════════════════════ */}
        {gameState === "WAITING" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
            <div className="relative mb-6">
              <div className="w-28 h-28 bg-gradient-to-tr from-amber-400 to-teal-600 rounded-[32px] border-4 border-white shadow-[0_12px_30px_rgba(13,148,136,0.3)] flex items-center justify-center transform -rotate-3 animate-pulse">
                <Trophy size={54} className="text-white" />
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">
              Bạn Đã Sẵn Sàng!
            </h2>
            <p className="text-base font-bold text-teal-900/80 bg-white/85 px-6 py-3 rounded-[20px] border border-teal-200/80 shadow-sm max-w-md">
              Hãy nhìn lên màn hình chính và chờ chủ phòng khởi động trận đấu...
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            PLAYING STATE / SPEED RACER COCKPIT / BATTLE ROYALE ARENA
        ════════════════════════════════════════════════════════════ */}
        {isSpeedRacer && (gameState === "PLAYING" || ((gameState === "LEADERBOARD" || answerResult) && answerResult)) && currentSlide ? (
          <SpeedRacerPlayerCockpit
            currentSlide={currentSlide as any}
            slideTimeLeft={slideTimeLeft}
            hasAnswered={hasAnswered}
            answerResult={answerResult}
            totalScore={answerResult?.totalScore ?? roomInfo?.totalScore ?? 0}
            currentRank={answerResult?.rank ?? roomInfo?.rank ?? 1}
            onSelectOption={submitQuizChoice}
            selectedOptionId={selectedQuizOptionId}
          />
        ) : isBattleRoyale && (gameState === "PLAYING" || ((gameState === "LEADERBOARD" || answerResult) && answerResult)) && currentSlide ? (
          <BattleRoyalePlayerArena
            currentSlide={currentSlide as any}
            slideTimeLeft={slideTimeLeft}
            hasAnswered={hasAnswered}
            answerResult={answerResult}
            totalScore={answerResult?.totalScore ?? roomInfo?.totalScore ?? 0}
            currentRank={answerResult?.rank ?? roomInfo?.rank ?? 1}
            playerHp={answerResult?.currentHp ?? roomInfo?.currentHp ?? 100}
            isEliminated={answerResult?.isEliminated ?? roomInfo?.isEliminated ?? false}
            onSubmitAnswer={(answerData) => {
              if (hasAnswered || !slideTimeLeft || slideTimeLeft === 0 || !currentSlide) return;
              setHasAnswered(true);
              const elapsedMs = Math.max(0, (currentSlide.timeLimit - slideTimeLeft) * 1000);
              hubSubmitAnswer(currentSlide.slideId, {
                answerData,
                responseTimeMs: elapsedMs,
              });
            }}
          />
        ) : isQuizWager && (gameState === "PLAYING" || ((gameState === "LEADERBOARD" || answerResult) && answerResult)) && currentSlide ? (
          <QuizWagerPlayerView
            currentSlide={currentSlide as any}
            slideTimeLeft={slideTimeLeft}
            hasAnswered={hasAnswered}
            answerResult={answerResult}
            totalScore={answerResult?.totalScore ?? roomInfo?.totalScore ?? 0}
            currentRank={answerResult?.rank ?? roomInfo?.rank ?? 1}
            onPlaceWager={(wagerPercent, wagerAmount) => {
              if (currentSlide) {
                placeWager(currentSlide.slideId, wagerPercent, wagerAmount);
              }
            }}
            onSubmitAnswer={(optionId, wagerPercent, wagerAmount) => {
              if (hasAnswered || !slideTimeLeft || slideTimeLeft === 0 || !currentSlide) return;
              setHasAnswered(true);
              setSelectedQuizOptionId(optionId);
              const elapsedMs = Math.max(0, (currentSlide.timeLimit - slideTimeLeft) * 1000);
              hubSubmitAnswer(currentSlide.slideId, {
                answerData: optionId,
                responseTimeMs: elapsedMs,
                wagerPercent,
                wagerAmount,
              });
            }}
          />
        ) : !isSpeedRacer && !isBattleRoyale && !isQuizWager && gameState === "PLAYING" && currentSlide ? (
          <div className="flex-1 flex flex-col animate-fade-in-up">
            {/* Thanh tiêu đề câu hỏi & đồng hồ đếm ngược */}
            <div className="flex items-center justify-between mb-6 bg-white/90 backdrop-blur-md p-4 rounded-[24px] border-2 border-teal-200/80 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="bg-teal-500/15 text-teal-900 border border-teal-300 px-3 py-1.5 rounded-[14px] font-black text-xs md:text-sm">
                  Câu {currentSlide.index !== undefined ? currentSlide.index + 1 : "?"}
                </span>
                <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-[12px] font-bold text-xs uppercase">
                  {currentSlide.type === "QUIZ"
                    ? "Trắc nghiệm"
                    : currentSlide.type === "FILL_IN_BLANK"
                    ? "Điền khuyết"
                    : currentSlide.type === "MATCHING"
                    ? "Ghép đôi"
                    : currentSlide.type === "WORD_CLOUD"
                    ? "Đám mây từ"
                    : "Câu hỏi"}
                </span>
              </div>

              <div
                className={`flex items-center gap-2 font-black text-2xl md:text-3xl px-5 py-1.5 rounded-[16px] border-2 ${
                  slideTimeLeft && slideTimeLeft <= 5
                    ? "bg-rose-100 text-rose-600 border-rose-300 animate-pulse"
                    : "bg-white text-teal-950 border-teal-200"
                }`}
              >
                <Clock size={24} /> {slideTimeLeft || 0}s
              </div>
            </div>

            {/* Nội dung câu hỏi */}
            <h3 className="text-xl md:text-3xl font-black text-center text-[#08282e] mb-8 leading-relaxed">
              {currentSlide.questionText}
            </h3>

            {/* Trạng thái ĐÃ NỘP BÀI hoặc HẾT GIỜ */}
            {hasAnswered || (slideTimeLeft !== null && slideTimeLeft <= 0) ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center bg-white/90 backdrop-blur-xl border-4 border-teal-200 p-8 md:p-12 rounded-[36px] shadow-lg max-w-md w-full animate-fade-in-up">
                  {hasAnswered ? (
                    <>
                      <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-300 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={36} className="stroke-[3.5px]" />
                      </div>
                      <h4 className="text-2xl font-black text-teal-950 mb-1">Đã Gửi Câu Trả Lời!</h4>
                      <p className="text-sm font-bold text-teal-800/80 mb-6">
                        Đang chờ các thí sinh khác hoàn thành...
                      </p>
                      <Loader2 size={32} className="text-teal-600 animate-spin mx-auto" />
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-rose-100 border-2 border-rose-300 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock size={36} />
                      </div>
                      <h4 className="text-2xl font-black text-rose-700 mb-1">Hết Thời Gian!</h4>
                      <p className="text-sm font-bold text-gray-600">Đang chuẩn bị công bố kết quả...</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* ════════ RENDER GIAO DIỆN THEO SLIDE TYPE ════════ */
              <div className="flex-1 flex flex-col justify-center">
                {/* 1. DẠNG TRẮC NGHIỆM (QUIZ & POLL) */}
                {(currentSlide.type === "QUIZ" || currentSlide.type === "POLL") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {currentSlide.options.map((opt, idx) => (
                      <button
                        key={opt.id}
                        onClick={() => submitQuizChoice(opt.id)}
                        className={`${
                          optionStyles[idx % 4]
                        } text-white p-6 rounded-[28px] border-4 font-black text-xl md:text-2xl active:translate-y-2 active:shadow-none transition-all flex items-center justify-center min-h-[140px] text-center shadow-lg hover:brightness-105`}
                      >
                        {opt.content}
                      </button>
                    ))}
                  </div>
                )}

                {/* 2. DẠNG ĐIỀN KHUYẾT (FILL_IN_BLANK) */}
                {currentSlide.type === "FILL_IN_BLANK" && (
                  <form
                    onSubmit={submitBlankAnswer}
                    className="max-w-xl mx-auto w-full bg-white/90 backdrop-blur-xl p-8 rounded-[36px] border-4 border-teal-200 shadow-xl space-y-6"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-700 border border-amber-400 flex items-center justify-center mx-auto mb-3">
                        <Edit3 size={24} />
                      </div>
                      <p className="font-black text-gray-800 text-lg">Nhập từ hoặc cụm từ điền khuyết</p>
                    </div>

                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Gõ câu trả lời vào đây..."
                      value={blankAnswer}
                      onChange={(e) => setBlankAnswer(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border-4 border-teal-200 rounded-[22px] text-teal-950 font-black text-xl text-center outline-none focus:border-teal-600 focus:bg-white transition-all shadow-inner"
                    />

                    <button
                      type="submit"
                      disabled={!blankAnswer.trim()}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-lg rounded-[22px] shadow-[0_6px_0_0_#115e59] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Send size={20} />
                      <span>Gửi Câu Trả Lời</span>
                    </button>
                  </form>
                )}

                {/* 3. DẠNG GHÉP NỐI (MATCHING) */}
                {currentSlide.type === "MATCHING" && (
                  <div className="space-y-6">
                    <p className="text-center text-sm font-bold text-teal-900 bg-white/80 py-2 px-4 rounded-full border border-teal-200 inline-block mx-auto w-fit">
                      👉 Chọn 1 thẻ bên trái rồi chọn 1 thẻ bên phải để ghép đôi. Bấm lại vào cặp đã ghép để hủy.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Cột Trái */}
                      <div className="space-y-3">
                        <h4 className="font-black text-sm uppercase text-teal-900 tracking-wider text-center">
                          Vế Trái
                        </h4>
                        {currentSlide.options.map((opt) => {
                          const isPaired = !!matchingPairs[opt.id];
                          const isSelected = selectedLeft === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSelectMatching("left", opt.id)}
                              className={`w-full p-4 rounded-[20px] border-4 font-bold text-base md:text-lg transition-all text-left flex items-center justify-between shadow-sm ${
                                isPaired
                                  ? "bg-emerald-500 border-emerald-700 text-white shadow-[0_4px_0_0_#065f46]"
                                  : isSelected
                                  ? "bg-amber-300 border-amber-500 text-amber-950 shadow-[0_4px_0_0_#b45309] scale-[1.02]"
                                  : "bg-white border-gray-200 text-gray-800 hover:border-teal-300"
                              }`}
                            >
                              <span>{opt.content}</span>
                              {isPaired && <Check size={20} className="stroke-[3px]" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Cột Phải */}
                      <div className="space-y-3">
                        <h4 className="font-black text-sm uppercase text-teal-900 tracking-wider text-center">
                          Vế Phải
                        </h4>
                        {matchingRightOptions.map((rightText, idx) => {
                          const isPaired = Object.values(matchingPairs).includes(rightText);
                          const isSelected = selectedRight === rightText;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectMatching("right", rightText)}
                              className={`w-full p-4 rounded-[20px] border-4 font-bold text-base md:text-lg transition-all text-left flex items-center justify-between shadow-sm ${
                                isPaired
                                  ? "bg-emerald-500 border-emerald-700 text-white shadow-[0_4px_0_0_#065f46]"
                                  : isSelected
                                  ? "bg-amber-300 border-amber-500 text-amber-950 shadow-[0_4px_0_0_#b45309] scale-[1.02]"
                                  : "bg-white border-gray-200 text-gray-800 hover:border-teal-300"
                              }`}
                            >
                              <span>{rightText}</span>
                              {isPaired && <Check size={20} className="stroke-[3px]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Nút nộp bài ghép */}
                    <div className="pt-2 flex justify-center">
                      <button
                        onClick={submitMatchingAnswer}
                        disabled={Object.keys(matchingPairs).length === 0}
                        className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-lg rounded-[22px] shadow-[0_6px_0_0_#115e59] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        <LinkIcon size={20} />
                        <span>Xác Nhận Nộp Ghép Đôi ({Object.keys(matchingPairs).length} cặp)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. DẠNG ĐÁM MÂY TỪ (WORD_CLOUD) */}
                {currentSlide.type === "WORD_CLOUD" && (
                  <form
                    onSubmit={submitWordCloudAnswer}
                    className="max-w-xl mx-auto w-full bg-white/90 backdrop-blur-xl p-8 rounded-[36px] border-4 border-teal-200 shadow-xl space-y-6"
                  >
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-2xl bg-cyan-400/20 text-cyan-800 border border-cyan-400 flex items-center justify-center mx-auto mb-3">
                        <Cloud size={28} />
                      </div>
                      <p className="font-black text-gray-800 text-lg">Gửi từ khóa lên Đám Mây Màn Hình</p>
                      <p className="text-xs font-semibold text-gray-500 mt-1">
                        Từ khóa càng được gửi nhiều, kích thước càng nổi bật trên máy chiếu
                      </p>
                    </div>

                    <div>
                      <input
                        type="text"
                        maxLength={30}
                        required
                        autoFocus
                        placeholder="VD: Sáng tạo, Đổi mới, Đoàn kết..."
                        value={wordCloudAnswer}
                        onChange={(e) => setWordCloudAnswer(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border-4 border-cyan-200 rounded-[22px] text-teal-950 font-black text-xl text-center outline-none focus:border-cyan-600 focus:bg-white transition-all shadow-inner"
                      />
                      <p className="text-right text-xs font-bold text-gray-400 mt-1">
                        {wordCloudAnswer.length}/30 ký tự
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={!wordCloudAnswer.trim()}
                      className="w-full py-4 bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 text-white font-black text-lg rounded-[22px] shadow-[0_6px_0_0_#0e7490] active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Cloud size={20} />
                      <span>Gửi Từ Khóa Lên Màn Hình</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* ════════════════════════════════════════════════════════════
            ANSWER RESULT STATE (KẾT QUẢ ĐÚNG / SAI CỦA BẠN)
        ════════════════════════════════════════════════════════════ */}
        {!isSpeedRacer && !isBattleRoyale && !isQuizWager && (gameState === "LEADERBOARD" || answerResult) && answerResult && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up">
            {answerResult.isCorrect ? (
              <div className="w-32 h-32 bg-emerald-500 text-white rounded-[36px] border-4 border-emerald-700 shadow-[0_10px_0_0_#047857] flex items-center justify-center mb-6 transform -rotate-3">
                <Check size={70} strokeWidth={4} />
              </div>
            ) : (
              <div className="w-32 h-32 bg-rose-500 text-white rounded-[36px] border-4 border-rose-700 shadow-[0_10px_0_0_#be123c] flex items-center justify-center mb-6 transform rotate-3">
                <X size={70} strokeWidth={4} />
              </div>
            )}

            <h2
              className={`text-4xl md:text-5xl font-black mb-4 tracking-tight ${
                answerResult.isCorrect ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {answerResult.isCorrect ? "Chính Xác!" : "Chưa Chính Xác!"}
            </h2>

            <div className="bg-white px-8 py-5 rounded-[28px] shadow-sm border-2 border-teal-200 inline-block mb-6">
              <div className="text-xs font-black text-teal-800/70 uppercase tracking-widest mb-1">
                Điểm Nhận Được
              </div>
              <div className="text-4xl font-black text-teal-950">+{answerResult.scoreAwarded}</div>
            </div>

            <div className="bg-white/80 border-2 border-teal-200 px-6 py-3 rounded-[20px] text-base font-black text-teal-900 shadow-sm">
              Tổng điểm: <span className="text-2xl text-teal-600 ml-1">{answerResult.totalScore}</span>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            FINISHED STATE (TRÒ CHƠI KẾT THÚC)
        ════════════════════════════════════════════════════════════ */}
        {gameState === "FINISHED" && (
          <div className="flex-1 flex flex-col animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-black text-center text-[#08282e] mb-8 mt-4 tracking-tight">
              Trận Đấu Kết Thúc! 🏆
            </h2>

            <div className="bg-white rounded-[36px] shadow-sm border-4 border-teal-200 overflow-hidden max-w-2xl mx-auto w-full">
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-5 text-white text-center">
                <div className="font-black text-xl tracking-wide uppercase">Bảng Xếp Hạng Tổng Sắp</div>
              </div>
              <div className="divide-y divide-teal-100 p-4">
                {leaderboard.map((player, idx) => (
                  <div
                    key={player.playerId}
                    className={`p-3.5 flex items-center justify-between rounded-[18px] mb-2 ${
                      idx === 0
                        ? "bg-amber-50 border-2 border-amber-300"
                        : "bg-gray-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-[14px] flex items-center justify-center font-black text-base border-2 ${
                          idx === 0
                            ? "bg-amber-400 text-white border-amber-600"
                            : idx === 1
                            ? "bg-gray-300 text-gray-800 border-gray-400"
                            : idx === 2
                            ? "bg-orange-400 text-white border-orange-600"
                            : "bg-white text-gray-500 border-gray-200"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="font-black text-base text-gray-900">{player.nickname}</div>
                    </div>
                    <div className="font-black text-xl text-teal-700">{player.totalScore} đ</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <ActionButton
                onClick={() => router.push("/")}
                variant="primary"
                label="Trở Về Trang Chủ"
                className="w-full md:w-auto md:px-12"
              />
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL HỎI ĐÁP (Q&A) ── */}
      {isConnected && !error && (
        <>
          <button
            onClick={() => setShowQA(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-[22px] border-4 border-teal-800 shadow-[0_6px_0_0_#115e59] active:translate-y-2 active:shadow-none flex items-center justify-center transition-all z-40"
            title="Mở kênh hỏi đáp Q&A"
          >
            <MessageCircle size={26} />
            {questions.length > 0 && (
              <span className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 border-2 border-white rounded-full text-xs font-black flex items-center justify-center shadow-md">
                {questions.length}
              </span>
            )}
          </button>

          {showQA && (
            <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-md animate-fade-in-up md:p-10 font-sans">
              <div className="bg-white w-full h-full md:max-w-2xl md:mx-auto md:rounded-[36px] md:border-4 md:border-teal-200 flex flex-col shadow-2xl overflow-hidden">
                <div className="bg-teal-50 p-5 flex items-center justify-between border-b-2 border-teal-200 sticky top-0 z-10 shrink-0">
                  <h3 className="font-black text-gray-900 text-xl flex items-center gap-2.5">
                    <MessageCircle size={22} className="text-teal-600" />
                    <span>Hỏi Đáp Cùng Phòng Thi</span>
                  </h3>
                  <button
                    onClick={() => setShowQA(false)}
                    className="w-9 h-9 rounded-[14px] bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {questions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <HelpCircle size={40} className="mx-auto mb-2 text-gray-300" />
                      <p className="font-bold text-sm">Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!</p>
                    </div>
                  ) : (
                    questions.map((q) => (
                      <div
                        key={q.id}
                        className="p-4 bg-gray-50 border border-teal-100 rounded-2xl flex items-start justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-teal-950 text-sm">{q.content}</p>
                          <p className="text-[11px] text-gray-500 mt-1 font-semibold">{q.playerNickname}</p>
                        </div>
                        <button
                          onClick={() => upvoteQuestion(q.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-teal-200 rounded-xl text-teal-800 font-bold text-xs hover:bg-teal-50 shadow-sm"
                        >
                          <ThumbsUp size={13} />
                          <span>{q.upvotes}</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!qaText.trim()) return;
                    askQuestion(roomInfo?.playerId || "00000000-0000-0000-0000-000000000000", qaText.trim());
                    setQaText("");
                  }}
                  className="p-4 bg-gray-50 border-t border-teal-100 flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Đặt câu hỏi cho Host..."
                    value={qaText}
                    onChange={(e) => setQaText(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white border-2 border-teal-200 rounded-xl text-sm font-semibold outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-sm flex items-center gap-1.5 shadow-sm"
                  >
                    <Send size={15} />
                    <span>Gửi</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
