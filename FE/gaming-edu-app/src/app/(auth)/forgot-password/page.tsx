"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Key,
  ShieldCheck,
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Compass,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import SiteHeader from "@/components/layout/SiteHeader";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Step: 1 = Nhập email, 2 = Nhập OTP và mật khẩu mới
  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Countdown timer 60s
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  // Bước 1: Gửi yêu cầu quên mật khẩu
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setErrorMsg("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post("/auth/forgot-password", { email: cleanEmail });
      if (res.data?.data) {
        setDevOtp(res.data.data);
        setOtp(res.data.data);
      }
      setSuccessMsg(
        res.data?.message || "Mã xác thực OTP đã được gửi đến email của bạn nếu tài khoản tồn tại."
      );
      setStep(2);
      setCountdown(60);
      setCanResend(false);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMsg(errorObj.response?.data?.message || "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (!canResend || isResending) return;
    setErrorMsg("");
    setSuccessMsg("");

    try {
      setIsResending(true);
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      if (res.data?.data) {
        setDevOtp(res.data.data);
        setOtp(res.data.data);
      }
      setSuccessMsg(res.data?.message || "Đã gửi lại mã OTP mới đến hòm thư của bạn.");
      setCountdown(60);
      setCanResend(false);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMsg(errorObj.response?.data?.message || "Gửi lại OTP thất bại.");
    } finally {
      setIsResending(false);
    }
  };

  // Bước 2: Đặt lại mật khẩu
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg("Mã OTP phải gồm đúng 6 chữ số.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post("/auth/reset-password", {
        email: email.trim(),
        otp: cleanOtp,
        newPassword: newPassword,
      });

      if (res.data?.success) {
        setSuccessMsg("Đặt lại mật khẩu thành công! Đang chuyển hướng về trang đăng nhập...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMsg(errorObj.response?.data?.message || "Mã OTP không chính xác hoặc đã hết hạn.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900 flex flex-col font-sans relative overflow-hidden">
      {/* Subtle modern ambient background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <SiteHeader />

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 pt-24 relative z-10 max-w-6xl mx-auto w-full font-sans">
        {/* NỬA TRÁI: THÔNG TIN HƯỚNG DẪN */}
        <div className="hidden md:flex w-1/2 flex-col items-center justify-center p-12 text-center">
          <div className="w-24 h-24 border-2 border-indigo-200 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-8 shadow-sm">
            <Compass size={48} strokeWidth={1.5} />
          </div>
          <h2 className="text-4xl lg:text-5xl font-black font-heading text-slate-900 mb-4 tracking-tight leading-tight">
            Khôi Phục Quyền <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-violet-600 to-indigo-600">
              Truy Cập Tài Khoản
            </span>
          </h2>
          <p className="text-base text-slate-500 max-w-sm leading-relaxed">
            Đừng lo lắng! Nhập địa chỉ email đăng ký để nhận mã xác minh OTP 6 số và thiết lập mật khẩu mới ngay lập tức.
          </p>

          <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-200">
            <Sparkles size={14} className="text-amber-500" />
            Bảo mật tối đa với mã khóa một lần
          </div>
        </div>

        {/* NỬA PHẢI: FORM XỬ LÝ 2 BƯỚC */}
        <div className="w-full max-w-md md:w-1/2 md:pl-8">
          <div className="bg-white border border-slate-200/90 rounded-[36px] p-8 md:p-10 shadow-2xl">
            {/* Header Form */}
            <div className="mb-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                {step === 1 ? <Mail size={30} /> : <ShieldCheck size={30} />}
              </div>
              <h1 className="text-2xl md:text-3xl font-black font-heading text-slate-900">
                {step === 1 ? "Quên Mật Khẩu" : "Đặt Lại Mật Khẩu Mới"}
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                {step === 1
                  ? "Bước 1/2: Nhập email để nhận mã OTP xác thực"
                  : `Bước 2/2: Nhập OTP gửi về ${email}`}
              </p>
            </div>

            {/* Thông báo lỗi */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Thông báo thành công */}
            {successMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* BƯỚC 1: NHẬP EMAIL */}
            {step === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={14} className="text-amber-600" /> Địa Chỉ Email Đăng Ký
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="email@vidu.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-white/80 border-2 border-teal-300/50 rounded-2xl text-[#08282e] font-semibold placeholder-teal-600/40 outline-none focus:border-amber-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-black text-base rounded-2xl shadow-[0_0_25px_rgba(251,191,36,0.35)] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoading ? "Đang Gửi Mã..." : "Gửi Mã Xác Nhận OTP"}
                </button>
              </form>
            ) : (
              /* BƯỚC 2: NHẬP OTP VÀ MẬT KHẨU MỚI */
              <form onSubmit={handleResetPassword} className="space-y-4">
                {devOtp && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                        <Sparkles size={12} className="text-amber-500" />
                        Mã OTP thử nghiệm (Dev Mode)
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtp(devOtp)}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-white px-2 py-0.5 rounded-lg border border-teal-200 shadow-xs"
                      >
                        Điền lại
                      </button>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-amber-700">Mã của bạn:</span>
                      <span className="font-mono font-black text-lg text-amber-900 tracking-wider">{devOtp}</span>
                    </div>
                  </div>
                )}
                {/* OTP Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-amber-600" /> Mã Xác Nhận OTP (6 Số)
                    </label>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={!canResend || isResending}
                      className="text-[11px] font-bold text-teal-700 hover:text-amber-600 disabled:text-gray-400 transition-colors flex items-center gap-1"
                    >
                      <RotateCw size={12} className={isResending ? "animate-spin" : ""} />
                      {canResend ? "Gửi lại mã" : `Gửi lại sau ${countdown}s`}
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 bg-white/80 border-2 border-teal-300/50 rounded-2xl text-[#08282e] font-mono text-center tracking-[0.4em] text-2xl font-black outline-none focus:border-amber-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>

                {/* Mật khẩu mới */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Key size={14} className="text-amber-600" /> Mật Khẩu Mới (&gt; 6 ký tự)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white/80 border-2 border-teal-300/50 rounded-2xl text-[#08282e] font-semibold placeholder-teal-600/40 outline-none focus:border-amber-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>

                {/* Xác nhận mật khẩu mới */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Key size={14} className="text-amber-600" /> Xác Nhận Mật Khẩu Mới
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white/80 border-2 border-teal-300/50 rounded-2xl text-[#08282e] font-semibold placeholder-teal-600/40 outline-none focus:border-amber-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="px-4 py-3.5 rounded-2xl bg-white hover:bg-gray-100 text-teal-800 border border-teal-200 transition-colors"
                    title="Quay lại bước 1"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-black text-base rounded-2xl shadow-[0_0_25px_rgba(251,191,36,0.35)] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isLoading ? "Đang Cập Nhật..." : "Đặt Lại Mật Khẩu"}
                  </button>
                </div>
              </form>
            )}

            {/* Chân trang form */}
            <div className="mt-6 pt-4 border-t border-teal-300/20 text-center flex items-center justify-between text-xs">
              <Link
                href="/login"
                className="text-teal-800 hover:text-amber-600 font-bold transition-colors flex items-center gap-1"
              >
                ← Quay lại Đăng Nhập
              </Link>
              <Link href="/" className="text-teal-700/70 hover:text-teal-900 transition-colors">
                Trang Chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
