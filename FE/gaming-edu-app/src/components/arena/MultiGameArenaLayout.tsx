"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import confetti from "canvas-confetti";
import {
  Flame,
  Zap,
  Trophy,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  LogOut,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Crown,
  Play,
  Bot,
  PlusCircle,
  Gamepad2,
  ArrowLeft,
  Radio,
  Share2,
  QrCode,
  Swords,
  RefreshCw,
  Users,
} from "lucide-react";
import { useMultiGameHub } from "@/hooks/useMultiGameHub";
import { soundFX } from "@/utils/gameSoundEngine";

// 7 Game Map Components
import HexConquestMap from "@/components/games/HexConquestMap";
import TowerDefenseMap from "@/components/games/TowerDefenseMap";
import DragonBoatMap from "@/components/games/DragonBoatMap";
import RunawayTrainMap from "@/components/games/RunawayTrainMap";
import ArtilleryDuelMap from "@/components/games/ArtilleryDuelMap";
import EduAmongUsMap from "@/components/games/EduAmongUsMap";
import QuizBombermanMap from "@/components/games/QuizBombermanMap";

export interface QuestionSlideItem {
  id: string;
  type: string;
  questionText: string;
  timeLimit: number;
  points: number;
  options: {
    id: string;
    content: string;
    isCorrect?: boolean;
    orderIndex?: number;
  }[];
}

interface MultiGameArenaLayoutProps {
  pin: string;
  playerId: string;
  nickname: string;
  isHost: boolean;
  gameType: string;
  roomData?: any;
  slides: QuestionSlideItem[];
  onExit: () => void;
}

const OPTION_COLORS = [
  "from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 border-blue-400/50",
  "from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 border-rose-400/50",
  "from-amber-600 to-yellow-700 hover:from-amber-500 hover:to-yellow-600 border-amber-400/50",
  "from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border-emerald-400/50",
];

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

const GAME_MODE_META: Record<
  string,
  {
    id: string;
    name: string;
    subtitle: string;
    icon: string;
    teamAName: string;
    teamBName: string;
    isTeamGame: boolean;
    lobbyDesc: string;
  }
> = {
  HEX_CONQUEST: {
    id: "HEX_CONQUEST",
    name: "Đế Chế Lãnh Thổ",
    subtitle: "Hex Conquest • Đấu Trường Vây Thành Đổi Màu BFS (11×11)",
    icon: "👑",
    teamAName: "ĐỘI A (GÓC TÂY BẮC)",
    teamBName: "ĐỘI B (GÓC ĐÔNG NAM)",
    isTeamGame: true,
    lobbyDesc:
      "Trả lời đúng 1 câu = +1 Lượt Chiếm Đất. Ô Trung lập đổi màu ngay, Ô Địch click lần 1 hạ về Trung lập, lần 2 chiếm hẳn. Vây kín cụm ô địch bằng BFS sẽ đồng hóa toàn bộ! Thắng tuyệt đối khi đạt >70% bản đồ.",
  },
  TOWER_DEFENSE: {
    id: "TOWER_DEFENSE",
    name: "Thủ Thành Tri Thức",
    subtitle: "Tower Defense • Công Thủ 2 Làn Đường Song Song (1000 HP)",
    icon: "🛡️",
    teamAName: "CĂN CỨ ĐỘI A (TRÁI)",
    teamBName: "CĂN CỨ ĐỘI B (PHẢI)",
    isTeamGame: true,
    lobbyDesc:
      "Trả lời đúng 1 câu = +100 Vàng (+50 Vàng nếu trả lời trong 5s đầu). Dùng Vàng xây Tháp Cung, Tháp Băng, Tháp Pháo Laser hoặc thả Quái Trinh Sát & Chiến Xa Bọc Thép tấn công căn cứ địch!",
  },
  DRAGON_BOAT: {
    id: "DRAGON_BOAT",
    name: "Đua Thuyền Vượt Bão",
    subtitle: "Dragon Boat • Đua Thuyền Rồng 1000m Vượt Xoáy Nước & Đá Ngầm",
    icon: "🐉",
    teamAName: "ĐỘI THUYỀN RỒNG ĐỎ (A)",
    teamBName: "ĐỘI THUYỀN RỒNG XANH (B)",
    isTeamGame: true,
    lobbyDesc:
      "Trả lời đúng 1 câu = +1 Nhịp Chèo (+15m) + Đồng Tâm Hiệp Lực (+5m). Né Xoáy Nước & Đá Ngầm ở mốc 250m, 500m, 750m, bật Tăng Tốc Nitro (Combo 4) và Phun Mực Đen!",
  },
  RUNAWAY_TRAIN: {
    id: "RUNAWAY_TRAIN",
    name: "Chuyến Tàu Sinh Tử",
    subtitle: "Runaway Train • Dẫn Tàu Từ Ga Khởi Hành Đến Ga Đích (12×8)",
    icon: "🚂",
    teamAName: "ĐỘI ĐƯỜNG SẮT A",
    teamBName: "ĐỘI ĐƯỜNG SẮT B",
    isTeamGame: true,
    lobbyDesc:
      "Trả lời đúng 1 câu = +1 Mảnh Đường Ray (Thẳng/Cua 90°). Ghép ray dẫn tàu từ Cột 1 đến Cột 12, dùng Bẻ Ghi Đường Ray, Tăng Áp Lò Hơi và Phanh Khẩn Cấp (12s)!",
  },
  ARTILLERY_DUEL: {
    id: "ARTILLERY_DUEL",
    name: "Pháo Đài Tri Thức",
    subtitle: "Artillery Duel • Đấu Pháo Tọa Độ Vật Lý Parabol (1000 HP)",
    icon: "🎯",
    teamAName: "PHÁO ĐÀI ĐỘI A (X=12)",
    teamBName: "PHÁO ĐÀI ĐỘI B (X=88)",
    isTeamGame: true,
    lobbyDesc:
      "Trả lời đúng 1 câu = +1 Viên Đạn Pháo. Căn chỉnh Góc bắn (15°–80°), Lực bắn (10–100) và Gió (-10 đến +10) vượt ngọn núi giữa bản đồ để bắn sập Pháo đài đối phương (1000 HP)!",
  },
  EDU_AMONG_US: {
    id: "EDU_AMONG_US",
    name: "Truy Tìm Nội Gián",
    subtitle: "Edu Among Us • 80% Nhà Khoa Học vs 20% Nội Gián Trên Trạm Không Gian",
    icon: "🚀",
    teamAName: "NHÀ KHOA HỌC (80%)",
    teamBName: "ĐỘI ĐIỀU TRA TRẠM",
    isTeamGame: false,
    lobbyDesc:
      "Nhà Khoa Học trả lời đúng tự động tăng +3% năng lượng trạm (0% ➔ 100%), dùng Máy Quét Sinh Trắc (Combo 4) & Bỏ phiếu cách ly 2 câu hỏi (+10% nếu trúng Nội gián). Nội gián ngụy trang 0% và phá hoại -8%!",
  },
  QUIZ_BOMBERMAN: {
    id: "QUIZ_BOMBERMAN",
    name: "Đặt Bom Mê Cung",
    subtitle: "Quiz Bomberman • Đấu Trường Mê Cung 15×15 (5 Tim HP)",
    icon: "💣",
    teamAName: "ĐỘI BOM A (GÓC TRÁI TRÊN)",
    teamBName: "ĐỘI BOM B (GÓC PHẢI DƯỚI)",
    isTeamGame: true,
    lobbyDesc:
      "Trả lời đúng 1 câu = +3 Bước Di Chuyển + 1 Quả Bom Hẹn Giờ. Nổ chữ thập phá Tường Gạch (+50đ), trúng đối phương trừ 1 Tim, cướp 200đ và đẩy văng về vị trí xuất phát!",
  },
};

// Bộ câu hỏi mặc định cho chế độ Test 1 Người / Dự phòng
export const DEFAULT_SOLO_SLIDES: QuestionSlideItem[] = [
  {
    id: "solo-q1",
    type: "QUIZ",
    questionText: "Thuật toán nào thường được dùng để tìm đường đi ngắn nhất hoặc loang vùng lãnh thổ trên lưới?",
    timeLimit: 30,
    points: 100,
    options: [
      { id: "opt-1a", content: "BFS (Breadth-First Search - Tìm kiếm theo chiều rộng)", isCorrect: true },
      { id: "opt-1b", content: "Bubble Sort (Sắp xếp nổi bọt)", isCorrect: false },
      { id: "opt-1c", content: "Linear Search (Tìm kiếm tuyến tính)", isCorrect: false },
      { id: "opt-1d", content: "Binary Tree (Cây nhị phân)", isCorrect: false },
    ],
  },
  {
    id: "solo-q2",
    type: "QUIZ",
    questionText: "Trong vật lý ném xiên (bắn pháo Parabol) không có cản không khí, góc bắn nào cho tầm xa cực đại?",
    timeLimit: 30,
    points: 100,
    options: [
      { id: "opt-2a", content: "30 độ", isCorrect: false },
      { id: "opt-2b", content: "45 độ", isCorrect: true },
      { id: "opt-2c", content: "60 độ", isCorrect: false },
      { id: "opt-2d", content: "90 độ", isCorrect: false },
    ],
  },
  {
    id: "solo-q3",
    type: "QUIZ",
    questionText: "Chiến thắng Bạch Đằng năm 938 gắn liền với vị anh hùng dân tộc nào?",
    timeLimit: 30,
    points: 100,
    options: [
      { id: "opt-3a", content: "Lý Thường Kiệt", isCorrect: false },
      { id: "opt-3b", content: "Ngô Quyền", isCorrect: true },
      { id: "opt-3c", content: "Quang Trung", isCorrect: false },
      { id: "opt-3d", content: "Đinh Bộ Lĩnh", isCorrect: false },
    ],
  },
  {
    id: "solo-q4",
    type: "QUIZ",
    questionText: "Hành tinh nào được mệnh danh là 'Hành tinh Đỏ' trong Hệ Mặt Trời?",
    timeLimit: 30,
    points: 100,
    options: [
      { id: "opt-4a", content: "Sao Kim (Venus)", isCorrect: false },
      { id: "opt-4b", content: "Sao Hỏa (Mars)", isCorrect: true },
      { id: "opt-4c", content: "Sao Mộc (Jupiter)", isCorrect: false },
      { id: "opt-4d", content: "Sao Thổ (Saturn)", isCorrect: false },
    ],
  },
  {
    id: "solo-q5",
    type: "QUIZ",
    questionText: "Công thức hóa học của khí Oxy mà các phi hành gia cần để hô hấp trên trạm vũ trụ là gì?",
    timeLimit: 30,
    points: 100,
    options: [
      { id: "opt-5a", content: "CO2", isCorrect: false },
      { id: "opt-5b", content: "O2", isCorrect: true },
      { id: "opt-5c", content: "H2O", isCorrect: false },
      { id: "opt-5d", content: "N2", isCorrect: false },
    ],
  },
  {
    id: "solo-q6",
    type: "QUIZ",
    questionText: "Kết quả của phép tính 15 × 12 + 20 là bao nhiêu?",
    timeLimit: 30,
    points: 100,
    options: [
      { id: "opt-6a", content: "180", isCorrect: false },
      { id: "opt-6b", content: "200", isCorrect: true },
      { id: "opt-6c", content: "210", isCorrect: false },
      { id: "opt-6d", content: "220", isCorrect: false },
    ],
  },
];

// Hàm tạo trạng thái bản đồ mặc định cho chế độ 1 người (Solo Mode) chuẩn theo tài liệu cơ chế 7 Game
function createInitialSoloBoard(mode: string, playerName: string) {
  switch (mode) {
    case "HEX_CONQUEST": {
      const rows = 11;
      const cols = 11;
      const cells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let owner = "NONE";
          let isBase = false;
          // Đội A khởi đầu tại cụm 3 ô góc Tây Bắc
          if ((r === 0 && c === 0) || (r === 0 && c === 1) || (r === 1 && c === 0)) {
            owner = "TEAM_A";
            isBase = true;
          }
          // Đội B khởi đầu tại cụm 3 ô góc Đông Nam
          if (
            (r === rows - 1 && c === cols - 1) ||
            (r === rows - 1 && c === cols - 2) ||
            (r === rows - 2 && c === cols - 1)
          ) {
            owner = "TEAM_B";
            isBase = true;
          }
          cells.push({ r, c, owner, fortified: false, fortifiedTurns: 0, isBase });
        }
      }
      return { rows, cols, cells, teamACells: 3, teamBCells: 3 };
    }
    case "TOWER_DEFENSE": {
      const pathTiles = [
        [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7],
        [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7],
      ];
      return {
        baseHp: 1000,
        teamABaseHp: 1000,
        teamBBaseHp: 1000,
        teamAShield: 0,
        teamBShield: 0,
        waveNumber: 1,
        pathTiles,
        towers: [
          { id: "t1", ownerTeam: "TEAM_A", x: 0, y: 2, lane: 0, type: "ARCHER", level: 1, range: 2, damage: 30 },
        ],
        creeps: [
          { id: "c1", ownerTeam: "TEAM_B", type: "SCOUT", lane: 0, hp: 50, maxHp: 50, pathIndex: 6, isFrozen: false },
          { id: "c2", ownerTeam: "TEAM_B", type: "TANK", lane: 1, hp: 300, maxHp: 300, pathIndex: 5, isFrozen: false },
        ],
      };
    }
    case "DRAGON_BOAT": {
      return {
        boatA: { distance: 0, currentLane: 1, comboRow: 0, nitroStrokesLeft: 0, hasWindShield: false },
        boatB: { distance: 0, currentLane: 2, comboRow: 0, nitroStrokesLeft: 0, hasWindShield: false },
        obstacles: [
          { id: "obs-1", distance: 250, lane: 1, type: "WHIRLPOOL" },
          { id: "obs-2", distance: 250, lane: 3, type: "ROCK_REEF" },
          { id: "obs-3", distance: 500, lane: 2, type: "WHIRLPOOL" },
          { id: "obs-4", distance: 500, lane: 4, type: "ROCK_REEF" },
          { id: "obs-5", distance: 750, lane: 1, type: "ROCK_REEF" },
          { id: "obs-6", distance: 750, lane: 3, type: "WHIRLPOOL" },
        ],
      };
    }
    case "RUNAWAY_TRAIN": {
      return {
        gridCols: 12,
        gridRows: 8,
        gridSize: 12,
        train: { x: 1, y: 1, dx: 1, dy: 0, isDerailed: false, reachedStation: false, totalTracksLaid: 2 },
        stationPos: [11, 6],
        placedTracks: [
          { x: 0, y: 1, trackType: "STRAIGHT_H" },
          { x: 1, y: 1, trackType: "STRAIGHT_H" },
        ],
        obstacles: [
          [4, 1],
          [5, 3],
          [7, 2],
          [8, 5],
          [10, 4],
        ],
        isBrakeActive: false,
        isBoilerOverdrive: false,
      };
    }
    case "ARTILLERY_DUEL": {
      return {
        fortressHpA: 1000,
        fortressHpB: 1000,
        basePosA: 12,
        basePosB: 88,
        mountainHeight: 28,
        currentWind: 3,
        shieldActiveA: false,
        shieldActiveB: false,
        piercingReadyA: false,
        piercingReadyB: false,
        currentTurn: "TEAM_A",
        shotHistory: [
          "Sẵn sàng khai hỏa! Pháo đài A (X=12, 1000 HP) vs Pháo đài B (X=88, 1000 HP), Núi chắn tại X=45..55.",
        ],
      };
    }
    case "EDU_AMONG_US": {
      return {
        stationProgress: 0,
        meetingActive: false,
        meetingCallerNickname: null,
        meltdownActive: false,
        systemShieldActive: false,
        signalJamActive: false,
        activityLog: [
          "Trạm Không Gian khởi động ở 0% Năng lượng. Nhà Khoa Học trả lời đúng tự động tăng +3% tiến độ!",
        ],
        players: [
          { id: "solo-p1", nickname: `${playerName} (Bạn)`, role: "SCIENTIST", isIsolated: false, avatarColor: "#38bdf8" },
          { id: "bot-1", nickname: "Dr. Minh (AI)", role: "SCIENTIST", isIsolated: false, avatarColor: "#10b981" },
          { id: "bot-2", nickname: "Kỹ sư Lan (AI)", role: "IMPOSTOR", isIsolated: false, avatarColor: "#f59e0b" },
          { id: "bot-3", nickname: "Phi hành gia Vũ (AI)", role: "SCIENTIST", isIsolated: false, avatarColor: "#ec4899" },
        ],
      };
    }
    case "QUIZ_BOMBERMAN": {
      const size = 15;
      const grid: string[][] = [];
      for (let r = 0; r < size; r++) {
        grid[r] = [];
        for (let c = 0; c < size; c++) {
          if (r === 0 || r === size - 1 || c === 0 || c === size - 1 || (r % 2 === 0 && c % 2 === 0)) {
            grid[r][c] = "W";
          } else if ((r <= 2 && c <= 2) || (r >= size - 3 && c >= size - 3)) {
            grid[r][c] = ".";
          } else {
            grid[r][c] = (r * 7 + c * 13) % 10 < 4 ? "B" : ".";
          }
        }
      }
      return {
        size: 15,
        grid,
        bombs: [],
        players: [
          {
            playerId: "solo-p1",
            nickname: playerName,
            teamSide: "TEAM_A",
            r: 1,
            c: 1,
            hp: 5,
            moveSteps: 6,
            bombRange: 2,
            shieldActive: false,
            isEliminated: false,
            bricksDestroyed: 0,
            hitsScored: 0,
          },
          {
            playerId: "bot-bomber",
            nickname: "Bomber AI (Đội B)",
            teamSide: "TEAM_B",
            r: 13,
            c: 13,
            hp: 5,
            moveSteps: 3,
            bombRange: 2,
            shieldActive: false,
            isEliminated: false,
            bricksDestroyed: 0,
            hitsScored: 0,
          },
        ],
      };
    }
    default:
      return {};
  }
}

export default function MultiGameArenaLayout({
  pin,
  playerId,
  nickname,
  isHost,
  gameType: initialGameType,
  roomData,
  slides: propSlides,
  onExit,
}: MultiGameArenaLayoutProps) {
  const isSoloPin = pin.toUpperCase() === "SOLO";

  // Mỗi phòng chỉ cố định 1 chế độ trò chơi duy nhất giống Hải Tặc Tri Thức
  const [activeGameType, setActiveGameType] = useState<string>(initialGameType || "HEX_CONQUEST");

  useEffect(() => {
    if (initialGameType && initialGameType !== activeGameType) {
      setActiveGameType(initialGameType);
      setSoloBoard(createInitialSoloBoard(initialGameType, nickname));
      setLocalActionPoints(initialGameType === "TOWER_DEFENSE" ? 200 : 5);
    }
  }, [initialGameType, activeGameType, nickname]);

  const gameMeta = GAME_MODE_META[activeGameType] || GAME_MODE_META.HEX_CONQUEST;

  // SignalR Hook (chỉ kết nối thực nếu không phải pin SOLO)
  const {
    isConnected,
    gameState,
    actionPoints: hubActionPoints,
    playerRole: hubPlayerRole,
    isIsolated: hubIsIsolated,
    teamSide,
    isMatchStarted: hubIsMatchStarted,
    roster,
    lastAnswerResult,
    lastAnswerNotification,
    matchEndedData: hubMatchEnded,
    errorMsg,
    startMatch,
    resetMatch,
    switchTeam,
    endMatchEarly,
    submitSlideAnswer,
    performGameAction,
    useGameSkill,
  } = useMultiGameHub(isSoloPin ? undefined : pin, isSoloPin ? undefined : playerId);

  const [localMatchStarted, setLocalMatchStarted] = useState<boolean>(isSoloPin);
  const [hasJoinedTeam, setHasJoinedTeam] = useState<boolean>(!gameMeta.isTeamGame);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const effectiveIsMatchStarted = isSoloPin || localMatchStarted || hubIsMatchStarted || roomData?.status === "PLAYING";

  // State cho Solo / Local Interactive Engine
  const [soloBoard, setSoloBoard] = useState<any>(() =>
    createInitialSoloBoard(initialGameType || "HEX_CONQUEST", nickname)
  );
  const [localActionPoints, setLocalActionPoints] = useState<number>(() =>
    (initialGameType || "HEX_CONQUEST") === "TOWER_DEFENSE" ? 200 : 5
  );
  const [localRole, setLocalRole] = useState<string>("SCIENTIST");
  const [localIsolated, setLocalIsolated] = useState<boolean>(false);
  const [localBannerMsg, setLocalBannerMsg] = useState<string | null>(
    "Chế độ 1 Người (Solo + AI): Trả lời câu hỏi để nhận Điểm Hành Động hoặc bấm nút '+ Điểm Test' để trải nghiệm ngay!"
  );
  const [localMatchEnded, setLocalMatchEnded] = useState<any>(null);

  // Slide & Quiz state
  const slides = useMemo(
    () => (propSlides && propSlides.length > 0 ? propSlides : DEFAULT_SOLO_SLIDES),
    [propSlides]
  );
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  const [finalSprintLeft, setFinalSprintLeft] = useState<number>(15);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [hasAnsweredCurrentSlide, setHasAnsweredCurrentSlide] = useState<boolean>(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [localAnswerCheck, setLocalAnswerCheck] = useState<{
    slideId?: string;
    isCorrect: boolean;
    isTimeout?: boolean;
    correctOptionId?: string;
    actionPointsEarned: number;
    message?: string;
  } | null>(null);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [tacticalCount, setTacticalCount] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [botScore, setBotScore] = useState<number>(200);
  const [copiedPin, setCopiedPin] = useState(false);

  const currentSlide = isQuizCompleted ? null : slides[currentSlideIndex] || null;
  const questionStartTimeRef = useRef<number>(Date.now());
  const lastCorrectAtRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Khởi tạo lại soloBoard khi chuyển tab Game hoặc Chơi Lại
  const handleSwitchGameMode = (newMode: string) => {
    setActiveGameType(newMode);
    setSoloBoard(createInitialSoloBoard(newMode, nickname));
    setLocalMatchEnded(null);
    setIsQuizCompleted(false);
    setFinalSprintLeft(15);
    setCurrentSlideIndex(0);
    setLocalActionPoints(newMode === "TOWER_DEFENSE" ? 200 : 3);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setWrongCount(0);
    setResponseTimes([]);
    setTacticalCount(0);
    setTotalScore(0);
    setBotScore(200);
    setLocalBannerMsg(`Đã khởi tạo trận đấu ${newMode}. Sẵn sàng chiến đấu!`);
  };

  // Điểm hành động thực tế hiển thị: ưu tiên điểm Server khi đang ở phòng kết nối thực
  const effectiveActionPoints =
    !isSoloPin && isConnected && activeGameType === initialGameType
      ? hubActionPoints
      : localActionPoints;
  const effectiveRole = isSoloPin || !isConnected ? localRole : hubPlayerRole || localRole;
  const effectiveIsolated = isSoloPin || !isConnected ? localIsolated : hubIsIsolated;
  const effectiveMatchEnded = localMatchEnded || hubMatchEnded;

  // Tên đơn vị điểm tương ứng theo từng chế độ game
  const actionPointLabel = useMemo(() => {
    switch (activeGameType) {
      case "HEX_CONQUEST":
        return "Lượt Chiếm Đất";
      case "TOWER_DEFENSE":
        return "Vàng Tri Thức";
      case "DRAGON_BOAT":
        return "Nhịp Chèo";
      case "RUNAWAY_TRAIN":
        return "Mảnh Đường Ray";
      case "ARTILLERY_DUEL":
        return "Đạn Pháo";
      case "EDU_AMONG_US":
        return effectiveRole === "IMPOSTOR" ? "Điểm Phá Hoại" : "Điểm Tác Vụ";
      case "QUIZ_BOMBERMAN":
        return "Quả Bom";
      default:
        return "Điểm Thao Tác";
    }
  }, [activeGameType, effectiveRole]);

  // Hàm phân định thắng thua (Tie-breaker) chuẩn theo cơ chế từng game trong 7 game khi hết câu hỏi / kết thúc sớm
  const evaluateFinalTieBreaker = () => {
    if (effectiveMatchEnded) return;
    if (!isSoloPin && isConnected) {
      endMatchEarly(pin);
      return;
    }

    const totalAns = correctCount + wrongCount;
    const myAcc = totalAns > 0 ? Math.round((correctCount * 100) / totalAns) : 0;
    const avgMs =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 3000;

    switch (activeGameType) {
      case "HEX_CONQUEST": {
        const aCells = soloBoard?.teamACells ?? 3;
        const bCells = soloBoard?.teamBCells ?? 3;
        const aStolen = soloBoard?.teamAStolen ?? 0;
        const bStolen = soloBoard?.teamBStolen ?? 0;
        const aWin =
          aCells > bCells ||
          (aCells === bCells && aStolen > bStolen) ||
          (aCells === bCells && aStolen === bStolen && myAcc >= 50);
        setLocalMatchEnded({
          winnerTeam: aWin ? gameMeta.teamAName : gameMeta.teamBName,
          message: `Hết bộ đề câu hỏi! Phân định theo thứ tự ưu tiên: (1) Ô sở hữu (${aCells} vs ${bCells}) ➔ (2) Ô cướp từ địch (${aStolen} vs ${bStolen}) ➔ (3) Tỷ lệ đúng (${myAcc}%) ➔ (4) Thời gian phản hồi (${avgMs}ms).`,
        });
        break;
      }
      case "TOWER_DEFENSE": {
        const hpA = soloBoard?.teamABaseHp ?? 1000;
        const hpB = soloBoard?.teamBBaseHp ?? 1000;
        const dmgA = Math.max(0, 1000 - hpB);
        const dmgB = Math.max(0, 1000 - hpA);
        const aWin = hpA > hpB || (hpA === hpB && dmgA > dmgB) || (hpA === hpB && dmgA === dmgB && myAcc >= 50);
        setLocalMatchEnded({
          winnerTeam: aWin ? gameMeta.teamAName : gameMeta.teamBName,
          message: `Hết giờ thi đấu! Phân định thắng thua theo: (1) HP Căn cứ còn lại (${hpA} HP vs ${hpB} HP) ➔ (2) Tổng sát thương gây ra (${dmgA} vs ${dmgB}) ➔ (3) Tỷ lệ trả lời đúng (${myAcc}%).`,
        });
        break;
      }
      case "DRAGON_BOAT": {
        const distA = soloBoard?.boatA?.distance ?? 0;
        const distB = soloBoard?.boatB?.distance ?? 0;
        const aWin = distA > distB || (distA === distB && myAcc >= 50);
        setLocalMatchEnded({
          winnerTeam: aWin ? gameMeta.teamAName : gameMeta.teamBName,
          message: `Hết giờ đua thuyền! Xếp hạng theo: (1) Quãng đường đi được (${distA}m vs ${distB}m) ➔ (2) Tỷ lệ trả lời đúng (${myAcc}%) ➔ (3) Thời gian trả lời TB (${avgMs}ms).`,
        });
        break;
      }
      case "RUNAWAY_TRAIN": {
        const colA = (soloBoard?.train?.x ?? 1) + 1;
        const tracksA = soloBoard?.placedTracks?.length ?? 2;
        const derailA = soloBoard?.train?.derailCount ?? 0;
        const colB = 6;
        const aWin = colA >= colB;
        setLocalMatchEnded({
          winnerTeam: aWin ? gameMeta.teamAName : gameMeta.teamBName,
          message: `Hết câu hỏi! Xét thắng thua theo: (1) Quãng đường tàu đi được (Cột ${colA}/12 vs Cột ${colB}/12) ➔ (2) Số mảnh ray đặt đúng (${tracksA} mảnh) ➔ (3) Số lần trật bánh (${derailA} lần).`,
        });
        break;
      }
      case "ARTILLERY_DUEL": {
        const hpA = soloBoard?.fortressHpA ?? 1000;
        const hpB = soloBoard?.fortressHpB ?? 1000;
        const aWin = hpA > hpB || (hpA === hpB && myAcc >= 50);
        setLocalMatchEnded({
          winnerTeam: aWin ? gameMeta.teamAName : gameMeta.teamBName,
          message: `Hết câu hỏi! Xét thắng thua theo: (1) HP Pháo đài còn lại (${hpA} HP vs ${hpB} HP) ➔ (2) Số phát bắn trúng đích ➔ (3) Tỷ lệ trả lời đúng (${myAcc}%).`,
        });
        break;
      }
      case "EDU_AMONG_US": {
        const prog = soloBoard?.stationProgress ?? 0;
        const allImpostorsIsolated = (soloBoard?.players || [])
          .filter((p: any) => p.role === "IMPOSTOR")
          .every((p: any) => p.isIsolated);
        const scientistsWin = prog >= 100 || allImpostorsIsolated;
        setLocalMatchEnded({
          winnerTeam: scientistsWin ? "PHE NHÀ KHOA HỌC (SCIENTISTS)" : "PHE NỘI GIÁN (IMPOSTORS)",
          message: scientistsWin
            ? `Chiến thắng! Năng lượng Trạm đạt ${prog}% hoặc toàn bộ Nội Gián đã bị cách ly!`
            : `Hết toàn bộ câu hỏi mà Thanh Tiến Độ Sửa Trạm mới đạt ${prog}% (< 100%)! Theo quy tắc 6.4, PHE NỘI GIÁN giành chiến thắng!`,
        });
        break;
      }
      case "QUIZ_BOMBERMAN": {
        const me = soloBoard?.players?.[0];
        const bot = soloBoard?.players?.[1];
        const hpA = me?.hp ?? 5;
        const hpB = bot?.hp ?? 5;
        const hitsA = me?.hitsScored ?? 0;
        const hitsB = bot?.hitsScored ?? 0;
        const bricksA = me?.bricksDestroyed ?? 0;
        const bricksB = bot?.bricksDestroyed ?? 0;
        const aWin =
          hpA > hpB ||
          (hpA === hpB && hitsA > hitsB) ||
          (hpA === hpB && hitsA === hitsB && bricksA > bricksB) ||
          (hpA === hpB && hitsA === hitsB && bricksA === bricksB && totalScore >= botScore);
        setLocalMatchEnded({
          winnerTeam: aWin ? gameMeta.teamAName : gameMeta.teamBName,
          message: `Hết giờ đấu trường Đặt Bom! Phân định theo: (1) Số Tim còn lại (${hpA} vs ${hpB}) ➔ (2) Số lần nổ trúng địch (${hitsA} vs ${hitsB}) ➔ (3) Tường gạch đã phá (${bricksA} vs ${bricksB}) ➔ (4) Điểm câu hỏi (${totalScore} vs ${botScore}).`,
        });
        break;
      }
      default: {
        setLocalMatchEnded({
          winnerTeam: totalScore >= botScore ? gameMeta.teamAName : gameMeta.teamBName,
          message: "Đã hoàn thành bộ đề câu hỏi! Xem Bảng Tổng Kết Chung Cuối Trận.",
        });
      }
    }
  };

  // Đồng hồ đếm ngược 15 giây Nước Rút Cuối Trận sau khi trả lời xong toàn bộ bộ đề
  useEffect(() => {
    if (!isQuizCompleted || effectiveMatchEnded) return;
    setFinalSprintLeft(15);
    const sprintTimer = setInterval(() => {
      setFinalSprintLeft((prev) => {
        if (prev <= 1) {
          clearInterval(sprintTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(sprintTimer);
  }, [isQuizCompleted, effectiveMatchEnded]);

  useEffect(() => {
    if (isQuizCompleted && finalSprintLeft === 0 && !effectiveMatchEnded) {
      evaluateFinalTieBreaker();
    }
  }, [isQuizCompleted, finalSprintLeft, effectiveMatchEnded]);

  // Thiết lập timer đếm ngược cho mỗi câu hỏi
  useEffect(() => {
    if (!currentSlide || !effectiveIsMatchStarted || effectiveMatchEnded) return;

    const limit = currentSlide.timeLimit > 0 ? currentSlide.timeLimit : 30;
    setTimeLeft(limit);
    setHasAnsweredCurrentSlide(false);
    setSelectedOptionId(null);
    setLocalAnswerCheck(null);
    questionStartTimeRef.current = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSlideIndex, currentSlide, effectiveIsMatchStarted, effectiveMatchEnded]);

  // Tự động xử lý khi hết giờ trả lời câu hỏi (Timeout -> tính là 1 câu Sai, +0 điểm, mất chuỗi Combo, gửi __TIMEOUT__ lên Server)
  useEffect(() => {
    if (timeLeft === 0 && !hasAnsweredCurrentSlide && currentSlide && effectiveIsMatchStarted && !effectiveMatchEnded) {
      setHasAnsweredCurrentSlide(true);
      setCombo(0);
      setWrongCount((w) => w + 1);
      soundFX.playTimeOut();

      const limitMs = (currentSlide.timeLimit > 0 ? currentSlide.timeLimit : 30) * 1000;
      setResponseTimes((prev) => [...prev, limitMs]);

      const correctOpt = currentSlide.options.find((o) => o.isCorrect) || currentSlide.options[0];
      setLocalAnswerCheck({
        slideId: currentSlide.id,
        isCorrect: false,
        isTimeout: true,
        correctOptionId: correctOpt?.id,
        actionPointsEarned: 0,
        message: "⏰ Hết giờ trả lời! Tính là 1 câu Sai (+0 điểm, mất chuỗi Combo).",
      });

      // Giảm bộ đếm cách ly 2 câu hỏi nếu có (Game 9) & reset comboRow (Game 5)
      setSoloBoard((prev: any) => {
        const next = JSON.parse(JSON.stringify(prev || {}));
        if (activeGameType === "DRAGON_BOAT" && next.boatA) {
          next.boatA.comboRow = 0;
        }
        if (activeGameType === "EDU_AMONG_US" && next.players) {
          next.players.forEach((p: any) => {
            if (p.isIsolated) {
              p.isolatedLeft = (p.isolatedLeft ?? 2) - 1;
              if (p.isolatedLeft <= 0) {
                p.isIsolated = false;
                if (p.id === "solo-p1") setLocalIsolated(false);
              }
            }
          });
        }
        return next;
      });

      if (!isSoloPin && isConnected) {
        submitSlideAnswer(pin, playerId, currentSlide.id, "__TIMEOUT__", limitMs).catch(() => {});
      }

      const autoNext = setTimeout(() => {
        if (currentSlideIndex < slides.length - 1) {
          setCurrentSlideIndex((prev) => prev + 1);
        } else {
          setIsQuizCompleted(true);
        }
      }, 2500);
      return () => clearTimeout(autoNext);
    }
  }, [timeLeft, hasAnsweredCurrentSlide, currentSlide, slides.length, currentSlideIndex, effectiveIsMatchStarted, effectiveMatchEnded]);

  // Xử lý nộp câu trả lời slide (Quy tắc Đúng / Sai chuẩn 7 Game)
  const handleSelectOption = async (optionId: string) => {
    if (hasAnsweredCurrentSlide || !currentSlide || timeLeft <= 0) return;

    if (effectiveIsolated) {
      soundFX.playWrongAnswer();
      setLocalBannerMsg("⛔ Bạn đang ở trong Buồng Cách Ly (2 câu hỏi), không thể trả lời câu hỏi này!");
      return;
    }

    setHasAnsweredCurrentSlide(true);
    setSelectedOptionId(optionId);
    if (timerRef.current) clearInterval(timerRef.current);

    const responseTimeMs = Math.max(100, Date.now() - questionStartTimeRef.current);
    setResponseTimes((prev) => [...prev, responseTimeMs]);

    // Kiểm tra đáp án trực tiếp cho chế độ Solo hoặc phản hồi tức thì
    const chosenOpt = currentSlide.options.find((o) => o.id === optionId);
    const correctOpt = currentSlide.options.find((o) => o.isCorrect) || currentSlide.options[0];
    const isCorrect = Boolean(chosenOpt?.isCorrect);

    if (isCorrect) {
      const nextCombo = combo + 1;
      lastCorrectAtRef.current = Date.now();
      // Chuẩn quy tắc: Tower Defense = 100 Vàng (+50 Vàng nếu trả lời <= 5s), các game khác = +1 lượt
      const earnedPts =
        activeGameType === "TOWER_DEFENSE"
          ? 100 + (responseTimeMs <= 5000 ? 50 : 0)
          : 1;
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      setCorrectCount((c) => c + 1);
      soundFX.playCorrectCombo(nextCombo);
      setTotalScore((prev) => prev + (currentSlide.points || 100) + nextCombo * 20);
      setLocalActionPoints((prev) => prev + earnedPts);
      setLocalAnswerCheck({
        slideId: currentSlide.id,
        isCorrect: true,
        isTimeout: false,
        correctOptionId: correctOpt?.id,
        actionPointsEarned: earnedPts,
        message:
          activeGameType === "TOWER_DEFENSE" && responseTimeMs <= 5000
            ? `Chính xác siêu tốc (${(responseTimeMs / 1000).toFixed(1)}s)! +100 Vàng +50 Vàng thưởng tốc độ!`
            : `Chính xác! +${earnedPts} ${actionPointLabel}${
                activeGameType === "QUIZ_BOMBERMAN" ? " & +3 Bước Di Chuyển" : ""
              }!`,
      });

      // Đặc trưng từng game khi trả lời ĐÚNG
      setSoloBoard((prev: any) => {
        const next = JSON.parse(JSON.stringify(prev || {}));
        if (activeGameType === "EDU_AMONG_US") {
          if (effectiveRole !== "IMPOSTOR") {
            const gain = isSoloPin ? 15 : 3;
            next.stationProgress = Math.min(100, (next.stationProgress || 0) + gain);
            const msg = `🔬 ${nickname} trả lời đúng: Trạm Không Gian tự động tăng +${gain}% năng lượng (${next.stationProgress}%)!`;
            next.activityLog = [...(next.activityLog || []), msg];
            setLocalBannerMsg(msg);
            if (next.stationProgress >= 100) {
              setLocalMatchEnded({
                winnerTeam: "PHE NHÀ KHOA HỌC (SCIENTISTS)",
                message: "Năng lượng Trạm Không Gian đạt 100%! Phe Nhà Khoa Học giành chiến thắng!",
              });
            }
          } else {
            setLocalBannerMsg("😈 Nội gián trả lời đúng: +0% tiến độ trạm (ngụy trang) & nhận +1 Điểm Phá Hoại Ngầm!");
          }
        } else if (activeGameType === "QUIZ_BOMBERMAN" && next.players?.[0]) {
          next.players[0].moveSteps = (next.players[0].moveSteps || 0) + 3;
          if (nextCombo >= 3) {
            next.players[0].bombRange = 4;
          }
        } else if (activeGameType === "DRAGON_BOAT" && next.boatA) {
          if (nextCombo >= 4) {
            next.boatA.nitroStrokesLeft = 3;
            setLocalBannerMsg("🔥 Đạt chuỗi Combo 4 câu đúng liên tiếp! Kích hoạt Tăng Tốc Nitro (+30m/nhịp cho 3 nhịp tiếp theo)!");
          }
        }
        // Giảm bộ đếm cách ly 2 câu hỏi cho người chơi bị cách ly (nếu có)
        if (activeGameType === "EDU_AMONG_US" && next.players) {
          next.players.forEach((p: any) => {
            if (p.isIsolated) {
              p.isolatedLeft = (p.isolatedLeft ?? 2) - 1;
              if (p.isolatedLeft <= 0) p.isIsolated = false;
            }
          });
        }
        return next;
      });
    } else {
      // Quy tắc khi trả lời SAI: +0 điểm, +0 lượt hành động, mất chuỗi Combo, báo âm thanh sai & hiện đáp án đúng
      soundFX.playWrongAnswer();
      setCombo(0);
      setWrongCount((w) => w + 1);
      setLocalAnswerCheck({
        slideId: currentSlide.id,
        isCorrect: false,
        isTimeout: false,
        correctOptionId: correctOpt?.id,
        actionPointsEarned: 0,
        message: `Chưa chính xác! (+0 ${actionPointLabel}, mất chuỗi Combo). Đáp án đúng là: ${correctOpt?.content || ""}`,
      });
      setSoloBoard((prev: any) => {
        const next = JSON.parse(JSON.stringify(prev || {}));
        if (activeGameType === "DRAGON_BOAT" && next.boatA) {
          next.boatA.comboRow = 0;
        }
        if (activeGameType === "EDU_AMONG_US" && next.players) {
          next.players.forEach((p: any) => {
            if (p.isIsolated) {
              p.isolatedLeft = (p.isolatedLeft ?? 2) - 1;
              if (p.isolatedLeft <= 0) p.isIsolated = false;
            }
          });
        }
        return next;
      });
    }

    // AI Bot cũng tăng điểm nhẹ để đua bảng xếp hạng
    setBotScore((prev) => prev + (Math.random() > 0.35 ? 100 : 0));

    // Nếu đang kết nối Hub thật thì gửi cả lên Server
    if (!isSoloPin && isConnected) {
      try {
        await submitSlideAnswer(pin, playerId, currentSlide.id, optionId, responseTimeMs);
      } catch (err) {
        console.warn("Lỗi submit slide answer:", err);
      }
    }
  };

  // Chuyển sang câu hỏi kế tiếp (Nếu đã hết câu hỏi cuối cùng -> Vào Nước Rút Cuối Trận 15s & Phân định thắng thua)
  const handleNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    } else {
      setIsQuizCompleted(true);
    }
  };

  // Pháo hoa khi kết thúc trận
  useEffect(() => {
    if (effectiveMatchEnded) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [effectiveMatchEnded]);

  // Sao chép mã PIN
  const handleCopyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // ── BỘ XỬ LÝ LOGIC SOLO + AI BOT CHO CẢ 7 CHẾ ĐỘ GAME CHUẨN TÀI LIỆU ──────
  const handlePerformAction = async (actionType: string, payload: any) => {
    setTacticalCount((c) => c + 1);
    if (!isSoloPin && isConnected && activeGameType === initialGameType) {
      await performGameAction(pin, playerId, actionType, payload);
    }

    setSoloBoard((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || {}));

      // 1. HEX CONQUEST (11x11, 2-click hạ cấp ô địch, BFS Vây Thành Đổi Màu, >70% thắng)
      if (activeGameType === "HEX_CONQUEST" && actionType === "CLAIM_HEX") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        const target = next.cells?.find((c: any) => c.r === payload.r && c.c === payload.c);
        if (target && !target.fortified) {
          if (target.owner === "TEAM_B") {
            target.owner = "NONE";
            setLocalBannerMsg(`Đã hạ cấp ô địch (${payload.r}, ${payload.c}) về Trung lập! Click thêm 1 lần nữa để chiếm hẳn!`);
          } else {
            target.owner = "TEAM_A";
          }
        }
        // Vây Thành Đổi Màu (BFS kiểm tra các ô không chạm rìa và không chạm căn cứ)
        next.cells?.forEach((cell: any) => {
          if (cell.owner !== "TEAM_A" && !cell.isBase && cell.r > 0 && cell.r < 10 && cell.c > 0 && cell.c < 10) {
            const neighbors = next.cells.filter(
              (n: any) => Math.abs(n.r - cell.r) + Math.abs(n.c - cell.c) === 1
            );
            if (neighbors.length >= 3 && neighbors.every((n: any) => n.owner === "TEAM_A")) {
              cell.owner = "TEAM_A";
            }
          }
        });
        // AI Bot mở rộng từ góc Đông Nam
        const emptyNearB = next.cells?.filter(
          (c: any) =>
            c.owner === "NONE" &&
            next.cells.some(
              (b: any) => b.owner === "TEAM_B" && Math.abs(b.r - c.r) + Math.abs(b.c - c.c) === 1
            )
        );
        if (emptyNearB && emptyNearB.length > 0) {
          emptyNearB[Math.floor(Math.random() * emptyNearB.length)].owner = "TEAM_B";
        }
        next.teamACells = next.cells?.filter((c: any) => c.owner === "TEAM_A").length || 0;
        next.teamBCells = next.cells?.filter((c: any) => c.owner === "TEAM_B").length || 0;
        const winTarget = Math.floor((next.rows || 11) * (next.cols || 11) * 0.7) + 1;
        if (target?.owner === "TEAM_A") {
          setLocalBannerMsg(`Đã chiếm ô (${payload.r}, ${payload.c})! Lãnh thổ Đội A: ${next.teamACells}/${winTarget} ô.`);
        }
        if (next.teamACells >= winTarget) {
          setLocalMatchEnded({
            winnerTeam: "ĐỘI A (TÂY BẮC)",
            message: `Thắng tuyệt đối! Đội A đã chiếm ${next.teamACells} ô (>70% bản đồ)!`,
          });
        }
      }

      // 2. TOWER DEFENSE (1000 HP, Nhánh Phòng Thủ xây tháp + Nhánh Tấn Công thả quái)
      if (activeGameType === "TOWER_DEFENSE") {
        if (actionType === "BUILD_TOWER") {
          const cost =
            payload.towerType === "LASER" || payload.towerType === "CANNON"
              ? 200
              : payload.towerType === "FREEZE"
              ? 150
              : 100;
          setLocalActionPoints((p) => Math.max(0, p - cost));
          next.towers = next.towers || [];
          next.towers.push({
            id: `t-${Date.now()}`,
            ownerTeam: "TEAM_A",
            x: payload.x,
            y: payload.y,
            lane: payload.lane || 0,
            type: payload.towerType || "ARCHER",
            level: 1,
          });
          setLocalBannerMsg(`Đã xây Tháp ${payload.towerType} tại (${payload.x}, ${payload.y})!`);
        } else if (actionType === "UPGRADE_TOWER") {
          setLocalActionPoints((p) => Math.max(0, p - 80));
          const tw = next.towers?.find((t: any) => t.id === payload.towerId);
          if (tw) tw.level += 1;
          setLocalBannerMsg(`Đã nâng cấp tháp lên Lv.${tw?.level || 2}!`);
        } else if (actionType === "SPAWN_CREEP") {
          const isTank = payload.creepType === "TANK";
          const cost = isTank ? 250 : 100;
          const dmg = isTank ? 100 : 20;
          setLocalActionPoints((p) => Math.max(0, p - cost));
          next.creeps = next.creeps || [];
          next.creeps.push({
            id: `c-${Date.now()}`,
            ownerTeam: "TEAM_A",
            type: isTank ? "TANK" : "SCOUT",
            lane: payload.lane || 0,
            hp: isTank ? 300 : 50,
            maxHp: isTank ? 300 : 50,
            pathIndex: 1,
            isFrozen: false,
          });
          next.teamBBaseHp = Math.max(0, (next.teamBBaseHp ?? 1000) - dmg * 2);
          setLocalBannerMsg(
            `Đã thả ${isTank ? "Chiến Xa Bọc Thép (300 HP)" : "Quái Trinh Sát (50 HP)"} tấn công Căn cứ B (-${dmg * 2} HP)!`
          );
          if (next.teamBBaseHp <= 0) {
            setLocalMatchEnded({
              winnerTeam: "CĂN CỨ ĐỘI A (BẠN)",
              message: "Chiến thắng trực tiếp! Bạn đã đánh sập Căn cứ Đội B về 0 HP!",
            });
          }
        }
        // Tháp Đội A bắn quái địch
        const totalDmg = (next.towers?.length || 1) * 45;
        next.creeps?.forEach((c: any) => {
          if (c.ownerTeam === "TEAM_B") {
            c.hp = Math.max(0, c.hp - totalDmg);
          } else {
            c.pathIndex = Math.min(7, (c.pathIndex || 1) + 2);
          }
        });
        next.creeps = (next.creeps || []).filter((c: any) => c.hp > 0 && c.pathIndex < 7);
      }

      // 3. DRAGON BOAT (1000m, +15m/nhịp, Đồng Tâm Hiệp Lực +5m trong 5s, Nitro x2 = +30m, Chướng ngại vật 250m/500m/750m)
      if (activeGameType === "DRAGON_BOAT") {
        if (actionType === "ROW_BOAT" || actionType === "ROW_FORWARD") {
          setLocalActionPoints((p) => Math.max(0, p - 1));
          const oldDist = next.boatA.distance || 0;
          next.boatA.comboRow = (next.boatA.comboRow || 0) + 1;
          const isNitro = (next.boatA.nitroStrokesLeft || 0) > 0;
          if (isNitro) next.boatA.nitroStrokesLeft -= 1;
          const isTeamSync = Date.now() - lastCorrectAtRef.current <= 5000;
          const syncBonus = isTeamSync ? 5 : 0;
          let stepMeters = (isNitro ? 30 : 15) + syncBonus;

          // Kiểm tra va chạm Xoáy Nước / Đá Ngầm ở mốc 250m, 500m, 750m trên làn hiện tại
          const hitObs = (next.obstacles || []).find(
            (o: any) =>
              o.lane === next.boatA.currentLane &&
              oldDist < o.distance &&
              oldDist + stepMeters >= o.distance
          );
          if (hitObs) {
            if (next.boatA.hasWindShield) {
              next.boatA.hasWindShield = false;
              setLocalBannerMsg(`🛡️ Lá Chắn Gió đã giúp thuyền lướt qua chướng ngại vật tại mốc ${hitObs.distance}m an toàn!`);
            } else {
              stepMeters = Math.max(5, Math.floor(stepMeters / 2));
              setLocalBannerMsg(`⚠️ Va phải ${hitObs.type === "WHIRLPOOL" ? "Xoáy Nước" : "Đá Ngầm"} tại mốc ${hitObs.distance}m! Tốc độ bị giảm một nửa (+${stepMeters}m)!`);
            }
          } else {
            setLocalBannerMsg(
              `Nhịp chèo Tri thức +${stepMeters}m${isTeamSync ? " (Đồng Tâm Hiệp Lực +5m)" : ""}${isNitro ? " (NITRO x2)" : ""}! Thuyền đạt ${Math.min(1000, oldDist + stepMeters)}m / 1000m!`
            );
          }

          next.boatA.distance = Math.min(1000, oldDist + stepMeters);
          next.boatB.distance = Math.min(1000, (next.boatB.distance || 0) + 15);
          if (next.boatA.distance >= 1000) {
            setLocalMatchEnded({
              winnerTeam: "ĐỘI THUYỀN RỒNG ĐỎ (BẠN)",
              message: "Cán mốc 1000m đầu tiên! Chiến thắng vẻ vang trên sông!",
            });
          }
        } else if (actionType === "STEER_LANE" || actionType === "CHANGE_LANE") {
          next.boatA.currentLane = payload.lane || 1;
          setLocalBannerMsg(`Đã chuyển sang Làn nước số ${next.boatA.currentLane} để né chướng ngại vật!`);
        }
      }

      // 4. RUNAWAY TRAIN (12x8, Ga Khởi Hành Cột 1 -> Ga Đích Cột 12, Tàu tự nhích mỗi 12s, Trật bánh tạm thời 10s)
      if (activeGameType === "RUNAWAY_TRAIN") {
        if (actionType === "PLACE_TRACK" || actionType === "PLACE_RAIL") {
          setLocalActionPoints((p) => Math.max(0, p - 1));
          next.placedTracks = next.placedTracks || [];
          const existingIdx = next.placedTracks.findIndex(
            (t: any) => t.x === payload.x && t.y === payload.y
          );
          if (existingIdx >= 0) {
            next.placedTracks[existingIdx].trackType = payload.trackType;
          } else {
            next.placedTracks.push({ x: payload.x, y: payload.y, trackType: payload.trackType });
          }
          const dist = Math.abs(next.train.x - payload.x) + Math.abs(next.train.y - payload.y);
          if (dist === 1 && !next.isBrakeActive) {
            next.train.dx = payload.x - next.train.x;
            next.train.dy = payload.y - next.train.y;
            next.train.x = payload.x;
            next.train.y = payload.y;
            next.train.isDerailed = false;
          }
          next.isBrakeActive = false;
          if (next.train.x >= 11 || (next.train.x === next.stationPos[0] && next.train.y === next.stationPos[1])) {
            next.train.reachedStation = true;
            setLocalMatchEnded({
              winnerTeam: "ĐỘI ĐƯỜNG SẮT A (BẠN)",
              message: "Xuất sắc! Đoàn tàu đã cập Ga Đích (Cột 12) an toàn đầu tiên!",
            });
          } else {
            setLocalBannerMsg(
              `Đã ghép ray ${payload.trackType} tại Cột ${payload.x + 1}, Hàng ${payload.y + 1}!`
            );
          }
        } else if (actionType === "ADVANCE_TRAIN_TICK") {
          if (payload?.recoverDerail) {
            next.train.isDerailed = false;
            setLocalBannerMsg("🔧 Đã hoàn tất 10 giây sửa chữa trật bánh! Hãy đặt ray ngay trước mũi tàu!");
            return next;
          }
          if (next.isBrakeActive || next.train.reachedStation || next.train.isDerailed) {
            return next;
          }
          const nx = (next.train.x ?? 1) + (next.train.dx || 1);
          const ny = (next.train.y ?? 1) + (next.train.dy || 0);
          const hitObstacle = (next.obstacles || []).some(([ox, oy]: number[]) => ox === nx && oy === ny);
          const nextTrack = (next.placedTracks || []).find((t: any) => t.x === nx && t.y === ny);
          const isGoal = nx >= 11 || (nx === next.stationPos?.[0] && ny === next.stationPos?.[1]);

          if (isGoal && !hitObstacle) {
            next.train.x = nx;
            next.train.y = ny;
            next.train.reachedStation = true;
            setLocalMatchEnded({
              winnerTeam: "ĐỘI ĐƯỜNG SẮT A (BẠN)",
              message: "Xuất sắc! Đoàn tàu đã cập Ga Đích (Cột 12) an toàn đầu tiên!",
            });
          } else if (nextTrack && !hitObstacle && nx >= 0 && nx < 12 && ny >= 0 && ny < 8) {
            next.train.x = nx;
            next.train.y = ny;
            if (nextTrack.trackType === "CURVE_SE") {
              next.train.dx = 0;
              next.train.dy = 1;
            } else if (nextTrack.trackType === "CURVE_NE") {
              next.train.dx = 0;
              next.train.dy = -1;
            } else if (nextTrack.trackType === "CURVE_SW" || nextTrack.trackType === "CURVE_NW") {
              next.train.dx = 1;
              next.train.dy = 0;
            } else if (nextTrack.trackType === "STRAIGHT_V") {
              next.train.dx = 0;
              next.train.dy = next.train.dy !== 0 ? next.train.dy : 1;
            } else {
              next.train.dx = 1;
              next.train.dy = 0;
            }
            setLocalBannerMsg(`🚂 Tàu tự động nhích lên Cột ${nx + 1}, Hàng ${ny + 1} theo chu kỳ 12s!`);
          } else {
            next.train.isDerailed = true;
            next.train.derailCount = (next.train.derailCount || 0) + 1;
            setTotalScore((s) => Math.max(0, s - 50));
            soundFX.playWrongAnswer();
            setLocalBannerMsg(
              `⚠️ TRẬT BÁNH TẠM THỜI tại Cột ${nx + 1}, Hàng ${ny + 1} do chưa có đường ray phía trước! Phạt dừng 10 giây và trừ -50 điểm!`
            );
          }
        }
      }

      // 5. ARTILLERY DUEL (X=0..100, Pháo đài 1000 HP, Núi X=45..55, lệch <=3: 150 dmg, 4..7: 80 dmg)
      if (activeGameType === "ARTILLERY_DUEL" && actionType === "FIRE_CANNON") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        const angleVal = Math.max(15, Math.min(80, Number(payload.angle || 45)));
        const powerVal = Math.max(10, Math.min(100, Number(payload.power || 75)));
        const rad = (angleVal * Math.PI) / 180;
        const wind = next.currentWind || 0;
        const range = powerVal * 0.96 * Math.sin(2 * rad) + wind * 1.5;
        const maxHeight = powerVal * 0.65 * Math.pow(Math.sin(rad), 2);
        const hitMountain = !next.piercingReadyA && maxHeight < (next.mountainHeight || 28) && range > 33;
        next.piercingReadyA = false;
        const impactX = hitMountain ? 50 : Math.round((12 + range) * 10) / 10;
        const diff = Math.abs(impactX - 88);

        let dmg = 0;
        let hitLabel = `Trượt mục tiêu (Đạn rơi tại X=${impactX}, mục tiêu ở X=88)`;
        if (hitMountain) {
          hitLabel = `Đạn va vào ngọn núi giữa bản đồ tại X=50! Hãy tăng Góc bắn hoặc dùng Đạn Xuyên Địa Hình!`;
        } else if (diff <= 3) {
          dmg = 150;
          hitLabel = `CHÍ MẠNG TRÚNG TÂM (X=${impactX})! Trừ -150 HP Pháo đài B!`;
        } else if (diff <= 7) {
          dmg = 80;
          hitLabel = `Sát thương nổ lan (X=${impactX})! Trừ -80 HP Pháo đài B!`;
        }

        next.fortressHpB = Math.max(0, (next.fortressHpB ?? 1000) - dmg);
        if (next.fortressHpB > 0) {
          const aiDmg = next.shieldActiveA ? 0 : 80;
          next.fortressHpA = Math.max(0, (next.fortressHpA ?? 1000) - aiDmg);
          next.shieldActiveA = false;
        }
        next.currentWind = Math.floor(Math.random() * 21) - 10;
        const logEntry = `Góc ${angleVal}°, Lực ${powerVal} ➔ ${hitLabel}`;
        next.shotHistory = [...(next.shotHistory || []), logEntry];
        setLocalBannerMsg(logEntry);
        if (next.fortressHpB <= 0) {
          setLocalMatchEnded({
            winnerTeam: "PHÁO ĐÀI ĐỘI A (BẠN)",
            message: "Đại thắng! Bạn đã bắn sập Pháo đài Đội B (1000 HP) về 0!",
          });
        }
      }

      // 6. EDU AMONG US (0% -> 100%, Phá hoại -8%, Bỏ phiếu cách ly 2 câu hỏi +10% nếu trúng Nội gián)
      if (activeGameType === "EDU_AMONG_US") {
        if (actionType === "REPAIR_TASK" || actionType === "REPAIR_STATION") {
          setLocalActionPoints((p) => Math.max(0, p - 1));
          next.stationProgress = Math.min(100, (next.stationProgress || 0) + 10);
          next.meltdownActive = false;
          const msg = `${nickname} hoàn tất tác vụ kỹ thuật (+10%). Tiến độ Trạm: ${next.stationProgress}%`;
          next.activityLog = [...(next.activityLog || []), msg];
          setLocalBannerMsg(msg);
          if (next.stationProgress >= 100) {
            setLocalMatchEnded({
              winnerTeam: "PHE NHÀ KHOA HỌC (SCIENTISTS)",
              message: "Hoàn thành 100% Năng lượng Trạm Không Gian! Phe Nhà Khoa Học chiến thắng!",
            });
          }
        } else if (actionType === "SABOTAGE") {
          setLocalActionPoints((p) => Math.max(0, p - 1));
          if (!next.systemShieldActive) {
            next.stationProgress = Math.max(0, (next.stationProgress || 0) - 8);
          }
          next.meltdownActive = true;
          const msg = `BÁO ĐỘNG ĐỎ: Nội gián đánh sập lò phản ứng (-8%)! Tiến độ còn ${next.stationProgress}%`;
          next.activityLog = [...(next.activityLog || []), msg];
          setLocalBannerMsg(msg);
        } else if (actionType === "CALL_MEETING") {
          setLocalActionPoints((p) => Math.max(0, p - 1));
          next.meetingActive = true;
          next.meetingCallerNickname = nickname;
          setLocalBannerMsg(
            "Đã mở Phiên Họp Bỏ Phiếu Cách Ly! Hãy chọn 1 nghi can để cách ly 2 câu hỏi (+10% nếu trúng Nội gián)!"
          );
        } else if (actionType === "VOTE_ISOLATE") {
          const suspect = next.players?.find((p: any) => p.id === payload.suspectPlayerId);
          if (suspect) {
            suspect.isIsolated = true;
            const isImp = suspect.role === "IMPOSTOR" || suspect.id === "bot-2";
            if (isImp) {
              next.stationProgress = Math.min(100, (next.stationProgress || 0) + 10);
              setLocalBannerMsg(
                `Chính xác! ${suspect.nickname} là NỘI GIÁN! Đã cách ly trong 2 câu hỏi và thưởng +10% năng lượng trạm!`
              );
            } else {
              setLocalBannerMsg(`Đã cách ly ${suspect.nickname} vào Buồng Kính trong 2 câu hỏi tiếp theo!`);
            }
          }
          next.meetingActive = false;
        }
      }

      // 7. QUIZ BOMBERMAN (15x15, 5 Tim HP, Phá gạch +50đ, Trúng địch -1 Tim & cướp 200đ & đẩy về xuất phát)
      if (activeGameType === "QUIZ_BOMBERMAN") {
        const me = next.players?.[0];
        const enemy = next.players?.[1];
        if (me && (actionType === "MOVE_STEP" || actionType === "MOVE_PLAYER")) {
          let nr = me.r;
          let nc = me.c;
          if (payload.direction === "UP") nr -= 1;
          if (payload.direction === "DOWN") nr += 1;
          if (payload.direction === "LEFT") nc -= 1;
          if (payload.direction === "RIGHT") nc += 1;
          if (nr >= 0 && nr < next.size && nc >= 0 && nc < next.size && next.grid[nr][nc] === ".") {
            me.r = nr;
            me.c = nc;
            me.moveSteps = Math.max(0, (me.moveSteps || 1) - 1);
          }
        } else if (me && actionType === "PLANT_BOMB") {
          setLocalActionPoints((p) => Math.max(0, p - 1));
          const br = me.r;
          const bc = me.c;
          const range = me.bombRange || 2;
          next.bombs = next.bombs || [];
          next.bombs.push({
            id: `b-${Date.now()}`,
            r: br,
            c: bc,
            timerTicks: 3,
            range,
            ownerPlayerId: me.playerId,
            ownerNickname: me.nickname,
          });
          setLocalBannerMsg(`Đã đặt bom hẹn giờ tại (${br}, ${bc}) bán kính ${range} ô!`);

          setTimeout(() => {
            setSoloBoard((afterBomb: any) => {
              const updated = JSON.parse(JSON.stringify(afterBomb || {}));
              updated.bombs = (updated.bombs || []).filter((b: any) => !(b.r === br && b.c === bc));
              let broken = 0;
              let hitEnemy = false;
              const dirs = [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
              ];
              dirs.forEach(([dr, dc]) => {
                for (let step = 1; step <= range; step++) {
                  const tr = br + dr * step;
                  const tc = bc + dc * step;
                  if (tr < 0 || tr >= updated.size || tc < 0 || tc >= updated.size) break;
                  if (updated.grid[tr][tc] === "W") break;
                  if (updated.grid[tr][tc] === "B") {
                    updated.grid[tr][tc] = ".";
                    broken++;
                    break;
                  }
                  if (updated.players?.[1] && updated.players[1].r === tr && updated.players[1].c === tc) {
                    hitEnemy = true;
                  }
                }
              });
              if (hitEnemy && updated.players?.[1]) {
                updated.players[1].hp = Math.max(0, (updated.players[1].hp || 5) - 1);
                updated.players[1].r = 13;
                updated.players[1].c = 13;
                setTotalScore((s) => s + 200);
                setBotScore((b) => Math.max(0, b - 200));
                if (updated.players[1].hp <= 0) {
                  setLocalMatchEnded({
                    winnerTeam: "ĐỘI BOM A (BẠN)",
                    message: "Chiến thắng tuyệt đối! Đã đánh cạn 5 Tim (HP) của Đội B!",
                  });
                }
              }
              if (broken > 0 || hitEnemy) {
                setTotalScore((s) => s + broken * 50);
                setLocalBannerMsg(
                  `BÙM! Phá vỡ ${broken} tường gạch (+${broken * 50}đ)${
                    hitEnemy ? " & Nổ trúng đối phương (-1 Tim, cướp +200đ, đẩy về (13,13))!" : "!"
                  }`
                );
              }
              return updated;
            });
          }, 900);
        }
      }

      return next;
    });
  };

  // Sử dụng kỹ năng chiến thuật đặc trưng cho cả 7 Game
  const handleUseSkill = async (skillName: string, payload: any) => {
    setTacticalCount((c) => c + 1);
    if (!isSoloPin && isConnected && activeGameType === initialGameType) {
      await useGameSkill(pin, playerId, skillName, payload);
    }

    setSoloBoard((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || {}));

      // Game 1: HEX_CONQUEST
      if (skillName === "FORTIFY_HEX") {
        const cell = next.cells?.find((c: any) => c.r === payload.r && c.c === payload.c);
        if (cell) {
          cell.owner = "TEAM_A";
          cell.fortified = true;
          cell.fortifiedTurns = 2;
        }
        setLocalBannerMsg(`Tường Thành (Combo 2): Bảo vệ ô (${payload.r}, ${payload.c}) trong 2 lượt tiếp theo!`);
      } else if (skillName === "PARACHUTE_DROP") {
        const cell = next.cells?.find((c: any) => c.r === payload.r && c.c === payload.c);
        if (cell && !cell.fortified) cell.owner = "TEAM_A";
        next.teamACells = next.cells?.filter((c: any) => c.owner === "TEAM_A").length || 0;
        setLocalBannerMsg(`Nhảy Dù Đột Kích (Combo 3): Chiếm ngay ô (${payload.r}, ${payload.c}) không cần kề cạnh!`);
      } else if (skillName === "COLOR_BOMB" || skillName === "EXPAND_BURST") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        const cr = payload.r ?? 5;
        const cc = payload.c ?? 5;
        const targets = next.cells
          ?.filter((c: any) => Math.abs(c.r - cr) + Math.abs(c.c - cc) <= 1 && !c.fortified)
          .slice(0, 4);
        targets?.forEach((c: any) => (c.owner = "TEAM_A"));
        next.teamACells = next.cells?.filter((c: any) => c.owner === "TEAM_A").length || 0;
        setLocalBannerMsg(`Bom Màu (100 NL): Nhuộm màu đồng loạt ô tâm (${cr},${cc}) và 3 ô liền kề!`);
      }
      // Game 2: TOWER_DEFENSE
      else if (skillName === "GLOBAL_FREEZE" || skillName === "METEOR_STRIKE") {
        setLocalActionPoints((p) => Math.max(0, p - 150));
        next.creeps?.forEach((c: any) => {
          c.isFrozen = true;
        });
        setLocalBannerMsg("Đóng Băng Toàn Cầu: Đóng băng toàn bộ quái vật đối phương trong 5 giây!");
      } else if (skillName === "TOWER_BOOST") {
        setLocalBannerMsg("Cường Hóa Tháp (Combo 3): Tăng gấp đôi (x2) tốc độ bắn cho toàn bộ tháp trong 8 giây!");
      } else if (skillName === "BASE_SHIELD" || skillName === "REPAIR_BASE") {
        setLocalActionPoints((p) => Math.max(0, p - 100));
        next.teamAShield = (next.teamAShield || 0) + 200;
        setLocalBannerMsg(`Khiên Căn Cứ: Tạo lớp giáp ảo hấp thụ +200 sát thương (Tổng giáp: ${next.teamAShield})!`);
      }
      // Game 5: DRAGON_BOAT
      else if (skillName === "INK_TORPEDO" || skillName === "WATER_SPLASH") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        next.boatB.distance = Math.max(0, (next.boatB.distance || 0) - 20);
        setLocalBannerMsg("Phun Mực Đen / Thủy Lôi: Đẩy lùi thuyền dẫn đầu -20m và che vết mực đen 6 giây!");
      } else if (skillName === "NITRO_BOOST" || skillName === "DRUM_BEAT") {
        next.boatA.nitroStrokesLeft = 3;
        setLocalBannerMsg("Tăng Tốc Nitro (Combo 4): 3 nhịp chèo tiếp theo đạt gấp đôi quãng đường (+30m/nhịp)!");
      } else if (skillName === "WIND_SHIELD") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        next.boatA.hasWindShield = true;
        setLocalBannerMsg("Lá Chắn Gió: Giúp thuyền lướt qua Xoáy Nước / Đá Ngầm và chặn 1 quả Thủy Lôi!");
      }
      // Game 7: RUNAWAY_TRAIN
      else if (skillName === "EMERGENCY_BRAKE") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        next.isBrakeActive = true;
        setLocalBannerMsg("Phanh Khẩn Cấp: Giữ đoàn tàu đứng yên tại chỗ trong 12 giây để kịp ghép ray!");
      } else if (skillName === "SWITCH_TRACK") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        setLocalBannerMsg("Bẻ Ghi Đường Ray: Đã xoay ngang 1 mảnh đường ray phía trước mũi tàu đối phương!");
      } else if (skillName === "BOILER_OVERDRIVE") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        next.isBoilerOverdrive = true;
        setLocalBannerMsg("Tăng Áp Lò Hơi: Tàu đối phương bị tăng gấp đôi tốc độ di chuyển trong 10 giây!");
      } else if (skillName === "DYNAMITE_OBSTACLE") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        next.obstacles = (next.obstacles || []).filter(
          ([ox, oy]: number[]) => !(ox === payload.x && oy === payload.y)
        );
        setLocalBannerMsg(`Đã phá chướng ngại vật tại Cột ${payload.x + 1}, Hàng ${payload.y + 1}!`);
      }
      // Game 8: ARTILLERY_DUEL
      else if (skillName === "CLUSTER_SHELL") {
        next.fortressHpB = Math.max(0, (next.fortressHpB ?? 1000) - 220);
        setLocalBannerMsg("Đạn Phân Mảnh (Combo 3): 3 đầu đạn nổ trải rộng gây 220 sát thương lên Pháo đài B!");
        if (next.fortressHpB <= 0) {
          setLocalMatchEnded({
            winnerTeam: "PHÁO ĐÀI ĐỘI A (BẠN)",
            message: "Đại thắng! Đạn Phân Mảnh đã đánh sập Pháo đài Đội B!",
          });
        }
      } else if (skillName === "PIERCING_SHELL") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        next.piercingReadyA = true;
        setLocalBannerMsg("Đạn Xuyên Địa Hình: Phát bắn tiếp theo sẽ bay xuyên qua ngọn núi giữa bản đồ!");
      } else if (skillName === "DOME_SHIELD" || skillName === "ENERGY_SHIELD") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        next.shieldActiveA = true;
        setLocalBannerMsg("Lá Chắn Vòm: Bảo vệ Pháo đài khỏi 1 phát đạn của đối phương!");
      } else if (skillName === "WIND_CONTROLLER") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        next.currentWind = Math.floor(Math.random() * 21) - 10;
        setLocalBannerMsg(`Đảo Chiều Gió: Sức gió vừa đổi sang ${next.currentWind}!`);
      }
      // Game 9: EDU_AMONG_US
      else if (skillName === "BIOMETRIC_SCAN" || skillName === "SCAN_VITALS") {
        setLocalBannerMsg(
          "Máy Quét Sinh Trắc Học (Combo 4): Phát hiện Kỹ sư Lan (AI) đóng góp 0% trong 3 câu gần nhất (Nghi vấn Nội Gián)!"
        );
      } else if (skillName === "SYSTEM_SHIELD") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        next.systemShieldActive = true;
        setLocalBannerMsg("Lá Chắn Bảo Toàn Hệ Thống: Khóa thanh tiến độ trạm không bị trừ điểm trong 15 giây!");
        setTimeout(() => {
          setSoloBoard((b: any) => ({ ...b, systemShieldActive: false }));
        }, 15000);
      } else if (skillName === "JAM_SIGNAL" || skillName === "DISGUISE") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        next.signalJamActive = true;
        setLocalBannerMsg("Gây Nhiễu Tín Hiệu: Làm nhấp nháy khung câu hỏi của phe Nhà Khoa Học trong 8 giây!");
        setTimeout(() => {
          setSoloBoard((b: any) => ({ ...b, signalJamActive: false }));
        }, 8000);
      }
      // Game 10: QUIZ_BOMBERMAN
      else if (skillName === "LONG_FIRE_BOMB") {
        if (next.players?.[0]) next.players[0].bombRange = 4;
        setLocalBannerMsg("Bom Lửa Dài (Combo 3): Phạm vi nổ chữ thập tăng từ 2 ô lên 4 ô!");
      } else if (skillName === "SHIELD") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        if (next.players?.[0]) next.players[0].shieldActive = true;
        setLocalBannerMsg("Khiên Chống Nổ: Bảo vệ nhân vật không bị mất Tim trước 1 vụ nổ bom!");
      } else if (skillName === "KICK_BOMB") {
        setLocalActionPoints((p) => Math.max(0, p - 1));
        setLocalBannerMsg("Đá Bom: Đã sút quả bom trượt thẳng 4 ô về phía đối phương!");
      }

      return next;
    });
  };

  // Render Component Bản đồ tương ứng
  const renderGameMap = () => {
    const rawBoard =
      !isSoloPin && isConnected && gameState && activeGameType === initialGameType
        ? gameState?.board || gameState?.boardState || gameState
        : soloBoard;

    switch (activeGameType) {
      case "HEX_CONQUEST":
        return (
          <HexConquestMap
            boardState={rawBoard}
            actionPoints={effectiveActionPoints}
            playerTeam={teamSide || "TEAM_A"}
            isIsolated={effectiveIsolated}
            onPerformAction={handlePerformAction}
            onUseSkill={handleUseSkill}
          />
        );
      case "TOWER_DEFENSE":
        return (
          <TowerDefenseMap
            boardState={rawBoard}
            actionPoints={effectiveActionPoints}
            playerTeam={teamSide || "TEAM_A"}
            isIsolated={effectiveIsolated}
            onPerformAction={handlePerformAction}
            onUseSkill={handleUseSkill}
          />
        );
      case "DRAGON_BOAT":
        return (
          <DragonBoatMap
            boardState={rawBoard}
            actionPoints={effectiveActionPoints}
            playerTeam={teamSide || "TEAM_A"}
            isIsolated={effectiveIsolated}
            onPerformAction={handlePerformAction}
            onUseSkill={handleUseSkill}
          />
        );
      case "RUNAWAY_TRAIN":
        return (
          <RunawayTrainMap
            boardState={rawBoard}
            actionPoints={effectiveActionPoints}
            playerTeam={teamSide || "TEAM_A"}
            isIsolated={effectiveIsolated}
            onPerformAction={handlePerformAction}
            onUseSkill={handleUseSkill}
          />
        );
      case "ARTILLERY_DUEL":
        return (
          <ArtilleryDuelMap
            boardState={rawBoard}
            actionPoints={effectiveActionPoints}
            playerTeam={teamSide || "TEAM_A"}
            isIsolated={effectiveIsolated}
            onPerformAction={handlePerformAction}
            onUseSkill={handleUseSkill}
          />
        );
      case "EDU_AMONG_US":
        return (
          <EduAmongUsMap
            boardState={rawBoard}
            actionPoints={effectiveActionPoints}
            playerTeam={teamSide || "TEAM_A"}
            isIsolated={effectiveIsolated}
            playerRole={effectiveRole}
            playersList={rawBoard?.players || gameState?.players || []}
            onPerformAction={handlePerformAction}
            onUseSkill={handleUseSkill}
          />
        );
      case "QUIZ_BOMBERMAN":
        return (
          <QuizBombermanMap
            boardState={rawBoard}
            actionPoints={effectiveActionPoints}
            playerTeam={teamSide || "TEAM_A"}
            isIsolated={effectiveIsolated}
            onPerformAction={handlePerformAction}
            onUseSkill={handleUseSkill}
          />
        );
      default:
        return null;
    }
  };

  const activeAnswerFeedback =
    localAnswerCheck ||
    (lastAnswerResult && lastAnswerResult.slideId === currentSlide?.id ? lastAnswerResult : null);

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/play?pin=${pin}`;
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStartMatchAction = async () => {
    setLocalMatchStarted(true);
    setLocalMatchEnded(null);
    if (!isSoloPin && isConnected) {
      await startMatch(pin);
    }
  };

  const handleResetMatchAction = async () => {
    handleSwitchGameMode(activeGameType);
    if (!isSoloPin && isConnected) {
      setLocalMatchStarted(false);
      await resetMatch(pin);
    }
  };

  const handleChooseTeam = async (side: "TEAM_A" | "TEAM_B") => {
    setHasJoinedTeam(true);
    if (!isSoloPin && isConnected) {
      await switchTeam(pin, playerId, side);
    }
  };

  const totalJoinedPlayers = roster.players.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col font-sans select-none">
      {/* ── TOP HEADER BAR (GIỐNG HẢI TẶC TRI THỨC - ĐƠN TỪNG GAME) ── */}
      <header className="w-full bg-slate-900/95 border-b border-slate-800/80 px-4 py-3 backdrop-blur-md sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: Back Button + Game Icon + Dedicated Game Name + PIN */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Thoát phòng"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">{gameMeta.icon}</span>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-wide bg-gradient-to-r from-cyan-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent uppercase">
                {gameMeta.name}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyPin}
            className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 flex items-center gap-1.5 cursor-pointer transition-all"
            title="Sao chép mã PIN"
          >
            {copiedPin ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>PIN: {pin}</span>
          </button>
        </div>

        {/* Center: Action Points HUD (Hiển thị khi đang trong trận đấu) */}
        {effectiveIsMatchStarted && (
          <div className="flex flex-wrap items-center gap-2.5">
            {combo > 1 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full animate-bounce">
                <Flame size={15} className="text-amber-400 fill-amber-400" />
                <span className="text-xs font-black text-amber-300">COMBO x{combo}</span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3.5 py-1 bg-indigo-950/80 border border-indigo-500/40 rounded-xl shadow-inner">
              <Sparkles size={15} className="text-indigo-400" />
              <div className="text-left">
                <div className="text-[9px] text-slate-400 uppercase font-bold leading-none">
                  {actionPointLabel}
                </div>
                <div className="text-sm font-black text-emerald-400 leading-tight">
                  {effectiveActionPoints}
                </div>
              </div>
            </div>

            {activeGameType === "EDU_AMONG_US" && (
              <button
                type="button"
                onClick={async () => {
                  const nextRole = effectiveRole === "IMPOSTOR" ? "SCIENTIST" : "IMPOSTOR";
                  setLocalRole(nextRole);
                  if (!isSoloPin && isConnected) {
                    await useGameSkill(pin, playerId, "SWITCH_ROLE", {});
                  }
                  setLocalBannerMsg(
                    `Đã đổi vai trò sang: ${nextRole === "IMPOSTOR" ? "😈 NỘI GIÁN (IMPOSTOR)" : "🔬 NHÀ KHOA HỌC"}`
                  );
                }}
                className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Vai: {effectiveRole === "IMPOSTOR" ? "Nội Gián" : "Khoa Học"}
              </button>
            )}
          </div>
        )}

        {/* Right: Role Badge & Room Controls */}
        <div className="flex items-center gap-2.5">
          {isHost && !isSoloPin ? (
            <div className="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border-indigo-400/40">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">CHỦ PHÒNG</span>
            </div>
          ) : (
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                teamSide === "TEAM_A"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-400/40"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              <span>{teamSide === "TEAM_A" ? gameMeta.teamAName : gameMeta.teamBName}</span>
            </div>
          )}

          {effectiveIsMatchStarted && isHost && (
            <>
              <button
                type="button"
                onClick={handleResetMatchAction}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Khởi tạo lại ván đấu"
              >
                <RotateCcw size={13} />
                <span className="hidden md:inline">Chơi Lại</span>
              </button>

              <button
                type="button"
                onClick={evaluateFinalTieBreaker}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer hidden sm:inline-flex items-center gap-1"
              >
                <span>Kết Thúc & Tổng Kết</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onExit}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-all flex items-center gap-1 cursor-pointer"
            title="Rời phòng"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rời phòng</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          PHASE 1: SẢNH CHỜ PRE-GAME LOBBY (GIỐNG HỆT HẢI TẶC TRI THỨC)
         ========================================================================= */}
      {!effectiveIsMatchStarted ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6 animate-in fade-in duration-300">
          {/* 1.1: BẢNG ĐIỀU KHIỂN SẢNH CHỜ CỦA HOST (MÃ PIN LỚN + QR CODE + NÚT BẮT ĐẦU) */}
          {isHost && (
            <div className="w-full bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
                {/* Cột trái: Mã PIN Phòng & Thông tin chế độ */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Phòng Thi Đấu: {gameMeta.name}</span>
                  </div>

                  <h2 className="text-4xl sm:text-6xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-indigo-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.5)]">
                    {pin}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
                    {gameMeta.lobbyDesc}
                  </p>

                  {/* Copy PIN & Link */}
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

                {/* Cột phải: QR Code & Nút Bắt Đầu Trận Đấu */}
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="bg-white p-3 rounded-2xl shadow-xl border-2 border-cyan-400/50 flex flex-col items-center">
                    {roomData?.qrCodeBase64 ? (
                      <img
                        src={`data:image/png;base64,${roomData.qrCodeBase64}`}
                        alt="QR Code"
                        className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                      />
                    ) : (
                      <div className="w-32 h-32 sm:w-36 sm:h-36 flex flex-col items-center justify-center text-slate-700 font-mono text-xs p-2 text-center bg-slate-100 rounded-lg">
                        <QrCode className="w-10 h-10 text-slate-700 mb-1" />
                        <span>Mã PIN Phòng:</span>
                        <span className="font-black text-base text-slate-950">{pin}</span>
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-tight mt-1">
                      Quét mã tham gia
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 items-center sm:items-start">
                    <button
                      type="button"
                      onClick={handleStartMatchAction}
                      className="px-8 py-4 rounded-2xl text-base font-extrabold flex items-center gap-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_35px_rgba(16,185,129,0.5)] active:scale-95 transition-all cursor-pointer animate-pulse"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      <span>
                        {totalJoinedPlayers <= 1
                          ? "BẮT ĐẦU TRẬN ĐẤU (CHƠI 1 MÌNH / TEST)"
                          : gameMeta.isTeamGame
                          ? `BẮT ĐẦU TRẬN ĐẤU (${roster.teamACount} vs ${roster.teamBCount})`
                          : `BẮT ĐẦU TRẬN ĐẤU (${totalJoinedPlayers} NGƯỜI CHƠI)`}
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-semibold bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-xl max-w-md">
                      <Swords className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>
                        {totalJoinedPlayers <= 1
                          ? `Chế độ Chơi Đơn / Test: Bạn có thể bấm Bắt Đầu ngay để trực tiếp trải nghiệm ${gameMeta.name}!`
                          : `Đã có ${totalJoinedPlayers} người chơi sẵn sàng trong sảnh chờ!`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thanh trạng thái Chủ phòng & Bộ đề */}
              <div className="mt-4 px-4 py-3 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>
                    <strong>Chế độ phòng:</strong> {gameMeta.icon} {gameMeta.name} ({gameMeta.subtitle})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {gameMeta.isTeamGame && (
                    <button
                      type="button"
                      onClick={() => handleChooseTeam(teamSide === "TEAM_A" ? "TEAM_B" : "TEAM_A")}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs transition-all shadow cursor-pointer"
                    >
                      ⚔️ Đang ở {teamSide === "TEAM_A" ? "Phe Lam (A)" : "Phe Xích (B)"} • Bấm để đổi phe
                    </button>
                  )}
                  <span className="font-semibold text-cyan-300">
                    Bộ đề: {roomData?.quizTitle || roomData?.title || "Bộ câu hỏi trắc nghiệm"} ({slides.length} câu)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 1.2: MÀN HÌNH CHỌN PHE & CHỜ KHAI CHIẾN DÀNH CHO NGƯỜI CHƠI (!isHost) */}
          {!isHost && !hasJoinedTeam && gameMeta.isTeamGame && (
            <div className="w-full bg-slate-900/95 border-2 border-cyan-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-200">
              <div className="text-5xl mb-3">{gameMeta.icon}</div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                Chọn Chiến Tuyến Tham Gia
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-6">
                {gameMeta.lobbyDesc}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleChooseTeam("TEAM_A")}
                  className="p-5 rounded-2xl bg-gradient-to-b from-cyan-950 via-blue-900 to-slate-900 text-white font-bold border-2 border-cyan-400 shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-3 cursor-pointer"
                >
                  <span className="text-3xl">🛡️</span>
                  <span className="text-cyan-300 font-extrabold text-sm tracking-wide">{gameMeta.teamAName}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                    {roster.teamACount} thành viên
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChooseTeam("TEAM_B")}
                  className="p-5 rounded-2xl bg-gradient-to-b from-rose-950 via-red-900 to-slate-900 text-white font-bold border-2 border-rose-400 shadow-xl shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-3 cursor-pointer"
                >
                  <span className="text-3xl">⚔️</span>
                  <span className="text-rose-300 font-extrabold text-sm tracking-wide">{gameMeta.teamBName}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30">
                    {roster.teamBCount} thành viên
                  </span>
                </button>
              </div>
            </div>
          )}

          {!isHost && (hasJoinedTeam || !gameMeta.isTeamGame) && (
            <div className="w-full bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-6 text-center shadow-2xl backdrop-blur-md flex flex-col items-center gap-4 animate-in fade-in">
              <div className="text-5xl animate-bounce">{gameMeta.icon}</div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs uppercase font-extrabold text-cyan-400 tracking-wider">
                  Sảnh Chờ {gameMeta.name}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Đang Đợi Chủ Phòng Bắt Đầu Trận Đấu...
                </h3>
                <p className="text-xs text-slate-400 max-w-md">
                  Trận đấu sẽ bắt đầu ngay khi Chủ phòng bấm Khởi động. Hãy sẵn sàng trả lời câu hỏi thật nhanh và chính xác!
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                <div className="px-4 py-2 rounded-xl text-xs font-bold border bg-cyan-950/80 text-cyan-300 border-cyan-400/50">
                  Chiến binh: <strong className="text-white">{nickname}</strong> ({teamSide === "TEAM_A" ? gameMeta.teamAName : gameMeta.teamBName})
                </div>

                {gameMeta.isTeamGame && (
                  <button
                    type="button"
                    onClick={() => handleChooseTeam(teamSide === "TEAM_A" ? "TEAM_B" : "TEAM_A")}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đổi Phe</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 1.3: DANH SÁCH NGƯỜI CHƠI TRONG SẢNH CHỜ (ROSTER 2 PHE GIỐNG HẢI TẶC TRI THỨC) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phe A */}
            <div className="bg-slate-900/90 border-2 border-cyan-500/30 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                  <h3 className="font-extrabold text-sm sm:text-base text-cyan-300 uppercase tracking-wider">
                    {gameMeta.teamAName}
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {roster.teamACount} người chơi
                </span>
              </div>

              {roster.teamAPlayers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic">
                  Chưa có thành viên nào ở phe này.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {roster.teamAPlayers.map((p: any, idx: number) => (
                    <div
                      key={p.id || idx}
                      className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-2.5 text-xs font-bold text-cyan-100"
                    >
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-[11px] font-black text-cyan-300">
                        {idx + 1}
                      </span>
                      <span className="truncate">{p.nickname}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phe B */}
            <div className="bg-slate-900/90 border-2 border-rose-500/30 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400 animate-ping" />
                  <h3 className="font-extrabold text-sm sm:text-base text-rose-300 uppercase tracking-wider">
                    {gameMeta.teamBName}
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {roster.teamBCount} người chơi
                </span>
              </div>

              {roster.teamBPlayers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic">
                  {totalJoinedPlayers <= 1
                    ? "Nếu chơi 1 người, Hệ thống AI sẽ tự động đóng vai đối thủ khi vào trận!"
                    : "Chưa có thành viên nào ở phe này."}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {roster.teamBPlayers.map((p: any, idx: number) => (
                    <div
                      key={p.id || idx}
                      className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-2.5 text-xs font-bold text-rose-100"
                    >
                      <span className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-[11px] font-black text-rose-300">
                        {idx + 1}
                      </span>
                      <span className="truncate">{p.nickname}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* =========================================================================
              PHASE 2: TRẬN ĐẤU ĐANG DIỄN RA (CHỈ HIỂN THỊ ĐÚNG 1 GAME CỦA PHÒNG ĐÓ)
             ========================================================================= */}
          {(errorMsg || localBannerMsg) && (
            <div className="max-w-7xl w-full mx-auto px-4 pt-3">
              <div
                className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center justify-between border ${
                  errorMsg
                    ? "bg-rose-900/50 border-rose-500/50 text-rose-200"
                    : "bg-indigo-950/60 border-indigo-500/40 text-indigo-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-amber-400 shrink-0" />
                  <span>{errorMsg || localBannerMsg}</span>
                </div>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  Trả lời đúng câu hỏi bên phải để nhận thêm {actionPointLabel}
                </span>
              </div>
            </div>
          )}

          {/* ── MAIN CONTENT: GAME MAP + QUESTION HUD ── */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cột Trái & Giữa: Bản đồ Game Tương Tác (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4">{renderGameMap()}</div>

            {/* Cột Phải: HUD Câu hỏi Slide & Bảng xếp hạng (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* 1. HUD CÂU HỎI SLIDE (HOẶC GIAI ĐOẠN NƯỚC RÚT CUỐI TRẬN KHI HẾT CÂU HỎI) */}
              {currentSlide ? (
                <div
                  className={`p-5 bg-slate-900/90 rounded-3xl border backdrop-blur-md shadow-2xl flex flex-col gap-4 relative overflow-hidden ${
                    (soloBoard?.signalJamActive || gameState?.board?.signalJamActive) && effectiveRole !== "IMPOSTOR"
                      ? "border-rose-500 animate-pulse ring-2 ring-rose-500/50"
                      : "border-indigo-500/30"
                  }`}
                >
                  {/* Cảnh báo Gây Nhiễu Tín Hiệu 8s (Game 9) */}
                  {(soloBoard?.signalJamActive || gameState?.board?.signalJamActive) && effectiveRole !== "IMPOSTOR" && (
                    <div className="px-3 py-1.5 bg-rose-600/30 border border-rose-500/60 rounded-xl text-[11px] font-black text-rose-200 flex items-center justify-center gap-1.5 animate-bounce">
                      <Zap size={13} className="text-rose-400" />
                      <span>📡 CẢNH BÁO: TÍN HIỆU CÂU HỎI ĐANG BỊ NỘI GIÁN GÂY NHIỄU (8s)!</span>
                    </div>
                  )}

                  {/* Slide Header: Câu số & Timer đếm ngược */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Sparkles size={14} /> Câu hỏi {currentSlideIndex + 1} / {slides.length}
                    </span>

                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                        timeLeft <= 5
                          ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                          : "bg-indigo-500/20 text-indigo-300 border-indigo-400/30"
                      }`}
                    >
                      <Clock size={14} />
                      <span>{timeLeft === 0 ? "Hết giờ (0s)" : `${timeLeft}s`}</span>
                    </div>
                  </div>

                  {/* Nội dung câu hỏi */}
                  <div className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                    {currentSlide.questionText}
                  </div>

                  {/* Danh sách lựa chọn đáp án */}
                  <div className="grid grid-cols-1 gap-2.5 pt-1">
                    {currentSlide.options && currentSlide.options.length > 0 ? (
                      currentSlide.options.map((opt, idx) => {
                        const isSelected = selectedOptionId === opt.id;
                        const showResult = (hasAnsweredCurrentSlide || timeLeft <= 0) && activeAnswerFeedback;
                        const isCorrectOpt =
                          showResult &&
                          (opt.id === activeAnswerFeedback?.correctOptionId || opt.isCorrect);
                        const isWrongSelected = showResult && isSelected && !isCorrectOpt;

                        return (
                          <button
                            key={opt.id || idx}
                            disabled={hasAnsweredCurrentSlide || timeLeft <= 0}
                            onClick={() => handleSelectOption(opt.id)}
                            className={`text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-sm font-bold shadow-md cursor-pointer ${
                              isSelected ? "ring-2 ring-white scale-[1.01]" : ""
                            } ${
                              showResult && isCorrectOpt
                                ? "ring-2 ring-emerald-400 border-emerald-400 brightness-110"
                                : isWrongSelected
                                ? "ring-2 ring-rose-400 border-rose-400 opacity-90"
                                : showResult
                                ? "opacity-60"
                                : ""
                            } bg-gradient-to-r ${OPTION_COLORS[idx % OPTION_COLORS.length]} disabled:cursor-not-allowed`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-xl bg-black/25 flex items-center justify-center text-xs font-black shrink-0">
                                {OPTION_LETTERS[idx]}
                              </span>
                              <span>{opt.content}</span>
                            </div>

                            {showResult && isCorrectOpt && (
                              <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
                            )}
                            {isWrongSelected && (
                              <XCircle size={18} className="text-rose-200 shrink-0" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-xs text-slate-400 italic">Không có tùy chọn câu hỏi.</div>
                    )}
                  </div>

                  {/* Thông báo kết quả trả lời (Đúng / Sai / Hết giờ) & Nút sang câu tiếp */}
                  {(hasAnsweredCurrentSlide || timeLeft <= 0) && (
                    <div
                      className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 border animate-in fade-in ${
                        activeAnswerFeedback?.isCorrect
                          ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                          : activeAnswerFeedback?.isTimeout || timeLeft <= 0
                          ? "bg-amber-950/70 border-amber-500/50 text-amber-300"
                          : "bg-rose-950/70 border-rose-500/50 text-rose-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {activeAnswerFeedback?.isCorrect ? (
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-rose-400 shrink-0" />
                        )}
                        <span>
                          {activeAnswerFeedback?.message
                            ? activeAnswerFeedback.message
                            : activeAnswerFeedback?.isCorrect
                            ? `Chính xác! +${activeAnswerFeedback.actionPointsEarned || 1} ${actionPointLabel}`
                            : timeLeft <= 0
                            ? "⏰ Hết giờ trả lời! Tính là 1 câu Sai (+0 điểm, mất chuỗi Combo)."
                            : "Chưa chính xác! (+0 điểm, mất chuỗi Combo)."}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextSlide}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-white font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                      >
                        <span>
                          {currentSlideIndex < slides.length - 1 ? "Câu tiếp" : "Hoàn thành đề"}
                        </span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ) : isQuizCompleted ? (
                <div className="p-5 bg-slate-900/95 rounded-3xl border-2 border-amber-500/50 backdrop-blur-md shadow-2xl flex flex-col items-center text-center gap-4 animate-in fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-amber-400">
                      🏁 ĐÃ HOÀN THÀNH TOÀN BỘ {slides.length} CÂU HỎI CỦA BỘ ĐỀ!
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-white mt-1">
                      Nước Rút Cuối Trận: Còn {finalSprintLeft} giây!
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Hãy sử dụng nốt <strong>{effectiveActionPoints} {actionPointLabel}</strong> còn lại trên bản đồ bên trái trước khi hệ thống tự động khóa sổ và phân định thắng thua theo quy tắc Tie-breaker của <strong>{gameMeta.name}</strong>!
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={evaluateFinalTieBreaker}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all"
                    >
                      🏆 Chốt Kết Quả & Phân Định Thắng Bại Ngay
                    </button>
                  </div>
                </div>
              ) : null}

              {/* 2. BẢNG XẾP HẠNG THỜI GIAN THỰC (LEADERBOARD) */}
              <div className="p-4 bg-slate-900/80 rounded-3xl border border-slate-800 backdrop-blur-md shadow-xl flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Trophy size={14} /> Bảng Xếp Hạng {gameMeta.name}
                  </span>
                  <span>Điểm của bạn: {totalScore}</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {/* Người chơi hiện tại */}
                  <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <Crown size={14} className="text-amber-400" />
                      <span className="text-indigo-200">{nickname} (Bạn)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {combo > 1 && <span className="text-amber-400 font-black">x{combo}</span>}
                      <span className="text-emerald-400 font-black">{totalScore} đ</span>
                    </div>
                  </div>

                  {/* Danh sách người chơi trong phòng hoặc AI đối thủ */}
                  {roster.players.filter((p: any) => p.nickname !== nickname).length > 0 ? (
                    roster.players
                      .filter((p: any) => p.nickname !== nickname)
                      .map((p: any, i: number) => (
                        <div
                          key={p.id || i}
                          className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs font-bold"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white">
                              {i + 2}
                            </span>
                            <span className="text-slate-200">{p.nickname}</span>
                          </div>
                          <span className="text-emerald-400 font-black">{p.totalScore || 0} đ</span>
                        </div>
                      ))
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <Bot size={14} className="text-rose-400" />
                        <span className="text-slate-300">Chiến Binh AI (Đối Thủ Máy)</span>
                      </div>
                      <span className="text-rose-300 font-black">{botScore} đ</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      {/* ── MODAL BẢNG TỔNG KẾT CHUNG CUỐI TRẬN (ÁP DỤNG CHO CẢ 7 GAME) ── */}
      {effectiveMatchEnded && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="p-6 sm:p-8 bg-slate-900 border-2 border-indigo-500/50 rounded-3xl max-w-4xl w-full flex flex-col items-center gap-5 shadow-2xl animate-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto">
            {/* Vương miện & Tiêu đề Chiến thắng */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-lg">
                <Trophy size={32} />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                BẢNG TỔNG KẾT CHUNG CUỐI TRẬN • {gameMeta.name}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {effectiveMatchEnded.winnerTeam || effectiveMatchEnded.winner || gameMeta.teamAName} CHIẾN THẮNG!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                {effectiveMatchEnded.message ||
                  `Trận đấu đã khép lại! Dưới đây là thống kê Thứ hạng, Chỉ số Học thuật và Đóng góp Chiến thuật của từng thành viên.`}
              </p>
            </div>

            {/* 1. Khối Chỉ Số Học Thuật & Chiến Thuật Của Bạn */}
            {(() => {
              const totalAns = correctCount + wrongCount;
              const acc = totalAns > 0 ? Math.round((correctCount * 1000) / totalAns) / 10 : 100;
              const avgMs =
                responseTimes.length > 0
                  ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
                  : 1850;
              const bestCombo = Math.max(maxCombo, combo);

              const getTacticalSummary = (count: number) => {
                switch (activeGameType) {
                  case "HEX_CONQUEST":
                    return {
                      label: "Số ô lục giác đã chiếm",
                      val: `${soloBoard?.teamACells || Math.max(3, count)} ô lãnh thổ`,
                    };
                  case "TOWER_DEFENSE":
                    return {
                      label: "Vàng kiếm được & Tháp/Quái",
                      val: `${correctCount * 125} Vàng • ${count} Tháp/Quái đã thả`,
                    };
                  case "DRAGON_BOAT":
                    return {
                      label: "Số nhịp chèo đóng góp",
                      val: `${count} nhịp (${soloBoard?.boatA?.distance || count * 15}m)`,
                    };
                  case "RUNAWAY_TRAIN":
                    return {
                      label: "Số mảnh đường ray đặt đúng",
                      val: `${(soloBoard?.placedTracks?.length || 2) + count} mảnh ray`,
                    };
                  case "ARTILLERY_DUEL":
                    return {
                      label: "Phát bắn trúng đích & Sát thương",
                      val: `${count} phát bắn • ${Math.max(0, 1000 - (soloBoard?.fortressHpB ?? 1000))} ST`,
                    };
                  case "EDU_AMONG_US":
                    return {
                      label:
                        effectiveRole === "IMPOSTOR"
                          ? "Số lần phá hoại thành công"
                          : "Tiến độ sửa chữa trạm",
                      val:
                        effectiveRole === "IMPOSTOR"
                          ? `${count} lần phá hoại (Nội gián)`
                          : `${soloBoard?.stationProgress || correctCount * 12}% năng lượng (Nhà KH)`,
                    };
                  case "QUIZ_BOMBERMAN":
                    return {
                      label: "Số gạch đã phá & Mạng hạ gục",
                      val: `${count} quả bom • ${5 - (soloBoard?.players?.[1]?.hp ?? 5)} lần nổ trúng`,
                    };
                  default:
                    return { label: "Đóng góp chiến thuật", val: `${count} lượt` };
                }
              };

              const myTactical = getTacticalSummary(tacticalCount);
              const serverRows: any[] =
                effectiveMatchEnded?.leaderboard || effectiveMatchEnded?.Leaderboard || [];

              const displayRows =
                serverRows.length > 0
                  ? serverRows
                  : [
                      {
                        rank: 1,
                        teamRank: 1,
                        titleBadge: "Quán Quân Toàn Phòng (MVP)",
                        nickname: `${nickname} (Bạn)`,
                        teamSide: teamSide || "TEAM_A",
                        totalScore,
                        correctCount,
                        wrongCount,
                        accuracyPercent: acc,
                        avgResponseTimeMs: avgMs,
                        maxCombo: bestCombo,
                        tacticalContributionLabel: myTactical.label,
                        tacticalContributionValue: myTactical.val,
                      },
                      {
                        rank: 2,
                        teamRank: 1,
                        titleBadge: "Á Quân Toàn Phòng",
                        nickname: "Chiến Binh AI (Đối Thủ)",
                        teamSide: "TEAM_B",
                        totalScore: botScore,
                        correctCount: Math.max(1, Math.floor(botScore / 100)),
                        wrongCount: 1,
                        accuracyPercent: 75,
                        avgResponseTimeMs: 3200,
                        maxCombo: 2,
                        tacticalContributionLabel: myTactical.label,
                        tacticalContributionValue: "Đối thủ AI",
                      },
                    ];

              return (
                <>
                  {/* Thẻ thống kê cá nhân nổi bật */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 w-full">
                    <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Tổng Điểm</div>
                      <div className="text-lg font-black text-emerald-400">{totalScore}</div>
                    </div>
                    <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Đúng / Sai</div>
                      <div className="text-lg font-black text-cyan-300">
                        {correctCount} Đ / {wrongCount} S
                      </div>
                    </div>
                    <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Tỷ Lệ Chính Xác</div>
                      <div className="text-lg font-black text-indigo-300">{acc}%</div>
                    </div>
                    <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Phản Hồi TB</div>
                      <div className="text-lg font-black text-amber-300">
                        {(avgMs / 1000).toFixed(1)}s ({avgMs}ms)
                      </div>
                    </div>
                    <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700 text-center col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Max Combo</div>
                      <div className="text-lg font-black text-rose-400">x{bestCombo}</div>
                    </div>
                  </div>

                  {/* Bảng Xếp Hạng Chi Tiết Toàn Phòng (Học Thuật + Đóng Góp Chiến Thuật) */}
                  <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase text-[10px]">
                          <th className="py-2.5 px-3">Hạng & Danh Hiệu</th>
                          <th className="py-2.5 px-3">Người Chơi</th>
                          <th className="py-2.5 px-3 text-center">Đúng/Sai (%)</th>
                          <th className="py-2.5 px-3 text-center">Phản Hồi TB</th>
                          <th className="py-2.5 px-3 text-center">Max Combo</th>
                          <th className="py-2.5 px-3">Đóng Góp Chiến Thuật ({gameMeta.name})</th>
                          <th className="py-2.5 px-3 text-right">Tổng Điểm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {displayRows.map((row: any, idx: number) => (
                          <tr
                            key={row.playerId || idx}
                            className={`${
                              idx === 0
                                ? "bg-amber-500/10 text-amber-100"
                                : "hover:bg-slate-900/50 text-slate-200"
                            }`}
                          >
                            <td className="py-2.5 px-3 font-bold">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    row.rank === 1
                                      ? "bg-amber-400 text-slate-950"
                                      : row.rank === 2
                                      ? "bg-slate-300 text-slate-950"
                                      : row.rank === 3
                                      ? "bg-amber-700 text-white"
                                      : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {row.rank || idx + 1}
                                </span>
                                <span className="text-[11px] text-amber-300 font-extrabold">
                                  {row.titleBadge || `Top ${idx + 1}`}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-bold">
                              <div>{row.nickname}</div>
                              <div className="text-[10px] text-slate-400">
                                {row.teamSide === "TEAM_B" ? gameMeta.teamBName : gameMeta.teamAName} (Hạng đội #{row.teamRank || 1})
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold">
                              <span className="text-emerald-400">{row.correctCount}Đ</span> /{" "}
                              <span className="text-rose-400">{row.wrongCount}S</span>{" "}
                              <span className="text-slate-400">({row.accuracyPercent}%)</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-cyan-300">
                              {row.avgResponseTimeMs} ms
                            </td>
                            <td className="py-2.5 px-3 text-center font-black text-amber-400">
                              x{row.maxCombo}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-[10px] text-slate-400">
                                {row.tacticalContributionLabel}
                              </div>
                              <div className="font-bold text-indigo-300">
                                {row.tacticalContributionValue}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-400 text-sm">
                              {row.totalScore} đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}

            <div className="flex items-center gap-3 w-full pt-1">
              <button
                type="button"
                onClick={handleResetMatchAction}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-sm border border-slate-700 transition-all cursor-pointer"
              >
                Chơi Lại Ván Mới
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Về Trang Chủ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
