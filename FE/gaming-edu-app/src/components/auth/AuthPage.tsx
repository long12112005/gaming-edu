"use client";

import { useState, useEffect } from "react";
import { 
  Mail, 
  Key, 
  User as UserIcon, 
  ArrowLeft, 
  Sparkles, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Clock, 
  Check, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  GraduationCap, 
  Briefcase, 
  Gamepad2,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";

export default function AuthPage({ defaultTab = "login" }: { defaultTab?: "login" | "register" } = {}) {
  const router = useRouter();
  const { login } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forms
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    role: "TEACHER",
    fullName: "",
    email: "",
    nickname: "",
    password: "",
    otp: "",
  });

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

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.email) {
      setGlobalError("Vui lòng nhập địa chỉ email hợp lệ!");
      return;
    }
    setGlobalError("");
    setIsLoading(true);
    try {
      await api.post("/auth/send-register-otp", { email: registerForm.email });
      setRegisterStep(3);
    } catch (error: any) {
      setGlobalError(error.response?.data?.message || "Không thể gửi mã xác thực OTP. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        email: registerForm.email,
        password: registerForm.password,
        nickname: registerForm.nickname || registerForm.fullName || "Player",
        otp: registerForm.otp,
      });
      login(data.data.user, data.data.token);
      router.push("/");
    } catch (error: any) {
      setGlobalError(error.response?.data?.message || "Mã xác thực OTP không đúng hoặc đã hết hạn.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col relative">
      <SiteHeader />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl bg-white rounded-[24px] border border-slate-200/80 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          {/* CỘT TRÁI: DUAL-TONE BRAND SHOWCASE */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-indigo-300 mb-6">
                <Sparkles size={14} className="text-amber-400" />
                <span>Nền tảng thi đấu GameEdu</span>
              </div>

              <h2 className="font-heading font-black text-2xl lg:text-3xl tracking-tight leading-tight mb-4">
                Học tập sinh động. <br />
                <span className="text-ai-gradient">Thi đấu bùng nổ.</span>
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed mb-8">
                Hòa quyện không gian quản lý tinh giản kiểu Linear/Notion và đấu trường trực tiếp nhiều màu sắc kiểu Kahoot.
              </p>

              {/* Bento Highlights */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Gamepad2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Đấu trường Real-time</h4>
                    <p className="text-xs text-slate-400">Kết nối hàng trăm người cùng lúc qua SignalR</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Sinh đề tự động bằng AI</h4>
                    <p className="text-xs text-slate-400">Tạo slide trắc nghiệm và điền khuyết trong 5 giây</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Test lockout trigger */}
            <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Bảo vệ chống tấn công Brute-force 15 phút</span>
              <button
                type="button"
                onClick={() => setIsLockedOut(true)}
                className="underline hover:text-white transition-colors"
                title="Bấm để xem giao diện khóa tài khoản"
              >
                Mô phỏng khóa
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: FORM AUTHENTICATION */}
          <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center">
            {/* Header Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl max-w-xs mb-8">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setGlobalError("");
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "login"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
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
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "register"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Đăng Ký Mới
              </button>
            </div>

            {/* Error Banner */}
            {globalError && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{globalError}</span>
              </div>
            )}

            {/* FORM ĐĂNG NHẬP */}
            {activeTab === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Địa Chỉ Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="ban@example.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mật Khẩu
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <div className="relative">
                    <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:translate-y-0.5 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? "Đang xác thực..." : "Đăng Nhập Vào Hệ Thống"}
                </button>

                {/* Dev demo account */}
                <div className="pt-4 text-center">
                  <p className="text-xs text-slate-400">
                    Chưa có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("register")}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Đăng ký miễn phí 3 bước
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* FORM ĐĂNG KÝ 3 BƯỚC */}
            {activeTab === "register" && (
              <div>
                {/* Step Progress Indicators */}
                <div className="flex items-center justify-between mb-6">
                  {[
                    { num: 1, label: "Mục đích" },
                    { num: 2, label: "Email" },
                    { num: 3, label: "Mật khẩu & OTP" },
                  ].map((s, idx) => (
                    <div key={s.num} className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          registerStep === s.num
                            ? "bg-indigo-600 text-white shadow-xs"
                            : registerStep > s.num
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {registerStep > s.num ? <Check size={14} /> : s.num}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
                        {s.label}
                      </span>
                      {idx < 2 && <div className="w-8 sm:w-12 h-0.5 bg-slate-200" />}
                    </div>
                  ))}
                </div>

                {/* BƯỚC 1: CHỌN VAI TRÒ */}
                {registerStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="font-heading font-black text-lg text-slate-900">
                      Bạn sử dụng GameEdu với vai trò gì?
                    </h3>
                    <p className="text-xs text-slate-500 -mt-2">
                      Chọn vai trò để chúng tôi tối ưu hóa trải nghiệm phù hợp cho bạn.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      {[
                        { id: "TEACHER", label: "Giáo Viên / Giảng Viên", icon: GraduationCap, desc: "Tạo phòng, quản lý đề thi và phân tích ma trận" },
                        { id: "STUDENT", label: "Học Sinh / Sinh Viên", icon: UserIcon, desc: "Tham gia trận đấu, tự luyện tập và leo bảng xếp hạng" },
                        { id: "TRAINER", label: "Doanh Nghiệp / Trainer", icon: Briefcase, desc: "Đào tạo nội bộ, minigame gắn kết đội ngũ" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRegisterForm({ ...registerForm, role: item.id })}
                          className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                            registerForm.role === item.id
                              ? "bg-indigo-50/50 border-indigo-600 shadow-xs"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <item.icon size={24} className={registerForm.role === item.id ? "text-indigo-600" : "text-slate-400"} />
                          <div className="mt-4">
                            <h4 className="font-bold text-xs text-slate-900">{item.label}</h4>
                            <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setRegisterStep(2)}
                      className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                    >
                      <span>Tiếp Tục</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {/* BƯỚC 2: NHẬP EMAIL & HỌ TÊN */}
                {registerStep === 2 && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <h3 className="font-heading font-black text-lg text-slate-900">
                      Thông tin cơ bản
                    </h3>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Họ và Tên
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nguyễn Văn A"
                        value={registerForm.fullName}
                        onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-600 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Địa Chỉ Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="ban@example.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-600 transition-all"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(1)}
                        className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
                      >
                        Quay lại
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <span>{isLoading ? "Đang gửi OTP..." : "Gửi Mã Xác Thực OTP"}</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </form>
                )}

                {/* BƯỚC 3: MẬT KHẨU & NHẬP OTP */}
                {registerStep === 3 && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <h3 className="font-heading font-black text-lg text-slate-900">
                      Thiết lập Mật khẩu & Nhập OTP
                    </h3>
                    <p className="text-xs text-slate-500 -mt-2">
                      Mã OTP đã được gửi đến <span className="font-bold text-indigo-600">{registerForm.email}</span>.
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        Mã OTP 6 Chữ Số
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={registerForm.otp}
                        onChange={(e) => setRegisterForm({ ...registerForm, otp: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-black tracking-widest text-indigo-900 outline-none focus:bg-white focus:border-indigo-600 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                          Nickname hiển thị
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="NinjaRùa99"
                          value={registerForm.nickname}
                          onChange={(e) => setRegisterForm({ ...registerForm, nickname: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-600 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                          Mật khẩu bảo mật
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          placeholder="••••••••"
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-600 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(2)}
                        className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
                      >
                        Quay lại
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Check size={16} />
                        <span>{isLoading ? "Đang kích hoạt..." : "Hoàn Tất Đăng Ký"}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL CẢNH BÁO KHÓA TÀI KHOẢN DO BRUTE-FORCE (15 PHÚT)
      ══════════════════════════════════════════════════════════════════════ */}
      {isLockedOut && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] border-2 border-rose-200 shadow-2xl max-w-md w-full p-6 sm:p-8 text-center relative overflow-hidden">
            {/* Background warning tone */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <ShieldAlert size={36} />
            </div>

            <h3 className="font-heading font-black text-xl text-slate-900 mb-2">
              Tài Khoản Đang Bị Khóa Tạm Thời!
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Hệ thống phát hiện hơn 5 lần nhập sai mật khẩu liên tiếp. Để ngăn chặn tấn công dò mật khẩu (Brute-force), tài khoản của bạn đã được đưa vào chế độ bảo vệ.
            </p>

            {/* Countdown Box */}
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
