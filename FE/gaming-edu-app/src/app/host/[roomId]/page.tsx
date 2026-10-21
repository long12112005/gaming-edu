"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import confetti from "canvas-confetti";
import { useGameHub } from "@/hooks/useGameHub";
import { useQAHub } from "@/hooks/useQAHub";
import {
  Users,
  Play,
  Trophy,
  ChevronRight,
  Copy,
  Check,
  ArrowRight,
  Medal,
  Crown,
  LogOut,
  Zap,
  MessageCircle,
  Pin,
  CheckCircle,
  EyeOff,
  Home,
  X,
  Sparkles,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ─── Component Nút bấm 3D phong cách UI/UX Pro Max ───────────────────────────
function ActionButton({
  icon: Icon,
  label,
  variant = "primary",
  onClick,
  disabled,
  loading,
  fullWidth,
  className = "",
  id,
}: any) {
  const baseClasses = `relative flex items-center justify-center gap-2 font-900 rounded-[20px] border-4 transition-all duration-200 active:translate-y-2 ${
    fullWidth ? "w-full py-4 text-lg" : "px-6 py-3"
  } ${className}`;
  
  const variants: any = {
    primary: "bg-violet-500 border-violet-700 text-white shadow-[0_6px_0_0_#5b21b6] hover:bg-violet-600 active:shadow-none",
    secondary: "bg-pink-500 border-pink-700 text-white shadow-[0_6px_0_0_#be185d] hover:bg-pink-600 active:shadow-none",
    outline: "bg-white border-gray-200 text-gray-700 shadow-[0_6px_0_0_#e5e7eb] hover:bg-gray-50 active:shadow-none",
    danger: "bg-red-500 border-red-700 text-white shadow-[0_6px_0_0_#b91c1c] hover:bg-red-600 active:shadow-none",
    disabled: "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed shadow-[0_6px_0_0_#9ca3af]",
  };

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${disabled ? variants.disabled : variants[variant]}`}
    >
      {loading ? (
         <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
         Icon && <Icon size={20} className={disabled ? "text-gray-400" : "text-current"} />
      )}
      {label}
    </button>
  );
}

// ─── Leaderboard Entry ─────────────────────────────────────────────────────────
function LeaderboardEntry({
  player,
  rank,
}: {
  player: any;
  rank: number;
}) {
  const rankStyles = [
    {
      bg: "bg-yellow-400 border-yellow-600",
      text: "text-yellow-900",
      icon: <Crown size={16} className="text-yellow-900" />,
    },
    {
      bg: "bg-gray-300 border-gray-500",
      text: "text-gray-800",
      icon: <Medal size={16} className="text-gray-800" />,
    },
    {
      bg: "bg-amber-500 border-amber-700",
      text: "text-amber-900",
      icon: <Medal size={16} className="text-amber-900" />,
    },
  ];
  const style = rankStyles[rank - 1] ?? { bg: "bg-gray-100 border-gray-300", text: "text-gray-700", icon: null };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-[20px] transition-all animate-fade-in-up border-4 ${
        rank === 1 ? "bg-yellow-50 border-yellow-200 shadow-sm" : "bg-white border-transparent hover:border-gray-100 hover:bg-gray-50"
      }`}
    >
      <div
        className={`w-12 h-12 rounded-[16px] flex items-center justify-center font-900 text-lg border-2 shadow-sm flex-shrink-0 ${style.bg} ${style.text}`}
      >
        {style.icon ?? rank}
      </div>
      <img
        src={
          player.avatarUrl ??
          `https://ui-avatars.com/api/?name=${player.nickname}&background=7c3aed&color=fff&size=40`
        }
        alt={player.nickname}
        className="w-12 h-12 rounded-[16px] border-2 border-gray-200 shadow-sm flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="font-900 text-gray-900 text-lg truncate">
          {player.nickname}
        </div>
      </div>
      <div className="font-900 text-violet-600 text-xl tabular-nums bg-violet-50 px-4 py-1.5 rounded-xl border-2 border-violet-100">
        {player.totalScore?.toLocaleString("vi-VN")} pts
      </div>
    </div>
  );
}

// ─── Player Avatar Chip ────────────────────────────────────────────────────────
function PlayerChip({ player, index }: { player: any; index: number }) {
  return (
    <div
      className="flex flex-col items-center gap-2 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative">
         <img
         src={
            player.avatarUrl ??
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.nickname}`
         }
         alt={player.nickname}
         className="w-16 h-16 rounded-[20px] border-4 border-violet-200 shadow-[4px_4px_0_0_#ddd6fe] bg-white"
         />
         <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-400 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
            <Check size={12} className="text-white font-900"/>
         </div>
      </div>
      <span className="text-sm font-900 text-gray-700 max-w-[80px] truncate bg-white px-2 py-0.5 rounded-lg border-2 border-gray-100 shadow-sm mt-1">
        {player.nickname}
      </span>
    </div>
  );
}

// ─── Main Host Page ────────────────────────────────────────────────────────────
export default function HostLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const {
    isConnected,
    gameState,
    players,
    currentSlide,
    leaderboard,
    slideTimeLeft,
    answerProgress,
    distribution,
    joinRoom,
    hostJoinRoom,
    roomInfo,
    startGame: hubStartGame,
    nextSlide: hubNextSlide,
    endGame: hubEndGame,
  } = useGameHub();

  const {
    questions,
    pinQuestion,
    hideQuestion,
    resolveQuestion,
  } = useQAHub(roomId);

  const [pinCode, setPinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showQA, setShowQA] = useState(false);

  // ── Init SignalR ─────────────────────────────────────────────────────────
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    if (isConnected) {
      const urlParams = new URLSearchParams(window.location.search);
      const pin = urlParams.get("pin");
      if (pin) {
        setPinCode(pin);
        const userStr = Cookies.get("user");
        const user = userStr ? JSON.parse(userStr) : null;
        if (hostJoinRoom) {
          hostJoinRoom(pin);
        } else {
          joinRoom(pin, user?.nickname ?? "Host");
        }
      }
    }
  }, [isConnected, hostJoinRoom, joinRoom]);

  useEffect(() => {
    if (gameState === "FINISHED") {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#7c3aed', '#f59e0b', '#10b981']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#7c3aed', '#f59e0b', '#10b981']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [gameState]);

  // ── Auto-Advance State & Logic ──────────────────────────────────────────
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const isTriggeringNextRef = useRef(false);
  const currentSlideIdRef = useRef<string | null>(null);

  // Reset cờ và countdown khi sang slide mới
  useEffect(() => {
    if (currentSlide?.slideId && currentSlide.slideId !== currentSlideIdRef.current) {
      currentSlideIdRef.current = currentSlide.slideId;
      isTriggeringNextRef.current = false;
      setAutoAdvanceCountdown(null);
    }
  }, [currentSlide?.slideId]);

  // Kiểm tra câu hỏi hiện tại đã hoàn thành hay chưa
  const isSlideFinished = useMemo(() => {
    if (!currentSlide || (gameState !== "PLAYING" && gameState !== "LEADERBOARD")) {
      return false;
    }
    // Hết thời gian câu hỏi
    const timeUp = slideTimeLeft !== null && slideTimeLeft <= 0;
    // Hoặc toàn bộ người chơi trong phòng đã nộp bài
    const allAnswered = Boolean(
      answerProgress &&
      players.length > 0 &&
      answerProgress.answeredCount >= players.length
    );

    return Boolean(timeUp || allAnswered);
  }, [currentSlide, gameState, slideTimeLeft, answerProgress, players.length]);

  // Quản lý đếm ngược và tự động chuyển câu hỏi
  useEffect(() => {
    if (!isSlideFinished || isTriggeringNextRef.current) {
      return;
    }

    // Đếm ngược 3 giây để người chơi và host xem đáp án + hiệu ứng điểm số
    setAutoAdvanceCountdown(3);

    const interval = setInterval(() => {
      setAutoAdvanceCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          if (!isTriggeringNextRef.current) {
            isTriggeringNextRef.current = true;
            hubNextSlide(roomId);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSlideFinished, roomId, hubNextSlide]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const startGame = async () => {
    if (players.length === 0) return;
    setStarting(true);
    await hubStartGame(roomId);
    setTimeout(() => setStarting(false), 2000);
  };

  const nextSlide = useCallback(() => {
    if (isTriggeringNextRef.current) return;
    isTriggeringNextRef.current = true;
    setAutoAdvanceCountdown(null);
    hubNextSlide(roomId);
  }, [hubNextSlide, roomId]);

  const endGame = () => {
    if (!confirm("Bạn chắc chắn muốn kết thúc trò chơi?")) return;
    hubEndGame(roomId);
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/rooms/${roomId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Room_${roomId}_Report.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert("Xuất báo cáo thất bại.");
    } finally {
      setExporting(false);
    }
  };

  const copyPin = () => {
    navigator.clipboard.writeText(pinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play?pin=${pinCode}`
      : "";

  if (!pinCode) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans relative overflow-hidden">
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: "url('/bg-cloud-valley.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="fixed inset-0 z-0" style={{ background: "rgba(240,249,246,0.65)" }} />
        <div className="relative z-10 flex flex-col items-center gap-6 p-10 bg-white/80 backdrop-blur-xl rounded-[40px] border border-white/80 shadow-[0_16px_40px_rgba(8,38,42,0.12)] text-center max-w-md mx-4">
          <div className="w-24 h-24 bg-red-100 border-2 border-red-200 rounded-[24px] flex items-center justify-center transform rotate-6">
            <span className="text-5xl">⚠️</span>
          </div>
          <div>
            <h2 className="font-900 text-3xl text-gray-900 mb-2">Thiếu mã PIN</h2>
            <p className="text-lg text-gray-600 font-semibold">
              Phòng chơi này cần có mã PIN trên URL.
            </p>
          </div>
          <ActionButton
            variant="primary"
            onClick={() => router.push("/dashboard")}
            label="Về Dashboard"
            icon={Home}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#1B2A2E] flex flex-col font-sans relative overflow-hidden">
      {/* Landscape background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-cloud-valley.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* White fog overlay */}
      <div className="fixed inset-0 z-0" style={{ background: "rgba(240,249,246,0.65)" }} />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="bg-white/75 backdrop-blur-xl border-b border-teal-500/20 shadow-sm sticky top-0 z-40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-[16px] flex items-center justify-center shadow-md">
              <Trophy size={24} className="text-white" />
            </div>
            <div>
              <div className="font-900 text-gray-900 text-xl tracking-tight flex items-center gap-2.5">
                <span>Màn Hình Trình Chiếu (Host)</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-900 border bg-violet-100 text-violet-700 border-violet-200">
                  <span>🎯</span>
                  <span>Trực Tiếp</span>
                </span>
              </div>
              <div className="text-sm font-700 text-gray-500">
                {gameState === "WAITING" && "Đang chờ người chơi vào phòng"}
                {gameState === "STARTING" && "Chuẩn bị bắt đầu..."}
                {(gameState === "PLAYING" || gameState === "LEADERBOARD") &&
                  `Câu ${currentSlide?.index !== undefined ? currentSlide.index + 1 : "?"} đang diễn ra`}
                {gameState === "FINISHED" && "Trò chơi đã kết thúc"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-emerald-50 text-emerald-700 border-2 border-emerald-300 text-xs font-black shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <Zap size={14} className="text-emerald-500 fill-emerald-500" />
              <span>Tự Động Chuyển Câu</span>
            </div>

            <ActionButton
              variant="outline"
              onClick={() => router.push("/")}
              icon={LogOut}
              label="Thoát Màn Hình"
              className="hidden sm:flex"
            />
          </div>
        </div>
      </header>

      {/* ── AUTO ADVANCE FLOATING TOAST BANNER ─────────────────────────── */}
      {autoAdvanceCountdown !== null && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-full shadow-[0_12px_36px_rgba(245,158,11,0.5)] border-2 border-white flex items-center gap-3 animate-bounce">
          <Sparkles className="animate-spin text-teal-950" size={20} />
          <span className="text-sm sm:text-base">
            Đã hoàn thành câu hỏi! Tự động chuyển câu sau <span className="text-xl font-mono underline font-black">{autoAdvanceCountdown}s</span>
          </span>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 relative z-10">
        {/* ════════════════════════════════════════════════════════════
            LOBBY STATE (CHỜ NGƯỜI CHƠI)
        ════════════════════════════════════════════════════════════ */}
        {gameState === "WAITING" && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Room Info Banner */}
            <div className="bg-white rounded-[32px] border-4 border-violet-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] p-6 relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-500 flex items-center justify-center text-3xl shadow-lg shrink-0">
                    🎮
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-900 tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                        Phòng Chơi Trực Tiếp
                      </span>
                    </div>
                    <h2 className="text-2xl font-900 text-gray-900">
                      {roomInfo?.quizTitle || "Trận Đấu Trắc Nghiệm"}
                    </h2>
                    <p className="text-sm font-semibold text-gray-600 mt-1 max-w-2xl">
                      Chia sẻ mã PIN hoặc quét mã QR bên dưới để người chơi tham gia vào phòng.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border-2 border-slate-200/80 rounded-2xl px-4 py-2.5 max-w-xs shrink-0 w-full md:w-auto">
                  <div className="text-[10px] font-800 text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Zap size={12} className="text-amber-500" />
                    Trạng Thái Phòng
                  </div>
                  <div className="text-xs font-bold text-slate-700 leading-snug">
                    Đang chờ người chơi kết nối ({players.length} người)
                  </div>
                </div>
              </div>
            </div>

            {/* PIN Display Card (Khối hiển thị mã PIN bự chà bá) */}
            <div className="bg-white rounded-[40px] border-4 border-violet-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05),_inset_-4px_-4px_8px_rgba(0,0,0,0.02)] p-10 text-center relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              
              <div className="flex-1 text-left relative z-10 space-y-4">
                <div className="inline-block bg-violet-100 border-2 border-violet-200 text-violet-800 font-900 px-4 py-2 rounded-2xl uppercase tracking-widest text-sm shadow-sm">
                  Truy cập bằng điện thoại
                </div>
                <div className="text-4xl md:text-5xl font-900 text-gray-900 tracking-tight">
                  <span className="text-gray-400 font-700">Tại </span> 
                  {typeof window !== "undefined" ? window.location.origin : ""}/play
                </div>
              </div>

              <div className="bg-violet-600 rounded-[32px] border-4 border-violet-800 shadow-[0_8px_0_0_#4c1d95] p-8 text-center relative z-10 w-full md:w-auto">
                 <p className="text-violet-200 font-800 text-sm uppercase tracking-widest mb-2">
                  Nhập Mã PIN Này
                 </p>
                 <div className="flex items-center justify-center gap-4">
                   <div className="text-6xl md:text-8xl font-black tracking-[0.1em] text-white drop-shadow-xl">
                     {pinCode}
                   </div>
                   <button
                     onClick={copyPin}
                     className="w-14 h-14 bg-white/20 hover:bg-white/30 rounded-2xl flex items-center justify-center transition-all border-2 border-white/30 active:scale-95"
                     title="Sao chép mã PIN"
                   >
                     {copied ? (
                       <Check size={28} className="text-emerald-400" />
                     ) : (
                       <Copy size={28} className="text-white" />
                     )}
                   </button>
                 </div>
              </div>

              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-400/10 rounded-full blur-3xl -z-0 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl -z-0 pointer-events-none" />
            </div>

            {/* Điều khiển Bắt Đầu */}
            <div className="flex items-center justify-between bg-white rounded-[32px] border-4 border-gray-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 border-2 border-blue-200 rounded-[20px] flex items-center justify-center shadow-inner">
                  <Users size={32} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-4xl font-black text-gray-900 tracking-tight leading-none">
                    {players.length}
                  </div>
                  <div className="text-sm font-800 text-gray-500 uppercase tracking-widest mt-1">Người Đã Tham Gia</div>
                </div>
              </div>

              <ActionButton
                variant="primary"
                onClick={startGame}
                disabled={players.length === 0}
                loading={starting}
                label={players.length === 0 ? "Đợi Người Chơi..." : "BẮT ĐẦU NGAY!"}
                icon={Play}
                className="text-xl px-10 py-5"
              />
            </div>

            {/* Lưới Người Chơi */}
            <div className="bg-white rounded-[40px] border-4 border-gray-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] p-10 min-h-[300px]">
               {players.length > 0 ? (
               <div>
                  <div className="flex flex-wrap gap-8 justify-center">
                     {players.map((p, idx) => (
                     <PlayerChip key={p.playerId ?? idx} player={p} index={idx} />
                     ))}
                  </div>
               </div>
               ) : (
               <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-[24px] border-4 border-dashed border-gray-200 flex items-center justify-center mb-6 animate-pulse">
                     <Users size={40} className="text-gray-300" />
                  </div>
                  <p className="font-900 text-2xl text-gray-700 mb-2">
                     Đang tìm kiếm người chơi...
                  </p>
                  <p className="text-lg font-600 text-gray-500">
                     Hãy nhắc mọi người nhập PIN để vào phòng nhé!
                  </p>
               </div>
               )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            PLAYING STATE (ĐANG CHƠI / TRẢ LỜI CÂU HỎI)
        ════════════════════════════════════════════════════════════ */}
        {/* ════════════════════════════════════════════════════════════
            PLAYING STATE (ĐANG CHƠI / TRẢ LỜI CÂU HỎI)
        ════════════════════════════════════════════════════════════ */}
        {(gameState === "PLAYING" || gameState === "LEADERBOARD" || gameState === "STARTING") && (
          <div className="flex flex-col items-center gap-8 animate-fade-in-up">
            {/* Hiển thị câu hỏi hiện tại trên màn chiếu */}
            {currentSlide ? (
              <div className="w-full bg-white rounded-[40px] shadow-[4px_4px_16px_rgba(0,0,0,0.05)] border-4 border-violet-100 p-8 md:p-14 text-center">
                {/* Header trạng thái câu hỏi */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-violet-100 border-2 border-violet-200 text-violet-700 font-900 px-6 py-2 rounded-2xl uppercase tracking-widest text-sm shadow-sm">
                      Câu hỏi {currentSlide?.index !== undefined ? currentSlide.index + 1 : "?"}
                    </div>
                    <span className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl font-bold text-xs uppercase">
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

                  {/* Tiến độ và thời gian */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 px-4 py-2 rounded-2xl font-black text-sm">
                      <Users size={18} />
                      <span>{answerProgress?.answeredCount ?? 0} / {answerProgress?.totalPlayers ?? players.length} đã trả lời</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 font-black text-2xl px-5 py-1.5 rounded-[16px] border-2 ${
                        slideTimeLeft !== null && slideTimeLeft <= 5
                          ? "bg-rose-100 text-rose-600 border-rose-300 animate-pulse"
                          : "bg-violet-50 text-violet-950 border-violet-200"
                      }`}
                    >
                      <Clock size={22} />
                      <span>{slideTimeLeft ?? 0}s</span>
                    </div>
                  </div>
                </div>

                <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-12 leading-tight tracking-tight max-w-4xl mx-auto">
                  {currentSlide.questionText}
                </h2>
                {currentSlide.options && currentSlide.options.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {currentSlide.options.map((opt: any, idx: number) => {
                      const colors = [
                        "bg-red-500 border-red-700 shadow-[0_6px_0_0_#b91c1c]",
                        "bg-blue-500 border-blue-700 shadow-[0_6px_0_0_#1d4ed8]",
                        "bg-amber-400 border-amber-600 shadow-[0_6px_0_0_#b45309]",
                        "bg-emerald-500 border-emerald-700 shadow-[0_6px_0_0_#047857]",
                      ];
                      const letters = ["A", "B", "C", "D"];
                      const dist = distribution?.answers?.find((a: any) => a.optionId === opt.id);

                      return (
                        <div
                          key={opt.id}
                          className={`${
                            colors[idx % 4]
                          } text-white rounded-[24px] border-4 p-6 text-left flex items-center justify-between gap-4 transform transition-transform hover:-translate-y-1 relative overflow-hidden`}
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl border-2 border-white/30 flex items-center justify-center text-2xl font-black shrink-0 shadow-inner">
                              {letters[idx]}
                            </div>
                            <span className="font-800 text-2xl leading-snug">{opt.content}</span>
                          </div>

                          {dist && (
                            <div className="bg-white/25 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/40 font-black text-xl shrink-0">
                              {dist.count} ({dist.percentage}%)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[40px] shadow-xl border-4 border-gray-100 p-16 text-center w-full max-w-3xl">
                <div className="w-32 h-32 bg-gray-50 rounded-[32px] border-4 border-gray-200 flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <span className="text-6xl">🎮</span>
                </div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">
                  Trò chơi đang diễn ra!
                </h2>
                <p className="text-xl font-700 text-gray-500 mt-4">
                  Người chơi hãy nhìn lên màn hình này.
                </p>
              </div>
            )}

            {/* Bảng xếp hạng thu gọn trực tiếp */}
            {leaderboard.length > 0 && (
              <div className="w-full max-w-3xl bg-white rounded-[32px] border-4 border-gray-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] p-8">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Trophy size={20} className="text-amber-600" />
                   </div>
                   <h3 className="text-xl font-900 text-gray-900 tracking-tight">
                     Top Người Chơi Hiện Tại
                   </h3>
                </div>
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((p, idx) => (
                    <div
                      key={p.playerId ?? idx}
                      className="flex items-center gap-4 bg-gray-50 border-2 border-gray-100 p-3 rounded-2xl"
                    >
                      <div className="w-10 h-10 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center font-900 text-gray-500">
                         {idx + 1}
                      </div>
                      <span className="flex-1 font-900 text-lg text-gray-900 truncate">
                        {p.nickname}
                      </span>
                      <span className="font-black text-xl text-violet-600 bg-violet-100 px-4 py-1.5 rounded-xl border-2 border-violet-200">
                        {p.totalScore?.toLocaleString("vi-VN")} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bộ Điều Khiển Host */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-3xl bg-white rounded-3xl border-2 border-gray-100 p-4 px-6 shadow-sm">
              <div className="text-sm font-bold text-gray-600 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span>Trận đấu đang diễn ra • {players.length} người chơi</span>
              </div>
              <div className="flex items-center gap-3">
                <ActionButton
                  variant="primary"
                  onClick={nextSlide}
                  label="Câu Tiếp Theo"
                  icon={Play}
                />
                <ActionButton
                  variant="danger"
                  onClick={endGame}
                  label="Kết Thúc Trò Chơi"
                  icon={X}
                />
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            ENDED STATE (KẾT THÚC)
        ════════════════════════════════════════════════════════════ */}
        {gameState === "FINISHED" && (
          <div className="flex flex-col items-center gap-8 animate-fade-in-up pb-10">
            {/* Podium (Bục Vinh Quang) */}
            <div className="bg-white rounded-[40px] border-4 border-yellow-200 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] p-12 text-center w-full max-w-4xl relative overflow-hidden flex flex-col items-center">
               <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-amber-100 opacity-50" />
               <div className="relative z-10">
                  <div className="w-24 h-24 bg-yellow-400 border-4 border-yellow-500 rounded-[24px] shadow-[0_8px_0_0_#b45309] flex items-center justify-center mx-auto mb-6 transform -rotate-6 hover:rotate-0 transition-transform">
                     <span className="text-5xl">🏆</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-yellow-800 mb-4 tracking-tight">
                     Bục Vinh Quang
                  </h1>
                  <p className="text-xl font-800 text-yellow-700/80">
                     Trò chơi đã kết thúc. Xin chúc mừng tất cả người chơi!
                  </p>
               </div>
            </div>

            {/* Bảng Xếp Hạng Đầy Đủ */}
            <div className="w-full max-w-4xl bg-white rounded-[40px] shadow-[4px_4px_16px_rgba(0,0,0,0.05)] border-4 border-gray-100 p-8">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b-4 border-gray-100">
                <div className="w-12 h-12 bg-gray-100 rounded-[16px] flex items-center justify-center">
                   <Users size={24} className="text-gray-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex-1">Bảng Xếp Hạng Cuối Cùng</h2>
                <span className="font-800 text-lg text-gray-500 bg-gray-100 px-4 py-2 rounded-xl border-2 border-gray-200">
                  {leaderboard.length} người chơi
                </span>
              </div>
              
              <div className="space-y-4">
                {leaderboard.length === 0 ? (
                  <div className="text-center bg-gray-50 rounded-[24px] border-2 border-dashed border-gray-200 py-12">
                     <p className="font-800 text-gray-400 text-xl">Không có dữ liệu người chơi 😢</p>
                  </div>
                ) : (
                  leaderboard.map((player, idx) => (
                    <LeaderboardEntry
                      key={player.playerId ?? idx}
                      player={player}
                      rank={idx + 1}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Nút Xuất Báo Cáo */}
            <div className="flex gap-4 w-full max-w-4xl">
              <ActionButton
                variant="primary"
                fullWidth
                onClick={exportReport}
                loading={exporting}
                label="Xuất Báo Cáo Excel"
              />
              <ActionButton
                variant="outline"
                fullWidth
                onClick={() => router.push("/dashboard")}
                label="Về Dashboard"
                icon={Home}
              />
            </div>
          </div>
        )}
      </main>

      {/* Q&A Floating Button for Host */}
      <button
         onClick={() => setShowQA(true)}
         className="fixed bottom-8 right-8 w-16 h-16 bg-violet-600 text-white rounded-[24px] border-4 border-violet-800 shadow-[0_6px_0_0_#4c1d95] active:translate-y-2 active:shadow-none flex items-center justify-center transition-all z-40 hover:bg-violet-500"
      >
         <MessageCircle size={28} />
         {questions.filter(q => !q.isResolved).length > 0 && (
            <span className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 border-4 border-white rounded-full text-sm font-black flex items-center justify-center shadow-md">
               {questions.filter(q => !q.isResolved).length}
            </span>
         )}
      </button>

      {/* Host Q&A Modal */}
      {showQA && (
         <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-fade-in-up">
            <div className="bg-white max-w-4xl w-full h-[85vh] rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] border-4 border-violet-100 overflow-hidden flex flex-col">
               
               {/* Modal Header */}
               <div className="bg-violet-50 p-6 flex items-center justify-between border-b-4 border-violet-100 shrink-0">
                  <h3 className="font-900 text-gray-900 text-2xl flex items-center gap-3 tracking-tight">
                     <div className="w-12 h-12 bg-white rounded-[16px] border-2 border-violet-200 flex items-center justify-center">
                        <MessageCircle size={24} className="text-violet-600" />
                     </div>
                     Quản Lý Hỏi Đáp (Q&A)
                  </h3>
                  <button onClick={() => setShowQA(false)} className="w-12 h-12 bg-white border-2 border-gray-200 text-gray-500 rounded-2xl hover:bg-gray-100 flex items-center justify-center transition-colors">
                     <X size={24} />
                  </button>
               </div>

               {/* Modal Body */}
               <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#F4F1FA]">
                  {questions.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-white rounded-[32px] border-4 border-dashed border-gray-200 flex items-center justify-center mb-6">
                           <MessageCircle size={40} className="text-gray-300" />
                        </div>
                        <h4 className="font-900 text-xl text-gray-900 mb-2">Chưa có câu hỏi nào</h4>
                        <p className="font-600 text-gray-500">Khuyến khích mọi người đặt câu hỏi trong lúc chơi nhé!</p>
                     </div>
                  ) : (
                     questions
                        .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.upvotes - a.upvotes)
                        .map(q => (
                        <div key={q.id} className={`bg-white p-6 rounded-[24px] border-4 shadow-sm transition-all ${q.isPinned ? 'border-amber-300 bg-amber-50' : 'border-gray-100'} ${q.isResolved ? 'opacity-60 grayscale' : ''}`}>
                           <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="font-900 text-lg text-gray-900">{q.playerNickname}</div>
                                 <div className="text-sm font-800 text-violet-700 bg-violet-100 px-3 py-1 rounded-xl border-2 border-violet-200 shadow-sm">{q.upvotes} Lượt thích</div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button 
                                    onClick={() => pinQuestion(q.id, !q.isPinned)}
                                    title={q.isPinned ? "Bỏ ghim" : "Ghim câu hỏi"}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl border-2 transition-colors ${q.isPinned ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-200'}`}
                                 >
                                    <Pin size={18} />
                                 </button>
                                 {!q.isResolved && (
                                    <button 
                                       onClick={() => resolveQuestion(q.id)}
                                       title="Đánh dấu đã trả lời"
                                       className="w-10 h-10 flex items-center justify-center bg-green-50 hover:bg-green-100 text-green-600 border-2 border-green-200 rounded-xl transition-colors"
                                    >
                                       <CheckCircle size={18} />
                                    </button>
                                 )}
                                 <button 
                                    onClick={() => hideQuestion(q.id)}
                                    title="Ẩn câu hỏi"
                                    className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 rounded-xl transition-colors"
                                 >
                                    <EyeOff size={18} />
                                 </button>
                              </div>
                           </div>
                           <p className="text-gray-800 font-700 text-lg">{q.content}</p>
                           {q.isResolved && (
                              <div className="mt-4 inline-flex items-center gap-2 bg-green-100 border-2 border-green-200 px-3 py-1.5 rounded-lg text-sm font-900 text-green-700">
                                 <CheckCircle size={16} /> Đã giải quyết
                              </div>
                           )}
                        </div>
                     ))
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
