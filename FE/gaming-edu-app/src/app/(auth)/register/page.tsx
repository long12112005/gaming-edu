import AuthPage from "@/components/auth/AuthPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng Ký Tài Khoản – Gaming Edu",
  description: "Tạo tài khoản Gaming Edu miễn phí để bắt đầu học tập vui với trò chơi và AI.",
};

export default function RegisterPage() {
  return <AuthPage defaultTab="register" />;
}
