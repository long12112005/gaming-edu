import type { Metadata } from "next";
import { Playfair_Display, Lora, Kolker_Brush } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";

const playfair = Playfair_Display({ subsets: ["vietnamese"], variable: "--font-playfair" });
const lora = Lora({ subsets: ["vietnamese"], variable: "--font-lora" });
const brush = Kolker_Brush({ subsets: ["vietnamese"], weight: "400", variable: "--font-brush" });

export const metadata: Metadata = {
  title: "Gaming Edu – Nền Tảng Học Tập",
  description:
    "Học tập qua trò chơi, kết nối tri thức, ôn luyện và thi đua.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full">
      <body className={`${playfair.variable} ${lora.variable} ${brush.variable} min-h-full antialiased bg-[#F2EBDD] text-[#1B1B1B] font-serif`} suppressHydrationWarning>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
