"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";

const MULTI_HUB_URL =
  process.env.NEXT_PUBLIC_MULTI_HUB_URL ||
  (process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")}/hubs/multi-game`
    : "http://localhost:5000/hubs/multi-game");

export interface GameActionBroadcastItem {
  playerId: string;
  nickname: string;
  teamSide?: string;
  actionType: string;
  result: string;
  message: string;
  data?: any;
}

export interface SkillTriggeredItem {
  playerId: string;
  nickname: string;
  teamSide?: string;
  skillName: string;
  message: string;
  data?: any;
}

export interface PlayerAnsweredItem {
  playerId: string;
  nickname: string;
  teamSide?: string;
  totalScore: number;
  isCorrect: boolean;
  actionPointsEarned: number;
  totalActionPoints: number;
  currentCombo: number;
}

export interface MatchEndedData {
  roomId?: string;
  winnerTeam?: string;
  winner?: string;
  message: string;
  summary?: any;
}

export function useMultiGameHub(pinCode?: string, playerId?: string) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [gameState, setGameState] = useState<any>(null);
  const [lastAction, setLastAction] = useState<GameActionBroadcastItem | null>(null);
  const [lastSkill, setLastSkill] = useState<SkillTriggeredItem | null>(null);
  const [lastAnswerNotification, setLastAnswerNotification] = useState<PlayerAnsweredItem | null>(null);
  const [lastAnswerResult, setLastAnswerResult] = useState<any>(null);
  const [matchStartedData, setMatchStartedData] = useState<any>(null);
  const [matchEndedData, setMatchEndedData] = useState<MatchEndedData | null>(null);
  const [actionPoints, setActionPoints] = useState<number>(0);
  const [playerRole, setPlayerRole] = useState<string>("MEMBER");
  const [isIsolated, setIsIsolated] = useState<boolean>(false);
  const [teamSide, setTeamSide] = useState<string>("TEAM_A");
  const [roomStatus, setRoomStatus] = useState<string>("WAITING");
  const [roster, setRoster] = useState<{
    teamACount: number;
    teamBCount: number;
    teamAPlayers: any[];
    teamBPlayers: any[];
    players: any[];
  }>({
    teamACount: 0,
    teamBCount: 0,
    teamAPlayers: [],
    teamBPlayers: [],
    players: [],
  });
  const resolvedPlayerIdRef = useRef<string | undefined>(playerId);

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (playerId) {
      resolvedPlayerIdRef.current = playerId;
    }
  }, [playerId]);

  // Khởi tạo kết nối SignalR
  useEffect(() => {
    if (!pinCode || pinCode === "SOLO" || pinCode === "DEMO") {
      return;
    }

    const token = Cookies.get("token");

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(MULTI_HUB_URL, {
        accessTokenFactory: () => token || "",
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
      .configureLogging(signalR.LogLevel.None)
      .build();

    connectionRef.current = conn;
    setConnection(conn);

    // Đăng ký các sự kiện thời gian thực
    conn.on("JoinedGameSuccess", (data) => {
      if (data.playerId) {
        resolvedPlayerIdRef.current = data.playerId;
        if (typeof window !== "undefined" && pinCode) {
          localStorage.setItem(`multi_player_${pinCode}`, data.playerId);
        }
      }
      setGameState(data.gameState);
      setActionPoints(data.actionPoints || 0);
      setPlayerRole(data.playerRole || "MEMBER");
      setIsIsolated(data.isIsolated || false);
      setTeamSide(data.teamSide || "TEAM_A");
      if (data.status) setRoomStatus(data.status);
      if (data.roster) setRoster(data.roster);
    });

    conn.on("ReconnectedSuccess", (data) => {
      if (data.playerId) {
        resolvedPlayerIdRef.current = data.playerId;
      }
      setGameState(data.gameState);
      setActionPoints(data.actionPoints || 0);
      setPlayerRole(data.playerRole || "MEMBER");
      setIsIsolated(data.isIsolated || false);
      setTeamSide(data.teamSide || "TEAM_A");
      if (data.status) setRoomStatus(data.status);
      if (data.roster) setRoster(data.roster);
    });

    conn.on("LobbyRosterUpdated", (rosterData) => {
      if (rosterData) {
        setRoster({
          teamACount: rosterData.teamACount ?? 0,
          teamBCount: rosterData.teamBCount ?? 0,
          teamAPlayers: rosterData.teamAPlayers ?? [],
          teamBPlayers: rosterData.teamBPlayers ?? [],
          players: rosterData.players ?? [],
        });
        if (rosterData.status) setRoomStatus(rosterData.status);
      }
    });

    conn.on("TeamSwitched", (data) => {
      if (data?.teamSide) setTeamSide(data.teamSide);
    });

    conn.on("MatchReset", (data) => {
      setRoomStatus("WAITING");
      setMatchEndedData(null);
      setMatchStartedData(null);
      if (data?.roster) setRoster(data.roster);
    });

    conn.on("GameStateUpdated", (state) => {
      setGameState(state);
      if (state.playerActionPoints !== undefined) setActionPoints(state.playerActionPoints);
      if (state.playerGold !== undefined) setActionPoints(state.playerGold);
      if (state.playerRowStrokes !== undefined) setActionPoints(state.playerRowStrokes);
      if (state.playerRailTracks !== undefined) setActionPoints(state.playerRailTracks);
      if (state.playerShells !== undefined) setActionPoints(state.playerShells);
      if (state.myActionPoints !== undefined) setActionPoints(state.myActionPoints);
      if (state.playerBombs !== undefined) setActionPoints(state.playerBombs);
      if (state.myRole) setPlayerRole(state.myRole);
      if (state.myIsIsolated !== undefined) setIsIsolated(state.myIsIsolated);
    });

    conn.on("MatchStarted", (data) => {
      setMatchStartedData(data);
      setMatchEndedData(null);
      setRoomStatus("PLAYING");
      if (data?.roster) setRoster(data.roster);
    });

    conn.on("SlideAnswerResult", (result) => {
      setLastAnswerResult(result);
      if (result.totalActionPoints !== undefined) {
        setActionPoints(result.totalActionPoints);
      }
    });

    conn.on("PlayerAnswered", (answered: PlayerAnsweredItem) => {
      setLastAnswerNotification(answered);
    });

    conn.on("ActionExecuted", (act: GameActionBroadcastItem) => {
      setLastAction(act);
    });

    conn.on("SkillTriggered", (skill: SkillTriggeredItem) => {
      setLastSkill(skill);
    });

    conn.on("MatchEnded", (ended: MatchEndedData) => {
      setMatchEndedData(ended);
    });

    conn.on("MatchEndedEarly", (ended: MatchEndedData) => {
      setMatchEndedData(ended);
    });

    conn.on("GameError", (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    });

    // Start connection
    conn
      .start()
      .then(() => {
        setIsConnected(true);
        if (pinCode && playerId) {
          conn.invoke("JoinGameRoom", pinCode, playerId, null).catch((err) => {
            console.warn("Lỗi JoinGameRoom tự động:", err);
          });
        }
      })
      .catch((err) => {
        console.warn("Lỗi kết nối MultiGameHub:", err);
        setIsConnected(false);
      });

    return () => {
      conn.stop();
    };
  }, [pinCode, playerId]);

  // Methods gửi dữ liệu lên Hub
  const joinGameRoom = useCallback(
    async (pin: string, pId: string, side?: string) => {
      if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
      await connectionRef.current.invoke("JoinGameRoom", pin, pId, side || null);
    },
    []
  );

  const startMatch = useCallback(async (pin: string) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
    await connectionRef.current.invoke("StartMatch", pin);
  }, []);

  const submitSlideAnswer = useCallback(
    async (pin: string, pId: string, slideId: string, answerData: string, responseTimeMs: number) => {
      if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
      const effectiveId = resolvedPlayerIdRef.current || pId;
      await connectionRef.current.invoke("SubmitSlideAnswer", pin, effectiveId, slideId, answerData, responseTimeMs);
    },
    []
  );

  const performGameAction = useCallback(
    async (pin: string, pId: string, actionType: string, payload: any) => {
      if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
      const effectiveId = resolvedPlayerIdRef.current || pId;
      const payloadJson = typeof payload === "string" ? payload : JSON.stringify(payload);
      await connectionRef.current.invoke("PerformGameAction", pin, effectiveId, actionType, payloadJson);
    },
    []
  );

  const useGameSkill = useCallback(
    async (pin: string, pId: string, skillName: string, payload: any) => {
      if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
      const effectiveId = resolvedPlayerIdRef.current || pId;
      const payloadJson = typeof payload === "string" ? payload : JSON.stringify(payload || {});
      await connectionRef.current.invoke("UseGameSkill", pin, effectiveId, skillName, payloadJson);
    },
    []
  );

  const endMatchEarly = useCallback(async (pin: string) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
    await connectionRef.current.invoke("EndMatchEarly", pin);
  }, []);

  const resetMatch = useCallback(async (pin: string) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
    await connectionRef.current.invoke("ResetMatch", pin);
  }, []);

  const switchTeam = useCallback(async (pin: string, pId: string, newTeamSide: string) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
    const effectiveId = resolvedPlayerIdRef.current || pId;
    await connectionRef.current.invoke("SwitchTeam", pin, effectiveId, newTeamSide);
  }, []);

  const reconnectRoom = useCallback(async (pin: string, pId: string) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
    await connectionRef.current.invoke("ReconnectRoom", pin, pId);
  }, []);

  return {
    connection,
    isConnected,
    errorMsg,
    gameState,
    actionPoints,
    playerRole,
    isIsolated,
    teamSide,
    roomStatus,
    isMatchStarted: roomStatus === "PLAYING",
    roster,
    lastAction,
    lastSkill,
    lastAnswerNotification,
    lastAnswerResult,
    matchStartedData,
    matchEndedData,
    joinGameRoom,
    startMatch,
    resetMatch,
    switchTeam,
    submitSlideAnswer,
    performGameAction,
    useGameSkill,
    endMatchEarly,
    reconnectRoom,
  };
}

