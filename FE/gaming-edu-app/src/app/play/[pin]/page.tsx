"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useGameHub, PlayerArenaProgress } from "@/hooks/useGameHub";
import { useQAHub } from "@/hooks/useQAHub";
import { api } from "@/lib/api";
import MultiplayerArenaLayout from "@/components/arena/MultiplayerArenaLayout";
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
  UserX,
  Zap,
  CheckCircle2,
  Users,
  LogOut,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

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
    players,
    isKicked,
    readyPlayers,
    currentSlide,
    countdown,
    slideTimeLeft,
    answerResult,
    answerRejected,
    leaderboard,
    isRoomClosed,
    roomClosedMessage,
    joinRoom,
    rejoinRoom,
    submitAnswer: hubSubmitAnswer,
    startSlideTimer,
    toggleReady,
    updateProgress,
    playersProgress,
    requestPlayersProgress,
  } = useGameHub();

  const {
    questions,
    askQuestion,
    upvoteQuestion,
  } = useQAHub(roomInfo?.roomId || null);

  const pinnedQuestion = questions.find((q) => q.isPinned && !q.isResolved);

  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedQuizOptionId, setSelectedQuizOptionId] = useState<string | null>(null);
  const [showQA, setShowQA] = useState(false);
  const [qaText, setQaText] = useState("");
  const [isSelfReady, setIsSelfReady] = useState(false);
  const [roomMode, setRoomMode] = useState<string>("HOST_PACED");
  const [roomDetails, setRoomDetails] = useState<any>(null);
  const [isTournamentStarted, setIsTournamentStarted] = useState(false);
  const [playerNicknameInput, setPlayerNicknameInput] = useState("");
  const [slideTimeRemaining, setSlideTimeRemaining] = useState<number | null>(null);
  const [allQuizSlides, setAllQuizSlides] = useState<any[]>([]);
  const [pacedSlideIndex, setPacedSlideIndex] = useState(0);
  const [pacedScore, setPacedScore] = useState(0);
  const [isPacedFinished, setIsPacedFinished] = useState(false);
  const [viewLobbyWhilePacedFinished, setViewLobbyWhilePacedFinished] = useState(false);

  // States riêng cho từng dạng câu hỏi
  const [blankAnswer, setBlankAnswer] = useState("");
  const [wordCloudAnswer, setWordCloudAnswer] = useState("");

  // Matching states
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchingPairs, setMatchingPairs] = useState<Record<string, string>>({}); // { leftId: rightContent }

  // Load phòng & câu hỏi bộ đề cho chế độ Player-Paced / Tournament
  useEffect(() => {
    if (pinCode) {
      api.get(`/rooms/pin/${pinCode}`).then((res) => {
        if (res.data?.success && res.data.data) {
          const rData = res.data.data;
          setRoomDetails(rData);
          const roomTheme = rData.theme || rData.gameModeTheme;
          if (roomTheme === "NAVAL_WAR") {
            router.replace(`/rooms/${pinCode}/naval`);
            return;
          }
          if (rData.mode) {
            setRoomMode(rData.mode);
          }
          const qId = rData.quizId;
          if (qId) {
            api.get(`/quizzes/${qId}`).then((qRes) => {
              if (qRes.data?.success && qRes.data.data?.slides) {
                setAllQuizSlides(qRes.data.data.slides);
              }
            }).catch(console.error);
          }
        }
      }).catch(console.error);
    }
  }, [pinCode, router]);

  useEffect(() => {
    if (roomInfo?.mode) {
      setRoomMode(roomInfo.mode);
    }
  }, [roomInfo?.mode]);

  // Đồng bộ tên người chơi ban đầu
  useEffect(() => {
    const guestName = Cookies.get("guest_nickname");
    const userStr = Cookies.get("user");
    let currentNick = "";
    if (guestName) {
      currentNick = guestName;
    } else if (userStr) {
      try {
        currentNick = JSON.parse(userStr).nickname || "";
      } catch {}
    } else if (roomInfo?.playerNickname && roomInfo.playerNickname !== "Anonymous") {
      currentNick = roomInfo.playerNickname;
    }
    if (currentNick && !playerNicknameInput) {
      setPlayerNicknameInput(currentNick);
    }
  }, [roomInfo?.playerNickname, playerNicknameInput]);

  const isPacedMode = roomMode === "ASYNC_TOURNAMENT";
  const displaySlide = (isPacedMode && allQuizSlides.length > 0 ? allQuizSlides[pacedSlideIndex] : currentSlide) || currentSlide;

  const effectiveQuestionTimeLimit = useMemo(() => {
    return (
      roomDetails?.questionTimeLimit ||
      (roomInfo as any)?.questionTimeLimit ||
      (displaySlide?.timeLimit > 0 ? displaySlide.timeLimit : 30)
    );
  }, [roomDetails?.questionTimeLimit, roomInfo, displaySlide?.timeLimit]);

  const effectiveArenaPlayers: PlayerArenaProgress[] = useMemo(() => {
    if (playersProgress && playersProgress.length > 0) {
      return playersProgress;
    }
    return players.map((p, index) => {
      const isMe = p.playerId === roomInfo?.playerId;
      return {
        playerId: p.playerId,
        nickname: p.nickname,
        avatarUrl: p.avatarUrl,
        score: isMe ? pacedScore : 0,
        rank: index + 1,
        progressRatio: isPacedMode && allQuizSlides.length > 0 ? (pacedSlideIndex / allQuizSlides.length) : 0,
        streak: 0,
        isAnswered: isMe ? hasAnswered : false,
        isJustBoosted: false,
        lastScoreAwarded: 0,
        isGhost: false,
      };
    });
  }, [playersProgress, players, roomInfo?.playerId, pacedScore, isPacedMode, allQuizSlides.length, pacedSlideIndex, hasAnswered]);

  // Bắt đầu timer cá nhân cho từng câu hỏi khi ở chế độ Giải Đấu (Async Tournament)
  useEffect(() => {
    if (!isPacedMode || !isTournamentStarted || !displaySlide || isPacedFinished || viewLobbyWhilePacedFinished) {
      return;
    }

    const slideLimit = effectiveQuestionTimeLimit;
    setSlideTimeRemaining(slideLimit);

    const targetId = displaySlide.slideId || displaySlide.id;
    if (targetId && isConnected) {
      startSlideTimer(slideLimit, targetId);
    }

    const timer = setInterval(() => {
      setSlideTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isPacedMode,
    isTournamentStarted,
    displaySlide?.slideId,
    displaySlide?.id,
    effectiveQuestionTimeLimit,
    isConnected,
    isPacedFinished,
    viewLobbyWhilePacedFinished,
    startSlideTimer,
    pacedSlideIndex,
  ]);

  const handleStartTournament = () => {
    const finalNick = playerNicknameInput.trim() || roomInfo?.playerNickname || Cookies.get("guest_nickname") || "";
    if (!finalNick) {
      alert("Vui lòng nhập tên hoặc biệt danh của bạn trước khi bắt đầu làm bài!");
      return;
    }

    Cookies.set("guest_nickname", finalNick, { expires: 1 });

    if (finalNick !== roomInfo?.playerNickname && isConnected) {
      const userStr = Cookies.get("user");
      let userId: string | undefined = undefined;
      let avatarUrl: string | undefined = undefined;
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          userId = parsed.id;
          avatarUrl = parsed.avatarUrl || parsed.avatar_url;
        } catch {}
      }
      joinRoom(pinCode, finalNick, avatarUrl, userId);
    }

    setIsTournamentStarted(true);
    setPacedSlideIndex(0);
    setHasAnswered(false);
  };

  const handlePacedNext = () => {
    const addPts = (answerResult && !answerResult.isTournamentLocked) ? (answerResult.scoreAwarded ?? 0) : 0;
    const newScore = pacedScore + addPts;
    setPacedScore(newScore);

    if (pacedSlideIndex < allQuizSlides.length - 1) {
      const nextIdx = pacedSlideIndex + 1;
      setPacedSlideIndex(nextIdx);
      setHasAnswered(false);
      setSelectedQuizOptionId(null);
      setBlankAnswer("");
      setWordCloudAnswer("");
      setSelectedLeft(null);
      setSelectedRight(null);
      setMatchingPairs({});
      updateProgress(nextIdx + 1, allQuizSlides.length, newScore);
    } else {
      setIsPacedFinished(true);
      updateProgress(allQuizSlides.length, allQuizSlides.length, newScore);
    }
  };

  // Tự động kết nối hoặc khôi phục phiên (Rejoin)
  useEffect(() => {
    if (isConnected) {
      const guestName = Cookies.get("guest_nickname");
      const userStr = Cookies.get("user");
      let nickname = "Anonymous";
      let userId: string | undefined = undefined;
      let avatarUrl: string | undefined = undefined;

      if (guestName) {
        nickname = guestName;
      } else if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          nickname = parsed.nickname || "Anonymous";
          userId = parsed.id;
          avatarUrl = parsed.avatarUrl || parsed.avatar_url;
        } catch {
          // ignore
        }
      }

      const savedPlayerKey = `player_session_${pinCode}`;
      const savedPlayerId = typeof window !== "undefined" ? localStorage.getItem(savedPlayerKey) : null;

      if (savedPlayerId && rejoinRoom) {
        rejoinRoom(pinCode, savedPlayerId, nickname);
      } else {
        joinRoom(pinCode, nickname, avatarUrl, userId);
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
  }, [gameState, displaySlide?.slideId, displaySlide?.id, pacedSlideIndex]);

  // Auto-save draft mỗi 30s khi đang làm bài (chế độ Async / Tự luận / Matching)
  useEffect(() => {
    if (gameState !== "PLAYING" || !displaySlide || hasAnswered) return;

    const interval = setInterval(async () => {
      const draftContent =
        displaySlide.type === "FILL_IN_BLANK"
          ? blankAnswer
          : displaySlide.type === "MATCHING"
          ? JSON.stringify(matchingPairs)
          : displaySlide.type === "WORD_CLOUD"
          ? wordCloudAnswer
          : "";

      const slideId = displaySlide.slideId || displaySlide.id;
      if (draftContent && roomInfo?.roomId && slideId) {
        try {
          const playerId = (roomInfo as any)?.playerId || (roomInfo as any)?.roomPlayerId;
          if (playerId) {
            await api.put("/rooms/answers/draft", {
              roomPlayerId: playerId,
              slideId: slideId,
              answerData: draftContent,
            });
          }
        } catch {
          // ignore auto-save network issues
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [gameState, displaySlide, hasAnswered, blankAnswer, matchingPairs, wordCloudAnswer, roomInfo]);

  // Danh sách thẻ bên phải cho MATCHING
  const matchingRightOptions = useMemo(() => {
    if (displaySlide?.type !== "MATCHING" || !displaySlide.options) return [];
    return displaySlide.options
      .map((opt: any) => opt.matchingPair || opt.content)
      .filter(Boolean);
  }, [displaySlide]);

  // Submit cho trắc nghiệm QUIZ / POLL
  const submitQuizChoice = (optionId: string) => {
    const targetSlide = displaySlide;
    const targetSlideId = targetSlide?.slideId || targetSlide?.id;
    if (hasAnswered || !targetSlide || !targetSlideId) return;
    if (isPacedMode && slideTimeRemaining === 0) return;
    if (!isPacedMode && (!slideTimeLeft || slideTimeLeft === 0)) return;

    setHasAnswered(true);
    setSelectedQuizOptionId(optionId);
    const timeLimit = isPacedMode ? effectiveQuestionTimeLimit : (targetSlide.timeLimit || 30);
    const elapsedMs = isPacedMode
      ? Math.max(0, (effectiveQuestionTimeLimit - (slideTimeRemaining || 0)) * 1000)
      : Math.max(0, (timeLimit - (slideTimeLeft || 0)) * 1000);
    hubSubmitAnswer(targetSlideId, {
      answerData: optionId,
      responseTimeMs: elapsedMs,
    });
  };

  // Submit cho FILL_IN_BLANK
  const submitBlankAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSlide = displaySlide;
    const targetSlideId = targetSlide?.slideId || targetSlide?.id;
    if (!blankAnswer.trim() || hasAnswered || !targetSlide || !targetSlideId) return;
    if (isPacedMode && slideTimeRemaining === 0) return;
    if (!isPacedMode && (!slideTimeLeft || slideTimeLeft === 0)) return;

    setHasAnswered(true);
    const timeLimit = isPacedMode ? effectiveQuestionTimeLimit : (targetSlide.timeLimit || 30);
    const elapsedMs = isPacedMode
      ? Math.max(0, (effectiveQuestionTimeLimit - (slideTimeRemaining || 0)) * 1000)
      : Math.max(0, (timeLimit - (slideTimeLeft || 0)) * 1000);
    hubSubmitAnswer(targetSlideId, {
      answerData: blankAnswer.trim(),
      responseTimeMs: elapsedMs,
    });
  };

  // Submit cho WORD_CLOUD
  const submitWordCloudAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSlide = displaySlide;
    const targetSlideId = targetSlide?.slideId || targetSlide?.id;
    if (!wordCloudAnswer.trim() || hasAnswered || !targetSlide || !targetSlideId) return;
    if (isPacedMode && slideTimeRemaining === 0) return;
    if (!isPacedMode && (!slideTimeLeft || slideTimeLeft === 0)) return;

    setHasAnswered(true);
    const timeLimit = isPacedMode ? effectiveQuestionTimeLimit : (targetSlide.timeLimit || 30);
    const elapsedMs = isPacedMode
      ? Math.max(0, (effectiveQuestionTimeLimit - (slideTimeRemaining || 0)) * 1000)
      : Math.max(0, (timeLimit - (slideTimeLeft || 0)) * 1000);
    hubSubmitAnswer(targetSlideId, {
      answerData: wordCloudAnswer.trim(),
      responseTimeMs: elapsedMs,
    });
  };

  // Logic ghép cặp cho MATCHING
  const handleSelectMatching = (side: "left" | "right", value: string) => {
    if (hasAnswered) return;
    if (isPacedMode && slideTimeRemaining === 0) return;
    if (!isPacedMode && (!slideTimeLeft || slideTimeLeft === 0)) return;

    if (side === "left") {
      if (matchingPairs[value]) {
        setMatchingPairs((prev) => {
          const next = { ...prev };
          delete next[value];
          return next;
        });
        return;
      }

      if (selectedRight) {
        setMatchingPairs((prev) => ({ ...prev, [value]: selectedRight }));
        setSelectedLeft(null);
        setSelectedRight(null);
      } else {
        setSelectedLeft(selectedLeft === value ? null : value);
      }
    } else {
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
    const targetSlide = displaySlide;
    const targetSlideId = targetSlide?.slideId || targetSlide?.id;
    if (hasAnswered || !targetSlide || !targetSlideId) return;
    if (isPacedMode && slideTimeRemaining === 0) return;
    if (!isPacedMode && (!slideTimeLeft || slideTimeLeft === 0)) return;

    setHasAnswered(true);
    const timeLimit = isPacedMode ? effectiveQuestionTimeLimit : (targetSlide.timeLimit || 30);
    const elapsedMs = isPacedMode
      ? Math.max(0, (effectiveQuestionTimeLimit - (slideTimeRemaining || 0)) * 1000)
      : Math.max(0, (timeLimit - (slideTimeLeft || 0)) * 1000);

    const payloadPairs = Object.entries(matchingPairs).map(([leftId, rightContent]) => ({
      leftId,
      rightContent,
    }));

    hubSubmitAnswer(targetSlideId, {
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
      <div className="min-h-screen bg-[#F4F6FB] text-slate-900 flex flex-col items-center justify-center font-sans relative overflow-hidden">
        <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center p-8 bg-white rounded-[32px] border border-slate-200/90 shadow-2xl">
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

  // 2. Bị Chủ Phòng Đá (Kicked)
  if (isKicked) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] text-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
        <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 bg-white p-10 rounded-[40px] border-4 border-rose-200 shadow-2xl max-w-md w-full flex flex-col items-center animate-fade-in-up">
          <div className="w-20 h-20 bg-rose-100 border-2 border-rose-300 rounded-[24px] flex items-center justify-center mb-6 text-rose-600 shadow-inner">
            <UserX size={44} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-rose-700 mb-2 tracking-tight">
            Bạn Đã Bị Mời Khỏi Phòng
          </h1>
          <p className="text-sm font-bold text-gray-600 mb-8 leading-relaxed">
            Chủ phòng (Host) đã mời bạn ra khỏi phòng thi này. Bạn không thể tiếp tục phiên chơi hiện tại.
          </p>
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

  // 3. Lỗi kết nối
  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] text-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans relative overflow-hidden">
        <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 bg-white p-10 rounded-[40px] border border-slate-200/90 shadow-2xl max-w-md w-full flex flex-col items-center">
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

  const isPlaying = (isPacedMode ? isTournamentStarted : gameState === "PLAYING") && Boolean(displaySlide) && !viewLobbyWhilePacedFinished;

  const isTournamentEnded =
    roomDetails?.status === "FINISHED" ||
    roomInfo?.status === "FINISHED" ||
    roomDetails?.isEarlyFinished ||
    (roomDetails?.endTime && new Date(roomDetails.endTime) < new Date());

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900 flex flex-col font-sans relative overflow-hidden">
      {/* Subtle modern ambient background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ── HEADER THÍ SINH (ẨN KHI ĐANG THI ĐẤU ĐỂ NHƯỜNG KHÔNG GIAN CHO ARENA & HUD) ── */}
      {!isPlaying && (
        <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/90 p-4 sticky top-0 z-20 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/90 px-3.5 py-1.5 rounded-[16px] border border-teal-200 shadow-sm">
              <span className="text-xs font-black text-teal-800/60 uppercase">PIN</span>
              <span className="font-black text-lg md:text-xl text-teal-950 font-mono">{pinCode}</span>
            </div>
            {roomMode === "ASYNC_TOURNAMENT" ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-black rounded-full">
                ⚡ Phòng Giải Đấu
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-black rounded-full">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Phòng Thường
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-teal-800/80 hidden sm:inline-block">Thí sinh:</span>
            <div className="bg-teal-600 text-white px-4 py-1.5 rounded-[16px] border border-teal-700 font-black text-sm md:text-base shadow-sm">
              {playerNicknameInput || roomInfo?.playerNickname || "Bạn"}
            </div>
          </div>
        </header>
      )}

      {/* Overlay Countdown 3-2-1 */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="text-center">
            <div className="text-9xl md:text-[14rem] font-black text-amber-400 drop-shadow-[0_12px_24px_rgba(245,158,11,0.5)] animate-bounce font-mono">
              {countdown}
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-white uppercase tracking-widest mt-4">
              Chuẩn bị trả lời...
            </p>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full relative z-10">
        {/* Banner Câu Hỏi Được Ghim Từ Host */}
        {pinnedQuestion && (
          <div className="bg-gradient-to-r from-amber-400 to-yellow-400 text-teal-950 p-4 rounded-2xl shadow-md border-2 border-amber-500 mb-6 flex items-center justify-between gap-3 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-900 text-amber-300 rounded-xl flex items-center justify-center font-bold text-base shrink-0">
                📌
              </div>
              <div>
                <span className="text-[11px] font-black uppercase text-teal-900 block tracking-wider">
                  Chủ phòng đang giải đáp ({pinnedQuestion.playerNickname})
                </span>
                <span className="text-sm font-extrabold line-clamp-1">{pinnedQuestion.content}</span>
              </div>
            </div>
            <span className="text-xs font-black bg-white/50 px-2.5 py-1 rounded-lg shrink-0">
              👍 {pinnedQuestion.upvotes}
            </span>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TOURNAMENT MODE LOBBY (ASYNC TOURNAMENT)
            Người chơi nhập tên, bấm Bắt đầu để chơi hoặc Thoát phòng
        ════════════════════════════════════════════════════════════ */}
        {isPacedMode && !isPlaying && !isPacedFinished && (
          isTournamentEnded ? (
            <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up py-8 max-w-lg mx-auto w-full text-center">
              <div className="w-20 h-20 bg-amber-100 border-2 border-amber-300 rounded-[28px] flex items-center justify-center text-amber-700 mb-5 shadow-sm">
                <Clock size={40} />
              </div>
              <span className="px-3 py-1 bg-rose-100 border border-rose-300 text-rose-800 rounded-full font-black text-xs uppercase tracking-wider mb-2">
                Đã Kết Thúc
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
                Phòng Giải Đấu Đã Kết Thúc
              </h2>
              <p className="text-sm font-semibold text-gray-600 mb-6 leading-relaxed">
                Chủ phòng đã kết thúc giải đấu hoặc thời hạn làm bài đã qua. Cảm ơn bạn đã quan tâm!
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => router.push(`/reports/${roomDetails?.id || pinCode}`)}
                  className="w-full sm:flex-1 py-3.5 px-5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black rounded-2xl border-2 border-amber-600 shadow-sm transition-all"
                >
                  Xem Bảng Xếp Hạng
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/play")}
                  className="w-full sm:flex-1 py-3.5 px-5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black rounded-2xl border-2 border-slate-300 transition-all"
                >
                  Thoát Phòng
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up py-4 max-w-xl mx-auto w-full space-y-6">
              {/* Header Card */}
              <div className="bg-white/95 backdrop-blur-xl rounded-[32px] border-2 border-amber-200/90 p-6 md:p-8 shadow-xl w-full text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 border-2 border-amber-300 text-amber-950 flex items-center justify-center mx-auto shadow-md">
                  <Trophy size={32} />
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black uppercase tracking-wider mb-2">
                    ⚡ Phòng Giải Đấu (Tự Do Làm Bài)
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                    {roomDetails?.quizTitle || roomDetails?.quiz?.title || roomInfo?.quizTitle || "Giải Đấu Trắc Nghiệm"}
                  </h2>
                  <p className="text-xs md:text-sm font-semibold text-gray-500 mt-1">
                    Bạn có thể làm bài theo tốc độ cá nhân mà không cần chờ chủ phòng bắt đầu.
                  </p>
                </div>

                {/* Metadata Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Số Câu Hỏi</span>
                    <span className="text-lg font-black text-slate-800">{allQuizSlides.length} câu</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Thời Gian / Câu</span>
                    <span className="text-lg font-black text-indigo-600">{effectiveQuestionTimeLimit}s</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Hạn Chót</span>
                    <span className="text-xs font-black text-amber-700 truncate block mt-1">
                      {roomDetails?.endTime
                        ? new Date(roomDetails.endTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + new Date(roomDetails.endTime).toLocaleDateString("vi-VN")
                        : "Không giới hạn"}
                    </span>
                  </div>
                </div>

                {/* Nickname Input */}
                <div className="space-y-2 text-left pt-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Tên hoặc biệt danh của bạn:</span>
                    <span className="text-[11px] font-semibold text-slate-400">Dùng để ghi danh vào bảng điểm</span>
                  </label>
                  <input
                    type="text"
                    value={playerNicknameInput}
                    onChange={(e) => setPlayerNicknameInput(e.target.value)}
                    placeholder="Nhập tên của bạn để thi đấu..."
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base font-black text-slate-900 outline-none focus:border-amber-500 focus:bg-white focus:shadow-md transition-all text-center"
                  />
                </div>

                {/* Action Buttons: BẮT ĐẦU CHƠI & THOÁT PHÒNG */}
                <div className="flex flex-col sm:flex-row gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => router.push("/play")}
                    className="order-2 sm:order-1 px-6 py-4 rounded-[20px] border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <LogOut size={18} />
                    <span>Thoát Phòng</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartTournament}
                    disabled={allQuizSlides.length === 0}
                    className="order-1 sm:order-2 flex-1 py-4 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-lg rounded-[20px] border-4 border-emerald-700 shadow-[0_6px_0_0_#065f46] active:translate-y-1.5 active:shadow-none transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap size={22} className="fill-current text-amber-300" />
                    <span>BẮT ĐẦU LÀM BÀI ⚡</span>
                  </button>
                </div>
              </div>

              {/* Other participants */}
              <div className="w-full bg-white/80 backdrop-blur-md rounded-[28px] border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-600">
                    <Users size={16} className="text-amber-500" />
                    <span>Thí sinh đã tham gia ({players.length})</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">Cập nhật theo thời gian thực</span>
                </div>
                {players.length === 0 ? (
                  <p className="text-center text-xs font-bold text-slate-400 py-3">Bạn là người đầu tiên tham gia phòng này!</p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                    {players.map((p) => (
                      <div key={p.playerId} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{p.nickname}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* ════════════════════════════════════════════════════════════
            WAITING STATE CHO PHÒNG THƯỜNG (CHỜ HOST BẮT ĐẦU)
        ════════════════════════════════════════════════════════════ */}
        {!isPacedMode && (gameState === "WAITING" || (gameState === "PLAYING" && isPacedFinished && viewLobbyWhilePacedFinished)) && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up py-4 space-y-6">
            {isPacedFinished && (
              <div className="w-full max-w-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-[24px] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="font-black text-sm text-emerald-950">Bạn đã hoàn thành bài thi!</div>
                    <div className="text-xs font-bold text-emerald-700">Tổng điểm: {pacedScore} đ • Đang chờ chủ phòng kết thúc</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewLobbyWhilePacedFinished(false)}
                  className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-bold text-xs transition-all shadow-xs"
                >
                  Xem Bảng Điểm
                </button>
              </div>
            )}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-teal-600 rounded-[28px] border-4 border-white shadow-[0_12px_30px_rgba(13,148,136,0.25)] flex items-center justify-center transform -rotate-3 animate-pulse">
                <Trophy size={48} className="text-white" />
              </div>
            </div>

            <div className="text-center max-w-md">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">
                Phòng Chờ Trận Đấu
              </h2>
              <p className="text-sm font-bold text-teal-900/80">
                Hãy nhấn sẵn sàng để thông báo cho chủ phòng và các bạn cùng phòng!
              </p>
            </div>

            {/* Nút Sẵn Sàng (Ready Toggle) */}
            <div className="w-full max-w-md">
              {!isSelfReady ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsSelfReady(true);
                    toggleReady(true);
                  }}
                  className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xl rounded-[24px] border-4 border-emerald-700 shadow-[0_8px_0_0_#065f46] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-3"
                >
                  <Zap size={26} className="fill-current text-amber-300" />
                  <span>TÔI ĐÃ SẴN SÀNG! ⚡</span>
                </button>
              ) : (
                <div className="bg-white/90 border-4 border-emerald-400 rounded-[24px] p-5 shadow-sm text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-800 font-black text-lg">
                    <CheckCircle2 size={26} className="text-emerald-600" />
                    <span>BẠN ĐÃ SẴN SÀNG!</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-500">
                    Đang chờ Host bắt đầu cuộc thi...
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelfReady(false);
                      toggleReady(false);
                    }}
                    className="text-xs font-black text-rose-500 hover:text-rose-700 underline"
                  >
                    Nhấn vào đây nếu muốn hủy sẵn sàng
                  </button>
                </div>
              )}
            </div>

            {/* Danh sách người chơi chung phòng */}
            <div className="w-full max-w-xl bg-white/85 backdrop-blur-xl rounded-[32px] border-2 border-teal-200/80 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-teal-100">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-teal-700" />
                  <span className="font-black text-base text-teal-950">
                    Thí Sinh Cùng Phòng ({players.length})
                  </span>
                </div>
                <div className="text-xs font-black px-3 py-1 bg-teal-100 text-teal-800 rounded-full">
                  {Object.values(readyPlayers).filter(Boolean).length}/{players.length} đã sẵn sàng
                </div>
              </div>

              {players.length === 0 ? (
                <div className="text-center py-6 text-gray-400 font-bold text-sm">
                  Đang tải danh sách người chơi...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto p-1">
                  {players.map((p) => {
                    const isMe = p.playerId === roomInfo?.playerId;
                    const isReady = isMe ? isSelfReady : !!readyPlayers[p.playerId];
                    return (
                      <div
                        key={p.playerId}
                        className={`flex items-center gap-2.5 p-2.5 rounded-[18px] border-2 transition-all ${
                          isMe
                            ? "bg-teal-50/80 border-teal-400 shadow-sm"
                            : "bg-white border-gray-100"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 text-white ${
                            isReady ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                        >
                          {p.nickname.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-xs text-gray-900 truncate">
                            {p.nickname} {isMe && <span className="text-teal-600 font-extrabold">(Bạn)</span>}
                          </div>
                          <div className="text-[10px] font-bold">
                            {isReady ? (
                              <span className="text-emerald-600 flex items-center gap-0.5">
                                <Check size={11} className="stroke-[3]" /> Sẵn sàng
                              </span>
                            ) : (
                              <span className="text-gray-400">Chưa sẵn sàng</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            PLAYING STATE (CÂU HỎI & TRẢ LỜI CHUẨN HOẶC HOÀN THÀNH TỰ LUYỆN)
        ════════════════════════════════════════════════════════════ */}
        {isPacedFinished && !viewLobbyWhilePacedFinished ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up py-8">
            <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-[30px] border-4 border-amber-600 shadow-xl flex items-center justify-center mx-auto mb-6">
              <Trophy size={48} className="text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
              Chúc Mừng! Bạn Đã Hoàn Thành Bài Thi!
            </h2>
            <p className="text-base font-bold text-gray-600 mb-6 max-w-md">
              Đã nộp toàn bộ {allQuizSlides.length} câu hỏi. Tiến độ và điểm số của bạn đã được cập nhật trực tiếp lên hệ thống phòng!
            </p>
            <div className="bg-white/90 border-4 border-teal-200 p-6 rounded-[28px] shadow-md max-w-sm w-full mb-8">
              <div className="text-xs font-black uppercase text-teal-800/70 mb-1">Tổng điểm đạt được</div>
              <div className="text-4xl font-black text-teal-700">{pacedScore} đ</div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center">
              <ActionButton
                onClick={() => setViewLobbyWhilePacedFinished(true)}
                variant="secondary"
                label="Quay Về Phòng Chờ"
                className="w-full sm:w-auto"
              />
              <ActionButton
                onClick={() => router.push("/play")}
                variant="primary"
                label="Thoát Phòng"
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        ) : isPlaying ? (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col h-screen overflow-hidden select-none">
            <MultiplayerArenaLayout
              viewMode="player"
              themeId={(roomInfo as any)?.theme || (roomInfo as any)?.gameModeTheme || "SPEED_RACER"}
              players={effectiveArenaPlayers}
              currentUserId={roomInfo?.playerId || (roomInfo as any)?.roomPlayerId}
              currentSlide={displaySlide}
              slideTimeLeft={isPacedMode ? slideTimeRemaining : slideTimeLeft}
              hasAnswered={hasAnswered}
              answerResult={answerResult}
              onSubmitQuiz={(optionId) => submitQuizChoice(optionId)}
              onSubmitBlank={(answer) => {
                setBlankAnswer(answer);
                const targetSlide = displaySlide;
                const targetSlideId = targetSlide?.slideId || targetSlide?.id;
                if (!answer.trim() || hasAnswered || !targetSlide || !targetSlideId) return;
                setHasAnswered(true);
                const timeLimit = targetSlide.timeLimit || 30;
                const elapsedMs = isPacedMode ? 1500 : Math.max(0, (timeLimit - (slideTimeLeft || 0)) * 1000);
                hubSubmitAnswer(targetSlideId, {
                  answerData: answer.trim(),
                  responseTimeMs: elapsedMs,
                });
              }}
              onSubmitMatching={(pairs) => {
                const targetSlide = displaySlide;
                const targetSlideId = targetSlide?.slideId || targetSlide?.id;
                if (hasAnswered || !targetSlide || !targetSlideId) return;
                setHasAnswered(true);
                const timeLimit = targetSlide.timeLimit || 30;
                const elapsedMs = isPacedMode ? 1500 : Math.max(0, (timeLimit - (slideTimeLeft || 0)) * 1000);
                hubSubmitAnswer(targetSlideId, {
                  answerData: JSON.stringify(pairs),
                  responseTimeMs: elapsedMs,
                });
              }}
              onSubmitWordCloud={(word) => {
                const targetSlide = displaySlide;
                const targetSlideId = targetSlide?.slideId || targetSlide?.id;
                if (!word.trim() || hasAnswered || !targetSlide || !targetSlideId) return;
                setHasAnswered(true);
                const timeLimit = targetSlide.timeLimit || 30;
                const elapsedMs = isPacedMode ? 1500 : Math.max(0, (timeLimit - (slideTimeLeft || 0)) * 1000);
                hubSubmitAnswer(targetSlideId, {
                  answerData: word.trim(),
                  responseTimeMs: elapsedMs,
                });
              }}
              isPacedMode={isPacedMode}
              onPacedNext={handlePacedNext}
              isLastQuestion={isPacedMode && pacedSlideIndex >= allQuizSlides.length - 1}
              pinCode={pinCode}
              playerNickname={roomInfo?.playerNickname || "Bạn"}
              roomMode={roomMode}
              onToggleQA={() => setShowQA(true)}
              qaCount={questions.length}
            />
          </div>
        ) : null}



        {/* ════════════════════════════════════════════════════════════
            ANSWER REJECTED STATE (KHI CÂU TRẢ LỜI BỊ TỪ CHỐI)
        ════════════════════════════════════════════════════════════ */}
        {answerRejected && !answerResult && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up py-8">
            <div className="w-28 h-28 bg-rose-500 text-white rounded-[32px] border-4 border-rose-700 shadow-[0_8px_0_0_#be123c] flex items-center justify-center mb-6 transform rotate-3">
              <X size={60} strokeWidth={4} />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-rose-700 mb-3 tracking-tight">
              {answerRejected.reason === "EXPIRED" ? "Đã Hết Thời Gian!" : "Không Thể Ghi Nhận"}
            </h2>
            <p className="text-base font-bold text-gray-700 bg-white/95 px-6 py-3.5 rounded-2xl border-2 border-rose-200 shadow-sm max-w-md">
              {answerRejected.message || "Đã quá thời gian quy định cho câu hỏi này."}
            </p>
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

      {/* ── MODAL HỎI ĐÁP (Q&A) (ẨN NÚT NỔI KHI ĐANG THI ĐẤU ĐỂ TRÁNH CHE NÚT NỘP BÀI) ── */}
      {isConnected && !error && (
        <>
          {!isPlaying && (
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
          )}

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
                        className={`p-4 rounded-2xl flex items-start justify-between gap-3 border transition-all ${
                          q.isPinned
                            ? "bg-amber-50 border-amber-300 shadow-sm"
                            : q.isResolved
                            ? "bg-gray-50 border-gray-200 opacity-70"
                            : "bg-white border-teal-100 shadow-sm"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {q.isPinned && (
                              <span className="text-[10px] font-black uppercase bg-amber-400 text-amber-950 px-2 py-0.5 rounded-md">
                                📌 Đang Ghim
                              </span>
                            )}
                            {q.isResolved && (
                              <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                ✓ Đã Giải Đáp
                              </span>
                            )}
                            <span className="text-[11px] text-teal-800 font-bold">{q.playerNickname}</span>
                          </div>
                          <p className="font-bold text-teal-950 text-sm leading-relaxed">{q.content}</p>
                        </div>
                        <button
                          onClick={() => upvoteQuestion(q.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-teal-200 rounded-xl text-teal-800 font-bold text-xs hover:bg-teal-50 shadow-sm shrink-0"
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
                    if (!qaText.trim() || !roomInfo?.playerId) return;
                    askQuestion(roomInfo.playerId, qaText.trim());
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
      {/* ── Overlay Modal khi Chủ Phòng Đóng Phòng Thi ── */}
      {isRoomClosed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-[36px] border-4 border-teal-200 p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-scale-up">
            <div className="w-20 h-20 bg-teal-50 text-teal-700 rounded-3xl mx-auto flex items-center justify-center shadow-inner border-2 border-teal-200">
              <LogOut size={36} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Phòng Thi Đã Đóng</h3>
            <p className="text-sm font-bold text-gray-600 leading-relaxed">
              {roomClosedMessage || "Chủ phòng đã đóng phòng thi đấu. Cảm ơn bạn đã tham gia buổi học hôm nay!"}
            </p>
            <div className="pt-2">
              <ActionButton
                onClick={() => router.push("/")}
                variant="primary"
                label="Trở Về Trang Chủ"
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
