import AuthPage from "@/components/auth/AuthPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng Nhập / Đăng Ký – GameEdu",
  description: "Trải nghiệm học tập và thi đấu tương tác GameEdu với chế độ Dual-Tone hiện đại.",
};

export default function Page() {
  return <AuthPage />;
}
