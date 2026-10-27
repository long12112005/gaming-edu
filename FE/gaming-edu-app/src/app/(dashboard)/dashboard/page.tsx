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
  Bot,
  Gamepad2,
  Sparkles,
  Zap,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { Quiz } from "@/types/database";
import { formatNumber } from "@/lib/utils";
import { useAuthStore, UserQuota } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";
import CreateRoomModal from "@/components/modals/CreateRoomModal";

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
  color: string;
  bg: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col items-center text-center gap-2 hover:-translate-y-1 hover:shadow-md transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} border border-slate-200/50 shadow-xs`}>
        <Icon size={22} className={color} />
      </div>
      <div>
        <div className="text-2xl md:text-3xl font-heading font-black text-slate-900">{value}</div>
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{label}</div>
        {subtitle && <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Quiz Row Card ─────────────────────────────────────────────────────────────
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
    "TOÁN HỌC": "bg-red-500/15 text-red-800 border-red-300",
    "KHOA HỌC": "bg-amber-500/15 text-amber-800 border-amber-300",
    "LỊCH SỬ": "bg-emerald-500/15 text-emerald-800 border-emerald-300",
    "NGỮ VĂN": "bg-blue-500/15 text-blue-800 border-blue-300",
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
          <span
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
              topicColors[quiz.topic || ""] || "bg-cyan-500/15 text-teal-900 border-teal-300"
            }`}
          >
            {quiz.topic || "Tổng Hợp"}
          </span>
          <h3 className="text-lg font-heading font-bold text-slate-900 truncate max-w-md">{quiz.title}</h3>
        </div>
        <div className="flex items-center gap-4 text-xs font-sans text-slate-500 font-semibold">
          <span className="flex items-center gap-1">
            <BookOpen size={14} />
            {quiz.slide_count ?? 0} câu hỏi
          </span>
          <span className="flex items-center gap-1">
            <Play size={14} />
            {formatNumber(quiz.play_count ?? 0)} lượt chơi
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => {
            setCreating(true);
            onCreateRoom(quiz);
          }}
          disabled={creating}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold rounded-xl shadow-sm active:scale-95 transition-all text-sm disabled:opacity-50"
        >
          <Play size={15} fill="currentColor" /> {creating ? "Đang mở..." : "Mở Phòng Chơi"}
        </button>

        <Link
          href={`/quiz/${quiz.id}/edit`}
          className="p-2.5 bg-white/80 hover:bg-white text-teal-800 rounded-xl border border-teal-200 transition-colors shadow-sm"
          title="Chỉnh sửa câu hỏi"
        >
          <Pencil size={16} />
        </Link>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 bg-white/80 hover:bg-white text-teal-800 rounded-xl border border-teal-200 transition-colors shadow-sm"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-44 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-teal-200 py-1.5 z-30 animate-in fade-in"
              onMouseLeave={() => setShowMenu(false)}
            >
              <Link
                href={`/quiz/${quiz.id}`}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-teal-900 hover:bg-teal-50 transition-colors"
              >
                <BarChart2 size={14} /> Xem Chi Tiết
              </Link>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete(quiz.id);
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left"
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
  const { user, setUser, isAuthenticated } = useAuthStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // User Quota từ API thực tế
  const [quota, setQuota] = useState<UserQuota>({
    aiGenerationLimit: user?.quota?.aiGenerationLimit ?? user?.ai_generation_limit ?? 10,
    aiUsedToday: user?.quota?.aiUsedToday ?? user?.ai_used_today ?? 0,
    maxRoomCapacity: user?.quota?.maxRoomCapacity ?? 50,
    resetDate: user?.quota?.resetDate ?? null,
  });

  useEffect(() => {
    if (!isAuthenticated && !Cookies.get("token")) {
      router.push("/login");
      return;
    }

    // 1. Tải danh sách bộ đề của user (GET /api/quizzes/mine)
    const fetchMyQuizzes = async () => {
      try {
        const res = await api.get("/quizzes/mine");
        if (res.data?.success && Array.isArray(res.data.data)) {
          setQuizzes(res.data.data);
        } else if (Array.isArray(res.data)) {
          setQuizzes(res.data);
        }
      } catch (err: unknown) {
        console.warn("Thử fallback sang /quizzes:", err);
        try {
          const fallback = await api.get("/quizzes");
          if (fallback.data?.success && Array.isArray(fallback.data.data)) {
            setQuizzes(fallback.data.data);
          }
        } catch {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    };

    // 2. Tải Profile và Quota thực tế từ GET /api/users/profile (Task 8)
    const fetchUserProfile = async () => {
      try {
        const res = await api.get("/users/profile");
        if (res.data?.success && res.data.data) {
          const profileData = res.data.data;
          if (profileData.quota) {
            setQuota({
              aiGenerationLimit: profileData.quota.aiGenerationLimit ?? 10,
              aiUsedToday: profileData.quota.aiUsedToday ?? 0,
              maxRoomCapacity: profileData.quota.maxRoomCapacity ?? 50,
              resetDate: profileData.quota.resetDate ?? null,
            });
          }
          setUser({
            nickname: profileData.nickname,
            avatar_url: profileData.avatarUrl,
            avatarUrl: profileData.avatarUrl,
            isAdmin: profileData.isAdmin,
            is_admin: profileData.isAdmin,
            quota: profileData.quota,
            ai_used_today: profileData.quota?.aiUsedToday,
            ai_generation_limit: profileData.quota?.aiGenerationLimit,
          });
        }
      } catch (err: unknown) {
        console.warn("Lỗi khi tải profile quota:", err);
      }
    };

    fetchMyQuizzes();
    fetchUserProfile();
  }, [isAuthenticated, router, setUser]);

  const [createRoomModal, setCreateRoomModal] = useState<{
    isOpen: boolean;
    quizId?: string;
  }>({ isOpen: false });

  const handleCreateRoom = (quiz?: Quiz) => {
    setCreateRoomModal({
      isOpen: true,
      quizId: quiz?.id,
    });
  };

  const handleDelete = async (quizId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bộ đề này?")) return;
    try {
      await api.delete(`/quizzes/${quizId}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch {
      alert("Xóa bộ đề thất bại.");
    }
  };

  // Tính toán Quota từ state API
  const aiUsed = quota.aiUsedToday;
  const aiLimit = quota.aiGenerationLimit || 10;
  const aiPercent = Math.min(100, Math.round((aiUsed / aiLimit) * 100));
  const isQuotaExceeded = aiUsed >= aiLimit;
  const maxCapacity = quota.maxRoomCapacity || 50;

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900 flex flex-col font-sans relative">
      {/* Subtle modern ambient background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-6xl mx-auto w-full relative z-10 font-sans">
        {/* Header Greeting */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-black font-heading text-slate-900 tracking-tight">
              Chào Mừng,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-violet-600 to-indigo-600">
                {user?.nickname ?? "Bạn"}
              </span>{" "}
              👋
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1 font-semibold">
              Bảng điều khiển học tập thông minh & quản lý phòng chơi thời gian thực.
            </p>
          </div>
          <Link
            href="/quiz/create"
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 font-heading"
          >
            <Plus size={18} className="stroke-[3px]" /> Tạo Bộ Đề
          </Link>
        </div>

        {/* Cụm Quota AI & Sức Chứa Phòng (Task 8) */}
        <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-xs mb-8 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={20} className="text-amber-500" />
                <h2 className="text-lg font-bold font-heading text-slate-900">Hạn Mức Sử Dụng Hôm Nay</h2>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                Dữ liệu lấy từ tài khoản người dùng theo thời gian thực (GET /api/users/profile).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleCreateRoom()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-teal-950 font-black text-xs md:text-sm rounded-xl shadow-md active:scale-95 transition-all"
              >
                <Gamepad2 size={16} />
                <span>Tạo Phòng Thi Đấu</span>
              </button>
              <span className="text-xs font-bold text-teal-900 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
                Sức chứa tối đa: <b className="text-teal-950 font-mono text-sm">{maxCapacity} người chơi</b>
              </span>
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                  isQuotaExceeded
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : "bg-amber-100 text-amber-900 border-amber-300"
                }`}
              >
                Lượt AI đã dùng:{" "}
                <b className="font-mono text-sm">
                  {aiUsed} / {aiLimit}
                </b>
              </span>
            </div>
          </div>

          {/* Thanh Tiến Trình AI Quota */}
          <div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden p-0.5 border border-teal-200/50 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isQuotaExceeded
                    ? "bg-gradient-to-r from-rose-500 to-red-600"
                    : aiPercent > 70
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600"
                }`}
                style={{ width: `${aiPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-teal-800/70 font-bold mt-1.5">
              <span>Tiến trình sử dụng: {aiPercent}%</span>
              <span>{isQuotaExceeded ? "⚠️ Đã hết lượt AI hôm nay" : `Còn ${aiLimit - aiUsed} lượt tạo`}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard
            icon={BookOpen}
            label="Bộ Đề Của Bạn"
            value={quizzes.length}
            color="text-teal-600"
            bg="bg-teal-500/15"
          />
          <StatCard
            icon={Play}
            label="Lượt Chơi"
            value={formatNumber(quizzes.reduce((s, q) => s + (q.play_count ?? 0), 0))}
            color="text-emerald-600"
            bg="bg-emerald-500/15"
          />
          <StatCard
            icon={Users}
            label="Sức Chứa Phòng"
            value={`${maxCapacity}`}
            subtitle="người chơi"
            color="text-cyan-600"
            bg="bg-cyan-500/15"
          />
          <StatCard
            icon={Sparkles}
            label="AI Đã Dùng"
            value={`${aiUsed} / ${aiLimit}`}
            subtitle={isQuotaExceeded ? "Hết lượt" : `Còn ${aiLimit - aiUsed} lượt`}
            color="text-amber-600"
            bg="bg-amber-500/15"
          />
        </div>

        {/* Quick Actions (Truy cập nhanh các module) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {[
            {
              icon: BookOpen,
              label: "Kho Bộ Đề",
              desc: "Quản lý câu hỏi & bộ đề",
              href: "/quizzes",
              color: "text-emerald-700",
              bg: "bg-emerald-500/15",
            },
            {
              icon: Users,
              label: "Nhóm & Lớp Học",
              desc: "Mã 6 số & duyệt thành viên",
              href: "/groups",
              color: "text-teal-700",
              bg: "bg-teal-500/15",
            },
            {
              icon: BarChart2,
              label: "Báo Cáo & Excel",
              desc: "Xuất file .xlsx điểm số",
              href: "/reports",
              color: "text-amber-700",
              bg: "bg-amber-500/15",
            },
            {
              icon: Gamepad2,
              label: "Nhập Mã PIN",
              desc: "Tham gia phòng đấu ngay",
              href: "/play",
              color: "text-cyan-700",
              bg: "bg-cyan-500/15",
            },
          ].map(({ icon: Icon, label, desc, href, color, bg }) => (
            <Link key={label} href={href}>
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex items-center gap-4 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md transition-all shadow-xs">
                <div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center shrink-0`}>
                  <Icon size={24} />
                </div>
                <div>
                  <div className="font-bold font-heading text-slate-900 text-base">{label}</div>
                  <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* My Quizzes Section */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold font-heading text-slate-900">Bộ Đề Gần Đây</h2>
            <Link
              href="/quizzes"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors font-heading"
            >
              <span>Xem tất cả ({quizzes.length})</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 h-24 animate-pulse border border-slate-200/60"
                />
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 text-indigo-600">
                <BookOpen size={40} />
              </div>
              <h3 className="text-xl font-bold font-heading text-slate-900 mb-2">Chưa có bộ đề nào!</h3>
              <p className="text-sm text-slate-500 mb-6">
                Khởi tạo bộ đề thi đầu tiên để bắt đầu tạo phòng thi đấu cho học sinh và bạn bè.
              </p>
              <Link
                href="/quiz/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-sm rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={18} /> Tạo Bộ Đề Ngay
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {quizzes.slice(0, 5).map((quiz) => (
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

      {/* Footer */}
      <footer className="py-8 border-t border-teal-600/20 text-center text-teal-900/60 bg-white/50 backdrop-blur-md text-xs relative z-10 font-sans">
        <p>© 2026 Gaming Edu · Bảng điều khiển quản lý học tập và thi đấu gamified.</p>
      </footer>

      {/* Modal Khởi Tạo Phòng Chơi (Chọn Đề & Chọn Kiểu Chơi) */}
      <CreateRoomModal
        isOpen={createRoomModal.isOpen}
        onClose={() => setCreateRoomModal({ isOpen: false })}
        initialQuizId={createRoomModal.quizId}
      />
    </div>
  );
}
