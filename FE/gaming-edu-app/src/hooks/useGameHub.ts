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
  } | null>(null);
  const [distribution, setDistribution] = useState<any | null>(null);
  const [battleRoyaleState, setBattleRoyaleState] = useState<BattleRoyaleState | null>(null);
  const [wagerPool, setWagerPool] = useState<WagerPoolState | null>(null);
  const [bombDefusalState, setBombDefusalState] = useState<BombDefusalState | null>(null);
  const [wordHunterState, setWordHunterState] = useState<WordHunterState | null>(null);
  const [bridgeBuilderState, setBridgeBuilderState] = useState<BridgeBuilderState | null>(null);

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

    newConnection.on("HostJoined", (info: any) => {
      setRoomInfo((prev: any) => ({ ...prev, ...info }));
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
      setAnswerProgress(null);
      setDistribution(null);
      setWagerPool(null);
      setBombDefusalState(null);
      setWordHunterState(null);
      setBridgeBuilderState(null);
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

    newConnection.on("AnswerCountUpdated", (data: any) => {
      setAnswerProgress(data);
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

    newConnection.on("DistributionUpdated", (data: any) => {
      setDistribution(data);
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
    answerProgress,
    distribution,
    battleRoyaleState,
    wagerPool,
    bombDefusalState,
    wordHunterState,
    bridgeBuilderState,
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

