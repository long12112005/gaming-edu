"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  Plus,
  Users,
  BookOpen,
  Play,
  MoreVertical,
  Pencil,
  Trash2,
  BarChart2,
  Star,
  Bot,
  Gamepad2,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { Quiz } from "@/types/database";
import { formatNumber } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";

// ─── Stat Card (Tiên Môn Style) ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-[0_8px_32px_rgba(8,38,42,0.12)] p-5 flex flex-col items-center text-center gap-2.5 hover:-translate-y-1.5 transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} border border-white/30`}>
        <Icon size={24} className={color} />
      </div>
      <div>
        <div className="text-2xl md:text-3xl font-bold font-serif text-[#0a3038]">{value}</div>
        <div className="text-xs text-teal-700/80 font-bold uppercase tracking-wider mt-1">{label}</div>
      </div>
    </div>
  );
}

// ─── Quiz Row Card (Tiên Môn Style) ────────────────────────────────────────────
function QuizRow({ quiz, onDelete, onCreateRoom }: any) {
  const [showMenu, setShowMenu] = useState(false);
  const [creating, setCreating] = useState(false);

  const topicColors: Record<string, string> = {
    "TOÁN HỌC": "bg-red-500/20 text-red-200 border-red-400/30",
    "KHOA HỌC": "bg-amber-500/20 text-amber-200 border-amber-400/30",
    "LỊCH SỬ": "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    "NGỮ VĂN": "bg-blue-500/20 text-blue-200 border-blue-400/30",
  };

  return (
    <div className="bg-white/65 backdrop-blur-xl rounded-2xl p-5 border border-white/80 hover:border-emerald-400/60 hover:shadow-[0_8px_32px_rgba(6,78,59,0.15)] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${topicColors[quiz.topic] || "bg-cyan-500/20 text-cyan-200 border-cyan-400/30"}`}>
            {quiz.topic}
          </span>
          <h3 className="text-lg font-bold font-serif text-white truncate max-w-md">{quiz.title}</h3>
        </div>
        <div className="flex items-center gap-4 text-xs font-sans text-cyan-200/70">
          <span className="flex items-center gap-1"><BookOpen size={14} />{quiz.slide_count ?? 0} câu</span>
          <span className="flex items-center gap-1"><Play size={14} />{formatNumber(quiz.play_count ?? 0)} lượt</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => {
            setCreating(true);
            onCreateRoom(quiz);
          }}
          disabled={creating}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all text-sm disabled:opacity-50"
        >
          <Play size={16} fill="currentColor" /> {creating ? "Đang tạo..." : "Mở Phòng"}
        </button>

        <Link
          href={`/quiz/${quiz.id}/edit`}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-cyan-200 hover:text-white rounded-xl border border-white/10 transition-colors"
          title="Chỉnh sửa"
        >
          <Pencil size={18} />
        </Link>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-cyan-200 hover:text-white rounded-xl border border-white/10 transition-colors"
          >
            <MoreVertical size={18} />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-44 bg-[#0e3b43]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-cyan-300/30 py-1.5 z-30 animate-in fade-in"
              onMouseLeave={() => setShowMenu(false)}
            >
              <Link
                href={`/quiz/${quiz.id}`}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-cyan-100 hover:text-white hover:bg-white/10 transition-colors"
              >
                <BarChart2 size={14} /> Xem Chi Tiết
              </Link>
              <button
                onClick={() => { setShowMenu(false); onDelete(quiz.id); }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 transition-colors text-left"
              >
                <Trash2 size={14} /> Xóa Bộ Đề
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !Cookies.get("token")) {
      router.push("/login");
      return;
    }

    const fetchMyQuizzes = async () => {
      try {
        const res = await api.get("/quizzes/my");
        if (res.data.success) {
          setQuizzes(res.data.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải bộ đề:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyQuizzes();
  }, [isAuthenticated, router]);

  const handleCreateRoom = async (quiz: Quiz) => {
    try {
      const res = await api.post("/rooms", { quizId: quiz.id });
      if (res.data.success) {
        router.push(`/host/${res.data.data.id}`);
      }
    } catch (err) {
      alert("Tạo phòng thi đấu thất bại. Vui lòng thử lại!");
    }
  };

  const handleDelete = async (quizId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bộ đề này?")) return;
    try {
      await api.delete(`/quizzes/${quizId}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      alert("Xóa bộ đề thất bại.");
    }
  };

  const aiUsed = user?.ai_used_today ?? 0;
  const aiLimit = user?.ai_generation_limit ?? 10;
  const aiRemaining = Math.max(0, aiLimit - aiUsed);

  return (
    <div className="min-h-screen text-[#1B2A2E] font-serif flex flex-col relative">
      {/* Landscape background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-misty-white.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />
      {/* Frosted mist overlay */}
      <div className="fixed inset-0 z-0" style={{ background: "rgba(240,248,248,0.45)" }} />
      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto w-full relative z-10">
        {/* Header Greeting */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold font-serif text-[#08282e] tracking-tight drop-shadow-sm">
              Chào Mừng, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-teal-600 to-emerald-600">{user?.nickname ?? "Bạn"}</span> 👋
            </h1>
            <p className="text-sm md:text-base text-teal-800/80 font-sans mt-1">
              Sẵn sàng rèn luyện và mở phòng thi đấu cùng học sinh, bạn bè hôm nay!
            </p>
          </div>
          <Link
            href="/quiz/create"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-sans font-bold text-base rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={20} /> Tạo Bộ Đề
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard icon={BookOpen} label="Bộ đề" value={quizzes.length} color="text-cyan-300" bg="bg-cyan-500/20" />
          <StatCard icon={Play} label="Lượt chơi" value={formatNumber(quizzes.reduce((s, q) => s + (q.play_count ?? 0), 0))} color="text-emerald-300" bg="bg-emerald-500/20" />
          <StatCard icon={Users} label="Tổng câu hỏi" value={quizzes.reduce((s, q) => s + (q.slide_count ?? 0), 0)} color="text-amber-300" bg="bg-amber-500/20" />
          <StatCard icon={Sparkles} label="Lượt AI còn lại" value={`${aiRemaining}/${aiLimit}`} color="text-yellow-300" bg="bg-yellow-500/20" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
          {[
            { icon: Plus, label: "Tạo Thủ Công", desc: "Tự tay thiết kế câu hỏi", href: "/quiz/create", color: "text-emerald-300", bg: "bg-emerald-500/20" },
            { icon: Bot, label: "AI Sinh Đề", desc: "Upload tài liệu PDF / Văn bản", href: "/quiz/create", color: "text-cyan-300", bg: "bg-cyan-500/20" },
            { icon: Gamepad2, label: "Nhập PIN Code", desc: "Tham gia phòng chơi ngay", href: "/", color: "text-amber-300", bg: "bg-amber-500/20" },
          ].map(({ icon: Icon, label, desc, href, color, bg }) => (
            <Link key={label} href={href}>
              <div className="bg-white/65 backdrop-blur-xl rounded-2xl border border-white/80 p-5 flex items-center gap-4 hover:-translate-y-1.5 hover:border-emerald-400/60 hover:shadow-[0_12px_32px_rgba(6,78,59,0.15)] transition-all shadow-md">
                <div className={`w-14 h-14 rounded-2xl ${bg} ${color} border border-white/10 flex items-center justify-center shrink-0`}>
                  <Icon size={28} />
                </div>
                <div>
                  <div className="font-bold font-serif text-[#08282e] text-lg">{label}</div>
                  <div className="text-xs font-sans text-teal-700/70 mt-0.5">{desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* My Quizzes */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold font-serif text-[#08282e]">Bộ Đề Của Bạn</h2>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 h-24 animate-pulse border border-white/60" />
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl border-2 border-dashed border-teal-400/50 p-12 text-center">
              <div className="w-20 h-20 bg-teal-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-400/30">
                <BookOpen size={40} className="text-teal-600" />
              </div>
              <h3 className="text-xl font-bold font-serif text-[#08282e] mb-2">Chưa có bộ đề nào!</h3>
              <p className="text-sm font-sans text-teal-700/80 mb-6">Hãy khởi tạo bài thi đầu tiên để bắt đầu hành trình giảng dạy.</p>
              <Link
                href="/quiz/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-sans font-bold text-sm rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={18} /> Tạo Ngay
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {quizzes.map((quiz) => (
                <QuizRow key={quiz.id} quiz={quiz} onDelete={handleDelete} onCreateRoom={handleCreateRoom} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-teal-600/20 text-center text-teal-800/60 bg-white/50 backdrop-blur-md text-xs font-sans relative z-10">
        <p>© 2026 Gaming Edu · Bảng điều khiển quản lý học tập.</p>
      </footer>
    </div>
  );
}
