"use client";

import { useEffect, useState } from "react";
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
  Lock,
  Unlock,
  Clock,
  Sparkles,
  UserX,
  Cloud,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

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
    primary:
      "bg-violet-600 hover:bg-violet-500 border-violet-800 text-white shadow-[0_6px_0_0_#4c1d95] active:shadow-none",
    secondary:
      "bg-amber-400 hover:bg-amber-300 border-amber-600 text-amber-950 shadow-[0_6px_0_0_#b45309] active:shadow-none",
    success:
      "bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white shadow-[0_6px_0_0_#047857] active:shadow-none",
    danger:
      "bg-rose-500 hover:bg-rose-400 border-rose-700 text-white shadow-[0_6px_0_0_#be123c] active:shadow-none",
    outline:
      "bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-[0_6px_0_0_#e5e7eb] active:shadow-none",
    teal:
      "bg-teal-500 hover:bg-teal-400 border-teal-700 text-white shadow-[0_6px_0_0_#0f766e] active:shadow-none",
  };

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${
        disabled ? "opacity-50 cursor-not-allowed filter grayscale" : ""
      }`}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && <Icon size={20} className="stroke-[2.5]" />
      )}
      <span>{label}</span>
    </button>
  );
}

// ─── Bảng Hạng Player Hàng ──────────────────────────────────────────────────
function PlayerRow({ player, rank }: { player: any; rank: number }) {
  const rankStyles = [
    { bg: "bg-amber-400 border-amber-600", text: "text-amber-950", icon: <Crown size={24} className="fill-amber-950 text-amber-950" /> },
    { bg: "bg-slate-300 border-slate-400", text: "text-slate-800", icon: <Medal size={24} className="text-slate-800" /> },
    { bg: "bg-amber-700 border-amber-900", text: "text-amber-100", icon: <Medal size={24} className="text-amber-100" /> },
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

// ─── Player Avatar Chip (có nút kick) ─────────────────────────────────────────
function PlayerChip({
  player,
  index,
  onKick,
}: {
  player: any;
  index: number;
  onKick?: (playerId: string) => void;
}) {
  return (
    <div
      className="group relative flex flex-col items-center gap-2 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative">
        <img
          src={
            player.avatarUrl ??
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.nickname}`
          }
          alt={player.nickname}
          className="w-16 h-16 rounded-[20px] border-4 border-violet-200 shadow-[4px_4px_0_0_#ddd6fe] bg-white object-cover"
        />
        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-400 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
          <Check size={12} className="text-white font-900" />
        </div>

        {/* Nút kick khi hover */}
        {onKick && (
          <button
            onClick={() => onKick(player.playerId)}
            className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 hover:bg-rose-600 text-white rounded-full border-2 border-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Mời ra khỏi phòng"
          >
            <X size={14} className="stroke-[3]" />
          </button>
        )}
      </div>
      <span className="text-sm font-900 text-gray-700 max-w-[90px] truncate bg-white px-2 py-0.5 rounded-lg border-2 border-gray-100 shadow-sm mt-1 text-center">
        {player.nickname}
      </span>
    </div>
  );
}

// ─── Word Cloud Visualizer Component ─────────────────────────────────────────
function WordCloudDisplay({ wordData }: { wordData: Record<string, number> }) {
  const entries = Object.entries(wordData);

  if (entries.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400 font-bold bg-gray-50 rounded-[32px] border-4 border-dashed border-gray-200">
        <Cloud size={48} className="mx-auto mb-3 text-gray-300 animate-pulse" />
        <p className="text-xl">Đang chờ thí sinh gửi từ khóa lên...</p>
      </div>
    );
  }

  const maxCount = Math.max(...entries.map(([, count]) => count), 1);
  const colorPalette = [
    "text-teal-600 bg-teal-50 border-teal-200",
    "text-violet-600 bg-violet-50 border-violet-200",
    "text-amber-600 bg-amber-50 border-amber-200",
    "text-rose-600 bg-rose-50 border-rose-200",
    "text-blue-600 bg-blue-50 border-blue-200",
    "text-emerald-600 bg-emerald-50 border-emerald-200",
    "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200",
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 p-8 bg-gradient-to-br from-violet-50/50 to-teal-50/50 rounded-[32px] border-4 border-violet-100 min-h-[220px]">
      {entries.map(([word, count], idx) => {
        const ratio = count / maxCount;
        const fontSizeClass =
          ratio > 0.8
            ? "text-4xl md:text-5xl font-black py-3 px-6"
            : ratio > 0.5
            ? "text-2xl md:text-3xl font-extrabold py-2 px-5"
            : ratio > 0.3
            ? "text-xl md:text-2xl font-bold py-2 px-4"
            : "text-base md:text-lg font-semibold py-1.5 px-3";

        const colorClass = colorPalette[idx % colorPalette.length];

        return (
          <span
            key={word}
            className={`inline-flex items-center gap-2 rounded-2xl border-2 shadow-sm transition-transform hover:scale-110 duration-200 ${fontSizeClass} ${colorClass}`}
          >
            <span>{word}</span>
            <span className="text-xs bg-black/10 px-2 py-0.5 rounded-full font-mono">
              {count}
            </span>
          </span>
        );
      })}
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
    roomInfo,
    players,
    gameState,
    currentSlide,
    countdown,
    slideTimeLeft,
    leaderboard,
    wordCloudData,
    hostJoinRoom,
    startGame: hubStartGame,
    nextSlide: hubNextSlide,
    endGame: hubEndGame,
    lockRoom: hubLockRoom,
    kickPlayer: hubKickPlayer,
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [invitingGroupId, setInvitingGroupId] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState<string>("");

  const pinnedQuestion = questions.find((q) => q.isPinned && !q.isResolved);

  // ── Init SignalR ─────────────────────────────────────────────────────────
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pin = urlParams.get("pin");
    if (pin) {
      setPinCode(pin);
      api.get(`/rooms/pin/${pin}`).then((res) => {
        if (res.data?.success && res.data.data) {
          if (res.data.data.qrCodeBase64) {
            setQrCodeBase64(res.data.data.qrCodeBase64);
          }
          if (res.data.data.quizTitle) {
            setQuizTitle(res.data.data.quizTitle);
          }
        }
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (isConnected && pinCode) {
      // Host gia nhập phòng bằng lệnh HostJoinRoom chuẩn xác
      hostJoinRoom(pinCode);
    }
  }, [isConnected, pinCode, hostJoinRoom]);

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
          colors: ["#7c3aed", "#f59e0b", "#10b981"],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#7c3aed", "#f59e0b", "#10b981"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [gameState]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const startGame = async () => {
    if (players.length === 0) return;
    setStarting(true);
    await hubStartGame(roomId);
    setTimeout(() => setStarting(false), 2000);
  };

  const nextSlide = () => {
    hubNextSlide(roomId);
  };

  const endGame = () => {
    if (!confirm("Bạn chắc chắn muốn kết thúc trò chơi?")) return;
    hubEndGame(roomId);
  };

  const toggleLockRoom = () => {
    const nextLocked = !roomInfo?.isLocked;
    hubLockRoom(nextLocked);
  };

  const handleKickPlayer = (playerId: string) => {
    if (confirm("Bạn có chắc chắn muốn mời người chơi này ra khỏi phòng?")) {
      hubKickPlayer(playerId);
    }
  };

  const openInviteModal = async () => {
    setShowInviteModal(true);
    setInviteFeedback(null);
    try {
      const res = await api.get("/groups");
      setMyGroups(res.data.data || []);
    } catch {
      setMyGroups([]);
    }
  };

  const handleInviteGroup = async (groupId: string) => {
    setInvitingGroupId(groupId);
    setInviteFeedback(null);
    try {
      await api.post(`/rooms/${roomId}/invite-group/${groupId}`);
      setInviteFeedback("Đã gửi lời mời thành công tới toàn bộ thành viên trong nhóm!");
    } catch (err: any) {
      setInviteFeedback(err.response?.data?.message || "Không thể gửi lời mời vào lúc này.");
    } finally {
      setInvitingGroupId(null);
    }
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/rooms/${roomId}/export`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Room_${roomId}_Report.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
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
              <div className="font-900 text-gray-900 text-xl tracking-tight flex items-center gap-2">
                <span>Màn Hình Trình Chiếu (Host)</span>
                {roomInfo?.isLocked && (
                  <span className="text-xs font-black bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-300 flex items-center gap-1">
                    <Lock size={12} /> Đã khóa phòng
                  </span>
                )}
              </div>
              <div className="text-sm font-700 text-gray-500">
                {gameState === "WAITING" && "Đang chờ người chơi vào phòng..."}
                {gameState === "STARTING" && "Chuẩn bị bắt đầu..."}
                {(gameState === "PLAYING" || gameState === "LEADERBOARD") &&
                  `Câu ${currentSlide?.index !== undefined ? currentSlide.index + 1 : "?"} đang diễn ra`}
                {gameState === "FINISHED" && "Trò chơi đã kết thúc"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ActionButton
              variant="outline"
              onClick={() => setShowQA(!showQA)}
              icon={MessageCircle}
              label={`Hỏi Đáp (${questions.length})`}
            />

            <ActionButton
              variant="outline"
              onClick={() => router.push("/dashboard")}
              icon={LogOut}
              label="Thoát"
              className="hidden sm:flex"
            />
          </div>
        </div>
      </header>

      {/* Overlay Countdown 3-2-1 */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="text-center">
            <div className="text-9xl md:text-[14rem] font-black text-amber-400 drop-shadow-[0_12px_24px_rgba(245,158,11,0.5)] animate-bounce">
              {countdown}
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-white uppercase tracking-widest mt-4">
              Chuẩn bị bắt đầu...
            </p>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 relative z-10">
        {/* Banner Câu Hỏi Được Ghim Nổi Bật (Q&A Pin Banner) */}
        {pinnedQuestion && (
          <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-teal-950 px-6 py-4 rounded-[28px] shadow-lg border-4 border-amber-500 mb-8 flex flex-wrap items-center justify-between gap-4 animate-fade-in-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-900 text-amber-300 rounded-2xl flex items-center justify-center font-black shadow-inner shrink-0">
                <Pin size={22} className="rotate-45" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-900 uppercase tracking-widest bg-teal-900 text-amber-300 px-2.5 py-0.5 rounded-lg">
                    Câu Hỏi Đang Ghim
                  </span>
                  <span className="text-sm font-bold text-teal-900">
                    từ {pinnedQuestion.playerNickname}
                  </span>
                </div>
                <p className="text-xl md:text-2xl font-black text-teal-950 mt-1 leading-snug">
                  &quot;{pinnedQuestion.content}&quot;
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-sm font-black bg-white/70 px-4 py-2 rounded-xl text-teal-950 border border-amber-600/30">
                👍 {pinnedQuestion.upvotes} Lượt Thích
              </span>
              <button
                onClick={() => resolveQuestion(pinnedQuestion.id)}
                className="bg-teal-900 hover:bg-teal-800 text-white font-900 text-sm px-5 py-2.5 rounded-xl border-2 border-teal-950 shadow-sm transition-all"
              >
                ✓ Đánh Dấu Đã Giải Đáp
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            LOBBY STATE (CHỜ NGƯỜI CHƠI)
        ════════════════════════════════════════════════════════════ */}
        {gameState === "WAITING" && (
          <div className="space-y-8 animate-fade-in-up">
            {/* PIN Display Card kèm QR Code */}
            <div className="bg-white rounded-[40px] border-4 border-violet-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] p-8 md:p-10 text-center relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-left relative z-10 space-y-3">
                <div className="inline-block bg-violet-100 border-2 border-violet-200 text-violet-800 font-900 px-4 py-2 rounded-2xl uppercase tracking-widest text-sm shadow-sm">
                  {quizTitle ? `Bộ Đề: ${quizTitle}` : "Truy cập bằng điện thoại / máy tính"}
                </div>
                <div className="text-2xl md:text-4xl font-900 text-gray-900 tracking-tight">
                  <span className="text-gray-400 font-700">Tại </span>
                  {typeof window !== "undefined" ? window.location.origin : ""}/play
                </div>
                <p className="text-gray-500 font-bold text-base">
                  Mở trình duyệt nhập PIN hoặc dùng máy ảnh quét mã QR bên phải để vào ngay!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 w-full lg:w-auto justify-center">
                {/* Khung QR Code */}
                {qrCodeBase64 ? (
                  <div className="bg-white p-3 rounded-[28px] border-4 border-violet-200 shadow-md flex flex-col items-center">
                    <img
                      src={`data:image/png;base64,${qrCodeBase64}`}
                      alt="QR Code tham gia phòng"
                      className="w-28 h-28 md:w-32 md:h-32 object-contain"
                    />
                    <span className="text-[11px] font-black uppercase text-violet-700 tracking-wider mt-1.5">
                      Quét Để Vào Phòng
                    </span>
                  </div>
                ) : (
                  <div className="bg-violet-50 p-4 rounded-[28px] border-4 border-dashed border-violet-200 flex flex-col items-center justify-center w-28 h-28 md:w-32 md:h-32 text-center text-xs font-bold text-violet-500">
                    <Sparkles size={24} className="mb-1 text-violet-400" />
                    <span>game.edu</span>
                  </div>
                )}

                {/* Khung Mã PIN */}
                <div className="bg-violet-600 rounded-[32px] border-4 border-violet-800 shadow-[0_8px_0_0_#4c1d95] p-6 md:p-8 text-center w-full sm:w-auto">
                  <p className="text-violet-200 font-800 text-xs md:text-sm uppercase tracking-widest mb-1.5">
                    Mã PIN Tham Gia
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-5xl md:text-7xl font-black tracking-[0.1em] text-white drop-shadow-xl font-mono">
                      {pinCode}
                    </div>
                    <button
                      onClick={copyPin}
                      className="w-12 h-12 md:w-14 md:h-14 bg-white/20 hover:bg-white/30 rounded-2xl flex items-center justify-center transition-all border-2 border-white/30 active:scale-95"
                      title="Sao chép mã PIN"
                    >
                      {copied ? (
                        <Check size={26} className="text-emerald-400" />
                      ) : (
                        <Copy size={26} className="text-white" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-400/10 rounded-full blur-3xl -z-0 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl -z-0 pointer-events-none" />
            </div>

            {/* Điều khiển Bắt Đầu & Khóa phòng */}
            <div className="flex flex-wrap items-center justify-between bg-white rounded-[32px] border-4 border-gray-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] px-8 py-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 border-2 border-blue-200 rounded-[20px] flex items-center justify-center shadow-inner">
                  <Users size={32} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-4xl font-black text-gray-900 tracking-tight leading-none">
                    {players.length}
                  </div>
                  <div className="text-sm font-800 text-gray-500 uppercase tracking-widest mt-1">
                    Người Đã Tham Gia
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ActionButton
                  variant="outline"
                  onClick={openInviteModal}
                  icon={Users}
                  label="Mời Nhóm"
                />

                <ActionButton
                  variant={roomInfo?.isLocked ? "danger" : "outline"}
                  onClick={toggleLockRoom}
                  icon={roomInfo?.isLocked ? Lock : Unlock}
                  label={roomInfo?.isLocked ? "Mở Khóa Phòng" : "Khóa Phòng"}
                />

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
            </div>

            {/* Lưới Người Chơi */}
            <div className="bg-white rounded-[40px] border-4 border-gray-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] p-10 min-h-[300px]">
              {players.length > 0 ? (
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 text-center">
                    (Di chuột vào người chơi để kick ra khỏi phòng nếu cần)
                  </div>
                  <div className="flex flex-wrap gap-8 justify-center">
                    {players.map((p, idx) => (
                      <PlayerChip
                        key={p.playerId ?? idx}
                        player={p}
                        index={idx}
                        onKick={handleKickPlayer}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-24 h-24 bg-gray-50 rounded-[24px] border-4 border-dashed border-gray-200 flex items-center justify-center mb-6 animate-pulse">
                    <Users size={40} className="text-gray-300" />
                  </div>
                  <p className="font-900 text-2xl text-gray-700 mb-2">
                    Đang tìm kiếm người chơi...
                  </p>
                  <p className="text-lg font-600 text-gray-500">
                    Hãy nhắc mọi người nhập PIN <span className="font-mono font-bold text-violet-600">{pinCode}</span> để vào phòng nhé!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            PLAYING STATE (ĐANG CHƠI / TRẢ LỜI CÂU HỎI)
        ════════════════════════════════════════════════════════════ */}
        {(gameState === "PLAYING" || gameState === "LEADERBOARD" || gameState === "STARTING") && (
          <div className="flex flex-col items-center gap-8 animate-fade-in-up">
            {/* Hiển thị câu hỏi hiện tại trên màn chiếu */}
            {currentSlide ? (
              <div className="w-full bg-white rounded-[40px] shadow-[4px_4px_16px_rgba(0,0,0,0.05)] border-4 border-violet-100 p-8 md:p-14 text-center relative">
                {/* Header thanh thời gian và thứ tự câu hỏi */}
                <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
                  <div className="inline-block bg-violet-100 border-2 border-violet-200 text-violet-700 font-900 px-6 py-2 rounded-2xl uppercase tracking-widest text-sm shadow-sm">
                    Câu hỏi {currentSlide?.index !== undefined ? currentSlide.index + 1 : "?"}
                    {currentSlide.type && ` • ${currentSlide.type}`}
                  </div>

                  {/* Đồng hồ đếm ngược to rõ */}
                  <div
                    className={`flex items-center gap-2 font-black px-6 py-2.5 rounded-2xl border-4 text-2xl transition-all shadow-md ${
                      slideTimeLeft !== null && slideTimeLeft <= 5
                        ? "bg-rose-500 text-white border-rose-700 animate-pulse"
                        : "bg-teal-50 text-teal-800 border-teal-200"
                    }`}
                  >
                    <Clock size={26} className="stroke-[2.5]" />
                    <span>{slideTimeLeft ?? currentSlide.timeLimit}s</span>
                  </div>
                </div>

                <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-12 leading-tight tracking-tight max-w-4xl mx-auto">
                  {currentSlide.questionText}
                </h2>

                {/* 1. DẠNG TRẮC NGHIỆM (QUIZ / POLL) */}
                {(currentSlide.type === "QUIZ" || currentSlide.type === "POLL" || !currentSlide.type) &&
                  currentSlide.options &&
                  currentSlide.options.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                      {currentSlide.options.map((opt: any, idx: number) => {
                        const colors = [
                          "bg-red-500 border-red-700 shadow-[0_6px_0_0_#b91c1c]",
                          "bg-blue-500 border-blue-700 shadow-[0_6px_0_0_#1d4ed8]",
                          "bg-amber-400 border-amber-600 shadow-[0_6px_0_0_#b45309]",
                          "bg-emerald-500 border-emerald-700 shadow-[0_6px_0_0_#047857]",
                        ];
                        const letters = ["A", "B", "C", "D"];
                        return (
                          <div
                            key={opt.id}
                            className={`${
                              colors[idx % 4]
                            } text-white rounded-[24px] border-4 p-6 text-left flex items-center gap-6 transform transition-transform`}
                          >
                            <div className="w-14 h-14 bg-white/20 rounded-2xl border-2 border-white/30 flex items-center justify-center text-2xl font-black shrink-0 shadow-inner">
                              {letters[idx]}
                            </div>
                            <span className="font-800 text-2xl leading-snug">{opt.content}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                {/* 2. DẠNG ĐÁM MÂY TỪ KHÓA (WORD_CLOUD) */}
                {currentSlide.type === "WORD_CLOUD" && (
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-4 text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Tổng hợp từ khóa gửi về thời gian thực
                    </div>
                    <WordCloudDisplay wordData={wordCloudData} />
                  </div>
                )}

                {/* 3. DẠNG ĐIỀN KHUYẾT (FILL_IN_BLANK) */}
                {currentSlide.type === "FILL_IN_BLANK" && (
                  <div className="max-w-3xl mx-auto p-8 bg-teal-50/60 rounded-[32px] border-4 border-teal-200 text-center">
                    <p className="text-xl font-bold text-teal-900 mb-4">
                      Thí sinh nhập đáp án từ thiết bị cá nhân
                    </p>
                    <div className="inline-block bg-white px-8 py-4 rounded-2xl border-2 border-teal-300 font-mono text-2xl font-black text-teal-800 tracking-widest shadow-inner">
                      [ . . . . . . . . . . ]
                    </div>
                  </div>
                )}

                {/* 4. DẠNG GHÉP CẶP (MATCHING) */}
                {currentSlide.type === "MATCHING" && (
                  <div className="max-w-4xl mx-auto p-6 bg-violet-50/50 rounded-[32px] border-4 border-violet-100">
                    <p className="text-lg font-bold text-violet-900 mb-6 text-center">
                      Thí sinh đang ghép nối các cặp tương ứng trên thiết bị
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="space-y-3">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
                          Cột Vấn đề
                        </div>
                        {currentSlide.options?.map((opt: any, idx: number) => (
                          <div
                            key={opt.id}
                            className="bg-white p-4 rounded-2xl border-2 border-violet-200 font-bold text-gray-800 shadow-sm"
                          >
                            {idx + 1}. {opt.content}
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
                          Cột Ghép Cặp
                        </div>
                        {currentSlide.options?.map((opt: any, idx: number) => (
                          <div
                            key={opt.id}
                            className="bg-white p-4 rounded-2xl border-2 border-amber-200 font-bold text-gray-800 shadow-sm"
                          >
                            {String.fromCharCode(65 + idx)}. {opt.matchingPair || "???"}
                          </div>
                        ))}
                      </div>
                    </div>
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
            <div className="flex gap-4 w-full max-w-3xl">
              <ActionButton
                variant="primary"
                fullWidth
                onClick={nextSlide}
                label="Qua Câu Tiếp Theo"
                icon={ChevronRight}
              />
              <ActionButton
                variant="danger"
                onClick={endGame}
                label="Kết Thúc Trò Chơi"
                icon={X}
              />
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
                <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-[32px] border-4 border-amber-500 shadow-[0_8px_0_0_#b45309] flex items-center justify-center mx-auto mb-6 transform -rotate-6">
                  <Trophy size={48} className="text-amber-950 fill-amber-950" />
                </div>
                <h2 className="text-5xl font-black text-gray-900 mb-2 tracking-tight">
                  Bục Vinh Danh Top 3! 🏆
                </h2>
                <p className="text-xl font-800 text-amber-900/80 mb-12">
                  Chúc mừng các quán quân đã xuất sắc dẫn đầu phòng thi đấu
                </p>

                {/* 3 Bục Podium */}
                <div className="flex items-end justify-center gap-4 md:gap-8 mb-8 min-h-[280px]">
                  {/* Top 2 */}
                  {leaderboard[1] && (
                    <div className="flex flex-col items-center animate-fade-in-up order-1">
                      <img
                        src={
                          leaderboard[1].avatarUrl ??
                          `https://ui-avatars.com/api/?name=${leaderboard[1].nickname}&background=64748b&color=fff&size=60`
                        }
                        alt={leaderboard[1].nickname}
                        className="w-16 h-16 rounded-[20px] border-4 border-slate-300 shadow-md mb-2 bg-white"
                      />
                      <span className="font-900 text-gray-800 text-base max-w-[100px] truncate mb-2">
                        {leaderboard[1].nickname}
                      </span>
                      <div className="w-24 md:w-28 h-40 bg-slate-200 border-4 border-slate-300 rounded-t-[28px] shadow-[inset_0_4px_0_0_rgba(255,255,255,0.6)] flex flex-col items-center justify-center p-2">
                        <span className="text-3xl font-black text-slate-600">2</span>
                        <span className="text-xs font-bold text-slate-500 mt-1">
                          {leaderboard[1].totalScore?.toLocaleString("vi-VN")} pts
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top 1 */}
                  {leaderboard[0] && (
                    <div className="flex flex-col items-center animate-fade-in-up order-2">
                      <div className="relative">
                        <Crown
                          size={32}
                          className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500 fill-amber-400 drop-shadow animate-bounce"
                        />
                        <img
                          src={
                            leaderboard[0].avatarUrl ??
                            `https://ui-avatars.com/api/?name=${leaderboard[0].nickname}&background=f59e0b&color=fff&size=80`
                          }
                          alt={leaderboard[0].nickname}
                          className="w-20 h-20 rounded-[24px] border-4 border-amber-400 shadow-lg mb-2 bg-white"
                        />
                      </div>
                      <span className="font-900 text-amber-950 text-lg max-w-[120px] truncate mb-2">
                        {leaderboard[0].nickname}
                      </span>
                      <div className="w-28 md:w-36 h-56 bg-gradient-to-t from-amber-400 to-yellow-300 border-4 border-amber-500 rounded-t-[32px] shadow-[inset_0_4px_0_0_rgba(255,255,255,0.8),0_10px_20px_rgba(245,158,11,0.2)] flex flex-col items-center justify-center p-2">
                        <span className="text-5xl font-black text-amber-950">1</span>
                        <span className="text-sm font-black text-amber-900 mt-2 bg-white/60 px-2 py-0.5 rounded-lg">
                          {leaderboard[0].totalScore?.toLocaleString("vi-VN")} pts
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top 3 */}
                  {leaderboard[2] && (
                    <div className="flex flex-col items-center animate-fade-in-up order-3">
                      <img
                        src={
                          leaderboard[2].avatarUrl ??
                          `https://ui-avatars.com/api/?name=${leaderboard[2].nickname}&background=b45309&color=fff&size=60`
                        }
                        alt={leaderboard[2].nickname}
                        className="w-16 h-16 rounded-[20px] border-4 border-amber-600 shadow-md mb-2 bg-white"
                      />
                      <span className="font-900 text-gray-800 text-base max-w-[100px] truncate mb-2">
                        {leaderboard[2].nickname}
                      </span>
                      <div className="w-24 md:w-28 h-32 bg-amber-100 border-4 border-amber-300 rounded-t-[28px] shadow-[inset_0_4px_0_0_rgba(255,255,255,0.6)] flex flex-col items-center justify-center p-2">
                        <span className="text-3xl font-black text-amber-800">3</span>
                        <span className="text-xs font-bold text-amber-700 mt-1">
                          {leaderboard[2].totalScore?.toLocaleString("vi-VN")} pts
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bảng xếp hạng chi tiết đầy đủ */}
            <div className="w-full max-w-4xl bg-white rounded-[40px] border-4 border-gray-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] p-10">
              <h3 className="font-900 text-2xl text-gray-900 mb-6 flex items-center gap-3">
                <Trophy size={28} className="text-violet-600" />
                <span>Bảng Thành Tích Chung Cuộc</span>
              </h3>
              <div className="divide-y divide-gray-100">
                {leaderboard.map((p, idx) => (
                  <PlayerRow key={p.playerId ?? idx} player={p} rank={idx + 1} />
                ))}
              </div>
            </div>

            {/* Các nút hành động kết thúc */}
            <div className="flex flex-wrap gap-4 justify-center w-full max-w-md">
              <ActionButton
                variant="success"
                onClick={exportReport}
                loading={exporting}
                icon={Sparkles}
                label="Xuất Báo Cáo Excel"
                fullWidth
              />
              <ActionButton
                variant="outline"
                onClick={() => router.push("/dashboard")}
                icon={Home}
                label="Về Trang Quản Trị"
                fullWidth
              />
            </div>
          </div>
        )}
      </main>

      {/* ── Slide-over Panel Hỏi Đáp (Q&A) ── */}
      {showQA && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white border-l-4 border-teal-200 shadow-2xl z-50 flex flex-col animate-slide-in">
          <div className="p-6 border-b-2 border-gray-100 flex items-center justify-between bg-teal-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white">
                <MessageCircle size={20} />
              </div>
              <h3 className="font-black text-lg text-gray-900">Hộp Thoại Hỏi Đáp</h3>
            </div>
            <button
              onClick={() => setShowQA(false)}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-16 text-gray-400 font-bold">
                Chưa có câu hỏi nào từ người chơi.
              </div>
            ) : (
              questions.map((q) => (
                <div
                  key={q.id}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    q.isPinned
                      ? "bg-amber-50 border-amber-300 shadow-sm"
                      : q.isResolved
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : "bg-white border-gray-100 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-teal-800">
                      {q.playerNickname}
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      👍 {q.upvotes}
                    </span>
                  </div>
                  <p className="text-gray-900 font-semibold mb-3">{q.content}</p>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <button
                      onClick={() => pinQuestion(q.id, !q.isPinned)}
                      className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                        q.isPinned
                          ? "bg-amber-400 border-amber-600 text-amber-950"
                          : "bg-gray-100 border-gray-200 text-gray-700"
                      }`}
                    >
                      <Pin size={12} /> {q.isPinned ? "Bỏ Ghim" : "Ghim"}
                    </button>
                    {!q.isResolved && (
                      <button
                        onClick={() => resolveQuestion(q.id)}
                        className="px-2.5 py-1 rounded-lg border bg-emerald-100 border-emerald-300 text-emerald-800 flex items-center gap-1"
                      >
                        <CheckCircle size={12} /> Đã Xong
                      </button>
                    )}
                    <button
                      onClick={() => hideQuestion(q.id)}
                      className="px-2.5 py-1 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 flex items-center gap-1 ml-auto"
                    >
                      <EyeOff size={12} /> Ẩn
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Modal Mời Nhóm Học Tập Vào Phòng ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[32px] border-4 border-violet-100 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 text-violet-700 rounded-xl flex items-center justify-center font-bold">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="font-black text-xl text-gray-900">Mời Nhóm Vào Phòng</h3>
                  <p className="text-xs text-gray-500 font-semibold">Tất cả thành viên trong nhóm sẽ nhận được thông báo mời thi đấu</p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            {inviteFeedback && (
              <div className="p-3.5 rounded-2xl bg-violet-50 border-2 border-violet-200 text-violet-900 font-bold text-sm">
                {inviteFeedback}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
              {myGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-400 font-bold text-sm">
                  Bạn chưa tạo nhóm học tập nào. Hãy vào mục &quot;Nhóm Của Tôi&quot; để tạo nhóm trước.
                </div>
              ) : (
                myGroups.map((g: any) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl border-2 border-gray-100 hover:border-violet-200 bg-gray-50/50 transition-all"
                  >
                    <div>
                      <div className="font-black text-base text-gray-900">{g.name}</div>
                      <div className="text-xs text-gray-500 font-medium">{g.description || "Không có mô tả"}</div>
                    </div>
                    <button
                      onClick={() => handleInviteGroup(g.id)}
                      disabled={invitingGroupId === g.id}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs px-4 py-2 rounded-xl border border-violet-800 shadow-sm active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {invitingGroupId === g.id ? "Đang gửi..." : "Mời Ngay"}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <ActionButton
                variant="outline"
                onClick={() => setShowInviteModal(false)}
                label="Đóng"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
