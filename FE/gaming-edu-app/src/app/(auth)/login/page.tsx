import AuthPage from "@/components/auth/AuthPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng Nhập / Đăng Ký – Gaming Edu",
  description: "Tạo tài khoản Gaming Edu miễn phí để bắt đầu học tập vui với trò chơi và AI.",
};

export default function LoginPage() {
  return <AuthPage />;
}
