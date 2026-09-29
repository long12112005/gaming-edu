import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import SlideTypesSection from "@/components/home/SlideTypesSection";
import GameModesSection from "@/components/home/GameModesSection";
import QuizGallerySection from "@/components/home/QuizGallerySection";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gaming Edu – Học Tập Vui Hơn với AI",
  description:
    "Nền tảng gamification giáo dục: Tạo phòng học, sinh đề AI, thi đấu thời gian thực. Phù hợp cho giáo viên và học sinh.",
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");
  const user = userCookie ? JSON.parse(userCookie.value) : null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Sticky Navbar */}
      <Navbar user={user} />

      <main className="flex-1">
        {/* Hero: PIN Entry + Quick Actions */}
        <HeroSection />

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <hr className="border-gray-200" />
        </div>

        {/* Slide types chips */}
        <SlideTypesSection />

        {/* Game modes cards */}
        <GameModesSection />

        {/* Public quiz gallery */}
        <QuizGallerySection />

        {/* Bottom spacing */}
        <div className="h-8" />
      </main>

      {/* Dark Footer */}
      <Footer />
    </div>
  );
}
