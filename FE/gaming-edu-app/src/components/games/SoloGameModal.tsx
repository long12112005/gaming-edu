"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Trophy, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  ArrowRight, 
  RotateCcw, 
  X, 
  ShieldCheck, 
  Medal,
  Award,
  Gamepad2,
  Edit3,
  Send,
  Check,
  HelpCircle,
  Puzzle
} from "lucide-react";
import Image from "next/image";

export interface MatchingPairItem {
  id: string;
  left: string;
  right: string;
}

export interface SoloQuestion {
  id?: string;
  type?: "QUIZ" | "FILL_IN_BLANK" | "MATCHING" | "WORD_CLOUD" | string;
  question: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  timeLimit?: number;
  points?: number;
  blankKeywords?: string[];
  matchingPairs?: MatchingPairItem[];
}

export interface GameItem {
  id: string;
  title: string;
  category: string;
  badgeColor: string;
  plays: string;
  totalQuestions: number;
  image: string;
  description?: string;
  questions: SoloQuestion[];
  leaderboard: {
    rank: number;
    nickname: string;
    score: number;
    timeSeconds: number;
    date: string;
  }[];
}

interface SoloGameModalProps {
  game: GameItem | null;
  isOpen: boolean;
  onClose: () => void;
  userNickname?: string;
}

function normalizeStr(text: string): string {
  return (text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, " ");
}

export default function SoloGameModal({
  game,
  isOpen,
  onClose,
  userNickname = "Người Chơi Tri Thức",
}: SoloGameModalProps) {
  // Game states: 'intro' | 'playing' | 'feedback' | 'finished'
  const [gameState, setGameState] = useState<"intro" | "playing" | "feedback" | "finished">("intro");
  const [playerName, setPlayerName] = useState(userNickname);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [currentLeaderboard, setCurrentLeaderboard] = useState<any[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);

  // States cho các dạng câu hỏi
  // 1. QUIZ
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  // 2. FILL_IN_BLANK
  const [blankInput, setBlankInput] = useState("");
  const [blankFeedback, setBlankFeedback] = useState<{ isCorrect: boolean; expected: string } | null>(null);

  // 3. MATCHING
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({}); // leftId -> rightContent
  const [shuffledRightList, setShuffledRightList] = useState<string[]>([]);
  const [matchingFeedback, setMatchingFeedback] = useState<{
    isCorrect: boolean;
    correctPairsCount: number;
    totalPairs: number;
  } | null>(null);

  // Khởi tạo lại khi mở modal
  useEffect(() => {
    if (isOpen && game) {
      setGameState("intro");
      setCurrentIndex(0);
      setScore(0);
      setStreak(0);
      setCorrectCount(0);
      setTotalElapsedTime(0);
      setPlayerRank(null);
      setPlayerName(userNickname || "Người Chơi");

      // Reset question specific states
      resetQuestionStates(0);

      // Lấy bảng xếp hạng lưu trong localStorage hoặc mặc định
      const storageKey = `leaderboard_game_${game.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setCurrentLeaderboard(JSON.parse(saved));
        } catch {
          setCurrentLeaderboard(game.leaderboard);
        }
      } else {
        setCurrentLeaderboard(game.leaderboard);
      }
    }
  }, [isOpen, game, userNickname]);

  const currentQ: SoloQuestion = useMemo(() => {
    if (!game || !game.questions || game.questions.length === 0) {
      return {
        question: "Chưa có câu hỏi",
        options: [],
        correctIndex: 0,
      };
    }
    return game.questions[currentIndex] || game.questions[0];
  }, [game, currentIndex]);

  const questionType = useMemo(() => {
    const rawType = (currentQ.type || "").toUpperCase();
    if (rawType.includes("BLANK")) return "FILL_IN_BLANK";
    if (rawType.includes("MATCH")) return "MATCHING";
    return "QUIZ";
  }, [currentQ]);

  const resetQuestionStates = (qIdx: number) => {
    setSelectedOption(null);
    setBlankInput("");
    setBlankFeedback(null);
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairs({});
    setMatchingFeedback(null);

    const q = game?.questions[qIdx];
    if (q) {
      setTimeLeft(q.timeLimit || 20);
      if (q.matchingPairs && q.matchingPairs.length > 0) {
        const rights = [...q.matchingPairs.map((p) => p.right)].sort(() => Math.random() - 0.5);
        setShuffledRightList(rights);
      } else {
        setShuffledRightList([]);
      }
    } else {
      setTimeLeft(20);
      setShuffledRightList([]);
    }
  };

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === "playing" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
        setTotalElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const handleTimeout = () => {
    if (gameState !== "playing") return;
    if (questionType === "FILL_IN_BLANK") {
      submitBlankAnswer();
    } else if (questionType === "MATCHING") {
      submitMatchingAnswer();
    } else {
      handleAnswerQuiz(-1);
    }
  };

  if (!isOpen || !game) return null;

  const handleStartGame = () => {
    if (!playerName.trim()) setPlayerName("Người Chơi Ẩn Danh");
    setGameState("playing");
    resetQuestionStates(0);
  };

  // ── XỬ LÝ TRẢ LỜI CÂU HỎI TRẮC NGHIỆM (QUIZ) ──
  const handleAnswerQuiz = (optionIdx: number) => {
    if (gameState !== "playing") return;
    setSelectedOption(optionIdx);
    setGameState("feedback");

    const isCorrect = optionIdx === currentQ.correctIndex;
    let earnedPoints = 0;

    if (isCorrect) {
      const timeBonus = Math.round(timeLeft * 35);
      const streakMultiplier = streak >= 3 ? 1.5 : streak >= 1 ? 1.2 : 1.0;
      earnedPoints = Math.round(((currentQ.points || 1000) + timeBonus) * streakMultiplier);
      setScore((prev) => prev + earnedPoints);
      setStreak((prev) => prev + 1);
      setCorrectCount((prev) => prev + 1);
    } else {
      setStreak(0);
    }

    advanceNextQuestion(score + earnedPoints);
  };

  // ── XỬ LÝ TRẢ LỜI ĐIỀN KHUYẾT (FILL_IN_BLANK) ──
  const submitBlankAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (gameState !== "playing") return;

    setGameState("feedback");

    const trimmedInput = blankInput.trim();
    const normInput = normalizeStr(trimmedInput);

    const validKeywords = (currentQ.blankKeywords || []).map(normalizeStr);
    if (currentQ.options && currentQ.options.length > 0) {
      validKeywords.push(...currentQ.options.map(normalizeStr));
    }

    const isCorrect =
      normInput.length > 0 &&
      validKeywords.some((kw) => kw.length > 0 && (kw === normInput || kw.includes(normInput) || normInput.includes(kw)));

    const expectedAnswer = currentQ.blankKeywords?.[0] || currentQ.options?.[0] || "Đáp án chính xác";
    setBlankFeedback({ isCorrect, expected: expectedAnswer });

    let earnedPoints = 0;
    if (isCorrect) {
      const timeBonus = Math.round(timeLeft * 35);
      const streakMultiplier = streak >= 3 ? 1.5 : streak >= 1 ? 1.2 : 1.0;
      earnedPoints = Math.round(((currentQ.points || 1000) + timeBonus) * streakMultiplier);
      setScore((prev) => prev + earnedPoints);
      setStreak((prev) => prev + 1);
      setCorrectCount((prev) => prev + 1);
    } else {
      setStreak(0);
    }

    advanceNextQuestion(score + earnedPoints);
  };

  // ── XỬ LÝ GHÉP NỐI CẶP (MATCHING) ──
  const handleSelectMatching = (side: "left" | "right", value: string) => {
    if (gameState !== "playing") return;

    if (side === "left") {
      // Nếu ô bên trái đã ghép rồi, bấm lại để gỡ
      if (matchedPairs[value]) {
        setMatchedPairs((prev) => {
          const next = { ...prev };
          delete next[value];
          return next;
        });
        return;
      }

      if (selectedRight) {
        // Đã chọn bên phải trước, giờ chọn bên trái -> Ghép!
        setMatchedPairs((prev) => ({ ...prev, [value]: selectedRight }));
        setSelectedLeft(null);
        setSelectedRight(null);
      } else {
        setSelectedLeft(selectedLeft === value ? null : value);
      }
    } else {
      // Ô bên phải: kiểm tra xem giá trị này đã được ghép chưa
      const pairedLeftKey = Object.keys(matchedPairs).find((k) => matchedPairs[k] === value);
      if (pairedLeftKey) {
        setMatchedPairs((prev) => {
          const next = { ...prev };
          delete next[pairedLeftKey];
          return next;
        });
        return;
      }

      if (selectedLeft) {
        // Đã chọn bên trái trước, giờ chọn bên phải -> Ghép!
        setMatchedPairs((prev) => ({ ...prev, [selectedLeft]: value }));
        setSelectedLeft(null);
        setSelectedRight(null);
      } else {
        setSelectedRight(selectedRight === value ? null : value);
      }
    }
  };

  const submitMatchingAnswer = () => {
    if (gameState !== "playing") return;
    setGameState("feedback");

    const pairs = currentQ.matchingPairs || [];
    let correctPairsCount = 0;

    pairs.forEach((p) => {
      const userSelectedRight = matchedPairs[p.id];
      if (userSelectedRight && normalizeStr(userSelectedRight) === normalizeStr(p.right)) {
        correctPairsCount++;
      }
    });

    const totalPairs = pairs.length;
    const isFullyCorrect = totalPairs > 0 && correctPairsCount === totalPairs;
    const ratio = totalPairs > 0 ? correctPairsCount / totalPairs : 0;

    setMatchingFeedback({
      isCorrect: isFullyCorrect,
      correctPairsCount,
      totalPairs,
    });

    let earnedPoints = 0;
    if (ratio > 0) {
      const timeBonus = isFullyCorrect ? Math.round(timeLeft * 35) : 0;
      earnedPoints = Math.round((currentQ.points || 1000) * ratio + timeBonus);
      setScore((prev) => prev + earnedPoints);
      if (isFullyCorrect) {
        setStreak((prev) => prev + 1);
        setCorrectCount((prev) => prev + 1);
      } else if (ratio >= 0.5) {
        setCorrectCount((prev) => prev + 0.5);
      }
    } else {
      setStreak(0);
    }

    advanceNextQuestion(score + earnedPoints, 2400);
  };

  // Chuyển sang câu hỏi kế tiếp hoặc kết thúc
  const advanceNextQuestion = (finalScore: number, delayMs = 1900) => {
    setTimeout(() => {
      if (currentIndex + 1 < (game?.questions.length || 0)) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        resetQuestionStates(nextIdx);
        setGameState("playing");
      } else {
        finishGame(finalScore);
      }
    }, delayMs);
  };

  const finishGame = (finalScore: number) => {
    setGameState("finished");
    const newEntry = {
      rank: 0,
      nickname: playerName.trim() || "Người Chơi Tri Thức",
      score: finalScore,
      timeSeconds: totalElapsedTime + (20 - timeLeft),
      date: "Vừa xong",
    };

    const updated = [...currentLeaderboard, newEntry]
      .sort((a, b) => b.score - a.score || a.timeSeconds - b.timeSeconds)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    setCurrentLeaderboard(updated);
    const foundRank = updated.findIndex(
      (it) => it.nickname === newEntry.nickname && it.score === newEntry.score
    );
    setPlayerRank(foundRank !== -1 ? foundRank + 1 : updated.length);

    // Lưu vào localStorage
    localStorage.setItem(`leaderboard_game_${game.id}`, JSON.stringify(updated.slice(0, 15)));
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setTotalElapsedTime(0);
    resetQuestionStates(0);
    setGameState("playing");
  };

  // Color palette cho các cặp ghép nối để người chơi dễ phân biệt
  const pairColors = [
    { bg: "bg-emerald-500", border: "border-emerald-600", text: "text-white" },
    { bg: "bg-sky-500", border: "border-sky-600", text: "text-white" },
    { bg: "bg-amber-500", border: "border-amber-600", text: "text-white" },
    { bg: "bg-purple-500", border: "border-purple-600", text: "text-white" },
    { bg: "bg-rose-500", border: "border-rose-600", text: "text-white" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden relative flex flex-col max-h-[92vh]">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          title="Đóng"
        >
          <X size={20} />
        </button>

        {/* ── MÀN HÌNH 1: INTRO (CHÀO MỪNG & NHẬP TÊN) ── */}
        {gameState === "intro" && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 flex flex-col items-center text-center">
              {/* Badge thể loại */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3">
                <Sparkles size={13} className="text-indigo-600" />
                <span>{game.category || "Trò Chơi Tri Thức"}</span>
              </div>

              {/* Tiêu đề trò chơi */}
              <h2 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 leading-tight mb-2 max-w-lg">
                {game.title}
              </h2>

              <p className="text-slate-500 text-xs sm:text-sm max-w-md mb-5 leading-relaxed">
                {game.description || "Hãy trả lời các câu hỏi nhanh nhất và chính xác nhất để giành vị trí quán quân!"}
              </p>

              {/* Thẻ thông số */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-6">
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Số Câu Hỏi</span>
                  <span className="font-heading font-black text-base text-slate-900">{game.questions.length} câu</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lượt Chơi</span>
                  <span className="font-heading font-black text-base text-amber-600">{game.plays}</span>
                </div>
              </div>

              <div className="w-full max-w-md text-left">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Biệt danh thi đấu của bạn
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Nhập tên nhân vật hoặc nickname..."
                  maxLength={25}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Nút bắt đầu cố định trong footer */}
            <div className="p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md shrink-0 flex justify-center w-full">
              <div className="w-full max-w-md">
                {game.questions.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold text-center">
                    Bộ đề này hiện tại chưa có câu hỏi nào.
                  </div>
                ) : (
                  <button
                    onClick={handleStartGame}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-heading font-black text-sm shadow-lg shadow-indigo-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Gamepad2 size={18} />
                    <span>Bắt Đầu Chơi & Tính Điểm Ngay</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MÀN HÌNH 2 & 3: ĐANG CHƠI HOẶC HIỂN THỊ PHẢN HỒI (PLAYING / FEEDBACK) ── */}
        {(gameState === "playing" || gameState === "feedback") && (
          <div className="p-5 sm:p-7 flex flex-col h-full flex-1 overflow-y-auto">
            {/* Header thanh tiến độ và điểm số */}
            <div className="flex items-center justify-between gap-4 mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-xl bg-purple-100 text-purple-700 text-xs font-black">
                  Câu {currentIndex + 1} / {game.questions.length}
                </span>

                {/* Badge Dạng Câu Hỏi */}
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                  questionType === "FILL_IN_BLANK"
                    ? "bg-teal-100 text-teal-800"
                    : questionType === "MATCHING"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-indigo-100 text-indigo-800"
                }`}>
                  {questionType === "FILL_IN_BLANK" && <Edit3 size={13} />}
                  {questionType === "MATCHING" && <Puzzle size={13} />}
                  {questionType === "QUIZ" && <CheckCircle2 size={13} />}
                  <span>
                    {questionType === "FILL_IN_BLANK"
                      ? "Điền Khuyết"
                      : questionType === "MATCHING"
                      ? "Ghép Cặp"
                      : "Trắc Nghiệm"}
                  </span>
                </span>

                {streak >= 2 && (
                  <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-700 text-xs font-black flex items-center gap-1 animate-bounce">
                    <Flame size={14} className="fill-amber-500 text-amber-500" />
                    x{streak}
                  </span>
                )}
              </div>

              {/* Timer & Score */}
              <div className="flex items-center gap-2.5">
                <div className={`flex items-center gap-1 px-3 py-1 rounded-xl font-mono font-black text-xs ${
                  timeLeft <= 5 ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-slate-100 text-slate-700"
                }`}>
                  <Clock size={13} />
                  <span>{timeLeft}s</span>
                </div>
                <div className="px-3 py-1 rounded-xl bg-amber-500 text-white font-mono font-black text-xs shadow-xs">
                  {score.toLocaleString()} đ
                </div>
              </div>
            </div>

            {/* Time progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeLeft <= 5 ? "bg-rose-500" : "bg-gradient-to-r from-indigo-500 to-purple-600"
                }`}
                style={{ width: `${(timeLeft / (currentQ.timeLimit || 20)) * 100}%` }}
              />
            </div>

            {/* Nội dung câu hỏi */}
            <div className="mb-5 text-center px-2">
              <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 leading-snug">
                {currentQ.question}
              </h3>
            </div>

            {/* ══════════════════════════════════════════════════════════
                DẠNG 1: TRẮC NGHIỆM (QUIZ / 4 LỰA CHỌN)
            ══════════════════════════════════════════════════════════ */}
            {questionType === "QUIZ" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {(currentQ.options && currentQ.options.length > 0 ? currentQ.options : ["Có", "Không"]).map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentQ.correctIndex;
                  const showResult = gameState === "feedback";

                  let btnStyle = "bg-slate-50 border-2 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300 text-slate-800";
                  if (showResult) {
                    if (isCorrect) {
                      btnStyle = "bg-emerald-500 border-2 border-emerald-600 text-white shadow-lg shadow-emerald-500/25";
                    } else if (isSelected && !isCorrect) {
                      btnStyle = "bg-rose-500 border-2 border-rose-600 text-white shadow-lg shadow-rose-500/25";
                    } else {
                      btnStyle = "bg-slate-100 border-2 border-slate-200 text-slate-400 opacity-60";
                    }
                  }

                  const optionColors = [
                    "bg-rose-500 text-white",
                    "bg-blue-500 text-white",
                    "bg-amber-500 text-white",
                    "bg-emerald-500 text-white"
                  ];

                  return (
                    <button
                      key={idx}
                      disabled={gameState === "feedback"}
                      onClick={() => handleAnswerQuiz(idx)}
                      className={`p-4 rounded-2xl font-bold text-sm text-left transition-all flex items-center justify-between gap-3 active:scale-[0.98] ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                          showResult && isCorrect ? "bg-white text-emerald-600" : optionColors[idx % 4]
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="break-words">{opt}</span>
                      </div>

                      {showResult && isCorrect && <CheckCircle2 size={18} className="text-white shrink-0" />}
                      {showResult && isSelected && !isCorrect && <XCircle size={18} className="text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                DẠNG 2: ĐIỀN KHUYẾT (FILL_IN_BLANK)
            ══════════════════════════════════════════════════════════ */}
            {questionType === "FILL_IN_BLANK" && (
              <div className="max-w-xl mx-auto w-full my-auto space-y-4">
                <form onSubmit={submitBlankAnswer} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      disabled={gameState === "feedback"}
                      value={blankInput}
                      onChange={(e) => setBlankInput(e.target.value)}
                      placeholder="Gõ từ hoặc cụm từ điền khuyết vào đây..."
                      className="w-full px-5 py-4 text-center rounded-2xl bg-teal-50/50 border-2 border-teal-300 font-black text-lg text-teal-950 placeholder-teal-400 outline-none focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all shadow-sm"
                    />
                  </div>

                  {gameState === "playing" && (
                    <button
                      type="submit"
                      disabled={!blankInput.trim()}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-heading font-black text-sm shadow-md shadow-teal-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Send size={16} />
                      <span>Gửi Câu Trả Lời</span>
                    </button>
                  )}
                </form>

                {/* Phản hồi kết quả sau khi nộp */}
                {gameState === "feedback" && blankFeedback && (
                  <div className={`p-4 rounded-2xl border-2 animate-in fade-in flex items-start gap-3 ${
                    blankFeedback.isCorrect
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-rose-50 border-rose-300 text-rose-900"
                  }`}>
                    {blankFeedback.isCorrect ? (
                      <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={22} className="text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="text-xs">
                      <div className="font-black text-sm">
                        {blankFeedback.isCorrect ? "Chính xác tuyệt vời! 🎯" : "Chưa chính xác!"}
                      </div>
                      {!blankFeedback.isCorrect && (
                        <div className="mt-1 font-bold">
                          Đáp án đúng: <span className="underline font-black">{blankFeedback.expected}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                DẠNG 3: GHÉP NỐI CẶP (MATCHING)
            ══════════════════════════════════════════════════════════ */}
            {questionType === "MATCHING" && (
              <div className="space-y-4 my-auto">
                <div className="text-center text-xs font-bold text-slate-500 bg-slate-100 py-1.5 px-3 rounded-full mx-auto w-fit">
                  👉 Chọn 1 thẻ vế trái rồi chọn 1 thẻ vế phải để ghép đôi. Bấm lại vào thẻ đã ghép để hủy.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cột Vế Trái */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block text-center">
                      Cột Trái
                    </span>
                    {(currentQ.matchingPairs || []).map((p, idx) => {
                      const isPaired = !!matchedPairs[p.id];
                      const isSelected = selectedLeft === p.id;
                      const pairIdx = Object.keys(matchedPairs).indexOf(p.id);
                      const color = pairColors[pairIdx % pairColors.length] || pairColors[0];

                      let cardStyle = "bg-white border-2 border-slate-200 text-slate-800 hover:border-indigo-400";
                      if (gameState === "feedback" && matchingFeedback) {
                        const isCorrectPair = normalizeStr(matchedPairs[p.id] || "") === normalizeStr(p.right);
                        cardStyle = isCorrectPair
                          ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-950"
                          : "bg-rose-50 border-2 border-rose-400 text-rose-950";
                      } else if (isPaired) {
                        cardStyle = `${color.bg} ${color.border} ${color.text} shadow-sm`;
                      } else if (isSelected) {
                        cardStyle = "bg-indigo-50 border-2 border-indigo-600 text-indigo-950 ring-2 ring-indigo-200";
                      }

                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={gameState === "feedback"}
                          onClick={() => handleSelectMatching("left", p.id)}
                          className={`w-full p-3.5 rounded-2xl font-bold text-xs sm:text-sm text-left transition-all flex items-center justify-between gap-2 shadow-xs ${cardStyle}`}
                        >
                          <span className="truncate">{p.left}</span>
                          {isPaired && <Check size={16} className="shrink-0 stroke-[3px]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Cột Vế Phải (Đã xáo trộn) */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block text-center">
                      Cột Phải
                    </span>
                    {shuffledRightList.map((rightText, idx) => {
                      const pairedLeftKey = Object.keys(matchedPairs).find((k) => matchedPairs[k] === rightText);
                      const isPaired = !!pairedLeftKey;
                      const isSelected = selectedRight === rightText;
                      const pairIdx = pairedLeftKey ? Object.keys(matchedPairs).indexOf(pairedLeftKey) : -1;
                      const color = pairColors[pairIdx % pairColors.length] || pairColors[0];

                      let cardStyle = "bg-white border-2 border-slate-200 text-slate-800 hover:border-amber-400";
                      if (gameState === "feedback" && matchingFeedback) {
                        const targetPair = currentQ.matchingPairs?.find((p) => p.right === rightText);
                        const isCorrectPair = targetPair && matchedPairs[targetPair.id] === rightText;
                        cardStyle = isCorrectPair
                          ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-950"
                          : "bg-rose-50 border-2 border-rose-400 text-rose-950";
                      } else if (isPaired) {
                        cardStyle = `${color.bg} ${color.border} ${color.text} shadow-sm`;
                      } else if (isSelected) {
                        cardStyle = "bg-amber-50 border-2 border-amber-500 text-amber-950 ring-2 ring-amber-200";
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={gameState === "feedback"}
                          onClick={() => handleSelectMatching("right", rightText)}
                          className={`w-full p-3.5 rounded-2xl font-bold text-xs sm:text-sm text-left transition-all flex items-center justify-between gap-2 shadow-xs ${cardStyle}`}
                        >
                          <span className="truncate">{rightText}</span>
                          {isPaired && <Check size={16} className="shrink-0 stroke-[3px]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nút xác nhận ghép cặp */}
                {gameState === "playing" && (
                  <button
                    type="button"
                    onClick={submitMatchingAnswer}
                    disabled={Object.keys(matchedPairs).length === 0}
                    className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-heading font-black text-sm shadow-md shadow-amber-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check size={17} strokeWidth={3} />
                    <span>
                      Xác Nhận Cặp Ghép ({Object.keys(matchedPairs).length} / {currentQ.matchingPairs?.length || 0})
                    </span>
                  </button>
                )}

                {/* Phản hồi sau khi chấm điểm matching */}
                {gameState === "feedback" && matchingFeedback && (
                  <div className={`p-4 rounded-2xl border-2 animate-in fade-in flex items-center justify-between gap-3 ${
                    matchingFeedback.isCorrect
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-amber-50 border-amber-300 text-amber-900"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {matchingFeedback.isCorrect ? (
                        <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                      ) : (
                        <HelpCircle size={22} className="text-amber-600 shrink-0" />
                      )}
                      <span className="font-black text-xs sm:text-sm">
                        Đúng {matchingFeedback.correctPairsCount} / {matchingFeedback.totalPairs} cặp ghép
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Giải thích câu hỏi nếu có */}
            {gameState === "feedback" && currentQ.explanation && (
              <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 animate-in fade-in">
                💡 <span className="font-bold">Giải thích:</span> {currentQ.explanation}
              </div>
            )}
          </div>
        )}

        {/* ── MÀN HÌNH 4: TỔNG KẾT & BẢNG XẾP HẠNG (FINISHED) ── */}
        {gameState === "finished" && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-md mb-2 shrink-0 animate-bounce">
                <Trophy size={28} />
              </div>

              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 uppercase tracking-wider mb-1">
                Hoàn Thành Xuất Sắc
              </span>
              <h2 className="font-heading font-black text-xl sm:text-2xl text-slate-900 mb-1">
                {playerName}
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Bạn vừa hoàn thành thử thách trò chơi <strong className="text-slate-800">{game.title}</strong>
              </p>

              {/* Chỉ số tổng kết */}
              <div className="grid grid-cols-3 gap-2.5 w-full max-w-md mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-md shadow-amber-500/20">
                  <span className="text-[10px] font-bold text-amber-100 uppercase tracking-wider block">Tổng Điểm</span>
                  <span className="font-heading font-black text-xl sm:text-2xl">{score.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Độ Chính Xác</span>
                  <span className="font-heading font-black text-lg text-emerald-600">
                    {game.questions.length > 0 ? Math.round((correctCount / game.questions.length) * 100) : 0}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">{correctCount}/{game.questions.length} câu</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Thời Gian</span>
                  <span className="font-heading font-black text-lg text-indigo-600">{totalElapsedTime}s</span>
                  <span className="text-[10px] text-slate-400 block">Hoàn thành</span>
                </div>
              </div>

              {/* Banner vị trí xếp hạng */}
              {playerRank && (
                <div className="w-full max-w-md p-3 mb-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-indigo-600" />
                    <span>Xếp hạng của bạn:</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-black shadow-xs">
                    Hạng #{playerRank} Toàn Trò Chơi
                  </span>
                </div>
              )}

              {/* BẢNG XẾP HẠNG TOP TRÒ CHƠI NÀY */}
              <div className="w-full max-w-md text-left">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h4 className="font-heading font-black text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Medal size={15} className="text-amber-500" /> Bảng Xếp Hạng Trò Chơi
                  </h4>
                  <span className="text-[11px] text-slate-400 font-semibold">Cập nhật tức thì</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
                  {currentLeaderboard.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Chưa có ai trên bảng xếp hạng. Bạn là người đầu tiên!
                    </div>
                  ) : (
                    currentLeaderboard.slice(0, 5).map((entry, idx) => {
                      const isCurrent = entry.nickname === playerName && entry.score === score;
                      return (
                        <div
                          key={idx}
                          className={`px-4 py-2 flex items-center justify-between text-xs transition-colors ${
                            isCurrent ? "bg-amber-100/70 font-bold border-l-4 border-amber-500" : "hover:bg-slate-100/50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                              entry.rank === 1 ? "bg-amber-400 text-slate-900" :
                              entry.rank === 2 ? "bg-slate-300 text-slate-900" :
                              entry.rank === 3 ? "bg-amber-700 text-white" : "bg-slate-200 text-slate-600"
                            }`}>
                              {entry.rank}
                            </span>
                            <span className="text-slate-800 font-semibold truncate max-w-[150px]">
                              {entry.nickname} {isCurrent && "(Bạn)"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-slate-400 text-[11px]">{entry.timeSeconds}s</span>
                            <span className="font-black text-slate-900">{entry.score.toLocaleString()} đ</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md shrink-0 flex justify-center w-full">
              <div className="flex items-center gap-3 w-full max-w-md">
                <button
                  onClick={handleRestart}
                  className="flex-1 py-3 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>Chơi Lại</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Khám Phá Trò Khác</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
