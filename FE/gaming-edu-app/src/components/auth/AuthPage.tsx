"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Clock, 
  AlertCircle, 
  Gamepad2, 
  Gift, 
  Check, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Award
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";

export default function AuthPage({ defaultTab = "login" }: { defaultTab?: "login" | "register" } = {}) {
  const router = useRouter();
  const { login } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forms
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    nickname: "",
    email: "",
    password: "",
    otp: "",
  });

  // State cho OTP verification modal khi đăng ký
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState(60);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [modalError, setModalError] = useState("");

  // Brute-force Lockout Modal State (15 mins = 900s)
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(900);

  // Lockout countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLockedOut && lockoutSecondsLeft > 0) {
      timer = setInterval(() => {
        setLockoutSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            return 900;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLockedOut, lockoutSecondsLeft]);

  // Countdown timer cho gửi lại OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showOtpModal && otpResendCountdown > 0) {
      timer = setInterval(() => {
        setOtpResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, otpResendCountdown]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/login", loginForm);
      login(data.data.user, data.data.token);
      router.push("/");
    } catch (error: any) {
      const msg = error.response?.data?.message || "";
      if (
        msg.toLowerCase().includes("khóa") ||
        msg.toLowerCase().includes("locked") ||
        error.response?.status === 423
      ) {
        setIsLockedOut(true);
        setLockoutSecondsLeft(900);
      } else {
        setGlobalError(msg || "Email hoặc mật khẩu không chính xác. Vui lòng thử lại!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Register (bấm nút "Khởi Tạo Anh Hùng")
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.email || !registerForm.password || !registerForm.nickname) {
      setGlobalError("Vui lòng điền đầy đủ Biệt danh, Email và Mật khẩu!");
      return;
    }
    if (registerForm.password.length < 6) {
      setGlobalError("Mật khẩu phải có tối thiểu 6 ký tự!");
      return;
    }

    setGlobalError("");
    setIsLoading(true);

    setModalError("");
    try {
      // Gửi OTP xác thực tới email
      const res = await api.post("/auth/send-register-otp", { email: registerForm.email });
      if (res.data?.data) {
        setDevOtp(res.data.data);
        setRegisterForm((prev) => ({ ...prev, otp: res.data.data }));
      } else {
        setDevOtp(null);
        setRegisterForm((prev) => ({ ...prev, otp: "" }));
      }
      setShowOtpModal(true);
      setOtpResendCountdown(60);
    } catch (error: any) {
      setGlobalError(error.response?.data?.message || "Không thể gửi mã xác thực OTP. Vui lòng kiểm tra lại email.");
    } finally {
      setIsLoading(false);
    }
  };

  // Gửi lại mã OTP khi đang ở modal xác thực
  const handleResendRegisterOtp = async () => {
    if (otpResendCountdown > 0 || isLoading) return;
    setIsLoading(true);
    setGlobalError("");
    setModalError("");
    try {
      const res = await api.post("/auth/send-register-otp", { email: registerForm.email });
      if (res.data?.data) {
        setDevOtp(res.data.data);
        setRegisterForm((prev) => ({ ...prev, otp: res.data.data }));
      } else {
        setDevOtp(null);
        setRegisterForm((prev) => ({ ...prev, otp: "" }));
      }
      setOtpResendCountdown(60);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Không thể gửi lại mã OTP.";
      setModalError(msg);
      setGlobalError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Xác nhận OTP để hoàn tất đăng ký
  const handleVerifyOtpAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.otp || registerForm.otp.length < 4) {
      setModalError("Vui lòng nhập mã OTP 6 chữ số.");
      return;
    }
    setModalError("");
    setGlobalError("");
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        email: registerForm.email,
        password: registerForm.password,
        nickname: registerForm.nickname,
        otp: registerForm.otp,
      });
      login(data.data.user, data.data.token);
      setShowOtpModal(false);
      router.push("/");
    } catch (error: any) {
      const msg = error.response?.data?.message || "Mã xác thực OTP không chính xác hoặc đã hết hạn.";
      setModalError(msg);
      setGlobalError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900 flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 flex items-center justify-center p-3 sm:p-6 lg:p-10">
        <div className="w-full max-w-6xl bg-white rounded-[32px] sm:rounded-[36px] border border-slate-200/90 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[720px]">
          {/* ══════════════════════════════════════════════════════════════════
              CỘT TRÁI: DARK COSMIC NAVY SHOWCASE (CHUẨN XÁC THEO ẢNH 2 & 3)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 bg-[#121633] text-white p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Nebula Glows */}
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

            {/* Header Cột Trái: Logo & Pill Huy Hiệu */}
            <div className="relative z-10 flex items-center justify-between gap-3 mb-6">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F59E0B] text-slate-950 flex items-center justify-center shadow-md">
                  <Gamepad2 size={20} className="stroke-[2.5]" />
                </div>
                <span className="font-heading font-black text-xl text-white tracking-tight">
                  Clarity <span className="text-amber-400">Edu</span>
                </span>
              </Link>

              {/* Pill góc trên bên phải */}
              <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-2xl flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Gift size={14} />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    {activeTab === "login" ? "Nhiệm vụ hôm nay" : "Phần thưởng tân thủ"}
                  </span>
                  <span className="text-xs font-bold text-white block leading-tight">
                    {activeTab === "login" ? "0/5 bài toán hoàn thành" : "Tặng rương kho báu vàng"}
                  </span>
                </div>
              </div>
            </div>

            {/* Ảnh 3D Artwork ở giữa */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-4">
              <div className="w-full max-w-sm sm:max-w-md aspect-[4/3] relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 shadow-2xl shadow-indigo-950/50 mb-5">
                <Image
                  src={activeTab === "login" ? "/images/auth/island.jpg" : "/images/auth/robot.jpg"}
                  alt={activeTab === "login" ? "Vương Quốc Khám Phá" : "Khởi Tạo Anh Hùng Nhí"}
                  fill
                  priority
                  className="object-cover transition-all duration-700 hover:scale-105"
                />
              </div>

              {/* Tiêu đề & mô tả dưới ảnh */}
              <div className="text-center px-2">
                <h2 className="font-heading font-black text-2xl sm:text-3xl text-white mb-2">
                  {activeTab === "login" ? "Vương Quốc Khám Phá" : "Khởi Tạo Anh Hùng Nhí"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  {activeTab === "login"
                    ? "Giải đáp các câu đố kỳ thú, vượt qua thử thách toán học và nâng cấp tài khoản của bạn để thu thập những linh thú huyền thoại!"
                    : "Chọn nhân vật yêu thích, thiết kế bộ giáp tri thức của riêng bạn và sẵn sàng gia nhập vào liên minh học tập lớn nhất thiên hà!"}
                </p>
              </div>
            </div>

            {/* 3 Huy Hiệu Thông Số Đáy Cột Trái */}
            <div className="relative z-10 grid grid-cols-3 gap-2.5 pt-4 border-t border-white/10">
              {activeTab === "login" ? (
                <>
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <span className="text-base">🦊</span>
                    <div className="overflow-hidden">
                      <span className="text-[10px] text-slate-400 block truncate">Linh thú thu phục</span>
                      <strong className="text-xs font-bold text-white block truncate">12 Linh thú kỳ lân</strong>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <span className="text-base">👥</span>
                    <div className="overflow-hidden">
                      <span className="text-[10px] text-slate-400 block truncate">Cộng đồng đồng hành</span>
                      <strong className="text-xs font-bold text-white block truncate">450K+ Chiến binh nhí</strong>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <span className="text-base">🥉</span>
                    <div className="overflow-hidden">
                      <span className="text-[10px] text-slate-400 block truncate">Thành tích</span>
                      <strong className="text-xs font-bold text-white block truncate">Nhà Học Giả Đồng</strong>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <span className="text-base">🛡️</span>
                    <div className="overflow-hidden">
                      <span className="text-[10px] text-slate-400 block truncate">Cấp độ xuất phát</span>
                      <strong className="text-xs font-bold text-white block truncate">Cấp 1 · Tập Sự</strong>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <span className="text-base">🎁</span>
                    <div className="overflow-hidden">
                      <span className="text-[10px] text-slate-400 block truncate">Phần quà tân thủ</span>
                      <strong className="text-xs font-bold text-white block truncate">Nhận phi hành gia</strong>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <div className="overflow-hidden">
                      <span className="text-[10px] text-slate-400 block truncate">Tăng tốc học tập</span>
                      <strong className="text-xs font-bold text-white block truncate">+200% EXP Tuần</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              CỘT PHẢI: FORM AUTHENTICATION TRẮNG TINH TẾ (CHUẨN THEO ẢNH 2 & 3)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 p-6 sm:p-10 lg:p-14 flex flex-col justify-center bg-white">
            {/* Top Badge: [GAME EDU] Vương Quốc Tri Thức */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#4C49E8] text-white text-[11px] font-black uppercase tracking-wider">
                GAME EDU
              </span>
              <span className="font-heading font-black text-sm text-[#4C49E8]">
                Vương Quốc Tri Thức
              </span>
            </div>

            {/* Tiêu đề chính */}
            <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-[34px] text-slate-900 tracking-tight leading-tight mb-2">
              Khai mở tiềm năng của bạn
            </h1>

            {/* Phụ đề */}
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              {activeTab === "login"
                ? "Chào mừng chiến binh nhí trở lại! Hãy đăng nhập để tiếp tục hành trình học tập đầy kỳ thú hôm nay."
                : "Gia nhập liên minh học tập ngay! Tạo tài khoản dễ dàng trong 1 phút để mở khoá hơn 1000 nhiệm vụ học tập."}
            </p>

            {/* Segmented Capsule Tabs: Đăng Nhập | Đăng Ký */}
            <div className="flex items-center p-1 bg-slate-100/90 rounded-full max-w-sm mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setGlobalError("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
                  activeTab === "login"
                    ? "bg-white text-[#4C49E8] shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setGlobalError("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
                  activeTab === "register"
                    ? "bg-white text-[#4C49E8] shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Đăng Ký
              </button>
            </div>

            {/* Error Banner */}
            {globalError && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{globalError}</span>
              </div>
            )}

            {/* ── FORM TAB ĐĂNG NHẬP (ẢNH 2) ── */}
            {activeTab === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="Email@gmail.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:border-[#4C49E8] focus:ring-4 focus:ring-indigo-100 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:border-[#4C49E8] focus:ring-4 focus:ring-indigo-100 transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="text-right mt-1.5">
                    <Link
                      href="#forgot"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Vui lòng liên hệ Admin để khôi phục mật khẩu.");
                      }}
                      className="text-xs font-semibold text-[#4C49E8] hover:underline"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl bg-[#4C49E8] hover:bg-[#3E3BD4] text-white font-heading font-black text-sm shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  <span>{isLoading ? "Đang xử lý..." : "Bắt Đầu Học Ngay"}</span>
                </button>
              </form>
            )}

            {/* ── FORM TAB ĐĂNG KÝ (ẢNH 3) ── */}
            {activeTab === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Biệt danh (Tên nhân vật)
                  </label>
                  <div className="relative">
                    <UserIcon size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Hiệp Sĩ Ánh Sáng"
                      value={registerForm.nickname}
                      onChange={(e) => setRegisterForm({ ...registerForm, nickname: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:border-[#4C49E8] focus:ring-4 focus:ring-indigo-100 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="hero_tap_su@gmail.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:border-[#4C49E8] focus:ring-4 focus:ring-indigo-100 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="Tối thiểu 8 ký tự"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 outline-none focus:border-[#4C49E8] focus:ring-4 focus:ring-indigo-100 transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl bg-[#4C49E8] hover:bg-[#3E3BD4] text-white font-heading font-black text-sm shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  <span>{isLoading ? "Đang khởi tạo..." : "Khởi Tạo Anh Hùng"}</span>
                </button>
              </form>
            )}

            {/* Divider "Hoặc tiếp tục với" */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-xs text-slate-400 font-semibold">
                Hoặc tiếp tục với
              </span>
            </div>

            {/* 2 Nút Mạng Xã Hội Google & Facebook */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => alert("Đăng nhập bằng Google đang được cập nhật!")}
                className="py-3 px-4 rounded-2xl border border-slate-200/90 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-xs font-bold text-slate-700 shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => alert("Đăng nhập bằng Facebook đang được cập nhật!")}
                className="py-3 px-4 rounded-2xl border border-slate-200/90 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-xs font-bold text-slate-700 shadow-xs"
              >
                <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL NHẬP MÃ OTP KHI ĐĂNG KÝ
      ══════════════════════════════════════════════════════════════════════ */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[28px] border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Mail size={28} />
            </div>
            <h3 className="font-heading font-black text-xl text-slate-900 mb-1">
              Xác Thực Tài Khoản
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Mã OTP 6 số đã được gửi đến email <strong className="text-slate-800">{registerForm.email}</strong>
            </p>

            {devOtp && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-500" />
                    Mã OTP thử nghiệm (Dev Mode)
                  </span>
                  <button
                    type="button"
                    onClick={() => setRegisterForm((prev) => ({ ...prev, otp: devOtp }))}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2 py-0.5 rounded-lg border border-indigo-200"
                  >
                    Điền tự động
                  </button>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-amber-700">Mã của bạn:</span>
                  <span className="font-mono font-black text-lg text-amber-900 tracking-wider">{devOtp}</span>
                </div>
                <p className="text-[10px] text-amber-600 mt-1">
                  Hệ thống chưa cấu hình tài khoản Gmail gửi thư thật. Mã được sinh trực tiếp để bạn kích hoạt ngay.
                </p>
              </div>
            )}

            {modalError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 text-left animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtpAndComplete} className="space-y-4">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                value={registerForm.otp}
                onChange={(e) => setRegisterForm({ ...registerForm, otp: e.target.value.replace(/\D/g, "") })}
                className="w-full py-3 bg-slate-50 border-2 border-indigo-200 rounded-xl text-center font-mono font-black text-2xl tracking-widest text-indigo-900 outline-none focus:bg-white focus:border-indigo-600 transition-all"
              />

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs text-slate-500">Chưa nhận được mã?</span>
                <button
                  type="button"
                  onClick={handleResendRegisterOtp}
                  disabled={otpResendCountdown > 0 || isLoading}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 transition-colors"
                >
                  {otpResendCountdown > 0 ? `Gửi lại sau ${otpResendCountdown}s` : "Gửi lại mã OTP"}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || registerForm.otp.length < 4}
                className="w-full py-3.5 rounded-xl bg-[#4C49E8] hover:bg-[#3E3BD4] text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {isLoading ? "Đang kích hoạt..." : "Kích Hoạt Tài Khoản"}
              </button>

              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors"
              >
                Hủy và quay lại
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL CẢNH BÁO KHÓA TÀI KHOẢN DO BRUTE-FORCE (15 PHÚT)
      ══════════════════════════════════════════════════════════════════════ */}
      {isLockedOut && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] border-2 border-rose-200 shadow-2xl max-w-md w-full p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <ShieldAlert size={36} />
            </div>

            <h3 className="font-heading font-black text-xl text-slate-900 mb-2">
              Tài Khoản Đang Bị Khóa Tạm Thời!
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Hệ thống phát hiện hơn 5 lần nhập sai mật khẩu liên tiếp. Tài khoản đã được đưa vào chế độ bảo vệ chống tấn công Brute-force.
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6">
              <div className="text-[11px] font-bold text-rose-700 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
                <Clock size={14} />
                <span>Thời Gian Mở Khóa Tự Động</span>
              </div>
              <div className="font-heading font-black text-4xl text-rose-600 tracking-wider font-mono">
                {formatCountdown(lockoutSecondsLeft)}
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsLockedOut(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
              >
                Đóng thông báo
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLockedOut(false);
                  setLockoutSecondsLeft(900);
                  setGlobalError("");
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
              >
                Mở khóa ngay (Chế độ Thử nghiệm / Dev)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
