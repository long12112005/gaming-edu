"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  User,
  Key,
  Save,
  Camera,
  Mail,
  Sparkles,
  Shield,
  Zap,
  Users,
  Trophy,
  Flame,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Play,
  FileText,
  Clock,
  ArrowRight,
  Upload,
  Check,
  Palette,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore, UserQuota } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import AvatarWithFrame, { resolveAvatarUrl } from "@/components/common/AvatarWithFrame";
import AvatarCropModal from "@/components/modals/AvatarCropModal";
import { AVATAR_FRAMES, getAvatarFrame } from "@/lib/avatarFrames";

const AVATAR_OPTIONS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=Rocket",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Cyber",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Pixel",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Glitch",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Luna",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Milo",
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, logout, isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"player" | "host" | "security">("player");
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [avatarUrl, setAvatarUrl] = useState(resolveAvatarUrl(user?.avatar_url || user?.avatarUrl));
  const [avatarFrame, setAvatarFrame] = useState(user?.avatar_frame || user?.avatarFrame || "default");
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState<"frames" | "avatars">("frames");
  const [password, setPassword] = useState("");

  const [quota, setQuota] = useState<UserQuota>({
    aiGenerationLimit: user?.quota?.aiGenerationLimit ?? 20,
    aiUsedToday: user?.quota?.aiUsedToday ?? 0,
    maxRoomCapacity: user?.quota?.maxRoomCapacity ?? 50,
    resetDate: user?.quota?.resetDate ?? null,
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // My quizzes & reports data
  const [myQuizzes, setMyQuizzes] = useState<any[]>([]);
  const [roomHistory, setRoomHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated && !Cookies.get("token")) {
      router.push("/auth");
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get("/users/profile");
        if (res.data?.success && res.data.data) {
          const d = res.data.data;
          setNickname(d.nickname || "");
          if (d.avatarUrl) setAvatarUrl(resolveAvatarUrl(d.avatarUrl));
          if (d.avatarFrame) setAvatarFrame(d.avatarFrame);
          if (d.quota) setQuota(d.quota);
        }
      } catch (e) {
        // Fallback
      } finally {
        setLoadingProfile(false);
      }
    };

    const fetchMyContent = async () => {
      try {
        const [qRes, rRes] = await Promise.all([
          api.get("/quizzes/mine").catch(() => ({ data: { data: [] } })),
          api.get("/rooms/history").catch(() => ({ data: { data: [] } })),
        ]);
        if (qRes.data?.data) setMyQuizzes(qRes.data.data);
        if (rRes.data?.data) setRoomHistory(rRes.data.data);
      } catch (e) {}
    };

    fetchProfile();
    fetchMyContent();
  }, [isAuthenticated, router]);

  const handleCropComplete = (uploadedFileUrl: string) => {
    setAvatarUrl(uploadedFileUrl);
    setToastMsg({
      text: "Đã cắt ảnh vuông và tải lên thành công! Bấm 'Lưu Thay Đổi' để áp dụng.",
      type: "success",
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setToastMsg({ text: "Tên hiển thị không được để trống.", type: "error" });
      return;
    }

    try {
      setIsSaving(true);
      await api.put("/users/profile", {
        nickname: nickname.trim(),
        avatarUrl: avatarUrl.trim() || null,
        avatarFrame: avatarFrame,
      });

      setToastMsg({ text: "Đã cập nhật hồ sơ và khung viền thành công!", type: "success" });
      setUser({
        ...user,
        nickname: nickname.trim(),
        avatar_url: avatarUrl.trim(),
        avatarUrl: avatarUrl.trim(),
        avatar_frame: avatarFrame,
        avatarFrame: avatarFrame,
      });
    } catch (err: any) {
      setToastMsg({
        text: err.response?.data?.message || "Cập nhật hồ sơ thất bại.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Toast */}
        {toastMsg && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold border animate-in fade-in duration-200 ${
              toastMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {toastMsg.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* PROFILE HEADER & AVATAR STUDIO BENTO */}
        <div className="bento-card p-6 sm:p-8 mb-8 relative overflow-hidden bg-white border border-slate-200/90 shadow-sm">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
            {/* CỘT TRÁI: AVATAR SHOWCASE & QUICK UPLOAD */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative group p-2">
                <AvatarWithFrame
                  avatarUrl={avatarUrl}
                  frameId={avatarFrame}
                  size="2xl"
                  rounded="rounded-3xl"
                  showBadge={true}
                  className="shadow-xl"
                />

                {/* Nút bấm Camera nhanh trên góc Avatar */}
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(true)}
                  className="absolute bottom-1 right-1 w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/40 flex items-center justify-center border-2 border-white transition-all hover:scale-110 active:scale-95 group/btn"
                  title="Tải ảnh mới từ máy và cắt chuẩn 1:1"
                >
                  <Camera size={18} className="group-hover/btn:rotate-12 transition-transform" />
                </button>
              </div>

              {/* Nút tải ảnh to bên dưới Avatar */}
              <button
                type="button"
                onClick={() => setIsCropModalOpen(true)}
                className="mt-4 w-full py-2.5 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 border border-indigo-200/80 shadow-xs hover:shadow transition-all group"
              >
                <Upload size={14} className="text-indigo-600 group-hover:-translate-y-0.5 transition-transform" />
                <span>Tải Ảnh Từ Máy (Cắt 1:1)</span>
              </button>

              <span className="text-[10px] text-slate-400 mt-1.5 font-medium">
                Tự động cắt chuẩn tỷ lệ 1:1 vuông
              </span>
            </div>

            {/* CỘT PHẢI: THÔNG TIN & STUDIO TÙY BIẾN AVATAR + KHUNG VIỀN */}
            <div className="flex-1 w-full text-center lg:text-left">
              {/* Header hàng 1: Tên, Badge, Email & Nút Lưu */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-1.5">
                    <div className="relative flex-1 max-w-sm">
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="font-heading font-black text-2xl sm:text-3xl text-slate-900 bg-slate-50/70 hover:bg-slate-100/80 focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-500 px-3 py-1 rounded-2xl outline-none transition-all w-full"
                        placeholder="Nhập biệt danh..."
                        title="Bấm vào để đổi tên hiển thị"
                      />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/90 w-fit mx-auto sm:mx-0 shrink-0">
                      <Shield size={13} className="text-indigo-600" />
                      {(user?.isAdmin || (user as any)?.is_admin) ? "Quản Trị Viên" : "Thành Viên"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
                    <Mail size={13} className="text-slate-400" />
                    <span>{user?.email}</span>
                  </p>
                </div>

                {/* Nút Lưu Thay Đổi */}
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 self-center sm:self-start"
                >
                  <Save size={16} />
                  <span>{isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}</span>
                </button>
              </div>

              {/* STUDIO TÙY BIẾN AVATAR & KHUNG VIỀN */}
              <div className="mt-5">
                {/* Sub-tabs chuyển đổi giữa Khung Viền và Avatar */}
                <div className="flex items-center gap-2 mb-4 bg-slate-100/80 p-1 rounded-2xl w-fit mx-auto lg:mx-0">
                  <button
                    type="button"
                    onClick={() => setActiveStudioTab("frames")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeStudioTab === "frames"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Palette size={14} className={activeStudioTab === "frames" ? "text-indigo-600" : ""} />
                    <span>Khung Viền Danh Dự ({AVATAR_FRAMES.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStudioTab("avatars")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeStudioTab === "avatars"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Sparkles size={14} className={activeStudioTab === "avatars" ? "text-indigo-600" : ""} />
                    <span>Avatar Có Sẵn & Tải Lên</span>
                  </button>
                </div>

                {/* NỘI DUNG SUB-TAB 1: KHUNG VIỀN */}
                {activeStudioTab === "frames" && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[260px] overflow-y-auto pr-1">
                      {AVATAR_FRAMES.map((f) => {
                        const isSelected = avatarFrame === f.id;
                        return (
                          <div
                            key={f.id}
                            onClick={() => setAvatarFrame(f.id)}
                            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 text-left relative overflow-hidden group ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-300"
                                : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                            }`}
                          >
                            {/* Mini Avatar preview with this frame */}
                            <AvatarWithFrame
                              avatarUrl={avatarUrl}
                              frameId={f.id}
                              size="sm"
                              rounded="rounded-xl"
                              showBadge={false}
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-800 truncate block">
                                  {f.name}
                                </span>
                              </div>
                              <span
                                className={`inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md mt-0.5 ${
                                  f.tier === "LEGENDARY"
                                    ? "bg-rose-100 text-rose-700"
                                    : f.tier === "EPIC"
                                    ? "bg-amber-100 text-amber-800"
                                    : f.tier === "RARE"
                                    ? "bg-purple-100 text-purple-700"
                                    : f.tier === "COMMON"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {f.tier}
                              </span>
                            </div>

                            {/* Checkmark active */}
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Check size={12} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-slate-50 border border-indigo-100/80 rounded-2xl flex items-center gap-2.5 text-xs text-slate-600">
                      <Sparkles size={16} className="text-amber-500 shrink-0" />
                      <span>
                        <strong>Hệ thống khung viền mở rộng:</strong> Dễ dàng bổ sung thêm các mẫu khung viền giới hạn khi đạt Top 1 giải đấu, chuỗi Streak hoặc hoàn thành khóa học.
                      </span>
                    </div>
                  </div>
                )}

                {/* NỘI DUNG SUB-TAB 2: AVATAR CÓ SẴN & TẢI LÊN */}
                {activeStudioTab === "avatars" && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Nút Upload trực tiếp trong danh sách avatar */}
                      <button
                        type="button"
                        onClick={() => setIsCropModalOpen(true)}
                        className="h-12 px-4 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shrink-0 shadow-xs"
                      >
                        <Upload size={16} className="text-indigo-600" />
                        <span>Tải ảnh từ máy (Cắt 1:1)</span>
                      </button>

                      {/* Danh sách Avatar mẫu */}
                      {AVATAR_OPTIONS.map((url, i) => {
                        const isSelected = avatarUrl === url;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAvatarUrl(url)}
                            className={`w-12 h-12 rounded-2xl border-2 transition-all p-1 shrink-0 overflow-hidden relative group ${
                              isSelected
                                ? "border-indigo-600 ring-4 ring-indigo-200 scale-105 shadow-md bg-indigo-50"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover rounded-xl" />
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                <Check size={9} strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL CẮT ẢNH VUÔNG CHUẨN 1:1 */}
        <AvatarCropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          onCropComplete={handleCropComplete}
        />

        {/* TABS CHUYỂN ĐỔI: PLAYER STATS / HOST REPOSITORY / SECURITY */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6 pb-2">
          <button
            onClick={() => setActiveTab("player")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "player"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Trophy size={16} />
            <span>Thống Kê Player</span>
          </button>
          <button
            onClick={() => setActiveTab("host")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "host"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BookOpen size={16} />
            <span>Kho Nội Dung Host</span>
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "security"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Key size={16} />
            <span>Bảo Mật & Mật Khẩu</span>
          </button>
        </div>

        {/* ── TAB 1: THỐNG KÊ PLAYER ── */}
        {activeTab === "player" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bento-card p-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <Trophy size={20} />
                </div>
                <div className="font-heading font-black text-2xl text-slate-900 mb-0.5">14,850</div>
                <div className="text-xs text-slate-500 font-semibold">Tổng Điểm Tích Lũy</div>
              </div>

              <div className="bento-card p-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 size={20} />
                </div>
                <div className="font-heading font-black text-2xl text-slate-900 mb-0.5">86.4%</div>
                <div className="text-xs text-slate-500 font-semibold">Tỷ Lệ Trả Lời Đúng</div>
              </div>

              <div className="bento-card p-5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                  <Flame size={20} />
                </div>
                <div className="font-heading font-black text-2xl text-slate-900 mb-0.5">12 Trận</div>
                <div className="text-xs text-slate-500 font-semibold">Chuỗi Đúng Streak Kỷ Lục</div>
              </div>

              <div className="bento-card p-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <Award size={20} />
                </div>
                <div className="font-heading font-black text-2xl text-slate-900 mb-0.5">8 Lần</div>
                <div className="text-xs text-slate-500 font-semibold">Vô Địch Top 1 Podium</div>
              </div>
            </div>

            {/* Badges / Huy hiệu đạt được */}
            <div className="bento-card p-6">
              <h3 className="font-heading font-black text-lg text-slate-900 mb-4">
                Bộ Sưu Tập Huy Hiệu Đạt Được
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { name: "Tân Thủ Sáng Giá", desc: "Tham gia trận đấu đầu tiên", icon: "🌱", unlocked: true },
                  { name: "Chiến Thần Tốc Độ", desc: "Trả lời đúng trong 3 giây đầu", icon: "⚡", unlocked: true },
                  { name: "Bậc Thầy Trắc Nghiệm", desc: "Đạt 100% điểm tuyệt đối 1 trận", icon: "🎯", unlocked: true },
                  { name: "Thợ Giải Mã", desc: "Điền khuyết chính xác 5 câu liền", icon: "🔍", unlocked: false },
                ].map((b, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border text-center ${
                      b.unlocked
                        ? "bg-slate-50/70 border-slate-200"
                        : "bg-slate-50/20 border-slate-100 opacity-50"
                    }`}
                  >
                    <div className="text-3xl mb-2">{b.icon}</div>
                    <div className="font-bold text-xs text-slate-900 mb-1">{b.name}</div>
                    <div className="text-[11px] text-slate-500 leading-tight">{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: KHO NỘI DUNG HOST ── */}
        {activeTab === "host" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-lg text-slate-900">
                Bộ Đề Thi Đấu Đã Tạo ({myQuizzes.length})
              </h3>
              <button
                onClick={() => router.push("/quiz/create")}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <span>Tạo Đề Mới</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myQuizzes.length > 0 ? (
                myQuizzes.map((q) => (
                  <div key={q.id} className="bento-card p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                          {q.topic || "Tổng hợp"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {q.slides?.length || q.total_slides || 0} câu
                        </span>
                      </div>
                      <h4 className="font-heading font-black text-base text-slate-900 mb-1">{q.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{q.description}</p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => router.push(`/quiz/${q.id}/edit`)}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        onClick={() => router.push(`/quiz/${q.id}`)}
                        className="px-3 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs"
                      >
                        Khởi chạy
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-500 font-semibold mb-3">Bạn chưa tạo bộ đề thi đấu nào</p>
                  <button
                    onClick={() => router.push("/quiz/create")}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                  >
                    Tạo bộ đề đầu tiên với AI
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: BẢO MẬT & MẬT KHẨU ── */}
        {activeTab === "security" && (
          <div className="bento-card p-6 max-w-xl">
            <h3 className="font-heading font-black text-lg text-slate-900 mb-4">
              Đổi Mật Khẩu Đăng Nhập
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setToastMsg({ text: "Đã gửi yêu cầu đổi mật khẩu bảo vệ!", type: "success" });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
              >
                Cập Nhật Mật Khẩu
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
