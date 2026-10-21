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
} from "lucide-react";
import { api } from "@/lib/api";
import { Quiz } from "@/types/database";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuizId?: string;
  initialMode?: "HOST_PACED" | "PLAYER_PACED" | "ASYNC_TOURNAMENT";
}

// ─── Component Tùy Chọn Chế Độ Chơi ──────────────────────────────────────────
function ModeOptionCard({
  mode,
  label,
  icon,
  desc,
  selected,
  onClick,
}: {
  mode: string;
  label: string;
  icon: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col justify-between overflow-hidden active:scale-[0.98] ${
        selected
          ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/50"
          : "bg-white/[0.03] border-cyan-400/20 hover:border-cyan-400/40 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-2xl p-1.5 rounded-xl bg-white/10 border border-white/10 shrink-0">
          {icon}
        </span>
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            selected
              ? "bg-cyan-400 border-cyan-400 text-teal-950 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
              : "border-cyan-400/30 group-hover:border-cyan-400/60"
          }`}
        >
          {selected && <Check size={12} strokeWidth={3.5} />}
        </div>
      </div>

      <div>
        <div className="font-bold text-sm text-white group-hover:text-cyan-200 transition-colors">
          {label}
        </div>
        <p className="text-xs text-cyan-200/70 mt-1 leading-snug line-clamp-2">
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
}: CreateRoomModalProps) {
  const router = useRouter();

  // Step States
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string>(initialQuizId || "");
  const [isChangingQuiz, setIsChangingQuiz] = useState(false);
  const [quizSearch, setQuizSearch] = useState("");
  const [quizTopicFilter, setQuizTopicFilter] = useState("ALL");

  const [selectedMode, setSelectedMode] = useState<
    "HOST_PACED" | "PLAYER_PACED" | "ASYNC_TOURNAMENT"
  >(initialMode);

  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cập nhật khi mở modal hoặc đổi initialQuizId
  useEffect(() => {
    if (initialQuizId) {
      setSelectedQuizId(initialQuizId);
      setIsChangingQuiz(false);
    }
  }, [initialQuizId]);

  // Tải danh sách bộ đề (Ưu tiên bộ đề của tôi, fallback bộ đề công khai)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadQuizzes = async () => {
      setLoadingQuizzes(true);
      setErrorMsg(null);
      try {
        const token = Cookies.get("token");
        let list: Quiz[] = [];

        if (token) {
          try {
            const mineRes = await api.get("/quizzes/mine");
            if (mineRes.data?.data && Array.isArray(mineRes.data.data)) {
              list = mineRes.data.data;
            }
          } catch (e) {
            console.warn("Lỗi tải quizzes/mine, fallback sang public:", e);
          }
        }

        // Nếu người dùng chưa có bộ đề nào, lấy thêm bộ đề công khai mẫu
        if (list.length === 0) {
          const publicRes = await api.get("/quizzes");
          if (publicRes.data?.data && Array.isArray(publicRes.data.data)) {
            list = publicRes.data.data;
          }
        }

        if (isMounted) {
          setQuizzes(list);
          // Tự động chọn đề đầu tiên nếu chưa có đề nào được chọn
          if (!selectedQuizId && list.length > 0) {
            setSelectedQuizId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách đề:", err);
      } finally {
        if (isMounted) setLoadingQuizzes(false);
      }
    };

    loadQuizzes();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Bộ đề được chọn hiện tại
  const currentQuiz = useMemo(() => {
    return quizzes.find((q) => q.id === selectedQuizId);
  }, [quizzes, selectedQuizId]);

  // Danh sách chủ đề môn học có trong quizzes
  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((q) => {
      if (q.topic) set.add(q.topic);
    });
    return Array.from(set);
  }, [quizzes]);

  // Lọc danh sách bộ đề
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchSearch =
        !quizSearch.trim() ||
        q.title.toLowerCase().includes(quizSearch.toLowerCase()) ||
        (q.topic && q.topic.toLowerCase().includes(quizSearch.toLowerCase()));
      const matchTopic =
        quizTopicFilter === "ALL" || q.topic === quizTopicFilter;
      return matchSearch && matchTopic;
    });
  }, [quizzes, quizSearch, quizTopicFilter]);

  // Xử lý tạo phòng
  const handleStartGame = async () => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!selectedQuizId) {
      setErrorMsg("Vui lòng chọn một bộ đề để bắt đầu tạo phòng thi đấu.");
      setIsChangingQuiz(true);
      return;
    }

    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await api.post("/rooms", {
        quizId: selectedQuizId,
        mode: selectedMode,
        gameModeTheme: "CLASSIC",
      });

      if (res.data.success) {
        const room = res.data.data;
        onClose();
        router.push(
          `/host/${room.id}?pin=${room.pinCode}`
        );
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in">
      <div className="bg-[#08282e] border-2 border-cyan-400/40 rounded-[28px] md:rounded-[36px] p-5 sm:p-6 md:p-8 w-full max-w-4xl shadow-[0_20px_70px_rgba(0,0,0,0.85)] font-sans max-h-[92vh] flex flex-col relative overflow-hidden">
        {/* Ambient background glow effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── MODAL HEADER ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-cyan-400/20 shrink-0 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 rounded-2xl flex items-center justify-center text-teal-950 shadow-[0_0_20px_rgba(251,191,36,0.35)] shrink-0">
              <Gamepad2 size={26} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="font-black text-xl sm:text-2xl text-white font-serif leading-tight">
                Khởi Tạo Phòng Chơi Trực Tiếp
              </h3>
              <p className="text-xs sm:text-sm text-cyan-200/80 mt-0.5">
                Chọn bộ đề câu hỏi và chế độ điều khiển để bắt đầu phòng chơi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-cyan-300/20 text-cyan-200 hover:text-white flex items-center justify-center transition-all shrink-0"
            title="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="my-2 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── MODAL BODY (SCROLLABLE) ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1.5 custom-scrollbar relative z-10">
          {/* ═══════════════════════════════════════════════════════════════════
              BƯỚC 1: CHỌN BỘ ĐỀ THI ĐẤU (QUIZ SELECTION)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-cyan-100 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center text-xs">
                  1
                </span>
                Bộ Đề Câu Hỏi Sử Dụng
              </label>

              {currentQuiz && !isChangingQuiz && (
                <button
                  type="button"
                  onClick={() => setIsChangingQuiz(true)}
                  className="text-xs font-bold text-cyan-300 hover:text-white flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-cyan-400/20 px-3 py-1 rounded-xl transition-all"
                >
                  <RotateCcw size={12} />
                  <span>Chọn Đề Khác ({quizzes.length} Bộ Đề)</span>
                </button>
              )}
            </div>

            {/* Selected Quiz Card (Hiển thị nổi bật bộ đề đang được chọn) */}
            {currentQuiz && !isChangingQuiz ? (
              <div className="bg-gradient-to-r from-teal-900/60 via-emerald-950/50 to-teal-900/60 border-2 border-emerald-400/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(16,185,129,0.2)]">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-2xl text-teal-950 shadow-md shrink-0">
                    📚
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                        {currentQuiz.topic || "Tổng Hợp"}
                      </span>
                      <span className="text-xs text-cyan-300/70 font-semibold">
                        {(currentQuiz as any).slide_count ?? (currentQuiz as any).slides?.length ?? (currentQuiz as any).total_slides ?? 0} câu hỏi
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-white font-serif truncate mt-0.5">
                      {currentQuiz.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black text-emerald-300 flex items-center gap-1 bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-400/30">
                    <Check size={14} strokeWidth={3} /> Đã Chọn
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsChangingQuiz(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-200 text-xs font-bold border border-cyan-400/30 transition-all"
                  >
                    Thay Đổi
                  </button>
                </div>
              </div>
            ) : (
              /* Quiz Picker Grid (Giao diện tìm kiếm và chọn bộ đề) */
              <div className="bg-white/[0.02] border border-cyan-400/20 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/60 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={quizSearch}
                      onChange={(e) => setQuizSearch(e.target.value)}
                      placeholder="Tìm kiếm bộ đề theo tên hoặc chủ đề..."
                      className="w-full pl-8 pr-7 py-2 bg-white/5 border border-cyan-400/25 rounded-xl text-xs text-white placeholder:text-cyan-300/40 outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                    />
                    {quizSearch && (
                      <button
                        type="button"
                        onClick={() => setQuizSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-300/60 hover:text-white text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Topic Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setQuizTopicFilter("ALL")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        quizTopicFilter === "ALL"
                          ? "bg-cyan-400 text-teal-950 font-black shadow-sm"
                          : "bg-white/5 text-cyan-200 hover:bg-white/10"
                      }`}
                    >
                      Tất Cả
                    </button>
                    {availableTopics.slice(0, 4).map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => setQuizTopicFilter(topic)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          quizTopicFilter === topic
                            ? "bg-cyan-400 text-teal-950 font-black shadow-sm"
                            : "bg-white/5 text-cyan-200 hover:bg-white/10"
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quizzes List */}
                {loadingQuizzes ? (
                  <div className="py-8 text-center text-cyan-300 flex items-center justify-center gap-2 text-xs font-bold">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Đang tải danh sách bộ đề câu hỏi...</span>
                  </div>
                ) : filteredQuizzes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
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
                          className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                              : "bg-white/5 border-cyan-400/20 hover:border-cyan-400/40 text-cyan-100"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs sm:text-sm text-white truncate">
                              {quiz.title}
                            </div>
                            <div className="text-[11px] text-cyan-300/70 flex items-center gap-2 mt-0.5">
                              <span className="font-semibold text-emerald-300">
                                {quiz.topic || "Môn học"}
                              </span>
                              <span>•</span>
                              <span>
                                {(quiz as any).slide_count ?? (quiz as any).slides?.length ?? (quiz as any).total_slides ?? 0} câu
                              </span>
                            </div>
                          </div>

                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-emerald-400 border-emerald-400 text-teal-950"
                                : "border-cyan-400/30"
                            }`}
                          >
                            {isSelected && <Check size={10} strokeWidth={3.5} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-cyan-300/70 text-xs">
                    <p className="font-bold">Không tìm thấy bộ đề nào!</p>
                    <button
                      type="button"
                      onClick={() => router.push("/quiz/create")}
                      className="mt-2 text-amber-300 hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <Plus size={14} /> Tạo bộ đề mới ngay
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              BƯỚC 2: CHẾ ĐỘ VẬN HÀNH PHÒNG (ROOM MODE)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-cyan-100 flex items-center gap-2 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-lg bg-cyan-400/20 text-cyan-300 flex items-center justify-center text-xs">
                  2
                </span>
                Chế Độ Vận Hành Phòng
              </label>
              <span className="text-[11px] text-cyan-300/70">
                Chọn cách thức dẫn dắt tiến độ thi đấu
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <ModeOptionCard
                mode="HOST_PACED"
                label="Chế Độ Lớp Học (Classic Host)"
                icon="👑"
                desc="Chủ phòng kiểm soát từng slide, thi đua thời gian thực trên màn hình lớn."
                selected={selectedMode === "HOST_PACED"}
                onClick={() => setSelectedMode("HOST_PACED")}
              />
              <ModeOptionCard
                mode="PLAYER_PACED"
                label="Tự Luyện Tập (Player-Paced)"
                icon="🚀"
                desc="Người chơi tự bấm bắt đầu, làm bài theo tốc độ cá nhân, tự do bứt phá."
                selected={selectedMode === "PLAYER_PACED"}
                onClick={() => setSelectedMode("PLAYER_PACED")}
              />
              <ModeOptionCard
                mode="ASYNC_TOURNAMENT"
                label="Giải Đấu Mở (Bảng Xếp Hạng)"
                icon="🏆"
                desc="Mở phòng dài hạn có timer Redis độc lập, lưu nháp tự động mỗi 30s."
                selected={selectedMode === "ASYNC_TOURNAMENT"}
                onClick={() => setSelectedMode("ASYNC_TOURNAMENT")}
              />
            </div>
          </div>
        </div>

        {/* ── FOOTER ACTIONS & SUMMARY ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-cyan-400/20 shrink-0 relative z-10">
          <div className="flex items-center gap-2 text-xs text-cyan-200/80 overflow-hidden">
            <span className="text-cyan-300 font-semibold shrink-0">Đã chọn:</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-white font-bold flex items-center gap-1.5 truncate">
              <span>📚</span>
              <span className="truncate max-w-[150px] sm:max-w-[200px]">
                {currentQuiz ? currentQuiz.title : "Chưa chọn đề"}
              </span>
            </span>
            <span className="text-cyan-400/40 shrink-0">•</span>
            <span className="text-cyan-200 font-medium truncate shrink-0">
              {selectedMode === "HOST_PACED" && "Lớp Học"}
              {selectedMode === "PLAYER_PACED" && "Tự Luyện"}
              {selectedMode === "ASYNC_TOURNAMENT" && "Giải Đấu"}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-cyan-100 font-bold border border-cyan-300/30 transition-colors text-sm"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              disabled={creating || !selectedQuizId}
              onClick={handleStartGame}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-black shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-teal-950 border-t-transparent rounded-full animate-spin" />
                  <span>Đang Mở Phòng...</span>
                </>
              ) : (
                <>
                  <Gamepad2 size={18} />
                  <span>Khởi Tạo Phòng Chơi Ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
