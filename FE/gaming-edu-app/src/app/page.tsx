"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Sparkles,
  Play,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  Gamepad2,
  Anchor,
  Loader2,
} from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/layout/Footer";
import CreateRoomModal from "@/components/modals/CreateRoomModal";
import NavalRulesModal from "@/components/modals/NavalRulesModal";
import GameModesSection from "@/components/home/GameModesSection";
import QuizGallerySection from "@/components/home/QuizGallerySection";
import { useAuthStore } from "@/store/useAuthStore";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openCreateRoomParam = searchParams.get("openCreateRoom");
  const selectedQuizParam = searchParams.get("selectedQuiz");

  const { user } = useAuthStore();
  const [pin, setPin] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [createRoomMode, setCreateRoomMode] = useState<"HOST_PACED" | "ASYNC_TOURNAMENT">("HOST_PACED");
  const [createRoomTheme, setCreateRoomTheme] = useState<string>("CLASSIC");
  const [selectedQuizForRoom, setSelectedQuizForRoom] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (openCreateRoomParam === "true") {
      if (selectedQuizParam) {
        setSelectedQuizForRoom(selectedQuizParam);
      }
      setIsCreateRoomOpen(true);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [openCreateRoomParam, selectedQuizParam]);

  const formatPin = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 3) return digits;
    return digits.slice(0, 3) + " - " + digits.slice(3);
  };

  const handleJoinByPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = pin.replace(/\D/g, "");
    if (cleanPin.length < 4) return;
    setIsJoining(true);
    router.push(`/play/${cleanPin}`);
  };

  const handleOpenCreateRoom = (
    mode: "HOST_PACED" | "ASYNC_TOURNAMENT" = "HOST_PACED",
    theme: string = "CLASSIC"
  ) => {
    setCreateRoomMode(mode);
    setCreateRoomTheme(theme);
    setSelectedQuizForRoom(undefined);
    setIsCreateRoomOpen(true);
  };

  const handleSelectQuizToHost = (quizId: string) => {
    setSelectedQuizForRoom(quizId);
    setCreateRoomMode("HOST_PACED");
    setCreateRoomTheme("CLASSIC");
    setIsCreateRoomOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans select-none">
      <SiteHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* ══════════════════════════════════════════════════════════════════
            HERO BANNER: TIÊU ĐỀ LỚN & KHUNG NHẬP PIN THAM GIA PHÒNG
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-12">
          {/* CỘT TRÁI: TIÊU ĐỀ CHÍNH & MÔ TẢ NỀN TẢNG */}
          <div className="lg:col-span-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-black mb-5 shadow-xs">
              <Sparkles size={14} className="text-indigo-600 animate-pulse" />
              <span>NỀN TẢNG HỌC TẬP GAMIFICATION 60 FPS</span>
            </div>

            <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-[1.1]">
              Học tập vui hơn <br className="hidden sm:inline" />
              với <span className="text-[#1E1B4B]">Gaming Edu</span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-slate-500 max-w-lg leading-relaxed mx-auto lg:mx-0">
              Tạo phòng học, sinh đề bằng AI và trải nghiệm Đấu trường Hải Tặc Tri Thức cùng các chế độ thi đấu trực tiếp theo thời gian thực. Mọi buổi học đều trở nên hào hứng, kịch tính và kết nối tri thức.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <a
                href="#kham-pha-tro-choi"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-heading font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-4 py-2 rounded-xl hover:bg-cyan-100 transition-colors shadow-2xs"
              >
                <Anchor size={15} className="text-cyan-600 animate-pulse" />
                <span>Khám Phá Hải Tặc Tri Thức</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* CỘT PHẢI: KHUNG NHẬP PIN NỔI BẬT & 2 THẺ HÀNH ĐỘNG */}
          <div className="lg:col-span-6 flex flex-col gap-4 max-w-xl mx-auto w-full">
            {/* THẺ VIỀN VÀNG: SẴN SÀNG CHƠI? */}
            <div className="bg-white border-[2.5px] border-[#F59E0B] rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-xl shadow-amber-500/10 text-center relative overflow-hidden">
              <h2 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 mb-1.5">
                Sẵn sàng chơi?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6 font-medium">
                Nhập mã phòng PIN để tham gia ngay trên điện thoại hoặc máy tính bảng.
              </p>

              <form onSubmit={handleJoinByPin} className="space-y-4">
                <div>
                  <label
                    htmlFor="pin-input-home"
                    className="block text-[11px] font-black text-[#6366F1] uppercase tracking-wider mb-2 text-center"
                  >
                    NHẬP MÃ PHÒNG PIN
                  </label>
                  <input
                    id="pin-input-home"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={pin}
                    onChange={(e) => setPin(formatPin(e.target.value))}
                    placeholder="000 - 000"
                    maxLength={9}
                    className="w-full text-center py-3.5 sm:py-4 bg-[#F8FAFC] border-2 border-indigo-100/90 rounded-2xl font-heading font-black text-3xl sm:text-4xl tracking-widest text-[#6366F1] placeholder:text-slate-300 outline-none focus:bg-white focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pin.replace(/\D/g, "").length < 4 || isJoining}
                  className="w-full py-4 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] active:translate-y-0.5 text-slate-950 font-heading font-black text-base shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none cursor-pointer"
                >
                  <span>{isJoining ? "Đang Kết Nối..." : "Vào Chơi"}</span>
                </button>
              </form>
            </div>

            {/* 2 THẺ SUB-CARDS BÊN DƯỚI: TẠO PHÒNG & TẠO ĐỀ BẰNG AI */}
            <div className="grid grid-cols-2 gap-4">
              {/* Thẻ 1: Tạo Phòng */}
              <button
                type="button"
                onClick={() => handleOpenCreateRoom("HOST_PACED", "CLASSIC")}
                className="bg-white border-2 border-slate-100 hover:border-indigo-200 rounded-2xl p-4 sm:p-5 flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition-all group text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users size={20} />
                </div>
                <span className="font-heading font-black text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">
                  Tạo Phòng
                </span>
              </button>

              {/* Thẻ 2: Tạo Đề Bằng AI */}
              <Link
                href="/quiz/create"
                className="bg-white border-2 border-slate-100 hover:border-pink-200 rounded-2xl p-4 sm:p-5 flex items-center justify-center gap-3 shadow-xs hover:shadow-md transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles size={20} />
                </div>
                <span className="font-heading font-black text-xs sm:text-sm text-slate-800 group-hover:text-pink-600 transition-colors">
                  Tạo Đề Bằng AI
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            KHÁM PHÁ TRÒ CHƠI & CÁC CHẾ ĐỘ ĐẤU TRƯỜNG (HẢI TẶC TRI THỨC)
        ══════════════════════════════════════════════════════════════════ */}
        <GameModesSection
          onOpenCreateRoom={handleOpenCreateRoom}
          onOpenRulesModal={() => setIsRulesModalOpen(true)}
        />

        {/* ══════════════════════════════════════════════════════════════════
            KHO BỘ ĐỀ TRẮC NGHIỆM CỘNG ĐỒNG NỔI BẬT
        ══════════════════════════════════════════════════════════════════ */}
        <QuizGallerySection onSelectQuiz={handleSelectQuizToHost} />
      </main>

      {/* Modal Tạo Phòng */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        initialMode={createRoomMode}
        initialTheme={createRoomTheme}
        initialQuizId={selectedQuizForRoom}
      />

      {/* Modal Hướng Dẫn Luật Chơi Hải Tặc Tri Thức */}
      <NavalRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        onPlayNow={() => handleOpenCreateRoom("HOST_PACED", "NAVAL_WAR")}
      />

      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
