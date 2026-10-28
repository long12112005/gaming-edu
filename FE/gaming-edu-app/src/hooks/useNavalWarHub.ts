"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";
import { navalSounds } from "@/lib/navalSoundEffects";

const NAVAL_HUB_URL = process.env.NEXT_PUBLIC_NAVAL_HUB_URL || "http://localhost:5000/hubs/naval-war";

export interface ShipCell {
  r: number;
  c: number;
  hit: boolean;
  shielded: boolean;
}

export interface NavalShipModel {
  id: string;
  shipType: number;
  orientation?: string;
  coordinates: ShipCell[];
  isSunk: boolean;
}

export interface ShotHistoryItem {
  targetRow: number;
  targetCol: number;
  result: "MISS" | "HIT" | "SUNK" | "BLOCKED_BY_SHIELD" | string;
  sunkShipType?: number;
}

export interface CombatLogItem {
  id: string;
  text: string;
  type: "HIT" | "MISS" | "SUNK" | "SHIELD" | "RADAR" | "INFO";
  time: string;
}

export interface NavalPlayerContribution {
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  teamSide?: string;
  totalScore: number;
  currentCombo: number;
  maxCombo: number;
  energyPoints: number;
  shotsEarned: number;
  validShotsCount: number;
  hitsCount: number;
  shipsSunkContribution: number;
  skillsUsedCount: number;
  hitAccuracy: number;
}

export interface NavalTeamSummary {
  teamSide: string;
  shipsRemaining: number;
  shipsSunk: number;
  totalHitCells: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracyRate: number;
  totalResponseTimeMs: number;
}

export interface LobbyPlayer {
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  teamSide: string;
  joinedAt: string;
}

export interface NavalLobbyState {
  pinCode: string;
  totalPlayers: number;
  teamAPlayers: LobbyPlayer[];
  teamBPlayers: LobbyPlayer[];
  teamACount: number;
  teamBCount: number;
}

export interface HostSpectatorState {
  roomId: string;
  pinCode: string;
  mapSize: number;
  teamAShips: NavalShipModel[];
  teamBShips: NavalShipModel[];
  teamAShotsAgainstB: ShotHistoryItem[];
  teamBShotsAgainstA: ShotHistoryItem[];
  teamAShipsRemaining: number;
  teamBShipsRemaining: number;
  teamARadarRemaining: number;
  teamAShieldRemaining: number;
  teamBRadarRemaining: number;
  teamBShieldRemaining: number;
  teamACombo: number;
  teamBCombo: number;
  leaderboard?: NavalPlayerContribution[];
  combatLogs?: CombatLogItem[];
}

export interface NavalMatchResult {
  isGameOver: boolean;
  isEarlyTermination: boolean;
  winningTeam: string | null;
  winReason: string | null;
  priorityCriterion: string | null;
  teamA?: NavalTeamSummary;
  teamB?: NavalTeamSummary;
}

export function useNavalWarHub(pinCode?: string) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [myTeamSide, setMyTeamSide] = useState<"TEAM_A" | "TEAM_B" | "HOST" | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [myNickname, setMyNickname] = useState<string>("Thuyền Trưởng");

  // Hiệu ứng x2 Bắn Pháo khi chênh lệch 1 người
  const [isDoubleShot, setIsDoubleShot] = useState<boolean>(false);
  const [doubleShotInfo, setDoubleShotInfo] = useState<{
    playerId: string;
    nickname: string;
    teamSide: string;
  } | null>(null);

  // Lobby state
  const [lobbyState, setLobbyState] = useState<NavalLobbyState>({
    pinCode: pinCode || "",
    totalPlayers: 0,
    teamAPlayers: [],
    teamBPlayers: [],
    teamACount: 0,
    teamBCount: 0,
  });

  // Host Spectator State
  const [hostSpectatorState, setHostSpectatorState] = useState<HostSpectatorState | null>(null);

  // Game battle states
  const [mapSize, setMapSize] = useState<number>(15);
  const [isMatchStarted, setIsMatchStarted] = useState<boolean>(false);
  const [myShips, setMyShips] = useState<NavalShipModel[]>([]);
  const [enemyShots, setEnemyShots] = useState<ShotHistoryItem[]>([]);
  const [shotsEarned, setShotsEarned] = useState<number>(0);
  const [currentCombo, setCurrentCombo] = useState<number>(0);
  const [energyPoints, setEnergyPoints] = useState<number>(0);

  // Teams fleet states
  const [teamAShipsRemaining, setTeamAShipsRemaining] = useState<number>(5);
  const [teamBShipsRemaining, setTeamBShipsRemaining] = useState<number>(5);
  const [radarRemaining, setRadarRemaining] = useState<number>(2);
  const [shieldRemaining, setShieldRemaining] = useState<number>(2);

  // Tactical visual states
  const [radarScanWave, setRadarScanWave] = useState<{ centerRow: number; centerCol: number; detected: boolean } | null>(null);
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [combatLogs, setCombatLogs] = useState<CombatLogItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<NavalPlayerContribution[]>([]);
  const [matchResult, setMatchResult] = useState<NavalMatchResult | null>(null);

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const addCombatLog = useCallback((text: string, type: CombatLogItem["type"]) => {
    const item: CombatLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      type,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    setCombatLogs((prev) => [item, ...prev.slice(0, 49)]);
  }, []);

  const triggerScreenShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 500);
  }, []);

  // Connect to Naval SignalR Hub
  useEffect(() => {
    const token = Cookies.get("token");
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(NAVAL_HUB_URL, {
        accessTokenFactory: () => token || "",
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 1000, 3000, 5000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connectionRef.current = conn;

    // ── REGISTER SIGNALR EVENTS ──────────────────────────────────────────

    conn.on("NavalRoomJoined", (data) => {
      if (data.isHost) {
        setIsHost(true);
      }
      if (data.teamSide === "HOST") {
        setMyTeamSide("HOST");
        setMyNickname(data.nickname || "Chủ Phòng (Trọng Tài)");
      } else {
        setMyTeamSide(data.teamSide);
        if (data.playerId) setMyPlayerId(data.playerId);
        if (data.nickname) setMyNickname(data.nickname);
      }
      if (data.mapSize) setMapSize(data.mapSize);
      if (data.isMatchStarted !== undefined) setIsMatchStarted(data.isMatchStarted);
      addCombatLog(
        data.teamSide === "HOST" ? "Đã tham gia với tư cách Trọng tài quan sát trung lập!" : `Gia nhập ${data.teamSide === "TEAM_A" ? "Hạm Đội Lam" : "Hạm Đội Xích"} thành công!`,
        "INFO"
      );
    });

    conn.on("NavalLobbyState", (data: NavalLobbyState) => {
      setLobbyState(data);
    });

    conn.on("NavalHostSpectatorState", (data: HostSpectatorState) => {
      setHostSpectatorState(data);
      if (data.teamAShipsRemaining !== undefined) setTeamAShipsRemaining(data.teamAShipsRemaining);
      if (data.teamBShipsRemaining !== undefined) setTeamBShipsRemaining(data.teamBShipsRemaining);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.combatLogs && Array.isArray(data.combatLogs)) {
        setCombatLogs(data.combatLogs);
      }
    });

    conn.on("NavalHostSpectatorUpdated", (data: HostSpectatorState) => {
      setHostSpectatorState(data);
      if (data.teamAShipsRemaining !== undefined) setTeamAShipsRemaining(data.teamAShipsRemaining);
      if (data.teamBShipsRemaining !== undefined) setTeamBShipsRemaining(data.teamBShipsRemaining);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.combatLogs && Array.isArray(data.combatLogs)) {
        setCombatLogs(data.combatLogs);
      }
    });

    conn.on("NavalMatchReset", () => {
      setIsMatchStarted(false);
      setMatchResult(null);
      setIsDoubleShot(false);
      setDoubleShotInfo(null);
      setMyShips([]);
      setEnemyShots([]);
      setShotsEarned(0);
      setCurrentCombo(0);
      setEnergyPoints(0);
      setTeamAShipsRemaining(5);
      setTeamBShipsRemaining(5);
      setRadarRemaining(2);
      setShieldRemaining(2);
      setHostSpectatorState(null);
      addCombatLog("Trận đấu đã được Host làm mới về sảnh chờ!", "INFO");
    });

    conn.on("NavalTeamSwitched", (data) => {
      setMyTeamSide(data.teamSide);
      addCombatLog(`Đã chuyển sang ${data.teamSide === "TEAM_A" ? "Hạm Đội Lam" : "Hạm Đội Xích"}!`, "INFO");
    });

    conn.on("NavalPlayerRebalanced", (data) => {
      const currentPid = myPlayerId || Cookies.get("guest_player_id") || Cookies.get("player_id");
      if (data.playerId === currentPid) {
        setMyTeamSide(data.newTeamSide);
        addCombatLog(data.message || `Hệ thống tự động chuyển bạn sang ${data.newTeamSide === "TEAM_A" ? "Hạm Đội Lam" : "Hạm Đội Xích"} để cân bằng quân số!`, "INFO");
      }
    });

    conn.on("NavalPlayerLeft", (data) => {
      addCombatLog(`Thuyền viên ${data.nickname} đã rời khỏi phòng.`, "INFO");
    });

    conn.on("NavalPlayerJoined", (data) => {
      addCombatLog(`Thuyền viên ${data.nickname} vừa gia nhập ${data.teamSide === "TEAM_A" ? "Hạm Đội Lam" : "Hạm Đội Xích"}!`, "INFO");
    });

    conn.on("NavalMatchStarted", (data) => {
      setIsMatchStarted(true);
      if (data.mapSize) setMapSize(data.mapSize);

      if (data.doubleShotPlayerId) {
        setDoubleShotInfo({
          playerId: data.doubleShotPlayerId,
          nickname: data.doubleShotPlayerNickname || "Thuyền Viên",
          teamSide: data.doubleShotTeam || "",
        });
        const currentPid = myPlayerId || Cookies.get("guest_player_id") || Cookies.get("player_id");
        const amIBuffed = Boolean(currentPid && currentPid.toLowerCase() === data.doubleShotPlayerId.toLowerCase());
        setIsDoubleShot(amIBuffed);
        if (amIBuffed) {
          addCombatLog("⚡ BẠN ĐƯỢC NHẬN HIỆU ỨNG X2 BẮN PHÁO! Trả lời đúng mỗi câu được bắn 2 ô pháo (Do đội ít người hơn)!", "INFO");
        } else if (data.doubleShotPlayerNickname) {
          addCombatLog(`⚡ Chiến binh ${data.doubleShotPlayerNickname} (${data.doubleShotTeam === "TEAM_A" ? "Hạm Đội Lam" : "Hạm Đội Xích"}) nhận hiệu ứng X2 Bắn Pháo để cân bằng lực lượng!`, "INFO");
        }
      } else {
        setIsDoubleShot(false);
        setDoubleShotInfo(null);
      }

      addCombatLog("HỒI CÒI KHAI CHIẾN! Trận thủy chiến bắt đầu!", "INFO");
      navalSounds.playCannon();
    });

    conn.on("NavalMapState", (data) => {
      if (data.myTeamSide) setMyTeamSide(data.myTeamSide);
      setMyShips(data.myShips || []);
      setEnemyShots(data.enemyShotsHistory || []);
      if (data.mapSize) setMapSize(data.mapSize);
      if (data.doubleShotPlayerId) {
        const currentPid = myPlayerId || Cookies.get("guest_player_id") || Cookies.get("player_id");
        setIsDoubleShot(Boolean(currentPid && currentPid.toLowerCase() === data.doubleShotPlayerId.toLowerCase()));
      }
    });

    conn.on("NavalAnswerResult", (data) => {
      setCurrentCombo(data.currentCombo);
      setEnergyPoints(data.energyPoints);
      setShotsEarned(data.shotsEarned);
      if (data.isDoubleShot !== undefined) {
        setIsDoubleShot(data.isDoubleShot);
      }

      if (data.isCorrect) {
        navalSounds.playCorrect();
        const shotsMsg = data.isDoubleShot ? "Nhận 2 lượt bắn (Hiệu ứng X2)!" : "Nhận 1 lượt bắn.";
        addCombatLog(`Trả lời chính xác! ${shotsMsg} Chuỗi combo: ${data.currentCombo}`, "INFO");
      } else {
        navalSounds.playWrong();
        addCombatLog("Trả lời sai! Mất chuỗi combo.", "INFO");
      }
    });

    conn.on("NavalPlayerAnswered", (data) => {
      if (data.isCorrect && data.currentCombo >= 2) {
        addCombatLog(`${data.nickname} (${data.teamSide}) đạt chuỗi đúng ${data.currentCombo} câu liên tiếp!`, "INFO");
      }
    });

    conn.on("NavalShotFired", (data) => {
      navalSounds.playCannon();

      // Cập nhật các ô bắn trúng / bắn trượt trên bản đồ đối phương
      setEnemyShots((prev) => {
        const filtered = prev.filter((s) => !(s.targetRow === data.targetRow && s.targetCol === data.targetCol));
        return [
          ...filtered,
          {
            targetRow: data.targetRow,
            targetCol: data.targetCol,
            result: data.result,
            sunkShipType: data.sunkShipType,
          },
        ];
      });

      if (data.result === "BLOCKED_BY_SHIELD") {
        navalSounds.playShieldActivate();
        addCombatLog(`Lá chắn phòng thủ đã ngăn chặn đạn tại (${data.targetRow}, ${data.targetCol})!`, "SHIELD");
      } else if (data.result === "SUNK") {
        navalSounds.playShipSunk();
        triggerScreenShake();
        addCombatLog(`ĐÁNH CHÌM TÀU! ${data.PlayerNickname} đã đánh chìm Tàu số ${data.sunkShipType} của ${data.targetTeam}!`, "SUNK");

        if (data.targetTeam === "TEAM_A") setTeamAShipsRemaining((prev) => Math.max(0, prev - 1));
        if (data.targetTeam === "TEAM_B") setTeamBShipsRemaining((prev) => Math.max(0, prev - 1));
      } else if (data.result === "HIT") {
        navalSounds.playHit();
        triggerScreenShake();
        addCombatLog(`TRÚNG ĐÍCH! ${data.PlayerNickname} bắn trúng tàu ${data.targetTeam} tại (${data.targetRow}, ${data.targetCol})!`, "HIT");
      } else {
        navalSounds.playMiss();
        addCombatLog(`${data.PlayerNickname} bắn trượt vào vùng nước tại (${data.targetRow}, ${data.targetCol}).`, "MISS");
      }
    });

    conn.on("NavalMyShipsUpdated", (data) => {
      setMyShips(data.myShips || []);
      if (data.shieldRemaining !== undefined) setShieldRemaining(data.shieldRemaining);
    });

    conn.on("RadarScanResult", (data) => {
      navalSounds.playRadarPing();
      setRadarRemaining(data.radarRemaining);
      setRadarScanWave({ centerRow: data.centerRow, centerCol: data.centerCol, detected: data.detected });

      addCombatLog(
        data.detected
          ? `Radar phát hiện có tàu địch tại vùng quét 3x3 quanh (${data.centerRow}, ${data.centerCol})!`
          : `Radar báo cáo không có tàu địch tại vùng (${data.centerRow}, ${data.centerCol}).`,
        "RADAR"
      );

      // Tự động tắt hiệu ứng sóng radar sau 4 giây
      setTimeout(() => setRadarScanWave(null), 4000);
    });

    conn.on("NavalSkillNotice", (data) => {
      addCombatLog(data.notice, "INFO");
    });

    conn.on("NavalMatchEnded", (data) => {
      setMatchResult({
        isGameOver: data.isGameOver,
        isEarlyTermination: data.isEarlyTermination,
        winningTeam: data.winningTeam,
        winReason: data.winReason,
        priorityCriterion: data.priorityCriterion,
        teamA: data.matchResult?.teamA || data.teamA,
        teamB: data.matchResult?.teamB || data.teamB,
      });

      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }

      addCombatLog(`TRẬN ĐẤU KẾT THÚC! ${data.winningTeam === "DRAW" ? "Kết quả Hòa!" : `Chiến thắng thuộc về ${data.winningTeam}!`}`, "SUNK");
    });

    conn.on("NavalReconnected", (data) => {
      if (data.isHost || data.teamSide === "HOST") {
        setIsHost(true);
        setMyTeamSide("HOST");
        setMyNickname(data.nickname || "Chủ Phòng (Trọng Tài)");
        if (data.spectatorState) {
          setHostSpectatorState(data.spectatorState);
        }
      } else {
        setIsHost(false);
        setMyPlayerId(data.playerId);
        setMyNickname(data.nickname);
        if (data.teamSide) setMyTeamSide(data.teamSide);
        if (data.myShips) setMyShips(data.myShips);
        if (data.enemyShots) setEnemyShots(data.enemyShots);
        setShotsEarned(data.shotsEarned ?? 0);
        setCurrentCombo(data.currentCombo ?? 0);
        setEnergyPoints(data.energyPoints ?? 0);
        setRadarRemaining(data.radarRemaining ?? 2);
        setShieldRemaining(data.shieldRemaining ?? 2);
      }

      if (data.mapSize) setMapSize(data.mapSize);
      setIsMatchStarted(data.isMatchStarted);
      setTeamAShipsRemaining(data.teamAShipsRemaining ?? 5);
      setTeamBShipsRemaining(data.teamBShipsRemaining ?? 5);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.combatLogs && Array.isArray(data.combatLogs)) {
        setCombatLogs(data.combatLogs);
      }
      if (data.matchResult) setMatchResult(data.matchResult);

      if (data.isDoubleShot !== undefined) {
        setIsDoubleShot(data.isDoubleShot);
      }
      if (data.doubleShotPlayerId) {
        setDoubleShotInfo({
          playerId: data.doubleShotPlayerId,
          nickname: data.doubleShotPlayerNickname || "Thuyền Viên",
          teamSide: data.doubleShotTeam || "",
        });
      }

      addCombatLog("Đã khôi phục trạng thái trận chiến (F5 Reconnect)!", "INFO");
    });

    conn.on("NavalError", (message) => {
      addCombatLog(`Lỗi: ${message}`, "INFO");
    });

    // Start connection
    conn
      .start()
      .then(() => {
        setIsConnected(true);
        setConnection(conn);

        // Gia nhập nhóm sảnh chờ của phòng để nhận danh sách thuyền viên tức thì
        if (pinCode) {
          conn.invoke("EnterNavalLobby", pinCode).catch((err) => {
            console.warn("EnterNavalLobby failed:", err);
          });
        }

        // Tự động khôi phục trạng thái tác chiến nếu đã có thông tin người chơi (F5)
        const storedPlayerId = Cookies.get("guest_player_id") || Cookies.get("player_id");
        if (pinCode && storedPlayerId) {
          conn.invoke("ReconnectRoom", pinCode, storedPlayerId).catch((err) => {
            console.warn("Auto-reconnect failed:", err);
          });
        }
      })
      .catch((err) => {
        console.error("SignalR NavalWarHub Connection Error:", err);
      });

    return () => {
      conn.stop();
    };
  }, [pinCode, addCombatLog, triggerScreenShake]);

  // Client actions
  const enterNavalLobby = useCallback(async (pin: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("EnterNavalLobby", pin);
    }
  }, []);

  const joinNavalRoom = useCallback(
    async (pin: string, playerId: string, teamSide: string, nickname?: string) => {
      if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
        await connectionRef.current.invoke("JoinNavalRoom", pin, playerId, teamSide, nickname || null);
      }
    },
    []
  );

  const reconnectRoom = useCallback(async (pin: string, playerId: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("ReconnectRoom", pin, playerId);
    }
  }, []);

  const switchTeam = useCallback(async (pin: string, playerId: string, newTeamSide: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("SwitchTeam", pin, playerId, newTeamSide);
    }
  }, []);

  const leaveNavalRoom = useCallback(async (pin: string, playerId: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("LeaveNavalRoom", pin, playerId);
    }
  }, []);

  const getLobbyState = useCallback(async (pin: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("GetLobbyState", pin);
    }
  }, []);

  const startMatch = useCallback(async (pin: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("StartMatch", pin);
    }
  }, []);

  const resetMatch = useCallback(async (pin: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("ResetMatch", pin);
    }
  }, []);

  const submitAnswer = useCallback(async (pin: string, slideId: string, answerData: string, timeMs: number) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("SubmitAnswer", pin, slideId, answerData, timeMs);
    }
  }, []);

  const fireShot = useCallback(async (pin: string, targetRow: number, targetCol: number, isPrecision: boolean = false) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("FireShot", pin, targetRow, targetCol, isPrecision);
    }
  }, []);

  const useSkill = useCallback(async (pin: string, skillType: string, targetRow: number, targetCol: number) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("UseSkill", pin, skillType, targetRow, targetCol);
    }
  }, []);

  const endMatchEarly = useCallback(async (pin: string) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("EndMatchEarly", pin);
    }
  }, []);

  return {
    connection,
    isConnected,
    isHost,
    pinCode,
    myTeamSide,
    myPlayerId,
    myNickname,
    isDoubleShot,
    doubleShotInfo,
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
    enterNavalLobby,
    joinNavalRoom,
    reconnectRoom,
    switchTeam,
    leaveNavalRoom,
    getLobbyState,
    startMatch,
    resetMatch,
    submitAnswer,
    fireShot,
    useSkill,
    endMatchEarly,
  };
}
