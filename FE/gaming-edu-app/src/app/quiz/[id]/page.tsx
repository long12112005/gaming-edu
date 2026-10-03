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
  ChevronRight,
  Check,
  X,
  BarChart2,
  Globe,
  Lock,
  Plus,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";

// ─── Slide Preview Card ───────────────────────────────────────────────────────
function SlidePreviewCard({
  slide,
  index,
}: {
  slide: any;
  index: number;
}) {
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
    QUIZ: "bg-violet-50 border-violet-200 text-violet-700",
    FILL_IN_BLANK: "bg-blue-50 border-blue-200 text-blue-700",
    MATCHING: "bg-amber-50 border-amber-200 text-amber-700",
    POLL: "bg-pink-50 border-pink-200 text-pink-700",
    WORD_CLOUD: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };

  const optionLetters = ["A", "B", "C", "D"];
  const optionBg = [
    "bg-red-100 text-red-700 border-red-200",
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-yellow-100 text-yellow-700 border-yellow-200",
    "bg-green-100 text-green-700 border-green-200",
  ];

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-fade-in-up card-hover"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-800 text-gray-500 flex-shrink-0">
            {index + 1}
          </span>
          <span
            className={`text-xs font-700 px-2 py-0.5 rounded-full border ${
              typeColor[slide.type] ?? "bg-gray-100 text-gray-700 border-gray-200"
            }`}
          >
            {typeIcon[slide.type]} {typeLabel[slide.type] ?? slide.type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
          <span className="flex items-center gap-1">
            <Clock size={11} /> {slide.timeLimit ?? 30}s
          </span>
          <span className="flex items-center gap-1">
            <Zap size={11} /> {slide.points ?? 1000} pts
          </span>
        </div>
      </div>

      <p className="font-700 text-gray-900 text-sm mb-3 line-clamp-2">
        {slide.questionText}
      </p>

      {/* Show options for QUIZ type */}
      {slide.type === "QUIZ" && slide.options && slide.options.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {slide.options.slice(0, 4).map((opt: any, idx: number) => (
            <div
              key={opt.id}
              className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-600 ${
                optionBg[idx % 4]
              } ${opt.isCorrect ? "ring-2 ring-green-400" : ""}`}
            >
              <span className="font-800 flex-shrink-0">{optionLetters[idx]}</span>
              <span className="truncate">{opt.content}</span>
              {opt.isCorrect && (
                <Check size={12} className="text-green-600 ml-auto flex-shrink-0" />
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
}: {
  mode: string;
  label: string;
  icon: string;
  desc: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? `${color} shadow-md`
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
      id={`btn-mode-${mode}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="font-700 text-sm text-gray-900">{label}</div>
          <div className="text-xs text-gray-500">{desc}</div>
        </div>
        {selected && (
          <Check
            size={16}
            className="ml-auto text-violet-600 flex-shrink-0"
          />
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
      router.push("/auth/login");
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-600">Đang tải bộ đề...</p>
        </div>
      </div>
    );
  }

  if (notFound || !quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-4 text-center">
        <X size={48} className="text-red-400" />
        <h1 className="text-2xl font-800 text-gray-900">Không tìm thấy bộ đề</h1>
        <p className="text-gray-500">Bộ đề này không tồn tại hoặc đã bị xóa.</p>
        <Button variant="primary" href="/">Về Trang Chủ</Button>
      </div>
    );
  }

  const slides = quiz.slides ?? [];
  const publishedSlides = slides.filter((s: any) => s.status === "PUBLISHED");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              id="btn-back"
            >
              <ArrowLeft size={18} />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <Trophy size={14} className="text-white" />
              </div>
              <span className="font-800 text-gray-900 hidden sm:block">
                <span className="text-violet-600">Gaming</span> Edu
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <Button variant="outline" size="sm" id="btn-edit-quiz" href={`/quiz/${quizId}/edit`}>
                <Pencil size={13} /> Chỉnh Sửa
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                isLoggedIn ? setShowModeModal(true) : router.push("/auth/login")
              }
              disabled={publishedSlides.length === 0}
              id="btn-start-quiz"
            >
              <Play size={13} /> Bắt Đầu Ngay
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT: Quiz Info ───────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Cover Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
              <div className="relative h-44 bg-gray-100">
                <img
                  src={
                    quiz.coverImageUrl ??
                    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=350&fit=crop"
                  }
                  alt={quiz.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {quiz.topic && (
                  <span className="absolute top-3 left-3 bg-violet-600 text-white text-xs font-700 px-2.5 py-1 rounded-full uppercase">
                    {quiz.topic}
                  </span>
                )}
                <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-700 text-white bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                  {quiz.isPublic ? (
                    <>
                      <Globe size={10} /> Công khai
                    </>
                  ) : (
                    <>
                      <Lock size={10} /> Riêng tư
                    </>
                  )}
                </span>
              </div>

              <div className="p-4">
                <h1 className="font-900 text-gray-900 text-lg leading-tight mb-3">
                  {quiz.title}
                </h1>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    {
                      icon: BookOpen,
                      value: slides.length,
                      label: "Câu hỏi",
                    },
                    {
                      icon: Play,
                      value: quiz.playCount ?? 0,
                      label: "Lượt chơi",
                    },
                    {
                      icon: Star,
                      value: "4.8",
                      label: "Đánh giá",
                    },
                  ].map(({ icon: Icon, value, label }) => (
                    <div
                      key={label}
                      className="bg-gray-50 rounded-xl p-2.5 text-center"
                    >
                      <Icon size={14} className="text-violet-600 mx-auto mb-1" />
                      <div className="font-800 text-gray-900 text-sm">
                        {value}
                      </div>
                      <div className="text-xs text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Creator */}
                {quiz.creatorNickname && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <img
                      src={
                        quiz.creatorAvatar ??
                        `https://ui-avatars.com/api/?name=${quiz.creatorNickname}&background=7c3aed&color=fff&size=32`
                      }
                      alt={quiz.creatorNickname}
                      className="w-7 h-7 rounded-full border border-gray-200"
                    />
                    <span className="font-600">{quiz.creatorNickname}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() =>
                  isLoggedIn ? setShowModeModal(true) : router.push("/auth/login")
                }
                disabled={publishedSlides.length === 0 || creating}
                className="font-800"
                id="btn-start-main"
              >
                <Play size={18} /> Bắt Đầu Trò Chơi
              </Button>

              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => router.push("/play")}
                id="btn-join-instead"
              >
                <Users size={15} /> Tham Gia Với PIN
              </Button>

              {publishedSlides.length === 0 && (
                <p className="text-xs text-amber-600 text-center bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                  ⚠️ Bộ đề chưa có câu hỏi nào được published
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT: Slides List ────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-800 text-gray-900">
                  Danh Sách Câu Hỏi
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {slides.length} câu hỏi ({publishedSlides.length} đã publish)
                </p>
              </div>
              {isLoggedIn && (
                <Button variant="outline" size="sm" id="btn-edit-slides" href={`/quiz/${quizId}/edit`}>
                  <Pencil size={13} /> Thêm / Sửa
                </Button>
              )}
            </div>

            {slides.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="font-700 text-gray-500 mb-2">
                  Chưa có câu hỏi nào
                </p>
                {isLoggedIn && (
                    <Button variant="primary" size="sm" href={`/quiz/${quizId}/edit`}>
                      <Plus size={14} /> Thêm Câu Hỏi
                    </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {slides.map((slide: any, idx: number) => (
                  <SlidePreviewCard key={slide.id} slide={slide} index={idx} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── MODE SELECTION MODAL ─────────────────────────────────────────── */}
      {showModeModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setShowModeModal(false)
          }
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in-up">
            <h3 className="font-800 text-gray-900 text-lg mb-1">
              Chọn Chế Độ Chơi
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Chọn hình thức phù hợp với buổi học của bạn.
            </p>

            <div className="space-y-3 mb-6">
              <ModeOption
                mode="HOST_PACED"
                label="Host Điều Khiển"
                icon="🎮"
                desc="Điều khiển tốc độ, phù hợp buổi học trực tiếp"
                color="border-violet-500 bg-violet-50"
                selected={selectedMode === "HOST_PACED"}
                onClick={() => setSelectedMode("HOST_PACED")}
              />
              <ModeOption
                mode="PLAYER_PACED"
                label="Người Chơi Tự Chơi"
                icon="🕹️"
                desc="Tự học, ôn tập theo tốc độ riêng"
                color="border-blue-500 bg-blue-50"
                selected={selectedMode === "PLAYER_PACED"}
                onClick={() => setSelectedMode("PLAYER_PACED")}
              />
              <ModeOption
                mode="ASYNC_TOURNAMENT"
                label="Giải Đấu"
                icon="🏆"
                desc="Bảng xếp hạng toàn cầu, tham gia bất kỳ lúc nào"
                color="border-amber-500 bg-amber-50"
                selected={selectedMode === "ASYNC_TOURNAMENT"}
                onClick={() => setSelectedMode("ASYNC_TOURNAMENT")}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setShowModeModal(false)}
                id="btn-cancel-mode"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                loading={creating}
                onClick={handleStartGame}
                id="btn-confirm-start"
              >
                <Play size={15} /> Bắt Đầu!
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
