import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GameEdu – Nền Tảng Học Tập & Thi Đấu Tương Tác",
  description:
    "Học tập qua trò chơi, thi đấu trực tiếp, sáng tạo bộ đề với AI và gắn kết tri thức theo phong cách hiện đại.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full">
      <body
        className={`${plusJakartaSans.variable} ${beVietnamPro.variable} font-sans min-h-full antialiased bg-[#F8FAFC] text-slate-900`}
        suppressHydrationWarning
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
