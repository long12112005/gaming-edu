"use client";

import { useState } from "react";
import { Mail, Key, User, ArrowLeft, Sparkles, Compass } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ nickname: "", email: "", password: "", otp: "" });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/login", loginForm);
      login(data.data.user, data.data.token);
      router.push("/dashboard");
    } catch (error: any) {
      setGlobalError(error.response?.data?.message || "Lạc lối trong linh vân, vui lòng kiểm tra lại tài khoản hoặc khẩu quyết.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setIsLoading(true);
    try {
      await api.post("/auth/send-register-otp", { email: registerForm.email });
      setRegisterStep(2);
      setGlobalError("");
    } catch (error: any) {
      setGlobalError(error.response?.data?.message || "Không thể truyền linh thư (OTP).");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/register", registerForm);
      login(data.data.user, data.data.token);
      router.push("/dashboard");
    } catch (error: any) {
      setGlobalError(error.response?.data?.message || "Mã Trận Pháp (OTP) không chính xác.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#1B2A2E] font-serif flex flex-col relative overflow-hidden">
      {/* Landscape background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-bamboo-mist.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* White mist overlay */}
      <div className="fixed inset-0 z-0" style={{ background: "rgba(238,248,243,0.52)" }} />

      <SiteHeader />

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 pt-24 relative z-10 max-w-6xl mx-auto w-full">
        {/* NỬA TRÁI: GIỚI THIỆU HIỆN ĐẠI */}
        <div className="hidden md:flex w-1/2 flex-col items-center justify-center p-12 text-center">
          <div className="w-24 h-24 border-2 border-amber-500/60 bg-amber-400/15 rounded-full flex items-center justify-center text-amber-600 mb-8 shadow-[0_0_30px_rgba(251,191,36,0.2)] animate-pulse">
            <Compass size={48} strokeWidth={1.5} />
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold font-serif text-[#08282e] mb-6 tracking-wide leading-tight drop-shadow-sm">
            Khám Phá Thế Giới <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-600">
              Học Tập Tương Tác
            </span>
          </h2>
          <p className="text-lg text-teal-800/80 max-w-sm font-sans leading-relaxed">
            Học tập qua trò chơi, kết nối tri thức, ôn luyện hiệu quả và thi đua sôi nổi cùng bạn bè.
          </p>
        </div>

        {/* NỬA PHẢI: FORM ĐĂNG NHẬP / ĐĂNG KÝ */}
        <div className="w-full max-w-md md:w-1/2 md:pl-10">
          <div className="bg-white/65 backdrop-blur-xl border border-white/85 rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_rgba(8,38,42,0.18)] font-sans">
            {/* Tab switch */}
            <div className="flex justify-around items-center mb-8 border-b border-teal-400/20 pb-4">
              {(["login", "register"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setRegisterStep(1);
                    setGlobalError("");
                  }}
                  className={`font-serif text-lg tracking-wider transition-all relative pb-2 ${
                    activeTab === tab
                      ? "text-amber-600 font-bold after:content-[''] after:absolute after:bottom-[-17px] after:left-0 after:right-0 after:h-[2px] after:bg-amber-600 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                      : "text-teal-700/60 hover:text-teal-900"
                  }`}
                >
                  {tab === "login" ? "Đăng Nhập" : "Đăng Ký"}
                </button>
              ))}
            </div>

            {globalError && (
              <div className="mb-6 border border-red-400/40 text-red-200 p-4 text-center text-sm bg-red-500/10 rounded-2xl">
                {globalError}
              </div>
            )}

            {activeTab === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={14} className="text-amber-600" /> Địa Chỉ Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="email@vidu.com"
                    className="w-full px-5 py-4 bg-white/70 backdrop-blur-md border-2 border-teal-300/40 rounded-2xl text-[#08282e] placeholder-teal-500/40 outline-none focus:border-amber-500 focus:bg-white/90 focus:shadow-[0_0_20px_rgba(20,120,100,0.15)] transition-all font-semibold"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Key size={14} className="text-amber-600" /> Mật Khẩu
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-5 py-4 bg-white/70 backdrop-blur-md border-2 border-teal-300/40 rounded-2xl text-[#08282e] placeholder-teal-500/40 outline-none focus:border-amber-500 focus:bg-white/90 focus:shadow-[0_0_20px_rgba(20,120,100,0.15)] transition-all font-semibold"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-black text-lg rounded-2xl shadow-[0_0_25px_rgba(251,191,36,0.4)] transition-all active:scale-[0.98] disabled:opacity-60"
                  >
                    {isLoading ? "Đang Xử Lý..." : "Đăng Nhập"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={registerStep === 1 ? handleSendOtp : handleRegisterSubmit} className="space-y-5">
                {registerStep === 1 ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                        <User size={14} className="text-amber-600" /> Tên Hiển Thị (Nickname)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Alex Nguyễn"
                        className="w-full px-5 py-3.5 bg-white/70 backdrop-blur-md border-2 border-teal-300/40 rounded-2xl text-[#08282e] placeholder-teal-500/40 outline-none focus:border-amber-500 focus:bg-white/90 transition-all font-semibold"
                        value={registerForm.nickname}
                        onChange={(e) => setRegisterForm({ ...registerForm, nickname: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Mail size={14} className="text-amber-600" /> Địa Chỉ Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="email@vidu.com"
                        className="w-full px-5 py-3.5 bg-white/70 backdrop-blur-md border-2 border-teal-300/40 rounded-2xl text-[#08282e] placeholder-teal-500/40 outline-none focus:border-amber-500 focus:bg-white/90 transition-all font-semibold"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Key size={14} className="text-amber-600" /> Mật Khẩu (&gt; 6 ký tự)
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full px-5 py-3.5 bg-white/70 backdrop-blur-md border-2 border-teal-300/40 rounded-2xl text-[#08282e] placeholder-teal-500/40 outline-none focus:border-amber-500 focus:bg-white/90 transition-all font-semibold"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-black text-lg rounded-2xl shadow-[0_0_25px_rgba(251,191,36,0.4)] transition-all active:scale-[0.98] disabled:opacity-60"
                      >
                        {isLoading ? "Đang Gửi Mã..." : "Nhận Mã Xác Nhận (OTP)"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-center text-teal-800/80 text-sm mb-4">
                      Mã xác nhận đã gửi tới <b className="text-amber-600">{registerForm.email}</b>. Vui lòng nhập mã OTP để tiếp tục.
                    </p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="6 chữ số"
                        className="w-full px-5 py-4 bg-white/70 backdrop-blur-md border-2 border-teal-300/40 rounded-2xl text-[#08282e] placeholder-teal-500/40 text-center tracking-[0.5em] text-2xl font-bold outline-none focus:border-amber-500 focus:bg-white/90 transition-all"
                        value={registerForm.otp}
                        onChange={(e) => setRegisterForm({ ...registerForm, otp: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(1)}
                        className="px-4 py-4 rounded-2xl bg-white/60 hover:bg-white/80 text-teal-800 border border-teal-300/40 transition-colors"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-black text-lg rounded-2xl shadow-[0_0_25px_rgba(251,191,36,0.4)] transition-all active:scale-[0.98] disabled:opacity-60"
                      >
                        {isLoading ? "Đang Xác Nhận..." : "Hoàn Tất Đăng Ký"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-teal-400/20 text-center">
              <Link href="/" className="text-teal-700/70 hover:text-amber-600 text-sm font-semibold transition-colors">
                ← Quay lại Trang Chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
