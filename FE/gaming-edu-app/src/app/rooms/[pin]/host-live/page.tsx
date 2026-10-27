"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Trophy,
  Users,
  Clock,
  ArrowRight,
  Pin,
  Sparkles,
  Crown,
  Medal,
  BarChart2,
  CheckCircle2,
  LogOut,
  Maximize2,
  Radio,
  Flame,
  MessageCircle,
  HelpCircle,
  X,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useGameHub } from "@/hooks/useGameHub";

interface QuestionOption {
  id: string;
  label: "A" | "B" | "C" | "D";
  content: string;
  isCorrect: boolean;
  color: string;
  bgClass: string;
  borderClass: string;
  votes: number;
}

interface LeaderboardUser {
  rank: number;
  nickname: string;
  score: number;
  streak: number;
  avatarUrl: string;
}

const OPT_COLORS: { label: "A" | "B" | "C" | "D"; color: string; bgClass: string; borderClass: string }[] = [
  { label: "A", color: "#EF4444", bgClass: "bg-red-500", borderClass: "border-red-600" },
  { label: "B", color: "#3B82F6", bgClass: "bg-blue-500", borderClass: "border-blue-600" },
  { label: "C", color: "#F59E0B", bgClass: "bg-amber-500", borderClass: "border-amber-600" },
  { label: "D", color: "#10B981", bgClass: "bg-emerald-500", borderClass: "border-emerald-600" },
];

export default function HostLiveStagePage({ params }: { params: Promise<{ pin: string }> }) {
  const unwrappedParams = use(params);
  const pin = unwrappedParams.pin;
  const router = useRouter();

  // Stage state: QUESTION -> RESULT_CHART -> LEADERBOARD -> PODIUM
  const [stage, setStage] = useState<"QUESTION" | "RESULT_CHART" | "LEADERBOARD" | "PODIUM">("QUESTION");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [pinnedQuestion, setPinnedQuestion] = useState<{ author: string; content: string } | null>(null);

  // Dynamic slides & quiz data from real API
  const [slides, setSlides] = useState<any[]>([]);
  const [quizTopic, setQuizTopic] = useState("");
  const [loadingRoom, setLoadingRoom] = useState(true);

  // SignalR Game Hub hook
  const { currentSlide, gameState, answerProgress, nextSlide, leaderboard: hubLeaderboard } = useGameHub();

  useEffect(() => {
    let isMounted = true;
    async function fetchRoomSlides() {
      try {
        setLoadingRoom(true);
        const resRoom = await api.get(`/rooms/pin/${pin}`);
        const room = resRoom.data?.data || resRoom.data;
        if (room?.quizId) {
          const resQuiz = await api.get(`/quizzes/${room.quizId}`);
          const quizData = resQuiz.data?.data || resQuiz.data;
          if (quizData && isMounted) {
            setQuizTopic(quizData.topic || quizData.title || "PHÒNG THI ĐẤU");
            if (Array.isArray(quizData.slides)) {
              setSlides(quizData.slides);
            }
          }
        }
      } catch (err) {
        console.warn("Lỗi tải slides cho host-live:", err);
      } finally {
        if (isMounted) setLoadingRoom(false);
      }
    }
    fetchRoomSlides();
    return () => {
      isMounted = false;
    };
  }, [pin]);

  // Slide hiện tại lấy từ SignalR hoặc từ danh sách slides tải từ database
  const activeSlideData = currentSlide?.questionText ? currentSlide : slides[currentSlideIndex];
  const questionTitle = activeSlideData?.questionText || activeSlideData?.title || "";
  const totalSlides = Math.max(slides.length, currentSlide?.totalSlides || 1, 1);

  // Dynamic options
  const options: QuestionOption[] = useMemo(() => {
    const rawOptions = activeSlideData?.options;
    if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
      return [];
    }
    return rawOptions.map((opt: any, idx: number) => {
      const style = OPT_COLORS[idx % OPT_COLORS.length];
      return {
        id: opt.id || `opt-${idx}`,
        label: style.label,
        content: opt.content || opt.text || "",
        isCorrect: !!opt.isCorrect,
        color: style.color,
        bgClass: style.bgClass,
        borderClass: style.borderClass,
        votes: opt.votes || 0,
      };
    });
  }, [activeSlideData]);

  // Leaderboard lấy trực tiếp từ SignalR Hub
  const leaderboard: LeaderboardUser[] = (hubLeaderboard && hubLeaderboard.length > 0)
    ? hubLeaderboard.map((u: any, idx: number) => ({
        rank: u.rank || idx + 1,
        nickname: u.nickname || `Người chơi ${idx + 1}`,
        score: u.totalScore || u.score || 0,
        streak: u.streak || 0,
        avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.nickname || idx}`,
      }))
    : [];

  // Timer countdown
  useEffect(() => {
    if (stage !== "QUESTION") return;
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setStage("RESULT_CHART");
    }
  }, [timeLeft, stage]);

  // Confetti khi lên podium
  useEffect(() => {
    if (stage === "PODIUM") {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  }, [stage]);

  const handleNextStage = () => {
    if (stage === "QUESTION") {
      setStage("RESULT_CHART");
    } else if (stage === "RESULT_CHART") {
      setStage("LEADERBOARD");
    } else if (stage === "LEADERBOARD") {
      if (currentSlideIndex >= totalSlides - 1) {
        setStage("PODIUM");
      } else {
        setCurrentSlideIndex((prev) => prev + 1);
        setTimeLeft(25);
        setStage("QUESTION");
        if (nextSlide) nextSlide(pin);
      }
    }
  };

  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
  const correctOpt = options.find((o) => o.isCorrect) || options[0];

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* ── DARK COSMIC GRADIENT BACKDROP ── */}
      <div className="fixed inset-0 pointer-events-none -z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#311042]" />
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/15 rounded-full blur-[120px]" />
      </div>

      {/* ── TOP STAGE BAR ── */}
      <header className="relative z-20 h-18 px-4 md:px-8 flex items-center justify-between border-b border-white/10 backdrop-blur-xl bg-slate-950/40">
        <div className="flex items-center gap-3">
          <Link
            href={`/rooms/${pin}/lobby`}
            className="p-2 rounded-[12px] bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-bold"
            title="Về sảnh chờ"
          >
            <LogOut size={15} />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-heading">
                Màn Hình Chiếu Host
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/30">
                <Radio size={10} className="animate-pulse" /> ON AIR
              </span>
            </div>
            <p className="text-sm font-extrabold text-white font-heading">
              PIN: <span className="font-mono text-indigo-300">{pin}</span> • Câu {currentSlideIndex + 1} / {totalSlides}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Answer progress counter */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs font-bold font-heading">
            <Users size={14} className="text-indigo-400" />
            <span>
              {answerProgress ? `${answerProgress.answeredCount}/${answerProgress.totalPlayers}` : `${totalVotes} đã nộp`}
            </span>
          </div>

          <button
            onClick={handleNextStage}
            className="px-5 py-2.5 rounded-[12px] btn-3d btn-3d-primary text-xs font-extrabold font-heading flex items-center gap-2 uppercase tracking-wider"
          >
            <span>
              {stage === "QUESTION"
                ? "Khóa Câu & Xem Biểu Đồ"
                : stage === "RESULT_CHART"
                ? "Bảng Xếp Hạng"
                : stage === "LEADERBOARD"
                ? currentSlideIndex >= totalSlides - 1
                  ? "Bục Vinh Danh Podium"
                  : "Câu Kế Tiếp"
                : "Kết Thúc"}
            </span>
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* ── BANNER CÂU HỎI ĐƯỢC GHIM (PINNED QUESTION TỪ Q&A) ── */}
      {pinnedQuestion && (
        <div className="relative z-30 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-indigo-500/20 border-b border-amber-400/30 backdrop-blur-md px-4 md:px-8 py-2.5 flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-md bg-amber-400 text-slate-950 font-bold shrink-0">
              <Pin size={14} />
            </div>
            <div className="text-xs md:text-sm text-slate-200 truncate">
              <strong className="text-amber-300 font-heading mr-1.5">{pinnedQuestion.author}:</strong>
              <span>&ldquo;{pinnedQuestion.content}&rdquo;</span>
            </div>
          </div>
          <button
            onClick={() => setPinnedQuestion(null)}
            className="text-slate-400 hover:text-white p-1 shrink-0"
            title="Đóng câu hỏi ghim"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── MAIN STAGE CANVASES ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 relative z-10 flex flex-col justify-center">
        {loadingRoom && !activeSlideData ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Loader2 size={36} className="animate-spin text-indigo-400 mb-3" />
            <p className="text-sm font-semibold text-slate-300">Đang chuẩn bị phòng thi đấu...</p>
          </div>
        ) : stage === "QUESTION" ? (
          /* 1. MÀN HÌNH CÂU HỎI & ĐÁP ÁN (QUESTION) */
          <div className="space-y-6 animate-in fade-in">
            {/* Top Question Card */}
            <div className="rounded-[24px] bg-white/[0.08] backdrop-blur-[16px] border border-white/15 p-6 md:p-10 text-center shadow-2xl relative">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-extrabold text-indigo-300 font-heading uppercase">
                  {quizTopic || "PHÒNG THI ĐẤU"}
                </span>

                {/* Đồng hồ đếm ngược */}
                <div
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full border font-heading font-black text-xl md:text-2xl ${
                    timeLeft <= 5
                      ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
                      : "bg-white/10 border-white/20 text-white"
                  }`}
                >
                  <Clock size={20} />
                  <span>{timeLeft}s</span>
                </div>
              </div>

              <h2 className="text-2xl md:text-4xl font-black font-heading text-white max-w-4xl mx-auto leading-relaxed">
                {questionTitle || "Đang đợi câu hỏi từ bộ đề..."}
              </h2>
            </div>

            {/* Các Đáp Án */}
            {options.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`rounded-[20px] p-5 border-2 ${opt.borderClass} ${opt.bgClass} text-white shadow-[0_6px_0_rgba(0,0,0,0.3)] flex items-center gap-4 transition-all`}
                  >
                    <span className="w-10 h-10 rounded-[12px] bg-black/25 flex items-center justify-center font-black font-heading text-xl shrink-0">
                      {opt.label}
                    </span>
                    <span className="text-base md:text-lg font-bold font-heading flex-1 leading-snug">
                      {opt.content}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 bg-white/[0.04] rounded-2xl border border-white/10">
                <Clock size={32} className="mx-auto mb-2 text-indigo-400 animate-pulse" />
                <p className="text-sm font-semibold">Chưa có phương án lựa chọn cho câu hỏi này.</p>
              </div>
            )}
          </div>
        ) : stage === "RESULT_CHART" ? (
          /* 2. MÀN HÌNH BIỂU ĐỒ KẾT QUẢ (RESULT_CHART) */
          <div className="rounded-[24px] bg-white/[0.08] backdrop-blur-[16px] border border-white/15 p-6 md:p-10 shadow-2xl space-y-8 animate-in fade-in">
            <div className="text-center space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 font-heading">
                THỐNG KÊ LỰA CHỌN
              </span>
              <h2 className="text-2xl md:text-3xl font-black font-heading text-white">
                Biểu Đồ Phân Bổ Câu Trả Lời
              </h2>
            </div>

            {/* Bar Charts */}
            {options.length > 0 ? (
              <div className="grid grid-cols-4 gap-4 md:gap-8 items-end h-72 pt-8 px-4 max-w-3xl mx-auto border-b border-white/10 pb-4">
                {options.map((opt) => {
                  const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                  return (
                    <div key={opt.id} className="flex flex-col items-center gap-3 h-full justify-end">
                      <span className="text-sm font-black font-heading text-white">
                        {opt.votes} ({percent}%)
                      </span>
                      <div
                        className={`w-full rounded-t-[14px] ${opt.bgClass} shadow-lg transition-all duration-1000 relative flex items-center justify-center`}
                        style={{ height: `${Math.max(percent * 2.2, 36)}px`, minHeight: "36px" }}
                      >
                        {opt.isCorrect && (
                          <CheckCircle2 size={24} className="text-white drop-shadow-md animate-bounce" />
                        )}
                      </div>
                      <span className="w-9 h-9 rounded-[10px] bg-white/10 font-black font-heading text-base flex items-center justify-center">
                        {opt.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400">
                Chưa có dữ liệu phương án trả lời.
              </div>
            )}

            {correctOpt && (
              <div className="p-4 rounded-[16px] bg-emerald-500/10 border border-emerald-400/30 text-center max-w-xl mx-auto">
                <p className="text-xs md:text-sm font-bold text-emerald-300 font-heading">
                  ✓ Đáp án chính xác: Phương án {correctOpt.label} ({correctOpt.content})
                </p>
              </div>
            )}
          </div>
        ) : stage === "LEADERBOARD" ? (
          /* 3. MÀN HÌNH BẢNG XẾP HẠNG (LEADERBOARD) */
          <div className="rounded-[24px] bg-white/[0.08] backdrop-blur-[16px] border border-white/15 p-6 md:p-8 shadow-2xl max-w-2xl mx-auto w-full space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-amber-400" />
                <h2 className="text-xl font-black font-heading text-white">
                  Bảng Xếp Hạng Trực Tiếp
                </h2>
              </div>
              <span className="text-xs font-bold text-indigo-300 font-heading">
                Top Thí Sinh Xuất Sắc
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Chưa có người chơi nào ghi điểm trong vòng thi này.
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((user) => {
                  const isTop1 = user.rank === 1;
                  return (
                    <div
                      key={user.rank}
                      className={`rounded-[16px] p-3.5 border transition-all flex items-center justify-between gap-3 ${
                        isTop1
                          ? "bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border-amber-400/40 shadow-lg"
                          : "bg-white/[0.04] border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                            user.rank === 1
                              ? "bg-amber-400 text-slate-950"
                              : user.rank === 2
                              ? "bg-slate-300 text-slate-950"
                              : user.rank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-white/10 text-slate-300"
                          }`}
                        >
                          {user.rank}
                        </span>
                        <img
                          src={user.avatarUrl}
                          alt={user.nickname}
                          className="w-9 h-9 rounded-[10px] bg-white/10 object-cover border border-white/20"
                        />
                        <div>
                          <p className="text-sm font-extrabold font-heading text-white">{user.nickname}</p>
                          {user.streak > 1 && (
                            <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                              <Flame size={10} fill="currentColor" /> {user.streak} chuỗi đúng
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-base font-black font-heading text-amber-400">
                        {user.score.toLocaleString()} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* 4. MÀN HÌNH BỤC VINH DANH (PODIUM) */
          <div className="rounded-[24px] bg-white/[0.08] backdrop-blur-[16px] border border-white/15 p-6 md:p-12 shadow-2xl text-center space-y-8 animate-in zoom-in-95">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black text-xs font-heading mb-3 uppercase tracking-wider">
                <Sparkles size={14} /> Tổng Kết Trận Đấu
              </div>
              <h2 className="text-3xl md:text-5xl font-black font-heading text-white">
                Bục Vinh Danh Chiến Thắng
              </h2>
            </div>

            {leaderboard.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Chưa có thí sinh nào hoàn thành trận đấu.
              </div>
            ) : (
              <div className="flex items-end justify-center gap-4 md:gap-8 pt-8 max-w-2xl mx-auto h-72">
                {/* Hạng 2 */}
                {leaderboard[1] && (
                  <div className="flex flex-col items-center gap-2 flex-1 animate-slide-up">
                    <img
                      src={leaderboard[1].avatarUrl}
                      alt={leaderboard[1].nickname}
                      className="w-14 h-14 rounded-[16px] border-2 border-slate-300 bg-white/10"
                    />
                    <span className="text-xs font-bold font-heading text-slate-200 truncate max-w-[90px]">
                      {leaderboard[1].nickname}
                    </span>
                    <span className="text-xs font-black text-slate-300 font-heading">
                      {leaderboard[1].score.toLocaleString()}
                    </span>
                    <div className="w-full h-32 rounded-t-[18px] bg-gradient-to-t from-slate-700 to-slate-500 flex items-center justify-center font-black font-heading text-2xl text-slate-900 shadow-xl">
                      2
                    </div>
                  </div>
                )}

                {/* Hạng 1 */}
                {leaderboard[0] && (
                  <div className="flex flex-col items-center gap-2 flex-1 animate-slide-up">
                    <Crown size={32} className="text-amber-400 animate-bounce" fill="currentColor" />
                    <img
                      src={leaderboard[0].avatarUrl}
                      alt={leaderboard[0].nickname}
                      className="w-18 h-18 rounded-[20px] border-4 border-amber-400 bg-white/10 shadow-[0_0_30px_rgba(251,191,36,0.6)]"
                    />
                    <span className="text-sm font-black font-heading text-amber-300 truncate max-w-[110px]">
                      {leaderboard[0].nickname}
                    </span>
                    <span className="text-sm font-black text-amber-400 font-heading">
                      {leaderboard[0].score.toLocaleString()} pts
                    </span>
                    <div className="w-full h-44 rounded-t-[18px] bg-gradient-to-t from-amber-600 to-amber-400 flex items-center justify-center font-black font-heading text-3xl text-slate-950 shadow-2xl">
                      1
                    </div>
                  </div>
                )}

                {/* Hạng 3 */}
                {leaderboard[2] && (
                  <div className="flex flex-col items-center gap-2 flex-1 animate-slide-up">
                    <img
                      src={leaderboard[2].avatarUrl}
                      alt={leaderboard[2].nickname}
                      className="w-14 h-14 rounded-[16px] border-2 border-amber-700 bg-white/10"
                    />
                    <span className="text-xs font-bold font-heading text-slate-200 truncate max-w-[90px]">
                      {leaderboard[2].nickname}
                    </span>
                    <span className="text-xs font-black text-amber-600 font-heading">
                      {leaderboard[2].score.toLocaleString()}
                    </span>
                    <div className="w-full h-24 rounded-t-[18px] bg-gradient-to-t from-amber-900 to-amber-700 flex items-center justify-center font-black font-heading text-xl text-white shadow-xl">
                      3
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-6 flex justify-center gap-4">
              <Link
                href={`/reports/${pin}`}
                className="px-6 py-3 rounded-[14px] btn-3d btn-3d-secondary font-heading font-black text-xs uppercase"
              >
                Xem Báo Cáo Chi Tiết
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
