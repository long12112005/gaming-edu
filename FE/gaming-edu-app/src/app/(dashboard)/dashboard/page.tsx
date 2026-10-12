"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  Plus,
  Trophy,
  Users,
  Zap,
  BookOpen,
  Play,
  MoreVertical,
  Pencil,
  Trash2,
  BarChart2,
  Star,
  ChevronRight,
  Bot,
  LogOut,
  Settings,
  User,
  LayoutDashboard,
  Gamepad2,
  Compass,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Quiz } from "@/types/database";
import { formatNumber } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useQuery } from "@tanstack/react-query";

// ─── Stat Card (Claymorphism) ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg, borderColor }: any) {
  return (
    <div className={`bg-white rounded-[32px] border-4 ${borderColor} shadow-[4px_4px_16px_rgba(0,0,0,0.05)] p-6 flex flex-col items-center text-center gap-3 hover:-translate-y-1 transition-transform`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bg}`}>
        <Icon size={28} className={color} />
      </div>
      <div>
        <div className="text-3xl font-black text-gray-900">{value}</div>
        <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mt-1">{label}</div>
      </div>
    </div>
  );
}

// ─── Quiz Row Card (Vibrant Block) ────────────────────────────────────────────
function QuizRow({ quiz, onDelete, onCreateRoom }: any) {
  const [showMenu, setShowMenu] = useState(false);
  const [creating, setCreating] = useState(false);

  const topicColors: Record<string, string> = {
    "TOÁN HỌC": "bg-red-100 text-red-700 border-red-200",
    "KHOA HỌC": "bg-amber-100 text-amber-700 border-amber-200",
    "LỊCH SỬ": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "NGỮ VĂN": "bg-blue-100 text-blue-700 border-blue-200",
  };
  const badgeCls = topicColors[quiz.topic ?? ""] ?? "bg-violet-100 text-violet-700 border-violet-200";

  return (
    <div className="bg-white rounded-[32px] border-4 border-gray-100 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] p-5 flex items-center gap-6 hover:shadow-[0_12px_32px_rgba(124,58,237,0.1)] hover:border-violet-200 transition-all group animate-fade-in-up">
      <div className="w-20 h-20 rounded-[20px] overflow-hidden flex-shrink-0 bg-gray-100 shadow-[inset_2px_2px_8px_rgba(0,0,0,0.1)]">
        <img
          src={quiz.cover_image_url ?? "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=200&fit=crop"}
          alt={quiz.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-black text-gray-900 text-xl truncate">{quiz.title}</h3>
          {quiz.topic && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full border-2 ${badgeCls}`}>
              {quiz.topic}
            </span>
          )}
        </div>
        <div className="flex items-center gap-5 text-sm font-semibold text-gray-500">
          <span className="flex items-center gap-1.5"><BookOpen size={16} />{quiz.slide_count ?? 0} câu</span>
          <span className="flex items-center gap-1.5"><Play size={16} />{formatNumber(quiz.play_count ?? 0)} lượt</span>
          <span className="flex items-center gap-1.5 text-orange-500"><Star size={16} className="fill-orange-500" />4.8</span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => onCreateRoom(quiz)}
          disabled={creating}
          className="hidden sm:flex items-center gap-2 px-6 py-3 bg-violet-600 text-white font-bold rounded-2xl shadow-[0_4px_0_#5b21b6] active:translate-y-[4px] active:shadow-none hover:brightness-110 transition-all disabled:opacity-50"
        >
          <Play size={18} fill="currentColor" /> {creating ? "Đang tạo..." : "Bắt Đầu"}
        </button>

        <Link href={`/quiz/${quiz.id}/edit`} className="p-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-violet-100 hover:text-violet-600 transition-colors">
          <Pencil size={20} />
        </Link>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-colors"
          >
            <MoreVertical size={20} />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border-4 border-gray-100 py-2 z-20 animate-fade-in-up"
              onMouseLeave={() => setShowMenu(false)}
            >
              <Link href={`/quiz/${quiz.id}`} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                <BarChart2 size={16} /> Xem Chi Tiết
              </Link>
              <button
                onClick={() => { setShowMenu(false); onDelete(quiz.id); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} /> Xóa Bộ Đề
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
  const { user, isAuthenticated, logout } = useAuthStore();
  const [creatingRoom, setCreatingRoom] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data: quizzes = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const res = await api.get("/quizzes"); 
      return res.data.data || [];
    },
    enabled: isAuthenticated,
  });

  const handleCreateRoom = async (quiz: Quiz) => {
    setCreatingRoom(true);
    try {
      const res = await api.post("/rooms", { quizId: quiz.id, mode: "HOST_PACED" });
      if (res.data.success) {
        router.push(`/host/${res.data.data.id}?pin=${res.data.data.pinCode}`);
      }
    } catch {
      alert("Lỗi khi tạo phòng. Vui lòng thử lại.");
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa bộ đề này?")) return;
    try {
      await api.delete(`/quizzes/${id}`);
      refetch();
    } catch (e) {
      alert("Xóa bộ đề thất bại.");
    }
  };

  const aiUsed = user?.ai_used_today ?? 0;
  const aiLimit = user?.ai_generation_limit ?? 10;
  const aiPercent = Math.min((aiUsed / aiLimit) * 100, 100);

  return (
    <div className="min-h-screen bg-[#F4F1FA] flex font-sans">
      {/* ── SIDEBAR (Claymorphism) ───────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r-4 border-violet-100 h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] rounded-tr-[40px] rounded-br-[40px] z-10">
        <div className="p-8 pb-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-[0_4px_12px_rgba(124,58,237,0.3)] group-hover:rotate-12 transition-transform">
              <Gamepad2 size={24} className="text-white" />
            </div>
            <span className="font-black text-2xl text-gray-900 tracking-tight">
              <span className="text-violet-600">Gaming</span>Edu
            </span>
          </Link>
        </div>

        {user && (
          <div className="px-6 py-4">
            <Link href="/profile" className="flex items-center gap-4 p-3 bg-violet-50 rounded-[24px] border-2 border-violet-100 hover:bg-violet-100 transition-colors cursor-pointer">
              <img
                src={user.avatar_url ?? `https://ui-avatars.com/api/?name=${user.nickname}&background=7c3aed&color=fff`}
                alt={user.nickname}
                className="w-12 h-12 rounded-full border-4 border-white shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 text-sm truncate">{user.nickname}</div>
                <div className="text-xs font-semibold text-violet-600 flex items-center gap-1">
                  <Star size={12} className="fill-violet-600" /> Pro Member
                </div>
              </div>
            </Link>
            <div className="mt-4 bg-white rounded-[20px] p-4 border-2 border-orange-100 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-orange-600 flex items-center gap-1">
                  <Zap size={14} className="fill-orange-600"/> AI Năng lượng
                </span>
                <span className="text-xs font-black text-orange-700">{aiUsed}/{aiLimit}</span>
              </div>
              <div className="w-full h-2.5 bg-orange-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-pink-500 rounded-full" style={{ width: `${aiPercent}%` }} />
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 py-4 space-y-2">
          {[
            { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", active: true },
            { icon: Compass, label: "Khám Phá", href: "/explore", active: false },
            { icon: BarChart2, label: "Báo Cáo", href: "/reports", active: false },
            { icon: User, label: "Hồ Sơ", href: "/profile", active: false },
          ].map(({ icon: Icon, label, href, active }) => (
            <Link
              key={label} href={href}
              className={`flex items-center gap-4 px-5 py-4 rounded-[20px] font-bold transition-all ${
                active ? "bg-violet-600 text-white shadow-[0_4px_12px_rgba(124,58,237,0.3)] translate-x-2" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 hover:translate-x-1"
              }`}
            >
              <Icon size={20} /> {label}
            </Link>
          ))}
        </nav>

        <div className="p-6">
          <button onClick={() => { logout(); router.push("/login"); }} className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-[20px] transition-colors">
            <LogOut size={18} /> Đăng Xuất
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen relative z-0">
        <main className="flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto">
          {/* Greeting */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
                Xin chào, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-500">{user?.nickname ?? "..."}</span> 👋
              </h1>
              <p className="text-lg font-medium text-gray-500 mt-2">Sẵn sàng bùng nổ với các bộ câu hỏi hôm nay chưa?</p>
            </div>
            <Link
              href="/quiz/create"
              className="hidden sm:flex items-center gap-2 px-6 py-4 bg-violet-600 text-white font-bold text-lg rounded-[20px] shadow-[0_6px_0_#5b21b6] active:translate-y-[6px] active:shadow-none hover:brightness-110 transition-all"
            >
              <Plus size={24} /> Tạo Bộ Đề
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            <StatCard icon={BookOpen} label="Bộ đề" value={quizzes.length} color="text-violet-600" bg="bg-violet-100" borderColor="border-violet-100" />
            <StatCard icon={Play} label="Lượt chơi" value={formatNumber(quizzes.reduce((s, q) => s + (q.play_count ?? 0), 0))} color="text-pink-600" bg="bg-pink-100" borderColor="border-pink-100" />
            <StatCard icon={Users} label="Người tham gia" value="—" color="text-emerald-600" bg="bg-emerald-100" borderColor="border-emerald-100" />
            <StatCard icon={Zap} label="AI Năng lượng" value={`${aiLimit - aiUsed}/${aiLimit}`} color="text-orange-600" bg="bg-orange-100" borderColor="border-orange-100" />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { icon: Plus, label: "Tạo Thủ Công", desc: "Tự tay thiết kế câu hỏi", href: "/quiz/create", bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
              { icon: Bot, label: "AI Sinh Đề", desc: "Upload tài liệu PDF/Word", href: "/quiz/create", bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
              { icon: Gamepad2, label: "Nhập PIN Code", desc: "Tham gia phòng chơi ngay", href: "/play", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
            ].map(({ icon: Icon, label, desc, href, bg, text, border }) => (
              <Link key={label} href={href}>
                <div className={`bg-white rounded-[32px] border-4 ${border} p-6 flex items-center gap-5 hover:-translate-y-2 hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition-all`}>
                  <div className={`w-16 h-16 rounded-[24px] ${bg} ${text} flex items-center justify-center`}>
                    <Icon size={32} />
                  </div>
                  <div>
                    <div className="font-black text-gray-900 text-lg">{label}</div>
                    <div className="text-sm font-semibold text-gray-500 mt-1">{desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* My Quizzes */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-gray-900">Bộ Đề Của Bạn</h2>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-[32px] border-4 border-gray-100 p-6 h-24 animate-pulse" />)}
              </div>
            ) : quizzes.length === 0 ? (
              <div className="bg-white rounded-[40px] border-4 border-dashed border-gray-200 p-16 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                  <BookOpen size={48} className="text-gray-300" />
                </div>
                <h3 className="text-2xl font-black text-gray-700 mb-2">Chưa có bộ đề nào!</h3>
                <p className="text-lg font-medium text-gray-500 mb-8">Hãy bắt đầu sáng tạo nội dung giáo dục của riêng bạn.</p>
                <Link href="/quiz/create" className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 text-white font-bold text-lg rounded-[20px] shadow-[0_6px_0_#5b21b6] active:translate-y-[6px] active:shadow-none hover:brightness-110 transition-all">
                  <Plus size={24} /> Tạo Ngay
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz) => (
                  <QuizRow key={quiz.id} quiz={quiz} onDelete={handleDelete} onCreateRoom={handleCreateRoom} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
