"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Play,
  Copy,
  Check,
  LogOut,
  Zap,
  Wifi,
  WifiOff,
  UserX,
  QrCode,
  ShieldAlert,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  RefreshCw,
  Lock,
  Unlock,
  Radio,
  Anchor,
} from "lucide-react";
import { useGameHub } from "@/hooks/useGameHub";
import { api } from "@/lib/api";

interface Player {
  id: string;
  playerId?: string;
  nickname: string;
  avatarUrl?: string;
}

export default function RoomLobbyPage({ params }: { params: Promise<{ pin: string }> }) {
  const unwrappedParams = use(params);
  const pin = unwrappedParams.pin;
  const router = useRouter();

  const [copied, setCopied] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  // SignalR Game Hub
  const {
    isConnected,
    players: hubPlayers,
    roomInfo,
    startGame: triggerStartGame,
    kickPlayer: triggerKickPlayer,
    hostJoinRoom,
  } = useGameHub();

  useEffect(() => {
    if (isConnected && hostJoinRoom) {
      hostJoinRoom(pin);
    }
  }, [isConnected, hostJoinRoom, pin]);

  // Danh sách người chơi tham gia từ SignalR
  const [localPlayers, setLocalPlayers] = useState<Player[]>([]);

  const activePlayers = useMemo(() => {
    if (hubPlayers && hubPlayers.length > 0) {
      return hubPlayers.map((p: any) => ({
        id: p.playerId || p.id,
        playerId: p.playerId || p.id,
        nickname: p.nickname || "Người chơi",
        avatarUrl: p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.nickname}`,
      }));
    }
    return localPlayers;
  }, [hubPlayers, localPlayers]);

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKick = (playerId: string) => {
    if (triggerKickPlayer) {
      triggerKickPlayer(playerId);
    }
    setLocalPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  const handleStartGame = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (pin) {
      api.get(`/rooms/pin/${pin}`).then((res) => {
        const theme = res.data?.data?.theme || res.data?.data?.gameModeTheme;
        if (theme === "NAVAL_WAR") {
          router.replace(`/rooms/${pin}/naval`);
        }
      }).catch(() => {});
    }
  }, [pin, router]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      if (triggerStartGame) triggerStartGame(roomInfo?.roomId || pin);
      const isNaval = (roomInfo as any)?.theme === "NAVAL_WAR" || (roomInfo as any)?.gameModeTheme === "NAVAL_WAR";
      if (isNaval) {
        router.push(`/rooms/${pin}/naval`);
      } else {
        router.push(`/rooms/${pin}/host-live`);
      }
    }
  }, [countdown, pin, router, triggerStartGame, roomInfo]);

  const playUrl = typeof window !== "undefined" ? `${window.location.origin}/rooms/${pin}/play` : `/rooms/${pin}/play`;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* ── DARK COSMIC GRADIENT BACKDROP ── */}
      <div className="fixed inset-0 pointer-events-none -z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#311042]" />
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/15 rounded-full blur-[120px]" />
      </div>

      {/* ── BANNER CẢNH BÁO MẤT KẾT NỐI (RECONNECTING STATUS) ── */}
      {!isConnected && (
        <div className="relative z-50 bg-amber-500/90 text-slate-950 px-4 py-2 text-center text-xs md:text-sm font-extrabold flex items-center justify-center gap-2 backdrop-blur-md shadow-lg animate-pulse">
          <WifiOff size={16} />
          <span>Mất kết nối mạng! Đang tự động kết nối lại SignalR Server...</span>
        </div>
      )}

      {/* ── HEADER SẢNH CHỜ ── */}
      <header className="relative z-20 h-18 px-4 md:px-8 flex items-center justify-between border-b border-white/10 backdrop-blur-xl bg-slate-950/40">
        <div className="flex items-center gap-3">
          <Link
            href="/library"
            className="p-2 rounded-[12px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Rời phòng</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-heading">
                Arena Live Lobby
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Radio size={10} className="animate-pulse" /> Trực Tiếp
              </span>
            </div>
            <h1 className="text-sm md:text-base font-extrabold text-white truncate max-w-xs md:max-w-md font-heading">
              {roomInfo?.quizTitle || "Đấu Trường Trí Tuệ GameEdu"}
            </h1>
          </div>
        </div>

        {/* Trạng thái kết nối & Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold">
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-400 font-bold hidden sm:inline">Đã kết nối</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-400 font-bold hidden sm:inline">Chờ tín hiệu</span>
              </>
            )}
          </div>

          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`p-2.5 rounded-[12px] border transition-all ${
              isLocked
                ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
            title={isLocked ? "Mở khóa phòng" : "Khóa phòng"}
          >
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-[12px] bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
            title="Bật/Tắt âm thanh"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT: BENTO HERO + PLAYER GRID ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 relative z-10 flex flex-col gap-6">
        {/* HERO BENTO GRID: PIN + QR + CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card PIN KHỔNG LỒ (8 cột) */}
          <div className="lg:col-span-8 rounded-[24px] bg-white/[0.06] backdrop-blur-[16px] border border-white/15 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
            <div className="space-y-3 text-center md:text-left z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-extrabold text-indigo-300 font-heading">
                <Sparkles size={14} /> THAM GIA NGAY TẠI
              </div>
              <p className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-heading">
                gameedu.vn/play
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                Người chơi mở trình duyệt điện thoại, nhập mã PIN bên dưới hoặc quét mã QR để vào sảnh chờ.
              </p>
            </div>

            {/* PIN Block */}
            <div className="bg-slate-900/90 border-2 border-indigo-500/50 rounded-[20px] p-5 md:p-6 text-center z-10 shadow-[0_0_40px_rgba(99,102,241,0.25)] flex flex-col items-center gap-2 min-w-[240px]">
              <span className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-widest font-heading">
                MÃ PIN PHÒNG
              </span>
              <div className="text-5xl md:text-6xl font-black font-heading tracking-[0.15em] text-white drop-shadow-md">
                {pin}
              </div>
              <button
                onClick={handleCopyPin}
                className="mt-1 px-4 py-1.5 rounded-full bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-xs font-bold text-indigo-200 flex items-center gap-1.5 transition-all active:scale-95"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? "Đã sao chép" : "Sao chép mã PIN"}</span>
              </button>
            </div>
          </div>

          {/* Card QR CODE & BẮT ĐẦU (4 cột) */}
          <div className="lg:col-span-4 rounded-[24px] bg-white/[0.06] backdrop-blur-[16px] border border-white/15 p-6 flex flex-col justify-between gap-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-400" />
                <span className="text-xs font-bold text-slate-300 uppercase font-heading">
                  Sĩ Số Phòng
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-sm font-black font-heading">
                {activePlayers.length} Người chơi
              </span>
            </div>

            {/* Simulated QR Code */}
            <div className="bg-white rounded-[16px] p-4 mx-auto w-fit shadow-md flex flex-col items-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(playUrl)}`}
                alt="QR Code Vào Phòng"
                className="w-32 h-32 rounded-lg"
              />
              <span className="text-[10px] text-slate-700 font-extrabold mt-1 uppercase tracking-wider">
                Quét để vào ngay
              </span>
            </div>

            {/* Tactile 3D Start Button */}
            <button
              onClick={handleStartGame}
              disabled={activePlayers.length === 0 || countdown !== null}
              className="w-full py-3.5 px-6 rounded-[14px] btn-3d btn-3d-emerald font-heading text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play size={18} fill="currentColor" />
              <span>{countdown !== null ? `ĐANG KHỞI ĐỘNG (${countdown}s)` : "BẮT ĐẦU TRẬN ĐẤU"}</span>
            </button>

            {/* Chế độ Hải Chiến Tri Thức Button */}
            <button
              type="button"
              onClick={() => router.push(`/rooms/${pin}/naval`)}
              className="w-full py-3 px-6 rounded-[14px] bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 font-heading text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 text-white shadow-lg shadow-cyan-500/20 transition-all border border-cyan-400/40 cursor-pointer active:scale-95"
            >
              <Anchor size={16} className="text-cyan-200 animate-pulse" />
              <span>Chiến Trận Hải Chiến Tri Thức</span>
            </button>
          </div>
        </div>

        {/* ── PLAYER ROSTER (DANH SÁCH NGƯỜI CHƠI & NÚT KICK) ── */}
        <div className="rounded-[24px] bg-white/[0.04] backdrop-blur-[16px] border border-white/10 p-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-extrabold text-white font-heading flex items-center gap-2">
              <span>Danh Sách Người Chơi</span>
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            </h2>
            <span className="text-xs text-slate-400">
              Rê chuột vào người chơi để kích khỏi phòng nếu cần
            </span>
          </div>

          {activePlayers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 animate-pulse">
                <Users size={28} />
              </div>
              <p className="font-bold text-sm text-slate-300">Đang chờ người chơi tham gia...</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Hãy nhắc học sinh/người tham gia nhập mã PIN <strong className="text-indigo-300">{pin}</strong> trên điện thoại.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 overflow-y-auto max-h-[380px] p-1">
              {activePlayers.map((player) => (
                <div
                  key={player.id}
                  className="group relative rounded-[16px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-indigo-400/40 p-3 transition-all flex items-center gap-3 shadow-sm hover:scale-[1.02]"
                >
                  <img
                    src={player.avatarUrl}
                    alt={player.nickname}
                    className="w-10 h-10 rounded-full border-2 border-indigo-400/40 bg-slate-800"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate font-heading">
                      {player.nickname}
                    </p>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Sẵn sàng
                    </span>
                  </div>

                  {/* Nút Kick ẩn hiện khi hover */}
                  <button
                    onClick={() => handleKick(player.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 border border-rose-500/40 text-rose-300 hover:text-white transition-all"
                    title="Kích người chơi này"
                  >
                    <UserX size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── FULLSCREEN COUNTDOWN MODAL (3 - 2 - 1) ── */}
      {countdown !== null && countdown > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="text-center animate-bounce">
            <div className="text-9xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-500 to-indigo-500 drop-shadow-[0_0_50px_rgba(244,63,94,0.6)]">
              {countdown}
            </div>
            <p className="text-xl font-extrabold uppercase tracking-widest text-white mt-4 font-heading">
              CHUẨN BỊ CHIẾN ĐẤU!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
