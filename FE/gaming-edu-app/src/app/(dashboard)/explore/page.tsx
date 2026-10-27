"use client";

import { useEffect, useState } from "react";
import { Search, Compass, BookOpen, Users, Gamepad2, TrendingUp, Filter, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import { api } from "@/lib/api";
import { Quiz } from "@/types/database";
import { formatNumber } from "@/lib/utils";

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublicQuizzes() {
      try {
        const res = await api.get("/quizzes");
        if (res.data.success && Array.isArray(res.data.data)) {
          setQuizzes(res.data.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải bộ đề công khai:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPublicQuizzes();
  }, []);

  const filteredQuizzes = quizzes.filter((q) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.title.toLowerCase().includes(query) ||
      (q.topic && q.topic.toLowerCase().includes(query)) ||
      (q.creator_nickname && q.creator_nickname.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900 flex flex-col font-sans relative">
      {/* Subtle modern ambient background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto w-full space-y-10 relative z-10 font-sans">
        {/* Header Hero Section */}
        <div className="relative bg-white p-8 md:p-12 rounded-[32px] border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full font-bold text-xs tracking-wider uppercase font-heading">
                <Compass size={15} /> Thư Viện Đề Thi
              </div>
              <h1 className="text-3xl md:text-5xl font-black font-heading text-slate-900 tracking-tight leading-tight">
                Khám Phá Các Bộ <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-violet-600 to-indigo-600">
                  Câu Hỏi Trắc Nghiệm
                </span>
              </h1>
              <p className="text-slate-500 text-base md:text-lg max-w-lg leading-relaxed font-sans">
                Hàng ngàn bài trắc nghiệm độc đáo đang chờ bạn thử tài. Rèn luyện mỗi ngày để nâng cao kiến thức và kỹ năng!
              </p>
            </div>

            {/* Thanh tìm kiếm */}
            <div className="w-full md:w-1/2 relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search size={22} className="text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm môn học, chủ đề, từ khóa..."
                className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-sans font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:shadow-md transition-all"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                title="Bộ lọc"
              >
                <Filter size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Section: Danh sách đề thi */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                <TrendingUp size={22} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-slate-900">
                Bộ Đề Công Khai
              </h2>
            </div>
            {quizzes.length > 0 && (
              <span className="text-sm font-semibold text-slate-500">
                Hiển thị {filteredQuizzes.length} bộ đề
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 h-64 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center shadow-xs">
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 text-indigo-600">
                <Compass size={36} />
              </div>
              <h3 className="text-xl font-bold font-heading text-slate-900 mb-2">
                {searchQuery.trim() ? "Không tìm thấy bộ đề phù hợp" : "Chưa có bộ đề công khai nào"}
              </h3>
              <p className="text-sm font-sans text-slate-500 max-w-md mx-auto mb-6">
                {searchQuery.trim()
                  ? `Không tìm thấy kết quả phù hợp với từ khóa "${searchQuery}". Hãy thử tìm kiếm với từ khóa khác.`
                  : "Hiện chưa có bộ đề công khai nào trong hệ thống. Hãy là người đầu tiên tạo bộ đề để chia sẻ cùng mọi người!"}
              </p>
              <Link
                href="/quiz/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all font-heading"
              >
                <Plus size={18} /> Tạo Bộ Đề Mới
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-indigo-400 hover:-translate-y-1.5 transition-all duration-300 shadow-xs hover:shadow-md flex flex-col group"
                >
                  {/* Thumbnail */}
                  <div className="w-full h-36 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-xl mb-4 relative overflow-hidden flex items-center justify-center border border-slate-200">
                    {quiz.cover_image_url ? (
                      <img src={quiz.cover_image_url} alt={quiz.title} className="w-full h-full object-cover" />
                    ) : (
                      <Gamepad2 size={40} className="text-white/40" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Link
                        href={`/quiz/${quiz.id}`}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-bold rounded-xl shadow-lg hover:scale-105 transition-transform text-sm uppercase tracking-wide font-sans flex items-center gap-1.5"
                      >
                        Xem Đề <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-lg font-bold font-heading text-slate-900 line-clamp-2 leading-snug mb-1.5 group-hover:text-indigo-600 transition-colors">
                      {quiz.title}
                    </h3>
                    <p className="text-xs font-sans text-slate-500 mb-3">
                      Tác giả: {quiz.creator_nickname || "Người dùng"}
                    </p>

                    {/* Topic tag */}
                    {quiz.topic && (
                      <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
                        <span className="px-2.5 py-0.5 bg-teal-500/10 border border-teal-400/30 text-teal-700 text-xs font-sans rounded-lg font-bold">
                          {quiz.topic}
                        </span>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-3 border-t border-teal-400/20 text-teal-700/80 font-sans font-semibold text-xs mt-auto">
                      <div className="flex items-center gap-1.5">
                        <BookOpen size={14} className="text-teal-600" /> {quiz.slide_count ?? 0} câu
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-teal-600" /> {formatNumber(quiz.play_count ?? 0)} lượt
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-teal-600/20 text-center text-teal-800/60 bg-white/50 backdrop-blur-md text-xs font-sans relative z-10">
        <p>© 2026 Gaming Edu · Khám phá tri thức qua trò chơi.</p>
      </footer>
    </div>
  );
}
