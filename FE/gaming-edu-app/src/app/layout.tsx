import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Gaming Edu – Học Tập Vui Hơn",
  description:
    "Tạo phòng học, sinh đề bằng AI và chơi game thi đấu trực tiếp. Gaming Edu – Nền tảng gamification giáo dục hàng đầu Việt Nam.",
  keywords: "gaming edu, học tập, giáo dục, kahoot, quizziz, AI sinh đề",
  openGraph: {
    title: "Gaming Edu – Học Tập Vui Hơn",
    description: "Gamification giáo dục – Tạo phòng học vui, sinh đề AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full">
      <body className="min-h-full antialiased bg-gray-50 text-gray-900" suppressHydrationWarning>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
