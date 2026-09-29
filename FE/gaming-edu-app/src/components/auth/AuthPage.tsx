"use client";

import { useState } from "react";
import { Mail, Lock, User, Trophy, Sparkles, Shield, Zap, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { AuthFormState } from "@/types/database";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Cookies from "js-cookie";

type AuthTab = "login" | "register";

// Feature list shown on left panel
const features = [
  { icon: Zap, label: "Sinh đề tự động bằng AI", color: "text-yellow-400" },
  { icon: Users, label: "32 Link Phá hủy mẫu", color: "text-blue-400" },
  { icon: Trophy, label: "400K+ Chiến thắng để giành", color: "text-emerald-400" },
  { icon: Sparkles, label: "Nho Học Giải Đáp", color: "text-pink-400" },
];

// Social login button
function SocialButton({ icon, label, id }: { icon: string; label: string; id: string }) {
  return (
    <button
      id={id}
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
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Form state — maps to users table columns
  const [loginForm, setLoginForm] = useState<AuthFormState>({
    email: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState<AuthFormState>({
    nickname: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<AuthFormState>>({});

  const validateLogin = () => {
    const e: Partial<AuthFormState> = {};
    if (!loginForm.email.includes("@")) e.email = "Email không hợp lệ";
    if (loginForm.password.length < 6) e.password = "Mật khẩu ít nhất 6 ký tự";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRegister = () => {
    const e: Partial<AuthFormState> = {};
    if (!registerForm.nickname || registerForm.nickname.length < 2) e.nickname = "Biệt danh ít nhất 2 ký tự";
    if (!registerForm.email.includes("@")) e.email = "Email không hợp lệ";
    if (registerForm.password.length < 6) e.password = "Mật khẩu ít nhất 6 ký tự";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    const valid = activeTab === "login" ? validateLogin() : validateRegister();
    if (!valid) return;

    setIsLoading(true);
    try {
      if (activeTab === "login") {
        const { data } = await api.post("/auth/login", loginForm);
        Cookies.set("token", data.data.token, { expires: 1 }); // 1 day
        Cookies.set("user", JSON.stringify(data.data.user), { expires: 1 });
        router.push("/");
      } else {
        const { data } = await api.post("/auth/register", registerForm);
        Cookies.set("token", data.data.token, { expires: 1 });
        Cookies.set("user", JSON.stringify(data.data.user), { expires: 1 });
        router.push("/");
      }
    } catch (error: any) {
      setGlobalError(error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-hero-gradient">
      {/* ===========================
          LEFT PANEL — Dark with illustration
      =========================== */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] xl:w-[40%] p-10 relative overflow-hidden stars-bg">
        {/* Ambient glows */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Trophy size={17} className="text-white" />
          </div>
          <span className="font-800 text-lg text-white">
            <span className="text-violet-400">Gaming</span> Edu
          </span>
        </div>

        {/* Center illustration & text */}
        <div className="relative z-10 flex flex-col items-center text-center px-4">
          {/* Floating 3D Robot Illustration using CSS */}
          <div className="relative mb-6 animate-float">
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-400/20 flex items-center justify-center animate-pulse-glow">
              <div className="w-36 h-36 rounded-full bg-gradient-to-br from-violet-600/30 to-blue-600/30 flex items-center justify-center border border-violet-300/20">
                {/* Robot face */}
                <div className="text-7xl select-none">🤖</div>
              </div>
            </div>
            {/* Orbiting icons */}
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg animate-float" style={{ animationDelay: "1s" }}>
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg animate-float" style={{ animationDelay: "1.5s" }}>
              <Trophy size={18} className="text-white" />
            </div>
            <div className="absolute top-1/2 -right-6 w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center shadow-lg animate-float" style={{ animationDelay: "0.5s" }}>
              <Zap size={14} className="text-white" />
            </div>
          </div>

          {activeTab === "login" ? (
            <>
              <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-700 px-3 py-1.5 rounded-full mb-3 uppercase tracking-wider">
                <Sparkles size={11} />
                GAME EDU • Vương Quốc Tri Thức
              </div>
              <h2 className="text-2xl xl:text-3xl font-900 text-white mb-3 leading-tight">
                Khai mở tiềm năng<br />
                <span className="text-gradient-yellow">của bạn</span>
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                Chào mừng chiến binh trở lại! Hãy đăng nhập để tiếp tục tham gia học tập đầy thú vị hôm nay.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 text-xs font-700 px-3 py-1.5 rounded-full mb-3 uppercase tracking-wider">
                <Trophy size={11} />
                GAME EDU • Khởi Tạo Anh Hùng
              </div>
              <h2 className="text-2xl xl:text-3xl font-900 text-white mb-3 leading-tight">
                Khởi Tạo Anh Hùng<br />
                <span className="text-gradient-yellow">Nhí</span>
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                Chọn một xứ sở yêu thích, thiết lập để tiếp tục tham gia cùng bạn bè và nâng cao kỹ năng học tập đỉnh thiên.
              </p>
            </>
          )}
        </div>

        {/* Bottom stats bar */}
        <div className="relative z-10">
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-2 glass rounded-xl px-3 py-2.5"
              >
                <Icon size={14} className={color} />
                <span className="text-xs text-gray-300 font-500 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===========================
          RIGHT PANEL — Auth Form
      =========================== */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Trophy size={17} className="text-white" />
            </div>
            <span className="font-800 text-lg text-gray-900">
              <span className="text-violet-600">Gaming</span> Edu
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            {/* Tab Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-8" role="tablist">
              {(["login", "register"] as AuthTab[]).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setErrors({});
                  }}
                  id={`tab-${tab}`}
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {globalError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-500 rounded-lg animate-fade-in-up">
                  {globalError}
                </div>
              )}

              {/* Nickname (Register only) — maps to users.nickname */}
              {activeTab === "register" && (
                <div className="animate-fade-in-up">
                  <label className="text-sm font-600 text-gray-700 block mb-1.5">
                    Biệt danh (Tên nhân vật)
                  </label>
                  <Input
                    icon={User}
                    type="text"
                    placeholder="Họp Sĩ Ánh Sáng"
                    value={registerForm.nickname ?? ""}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, nickname: e.target.value })
                    }
                    error={errors.nickname}
                    id="input-register-nickname"
                    autoComplete="username"
                  />
                </div>
              )}

              {/* Email — maps to users.email */}
              <div>
                <label className="text-sm font-600 text-gray-700 block mb-1.5">
                  Địa chỉ Email
                </label>
                <Input
                  icon={Mail}
                  type="email"
                  placeholder="Email@gmail.com"
                  value={activeTab === "login" ? loginForm.email : registerForm.email}
                  onChange={(e) =>
                    activeTab === "login"
                      ? setLoginForm({ ...loginForm, email: e.target.value })
                      : setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                  error={errors.email}
                  id="input-email"
                  autoComplete="email"
                />
              </div>

              {/* Password — maps to users.password_hash */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-600 text-gray-700">Mật Khẩu</label>
                  {activeTab === "login" && (
                    <button
                      type="button"
                      className="text-xs text-violet-600 hover:text-violet-800 font-600 transition-colors"
                      id="btn-forgot-password"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <Input
                  icon={Lock}
                  type="password"
                  showPasswordToggle
                  placeholder="••••••••"
                  value={activeTab === "login" ? loginForm.password : registerForm.password}
                  onChange={(e) =>
                    activeTab === "login"
                      ? setLoginForm({ ...loginForm, password: e.target.value })
                      : setRegisterForm({ ...registerForm, password: e.target.value })
                  }
                  error={errors.password}
                  id="input-password"
                  autoComplete={activeTab === "login" ? "current-password" : "new-password"}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                loading={isLoading}
                className="mt-6 rounded-xl font-800"
                id={`btn-submit-${activeTab}`}
              >
                {isLoading
                  ? "Đang xử lý..."
                  : activeTab === "login"
                  ? "Bắt Đầu Ngay! 🚀"
                  : "Khởi Tạo Anh Hùng"}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-500">Hoặc bắt đầu với</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Social Login */}
            <div className="flex gap-3">
              <SocialButton
                icon="https://www.google.com/favicon.ico"
                label="Google"
                id="btn-google-login"
              />
              <SocialButton
                icon="https://www.facebook.com/favicon.ico"
                label="Facebook"
                id="btn-facebook-login"
              />
            </div>

            {/* Footer toggle text */}
            <p className="text-center text-xs text-gray-500 mt-6">
              {activeTab === "login"
                ? "Chưa có tài khoản? "
                : "Đã có tài khoản? "}
              <button
                type="button"
                onClick={() => {
                  setActiveTab(activeTab === "login" ? "register" : "login");
                  setErrors({});
                }}
                className="text-violet-600 font-700 hover:underline"
                id={`btn-toggle-to-${activeTab === "login" ? "register" : "login"}`}
              >
                {activeTab === "login" ? "Đăng ký ngay" : "Đăng nhập"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
