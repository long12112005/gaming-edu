"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import confetti from "canvas-confetti";
import {
  Anchor,
  Shield,
  Crosshair,
  Radio,
  Trophy,
  Users,
  Play,
  RotateCcw,
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  AlertTriangle,
  ArrowLeft,
  Crown,
  Medal,
  Copy,
  Check,
  Share2,
  QrCode,
  LogOut,
  Compass,
  FileSpreadsheet,
  Home,
  CheckCircle2,
  Swords,
  RefreshCw,
  ExternalLink,
  Zap,
} from "lucide-react";
import { useNavalWarHub } from "@/hooks/useNavalWarHub";
import { NavalGrid } from "@/components/naval/NavalGrid";
import { NavalQuestionHUD, QuestionSlide } from "@/components/naval/NavalQuestionHUD";
import { NavalStatusBar } from "@/components/naval/NavalStatusBar";
import { NavalLogAndLeaderboard } from "@/components/naval/NavalLogAndLeaderboard";
import { NAVAL_ASSETS } from "@/lib/navalAssets";
import { navalSounds } from "@/lib/navalSoundEffects";
import { api } from "@/lib/api";

export default function NavalWarGamePage({ params }: { params: Promise<{ pin: string }> }) {
  const unwrappedParams = use(params);
  const pin = unwrappedParams.pin;
  const router = useRouter();

  // Authentication & Room Identity
  const [playerId, setPlayerId] = useState<string>("");
  const [nickname, setNickname] = useState<string>("Thuyền Trưởng");
  const [isHost, setIsHost] = useState<boolean>(false);
  const [roomData, setRoomData] = useState<any>(null);
  const [hasJoinedTeam, setHasJoinedTeam] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Sharing copy feedbacks
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Tactical skill selection mode: NORMAL | RADAR | SHIELD | PRECISION
  const [skillMode, setSkillMode] = useState<"NORMAL" | "RADAR" | "SHIELD" | "PRECISION">("NORMAL");

  // Slides data & current question
  const [slides, setSlides] = useState<QuestionSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [hasAnsweredCurrentSlide, setHasAnsweredCurrentSlide] = useState<boolean>(false);

  // Connect to Naval SignalR Hub
  const {
    isConnected,
    isHost: hubIsHost,
    myTeamSide,
    lobbyState,
    hostSpectatorState,
    mapSize,
    isMatchStarted,
    myShips,
    enemyShots,
    shotsEarned,
    currentCombo,
    energyPoints,
    teamAShipsRemaining,
    teamBShipsRemaining,
    radarRemaining,
    shieldRemaining,
    radarScanWave,
    screenShake,
    combatLogs,
    leaderboard,
    matchResult,
    isDoubleShot,
    doubleShotInfo,
    enterNavalLobby,
    joinNavalRoom,
    reconnectRoom,
    switchTeam,
    leaveNavalRoom,
    startMatch,
    resetMatch,
    submitAnswer,
    fireShot,
    useSkill,
    endMatchEarly,
  } = useNavalWarHub(pin);

  // Load player credentials and room data
  useEffect(() => {
    const storedPlayerId = Cookies.get("guest_player_id") || Cookies.get("player_id") || "";
    const storedNickname = Cookies.get("guest_nickname") || Cookies.get("nickname") || "Thuyền Trưởng";
    const userJson = Cookies.get("user");

    let currentUserId: string | null = null;
    let effectiveNickname = storedNickname;
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        if (u.id) currentUserId = u.id;
        if (u.nickname) {
          effectiveNickname = u.nickname;
          setNickname(u.nickname);
        }
      } catch {}
    }

    setPlayerId(storedPlayerId);
    setNickname(effectiveNickname);

    // Fetch room details to check slides, QR code, and host status
    api
      .get(`/rooms/pin/${pin}`)
      .then(async (res) => {
        const room = res.data?.data || res.data;
        if (room) {
          setRoomData(room);

          // Check if current user is room host
          const roomHostId = room.hostId || room.host_id;
          const hostMatch =
            Boolean(roomHostId && currentUserId && roomHostId.toLowerCase() === currentUserId.toLowerCase());

          if (hostMatch) {
            setIsHost(true);
          }

          // Fetch full quiz slides with options
          const quizId = room.quizId || room.quiz_id;
          if (quizId) {
            try {
              const quizRes = await api.get(`/quizzes/${quizId}`);
              const quizData = quizRes.data?.data || quizRes.data;
              if (quizData?.slides && Array.isArray(quizData.slides)) {
                setSlides(
                  quizData.slides.map((s: any, idx: number) => ({
                    id: s.id,
                    type: s.type || "QUIZ",
                    questionText: s.questionText || s.question_text || "",
                    timeLimit: s.timeLimit || s.time_limit || 30,
                    points: s.points || 1000,
                    orderIndex: s.orderIndex ?? idx,
                    options: (s.options || []).map((o: any, oIdx: number) => ({
                      id: o.id,
                      content: o.content || "",
                      orderIndex: o.orderIndex ?? oIdx,
                    })),
                  }))
                );
              }
            } catch (qErr) {
              console.warn("Could not fetch quiz slides:", qErr);
            }
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch room details from API:", err);
      });
  }, [pin]);

  // Host auto-joins SignalR as HOST referee once connected (nếu chưa chọn phe tham chiến)
  useEffect(() => {
    if (isConnected && isHost && !hasJoinedTeam) {
      joinNavalRoom(pin, playerId || crypto.randomUUID(), "HOST", nickname);
    }
  }, [isConnected, isHost, hasJoinedTeam, pin, playerId, nickname, joinNavalRoom]);

  // Player enters lobby group immediately to receive real-time rosters
  useEffect(() => {
    if (isConnected && !isHost && enterNavalLobby) {
      enterNavalLobby(pin);
    }
  }, [isConnected, isHost, pin, enterNavalLobby]);

  // If reconnect event reported isHost
  useEffect(() => {
    if (hubIsHost) {
      setIsHost(true);
      setHasJoinedTeam(true);
    }
  }, [hubIsHost]);

  // If player already selected a team on reconnect
  useEffect(() => {
    if (myTeamSide === "TEAM_A" || myTeamSide === "TEAM_B") {
      setHasJoinedTeam(true);
    }
  }, [myTeamSide]);

  // Trigger confetti on victory
  useEffect(() => {
    if (matchResult && matchResult.winningTeam) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [matchResult]);

  // Copy PIN
  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // Copy join link
  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/play?pin=${pin}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Player joins Team A or B (Max 25 players per team)
  const handleJoinTeam = (team: "TEAM_A" | "TEAM_B") => {
    const isTeamAFull = team === "TEAM_A" && lobbyState.teamACount >= 25;
    const isTeamBFull = team === "TEAM_B" && lobbyState.teamBCount >= 25;
    if (isTeamAFull || isTeamBFull) {
      alert(`Đội ${team === "TEAM_A" ? "Lam (Phe A)" : "Xích (Phe B)"} đã đủ tối đa 25 người chơi!`);
      return;
    }

    const validId = playerId || crypto.randomUUID();
    setPlayerId(validId);
    Cookies.set("guest_player_id", validId, { expires: 1 });
    Cookies.set("guest_nickname", nickname, { expires: 1 });

    joinNavalRoom(pin, validId, team, nickname);
    setHasJoinedTeam(true);
  };

  // Switch team in lobby (Max 25 players per team)
  const handleSwitchTeam = () => {
    const newTeam = myTeamSide === "TEAM_A" ? "TEAM_B" : "TEAM_A";
    const targetCount = newTeam === "TEAM_A" ? lobbyState.teamACount : lobbyState.teamBCount;
    if (targetCount >= 25) {
      alert(`Đội ${newTeam === "TEAM_A" ? "Lam (Phe A)" : "Xích (Phe B)"} đã đủ tối đa 25 người chơi!`);
      return;
    }
    switchTeam(pin, playerId, newTeam);
  };

  // Exit Room
  const handleLeaveRoom = () => {
    if (!isHost && playerId) {
      leaveNavalRoom(pin, playerId);
    }
    router.push(isHost ? "/dashboard" : "/play");
  };

  // Replay match (Host resets match back to lobby for everyone)
  const handleResetMatch = () => {
    resetMatch(pin);
  };

  // Submit Answer
  const handleAnswerSubmit = (slideId: string, answerData: string, timeMs: number) => {
    setHasAnsweredCurrentSlide(true);
    submitAnswer(pin, slideId, answerData, timeMs);
  };

  // Next Question
  const handleNextQuestion = () => {
    if (currentSlideIndex + 1 < slides.length) {
      setCurrentSlideIndex((prev) => prev + 1);
      setHasAnsweredCurrentSlide(false);
    }
  };

  // Fire Shot
  const handleFireShot = (r: number, c: number, isPrecision: boolean) => {
    fireShot(pin, r, c, isPrecision);
    if (skillMode === "PRECISION") {
      setSkillMode("NORMAL");
    }
  };

  // Use Radar
  const handleUseRadar = (r: number, c: number) => {
    useSkill(pin, "RADAR", r, c);
    setSkillMode("NORMAL");
  };

  // Apply Shield
  const handleApplyShield = (r: number, c: number) => {
    useSkill(pin, "SHIELD", r, c);
    setSkillMode("NORMAL");
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    navalSounds.isMuted = nextMute;
  };

  const currentSlide = slides[currentSlideIndex] || null;
  const totalJoinedPlayers = lobbyState.teamACount + lobbyState.teamBCount;
  const canStartMatch = isHost || totalJoinedPlayers >= 1;
  const teamDiff = Math.abs(lobbyState.teamACount - lobbyState.teamBCount);
  const isSpectatorMode = isHost && myTeamSide !== "TEAM_A" && myTeamSide !== "TEAM_B";

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ocean-water-grid relative ${
        screenShake ? "animate-screen-shake" : ""
      }`}
    >
      {/* Top Navigation Header */}
      <header className="w-full bg-slate-900/95 border-b border-slate-800/80 px-4 py-3 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Thoát phòng"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h1 className="font-extrabold text-base tracking-wide bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent uppercase">
              Hải Tặc Tri Thức
            </h1>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            PIN: {pin}
          </span>
        </div>

        {/* User Role & Team Badge */}
        <div className="flex items-center gap-3">
          {isHost ? (
            <div className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border-indigo-400/40">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>CHỦ PHÒNG (TRỌNG TÀI)</span>
            </div>
          ) : hasJoinedTeam ? (
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                myTeamSide === "TEAM_A"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-400/40"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              <span>{myTeamSide === "TEAM_A" ? "HẠM ĐỘI LAM (A)" : "HẠM ĐỘI XÍCH (B)"}</span>
              <span className="text-slate-400 font-normal">({nickname})</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isMuted
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
            }`}
            title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-all flex items-center gap-1 cursor-pointer"
            title="Rời phòng"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rời phòng</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-5">
        {/* =========================================================================
            PHASE 1: PRE-GAME LOBBY (Trận đấu CHƯA bắt đầu)
           ========================================================================= */}
        {!isMatchStarted && (
          <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
            {/* 1.1: HOST LOBBY COMMAND CENTER WITH PIN & QR CODE */}
            {isHost && (
              <div className="w-full bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
                  {/* Left: PIN showcase */}
                  <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Mã Phòng Tham Gia Trò Chơi
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-blue-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]">
                      {pin}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                      Gửi mã PIN này hoặc quét mã QR bên cạnh để người chơi tham gia hạm đội và chuẩn bị khai chiến!
                    </p>

                    {/* Copy Buttons */}
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <button
                        type="button"
                        onClick={handleCopyPin}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                      >
                        {copiedPin ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedPin ? "Đã sao chép PIN!" : "Sao chép mã PIN"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                        <span>{copiedLink ? "Đã sao chép link!" : "Sao chép link mời"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: QR Code & Start Match Action */}
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* QR Code Container */}
                    <div className="bg-white p-3 rounded-2xl shadow-xl border-2 border-cyan-400/50 flex flex-col items-center">
                      {roomData?.qrCodeBase64 ? (
                        <img
                          src={`data:image/png;base64,${roomData.qrCodeBase64}`}
                          alt="QR Code"
                          className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                        />
                      ) : (
                        <div className="w-32 h-32 sm:w-36 sm:h-36 flex flex-col items-center justify-center text-slate-600 font-mono text-[11px] p-2 text-center bg-slate-100 rounded-lg">
                          <QrCode className="w-10 h-10 text-slate-700 mb-1" />
                          <span>Quét mã PIN:</span>
                          <span className="font-bold text-slate-900">{pin}</span>
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-slate-800 uppercase tracking-tight mt-1">
                        Quét mã tham gia
                      </span>
                    </div>

                    {/* Start Match Button */}
                    <div className="flex flex-col gap-2 items-center sm:items-start">
                      <button
                        type="button"
                        disabled={!canStartMatch}
                        onClick={() => {
                          if (canStartMatch) {
                            if (totalJoinedPlayers === 0 && myTeamSide !== "TEAM_A" && myTeamSide !== "TEAM_B") {
                              handleJoinTeam("TEAM_A");
                            }
                            startMatch(pin);
                          }
                        }}
                        className={`px-8 py-4 rounded-2xl text-base font-extrabold flex items-center gap-3 transition-all ${
                          canStartMatch
                            ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_35px_rgba(16,185,129,0.5)] active:scale-95 cursor-pointer animate-pulse"
                            : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <Play className="w-6 h-6 fill-current" />
                        <span>
                          {totalJoinedPlayers === 0
                            ? "BẮT ĐẦU TRẬN ĐẤU (CHƠI 1 MÌNH / TEST)"
                            : totalJoinedPlayers === 1
                            ? "BẮT ĐẦU TRẬN ĐẤU (SOLO CHIẾN HẠM)"
                            : `BẮT ĐẦU TRẬN ĐẤU (${lobbyState.teamACount} vs ${lobbyState.teamBCount})`}
                        </span>
                      </button>

                      {/* Status / Balance hints */}
                      {totalJoinedPlayers === 0 ? (
                        <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-semibold bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
                          <Swords className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>
                            Chế độ Chơi 1 Mình: Bạn sẽ tự động chỉ huy Hạm Đội Lam để săn lùng và tiêu diệt 5 chiến hạm ẩn của đối phương!
                          </span>
                        </div>
                      ) : (lobbyState.teamACount === 0 || lobbyState.teamBCount === 0) ? (
                        <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
                          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            Đang chơi Solo ({totalJoinedPlayers} người chơi): Khai hỏa các câu hỏi để bắn hạ toàn bộ 5 tàu chiến phe địch!
                          </span>
                        </div>
                      ) : teamDiff >= 2 ? (
                        <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-medium bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-xl">
                          <Swords className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>Hệ thống sẽ tự động cân bằng người chơi (chênh lệch {teamDiff} người)</span>
                        </div>
                      ) : teamDiff === 1 ? (
                        <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
                          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Chênh lệch 1 người: 1 thành viên ngẫu nhiên phe {lobbyState.teamACount < lobbyState.teamBCount ? "Lam" : "Xích"} sẽ nhận buff X2 phát bắn!
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-semibold">
                          ✓ Quân số hai bên cân bằng ({lobbyState.teamACount} vs {lobbyState.teamBCount}), sẵn sàng khai hỏa!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Neutral Referee Notice & Solo Play Toggle */}
                <div className="mt-4 px-4 py-3 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>
                      <strong>Quyền của Chủ Phòng:</strong>{" "}
                      {myTeamSide === "TEAM_A" || myTeamSide === "TEAM_B" ? (
                        <span>Bạn đang tham chiến trực tiếp với tư cách <em>Thuyền Trưởng ({myTeamSide === "TEAM_A" ? "Phe Lam" : "Phe Xích"})</em>.</span>
                      ) : (
                        <span>Bạn đang giữ vai trò <em>Trọng Tài Quan Sát</em>. Bạn có thể bấm tham chiến trực tiếp để tự mình chơi.</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {myTeamSide !== "TEAM_A" && (
                      <button
                        type="button"
                        onClick={() => handleJoinTeam("TEAM_A")}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs transition-all shadow cursor-pointer"
                      >
                        ⚔️ Vào Tham Chiến Phe Lam
                      </button>
                    )}
                    {roomData?.title && (
                      <span className="font-semibold text-cyan-300 hidden md:inline">
                        Bộ đề: {roomData.title} ({slides.length} câu)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 1.2: PLAYER PRE-JOIN TEAM SELECTION (If not joined team yet) */}
            {!isHost && !hasJoinedTeam && (
              <div className="w-full bg-slate-900/95 border-2 border-cyan-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-200">
                <Anchor className="w-14 h-14 text-cyan-400 mx-auto mb-3 animate-bounce" />
                <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                  Chọn Hạm Đội Tham Chiến
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mb-6">
                  Hãy chọn một phe và cùng đồng đội tiêu diệt 5 chiến hạm của đối phương bằng tri thức!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Team A Option */}
                  <button
                    type="button"
                    disabled={lobbyState.teamACount >= 25}
                    onClick={() => handleJoinTeam("TEAM_A")}
                    className={`p-5 rounded-2xl bg-gradient-to-b from-cyan-950 via-blue-900 to-slate-900 text-white font-bold border-2 border-cyan-400 shadow-xl shadow-cyan-500/20 transition-all flex flex-col items-center gap-3 ${
                      lobbyState.teamACount >= 25
                        ? "opacity-50 cursor-not-allowed border-slate-700"
                        : "hover:from-cyan-900 hover:to-blue-800 hover:scale-105 active:scale-95 cursor-pointer"
                    }`}
                  >
                    <div className="w-20 h-20 rounded-xl bg-cyan-900/40 border border-cyan-400/40 flex items-center justify-center p-2 shadow-inner">
                      <img
                        src={NAVAL_ASSETS.ships[4]}
                        alt="Hạm Đội Lam"
                        className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                      />
                    </div>
                    <span className="text-cyan-300 font-extrabold text-base tracking-wide">HẠM ĐỘI LAM (PHE A)</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${
                        lobbyState.teamACount >= 25
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          : "bg-cyan-500/20 text-cyan-200 border border-cyan-400/30"
                      }`}
                    >
                      {lobbyState.teamACount >= 25 ? "ĐÃ ĐẦY (25/25)" : `${lobbyState.teamACount}/25 thuyền viên`}
                    </span>
                  </button>

                  {/* Team B Option */}
                  <button
                    type="button"
                    disabled={lobbyState.teamBCount >= 25}
                    onClick={() => handleJoinTeam("TEAM_B")}
                    className={`p-5 rounded-2xl bg-gradient-to-b from-rose-950 via-red-900 to-slate-900 text-white font-bold border-2 border-rose-400 shadow-xl shadow-rose-500/20 transition-all flex flex-col items-center gap-3 ${
                      lobbyState.teamBCount >= 25
                        ? "opacity-50 cursor-not-allowed border-slate-700"
                        : "hover:from-rose-900 hover:to-red-800 hover:scale-105 active:scale-95 cursor-pointer"
                    }`}
                  >
                    <div className="w-20 h-20 rounded-xl bg-rose-900/40 border border-rose-400/40 flex items-center justify-center p-2 shadow-inner">
                      <img
                        src={NAVAL_ASSETS.ships[5]}
                        alt="Hạm Đội Xích"
                        className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                      />
                    </div>
                    <span className="text-rose-300 font-extrabold text-base tracking-wide">HẠM ĐỘI XÍCH (PHE B)</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${
                        lobbyState.teamBCount >= 25
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          : "bg-rose-500/20 text-rose-200 border border-rose-400/30"
                      }`}
                    >
                      {lobbyState.teamBCount >= 25 ? "ĐÃ ĐẦY (25/25)" : `${lobbyState.teamBCount}/25 thuyền viên`}
                    </span>
                  </button>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Thoát khỏi phòng chơi
                  </button>
                </div>
              </div>
            )}

            {/* 1.3: PLAYER WAITING LOBBY (Joined team, waiting for host to start) */}
            {!isHost && hasJoinedTeam && (
              <div className="w-full bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-6 text-center shadow-2xl backdrop-blur-md flex flex-col items-center gap-4 animate-in fade-in">
                <div className="relative">
                  <Compass className="w-16 h-16 text-cyan-400 animate-spin" style={{ animationDuration: "12s" }} />
                  <Anchor className="w-8 h-8 text-white absolute inset-0 m-auto" />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs uppercase font-extrabold text-cyan-400 tracking-wider">
                    Phòng Chờ Khai Chiến
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Đang Đợi Chủ Phòng Khai Hỏa Trận Đấu...
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    Trận đấu sẽ bắt đầu ngay khi Chủ phòng bấm Khởi động. Hãy giữ tinh thần và sẵn sàng giải đáp các câu hỏi!
                  </p>
                </div>

                {/* Team Info & Actions */}
                <div className="flex items-center gap-4 mt-2">
                  <div
                    className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${
                      myTeamSide === "TEAM_A"
                        ? "bg-cyan-950/80 text-cyan-300 border-cyan-400/50"
                        : "bg-rose-950/80 text-rose-300 border-rose-400/50"
                    }`}
                  >
                    <span>Bạn thuộc:</span>
                    <strong className="text-white">
                      {myTeamSide === "TEAM_A" ? "HẠM ĐỘI LAM (PHE A)" : "HẠM ĐỘI XÍCH (PHE B)"}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleSwitchTeam}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đổi Phe</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLeaveRoom}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Thoát Phòng</span>
                  </button>
                </div>
              </div>
            )}

            {/* 1.4: DUAL TEAM ROSTER DISPLAY (Hiển thị trực quan cho tất cả người chơi và Host trong sảnh) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              {/* Team A Column */}
              <div className="bg-slate-900/80 border-2 border-cyan-500/40 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                    <h4 className="font-extrabold text-sm text-cyan-300 uppercase tracking-wide">
                      Hạm Đội Lam (Phe A)
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    {lobbyState.teamACount}/25 Thuyền viên
                  </span>
                </div>

                  <div className="mt-3 flex-1 flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                    {lobbyState.teamAPlayers.length === 0 ? (
                      <p className="text-xs text-slate-500 italic my-auto text-center py-6">
                        Chưa có thuyền viên nào gia nhập Hạm Đội Lam
                      </p>
                    ) : (
                      lobbyState.teamAPlayers.map((p, idx) => (
                        <div
                          key={p.playerId || idx}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.nickname}`}
                              alt={p.nickname}
                              className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-500/30"
                            />
                            <span className="font-bold text-slate-200">{p.nickname}</span>
                          </div>
                          <span className="text-[10px] text-cyan-400 font-mono">Lam #{idx + 1}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Team B Column */}
                <div className="bg-slate-900/80 border-2 border-rose-500/40 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-rose-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-400 animate-pulse" />
                      <h4 className="font-extrabold text-sm text-rose-300 uppercase tracking-wide">
                        Hạm Đội Xích (Phe B)
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                      {lobbyState.teamBCount}/25 Thuyền viên
                    </span>
                  </div>

                  <div className="mt-3 flex-1 flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                    {lobbyState.teamBPlayers.length === 0 ? (
                      <p className="text-xs text-slate-500 italic my-auto text-center py-6">
                        Chưa có thuyền viên nào gia nhập Hạm Đội Xích
                      </p>
                    ) : (
                      lobbyState.teamBPlayers.map((p, idx) => (
                        <div
                          key={p.playerId || idx}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.nickname}`}
                              alt={p.nickname}
                              className="w-7 h-7 rounded-full bg-rose-950 border border-rose-500/30"
                            />
                            <span className="font-bold text-slate-200">{p.nickname}</span>
                          </div>
                          <span className="text-[10px] text-rose-400 font-mono">Xích #{idx + 1}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
          </div>
        )}

        {/* =========================================================================
            PHASE 2: COMBAT ARENA (Trận đấu ĐÃ bắt đầu)
           ========================================================================= */}
        {isMatchStarted && (
          <div className="w-full flex flex-col gap-4 animate-in fade-in duration-300">
            {/* Top Tactical Status Bar */}
            <NavalStatusBar
              myTeamSide={myTeamSide}
              teamAShipsRemaining={teamAShipsRemaining}
              teamBShipsRemaining={teamBShipsRemaining}
              currentCombo={currentCombo}
              energyPoints={energyPoints}
              shotsEarned={shotsEarned}
              radarRemaining={radarRemaining}
              shieldRemaining={shieldRemaining}
              skillMode={skillMode}
              onSelectSkill={setSkillMode}
              isHost={isHost}
              isMatchStarted={isMatchStarted}
              onStartMatch={() => startMatch(pin)}
              onEndEarly={() => endMatchEarly(pin)}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
            />

            {/* 2.1: HOST SPECTATOR ARENA (Live view of both fleets) */}
            {isSpectatorMode ? (
              <div className="flex flex-col gap-4 w-full">
                {/* Host notice if doubleShot buff active */}
                {doubleShotInfo && (
                  <div className="w-full px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/40 text-amber-200 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        ⚡ Trọng tài lưu ý: Thuyền viên <strong>{doubleShotInfo.nickname}</strong> ({doubleShotInfo.teamSide === "TEAM_A" ? "Hạm Đội Lam" : "Hạm Đội Xích"}) được nhận buff X2 Bắn Pháo để cân bằng lực lượng (do chênh lệch 1 người).
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                      CÂN BẰNG X2
                    </span>
                  </div>
                )}
                {/* Dual Fleet Live Grids for Spectator */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Team A Fleet (Phe Lam) */}
                  <NavalGrid
                    title="Chiến Trường Hạm Đội Lam (Phe A)"
                    isEnemy={false}
                    mapSize={mapSize}
                    myShips={hostSpectatorState?.teamAShips || []}
                    enemyShots={hostSpectatorState?.teamBShotsAgainstA || []}
                    isSpectator={true}
                    teamTheme="blue"
                  />

                  {/* Team B Fleet (Phe Xích) */}
                  <NavalGrid
                    title="Chiến Trường Hạm Đội Xích (Phe B)"
                    isEnemy={false}
                    mapSize={mapSize}
                    myShips={hostSpectatorState?.teamBShips || []}
                    enemyShots={hostSpectatorState?.teamAShotsAgainstB || []}
                    isSpectator={true}
                    teamTheme="red"
                  />
                </div>

                {/* Host Combat Log & Full Leaderboard */}
                <NavalLogAndLeaderboard
                  combatLogs={combatLogs}
                  leaderboard={leaderboard}
                  matchResult={matchResult}
                />
              </div>
            ) : (
              /* 2.2: PLAYER COMBAT ARENA */
              <div className="flex flex-col gap-4 w-full">
                {/* Double Shot Buff Banner */}
                {isDoubleShot && (
                  <div className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-amber-400 text-amber-200 text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg shadow-amber-500/20 animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0 animate-bounce" />
                      <span>
                        ⚡ BẠN ĐANG CÓ HIỆU ỨNG X2 BẮN PHÁO: Bạn được chọn ngẫu nhiên nhận bùa X2! Trả lời đúng mỗi câu hỏi bạn được thưởng 2 lượt bắn đại bác (do hạm đội ít hơn 1 người)!
                      </span>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black uppercase tracking-wider shrink-0">
                      BUFF X2
                    </span>
                  </div>
                )}

                {!isDoubleShot && doubleShotInfo && (
                  <div className="w-full px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Chiến binh <strong>{doubleShotInfo.nickname}</strong> ({doubleShotInfo.teamSide === "TEAM_A" ? "Hạm Đội Lam" : "Hạm Đội Xích"}) đang sở hữu bùa X2 Bắn Pháo để cân bằng lực lượng!
                    </span>
                  </div>
                )}
                {/* Skill Instruction Banner */}
                {skillMode !== "NORMAL" && (
                  <div className="w-full px-4 py-2 rounded-xl bg-cyan-950/80 border border-cyan-400/60 text-xs font-semibold text-cyan-200 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>
                        {skillMode === "RADAR" && "Chế độ RADAR: Hãy nhấp vào 1 ô trên bản đồ ĐỐI PHƯƠNG để quét vùng 3x3 quanh tâm!"}
                        {skillMode === "PRECISION" && "Chế độ BẮN CHÍNH XÁC: Chọn 1 ô trên bản đồ ĐỐI PHƯƠNG để tung đòn ngắm chuẩn xác!"}
                        {skillMode === "SHIELD" && "Chế độ LÁ CHẮN: Nhấp vào 1 ô tàu còn nguyên trên bản đồ ĐỘI BẠN để bọc lá chắn bảo vệ!"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSkillMode("NORMAL")}
                      className="text-[11px] underline text-slate-300 hover:text-white cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                )}

                {/* Dual Grids: Friendly Fleet & Enemy Waters */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Friendly Fleet Grid */}
                  <NavalGrid
                    title={`Hạm Đội Đội Bạn (${myTeamSide === "TEAM_A" ? "Lam A" : "Xích B"})`}
                    isEnemy={false}
                    mapSize={mapSize}
                    myShips={myShips}
                    skillMode={skillMode}
                    teamTheme={myTeamSide === "TEAM_A" ? "blue" : "red"}
                    onApplyShield={handleApplyShield}
                  />

                  {/* Enemy Waters Grid */}
                  <NavalGrid
                    title={`Hải Phận Đối Phương (${myTeamSide === "TEAM_A" ? "Xích B" : "Lam A"})`}
                    isEnemy={true}
                    mapSize={mapSize}
                    enemyShots={enemyShots}
                    shotsEarned={shotsEarned}
                    radarScanWave={radarScanWave}
                    skillMode={skillMode}
                    teamTheme={myTeamSide === "TEAM_A" ? "red" : "blue"}
                    onFire={handleFireShot}
                    onUseRadar={handleUseRadar}
                  />
                </div>

                {/* Question HUD & Combat Log */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Question HUD */}
                  <NavalQuestionHUD
                    currentSlide={currentSlide}
                    hasAnswered={hasAnsweredCurrentSlide}
                    onSubmit={handleAnswerSubmit}
                    shotsEarned={shotsEarned}
                    currentCombo={currentCombo}
                    onNextQuestion={handleNextQuestion}
                    currentQuestionIndex={currentSlideIndex}
                    totalQuestions={slides.length > 0 ? slides.length : 1}
                    isDoubleShot={isDoubleShot}
                  />

                  {/* Combat Log & Leaderboard */}
                  <NavalLogAndLeaderboard
                    combatLogs={combatLogs}
                    leaderboard={leaderboard}
                    matchResult={matchResult}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            PHASE 3: VICTORY / MATCH RESULT MODAL
           ========================================================================= */}
        {matchResult && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center relative overflow-hidden animate-rank-jump">
              {/* Trophy Header */}
              <Crown className="w-16 h-16 text-amber-400 mx-auto mb-2 animate-bounce" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide uppercase">
                {matchResult.winningTeam === "DRAW"
                  ? "KẾT QUẢ HÒA!"
                  : `HẠM ĐỘI ${matchResult.winningTeam === "TEAM_A" ? "LAM (PHE A)" : "XÍCH (PHE B)"} CHIẾN THẮNG!`}
              </h2>

              {/* Flagship Artwork */}
              <div className="w-24 h-24 mx-auto my-3 rounded-2xl bg-gradient-to-b from-amber-500/20 to-slate-900 border border-amber-400/40 flex items-center justify-center p-2.5 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                <img
                  src={
                    matchResult.winningTeam === "TEAM_A"
                      ? NAVAL_ASSETS.ships[4]
                      : matchResult.winningTeam === "TEAM_B"
                      ? NAVAL_ASSETS.ships[5]
                      : NAVAL_ASSETS.ships[3]
                  }
                  alt="Victory Ship"
                  className="w-full h-full object-contain animate-float"
                />
              </div>

              <p className="text-sm font-semibold text-amber-300 mt-1 mb-4">
                {matchResult.winReason}
              </p>

              {/* 4 Priority Criteria Comparison Box */}
              {(matchResult.teamA || matchResult.teamB) && (
                <div className="my-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
                  <h4 className="font-bold text-slate-300 mb-2 uppercase tracking-wider text-[11px]">
                    Đối Chiếu 4 Tiêu Chí Phân Định Chiến Thắng
                  </h4>
                  <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-800 font-bold text-slate-400">
                    <span>Chỉ Số Trận Đấu</span>
                    <span className="text-cyan-400">Phe Lam (A)</span>
                    <span className="text-rose-400">Phe Xích (B)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">1. Số tàu đánh chìm:</span>
                    <span className="font-bold text-white">{matchResult.teamA?.shipsSunk ?? 0} tàu</span>
                    <span className="font-bold text-white">{matchResult.teamB?.shipsSunk ?? 0} tàu</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">2. Số ô tàu bắn trúng:</span>
                    <span className="font-bold text-white">{matchResult.teamA?.totalHitCells ?? 0} ô</span>
                    <span className="font-bold text-white">{matchResult.teamB?.totalHitCells ?? 0} ô</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">3. Tỷ lệ trả lời đúng:</span>
                    <span className="font-bold text-white">
                      {Math.round((matchResult.teamA?.accuracyRate ?? 0) * 100)}%
                    </span>
                    <span className="font-bold text-white">
                      {Math.round((matchResult.teamB?.accuracyRate ?? 0) * 100)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-1.5">
                    <span className="text-slate-400">4. Tổng thời gian trả lời:</span>
                    <span className="font-bold text-white">{matchResult.teamA?.totalResponseTimeMs ?? 0} ms</span>
                    <span className="font-bold text-white">{matchResult.teamB?.totalResponseTimeMs ?? 0} ms</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {isHost ? (
                  <>
                    <button
                      type="button"
                      onClick={handleResetMatch}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Chơi Lại Ván Mới</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(`/reports/${roomData?.id || roomData?.roomId || pin}`)}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Xem & Xuất Báo Cáo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/home")}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Home className="w-4 h-4" />
                      <span>Quay Lại Trang Chủ</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        // Trở lại phòng chờ
                        setHasJoinedTeam(true);
                      }}
                      className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Trở Lại Phòng Chờ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/home")}
                      className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Home className="w-4 h-4" />
                      <span>Quay Lại Trang Chủ</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            CONFIRM EXIT MODAL
           ========================================================================= */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Bạn có chắc muốn thoát phòng?</h3>
              <p className="text-xs text-slate-400 mb-6">
                {isHost
                  ? "Nếu bạn thoát, phòng chơi vẫn duy trì nhưng phiên trọng tài sẽ tạm dừng."
                  : "Bạn sẽ rời khỏi hạm đội và quay về trang chủ."}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                >
                  Ở lại phòng
                </button>
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  Xác nhận thoát
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
