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
  blankLength?: number;
  wordLengths?: number[];
}

export interface SlideStartedPayload {
  index: number;
  slideId: string;
  type: string;
  questionText: string;
  timeLimit: number;
  points: number;
  options: SlideOptionPublic[];
  totalSlides?: number;
  imageUrl?: string;
}

export interface PlayerSurvivalStatus {
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  currentHp: number;
  maxHp: number;
  isEliminated: boolean;
  score: number;
  rank: number;
}

export interface BattleRoyaleState {
  totalPlayers: number;
  survivorsCount: number;
  eliminatedCount: number;
  players: PlayerSurvivalStatus[];
}

export interface PlayerWager {
  playerId: string;
  nickname: string;
  wagerPercent: number;
  wagerAmount: number;
  isAllIn: boolean;
}

export interface WagerPoolState {
  slideId: string;
  totalWagerAmount: number;
  totalWagersPlaced: number;
  allInCount: number;
  wagers: PlayerWager[];
}

export interface WireDefuseResult {
  wireIndex: number;
  wireColor: string;
  isCut: boolean;
  userInput: string;
  expectedKeyword: string;
  normalizedKeyword: string;
}

export interface WireDistribution {
  wireIndex: number;
  wireColor: string;
  cutCount: number;
  totalCount: number;
  cutPercent: number;
}

export interface NormalizedKeyword {
  wireIndex: number;
  wireColor: string;
  originalKeywords: string;
  normalizedKeyword: string;
}

export interface BombDefusalState {
  slideId: string;
  totalBombs: number;
  defusedBombs: number;
  explodedBombs: number;
  inProgressBombs: number;
  wireStats: WireDistribution[];
  standardKeywords: NormalizedKeyword[];
}

export interface WordHunterGuessSummary {
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  guess: string;
  isCorrect: boolean;
  responseTimeMs: number;
  scoreAwarded: number;
}

export interface WordHunterSolution {
  wordIndex: number;
  solutionText: string;
  totalLength: number;
  acceptedKeywords: string[];
}

export interface WordHunterState {
  slideId: string;
  totalPlayers: number;
  decodedCount: number;
  submittedCount: number;
  recentGuesses: WordHunterGuessSummary[];
  solutions: WordHunterSolution[];
}

export interface BridgeSpanResult {
  spanIndex: number;
  isBuilt: boolean;
  userInput: string;
  expectedKeyword: string;
  normalizedKeyword: string;
}

export interface BridgeSpanDistribution {
  spanIndex: number;
  builtCount: number;
  totalCount: number;
  builtPercent: number;
  expectedKeyword: string;
}

export interface BridgeBuilderPlayerCrossing {
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  builtSpans: number;
  totalSpans: number;
  isFullyCrossed: boolean;
  responseTimeMs: number;
  scoreAwarded: number;
}

export interface BridgeBuilderState {
  slideId: string;
  totalPlayers: number;
  fullCrossings: number;
  partialCrossings: number;
  fallenCount: number;
  submittedCount: number;
  spanStats: BridgeSpanDistribution[];
  recentCrossings: BridgeBuilderPlayerCrossing[];
}

export interface CircuitWireResult {
  wireIndex: number;
  leftId: string;
  leftContent: string;
  userRightContent: string;
  expectedRightContent: string;
  isConnected: boolean;
  isCorrect: boolean;
  wireColor: string;
}

export interface CircuitWireDistribution {
  wireIndex: number;
  leftId: string;
  leftContent: string;
  expectedRightContent: string;
  correctCount: number;
  totalCount: number;
  correctPercent: number;
  wireColor: string;
}

export interface CircuitConnectPlayerResult {
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  correctWires: number;
  totalWires: number;
  isFullCircuit: boolean;
  responseTimeMs: number;
  scoreAwarded: number;
}

export interface CircuitConnectState {
  slideId: string;
  totalPlayers: number;
  fullCircuits: number;
  partialCircuits: number;
  shortCircuits: number;
  submittedCount: number;
  wireStats: CircuitWireDistribution[];
  recentSubmissions: CircuitConnectPlayerResult[];
}

export interface PlayerArenaProgress {
  playerId: string;
  nickname: string;
  avatarUrl?: string;
  score: number;
  rank: number;
  progressRatio: number; // 0.0 to 1.0 (toàn chặng trên minimap & arena)
  streak: number;
  isAnswered: boolean;
  isJustBoosted: boolean;
  lastScoreAwarded: number;
  isCurrentUser?: boolean;
  isGhost?: boolean;
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
  mode?: string;
  quizId?: string;
  theme?: any;
  endTime?: string;
  questionTimeLimit?: number;
  isEarlyFinished?: boolean;
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
  const [answerProgress, setAnswerProgress] = useState<{
    slideId: string;
    answeredCount: number;
    totalPlayers: number;
    distribution?: any;
    battleRoyale?: BattleRoyaleState;
    wagerPool?: WagerPoolState;
    bombDefusal?: BombDefusalState;
    wordHunter?: WordHunterState;
    bridgeBuilder?: BridgeBuilderState;
    circuitConnect?: CircuitConnectState;
  } | null>(null);
  const [distribution, setDistribution] = useState<any | null>(null);
  const [battleRoyaleState, setBattleRoyaleState] = useState<BattleRoyaleState | null>(null);
  const [wagerPool, setWagerPool] = useState<WagerPoolState | null>(null);
  const [bombDefusalState, setBombDefusalState] = useState<BombDefusalState | null>(null);
  const [isRoomClosed, setIsRoomClosed] = useState(false);
  const [roomClosedMessage, setRoomClosedMessage] = useState<string>("");
  const [wordHunterState, setWordHunterState] = useState<WordHunterState | null>(null);
  const [bridgeBuilderState, setBridgeBuilderState] = useState<BridgeBuilderState | null>(null);
  const [circuitConnectState, setCircuitConnectState] = useState<CircuitConnectState | null>(null);
  const [answerRejected, setAnswerRejected] = useState<AnswerRejectedPayload | null>(null);
  const [wordCloudData, setWordCloudData] = useState<Record<string, number>>({});
  const [isKicked, setIsKicked] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<Record<string, boolean>>({});
  const [playerProgress, setPlayerProgress] = useState<Record<string, { currentQuestionIndex: number; totalQuestions: number; score: number }>>({});
  const [playersProgress, setPlayersProgress] = useState<PlayerArenaProgress[]>([]);

  // Keep a ref to the connection and roomInfo to avoid closure issues
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const roomInfoRef = useRef<any>(null);
  roomInfoRef.current = roomInfo;

  useEffect(() => {
    let isCancelled = false;
    let startPromise: Promise<void> | null = null;

    const token = Cookies.get("token");
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token || "",
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    connectionRef.current = newConnection;

    const startTimer = setTimeout(() => {
      if (isCancelled) return;
      startPromise = newConnection.start();
      startPromise
        .then(() => {
          if (isCancelled) {
            newConnection.stop().catch(() => {});
            return;
          }
          setIsConnected(true);
          setError(null);
          setConnection(newConnection);
        })
        .catch((err) => {
          const msg = String(err?.message || err || "");
          if (
            isCancelled ||
            err?.name === "AbortError" ||
            msg.includes("stopped during negotiation") ||
            msg.includes("stopped before the invocation")
          ) {
            return;
          }
          console.warn("SignalR Connection Warning: ", err);
          setError("Không thể kết nối đến máy chủ game.");
        });
    }, 0);

    // ── Events ──
    newConnection.on("Error", (err: { message: string }) => {
      setError(err?.message || "Đã xảy ra lỗi kết nối.");
    });

    // Khi người chơi gia nhập phòng
    newConnection.on("JoinedRoom", (info: RoomInfoPayload) => {
      setRoomInfo(info);
    });

    // Khi Host gia nhập phòng
    newConnection.on("HostJoined", (info: any) => {
      setRoomInfo((prev: any) => ({ ...prev, ...info }));
    });

    // Tải danh sách người chơi ban đầu
    newConnection.on("LoadPlayers", (loadedPlayers: any[]) => {
      const normalized: PlayerInfo[] = (loadedPlayers || []).map((p) => ({
        playerId: p.playerId || p.id || p.PlayerId,
        nickname: p.nickname || p.Nickname || "Thí sinh",
        avatarUrl: p.avatarUrl || p.AvatarUrl,
        joinedAt: p.joinedAt || p.JoinedAt || new Date().toISOString(),
      }));
      setPlayers(normalized);
    });

    newConnection.on("RejoinedRoom", (data: any) => {
      setRoomInfo(data);
      if (data.status === "PLAYING" && data.currentSlide) {
        setCurrentSlide(data.currentSlide);
        setGameState("PLAYING");
        setSlideTimeLeft(data.remainingSeconds);
        if (data.hasAnswered && data.previousResult) {
          setAnswerResult(data.previousResult);
        }
      } else if (data.status === "FINISHED") {
        setGameState("FINISHED");
      } else {
        setGameState("WAITING");
      }
    });

    newConnection.on("PlayerJoined", (player: any) => {
      const normalized: PlayerInfo = {
        playerId: player.playerId || player.id || player.PlayerId,
        nickname: player.nickname || player.Nickname || "Thí sinh",
        avatarUrl: player.avatarUrl || player.AvatarUrl,
        joinedAt: player.joinedAt || player.JoinedAt || new Date().toISOString(),
      };
      setPlayers((prev) => {
        if (prev.find((p) => p.playerId === normalized.playerId)) return prev;
        return [...prev, normalized];
      });
    });

    // Người chơi bị kick
    newConnection.on("PlayerKicked", (kickedPlayerId: string) => {
      setPlayers((prev) => prev.filter((p) => p.playerId !== kickedPlayerId && (p as any).id !== kickedPlayerId));
      const currentPid = roomInfoRef.current?.playerId;
      if (currentPid && (String(currentPid).toLowerCase() === String(kickedPlayerId).toLowerCase())) {
        setIsKicked(true);
      }
    });

    // Trạng thái sẵn sàng của người chơi
    newConnection.on("PlayerReadyChanged", (data: { playerId: string; isReady: boolean }) => {
      setReadyPlayers((prev) => ({ ...prev, [data.playerId]: data.isReady }));
    });

    // Tiến độ người chơi trong chế độ tự do (PLAYER_PACED / TOURNAMENT)
    newConnection.on("PlayerProgressUpdated", (data: { playerId: string; nickname: string; currentQuestionIndex: number; totalQuestions: number; score: number }) => {
      setPlayerProgress((prev) => ({ ...prev, [data.playerId]: data }));
    });

    // ── 60 FPS Arena Multiplayer Progress Update (All Players) ──
    newConnection.on("PlayersProgressUpdated", (rawProgress: any[]) => {
      if (!Array.isArray(rawProgress)) return;
      const currentPid = roomInfoRef.current?.playerId;
      const normalized: PlayerArenaProgress[] = rawProgress.map((p) => ({
        playerId: p.playerId || p.PlayerId,
        nickname: p.nickname || p.Nickname || "Thí sinh",
        avatarUrl: p.avatarUrl || p.AvatarUrl,
        score: p.score ?? p.Score ?? 0,
        rank: p.rank ?? p.Rank ?? 1,
        progressRatio: typeof p.progressRatio === "number" ? p.progressRatio : (p.ProgressRatio ?? 0),
        streak: p.streak ?? p.Streak ?? 0,
        isAnswered: Boolean(p.isAnswered ?? p.IsAnswered),
        isJustBoosted: Boolean(p.isJustBoosted ?? p.IsJustBoosted),
        lastScoreAwarded: p.lastScoreAwarded ?? p.LastScoreAwarded ?? 0,
        isCurrentUser: currentPid ? String(currentPid).toLowerCase() === String(p.playerId || p.PlayerId).toLowerCase() : false,
        isGhost: Boolean(p.isGhost ?? p.IsGhost),
      }));
      setPlayersProgress(normalized);
    });

    // Trạng thái khóa phòng
    newConnection.on("RoomLockedStatusChanged", (isLocked: boolean) => {
      setRoomInfo((prev) => prev ? { ...prev, isLocked } : prev);
    });

    // Bắt đầu game
    newConnection.on("GameStarted", (payload?: any) => {
      setGameState("STARTING");
      if (payload?.mode) {
        setRoomInfo((prev: any) => prev ? { ...prev, mode: payload.mode } : { mode: payload.mode });
      }
    });

    // Bắt đầu slide câu hỏi
    newConnection.on("SlideStarted", (slide: any) => {
      const normalizedSlide: SlideStartedPayload = {
        index: slide.slideIndex ?? slide.index ?? 0,
        slideId: slide.slideId ?? slide.id,
        type: slide.type,
        questionText: slide.questionText,
        timeLimit: slide.timeLimit || 30,
        points: slide.points || 1000,
        options: slide.options || [],
        totalSlides: slide.totalSlides,
      };
      setCurrentSlide(normalizedSlide);
      setGameState("PLAYING");
      setSlideTimeLeft(normalizedSlide.timeLimit);
      setAnswerResult(null); // Reset previous answer
      setAnswerRejected(null);
      setCountdown(null);
      setAnswerProgress(null);
      setDistribution(null);
      setWagerPool(null);
      setBombDefusalState(null);
      setWordHunterState(null);
      setBridgeBuilderState(null);
      setCircuitConnectState(null);
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

    newConnection.on("AnswerCountUpdated", (data: any) => {
      setAnswerProgress(data);
      if (data.totalPlayers > 0 && data.answeredCount >= data.totalPlayers) {
        setSlideTimeLeft(0);
      }
      if (data.distribution) {
        setDistribution(data.distribution);
      }
      if (data.battleRoyale) {
        setBattleRoyaleState(data.battleRoyale);
      }
      if (data.wagerPool) {
        setWagerPool(data.wagerPool);
      }
      if (data.bombDefusal) {
        setBombDefusalState(data.bombDefusal);
      }
      if (data.wordHunter) {
        setWordHunterState(data.wordHunter);
      }
      if (data.bridgeBuilder) {
        setBridgeBuilderState(data.bridgeBuilder);
      }
      if (data.circuitConnect) {
        setCircuitConnectState(data.circuitConnect);
      }
    });

    newConnection.on("SurvivalStatusUpdated", (data: BattleRoyaleState) => {
      setBattleRoyaleState(data);
    });

    newConnection.on("WagerPoolUpdated", (pool: WagerPoolState) => {
      setWagerPool(pool);
    });

    newConnection.on("BombDefusalUpdated", (state: BombDefusalState) => {
      setBombDefusalState(state);
    });

    newConnection.on("WordHunterUpdated", (state: WordHunterState) => {
      setWordHunterState(state);
    });

    newConnection.on("BridgeBuilderUpdated", (state: BridgeBuilderState) => {
      setBridgeBuilderState(state);
    });

    newConnection.on("CircuitConnectUpdated", (state: CircuitConnectState) => {
      setCircuitConnectState(state);
    });

    newConnection.on("DistributionUpdated", (data: any) => {
      setDistribution(data);
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

    newConnection.on("RoomClosed", (data: any) => {
      setIsRoomClosed(true);
      setRoomClosedMessage(data?.message || "Chủ phòng đã đóng phòng thi đấu. Cảm ơn bạn đã tham gia!");
      setGameState("FINISHED");
    });

    return () => {
      isCancelled = true;
      clearTimeout(startTimer);
      if (startPromise) {
        startPromise
          .then(() => newConnection.stop().catch(() => {}))
          .catch(() => {});
      } else if (newConnection.state !== signalR.HubConnectionState.Disconnected) {
        newConnection.stop().catch(() => {});
      }
    };
  }, []);

  // ── Client-side timer đếm ngược câu hỏi ──
  useEffect(() => {
    if (gameState !== "PLAYING" || slideTimeLeft === null || slideTimeLeft <= 0) {
      return;
    }

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
  }, [gameState, currentSlide?.slideId, slideTimeLeft]);

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
  const joinRoom = useCallback(async (pinCode: string, nickname?: string, avatarUrl?: string, userId?: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("JoinRoom", { pinCode, nickname, avatarUrl, userId });
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
    setAnswerResult(null);
    setAnswerRejected(null);
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

  const rejoinRoom = useCallback(async (pinCode: string, playerId?: string, nickname?: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("RejoinRoom", pinCode, playerId, nickname);
    }
  }, []);

  const getSlideDistribution = useCallback(async (roomId: string, slideId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("GetSlideDistribution", roomId, slideId);
    }
  }, []);

  const getBattleRoyaleState = useCallback(async (roomId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("GetBattleRoyaleState", roomId);
    }
  }, []);

  const placeWager = useCallback(async (slideId: string, wagerPercent: number, wagerAmount: number) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("PlaceWager", slideId, wagerPercent, wagerAmount);
    }
  }, []);

  const getWagerPoolState = useCallback(async (roomId: string, slideId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("GetWagerPoolState", roomId, slideId);
    }
  }, []);

  const getBombDefusalState = useCallback(async (roomId: string, slideId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("GetBombDefusalState", roomId, slideId);
    }
  }, []);

  const getWordHunterState = useCallback(async (roomId: string, slideId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("GetWordHunterState", roomId, slideId);
    }
  }, []);

  const getBridgeBuilderState = useCallback(async (roomId: string, slideId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("GetBridgeBuilderState", roomId, slideId);
    }
  }, []);

  const getCircuitConnectState = useCallback(async (roomId: string, slideId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("GetCircuitConnectState", roomId, slideId);
    }
  }, []);

  const toggleReady = useCallback(async (isReady: boolean) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("TogglePlayerReady", isReady);
    }
  }, []);

  const updateProgress = useCallback(async (currentQuestionIndex: number, totalQuestions: number, score: number) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("UpdatePlayerProgress", currentQuestionIndex, totalQuestions, score);
    }
  }, []);

  const closeRoom = useCallback(async (roomId: string) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke("CloseRoom", roomId);
    }
  }, []);

  const requestPlayersProgress = useCallback(async () => {
    if (connectionRef.current) {
      try {
        await connectionRef.current.invoke("RequestPlayersProgress");
      } catch (err) {
        console.error("Failed to invoke RequestPlayersProgress:", err);
      }
    }
  }, []);

  return {
    connection,
    isConnected,
    error,
    roomInfo,
    players,
    isKicked,
    readyPlayers,
    playerProgress,
    gameState,
    currentSlide,
    countdown,
    slideTimeLeft,
    leaderboard,
    answerResult,
    answerProgress,
    distribution,
    battleRoyaleState,
    wagerPool,
    bombDefusalState,
    wordHunterState,
    bridgeBuilderState,
    circuitConnectState,
    answerRejected,
    wordCloudData,
    joinRoom,
    hostJoinRoom,
    rejoinRoom,
    getSlideDistribution,
    getBattleRoyaleState,
    placeWager,
    getWagerPoolState,
    getBombDefusalState,
    getWordHunterState,
    getBridgeBuilderState,
    getCircuitConnectState,
    startGame,
    nextSlide,
    startCountdown,
    startSlideTimer,
    submitAnswer,
    requestLeaderboard,
    lockRoom,
    kickPlayer,
    isRoomClosed,
    roomClosedMessage,
    closeRoom,
    endGame,
    toggleReady,
    updateProgress,
    playersProgress,
    requestPlayersProgress,
  };
}

