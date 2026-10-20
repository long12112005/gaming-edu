"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  ArrowLeft,
  Play,
  BookOpen,
  Clock,
  Zap,
  Users,
  Pencil,
  Star,
  Check,
  X,
  Globe,
  Lock,
  Plus,
  Sparkles,
  Compass,
  Link2,
} from "lucide-react";
import { api } from "@/lib/api";
import SiteHeader from "@/components/layout/SiteHeader";

// ─── Component Nút Bấm Tiên Môn ───────────────────────────
function ActionButton({
  icon: Icon,
  label,
  variant = "primary",
  onClick,
  disabled,
  fullWidth,
  id,
}: any) {
  const baseClasses = `relative flex items-center justify-center gap-2 font-black rounded-2xl transition-all duration-200 active:scale-95 ${
    fullWidth ? "w-full py-4 text-lg" : "px-6 py-3 text-base"
  }`;
  
  const variants: any = {
    primary: "bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-teal-950 shadow-[0_0_20px_rgba(251,191,36,0.35)]",
    secondary: "bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-teal-950 shadow-[0_0_20px_rgba(56,189,248,0.3)]",
    outline: "bg-white/10 hover:bg-white/15 text-cyan-100 border border-cyan-300/30",
    disabled: "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed shadow-none",
  };

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${disabled ? variants.disabled : variants[variant]}`}
    >
      {Icon && <Icon size={20} className={disabled ? "text-white/30" : "text-current"} />}
      {label}
    </button>
  );
}

// ─── Slide Preview Card ───────────────────────────────────────────────────────
function SlidePreviewCard({ slide, index }: { slide: any; index: number }) {
  const typeIcon: Record<string, string> = {
    QUIZ: "🎯",
    FILL_IN_BLANK: "✏️",
    MATCHING: "🔗",
    POLL: "📊",
    WORD_CLOUD: "☁️",
  };
  const typeLabel: Record<string, string> = {
    QUIZ: "Trắc Nghiệm",
    FILL_IN_BLANK: "Điền Khuyết",
    MATCHING: "Ghép Nối",
    POLL: "Bình Chọn",
    WORD_CLOUD: "Đám Mây Từ",
  };

  const optionLetters = ["A", "B", "C", "D"];
  const optionBg = [
    "bg-red-500/20 border-red-400/40 text-red-100",
    "bg-blue-500/20 border-blue-400/40 text-blue-100",
    "bg-amber-500/20 border-amber-400/40 text-amber-100",
    "bg-emerald-500/20 border-emerald-400/40 text-emerald-100",
  ];

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-cyan-400/25 p-5 hover:border-cyan-300/50 transition-all font-sans">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-cyan-400/20 border border-cyan-300/30 rounded-xl flex items-center justify-center text-sm font-black text-cyan-200">
            {index + 1}
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg border border-cyan-300/20 bg-white/5 text-cyan-200">
            {typeIcon[slide.type]} {typeLabel[slide.type] ?? slide.type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-cyan-200/70 bg-white/5 px-2.5 py-1 rounded-lg border border-cyan-300/10">
          <span className="flex items-center gap-1"><Clock size={13} /> {slide.timeLimit ?? 30}s</span>
          <span className="flex items-center gap-1"><Zap size={13} className="text-amber-300" /> {slide.points ?? 1000}</span>
        </div>
      </div>

      <p className="font-bold text-white text-base mb-4 line-clamp-2">
        {slide.questionText}
      </p>

      {/* QUIZ & POLL Options */}
      {(slide.type === "QUIZ" || slide.type === "POLL") && slide.options && slide.options.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {slide.options.slice(0, 6).map((opt: any, idx: number) => (
            <div
              key={opt.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-sm font-semibold transition-all ${
                optionBg[idx % 4]
              } ${opt.isCorrect ? "shadow-[0_0_15px_rgba(52,211,153,0.3)] border-emerald-400 bg-emerald-500/25 ring-1 ring-emerald-400" : ""}`}
            >
              <div className="w-6 h-6 bg-white/10 rounded-md flex items-center justify-center text-xs text-white shrink-0 font-black">
                {optionLetters[idx]}
              </div>
              <span className="truncate">{opt.content}</span>
              {opt.isCorrect && (
                <div className="w-5 h-5 bg-emerald-400 text-teal-950 rounded-full flex items-center justify-center shrink-0 ml-auto font-black">
                  <Check size={12} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MATCHING Pairs Preview */}
      {slide.type === "MATCHING" && slide.options && slide.options.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Link2 size={13} /> Các cặp ghép nối ({slide.options.length} cặp):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {slide.options.map((opt: any, idx: number) => (
              <div
                key={opt.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-400/30 text-xs font-bold"
              >
                <span className="text-white truncate max-w-[45%]">{opt.content}</span>
                <span className="text-cyan-400 shrink-0 font-black">🔗</span>
                <span className="text-amber-300 truncate max-w-[45%] text-right">{opt.matchingPair || "–"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILL_IN_BLANK Blanks Preview */}
      {slide.type === "FILL_IN_BLANK" && slide.options && slide.options.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>✏️</span> Vị trí từ khóa ({slide.options.length} ô trống):
          </div>
          <div className="flex flex-wrap gap-2">
            {slide.options.map((opt: any, idx: number) => (
              <div
                key={opt.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-400/30 text-xs font-bold text-amber-200"
              >
                <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-black shrink-0">
                  #{idx + 1}
                </span>
                <span className="text-white font-extrabold">{opt.content}</span>
                {opt.blankKeywords && opt.blankKeywords !== opt.content && (
                  <span className="text-amber-300/60 text-[11px] font-medium truncate max-w-[150px]">
                    ({opt.blankKeywords})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WORD_CLOUD Preview */}
      {slide.type === "WORD_CLOUD" && (
        <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-400/20 text-xs text-sky-200/80 italic text-center">
          ☁️ Khảo sát và tổng hợp đám mây từ trực tiếp từ người chơi
        </div>
      )}
    </div>
  );
}

// ─── Mode Selector ─────────────────────────────────────────────────────────────
function ModeOption({
  label,
  icon,
  desc,
  selected,
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
        selected
          ? "border-amber-300 bg-amber-400/20 text-white shadow-[0_0_20px_rgba(251,191,36,0.25)] scale-[1.01]"
          : "border-cyan-400/20 bg-white/5 text-cyan-100 hover:bg-white/10 hover:border-cyan-300/30"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center text-2xl shrink-0">
          {icon}
        </div>
        <div>
          <div className="font-bold text-base text-white">{label}</div>
          <div className="text-xs text-cyan-200/70 mt-0.5">{desc}</div>
        </div>
        {selected && (
          <div className="ml-auto w-7 h-7 bg-amber-400 text-teal-950 rounded-full flex items-center justify-center font-black shrink-0">
            <Check size={16} />
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>("HOST_PACED");

  const isLoggedIn = !!Cookies.get("token");

  useEffect(() => {
    let isMounted = true;
    async function loadQuiz() {
      try {
        const res = await api.get(`/quizzes/${quizId}`);
        if (isMounted) {
          if (res.data.success) {
            setQuiz(res.data.data);
          } else {
            setNotFound(true);
          }
        }
      } catch {
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadQuiz();
    return () => {
      isMounted = false;
    };
  }, [quizId]);

  const handleStartGame = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setCreating(true);
    try {
      const res = await api.post("/rooms", {
        quizId,
        mode: selectedMode,
      });
      if (res.data.success) {
        const room = res.data.data;
        router.push(`/host/${room.id}?pin=${room.pinCode}`);
      }
    } catch {
      alert("Lỗi khi tạo phòng. Vui lòng thử lại.");
    } finally {
      setCreating(false);
      setShowModeModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#10434b] text-white flex items-center justify-center font-serif">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-amber-300 rounded-full animate-spin" />
          <p className="text-cyan-200 text-lg tracking-wider animate-pulse">Đang thẩm duyệt bảo điển...</p>
        </div>
      </div>
    );
  }

  if (notFound || !quiz) {
    return (
      <div className="min-h-screen bg-[#10434b] text-white flex flex-col items-center justify-center gap-6 p-4 text-center font-serif">
        <div className="w-24 h-24 bg-white/10 rounded-3xl border border-red-400/30 flex items-center justify-center text-red-300">
          <X size={48} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Không Tìm Thấy Bộ Đề</h1>
          <p className="text-base text-cyan-200/70 font-sans mb-6">Bộ đề này không tồn tại hoặc đã được ẩn giấu.</p>
        </div>
        <ActionButton label="Quay Về Khám Phá" onClick={() => router.push("/explore")} icon={ArrowLeft} />
      </div>
    );
  }

  const slides = quiz.slides ?? [];
  const publishedSlides = slides.filter((s: any) => s.status === "PUBLISHED");

  return (
    <div className="min-h-screen bg-[#10434b] text-[#E6F2F5] font-serif flex flex-col relative overflow-hidden pb-16">
      {/* Background celestial glow */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

      <SiteHeader />

      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-24 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* CỘT TRÁI: THÔNG TIN BỘ ĐỀ */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-[32px] border border-cyan-400/30 overflow-hidden shadow-[0_16px_40px_rgba(8,38,42,0.4)]">
              <div className="relative h-60 bg-black/20 p-4">
                <img
                  src={quiz.coverImageUrl ?? "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=350&fit=crop"}
                  alt={quiz.title}
                  className="w-full h-full object-cover rounded-2xl border border-white/20 shadow-md"
                />
                
                {/* Tags */}
                <div className="absolute top-6 left-6 flex gap-2">
                  {quiz.topic && (
                    <span className="bg-emerald-500/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-xl uppercase border border-emerald-300/40">
                      {quiz.topic}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-100 bg-black/50 backdrop-blur-md px-3 py-1 rounded-xl border border-white/20">
                    {quiz.isPublic ? <><Globe size={13} className="text-cyan-300" /> Công khai</> : <><Lock size={13} className="text-amber-300"/> Riêng tư</>}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h1 className="font-bold text-2xl text-white tracking-tight leading-snug mb-5 font-serif">
                  {quiz.title}
                </h1>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6 font-sans">
                  {[
                    { icon: BookOpen, value: slides.length, label: "Câu hỏi", color: "text-cyan-300" },
                    { icon: Play, value: quiz.playCount ?? 0, label: "Lượt chơi", color: "text-emerald-300" },
                    { icon: Star, value: "4.8", label: "Đánh giá", color: "text-amber-300" },
                  ].map(({ icon: Icon, value, label, color }) => (
                    <div key={label} className="rounded-2xl p-3 text-center border border-cyan-400/20 bg-white/5">
                      <Icon size={20} className={`${color} mx-auto mb-1.5`} />
                      <div className="font-bold text-white text-base">{value}</div>
                      <div className="text-[11px] font-semibold text-cyan-200/60 uppercase">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Tác giả */}
                <div className="flex items-center gap-3.5 p-3.5 bg-white/5 rounded-2xl border border-cyan-400/20 font-sans">
                  <img
                    src={quiz.creatorAvatar ?? `https://ui-avatars.com/api/?name=${quiz.creatorNickname}&background=072428&color=38bdf8&size=48`}
                    alt={quiz.creatorNickname}
                    className="w-10 h-10 rounded-xl border border-cyan-400/30"
                  />
                  <div>
                    <div className="text-[11px] font-semibold text-cyan-200/60 uppercase">Tạo bởi</div>
                    <div className="font-bold text-white text-sm">{quiz.creatorNickname || "Người Dùng Ẩn Danh"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hành Động Mở Phòng */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 rounded-[32px] border border-cyan-400/30 space-y-3 font-sans">
              <ActionButton
                variant="primary"
                fullWidth
                icon={Play}
                label="MỞ PHÒNG THI ĐẤU"
                disabled={publishedSlides.length === 0 || creating}
                onClick={() => isLoggedIn ? setShowModeModal(true) : router.push("/login")}
              />
              <ActionButton
                variant="secondary"
                fullWidth
                icon={Users}
                label="THAM GIA PHÒNG CHƠI"
                onClick={() => router.push("/play")}
              />
              {isLoggedIn && (
                <ActionButton 
                  variant="outline" 
                  fullWidth
                  icon={Pencil} 
                  label="CHỈNH SỬA CÂU HỎI" 
                  onClick={() => router.push(`/quiz/${quizId}/edit`)} 
                />
              )}
              {publishedSlides.length === 0 && (
                <div className="p-3 bg-amber-500/20 border border-amber-400/40 rounded-xl text-center">
                  <span className="font-semibold text-amber-200 text-xs">⚠️ Bộ đề chưa có câu hỏi nào được Publish. Hãy nhấn Chỉnh Sửa để hoàn thiện.</span>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: DANH SÁCH CÂU HỎI */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-5 rounded-2xl border border-cyan-400/30 flex items-center justify-between sticky top-24 z-20">
              <div>
                <h2 className="font-bold text-xl text-white font-serif">Danh Sách Câu Hỏi</h2>
                <p className="text-cyan-200/70 text-xs font-sans mt-0.5">Tổng cộng {slides.length} câu đã soạn</p>
              </div>
              {isLoggedIn && (
                <ActionButton 
                  variant="outline"
                  icon={Plus}
                  label="Thêm Mới"
                  onClick={() => router.push(`/quiz/${quizId}/edit`)}
                />
              )}
            </div>

            {slides.length === 0 ? (
              <div className="bg-white/5 rounded-3xl border-2 border-dashed border-cyan-400/20 p-12 text-center font-sans">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-300">
                  <BookOpen size={32} />
                </div>
                <h3 className="font-bold text-lg text-white mb-1">Chưa có câu hỏi nào</h3>
                <p className="text-sm text-cyan-200/70 mb-5">Thêm câu hỏi để sẵn sàng mở phòng thi đấu!</p>
                {isLoggedIn && (
                  <ActionButton 
                    variant="primary"
                    icon={Plus}
                    label="Soạn Câu Hỏi Đầu Tiên"
                    onClick={() => router.push(`/quiz/${quizId}/edit`)}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {slides.map((slide: any, idx: number) => (
                  <SlidePreviewCard key={slide.id} slide={slide} index={idx} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL CHỌN CHẾ ĐỘ CHƠI */}
      {showModeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#08282e] border-2 border-cyan-400/40 rounded-[32px] p-6 md:p-8 w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.6)] font-sans space-y-6">
            <div className="text-center">
              <h3 className="font-bold text-2xl text-white font-serif mb-1">Chọn Chế Độ Thi Đấu</h3>
              <p className="text-sm text-cyan-200/70">Thiết lập quy luật và cách thức thi đấu cho phòng chơi</p>
            </div>

            <div className="space-y-3">
              <ModeOption
                mode="HOST_PACED"
                label="Chế Độ Lớp Học (Classic Host)"
                icon="👑"
                desc="Người dẫn (Host) kiểm soát tiến độ từng câu hỏi, người chơi thi đua tốc độ và độ chính xác!"
                selected={selectedMode === "HOST_PACED"}
                onClick={() => setSelectedMode("HOST_PACED")}
              />
              <ModeOption
                mode="PLAYER_PACED"
                label="Tự Luyện Tập (Player-Paced)"
                icon="🚀"
                desc="Người tham gia tự làm bài theo tốc độ cá nhân, tự do bứt phá kiến thức"
                selected={selectedMode === "PLAYER_PACED"}
                onClick={() => setSelectedMode("PLAYER_PACED")}
              />
              <ModeOption
                mode="ASYNC_TOURNAMENT"
                label="Giải Đấu Mở (Bảng Xếp Hạng)"
                icon="🏆"
                desc="Mở phòng làm bài dài hạn, thi đua vị trí dẫn đầu trên bảng xếp hạng"
                selected={selectedMode === "ASYNC_TOURNAMENT"}
                onClick={() => setSelectedMode("ASYNC_TOURNAMENT")}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModeModal(false)}
                className="flex-1 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-cyan-100 font-bold border border-cyan-300/30 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={handleStartGame}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-black shadow-[0_0_20px_rgba(251,191,36,0.35)] transition-all disabled:opacity-50"
              >
                {creating ? "Đang Mở Phòng..." : "Khởi Tạo Phòng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
