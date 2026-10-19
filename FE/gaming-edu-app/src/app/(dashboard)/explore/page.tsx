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
    <div className="min-h-screen text-[#1B2A2E] font-serif flex flex-col relative">
      {/* Landscape background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-cloud-valley.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Frosted mist overlay */}
      <div className="fixed inset-0 z-0" style={{ background: "rgba(235,245,248,0.5)" }} />
      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto w-full space-y-10 relative z-10 font-sans">
        {/* Header Hero Section */}
        <div className="relative bg-white/55 backdrop-blur-xl p-8 md:p-12 rounded-[32px] border border-white/80 shadow-[0_16px_40px_rgba(8,38,42,0.12)] overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-teal-300/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-300/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 rounded-full font-bold text-xs tracking-wider uppercase">
                <Compass size={15} /> Thư Viện Đề Thi
              </div>
              <h1 className="text-3xl md:text-5xl font-bold font-serif text-[#08282e] tracking-tight leading-tight drop-shadow-sm">
                Khám Phá Các Bộ <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-600">
                  Câu Hỏi Trắc Nghiệm
                </span>
              </h1>
              <p className="text-teal-800/80 text-base md:text-lg max-w-lg leading-relaxed font-sans">
                Hàng ngàn bài trắc nghiệm độc đáo đang chờ bạn thử tài. Rèn luyện mỗi ngày để nâng cao kiến thức và kỹ năng!
              </p>
            </div>

            {/* Thanh tìm kiếm */}
            <div className="w-full md:w-1/2 relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search size={22} className="text-teal-500/60 group-focus-within:text-amber-600 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm môn học, chủ đề, từ khóa..."
                className="w-full pl-14 pr-14 py-4 bg-white/70 backdrop-blur-md border-2 border-teal-300/50 rounded-2xl text-lg font-sans font-semibold text-[#08282e] placeholder-teal-600/40 outline-none focus:border-amber-500 focus:bg-white/90 focus:shadow-[0_0_24px_rgba(20,120,100,0.2)] transition-all"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-teal-500/20 hover:bg-teal-500/40 text-teal-700 hover:text-teal-900 rounded-xl border border-teal-400/30 transition-colors"
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
              <h2 className="text-2xl md:text-3xl font-bold font-serif text-[#08282e]">
                Bộ Đề Công Khai
              </h2>
            </div>
            {quizzes.length > 0 && (
              <span className="text-sm font-semibold text-teal-800/70">
                Hiển thị {filteredQuizzes.length} bộ đề
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 h-64 animate-pulse border border-white/60" />
              ))}
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl border-2 border-dashed border-teal-400/40 p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-teal-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-400/30">
                <Compass size={36} className="text-teal-700" />
              </div>
              <h3 className="text-xl font-bold font-serif text-[#08282e] mb-2">
                {searchQuery.trim() ? "Không tìm thấy bộ đề phù hợp" : "Chưa có bộ đề công khai nào"}
              </h3>
              <p className="text-sm font-sans text-teal-800/70 max-w-md mx-auto mb-6">
                {searchQuery.trim()
                  ? `Không tìm thấy kết quả phù hợp với từ khóa "${searchQuery}". Hãy thử tìm kiếm với từ khóa khác.`
                  : "Hiện chưa có bộ đề công khai nào trong hệ thống. Hãy là người đầu tiên tạo bộ đề để chia sẻ cùng mọi người!"}
              </p>
              <Link
                href="/quiz/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={18} /> Tạo Bộ Đề Mới
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white/65 backdrop-blur-xl rounded-2xl p-4 border border-white/80 hover:border-emerald-400/60 hover:-translate-y-1.5 transition-all duration-300 shadow-md hover:shadow-[0_12px_32px_rgba(6,78,59,0.15)] flex flex-col group"
                >
                  {/* Thumbnail */}
                  <div className="w-full h-36 bg-gradient-to-br from-cyan-600 to-teal-800 rounded-xl mb-4 relative overflow-hidden flex items-center justify-center border border-white/20">
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
                    <h3 className="text-lg font-bold font-serif text-[#08282e] line-clamp-2 leading-snug mb-1.5 group-hover:text-amber-700 transition-colors">
                      {quiz.title}
                    </h3>
                    <p className="text-xs font-sans text-teal-700/70 mb-3">
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
