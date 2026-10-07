"use client";

import { useState } from "react";
import { Mail, Lock, User, Trophy, Sparkles, Zap, Users, Key } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Cookies from "js-cookie";
import { useAuthStore } from "@/store/useAuthStore";

type AuthTab = "login" | "register";
type RegisterStep = 1 | 2;

const features = [
  { icon: Zap, label: "Sinh đề tự động bằng AI", color: "text-yellow-400" },
  { icon: Users, label: "Hỗ trợ 50+ người chơi", color: "text-blue-400" },
  { icon: Trophy, label: "Trò chơi kích thích trí tuệ", color: "text-emerald-400" },
  { icon: Sparkles, label: "Giao diện bắt mắt", color: "text-pink-400" },
];

function SocialButton({ icon, label, id }: { icon: string; label: string; id: string }) {
  return (
    <button
      id={id}
      type="button"
      className="flex-1 flex items-center justify-center gap-2.5 py-3 px-4 border border-gray-200 rounded-xl text-sm font-600 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group"
    >
      <img
        src={icon}
        alt={label}
        className="w-4 h-4 group-hover:scale-110 transition-transform"
      />
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

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    nickname: "",
    email: "",
    password: "",
    otp: "",
  });
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
    <div className="min-h-screen flex bg-slate-900">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] xl:w-[40%] p-10 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-violet-600/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-indigo-600/30 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Trophy size={17} className="text-white" />
          </div>
          <span className="font-800 text-lg text-white">
            <span className="text-violet-400">Gaming</span> Edu
          </span>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-4">
          <div className="relative mb-6">
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-400/20 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full bg-gradient-to-br from-violet-600/30 to-blue-600/30 flex items-center justify-center border border-violet-300/20">
                <div className="text-7xl select-none animate-bounce">🚀</div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl xl:text-3xl font-900 text-white mb-3 leading-tight">
            Khai mở tiềm năng<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">học tập của bạn</span>
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
            Nền tảng tạo câu hỏi, bài tập, trò chơi trắc nghiệm và báo cáo kết quả thời gian thực với sức mạnh của AI.
          </p>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-xl px-3 py-2.5 border border-white/10">
                <Icon size={14} className={color} />
                <span className="text-xs text-gray-300 font-500 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Trophy size={17} className="text-white" />
            </div>
            <span className="font-800 text-lg text-gray-900">
              <span className="text-violet-600">Gaming</span> Edu
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
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
                  className={`flex-1 py-2.5 text-sm font-700 rounded-lg transition-all duration-300 ${
                    activeTab === tab
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "login" ? "Đăng Nhập" : "Đăng Ký"}
                </button>
              ))}
            </div>

            {globalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-500 rounded-lg">
                {globalError}
              </div>
            )}

            {activeTab === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-600 text-gray-700 block mb-1.5">Địa chỉ Email</label>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-600 text-gray-700">Mật Khẩu</label>
                    <button type="button" className="text-xs text-violet-600 hover:text-violet-800 font-600">
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
                <Button type="submit" variant="primary" fullWidth size="lg" loading={isLoading} className="mt-6 rounded-xl font-800">
                  Đăng Nhập
                </Button>
              </form>
            ) : (
              <form onSubmit={registerStep === 1 ? handleSendOtp : handleRegisterSubmit} className="space-y-4">
                {registerStep === 1 ? (
                  <>
                    <div>
                      <label className="text-sm font-600 text-gray-700 block mb-1.5">Biệt danh (Tên nhân vật)</label>
                      <Input
                        icon={User}
                        type="text"
                        placeholder="Hiệp Sĩ Ánh Sáng"
                        value={registerForm.nickname}
                        onChange={(e) => setRegisterForm({ ...registerForm, nickname: e.target.value })}
                        error={errors.nickname}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-600 text-gray-700 block mb-1.5">Địa chỉ Email</label>
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
                      <label className="text-sm font-600 text-gray-700 block mb-1.5">Mật Khẩu</label>
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
                    <Button type="submit" variant="primary" fullWidth size="lg" loading={isLoading} className="mt-6 rounded-xl font-800">
                      Đăng Ký & Nhận Mã OTP
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-gray-500 mb-4 text-center">
                        Chúng tôi đã gửi một mã OTP 6 số tới email <b>{registerForm.email}</b>. 
                        Vui lòng kiểm tra hòm thư của bạn.
                      </p>
                      <label className="text-sm font-600 text-gray-700 block mb-1.5">Mã OTP (6 chữ số)</label>
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
                    <div className="flex gap-2 mt-6">
                      <Button type="button" variant="outline" onClick={() => setRegisterStep(1)} disabled={isLoading} className="flex-shrink-0">
                        Quay lại
                      </Button>
                      <Button type="submit" variant="primary" fullWidth loading={isLoading}>
                        Xác Nhận Đăng Ký
                      </Button>
                    </div>
                  </>
                )}
              </form>
            )}

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-500">Hoặc</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="flex gap-3">
              <SocialButton icon="https://www.google.com/favicon.ico" label="Google" id="btn-google-login" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
