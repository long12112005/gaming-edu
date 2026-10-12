"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  Trophy,
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
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Component Nút bấm 3D phong cách UI/UX Pro Max ───────────────────────────
function ActionButton({
  icon: Icon,
  label,
  variant = "primary",
  onClick,
  disabled,
  fullWidth,
  id,
}: any) {
  const baseClasses = `relative flex items-center justify-center gap-2 font-900 rounded-2xl border-4 transition-all duration-200 active:translate-y-2 ${
    fullWidth ? "w-full py-4 text-lg" : "px-6 py-3"
  }`;
  
  const variants: any = {
    primary: "bg-violet-500 border-violet-700 text-white shadow-[0_6px_0_0_#5b21b6] hover:bg-violet-600 active:shadow-none",
    secondary: "bg-pink-500 border-pink-700 text-white shadow-[0_6px_0_0_#be185d] hover:bg-pink-600 active:shadow-none",
    outline: "bg-white border-gray-200 text-gray-700 shadow-[0_6px_0_0_#e5e7eb] hover:bg-gray-50 active:shadow-none",
    disabled: "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed shadow-[0_6px_0_0_#9ca3af]",
  };

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${disabled ? variants.disabled : variants[variant]}`}
    >
      {Icon && <Icon size={20} className={disabled ? "text-gray-400" : "text-current"} />}
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
  const typeColor: Record<string, string> = {
    QUIZ: "bg-violet-100 border-violet-300 text-violet-800",
    FILL_IN_BLANK: "bg-blue-100 border-blue-300 text-blue-800",
    MATCHING: "bg-amber-100 border-amber-300 text-amber-800",
    POLL: "bg-pink-100 border-pink-300 text-pink-800",
    WORD_CLOUD: "bg-emerald-100 border-emerald-300 text-emerald-800",
  };

  const optionLetters = ["A", "B", "C", "D"];
  const optionBg = [
    "bg-red-500 border-red-700 text-white",
    "bg-blue-500 border-blue-700 text-white",
    "bg-amber-400 border-amber-600 text-white",
    "bg-emerald-500 border-emerald-700 text-white",
  ];

  return (
    <div className="bg-white rounded-[24px] border-4 border-gray-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] p-6 hover:-translate-y-1 transition-transform duration-300">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 border-2 border-gray-200 rounded-xl flex items-center justify-center text-lg font-900 text-gray-500">
            {index + 1}
          </div>
          <span className={`text-sm font-800 px-3 py-1 rounded-xl border-2 ${typeColor[slide.type] ?? "bg-gray-100 text-gray-700 border-gray-300"}`}>
            {typeIcon[slide.type]} {typeLabel[slide.type] ?? slide.type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm font-800 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border-2 border-gray-100">
          <span className="flex items-center gap-1.5"><Clock size={16} /> {slide.timeLimit ?? 30}s</span>
          <span className="flex items-center gap-1.5"><Zap size={16} className="text-amber-500" /> {slide.points ?? 1000}</span>
        </div>
      </div>

      <p className="font-800 text-gray-900 text-lg mb-5 line-clamp-2">
        {slide.questionText}
      </p>

      {slide.type === "QUIZ" && slide.options && slide.options.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {slide.options.slice(0, 4).map((opt: any, idx: number) => (
            <div
              key={opt.id}
              className={`flex items-center gap-3 p-3 rounded-2xl border-4 font-800 ${
                optionBg[idx % 4]
              } ${opt.isCorrect ? "shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-4 ring-emerald-300" : "opacity-90"}`}
            >
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white shrink-0">
                {optionLetters[idx]}
              </div>
              <span className="truncate">{opt.content}</span>
              {opt.isCorrect && (
                <div className="w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center shrink-0 ml-auto border-2 border-white">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mode Selector ─────────────────────────────────────────────────────────────
function ModeOption({
  mode,
  label,
  icon,
  desc,
  color,
  selected,
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-[24px] border-4 transition-all duration-200 ${
        selected
          ? `${color} transform scale-[1.02] shadow-[0_8px_0_0_rgba(0,0,0,0.1)]`
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 active:translate-y-1 active:shadow-none shadow-[0_4px_0_0_#e5e7eb]"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-white rounded-[16px] border-2 border-current/20 flex items-center justify-center text-3xl shrink-0">
          {icon}
        </div>
        <div>
          <div className={`font-900 text-lg ${selected ? "text-current" : "text-gray-900"}`}>{label}</div>
          <div className={`text-sm font-600 ${selected ? "text-current/80" : "text-gray-500"}`}>{desc}</div>
        </div>
        {selected && (
          <div className="ml-auto w-8 h-8 bg-current text-white rounded-full flex items-center justify-center border-2 border-white shrink-0">
            <Check size={18} />
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
    api
      .get(`/quizzes/${quizId}`)
      .then((res) => {
        if (res.data.success) setQuiz(res.data.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
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
      <div className="min-h-screen bg-[#F4F1FA] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-8 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-violet-900 font-900 text-xl tracking-tight animate-pulse">Đang nạp bộ đề...</p>
        </div>
      </div>
    );
  }

  if (notFound || !quiz) {
    return (
      <div className="min-h-screen bg-[#F4F1FA] flex flex-col items-center justify-center gap-6 p-4 text-center font-sans">
        <div className="w-32 h-32 bg-white rounded-[32px] border-4 border-red-100 shadow-xl flex items-center justify-center transform rotate-6">
          <X size={64} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-4xl font-900 text-gray-900 tracking-tight mb-2">Ối! Bộ đề chạy đâu mất rồi</h1>
          <p className="text-lg text-gray-600 font-600 mb-8">Có vẻ bộ đề này không tồn tại hoặc đã bị ẩn đi.</p>
        </div>
        <ActionButton label="Quay Về Trang Chủ" onClick={() => router.push("/")} icon={ArrowLeft} />
      </div>
    );
  }

  const slides = quiz.slides ?? [];
  const publishedSlides = slides.filter((s: any) => s.status === "PUBLISHED");

  return (
    <div className="min-h-screen bg-[#F4F1FA] font-sans pb-20">
      {/* ── HEADER BONG BÓNG ── */}
      <header className="bg-white border-b-4 border-gray-200 sticky top-0 z-40 shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.back()}
              className="w-12 h-12 bg-gray-100 border-2 border-gray-200 rounded-2xl flex items-center justify-center text-gray-700 hover:bg-gray-200 hover:-translate-x-1 transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Trophy size={24} className="text-white" />
              </div>
              <span className="font-900 text-2xl text-gray-900 tracking-tight hidden sm:block">
                <span className="text-violet-600">Gaming</span>Edu
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn && (
              <ActionButton 
                variant="outline" 
                icon={Pencil} 
                label="Chỉnh Sửa" 
                onClick={() => router.push(`/quiz/${quizId}/edit`)} 
              />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ── CỘT TRÁI: THÔNG TIN BỘ ĐỀ (CLAYMORPHISM COVER) ── */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-[40px] border-4 border-violet-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05),_inset_-4px_-4px_8px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="relative h-64 bg-violet-50 p-4">
                <img
                  src={quiz.coverImageUrl ?? "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=350&fit=crop"}
                  alt={quiz.title}
                  className="w-full h-full object-cover rounded-[24px] border-4 border-white shadow-md"
                />
                
                {/* Tags */}
                <div className="absolute top-8 left-8 flex gap-2">
                  {quiz.topic && (
                    <span className="bg-white text-violet-700 text-xs font-900 px-3 py-1.5 rounded-xl border-2 border-violet-200 shadow-sm uppercase">
                      {quiz.topic}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs font-900 text-gray-700 bg-white px-3 py-1.5 rounded-xl border-2 border-gray-200 shadow-sm">
                    {quiz.isPublic ? <><Globe size={14} className="text-blue-500" /> Công khai</> : <><Lock size={14} className="text-amber-500"/> Riêng tư</>}
                  </span>
                </div>
              </div>

              <div className="p-8 pt-6">
                <h1 className="font-900 text-3xl text-gray-900 tracking-tight leading-tight mb-6">
                  {quiz.title}
                </h1>

                {/* Thống kê (Stats) */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: BookOpen, value: slides.length, label: "Câu hỏi", color: "text-blue-500", bg: "bg-blue-50 border-blue-200" },
                    { icon: Play, value: quiz.playCount ?? 0, label: "Lượt chơi", color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-200" },
                    { icon: Star, value: "4.8", label: "Đánh giá", color: "text-amber-500", bg: "bg-amber-50 border-amber-200" },
                  ].map(({ icon: Icon, value, label, color, bg }) => (
                    <div key={label} className={`rounded-[20px] p-4 text-center border-2 ${bg}`}>
                      <Icon size={24} className={`${color} mx-auto mb-2`} />
                      <div className="font-900 text-gray-900 text-lg">{value}</div>
                      <div className="text-xs font-800 text-gray-500 uppercase">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Tác giả */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[24px] border-2 border-gray-100">
                  <img
                    src={quiz.creatorAvatar ?? `https://ui-avatars.com/api/?name=${quiz.creatorNickname}&background=7c3aed&color=fff&size=48`}
                    alt={quiz.creatorNickname}
                    className="w-12 h-12 rounded-[16px] border-2 border-white shadow-sm"
                  />
                  <div>
                    <div className="text-xs font-800 text-gray-500 uppercase">Tạo bởi</div>
                    <div className="font-900 text-gray-900 text-lg">{quiz.creatorNickname || "Người Dùng Ẩn Danh"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Các Nút Hành Động Siêu To */}
            <div className="bg-white p-6 rounded-[32px] border-4 border-violet-100 space-y-4">
              <ActionButton
                variant="primary"
                fullWidth
                icon={Play}
                label="MỞ PHÒNG NGAY"
                disabled={publishedSlides.length === 0 || creating}
                onClick={() => isLoggedIn ? setShowModeModal(true) : router.push("/login")}
              />
              <ActionButton
                variant="secondary"
                fullWidth
                icon={Users}
                label="LÀM BÀI TẬP NHÓM"
                onClick={() => router.push("/play")}
              />
              {publishedSlides.length === 0 && (
                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-center">
                  <span className="font-800 text-amber-700 text-sm">⚠️ Bộ đề chưa có câu hỏi nào được Publish. Hãy vào phần Chỉnh Sửa để thêm nhé!</span>
                </div>
              )}
            </div>
          </div>

          {/* ── CỘT PHẢI: DANH SÁCH CÂU HỎI ── */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-[32px] border-4 border-gray-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] flex items-center justify-between sticky top-24 z-30">
              <div>
                <h2 className="font-900 text-2xl text-gray-900 tracking-tight">Danh Sách Câu Hỏi</h2>
                <p className="text-gray-500 font-700">Tổng cộng {slides.length} câu</p>
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
              <div className="bg-white rounded-[32px] border-4 border-dashed border-gray-200 p-16 text-center">
                <div className="w-24 h-24 bg-gray-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 transform rotate-12">
                  <BookOpen size={48} className="text-gray-300" />
                </div>
                <h3 className="font-900 text-xl text-gray-900 mb-2">Bộ đề trống trơn</h3>
                <p className="font-600 text-gray-500 mb-6">Thêm các câu hỏi thú vị để bắt đầu trò chơi nhé!</p>
                {isLoggedIn && (
                  <ActionButton 
                    variant="primary"
                    icon={Plus}
                    label="Tạo Câu Hỏi Đầu Tiên"
                    onClick={() => router.push(`/quiz/${quizId}/edit`)}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {slides.map((slide: any, idx: number) => (
                  <SlidePreviewCard key={slide.id} slide={slide} index={idx} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── MODAL CHỌN CHẾ ĐỘ CHƠI (CLAYMORPHISM) ── */}
      {showModeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] border-4 border-violet-100 shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-8 w-full max-w-lg animate-fade-in-up">
            <div className="text-center mb-8">
              <h3 className="font-900 text-3xl text-gray-900 tracking-tight mb-2">Chọn Chế Độ</h3>
              <p className="font-600 text-gray-500">Cách mà bạn muốn mọi người trải nghiệm bộ đề này</p>
            </div>

            <div className="space-y-4 mb-8">
              <ModeOption
                mode="HOST_PACED"
                label="Classic (Host)"
                icon="👑"
                desc="Bạn là người điều khiển, ai nhanh nhất thắng!"
                color="border-violet-500 bg-violet-100 text-violet-700"
                selected={selectedMode === "HOST_PACED"}
                onClick={() => setSelectedMode("HOST_PACED")}
              />
              <ModeOption
                mode="PLAYER_PACED"
                label="Luyện Tập (Tự Chơi)"
                icon="🚀"
                desc="Người chơi tự bấm chuyển câu, không cần chờ"
                color="border-blue-500 bg-blue-100 text-blue-700"
                selected={selectedMode === "PLAYER_PACED"}
                onClick={() => setSelectedMode("PLAYER_PACED")}
              />
              <ModeOption
                mode="ASYNC_TOURNAMENT"
                label="Giải Đấu Độc Lập"
                icon="🏆"
                desc="Mở phòng dài ngày, đua top trên bảng xếp hạng"
                color="border-amber-500 bg-amber-100 text-amber-700"
                selected={selectedMode === "ASYNC_TOURNAMENT"}
                onClick={() => setSelectedMode("ASYNC_TOURNAMENT")}
              />
            </div>

            <div className="flex gap-4">
              <ActionButton
                variant="outline"
                fullWidth
                label="Hủy Bỏ"
                onClick={() => setShowModeModal(false)}
              />
              <ActionButton
                variant="primary"
                fullWidth
                icon={Play}
                label="Tạo Phòng!"
                disabled={creating}
                onClick={handleStartGame}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
