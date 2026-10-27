"use client";

import { Quiz } from "@/types/database";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/utils";
import {
  Play,
  Users,
  ChevronRight,
  Star,
  BookOpen,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface QuizGallerySectionProps {
  onSelectQuiz?: (quizId: string) => void;
}

const TOPIC_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "TOÁN HỌC": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "KHOA HỌC": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "LỊCH SỬ": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "NGỮ VĂN": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "NGOẠI NGỮ": { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  "CÔNG NGHỆ": { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
};

const DEFAULT_QUIZZES: Partial<Quiz>[] = [
  {
    id: "demo-1",
    title: "Đại Chiến Hải Trình: Toán Học & Tư Duy Logic",
    topic: "TOÁN HỌC",
    slide_count: 15,
    play_count: 1240,
    creator_nickname: "Thầy Hùng",
    cover_image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=380&fit=crop",
  },
  {
    id: "demo-2",
    title: "Chinh Phục Đại Dương: Từ Vựng Tiếng Anh Giao Tiếp",
    topic: "NGOẠI NGỮ",
    slide_count: 20,
    play_count: 2890,
    creator_nickname: "Cô Mai Anh",
    cover_image_url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&h=380&fit=crop",
  },
  {
    id: "demo-3",
    title: "Khám Phá Vũ Trụ & Các Định Luật Vật Lý",
    topic: "KHOA HỌC",
    slide_count: 12,
    play_count: 980,
    creator_nickname: "Khoa Học Trẻ",
    cover_image_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=380&fit=crop",
  },
  {
    id: "demo-4",
    title: "Những Trận Chiến Lừng Lẫy Lịch Sử Việt Nam",
    topic: "LỊCH SỬ",
    slide_count: 10,
    play_count: 3120,
    creator_nickname: "Sử Việt Hào Hùng",
    cover_image_url: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&h=380&fit=crop",
  },
];

export default function QuizGallerySection({ onSelectQuiz }: QuizGallerySectionProps) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState<string>("ALL");

  useEffect(() => {
    let isMounted = true;
    api
      .get("/quizzes")
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.success && Array.isArray(res.data.data)) {
          setQuizzes(res.data.data);
        } else if (Array.isArray(res.data)) {
          setQuizzes(res.data);
        }
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const displayQuizzes = useMemo(() => {
    const source = quizzes.length > 0 ? quizzes : (DEFAULT_QUIZZES as Quiz[]);
    if (activeTopic === "ALL") return source;
    return source.filter(
      (q) => q.topic && q.topic.toUpperCase().includes(activeTopic.toUpperCase())
    );
  }, [quizzes, activeTopic]);

  const topics = ["ALL", "TOÁN HỌC", "NGOẠI NGỮ", "KHOA HỌC", "LỊCH SỬ"];

  return (
    <section className="py-12 sm:py-16 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black uppercase tracking-wider mb-2 font-heading">
              <TrendingUp size={13} />
              <span>THƯ VIỆN BỘ ĐỀ CỘNG ĐỒNG</span>
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Kho Bộ Đề Trắc Nghiệm Nổi Bật
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Hàng ngàn bộ đề được thiết kế chuẩn sư phạm, sẵn sàng đưa vào đấu trường Hải Tặc Tri Thức hoặc phòng chơi trực tiếp.
            </p>
          </div>

          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-heading font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>Xem tất cả thư viện</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {topics.map((t) => {
            const isActive = activeTopic === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTopic(t)}
                className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "ALL" ? "Tất Cả Chủ Đề" : t}
              </button>
            );
          })}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayQuizzes.map((quiz, idx) => {
            const topicInfo = TOPIC_COLORS[quiz.topic?.toUpperCase() || ""] || {
              bg: "bg-indigo-50",
              text: "text-indigo-700",
              border: "border-indigo-200",
            };
            const slideCount =
              quiz.slide_count ?? (quiz as any).total_slides ?? 10;
            const playCount = quiz.play_count ?? 150 + idx * 45;

            return (
              <div
                key={quiz.id || idx}
                className="bg-white rounded-2xl border-2 border-slate-200/90 hover:border-indigo-300 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                    <img
                      src={
                        quiz.cover_image_url ||
                        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=380&fit=crop"
                      }
                      alt={quiz.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

                    {quiz.topic && (
                      <span
                        className={`absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${topicInfo.bg} ${topicInfo.text} ${topicInfo.border} shadow-2xs`}
                      >
                        {quiz.topic}
                      </span>
                    )}

                    <div className="absolute bottom-2.5 right-3 flex items-center gap-1 text-[11px] font-bold text-white/90">
                      <Play size={10} fill="white" />
                      <span>{formatNumber(playCount)} lượt chơi</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 sm:p-5">
                    <h3 className="font-heading font-black text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors mb-2">
                      {quiz.title}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold">
                        <Users size={12} className="text-slate-400" />
                        {slideCount} câu hỏi
                      </span>
                      <span className="flex items-center gap-1 text-amber-500 font-bold text-[11px]">
                        <Star size={12} className="fill-amber-400" />
                        4.9
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="p-4 pt-0 sm:p-5 sm:pt-0 flex items-center justify-between gap-2 border-t border-slate-100 mt-2">
                  <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[110px]">
                    {quiz.creator_nickname || "Giáo Viên GameEdu"}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectQuiz) {
                        onSelectQuiz(quiz.id);
                      } else {
                        router.push(`/quiz/${quiz.id}`);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-heading font-black text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Mở Phòng</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
