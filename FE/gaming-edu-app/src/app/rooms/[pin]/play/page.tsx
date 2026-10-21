"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  Clock,
  Check,
  X,
  Send,
  Loader2,
  Sparkles,
  Flame,
  MessageCircle,
  ThumbsUp,
  Link2,
  Layers,
  HelpCircle,
  Trophy,
} from "lucide-react";
import { useGameHub } from "@/hooks/useGameHub";

export default function PlayerGamepadPage({ params }: { params: Promise<{ pin: string }> }) {
  const unwrappedParams = use(params);
  const pin = unwrappedParams.pin;
  const router = useRouter();

  const [nickname, setNickname] = useState("Thí Sinh Pro");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);
  const [streakCount, setStreakCount] = useState(3);
  const [totalScore, setTotalScore] = useState(3850);

  // States cho các dạng câu hỏi
  const [blankInput, setBlankInput] = useState("");
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [pairedMatches, setPairedMatches] = useState<Record<string, string>>({});

  // Q&A drawer
  const [showQA, setShowQA] = useState(false);
  const [qaInput, setQaInput] = useState("");
  const [qaList, setQaList] = useState([
    { id: "q1", author: "Bảo Ngọc", content: "Thầy ơi, câu này trường hợp ngoại lệ với nhiệt độ cao thì áp dụng công thức nào ạ?", upvotes: 4 },
  ]);

  // Hub hooks
  const { currentSlide, slideTimeLeft, submitAnswer } = useGameHub();

  useEffect(() => {
    const savedName = Cookies.get("guest_nickname") || "Bạn";
    setNickname(savedName);
  }, []);

  // Demo current question fallback nếu hub chưa load
  const questionType = currentSlide?.type || "QUIZ";
  const questionIndex = (currentSlide?.index ?? 0) + 1;

  const mockOptions = [
    { id: "opt-1", label: "A", content: "Năng lượng không tự nhiên sinh ra", color: "btn-3d-red", shape: "▲" },
    { id: "opt-2", label: "B", content: "Chỉ chuyển hóa các dạng", color: "btn-3d-blue", shape: "◆" },
    { id: "opt-3", label: "C", content: "Luôn bảo toàn trong hệ cô lập", color: "btn-3d-amber", shape: "●" },
    { id: "opt-4", label: "D", content: "Cả A, B và C đều chính xác", color: "btn-3d-emerald", shape: "■" },
  ];

  const handleSelectQuiz = (optId: string) => {
    if (hasAnswered) return;
    setSelectedOptionId(optId);
    setHasAnswered(true);

    if (submitAnswer) {
      submitAnswer(currentSlide?.slideId || "s-current", { optionId: optId });
    }

    // Hiệu ứng bay điểm số
    setEarnedPoints(950);
    setTotalScore((prev) => prev + 950);
    setStreakCount((prev) => prev + 1);
  };

  const handleSubmitBlank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blankInput.trim() || hasAnswered) return;
    setHasAnswered(true);
    setEarnedPoints(900);
    setTotalScore((prev) => prev + 900);
  };

  const handleMatchingSelect = (side: "left" | "right", val: string) => {
    if (hasAnswered) return;
    if (side === "left") {
      setSelectedLeft(val);
      if (selectedRight) {
        setPairedMatches((prev) => ({ ...prev, [val]: selectedRight }));
        setSelectedLeft(null);
        setSelectedRight(null);
      }
    } else {
      setSelectedRight(val);
      if (selectedLeft) {
        setPairedMatches((prev) => ({ ...prev, [selectedLeft]: val }));
        setSelectedLeft(null);
        setSelectedRight(null);
      }
    }
  };

  const handleSubmitQA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim()) return;
    setQaList((prev) => [
      ...prev,
      { id: `qa-${Date.now()}`, author: nickname, content: qaInput, upvotes: 1 },
    ]);
    setQaInput("");
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* ── DARK COSMIC GRADIENT BACKDROP ── */}
      <div className="fixed inset-0 pointer-events-none -z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#311042]" />
        <div className="absolute top-1/4 left-1/3 w-[350px] h-[350px] bg-indigo-600/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-1/4 w-[300px] h-[300px] bg-fuchsia-600/15 rounded-full blur-[100px]" />
      </div>

      {/* ── TOP GAMEPAD NAVBAR ── */}
      <header className="relative z-20 h-16 px-4 flex items-center justify-between border-b border-white/10 backdrop-blur-xl bg-slate-950/50">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-heading font-black text-sm text-white">{nickname}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-indigo-300 font-mono">
            PIN {pin}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Streak Flame */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black">
            <Flame size={14} fill="currentColor" />
            <span>{streakCount}x</span>
          </div>

          {/* Points */}
          <div className="px-3 py-1 rounded-full bg-indigo-600/30 border border-indigo-400/40 text-indigo-200 text-xs font-extrabold font-heading">
            {totalScore.toLocaleString()} pts
          </div>

          {/* Q&A Button */}
          <button
            onClick={() => setShowQA(!showQA)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white"
            title="Hỏi đáp Q&A"
          >
            <MessageCircle size={16} />
          </button>
        </div>
      </header>

      {/* ── HIỆU ỨNG BAY ĐIỂM SỐ (+950 PTS) ── */}
      {earnedPoints && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-score-fly">
          <div className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black font-heading text-2xl shadow-[0_0_30px_rgba(251,191,36,0.6)] border-2 border-white flex items-center gap-2">
            <Sparkles size={22} className="animate-spin" />
            <span>+{earnedPoints}</span>
          </div>
        </div>
      )}

      {/* ── GAMEPAD CANVAS ── */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-between relative z-10 pb-8">
        {/* Status bar: Question count & Timer */}
        <div className="flex items-center justify-between mb-4 bg-white/[0.06] backdrop-blur-[16px] border border-white/10 px-4 py-2.5 rounded-[16px]">
          <span className="text-xs font-extrabold text-indigo-300 font-heading">
            CÂU {questionIndex} / 5
          </span>
          <div className="flex items-center gap-1.5 text-xs font-black font-heading text-slate-200">
            <Clock size={14} className="text-amber-400" />
            <span>{slideTimeLeft ?? 25}s</span>
          </div>
        </div>

        {/* Question Prompt */}
        <div className="text-center py-4 mb-2">
          <h2 className="text-lg md:text-xl font-black font-heading text-white leading-snug">
            {currentSlide?.questionText || "Nội dung cốt lõi của Định luật Bảo toàn Năng lượng là gì?"}
          </h2>
        </div>

        {/* ── GIAO DIỆN BẤM NÚT 3D TACTILE (THEO DẠNG CÂU HỎI) ── */}
        {hasAnswered ? (
          <div className="my-auto py-12 px-6 rounded-[24px] bg-white/[0.06] backdrop-blur-[16px] border border-white/15 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <Check size={36} className="stroke-[3px]" />
            </div>
            <h3 className="text-2xl font-black font-heading text-white">
              ĐÃ GỬI ĐÁP ÁN!
            </h3>
            <p className="text-xs text-slate-400">
              Hãy nhìn lên màn hình chiếu của Thầy/Cô để xem phân tích đáp án chuẩn và vị trí trên bảng xếp hạng!
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center">
            {/* 1. DẠNG TRẮC NGHIỆM: 4 NÚT 3D ĐA SẮC SIÊU TO TỐI ƯU CẢM ỨNG */}
            {questionType === "QUIZ" && (
              <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                {mockOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectQuiz(opt.id)}
                    className={`btn-3d ${opt.color} p-5 rounded-[20px] text-white flex flex-col items-center justify-center gap-2 min-h-[140px] transition-all`}
                  >
                    <span className="text-2xl font-black opacity-80">{opt.shape}</span>
                    <span className="text-xs sm:text-sm font-bold font-heading text-center leading-snug line-clamp-3">
                      {opt.content}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 2. DẠNG ĐIỀN KHUYẾT (FILL_IN_BLANK) */}
            {questionType === "FILL_IN_BLANK" && (
              <form onSubmit={handleSubmitBlank} className="space-y-4">
                <input
                  type="text"
                  value={blankInput}
                  onChange={(e) => setBlankInput(e.target.value)}
                  placeholder="Gõ từ khóa điền vào chỗ trống..."
                  className="w-full p-4 rounded-[16px] bg-slate-900/90 border-2 border-indigo-500 text-white font-bold text-center text-lg outline-none focus:border-indigo-400 shadow-inner"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!blankInput.trim()}
                  className="w-full py-4 rounded-[16px] btn-3d btn-3d-emerald font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={16} />
                  <span>Nộp Câu Trả Lời</span>
                </button>
              </form>
            )}

            {/* 3. DẠNG GHÉP NỐI (MATCHING) */}
            {questionType === "MATCHING" && (
              <div className="space-y-4">
                <p className="text-[11px] text-center text-slate-400">
                  Chạm vào 1 ô bên trái rồi chạm vào 1 ô bên phải tương ứng để ghép cặp.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    {["Việt Nam", "Pháp", "Nhật Bản"].map((item) => {
                      const isPaired = !!pairedMatches[item];
                      const isSelected = selectedLeft === item;
                      return (
                        <button
                          key={item}
                          onClick={() => handleMatchingSelect("left", item)}
                          className={`w-full p-3 rounded-[12px] text-xs font-bold border transition-all text-left ${
                            isPaired
                              ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                              : isSelected
                              ? "bg-amber-400 text-slate-950 border-amber-300 font-extrabold"
                              : "bg-white/5 border-white/10 text-slate-200"
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    {["Paris", "Hà Nội", "Tokyo"].map((item) => {
                      const isPaired = Object.values(pairedMatches).includes(item);
                      const isSelected = selectedRight === item;
                      return (
                        <button
                          key={item}
                          onClick={() => handleMatchingSelect("right", item)}
                          className={`w-full p-3 rounded-[12px] text-xs font-bold border transition-all text-left ${
                            isPaired
                              ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                              : isSelected
                              ? "bg-amber-400 text-slate-950 border-amber-300 font-extrabold"
                              : "bg-white/5 border-white/10 text-slate-200"
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setHasAnswered(true)}
                  disabled={Object.keys(pairedMatches).length === 0}
                  className="w-full py-3.5 rounded-[14px] btn-3d btn-3d-emerald font-heading text-xs font-extrabold uppercase disabled:opacity-50"
                >
                  Xác Nhận Ghép Cặp
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Q&A DRAWER POPUP ── */}
      {showQA && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border-t border-white/15 rounded-t-[24px] p-4 max-w-xl w-full mx-auto max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-extrabold font-heading text-indigo-400 uppercase tracking-wider">
                Hỏi đáp trực tiếp (Q&A)
              </span>
              <button onClick={() => setShowQA(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {qaList.map((item) => (
                <div key={item.id} className="p-3 rounded-[12px] bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                    <span>{item.author}</span>
                    <span className="flex items-center gap-1 text-amber-300">
                      <ThumbsUp size={11} /> {item.upvotes}
                    </span>
                  </div>
                  <p className="text-xs text-white leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmitQA} className="pt-2 flex items-center gap-2">
              <input
                type="text"
                value={qaInput}
                onChange={(e) => setQaInput(e.target.value)}
                placeholder="Đặt câu hỏi cho Thầy/Cô..."
                className="flex-1 px-3.5 py-2.5 rounded-[12px] bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                className="p-2.5 rounded-[12px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
