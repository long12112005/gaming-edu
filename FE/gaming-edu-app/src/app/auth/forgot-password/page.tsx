"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthAPI } from "@/lib/api";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await AuthAPI.sendForgotPasswordOtp({ email });
      setStep(2);
      setSuccess("Mã OTP đã được gửi tới email của bạn.");
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi gửi OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await AuthAPI.resetPassword({ email, otp, newPassword });
      setSuccess("Đặt lại mật khẩu thành công! Đang chuyển hướng...");
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Mã OTP không chính xác hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Quên mật khẩu
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Trở lại{" "}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
              Đăng nhập
            </Link>
          </p>
        </div>

        {step === 1 ? (
          <form className="mt-8 space-y-6" onSubmit={handleSendOtp}>
            <div className="space-y-4 rounded-md shadow-sm">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                Nhập email đã đăng ký của bạn. Chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Nhập email của bạn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/30 p-2 rounded">{error}</div>}

            <div>
              <Button type="submit" className="w-full flex justify-center py-2.5" disabled={loading}>
                {loading ? "Đang gửi OTP..." : "Gửi mã OTP"}
              </Button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="space-y-4 rounded-md shadow-sm">
              {success && (
                <div className="text-sm text-green-700 bg-green-50 dark:bg-green-900/30 p-3 rounded mb-4 text-center border border-green-200 dark:border-green-800">
                  {success}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nhập mã OTP
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-lg text-center tracking-widest font-bold"
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Tạo mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/30 p-2 rounded">{error}</div>}

            <div className="space-y-3">
              <Button type="submit" className="w-full flex justify-center py-2.5" disabled={loading}>
                {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </Button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full flex justify-center py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Gửi lại mã OTP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
