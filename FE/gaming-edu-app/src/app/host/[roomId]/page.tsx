"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import Button from "@/components/ui/Button";

import { api } from "@/lib/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
      bg: "bg-gradient-to-r from-yellow-400 to-amber-500",
      text: "text-white",
      icon: <Crown size={14} className="text-white" />,
    },
    {
      bg: "bg-gradient-to-r from-gray-300 to-gray-400",
      text: "text-white",
      icon: <Medal size={14} className="text-white" />,
    },
    {
      bg: "bg-gradient-to-r from-amber-500 to-orange-600",
      text: "text-white",
      icon: <Medal size={14} className="text-white" />,
    },
  ];
  const style = rankStyles[rank - 1] ?? { bg: "bg-gray-100", text: "text-gray-600", icon: null };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl transition-all animate-fade-in-up ${
        rank === 1 ? "bg-yellow-50/50 border border-yellow-200" : "hover:bg-gray-50"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center font-800 text-sm flex-shrink-0 ${style.bg} ${style.text}`}
      >
        {style.icon ?? rank}
      </div>
      <img
        src={
          player.avatarUrl ??
          `https://ui-avatars.com/api/?name=${player.nickname}&background=7c3aed&color=fff&size=40`
        }
        alt={player.nickname}
        className="w-9 h-9 rounded-full border-2 border-white shadow-sm flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="font-800 text-gray-900 text-sm truncate">
          {player.nickname}
        </div>
      </div>
      <div className="font-900 text-violet-600 tabular-nums">
        {player.totalScore?.toLocaleString("vi-VN")} pts
      </div>
    </div>
  );
}

// ─── Player Avatar Chip ────────────────────────────────────────────────────────
function PlayerChip({ player, index }: { player: any; index: number }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <img
        src={
          player.avatarUrl ??
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.nickname}`
        }
        alt={player.nickname}
        className="w-12 h-12 rounded-2xl border-2 border-violet-200 shadow-sm"
      />
      <span className="text-xs font-700 text-gray-700 max-w-[60px] truncate">
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
    joinRoom,
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
        joinRoom(pin, user?.nickname ?? "Host");
      }
    }
  }, [isConnected, joinRoom]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="font-800 text-gray-900">Thiếu mã PIN trong URL</h2>
          <p className="text-sm text-gray-500">
            Vui lòng truy cập lại qua Dashboard hoặc trang chủ.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push("/dashboard")}
            id="btn-go-dashboard"
          >
            Về Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Trophy size={16} className="text-white" />
            </div>
            <div>
              <div className="font-800 text-gray-900 text-sm">
                Bảng Điều Khiển Host
              </div>
              <div className="text-xs text-gray-500">
                {gameState === "WAITING" && "Đang chờ người chơi..."}
                {gameState === "STARTING" && "Đang bắt đầu..."}
                {(gameState === "PLAYING" || gameState === "LEADERBOARD") &&
                  `Câu ${currentSlide?.index !== undefined ? currentSlide.index + 1 : "?"} đang chạy`}
                {gameState === "FINISHED" && "Trò chơi đã kết thúc"}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/")}
            id="btn-exit-host"
          >
            <LogOut size={13} /> Thoát
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {/* ════════════════════════════════════════════════════════════
            LOBBY STATE
        ════════════════════════════════════════════════════════════ */}
        {gameState === "WAITING" && (
          <div className="space-y-6 animate-fade-in-up">
            {/* PIN Display Card */}
            <div className="bg-hero-gradient rounded-3xl p-6 md:p-10 text-center relative overflow-hidden">
              {/* Decorative glows */}
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-violet-600/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl" />

              <div className="relative z-10">
                <p className="text-gray-400 font-700 text-xs uppercase tracking-widest mb-1">
                  Tham gia tại
                </p>
                <div className="text-violet-300 font-800 text-lg md:text-2xl mb-4 tracking-wide">
                  {typeof window !== "undefined" ? window.location.origin : ""}/play
                </div>

                <p className="text-gray-400 font-700 text-xs uppercase tracking-widest mb-2">
                  Mã PIN Phòng
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-5xl md:text-7xl font-900 tracking-[0.2em] text-white drop-shadow-lg">
                    {pinCode}
                  </div>
                  <button
                    onClick={copyPin}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all border border-white/20"
                    id="btn-copy-pin"
                    title="Sao chép mã PIN"
                  >
                    {copied ? (
                      <Check size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} className="text-white" />
                    )}
                  </button>
                </div>

                {/* QR placeholder */}
                <div className="mt-4 text-xs text-gray-500">
                  Hoặc truy cập:{" "}
                  <button
                    onClick={() => navigator.clipboard.writeText(joinUrl)}
                    className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
                    id="btn-copy-link"
                  >
                    {joinUrl}
                  </button>
                </div>
              </div>
            </div>

            {/* Player count + Start */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-violet-600" />
                </div>
                <div>
                  <div className="text-xl font-900 text-gray-900">
                    {players.length}
                  </div>
                  <div className="text-xs text-gray-500">Người chơi đã vào</div>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={startGame}
                disabled={players.length === 0}
                loading={starting}
                className="font-800 px-8"
                id="btn-start-game"
              >
                {!starting && <Play size={16} />}
                {players.length === 0
                  ? "Chờ người chơi..."
                  : starting
                  ? "Đang bắt đầu..."
                  : "Bắt Đầu Trò Chơi"}
              </Button>
            </div>

            {/* Players Grid */}
            {players.length > 0 ? (
              <div>
                <p className="text-sm font-700 text-gray-700 mb-3">
                  Người chơi đã vào phòng:
                </p>
                <div className="flex flex-wrap gap-4">
                  {players.map((p, idx) => (
                    <PlayerChip key={p.playerId ?? idx} player={p} index={idx} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                <div className="text-4xl mb-3 animate-pulse">⏳</div>
                <p className="font-700 text-gray-500">
                  Chưa có người nào vào phòng
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Chia sẻ mã PIN hoặc link để mời người chơi
                </p>
              </div>
            )}

            {/* Tip */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <Zap size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Mẹo:</strong> Hiển thị mã PIN lên màn chiếu hoặc bảng
                để học sinh dễ nhìn. Nhấn{" "}
                <strong>Bắt Đầu Trò Chơi</strong> khi tất cả đã vào phòng.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            PLAYING STATE
        ════════════════════════════════════════════════════════════ */}
        {(gameState === "PLAYING" || gameState === "LEADERBOARD" || gameState === "STARTING") && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up">
            {/* Current Question Display */}
            {currentSlide ? (
              <div className="w-full max-w-2xl bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-10 text-center">
                <div className="text-sm font-700 text-gray-500 uppercase tracking-widest mb-4">
                  Câu {currentSlide?.index !== undefined ? currentSlide.index + 1 : "?"}
                </div>
                <h2 className="text-2xl md:text-3xl font-900 text-gray-900 mb-8 leading-tight">
                  {currentSlide.questionText}
                </h2>
                {currentSlide.options && currentSlide.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {currentSlide.options.map((opt: any, idx: number) => {
                      const colors = [
                        "bg-red-500",
                        "bg-blue-500",
                        "bg-yellow-500",
                        "bg-green-500",
                      ];
                      const letters = ["A", "B", "C", "D"];
                      return (
                        <div
                          key={opt.id}
                          className={`${
                            colors[idx % 4]
                          } text-white rounded-xl p-4 text-left font-700 text-sm flex items-center gap-2`}
                        >
                          <span className="w-6 h-6 bg-black/20 rounded-lg flex items-center justify-center text-xs font-900">
                            {letters[idx]}
                          </span>
                          {opt.content}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-10 text-center w-full max-w-2xl">
                <div className="text-5xl mb-4 animate-pulse">🎮</div>
                <h2 className="text-2xl font-900 text-gray-900">
                  Trò chơi đang diễn ra...
                </h2>
                <p className="text-gray-500 mt-2">
                  Người chơi đang trả lời câu hỏi
                </p>
              </div>
            )}

            {/* Live Leaderboard (mini) */}
            {leaderboard.length > 0 && (
              <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-700 text-gray-500 uppercase tracking-wide mb-3">
                  Top người chơi
                </p>
                <div className="space-y-1">
                  {leaderboard.slice(0, 5).map((p, idx) => (
                    <div
                      key={p.playerId ?? idx}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-5 font-800 text-gray-500">{idx + 1}</span>
                      <span className="flex-1 font-700 text-gray-900 truncate">
                        {p.nickname}
                      </span>
                      <span className="font-900 text-violet-600">
                        {p.totalScore?.toLocaleString("vi-VN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={nextSlide}
                className="font-800 px-10"
                id="btn-next-slide"
              >
                Câu Tiếp Theo{" "}
                <ChevronRight size={20} className="ml-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={endGame}
                className="text-red-500 hover:bg-red-50 hover:border-red-300"
                id="btn-end-game"
              >
                Kết Thúc Sớm
              </Button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            ENDED STATE
        ════════════════════════════════════════════════════════════ */}
        {gameState === "FINISHED" && (
          <div className="flex flex-col items-center gap-6 animate-fade-in-up">
            {/* Podium header */}
            <div className="bg-hero-gradient rounded-3xl p-8 text-center w-full max-w-2xl relative overflow-hidden">
              <div className="absolute inset-0 stars-bg opacity-30" />
              <div className="relative z-10">
                <div className="text-5xl mb-3">🏆</div>
                <h1 className="text-3xl font-900 text-white mb-1">
                  Kết Quả Cuối Cùng
                </h1>
                <p className="text-violet-300 text-sm">
                  Chúc mừng tất cả người chơi!
                </p>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Trophy size={16} className="text-violet-600" />
                <span className="font-800 text-gray-900">Bảng Xếp Hạng</span>
                <span className="text-sm text-gray-500 ml-auto">
                  {leaderboard.length} người chơi
                </span>
              </div>
              <div className="divide-y divide-gray-50 p-4 space-y-1">
                {leaderboard.length === 0 ? (
                  <p className="text-center text-gray-400 py-6">
                    Không có dữ liệu người chơi
                  </p>
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

            <div className="flex gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={exportReport}
                loading={exporting}
                className="font-800"
                id="btn-export-report"
              >
                Xuất Báo Cáo Excel
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/dashboard")}
                id="btn-back-dashboard"
              >
                Về Dashboard <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Q&A Floating Button for Host */}
      <button
         onClick={() => setShowQA(true)}
         className="fixed bottom-6 right-6 w-14 h-14 bg-violet-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-violet-700 transition-colors z-40"
      >
         <MessageCircle size={24} />
         {questions.filter(q => !q.isResolved).length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
               {questions.filter(q => !q.isResolved).length}
            </span>
         )}
      </button>

      {/* Host Q&A Modal */}
      {showQA && (
         <div className="fixed inset-0 z-50 flex flex-col bg-gray-50/95 backdrop-blur-sm animate-fade-in-up md:p-10">
            <div className="bg-white max-w-3xl w-full mx-auto flex-1 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-100">
               <div className="bg-white p-5 shadow-sm flex items-center justify-between border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                     <MessageCircle size={24} className="text-violet-600" />
                     Quản Lý Hỏi Đáp
                  </h3>
                  <button onClick={() => setShowQA(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                     <X size={20} />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {questions.length === 0 ? (
                     <div className="text-center text-gray-400 mt-10">
                        Chưa có câu hỏi nào từ người chơi.
                     </div>
                  ) : (
                     questions
                        .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.upvotes - a.upvotes)
                        .map(q => (
                        <div key={q.id} className={`bg-white p-5 rounded-xl shadow-sm border ${q.isPinned ? 'border-amber-300 bg-amber-50' : 'border-gray-200'} ${q.isResolved ? 'opacity-50 grayscale' : ''}`}>
                           <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                 <div className="font-bold text-gray-900">{q.playerNickname}</div>
                                 <div className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{q.upvotes} votes</div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button 
                                    onClick={() => pinQuestion(q.id, !q.isPinned)}
                                    title={q.isPinned ? "Bỏ ghim" : "Ghim câu hỏi"}
                                    className={`p-1.5 rounded-lg transition-colors ${q.isPinned ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-100 text-gray-500'}`}
                                 >
                                    <Pin size={16} />
                                 </button>
                                 {!q.isResolved && (
                                    <button 
                                       onClick={() => resolveQuestion(q.id)}
                                       title="Đánh dấu đã trả lời"
                                       className="p-1.5 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                                    >
                                       <CheckCircle size={16} />
                                    </button>
                                 )}
                                 <button 
                                    onClick={() => hideQuestion(q.id)}
                                    title="Ẩn câu hỏi"
                                    className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                 >
                                    <EyeOff size={16} />
                                 </button>
                              </div>
                           </div>
                           <p className="text-gray-800">{q.content}</p>
                           {q.isResolved && (
                              <div className="mt-2 text-xs font-bold text-green-600 flex items-center gap-1">
                                 <CheckCircle size={12} /> Đã trả lời
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
