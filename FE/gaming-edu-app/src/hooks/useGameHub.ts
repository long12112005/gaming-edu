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

export interface AnswerRejectedPayload {
  slideId: string;
  reason: string;
  message: string;
}

export interface RoomInfoPayload {
  roomId?: string;
  pinCode?: string;
  quizTitle?: string;
  title?: string;
  playerId?: string;
  roomPlayerId?: string;
  playerNickname?: string;
  status?: string;
  isLocked?: boolean;
}

export function useGameHub() {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Game State
  const [roomInfo, setRoomInfo] = useState<RoomInfoPayload | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [gameState, setGameState] = useState<"WAITING" | "STARTING" | "PLAYING" | "LEADERBOARD" | "FINISHED">("WAITING");
  const [currentSlide, setCurrentSlide] = useState<SlideStartedPayload | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [slideTimeLeft, setSlideTimeLeft] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [answerRejected, setAnswerRejected] = useState<AnswerRejectedPayload | null>(null);
  const [wordCloudData, setWordCloudData] = useState<Record<string, number>>({});

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
        setConnection(newConnection);
      })
      .catch((err) => {
        console.error("SignalR Connection Error: ", err);
        setError("Không thể kết nối đến máy chủ game.");
      });

    // ── Events ──
    newConnection.on("Error", (err: { message: string }) => {
      setError(err?.message || "Đã xảy ra lỗi kết nối.");
    });

    // Khi người chơi gia nhập phòng
    newConnection.on("JoinedRoom", (info: RoomInfoPayload) => {
      setRoomInfo(info);
    });

    // Khi Host gia nhập phòng
    newConnection.on("HostJoined", (info: RoomInfoPayload) => {
      setRoomInfo(info);
    });

    // Tải danh sách người chơi ban đầu cho Host
    newConnection.on("LoadPlayers", (loadedPlayers: PlayerInfo[]) => {
      setPlayers(loadedPlayers || []);
    });

    // Có người chơi mới tham gia
    newConnection.on("PlayerJoined", (player: PlayerInfo) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.playerId === player.playerId)) return prev;
        return [...prev, player];
      });
    });

    // Người chơi bị kick
    newConnection.on("PlayerKicked", (playerId: string) => {
      setPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
    });

    // Trạng thái khóa phòng
    newConnection.on("RoomLockedStatusChanged", (isLocked: boolean) => {
      setRoomInfo((prev) => prev ? { ...prev, isLocked } : prev);
    });

    // Bắt đầu game
    newConnection.on("GameStarted", () => {
      setGameState("STARTING");
    });

    // Bắt đầu slide câu hỏi
    newConnection.on("SlideStarted", (slide: SlideStartedPayload) => {
      setCurrentSlide(slide);
      setGameState("PLAYING");
      setSlideTimeLeft(slide.timeLimit);
      setAnswerResult(null);
      setAnswerRejected(null);
      setCountdown(null);
    });

    // Đồng hồ đếm ngược 3-2-1 trước câu hỏi
    newConnection.on("CountdownStarted", (seconds: number) => {
      setCountdown(seconds);
    });

    newConnection.on("TimeTick", (seconds: number) => {
      setCountdown(seconds);
    });

    newConnection.on("TimeOut", () => {
      setCountdown(null);
    });

    newConnection.on("SlideTimeTick", (data: { slideId: string; remaining: number }) => {
      setSlideTimeLeft(data.remaining);
    });

    newConnection.on("SlideTimeOut", () => {
      setSlideTimeLeft(0);
      setGameState("LEADERBOARD");
    });

    newConnection.on("AnswerAccepted", () => {
      // Đã nhận câu trả lời vào hàng đợi chấm
    });

    newConnection.on("AnswerRecorded", () => {
      // Đã lưu câu trả lời vào database
    });

    newConnection.on("AnswerRejected", (rejectData: AnswerRejectedPayload) => {
      setAnswerRejected(rejectData);
    });

    newConnection.on("AnswerResult", (result: any) => {
      setAnswerResult(result);
    });

    newConnection.on("WordCloudUpdated", (data: Record<string, number>) => {
      setWordCloudData(data || {});
    });

    newConnection.on("LeaderboardUpdated", (data: any[]) => {
      setLeaderboard(data || []);
    });

    newConnection.on("GameEnded", (data: any) => {
      setGameState("FINISHED");
      setLeaderboard(data.leaderboard || []);
    });

    return () => {
      newConnection.stop();
    };
  }, []);

  // ── Client-side timer đếm ngược câu hỏi ──
  useEffect(() => {
    if (gameState !== "PLAYING" || slideTimeLeft === null || slideTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setSlideTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, slideTimeLeft]);

  // ── Client-side timer đếm ngược 3-2-1 ──
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // ── Actions ──
  // Tham gia phòng với tư cách Thí sinh
  const joinRoom = useCallback(async (pinCode: string, nickname?: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("JoinRoom", { pinCode, nickname });
    }
  }, []);

  // Tham gia phòng với tư cách Host
  const hostJoinRoom = useCallback(async (pinCode: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("HostJoinRoom", pinCode);
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
      // Chế độ Async: gọi StartPlayerSlide
      await connectionRef.current.invoke("StartPlayerSlide", slideId).catch(() => {
        // Fallback an toàn nếu cần
      });
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
    answerRejected,
    wordCloudData,
    joinRoom,
    hostJoinRoom,
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
