import { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || "http://localhost:5000/hubs/game";

export interface PlayerInfo {
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface SlideOptionPublic {
  id: string;
  content: string;
  matchingPair?: string;
  orderIndex: number;
}

export interface SlideStartedPayload {
  index: number;
  slideId: string;
  type: string;
  questionText: string;
  timeLimit: number;
  points: number;
  options: SlideOptionPublic[];
}

export function useGameHub() {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Game State
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [gameState, setGameState] = useState<"WAITING" | "STARTING" | "PLAYING" | "LEADERBOARD" | "FINISHED">("WAITING");
  const [currentSlide, setCurrentSlide] = useState<SlideStartedPayload | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [slideTimeLeft, setSlideTimeLeft] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [answerResult, setAnswerResult] = useState<any>(null);

  // Keep a ref to the connection to avoid closure issues
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const token = Cookies.get("token");
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token || "",
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connectionRef.current = newConnection;

    newConnection.start()
      .then(() => {
        setIsConnected(true);
        setError(null);
      })
      .catch((err) => {
        console.error("SignalR Connection Error: ", err);
        setError("Không thể kết nối đến máy chủ game.");
      });

    // ── Events ──
    newConnection.on("Error", (err: { message: string }) => {
      setError(err.message);
    });

    newConnection.on("JoinedRoom", (info: any) => {
      setRoomInfo(info);
    });

    newConnection.on("PlayerJoined", (player: PlayerInfo) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.playerId === player.playerId)) return prev;
        return [...prev, player];
      });
    });

    newConnection.on("PlayerKicked", (playerId: string) => {
      setPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
      // If we are the one kicked, handle it in the UI (by checking context player ID)
    });

    newConnection.on("RoomLockedStatusChanged", (isLocked: boolean) => {
      setRoomInfo((prev: any) => prev ? { ...prev, isLocked } : prev);
    });

    newConnection.on("GameStarted", (data: any) => {
      setGameState("STARTING");
    });

    newConnection.on("SlideStarted", (slide: SlideStartedPayload) => {
      setCurrentSlide(slide);
      setGameState("PLAYING");
      setSlideTimeLeft(slide.timeLimit);
      setAnswerResult(null); // Reset previous answer
    });

    newConnection.on("CountdownStarted", (seconds: number) => {
      setCountdown(seconds);
    });

    newConnection.on("TimeTick", (seconds: number) => {
      setCountdown(seconds);
    });

    newConnection.on("TimeOut", () => {
      setCountdown(null);
    });

    newConnection.on("SlideTimeTick", (data: { slideId: string, remaining: number }) => {
      setSlideTimeLeft(data.remaining);
    });

    newConnection.on("SlideTimeOut", (slideId: string) => {
      setSlideTimeLeft(0);
      setGameState("LEADERBOARD");
    });

    newConnection.on("AnswerAccepted", (data: any) => {
      // Logic when answer is accepted
    });

    newConnection.on("AnswerResult", (result: any) => {
      setAnswerResult(result);
    });

    newConnection.on("LeaderboardUpdated", (data: any[]) => {
      setLeaderboard(data);
    });

    newConnection.on("GameEnded", (data: any) => {
      setGameState("FINISHED");
      setLeaderboard(data.leaderboard);
    });

    setConnection(newConnection);

    return () => {
      newConnection.stop();
    };
  }, []);

  // ── Actions ──
  const joinRoom = useCallback(async (pinCode: string, nickname?: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("JoinRoom", { pinCode, nickname });
    }
  }, []);

  const startGame = useCallback(async (roomId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("StartGame", roomId);
    }
  }, []);

  const nextSlide = useCallback(async (roomId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("NextSlide", roomId);
    }
  }, []);

  const startCountdown = useCallback(async (seconds: number = 3) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("StartCountdown", seconds);
    }
  }, []);

  const startSlideTimer = useCallback(async (timeLimitSeconds: number, slideId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("StartSlideTimer", timeLimitSeconds, slideId);
    }
  }, []);

  const submitAnswer = useCallback(async (slideId: string, answerData: any) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("SubmitAnswer", { slideId, ...answerData });
    }
  }, []);

  const requestLeaderboard = useCallback(async () => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("RequestLeaderboard");
    }
  }, []);

  const lockRoom = useCallback(async (isLocked: boolean) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("LockRoom", isLocked);
    }
  }, []);

  const kickPlayer = useCallback(async (playerId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("KickPlayer", playerId);
    }
  }, []);

  const endGame = useCallback(async (roomId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("EndGame", roomId);
    }
  }, []);

  return {
    connection,
    isConnected,
    error,
    roomInfo,
    players,
    gameState,
    currentSlide,
    countdown,
    slideTimeLeft,
    leaderboard,
    answerResult,
    joinRoom,
    startGame,
    nextSlide,
    startCountdown,
    startSlideTimer,
    submitAnswer,
    requestLeaderboard,
    lockRoom,
    kickPlayer,
    endGame,
  };
}
