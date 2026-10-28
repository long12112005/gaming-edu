"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  X,
  Search,
  Gamepad2,
  BookOpen,
  Sparkles,
  Check,
  ChevronRight,
  RotateCcw,
  Plus,
  Loader2,
  AlertCircle,
  HelpCircle,
  Crown,
  Rocket,
  Trophy,
  Flame,
  Zap,
  Anchor,
  Shield,
  Clock,
  Calendar,
  Globe,
  User as UserIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { Quiz } from "@/types/database";

export interface QuizOptionItem extends Quiz {
  isMine?: boolean;
  creatorNickname?: string;
  creatorAvatar?: string | null;
}

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuizId?: string;
  initialMode?: "HOST_PACED" | "ASYNC_TOURNAMENT";
  initialTheme?: string;
}

// ─── Component Tùy Chọn Chế Độ Chơi ──────────────────────────────────────────
function ModeOptionCard({
  mode,
  label,
  icon,
  iconBg,
  desc,
  selected,
  badge,
  onClick,
}: {
  mode: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  desc: string;
  selected: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between overflow-hidden active:scale-[0.99] cursor-pointer ${
        selected
          ? "bg-indigo-50/70 border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
          : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60 shadow-xs"
      }`}
    >
      {badge && (
        <span className="absolute top-2.5 right-2.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
          {badge}
        </span>
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${iconBg} shadow-xs`}>
          {icon}
        </div>
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            selected
              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
              : "border-slate-300 group-hover:border-indigo-400 bg-white"
          }`}
        >
          {selected && <Check size={13} strokeWidth={3.5} />}
        </div>
      </div>

      <div>
        <div className={`font-heading font-black text-sm sm:text-base transition-colors ${selected ? "text-indigo-950" : "text-slate-900 group-hover:text-indigo-600"}`}>
          {label}
        </div>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          {desc}
        </p>
      </div>
    </button>
  );
}

// ─── MAIN MODAL: TẠO PHÒNG THI ĐẤU (CHỌN ĐỀ & CHẾ ĐỘ CHƠI) ───────────────────
export default function CreateRoomModal({
  isOpen,
  onClose,
  initialQuizId,
  initialMode = "HOST_PACED",
  initialTheme = "CLASSIC",
}: CreateRoomModalProps) {
  const router = useRouter();

  // Step States
  const [quizzes, setQuizzes] = useState<QuizOptionItem[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string>(initialQuizId || "");
  const [isChangingQuiz, setIsChangingQuiz] = useState(false);
  const [quizSearch, setQuizSearch] = useState("");
  const [quizTopicFilter, setQuizTopicFilter] = useState("ALL");
  const [quizSourceTab, setQuizSourceTab] = useState<"ALL" | "MINE" | "COMMUNITY">("ALL");

  const [selectedMode, setSelectedMode] = useState<
    "HOST_PACED" | "ASYNC_TOURNAMENT"
  >(initialMode === "ASYNC_TOURNAMENT" ? "ASYNC_TOURNAMENT" : "HOST_PACED");
  const [selectedTheme, setSelectedTheme] = useState<string>(initialTheme || "CLASSIC");

  // Tournament settings
  const [tournamentDurationHours, setTournamentDurationHours] = useState<number>(24);
  const [tournamentCustomEndTime, setTournamentCustomEndTime] = useState<string>("");
  const [tournamentQuestionTimeLimit, setTournamentQuestionTimeLimit] = useState<number>(30);

  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const computedEndTime = useMemo(() => {
    if (tournamentCustomEndTime) {
      return new Date(tournamentCustomEndTime).toISOString();
    }
    if (tournamentDurationHours <= 0) return null;
    const d = new Date();
    d.setHours(d.getHours() + tournamentDurationHours);
    return d.toISOString();
  }, [tournamentDurationHours, tournamentCustomEndTime]);

  // Cập nhật khi mở modal hoặc đổi initialQuizId / initialTheme
  useEffect(() => {
    if (initialQuizId) {
      setSelectedQuizId(initialQuizId);
      setIsChangingQuiz(false);
    }
  }, [initialQuizId]);

  useEffect(() => {
    if (initialTheme) {
      setSelectedTheme(initialTheme);
    }
  }, [initialTheme]);

  // Tải danh sách bộ đề: Hợp nhất cả Bộ đề của tôi và Bộ đề công khai cộng đồng
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadQuizzes = async () => {
      setLoadingQuizzes(true);
      setErrorMsg(null);
      try {
        const token = Cookies.get("token");
        const quizMap = new Map<string, QuizOptionItem>();

        // 1. Tải bộ đề cá nhân của tôi (nếu đã đăng nhập)
        if (token) {
          try {
            const mineRes = await api.get("/quizzes/mine");
            const mineList = mineRes.data?.data || mineRes.data;
            if (Array.isArray(mineList)) {
              mineList.forEach((q: any) => {
                quizMap.set(q.id, { ...q, isMine: true });
              });
            }
          } catch (e) {
            console.warn("Lỗi tải quizzes/mine:", e);
          }
        }

        // 2. Tải toàn bộ bộ đề công khai do người khác/cộng đồng tạo
        try {
          const publicRes = await api.get("/quizzes");
          const publicList = publicRes.data?.data || publicRes.data;
          if (Array.isArray(publicList)) {
            publicList.forEach((q: any) => {
              if (quizMap.has(q.id)) {
                const existing = quizMap.get(q.id)!;
                quizMap.set(q.id, { ...q, ...existing, isMine: true });
              } else {
                quizMap.set(q.id, { ...q, isMine: false });
              }
            });
          }
        } catch (e) {
          console.warn("Lỗi tải public quizzes:", e);
        }

        const combinedList = Array.from(quizMap.values());

        if (isMounted) {
          setQuizzes(combinedList);
          if (!selectedQuizId && combinedList.length > 0) {
            setSelectedQuizId(combinedList[0].id);
          }
        }
      } catch (err: any) {
        console.warn("Lỗi nạp danh sách bộ đề:", err);
      } finally {
        if (isMounted) setLoadingQuizzes(false);
      }
    };

    loadQuizzes();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedQuizId]);

  // Bộ đề đang được chọn
  const currentQuiz = useMemo(() => {
    return quizzes.find((q) => q.id === selectedQuizId);
  }, [quizzes, selectedQuizId]);

  // Số lượng phân theo nguồn
  const myQuizzesCount = useMemo(() => quizzes.filter((q) => q.isMine).length, [quizzes]);
  const communityQuizzesCount = useMemo(() => quizzes.filter((q) => !q.isMine).length, [quizzes]);

  // Danh sách chủ đề có trong dữ liệu
  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((q) => {
      if (q.topic) set.add(q.topic);
    });
    return Array.from(set);
  }, [quizzes]);

  // Danh sách sau khi tìm kiếm và lọc nguồn/chủ đề
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      if (quizSourceTab === "MINE" && !q.isMine) return false;
      if (quizSourceTab === "COMMUNITY" && q.isMine) return false;

      const matchSearch =
        quizSearch.trim() === "" ||
        q.title.toLowerCase().includes(quizSearch.toLowerCase()) ||
        (q.topic && q.topic.toLowerCase().includes(quizSearch.toLowerCase())) ||
        (q.creatorNickname && q.creatorNickname.toLowerCase().includes(quizSearch.toLowerCase()));

      const matchTopic =
        quizTopicFilter === "ALL" ||
        (q.topic && q.topic.toUpperCase() === quizTopicFilter.toUpperCase());

      return matchSearch && matchTopic;
    });
  }, [quizzes, quizSourceTab, quizSearch, quizTopicFilter]);

  const getQuizSlideCount = (quiz: any): number => {
    if (!quiz) return 0;
    return quiz.slideCount ?? quiz.slide_count ?? quiz.slides?.length ?? quiz.total_slides ?? 0;
  };

  // Xử lý nút Bắt đầu tạo phòng thi đấu
  const handleStartGame = async () => {
    const token = Cookies.get("token");
    if (!token) {
      setErrorMsg("Bạn cần đăng nhập tài khoản Giáo viên / Quản trò để mở phòng thi.");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
      return;
    }

    if (!selectedQuizId) {
      setErrorMsg("Vui lòng chọn một bộ đề để bắt đầu tạo phòng thi đấu.");
      setIsChangingQuiz(true);
      return;
    }

    const questionCount = getQuizSlideCount(currentQuiz);
    if (questionCount === 0) {
      setErrorMsg(
        `Bộ đề "${currentQuiz?.title || "này"}" hiện chưa có câu hỏi nào (0 câu). Vui lòng chọn bộ đề khác đã có câu hỏi hoặc vào mục Quản lý bộ đề để thêm câu hỏi trước khi mở phòng!`
      );
      return;
    }

    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await api.post("/rooms", {
        quizId: selectedQuizId,
        mode: selectedMode,
        gameModeTheme: selectedTheme,
        endTime: selectedMode === "ASYNC_TOURNAMENT" ? computedEndTime : null,
        questionTimeLimit:
          selectedMode === "ASYNC_TOURNAMENT" && tournamentQuestionTimeLimit > 0
            ? tournamentQuestionTimeLimit
            : null,
      });

      if (res.data.success) {
        const room = res.data.data;
        const pin = room.pinCode || room.pin;
        onClose();
        if (selectedTheme === "NAVAL_WAR") {
          router.push(`/rooms/${pin}/naval`);
        } else {
          router.push(`/host/${room.id}?pin=${pin}`);
        }
      } else {
        setErrorMsg(res.data.message || "Tạo phòng không thành công.");
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        const msg = err.response?.data?.message || "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại!";
        setErrorMsg(msg);
        setTimeout(() => {
          Cookies.remove("token");
          Cookies.remove("user");
          router.push("/login");
        }, 1500);
        return;
      }
      setErrorMsg(
        err.response?.data?.message ||
          "Lỗi khi tạo phòng thi đấu. Vui lòng thử lại!"
      );
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/90 rounded-[28px] md:rounded-[32px] p-5 sm:p-6 md:p-8 w-full max-w-3xl shadow-2xl font-sans max-h-[92vh] flex flex-col relative overflow-hidden">
        {/* Ambient subtle glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* ── MODAL HEADER ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 shrink-0 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-200 text-indigo-600 rounded-2xl flex items-center justify-center shadow-xs shrink-0">
              <Gamepad2 size={26} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 leading-tight">
                Khởi Tạo Phòng Chơi Trực Tiếp
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Chọn bộ đề câu hỏi và chế độ điều khiển để bắt đầu phòng chơi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shrink-0"
            title="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="my-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── MODAL BODY (SCROLLABLE) ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1.5 relative z-10">
          {/* ═══════════════════════════════════════════════════════════════════
              BƯỚC 1: CHỌN BỘ ĐỀ THI ĐẤU (QUIZ SELECTION)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <label className="text-xs sm:text-sm font-black font-heading text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center text-xs font-black">
                  1
                </span>
                Bộ Đề Câu Hỏi Sử Dụng
              </label>

              <div className="flex items-center gap-2">
                {/* Nút Tạo đề mới trực tiếp */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push("/quiz/create");
                  }}
                  className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Tạo một bộ đề câu hỏi mới"
                >
                  <Plus size={14} />
                  <span>Tạo Đề Mới</span>
                </button>

                {currentQuiz && !isChangingQuiz && (
                  <button
                    type="button"
                    onClick={() => setIsChangingQuiz(true)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw size={12} />
                    <span>Chọn Đề Khác ({quizzes.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Selected Quiz Card */}
            {currentQuiz && !isChangingQuiz ? (
              <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-indigo-50/80 border-2 border-indigo-400/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-13 h-13 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
                    📚
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
                        {currentQuiz.topic || "Tổng Hợp"}
                      </span>
                      {currentQuiz.isMine ? (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300/60 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                          👤 Của tôi
                        </span>
                      ) : (
                        <span className="bg-sky-100 text-sky-800 border border-sky-300/60 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                          🌐 Công khai {currentQuiz.creatorNickname ? `(${currentQuiz.creatorNickname})` : ""}
                        </span>
                      )}
                      {getQuizSlideCount(currentQuiz) > 0 ? (
                        <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          ✓ Đủ điều kiện ({getQuizSlideCount(currentQuiz)} câu)
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md text-[11px] font-bold">
                          ⚠ Chưa có câu hỏi
                        </span>
                      )}
                    </div>
                    <h4 className="font-heading font-black text-base sm:text-lg text-slate-900 mt-1 truncate">
                      {currentQuiz.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {currentQuiz.description || "Bộ câu hỏi luyện tập trực tiếp cho phòng thi đấu."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push("/quiz/create");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Tạo bộ đề mới"
                  >
                    <Plus size={14} className="text-indigo-600" />
                    <span>Tạo Đề Khác</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChangingQuiz(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Thay đổi
                  </button>
                </div>
              </div>
            ) : (
              /* Quiz Selection List (Khi người dùng mở danh sách chọn đề) */
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                {/* Tabs phân loại nguồn đề: Tất cả / Của tôi / Công khai */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setQuizSourceTab("ALL")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        quizSourceTab === "ALL"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Tất Cả ({quizzes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuizSourceTab("MINE")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        quizSourceTab === "MINE"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>👤 Của Tôi</span>
                      <span className="text-[10px] opacity-75">({myQuizzesCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuizSourceTab("COMMUNITY")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        quizSourceTab === "COMMUNITY"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>🌐 Công Khai Cộng Đồng</span>
                      <span className="text-[10px] opacity-75">({communityQuizzesCount})</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push("/quiz/create");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus size={13} />
                    <span>+ Tạo Đề Mới</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={quizSearch}
                      onChange={(e) => setQuizSearch(e.target.value)}
                      placeholder="Tìm kiếm bộ đề theo tên, chủ đề hoặc người tạo..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>

                  {availableTopics.length > 0 && (
                    <select
                      value={quizTopicFilter}
                      onChange={(e) => setQuizTopicFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer shrink-0"
                    >
                      <option value="ALL">Tất cả chủ đề</option>
                      {availableTopics.map((topic) => (
                        <option key={topic} value={topic}>
                          {topic}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {loadingQuizzes ? (
                  <div className="py-10 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-indigo-600" />
                    <span className="text-xs font-medium">Đang tải danh sách bộ đề...</span>
                  </div>
                ) : filteredQuizzes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {filteredQuizzes.map((quiz) => {
                      const isSelected = selectedQuizId === quiz.id;
                      return (
                        <button
                          key={quiz.id}
                          type="button"
                          onClick={() => {
                            setSelectedQuizId(quiz.id);
                            setIsChangingQuiz(false);
                          }}
                          className={`text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50 border-2 border-indigo-600 text-slate-900 shadow-xs"
                              : "bg-white border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-800 shadow-2xs"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              {quiz.isMine ? (
                                <span className="bg-amber-100 text-amber-800 border border-amber-300/60 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  👤 Của tôi
                                </span>
                              ) : (
                                <span className="bg-sky-100 text-sky-800 border border-sky-300/60 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  🌐 {quiz.creatorNickname ? `Bởi ${quiz.creatorNickname}` : "Công khai"}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {quiz.topic || "Môn học"}
                              </span>
                            </div>

                            <div className="font-heading font-black text-xs sm:text-sm text-slate-900 truncate">
                              {quiz.title}
                            </div>

                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                              {getQuizSlideCount(quiz) > 0 ? (
                                <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  ✓ {getQuizSlideCount(quiz)} câu hỏi
                                </span>
                              ) : (
                                <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]">
                                  0 câu (Trống)
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3.5} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200/80 space-y-2">
                    <p className="font-bold text-slate-700">Không tìm thấy bộ đề nào phù hợp!</p>
                    <p className="text-slate-400 text-[11px]">
                      Bạn có thể tạo một bộ đề mới toanh để tổ chức phòng chơi ngay.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push("/quiz/create");
                      }}
                      className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus size={14} /> Tạo bộ đề mới ngay
                    </button>
                  </div>
                )}

                {/* Thanh trợ giúp cuối danh sách */}
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
                  <span>💡 Muốn dùng một bộ đề riêng chưa có trong danh sách?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push("/quiz/create");
                    }}
                    className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Tự soạn bộ đề mới</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              BƯỚC 2: CHẾ ĐỘ VẬN HÀNH PHÒNG (ROOM MODE)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black font-heading text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-6 h-6 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center text-xs font-black">
                  2
                </span>
                Chế Độ Vận Hành Phòng
              </label>
              <span className="text-[11px] text-slate-500">
                Chọn cách thức dẫn dắt tiến độ thi đấu
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ModeOptionCard
                mode="NAVAL_WAR"
                label="Hải Tặc Tri Thức"
                icon={<Anchor size={24} className="text-cyan-600" />}
                iconBg="bg-cyan-50 border-cyan-200 text-cyan-600"
                desc="Đấu trường chiến thuật Bắn Tàu 2 phe Đội Đỏ vs Đội Xanh (50 người). Trả lời câu hỏi nạp đạn pháo, bật Radar & Khiên."
                badge="HOT • MỚI"
                selected={selectedTheme === "NAVAL_WAR"}
                onClick={() => {
                  setSelectedTheme("NAVAL_WAR");
                  setSelectedMode("HOST_PACED");
                }}
              />
              <ModeOptionCard
                mode="HOST_PACED"
                label="Phòng Thường"
                icon={<Gamepad2 size={24} className="text-violet-600" />}
                iconBg="bg-violet-50 border-violet-200 text-violet-600"
                desc="Cả lớp thi đấu trực tiếp cùng lúc. Hệ thống tự động đếm ngược và chuyển câu hỏi khi hoàn thành."
                selected={selectedTheme !== "NAVAL_WAR" && selectedMode === "HOST_PACED"}
                onClick={() => {
                  setSelectedTheme("CLASSIC");
                  setSelectedMode("HOST_PACED");
                }}
              />
              <ModeOptionCard
                mode="ASYNC_TOURNAMENT"
                label="Phòng Giải Đấu"
                icon={<Trophy size={24} className="text-amber-600" />}
                iconBg="bg-amber-50 border-amber-200 text-amber-600"
                desc="Mở giải đấu bảng xếp hạng 24/7, thí sinh tự do vào thi bất đồng bộ với timer cá nhân, tự lưu nháp 30s."
                selected={selectedTheme !== "NAVAL_WAR" && selectedMode === "ASYNC_TOURNAMENT"}
                onClick={() => {
                  setSelectedTheme("CLASSIC");
                  setSelectedMode("ASYNC_TOURNAMENT");
                }}
              />
            </div>

            {/* ── TOURNAMENT SPECIFIC SETTINGS ── */}
            {selectedTheme !== "NAVAL_WAR" && selectedMode === "ASYNC_TOURNAMENT" && (
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-yellow-500/10 border-2 border-amber-300/80 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-600 shrink-0" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 font-heading">
                    Cài Đặt Phòng Giải Đấu (Thời Hạn & Thời Gian Câu Hỏi)
                  </h4>
                </div>

                {/* 1. Thời hạn giải đấu */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={14} className="text-amber-600" />
                    <span>Thời hạn kết thúc giải đấu:</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "1 Giờ", hours: 1 },
                      { label: "6 Giờ", hours: 6 },
                      { label: "12 Giờ", hours: 12 },
                      { label: "24 Giờ (1 Ngày)", hours: 24 },
                      { label: "3 Ngày", hours: 72 },
                      { label: "7 Ngày", hours: 168 },
                      { label: "Không giới hạn", hours: 0 },
                    ].map((opt) => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => {
                          setTournamentDurationHours(opt.hours);
                          setTournamentCustomEndTime("");
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          tournamentDurationHours === opt.hours && !tournamentCustomEndTime
                            ? "bg-amber-500 text-slate-950 shadow-sm"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-amber-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Hoặc chọn ngày giờ cụ thể */}
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">Hoặc ngày giờ cụ thể:</span>
                    <input
                      type="datetime-local"
                      value={tournamentCustomEndTime}
                      onChange={(e) => setTournamentCustomEndTime(e.target.value)}
                      className="px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-800 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 2. Thời gian mỗi câu hỏi */}
                <div className="space-y-2 pt-2 border-t border-amber-200/60">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-600" />
                    <span>Thời gian tối đa mỗi câu hỏi:</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Theo bộ đề (Mặc định)", val: 0 },
                      { label: "15 Giây", val: 15 },
                      { label: "30 Giây", val: 30 },
                      { label: "45 Giây", val: 45 },
                      { label: "60 Giây (1 Phút)", val: 60 },
                      { label: "90 Giây", val: 90 },
                      { label: "120 Giây (2 Phút)", val: 120 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setTournamentQuestionTimeLimit(opt.val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          tournamentQuestionTimeLimit === opt.val
                            ? "bg-amber-500 text-slate-950 shadow-sm"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-amber-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ACTIONS & SUMMARY ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 shrink-0 relative z-10">
          <div className="flex items-center gap-2 text-xs text-slate-600 overflow-hidden">
            <span className="text-slate-400 font-bold shrink-0">Đã chọn:</span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold flex items-center gap-1.5 truncate">
              <span>📚</span>
              <span className="truncate max-w-[180px] sm:max-w-[240px]">
                {currentQuiz ? currentQuiz.title : "Chưa chọn đề"}
              </span>
            </span>
            <span className="text-slate-300 shrink-0">•</span>
            <span className="text-indigo-600 font-bold truncate shrink-0">
              {selectedTheme === "NAVAL_WAR" && "⚓ Hải Tặc Tri Thức"}
              {selectedTheme !== "NAVAL_WAR" && selectedMode === "HOST_PACED" && "🎮 Phòng Thường"}
              {selectedTheme !== "NAVAL_WAR" && selectedMode === "ASYNC_TOURNAMENT" && "🏆 Phòng Giải Đấu"}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              disabled={creating || !selectedQuizId}
              onClick={handleStartGame}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-heading font-black text-sm shadow-lg shadow-indigo-600/25 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang Mở Phòng...</span>
                </>
              ) : (
                <>
                  <Gamepad2 size={18} />
                  <span>Khởi Tạo Phòng Chơi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
