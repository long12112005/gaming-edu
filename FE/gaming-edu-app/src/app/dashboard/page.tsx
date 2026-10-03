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
} from "lucide-react";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Quiz } from "@/types/database";
import { formatNumber } from "@/lib/utils";

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 card-hover">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}
      >
        <Icon size={22} className={color} />
      </div>
      <div>
        <div className="text-2xl font-900 text-gray-900">{value}</div>
        <div className="text-sm text-gray-500 font-500">{label}</div>
      </div>
    </div>
  );
}

// ─── Quiz Row Card ────────────────────────────────────────────────────────────
function QuizRow({
  quiz,
  onDelete,
  onCreateRoom,
}: {
  quiz: Quiz;
  onDelete: (id: string) => void;
  onCreateRoom: (quiz: Quiz) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [creating, setCreating] = useState(false);

  const topicColors: Record<string, string> = {
    "TOÁN HỌC": "bg-red-100 text-red-700",
    "KHOA HỌC": "bg-amber-100 text-amber-700",
    "LỊCH SỬ": "bg-emerald-100 text-emerald-700",
    "NGỮ VĂN": "bg-blue-100 text-blue-700",
  };
  const badgeCls =
    topicColors[quiz.topic ?? ""] ?? "bg-violet-100 text-violet-700";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 card-hover group animate-fade-in-up">
      {/* Cover */}
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
        <img
          src={
            quiz.cover_image_url ??
            "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=200&fit=crop"
          }
          alt={quiz.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-800 text-gray-900 text-sm truncate">
            {quiz.title}
          </h3>
          {quiz.topic && (
            <span
              className={`text-xs font-700 px-2 py-0.5 rounded-full flex-shrink-0 ${badgeCls}`}
            >
              {quiz.topic}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <BookOpen size={11} />
            {quiz.slide_count ?? 0} câu hỏi
          </span>
          <span className="flex items-center gap-1">
            <Play size={11} />
            {formatNumber(quiz.play_count ?? 0)} lượt chơi
          </span>
          <span className="flex items-center gap-1">
            <Star size={11} className="text-yellow-400 fill-yellow-400" />
            4.8
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onCreateRoom(quiz)}
          disabled={creating}
          className="hidden sm:inline-flex"
          id={`btn-start-quiz-${quiz.id}`}
        >
          <Play size={13} />
          {creating ? "Đang tạo..." : "Bắt Đầu"}
        </Button>

        <Button variant="outline" size="sm" id={`btn-edit-quiz-${quiz.id}`} href={`/quiz/${quiz.id}/edit`}>
          <Pencil size={13} />
          <span className="hidden sm:inline">Sửa</span>
        </Button>

        {/* More menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            id={`btn-more-quiz-${quiz.id}`}
          >
            <MoreVertical size={15} />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 animate-fade-in-up"
              onMouseLeave={() => setShowMenu(false)}
            >
              <Link
                href={`/quiz/${quiz.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
              >
                <BarChart2 size={13} /> Xem Chi Tiết
              </Link>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete(quiz.id);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                id={`btn-delete-quiz-${quiz.id}`}
              >
                <Trash2 size={13} /> Xóa Bộ Đề
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
  const [user, setUser] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);

  useEffect(() => {
    const token = Cookies.get("token");
    const userCookie = Cookies.get("user");
    if (!token || !userCookie) {
      router.push("/auth/login");
      return;
    }
    const parsedUser = JSON.parse(userCookie);
    setUser(parsedUser);

    // Load public quizzes as a placeholder (ideally: GET /api/quizzes/mine)
    api
      .get("/quizzes")
      .then((res) => setQuizzes(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const handleCreateRoom = async (quiz: Quiz) => {
    setCreatingRoom(true);
    try {
      const res = await api.post("/rooms", {
        quizId: quiz.id,
        mode: "HOST_PACED",
      });
      if (res.data.success) {
        const room = res.data.data;
        router.push(`/host/${room.id}?pin=${room.pinCode}`);
      }
    } catch {
      alert("Lỗi khi tạo phòng. Vui lòng thử lại.");
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa bộ đề này?")) return;
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
    // TODO: api.delete(`/quizzes/${id}`)
  };

  const handleLogout = () => {
    ["token", "user", "guest_nickname"].forEach((key) => {
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    router.push("/");
  };

  const aiUsed = user?.ai_used_today ?? 0;
  const aiLimit = user?.ai_generation_limit ?? 10;
  const aiPercent = Math.min((aiUsed / aiLimit) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 h-screen sticky top-0 shadow-sm">
        {/* Logo */}
        <div className="p-6 border-b border-gray-50">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Trophy size={18} className="text-white" />
            </div>
            <span className="font-800 text-lg text-gray-900">
              <span className="text-violet-600">Gaming</span> Edu
            </span>
          </Link>
        </div>

        {/* User info */}
        {user && (
          <div className="p-4 border-b border-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={
                  user.avatar_url ??
                  `https://ui-avatars.com/api/?name=${user.nickname}&background=7c3aed&color=fff`
                }
                alt={user.nickname}
                className="w-10 h-10 rounded-full border-2 border-violet-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-700 text-gray-900 text-sm truncate">
                  {user.nickname}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user.email}
                </div>
              </div>
            </div>
            {/* AI Quota */}
            <div className="bg-violet-50 rounded-xl p-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-700 text-violet-700 flex items-center gap-1">
                  <Zap size={11} /> AI hôm nay
                </span>
                <span className="text-xs font-700 text-violet-900">
                  {aiUsed}/{aiLimit}
                </span>
              </div>
              <div className="w-full h-1.5 bg-violet-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${aiPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 p-4 space-y-1">
          {[
            {
              icon: BarChart2,
              label: "Dashboard",
              href: "/dashboard",
              active: true,
            },
            {
              icon: BookOpen,
              label: "Bộ Đề Của Tôi",
              href: "/dashboard",
              active: false,
            },
            {
              icon: Users,
              label: "Nhóm Của Tôi",
              href: "#",
              active: false,
            },
            {
              icon: Trophy,
              label: "Kết Quả Thi Đấu",
              href: "#",
              active: false,
            },
            {
              icon: Settings,
              label: "Cài Đặt",
              href: "#",
              active: false,
            },
          ].map(({ icon: Icon, label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-600 transition-all ${
                active
                  ? "bg-violet-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors font-600"
            id="btn-logout"
          >
            <LogOut size={16} /> Đăng Xuất
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Trophy size={15} className="text-white" />
            </div>
            <span className="font-800 text-gray-900">
              <span className="text-violet-600">Gaming</span> Edu
            </span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 font-600 flex items-center gap-1"
          >
            <LogOut size={14} /> Thoát
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
          {/* Greeting */}
          <div className="flex items-center justify-between mb-8 animate-fade-in-up">
            <div>
              <h1 className="text-2xl md:text-3xl font-900 text-gray-900">
                Xin chào,{" "}
                <span className="text-gradient-purple">
                  {user?.nickname ?? "..."}
                </span>{" "}
                👋
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Sẵn sàng tạo một trận đấu trí tuệ hôm nay?
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              className="hidden sm:inline-flex"
              id="btn-new-quiz"
              href="/quiz/create"
            >
              <Plus size={16} /> Tạo Bộ Đề Mới
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={BookOpen}
              label="Bộ đề"
              value={quizzes.length}
              color="text-violet-600"
              bg="bg-violet-100"
            />
            <StatCard
              icon={Play}
              label="Tổng lượt chơi"
              value={formatNumber(
                quizzes.reduce((s, q) => s + (q.play_count ?? 0), 0)
              )}
              color="text-blue-600"
              bg="bg-blue-100"
            />
            <StatCard
              icon={Users}
              label="Người tham gia"
              value="—"
              color="text-emerald-600"
              bg="bg-emerald-100"
            />
            <StatCard
              icon={Zap}
              label="Lượt AI còn lại"
              value={`${aiLimit - aiUsed}/${aiLimit}`}
              color="text-amber-600"
              bg="bg-amber-100"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[
              {
                icon: Plus,
                label: "Tạo Bộ Đề",
                desc: "Tạo bộ đề mới từ đầu",
                href: "/quiz/create",
                color: "from-violet-500 to-indigo-500",
                id: "btn-quick-create-quiz",
              },
              {
                icon: Bot,
                label: "AI Sinh Đề",
                desc: "Upload tài liệu, AI tự tạo",
                href: "/quiz/create",
                color: "from-pink-500 to-violet-500",
                id: "btn-quick-ai-quiz",
              },
              {
                icon: Play,
                label: "Vào Chơi",
                desc: "Nhập PIN tham gia phòng",
                href: "/play",
                color: "from-amber-500 to-orange-500",
                id: "btn-quick-play",
              },
            ].map(({ icon: Icon, label, desc, href, color, id }) => (
              <Link key={label} href={href} id={id}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 card-hover cursor-pointer group">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                  >
                    <Icon size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="font-700 text-gray-900 text-sm">{label}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
                  </div>
                  <ChevronRight
                    size={14}
                    className="ml-auto text-gray-400 group-hover:translate-x-0.5 transition-transform"
                  />
                </div>
              </Link>
            ))}
          </div>

          {/* My Quizzes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-800 text-gray-900">Bộ Đề Của Tôi</h2>
              <Button variant="outline" size="sm" id="btn-add-quiz" href="/quiz/create">
                <Plus size={13} /> Thêm Mới
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-gray-100 p-4 h-20 animate-pulse"
                  />
                ))}
              </div>
            ) : quizzes.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="font-700 text-gray-500 mb-2">
                  Chưa có bộ đề nào
                </p>
                <p className="text-sm text-gray-400 mb-5">
                  Tạo bộ đề đầu tiên của bạn ngay!
                </p>
                <Button variant="primary" size="md" id="btn-first-quiz" href="/quiz/create">
                  <Plus size={15} /> Tạo Bộ Đề
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <QuizRow
                    key={quiz.id}
                    quiz={quiz}
                    onDelete={handleDelete}
                    onCreateRoom={handleCreateRoom}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
