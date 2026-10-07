"use client";

import { useState, useRef } from "react";
import { ArrowRight, Plus, Bot, Trophy, Users, Zap, Sparkles, Brain, Clock, Share2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

function ActionButton({ icon: Icon, label, onClick, disabled, loading, variant = "primary", className = "", type = "button", fullWidth }: any) {
  const baseClasses = `relative flex items-center justify-center gap-2 font-900 rounded-[20px] border-4 transition-all duration-200 active:translate-y-2 py-4 text-lg ${fullWidth ? "w-full" : "px-6"} ${className}`;
  const variants: any = {
    primary: "bg-violet-500 border-violet-700 text-white shadow-[0_6px_0_0_#5b21b6] hover:bg-violet-600 active:shadow-none",
    secondary: "bg-pink-500 border-pink-700 text-white shadow-[0_6px_0_0_#be185d] hover:bg-pink-600 active:shadow-none",
    yellow: "bg-yellow-400 border-yellow-600 text-yellow-900 shadow-[0_6px_0_0_#b45309] hover:bg-yellow-500 active:shadow-none",
    outline: "bg-white border-gray-200 text-gray-700 shadow-[0_6px_0_0_#e5e7eb] hover:bg-gray-50 active:shadow-none",
    disabled: "bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed shadow-[0_6px_0_0_#9ca3af]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${disabled ? variants.disabled : variants[variant]}`}
    >
      {loading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : (
        <>
           {Icon && <Icon size={24} className={disabled ? "text-gray-400" : "text-current"} />}
           {label}
        </>
      )}
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const isLoggedIn = typeof window !== "undefined" ? !!Cookies.get("token") : false;

  const formatPin = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 3) return digits;
    return digits.slice(0, 3) + " - " + digits.slice(3);
  };

  const handleJoin = () => {
    const digits = pin.replace(/\D/g, "");
    if (digits.length < 4) return;
    setIsJoining(true);
    router.push(`/play?pin=${digits}`);
  };

  return (
    <div className="min-h-screen bg-[#F4F1FA] font-sans overflow-hidden">
      {/* ── HEADER ── */}
      <header className="bg-white border-b-4 border-gray-200 sticky top-0 z-40 shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Trophy size={24} className="text-white" />
            </div>
            <span className="font-900 text-2xl text-gray-900 tracking-tight hidden sm:block">
              <span className="text-violet-600">Gaming</span>Edu
            </span>
          </Link>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <ActionButton variant="outline" label="Bảng Điều Khiển" onClick={() => router.push("/dashboard")} className="py-2 text-sm" />
            ) : (
              <>
                 <ActionButton variant="outline" label="Đăng Nhập" onClick={() => router.push("/login")} className="py-2 text-sm hidden md:flex" />
                 <ActionButton variant="primary" label="Đăng Ký Miễn Phí" onClick={() => router.push("/login")} className="py-2 text-sm" />
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO SECTION ── */}
        <section className="relative pt-12 pb-20 px-4 overflow-hidden">
          <div className="absolute top-10 left-10 w-72 h-72 bg-violet-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-pink-400/20 rounded-full blur-3xl" />
          
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            {/* Left Content */}
            <div className="text-center lg:text-left">
               <div className="inline-flex items-center gap-2 bg-white border-4 border-violet-100 shadow-sm px-4 py-2 rounded-full mb-6">
                 <Sparkles size={18} className="text-violet-500" />
                 <span className="font-900 text-sm text-violet-700 uppercase tracking-widest">Phiên Bản PRO MAX</span>
               </div>
               <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] mb-6 tracking-tight">
                 Học Tập Vui Hơn <br />
                 <span className="text-violet-600">Với Trí Tuệ AI!</span>
               </h1>
               <p className="text-xl font-700 text-gray-500 mb-10 max-w-xl mx-auto lg:mx-0">
                 Tạo phòng học, sinh đề trắc nghiệm bằng AI chỉ trong 10 giây và thi đấu thời gian thực. Ai cũng có thể tạo bộ đề và làm chủ trò chơi!
               </p>
               
               <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <ActionButton variant="secondary" label="Tạo Đề Bằng AI" icon={Bot} onClick={() => router.push(isLoggedIn ? "/quiz/create" : "/login")} className="w-full sm:w-auto px-8" />
                  <ActionButton variant="outline" label="Khám Phá Bộ Đề" icon={Star} onClick={() => router.push("/explore")} className="w-full sm:w-auto px-8" />
               </div>

               {/* Stats */}
               <div className="flex items-center justify-center lg:justify-start gap-8 mt-12">
                 {[
                   { value: "5M+", label: "Người Dùng", color: "text-blue-600" },
                   { value: "20M+", label: "Bộ Đề Đã Tạo", color: "text-amber-600" },
                   { value: "100+", label: "Môn Học", color: "text-emerald-600" },
                 ].map((stat) => (
                   <div key={stat.label}>
                     <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
                     <div className="text-sm font-800 text-gray-500 uppercase">{stat.label}</div>
                   </div>
                 ))}
               </div>
            </div>

            {/* Right Content (Play Box) */}
            <div className="bg-white rounded-[40px] border-4 border-violet-100 shadow-[4px_4px_24px_rgba(0,0,0,0.06),_inset_-4px_-4px_12px_rgba(0,0,0,0.03)] p-8 md:p-12 text-center transform lg:rotate-2 hover:rotate-0 transition-transform duration-300">
               <div className="w-24 h-24 bg-yellow-100 border-4 border-yellow-300 rounded-[24px] flex items-center justify-center mx-auto mb-6 transform -rotate-12">
                 <span className="text-5xl">🎮</span>
               </div>
               <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Sẵn sàng chơi chưa?</h2>
               <p className="font-700 text-gray-500 mb-8">Nhập mã PIN để tham gia phòng ngay lập tức.</p>

               <div className="bg-gray-50 border-4 border-gray-200 rounded-[24px] p-4 mb-6 focus-within:border-violet-500 focus-within:bg-white transition-colors shadow-inner">
                  <div className="text-xs font-900 text-gray-400 uppercase tracking-widest mb-2 text-left px-2">Mã PIN Phòng</div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(formatPin(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="123 - 456"
                    className="w-full bg-transparent border-none outline-none text-center font-black text-4xl tracking-[0.2em] text-gray-900 placeholder:text-gray-300"
                  />
               </div>
               
               <ActionButton variant="yellow" fullWidth label="VÀO PHÒNG CHƠI!" icon={ArrowRight} onClick={handleJoin} disabled={pin.replace(/\D/g, "").length < 4} loading={isJoining} className="text-2xl py-5" />
            </div>
          </div>
        </section>

        {/* ── FEATURES SECTION ── */}
        <section className="py-20 bg-white border-y-4 border-gray-200">
           <div className="max-w-6xl mx-auto px-4">
              <div className="text-center mb-16">
                 <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Các Chế Độ Chơi Hấp Dẫn</h2>
                 <p className="text-xl font-700 text-gray-500">Giúp bài học không bao giờ nhàm chán.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {[
                   { icon: Users, title: "Lớp Học (Host)", desc: "Bạn làm Host, điều khiển màn hình chính, tất cả người chơi thi đấu theo tốc độ của Host.", color: "bg-violet-100 border-violet-200 text-violet-600" },
                   { icon: Brain, title: "Tự Luyện Tập", desc: "Người chơi tự làm bài theo tốc độ cá nhân, lý tưởng để ôn bài hoặc làm bài tập về nhà.", color: "bg-blue-100 border-blue-200 text-blue-600" },
                   { icon: Trophy, title: "Giải Đấu Độc Lập", desc: "Mở phòng nhiều ngày, đua TOP trên bảng xếp hạng mở liên tục 24/7.", color: "bg-amber-100 border-amber-200 text-amber-600" }
                 ].map((feature, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-[32px] border-4 border-gray-200 p-8 shadow-sm hover:-translate-y-2 transition-transform duration-300">
                       <div className={`w-16 h-16 rounded-[20px] border-2 flex items-center justify-center mb-6 shadow-inner ${feature.color}`}>
                          <feature.icon size={32} />
                       </div>
                       <h3 className="text-2xl font-black text-gray-900 mb-3">{feature.title}</h3>
                       <p className="font-700 text-gray-600 text-lg">{feature.desc}</p>
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* ── CTA SECTION ── */}
        <section className="py-24 px-4 text-center">
           <div className="max-w-4xl mx-auto bg-violet-600 rounded-[40px] border-4 border-violet-800 shadow-[0_12px_0_0_#4c1d95] p-12 md:p-20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                 <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Hãy tự mình trải nghiệm</h2>
                 <p className="text-xl font-700 text-violet-200 mb-10">
                    Tạo tài khoản miễn phí để thiết kế trò chơi đầu tiên của bạn chỉ trong vài phút.
                 </p>
                 <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <ActionButton variant="yellow" label="Đăng Ký Miễn Phí" onClick={() => router.push("/login")} className="px-10 py-5 text-xl" />
                    <button className="text-white font-900 text-lg hover:underline underline-offset-4" onClick={() => router.push("/explore")}>
                       Xem kho bộ đề công khai
                    </button>
                 </div>
              </div>
           </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 py-12 px-6 border-t-8 border-gray-800">
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-gray-400 font-700 text-sm">
            <div className="flex items-center gap-3">
               <Trophy size={20} className="text-violet-500" />
               <span className="font-900 text-white text-lg tracking-tight">GamingEdu</span>
            </div>
            <p>© 2026 GamingEdu Inc. All rights reserved.</p>
            <div className="flex gap-4">
               <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
               <a href="#" className="hover:text-white transition-colors">Bảo mật</a>
               <a href="#" className="hover:text-white transition-colors">Trợ giúp</a>
            </div>
         </div>
      </footer>
    </div>
  );
}
