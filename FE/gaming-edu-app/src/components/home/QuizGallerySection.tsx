"use client";

import { Quiz } from "@/types/database";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { formatNumber } from "@/lib/utils";
import { Play, Users, ChevronRight, Star } from "lucide-react";
import Link from "next/link";

const topicBadgeColors: Record<string, string> = {
  "TOÁN HỌC": "bg-red-500",
  "KHOA HỌC": "bg-amber-500",
  "LỊCH SỬ": "bg-emerald-500",
  "NGỮ VĂN": "bg-blue-500",
};

function QuizCard({ quiz, index }: { quiz: Quiz; index: number }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const badgeColor = topicBadgeColors[quiz.topic ?? ""] ?? "bg-violet-500";

  const handlePlayNow = async () => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    
    setCreating(true);
    try {
      const res = await api.post("/rooms", { quizId: quiz.id, mode: "HOST_PACED" });
      if (res.data.success) {
        const room = res.data.data;
        router.push(`/host/${room.id}?pin=${room.pinCode}`);
      }
    } catch (err) {
      alert("Lỗi khi tạo phòng");
      setCreating(false);
    }
  };

  return (
    <div
      className="group flex-shrink-0 w-60 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
      id={`quiz-card-${quiz.id}`}
    >
      {/* Cover Image — maps to quizzes.cover_image_url */}
      <div className="relative h-36 overflow-hidden bg-gray-100">
        <img
          src={quiz.cover_image_url ?? "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=250&fit=crop"}
          alt={quiz.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Topic Badge — maps to quizzes.topic */}
        {quiz.topic && (
          <span
            className={`absolute top-3 left-3 ${badgeColor} text-white text-xs font-700 px-2.5 py-1 rounded-full uppercase tracking-wide`}
          >
            {quiz.topic}
          </span>
        )}

        {/* Play count overlay */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
          <Play size={10} fill="white" />
          {formatNumber(quiz.play_count ?? 0)} lượt
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title — maps to quizzes.title */}
        <Link href={`/quiz/${quiz.id}`}>
          <h3 className="font-800 text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-violet-700 transition-colors">
            {quiz.title}
          </h3>
        </Link>

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Users size={11} />
            {quiz.slide_count} câu hỏi
          </span>
          <span className="flex items-center gap-1">
            <Star size={11} className="text-yellow-400 fill-yellow-400" />
            4.{index + 6}
          </span>
        </div>

        {/* Creator — maps to creator via users join */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={quiz.creator_avatar ?? `https://ui-avatars.com/api/?name=${quiz.creator_nickname}&background=7c3aed&color=fff&size=32`}
              alt={quiz.creator_nickname}
              className="w-6 h-6 rounded-full border border-gray-200"
            />
            <span className="text-xs text-gray-500 font-600 truncate max-w-[80px]">
              {quiz.creator_nickname}
            </span>
          </div>

          <button
            onClick={handlePlayNow}
            disabled={creating}
            className="text-xs font-700 text-violet-600 hover:text-violet-800 flex items-center gap-0.5 group/btn disabled:opacity-50"
            id={`btn-play-quiz-${quiz.id}`}
          >
            {creating ? "Đang tạo..." : "Chơi Ngay"}
            {!creating && (
              <ChevronRight
                size={13}
                className="group-hover/btn:translate-x-0.5 transition-transform"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuizGallerySection() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/quizzes").then((res) => {
      setQuizzes(res.data.data);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-900 text-gray-900 mb-1">
              Khám Phá Trò Chơi
            </h2>
            <p className="text-sm text-gray-500">
              Hàng triệu trò chơi hấp dẫn, được xây dựng tốt bởi giáo viên trên toàn thế giới.
            </p>
          </div>
          <Link
            href="#"
            className="hidden sm:flex items-center gap-1 text-sm font-700 text-violet-600 hover:text-violet-800 whitespace-nowrap group transition-colors"
            id="link-view-all-quizzes"
          >
            Xem Tất Cả
            <ChevronRight
              size={15}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </Link>
        </div>

        {/* Horizontal scroll quiz grid */}
        <div className="scroll-container">
          {loading ? (
             <div className="text-sm text-gray-500 p-4">Đang tải bộ đề...</div>
          ) : quizzes.map((quiz, idx) => (
            <QuizCard key={quiz.id} quiz={quiz} index={idx} />
          ))}
          {/* "View all" card at end */}
          <div className="flex-shrink-0 w-60 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border-2 border-dashed border-violet-200 flex flex-col items-center justify-center gap-3 card-hover cursor-pointer min-h-[260px] p-6">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
              <ChevronRight size={22} className="text-violet-600" />
            </div>
            <span className="font-700 text-violet-700 text-sm text-center">
              Xem thêm<br />bộ đề
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
