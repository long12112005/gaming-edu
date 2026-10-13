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
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore, UserQuota } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, logout, isAuthenticated } = useAuthStore();

  const [nickname, setNickname] = useState(user?.nickname || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || user?.avatarUrl || "");
  const [password, setPassword] = useState("");

  const [quota, setQuota] = useState<UserQuota>({
    aiGenerationLimit: user?.quota?.aiGenerationLimit ?? user?.ai_generation_limit ?? 10,
    aiUsedToday: user?.quota?.aiUsedToday ?? user?.ai_used_today ?? 0,
    maxRoomCapacity: user?.quota?.maxRoomCapacity ?? 50,
    resetDate: user?.quota?.resetDate ?? null,
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Confirm delete account
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !Cookies.get("token")) {
      router.push("/login");
      return;
    }

    // Gọi GET /api/users/profile để lấy dữ liệu thực tế
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get("/users/profile");
        if (res.data?.success && res.data.data) {
          const profileData = res.data.data;
          setNickname(profileData.nickname || "");
          setAvatarUrl(profileData.avatarUrl || "");
          if (profileData.quota) {
            setQuota({
              aiGenerationLimit: profileData.quota.aiGenerationLimit ?? 10,
              aiUsedToday: profileData.quota.aiUsedToday ?? 0,
              maxRoomCapacity: profileData.quota.maxRoomCapacity ?? 50,
              resetDate: profileData.quota.resetDate ?? null,
            });
          }
          // Cập nhật auth store
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
        console.warn("Lỗi khi gọi GET /api/users/profile (hoặc BE chưa có):", err);
        // Fallback giữ nguyên từ auth state
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, router, setUser]);

  // Cập nhật thông tin profile
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setToastMsg({ text: "Tên hiển thị không được để trống.", type: "error" });
      return;
    }

    try {
      setIsSaving(true);
      const res = await api.put("/users/profile", {
        nickname: nickname.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });

      if (res.data?.success) {
        setToastMsg({ text: "Cập nhật hồ sơ thành công!", type: "success" });
        setUser({ nickname: nickname.trim(), avatar_url: avatarUrl.trim(), avatarUrl: avatarUrl.trim() });
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setToastMsg({
        text: errorObj.response?.data?.message || "Cập nhật hồ sơ thất bại.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Tự xóa tài khoản cá nhân
  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await api.delete("/users/me");
      logout();
      router.push("/login");
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setToastMsg({
        text: errorObj.response?.data?.message || "Không thể xóa tài khoản.",
        type: "error",
      });
      setIsDeleting(false);
    }
  };

  // Tính toán Quota
  const aiUsed = quota.aiUsedToday;
  const aiLimit = quota.aiGenerationLimit || 10;
  const aiPercent = Math.min(100, Math.round((aiUsed / aiLimit) * 100));
  const isQuotaExceeded = aiUsed >= aiLimit;
  const maxCapacity = quota.maxRoomCapacity || 50;

  return (
    <div className="min-h-screen text-[#1B2A2E] font-serif flex flex-col relative overflow-hidden">
      {/* Background Tiên môn phong cảnh */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-pine-lake.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="fixed inset-0 z-0 bg-[#eef8f5]/60 backdrop-blur-[2px]" />

      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-4xl mx-auto w-full relative z-10 space-y-8 font-sans">
        {/* Profile Banner */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-[32px] p-6 md:p-8 shadow-[0_16px_40px_rgba(8,38,42,0.1)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-300 via-emerald-400 to-cyan-400 p-1 shadow-[0_0_25px_rgba(56,189,248,0.35)]">
                <div className="w-full h-full rounded-full bg-[#08282e] flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-cyan-200" />
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 rounded-full font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles size={13} /> Thành Viên Gaming Edu
              </div>
              <h1 className="text-2xl md:text-3xl font-bold font-serif text-[#08282e] tracking-tight">
                {nickname || "Người Dùng"}
              </h1>
              <p className="text-teal-800/70 text-sm mt-1">{user?.email || "Chưa cập nhật email"}</p>
            </div>
          </div>

          {/* Quota Highlights Box */}
          <div className="bg-white/80 backdrop-blur-md border border-teal-200/80 rounded-2xl p-4 w-full md:w-auto shadow-sm flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-teal-700" />
              <span className="text-xs font-bold text-teal-900">
                Sức chứa phòng thi: <span className="font-black text-teal-950">{maxCapacity} người chơi</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-600" />
              <span className="text-xs font-bold text-teal-900">
                Đã dùng hôm nay:{" "}
                <span className={`font-black ${isQuotaExceeded ? "text-rose-600" : "text-amber-700"}`}>
                  {aiUsed} / {aiLimit}
                </span>{" "}
                lượt
              </span>
            </div>
          </div>
        </div>

        {/* Cụm Hiển Thị Quota Chi Tiết (Task 8) */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-[32px] p-6 md:p-8 shadow-[0_16px_40px_rgba(8,38,42,0.1)] space-y-6">
          <div className="flex items-center justify-between border-b border-teal-200/50 pb-4">
            <div>
              <h2 className="text-xl font-bold font-serif text-[#08282e] flex items-center gap-2">
                <Zap size={22} className="text-amber-500" />
                <span>Hạn Mức & Quota Tài Khoản</span>
              </h2>
              <p className="text-xs text-teal-800/70 mt-0.5">
                Được cập nhật tự động theo thời gian thực từ máy chủ API.
              </p>
            </div>
            {isQuotaExceeded && (
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs flex items-center gap-1 animate-pulse">
                <AlertTriangle size={13} /> Hết lượt hôm nay
              </span>
            )}
          </div>

          {/* Thẻ Quota AI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-teal-950">Lượt AI đã sử dụng trong ngày</span>
              <span className="text-base font-black font-mono text-teal-950">
                <span className={isQuotaExceeded ? "text-rose-600 font-black text-xl" : "text-amber-600 font-black text-xl"}>
                  {aiUsed}
                </span>{" "}
                / {aiLimit} lượt
              </span>
            </div>

            {/* Thanh tiến trình Progress Bar */}
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden p-0.5 border border-teal-200/60 shadow-inner">
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

            <div className="flex items-center justify-between text-xs text-teal-800/70 font-semibold">
              <span>Đã sử dụng {aiPercent}%</span>
              <span>{isQuotaExceeded ? "0 lượt còn lại" : `Còn ${Math.max(0, aiLimit - aiUsed)} lượt`}</span>
            </div>

            {/* Cảnh báo khi hết Quota */}
            {isQuotaExceeded && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                <span>
                  Bạn đã dùng hết {aiLimit} lượt sinh đề AI hôm nay. Hạn mức sẽ tự động đặt lại vào 00:00 ngày mai.
                </span>
              </div>
            )}
          </div>

          {/* Sức Chứa Phòng Thi Đấu */}
          <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                <Users size={20} />
              </div>
              <div>
                <p className="font-bold text-teal-950 text-sm">Sức Chứa Phòng Tối Đa</p>
                <p className="text-xs text-teal-800/70">Số lượng người chơi có thể cùng tham gia một phòng thi</p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl font-black text-teal-950">{maxCapacity}</span>
              <span className="text-xs font-bold text-teal-800/70 ml-1">người chơi</span>
            </div>
          </div>
        </div>

        {/* Thông báo toast */}
        {toastMsg && (
          <div
            className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between animate-in fade-in ${
              toastMsg.type === "success"
                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-950"
                : "bg-rose-500/20 border-rose-400/50 text-rose-950"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === "success" ? (
                <CheckCircle2 size={18} className="text-emerald-700" />
              ) : (
                <AlertCircle size={18} className="text-rose-700" />
              )}
              <span>{toastMsg.text}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-gray-600 hover:text-black">
              ✕
            </button>
          </div>
        )}

        {/* Profile edit card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-[32px] p-6 md:p-10 shadow-[0_16px_40px_rgba(8,38,42,0.1)]">
          <div className="mb-6 pb-4 border-b border-teal-200/50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-serif text-[#08282e]">Chỉnh Sửa Thông Tin Cá Nhân</h2>
              <p className="text-teal-800/70 text-xs mt-0.5">Cập nhật tên hiển thị và ảnh đại diện của bạn.</p>
            </div>
            <Shield size={24} className="text-teal-600/50" />
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Email (Readonly) */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-teal-900 uppercase tracking-wider">
                <Mail size={14} className="text-teal-600" /> Địa Chỉ Email
              </label>
              <input
                type="email"
                value={user?.email || "user@example.com"}
                readOnly
                className="w-full px-5 py-3.5 bg-gray-100/80 border border-teal-200 rounded-2xl text-teal-800/70 font-semibold cursor-not-allowed outline-none"
              />
            </div>

            {/* Nickname */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-teal-900 uppercase tracking-wider">
                <User size={14} className="text-amber-600" /> Tên Hiển Thị (Nickname)
              </label>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Nhập tên hiển thị của bạn..."
                className="w-full px-5 py-3.5 bg-white border-2 border-teal-200 rounded-2xl text-teal-950 font-bold outline-none focus:border-teal-600 transition-colors"
              />
            </div>

            {/* Avatar URL */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-teal-900 uppercase tracking-wider">
                <Camera size={14} className="text-teal-600" /> Đường Dẫn Ảnh Đại Diện (Avatar URL)
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full px-5 py-3.5 bg-white border-2 border-teal-200 rounded-2xl text-teal-950 font-semibold outline-none focus:border-teal-600 transition-colors text-xs"
              />
            </div>

            {/* Submit Button & Delete Account */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={15} /> Xóa tài khoản của tôi
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-black text-base rounded-2xl shadow-[0_0_25px_rgba(251,191,36,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-teal-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} /> Lưu Thay Đổi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* ── MODAL XÁC NHẬN XÓA TÀI KHOẢN ── */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/40 backdrop-blur-sm animate-in fade-in font-sans">
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-[32px] max-w-md w-full p-8 shadow-[0_25px_60px_rgba(8,38,42,0.3)]">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-600 mb-5">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-2xl font-bold font-serif text-[#08282e] mb-2">Tự Xóa Tài Khoản?</h3>
            <p className="text-teal-900/80 text-sm mb-6 leading-relaxed">
              Tài khoản của bạn sẽ được chuyển sang trạng thái DELETED và phiên làm việc sẽ bị hủy. Mọi dữ liệu bộ đề và nhóm của bạn sẽ không thể phục hồi.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-60"
              >
                {isDeleting ? "Đang Xóa..." : "Xác Nhận Xóa Vĩnh Viễn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
