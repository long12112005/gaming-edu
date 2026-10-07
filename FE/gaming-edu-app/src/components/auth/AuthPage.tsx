"use client";

import { useState } from "react";
import { Mail, Lock, User, Trophy, Sparkles, Zap, Users, Key, Gamepad2 } from "lucide-react";
import Input from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";

type AuthTab = "login" | "register";
type RegisterStep = 1 | 2;

const features = [
  { icon: Zap, label: "Học tập vui vẻ", color: "text-amber-500", bg: "bg-amber-100 border-amber-200" },
  { icon: Users, label: "Kết nối bạn bè", color: "text-blue-500", bg: "bg-blue-100 border-blue-200" },
  { icon: Trophy, label: "Trò chơi kích thích", color: "text-emerald-500", bg: "bg-emerald-100 border-emerald-200" },
  { icon: Sparkles, label: "Siêu mượt mà", color: "text-pink-500", bg: "bg-pink-100 border-pink-200" },
];

function ActionButton({ label, onClick, disabled, loading, variant = "primary", className = "", type = "button" }: any) {
  const baseClasses = `relative flex items-center justify-center gap-2 font-900 rounded-[20px] border-4 transition-all duration-200 active:translate-y-2 w-full py-4 text-lg ${className}`;
  const variants: any = {
    primary: "bg-violet-500 border-violet-700 text-white shadow-[0_6px_0_0_#5b21b6] hover:bg-violet-600 active:shadow-none",
    outline: "bg-white border-gray-200 text-gray-700 shadow-[0_6px_0_0_#e5e7eb] hover:bg-gray-50 active:shadow-none",
    disabled: "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed shadow-[0_6px_0_0_#9ca3af]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${disabled ? variants.disabled : variants[variant]}`}
    >
      {loading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : label}
    </button>
  );
}

function SocialButton({ icon, label, id }: { icon: string; label: string; id: string }) {
  return (
    <button
      id={id}
      type="button"
      className="flex-1 w-full flex items-center justify-center gap-3 py-4 px-4 bg-white border-4 border-gray-200 rounded-[20px] font-900 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-[0_6px_0_0_#e5e7eb] active:translate-y-2 active:shadow-none transition-all duration-200"
    >
      <img src={icon} alt={label} className="w-6 h-6" />
      {label}
    </button>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ nickname: "", email: "", password: "", otp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateLogin = () => {
    const e: Record<string, string> = {};
    if (!loginForm.email.includes("@")) e.email = "Email không hợp lệ";
    if (loginForm.password.length < 6) e.password = "Mật khẩu ít nhất 6 ký tự";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRegisterStep1 = () => {
    const e: Record<string, string> = {};
    if (!registerForm.nickname || registerForm.nickname.length < 2) e.nickname = "Biệt danh ít nhất 2 ký tự";
    if (!registerForm.email.includes("@")) e.email = "Email không hợp lệ";
    if (registerForm.password.length < 6) e.password = "Mật khẩu ít nhất 6 ký tự";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    if (!validateLogin()) return;
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/login", loginForm);
      login(data.data.user, data.data.token);
      router.push("/dashboard");
    } catch (error: any) {
      setGlobalError(error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    if (!validateRegisterStep1()) return;
    setIsLoading(true);
    try {
      await api.post("/auth/send-register-otp", { email: registerForm.email });
      setRegisterStep(2);
      setGlobalError("");
    } catch (error: any) {
      setGlobalError(error.response?.data?.message || "Không thể gửi OTP. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    if (!registerForm.otp || registerForm.otp.length < 6) {
      setErrors({ otp: "Mã OTP phải có 6 ký tự" });
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/register", registerForm);
      login(data.data.user, data.data.token);
      router.push("/dashboard");
    } catch (error: any) {
      setGlobalError(error.response?.data?.message || "Mã OTP không hợp lệ.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F4F1FA] font-sans">
      {/* LEFT PANEL (HERO) */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] xl:w-[40%] p-12 relative overflow-hidden bg-white border-r-4 border-gray-200 shadow-xl z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-fuchsia-400/20 rounded-full blur-3xl pointer-events-none" />
        
        <Link href="/" className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg">
            <Gamepad2 size={24} className="text-white" />
          </div>
          <span className="font-900 text-2xl text-gray-900 tracking-tight">
            <span className="text-violet-600">Gaming</span>Edu
          </span>
        </Link>

        <div className="relative z-10 flex flex-col items-center text-center px-4">
          <div className="relative mb-10">
            <div className="w-64 h-64 rounded-[40px] bg-violet-50 border-4 border-violet-100 flex items-center justify-center shadow-[4px_4px_16px_rgba(0,0,0,0.05),_inset_-4px_-4px_8px_rgba(0,0,0,0.02)]">
               <div className="text-9xl select-none transform hover:scale-110 transition-transform duration-500 cursor-pointer animate-bounce">
                  🚀
               </div>
            </div>
          </div>

          <h2 className="text-3xl xl:text-4xl font-black text-gray-900 mb-6 leading-tight tracking-tight">
            Vừa Học Vừa Chơi <br />
            <span className="text-violet-600">Điểm Mười Trao Tay!</span>
          </h2>
          <p className="text-lg font-700 text-gray-500 max-w-sm">
            Nền tảng tạo câu hỏi, bài tập, trò chơi trắc nghiệm và báo cáo kết quả với sức mạnh của AI.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4">
            {features.map(({ icon: Icon, label, color, bg }) => (
              <div key={label} className={`flex items-center gap-3 rounded-[20px] border-4 px-4 py-3 shadow-sm ${bg}`}>
                <Icon size={24} className={color} />
                <span className="text-sm font-900 text-gray-700">{label}</span>
              </div>
            ))}
        </div>
      </div>

      {/* RIGHT PANEL (FORM) */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-md relative z-20">
          
          <div className="lg:hidden flex items-center gap-3 justify-center mb-10">
            <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg">
              <Gamepad2 size={28} className="text-white" />
            </div>
            <span className="font-900 text-3xl text-gray-900 tracking-tight">
              <span className="text-violet-600">Gaming</span>Edu
            </span>
          </div>

          <div className="bg-white rounded-[40px] shadow-[4px_4px_16px_rgba(0,0,0,0.05)] border-4 border-gray-100 p-8 md:p-10">
            
            {/* TABS */}
            <div className="flex bg-gray-100 rounded-[24px] p-2 mb-10 border-4 border-gray-200">
              {(["login", "register"] as AuthTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setRegisterStep(1);
                    setErrors({});
                    setGlobalError("");
                  }}
                  className={`flex-1 py-3 text-lg font-900 rounded-[16px] transition-all duration-300 ${
                    activeTab === tab
                      ? "bg-white text-violet-700 shadow-md border-2 border-white"
                      : "text-gray-500 hover:text-gray-700 border-2 border-transparent"
                  }`}
                >
                  {tab === "login" ? "Đăng Nhập" : "Đăng Ký"}
                </button>
              ))}
            </div>

            {globalError && (
              <div className="mb-6 p-4 bg-red-100 border-4 border-red-200 text-red-700 text-sm font-800 rounded-[20px] flex items-center gap-3">
                <span className="text-xl">⚠️</span> {globalError}
              </div>
            )}

            {/* LOGIN FORM */}
            {activeTab === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="text-sm font-900 text-gray-700 block mb-2 uppercase tracking-widest">Địa chỉ Email</label>
                  <Input
                    icon={Mail}
                    type="email"
                    placeholder="Email@gmail.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    error={errors.email}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-900 text-gray-700 uppercase tracking-widest">Mật Khẩu</label>
                    <button type="button" className="text-sm font-800 text-violet-600 hover:text-violet-800 transition-colors">
                      Quên mật khẩu?
                    </button>
                  </div>
                  <Input
                    icon={Lock}
                    type="password"
                    showPasswordToggle
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    error={errors.password}
                  />
                </div>
                <div className="pt-4">
                   <ActionButton type="submit" variant="primary" loading={isLoading} label="ĐĂNG NHẬP" />
                </div>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={registerStep === 1 ? handleSendOtp : handleRegisterSubmit} className="space-y-6">
                {registerStep === 1 ? (
                  <>
                    <div>
                      <label className="text-sm font-900 text-gray-700 block mb-2 uppercase tracking-widest">Biệt danh (Tên nhân vật)</label>
                      <Input
                        icon={User}
                        type="text"
                        placeholder="VD: Người Chơi Hệ Ánh Sáng"
                        value={registerForm.nickname}
                        onChange={(e) => setRegisterForm({ ...registerForm, nickname: e.target.value })}
                        error={errors.nickname}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-900 text-gray-700 block mb-2 uppercase tracking-widest">Địa chỉ Email</label>
                      <Input
                        icon={Mail}
                        type="email"
                        placeholder="Email@gmail.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        error={errors.email}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-900 text-gray-700 block mb-2 uppercase tracking-widest">Mật Khẩu</label>
                      <Input
                        icon={Lock}
                        type="password"
                        showPasswordToggle
                        placeholder="••••••••"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        error={errors.password}
                      />
                    </div>
                    <div className="pt-4">
                       <ActionButton type="submit" variant="primary" loading={isLoading} label="ĐĂNG KÝ & NHẬN OTP" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="bg-blue-50 border-4 border-blue-200 rounded-[24px] p-6 mb-6">
                         <p className="text-sm font-700 text-blue-800 text-center">
                           Chúng tôi đã gửi một mã OTP 6 số tới email <br />
                           <span className="font-900 text-blue-900 mt-1 block">{registerForm.email}</span>
                         </p>
                      </div>
                      <label className="text-sm font-900 text-gray-700 block mb-2 uppercase tracking-widest">Mã OTP (6 chữ số)</label>
                      <Input
                        icon={Key}
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={registerForm.otp}
                        onChange={(e) => setRegisterForm({ ...registerForm, otp: e.target.value })}
                        error={errors.otp}
                      />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <div className="w-1/3">
                         <ActionButton type="button" variant="outline" onClick={() => setRegisterStep(1)} disabled={isLoading} label="Quay Lại" />
                      </div>
                      <div className="w-2/3">
                         <ActionButton type="submit" variant="primary" loading={isLoading} label="XÁC NHẬN" />
                      </div>
                    </div>
                  </>
                )}
              </form>
            )}

            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-1 bg-gray-100 rounded-full" />
              <span className="text-sm text-gray-400 font-900 uppercase tracking-widest">Hoặc</span>
              <div className="flex-1 h-1 bg-gray-100 rounded-full" />
            </div>

            <div>
              <SocialButton icon="https://www.google.com/favicon.ico" label="Đăng nhập với Google" id="btn-google-login" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
