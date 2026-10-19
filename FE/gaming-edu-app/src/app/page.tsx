"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Wind, Flame, Sparkles, ChevronDown, Swords, PenLine, Compass, ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import SiteHeader from "@/components/layout/SiteHeader";

// Linh khí tiên giới: Trắng tuyết, Xanh ngọc bích, Xanh thiên thanh
const PARTICLE_COLORS = ["#FFFFFF", "#E0F2FE", "#A7F3D0", "#BAE6FD", "#6EE7B7"];

export default function LandingTuTien() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    setIsLoggedIn(!!Cookies.get("token"));
  }, []);

  // Tinh tú / linh khí
  const particles = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: 32 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 1.8 + Math.random() * 2.8,
      duration: 12 + Math.random() * 14,
      delay: -Math.random() * 20,
      drift: (Math.random() - 0.5) * 120,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    }));
  }, [mounted]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTilt({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  };

  const formatPin = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 3) return digits;
    return digits.slice(0, 3) + " - " + digits.slice(3);
  };

  const pinReady = pin.replace(/\D/g, "").length >= 4;

  const handleJoin = () => {
    if (!pinReady) return;
    setIsJoining(true);
    router.push(`/play?pin=${pin.replace(/\D/g, "")}`);
  };

  const requireAuth = (href: string) => router.push(isLoggedIn ? href : "/login");

  const features = [
    { icon: Flame, title: "Thi Đấu Trực Tiếp", desc: "Tranh tài tốc độ với bạn bè trong các phòng thi thời gian thực do giáo viên hoặc người quản trị chủ trì." },
    { icon: Wind, title: "Luyện Tập Tự Do", desc: "Tự do ôn luyện theo tốc độ cá nhân, củng cố nền tảng kiến thức mọi lúc mọi nơi." },
    { icon: Sparkles, title: "Tạo Đề Bằng AI", desc: "Tận dụng trí tuệ nhân tạo để tự động tạo ra những bộ đề thi chất lượng cao chỉ trong tích tắc." },
  ];

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-[#10434b] text-[#E6F2F5]">
      <SiteHeader />

      {/* ── HERO SECTION ── */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        className="relative min-h-screen flex flex-col justify-between overflow-hidden pt-16"
      >
        {/* Lớp nền thiên nhiên thoáng đãng */}
        <div
          className="absolute inset-[-2%] z-0 transition-transform duration-700 ease-out"
          style={{ transform: `translate3d(${tilt.x * -20}px, ${tilt.y * -12}px, 0)` }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center md:bg-[center_top]"
            style={{ backgroundImage: "url('/bg-xianxia-realm.jpg')" }}
          />
        </div>

        {/* Lớp 2: Luồng ánh sáng thiên quang & mây sương trắng mềm mại trôi dạt */}
        <div className="absolute inset-0 z-[1] pointer-events-none">
          <div className="absolute -top-10 right-0 w-[50vw] h-[45vh] bg-gradient-to-bl from-white/30 via-cyan-100/15 to-transparent blur-2xl" />
          <div className="animate-aurora absolute bottom-[5%] left-[-10%] w-[75%] h-[30%] rounded-full bg-white/20 blur-[90px]" />
          <div className="animate-aurora absolute bottom-[18%] right-[-8%] w-[55%] h-[28%] rounded-full bg-[#A7F3D0]/20 blur-[85px]" style={{ animationDelay: "-9s" }} />
        </div>

        {/* Lớp 3: Phủ mực dịu và chuyển màu mượt mà xuống phần tính năng */}
        <div className="absolute inset-0 z-[2] pointer-events-none bg-[radial-gradient(ellipse_at_50%_40%,transparent_0%,rgba(16,67,75,0.3)_70%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-44 z-[2] pointer-events-none bg-gradient-to-b from-transparent to-[#10434b]" />

        {/* Lớp 4: Hiệu ứng hạt ánh sáng lung linh */}
        <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <span
              key={p.id}
              className="spirit-particle"
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                ["--drift" as string]: `${p.drift}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* ── TIÊU ĐỀ CHÍNH ── */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6 text-center">
          <div
            className="transition-transform duration-500 ease-out"
            style={{ transform: `translate3d(${tilt.x * 10}px, ${tilt.y * 6}px, 0)` }}
          >
            <p className="mb-3 text-xs md:text-sm tracking-[0.5em] text-[#d4f2f4] font-semibold animate-ink drop-shadow">
              NỀN TẢNG HỌC TẬP TƯƠNG TÁC
            </p>
            <h1 className="text-brush leading-[1.05]">
              <span className="block text-6xl md:text-8xl ink-write">Học Vui · Dễ Nhớ</span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-white/95 max-w-xl mx-auto leading-relaxed animate-ink drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] font-medium">
              Tham gia các bài trắc nghiệm tương tác thời gian thực, củng cố kiến thức và thi đua cùng bạn bè.
            </p>
          </div>
        </div>

        {/* ── CỤM HÀNH ĐỘNG NHẬP MÃ & THAM GIA (DOCK) ── */}
        <div className="relative z-10 px-4 pb-6">
          <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3 items-stretch">
            {/* Ô nhập mã phòng chính */}
            <div className="dock-tile flex-1 !cursor-default !items-stretch p-3.5 shadow-lg">
              <label htmlFor="input-pin" className="flex items-center gap-1.5 text-xs tracking-[0.2em] text-[#135259] uppercase px-1 font-bold mb-1">
                <ScrollText size={14} /> Nhập Mã Phòng
              </label>
              <div className="flex gap-2">
                <input
                  id="input-pin"
                  type="text"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(formatPin(e.target.value))}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="123 - 456"
                  className="flex-1 min-w-0 rounded-xl bg-white/95 border border-[#135259]/20 px-3.5 py-2.5 text-xl tracking-[0.25em] text-center font-bold text-[#135259] placeholder:text-[#135259]/35 outline-none focus:border-[#135259]/60 shadow-inner"
                />
                <button
                  id="btn-join"
                  onClick={handleJoin}
                  disabled={!pinReady}
                  className="shrink-0 rounded-xl bg-gradient-to-b from-[#175d67] to-[#114951] text-white px-6 font-bold tracking-wide hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 text-base"
                >
                  {isJoining ? "..." : "Vào"}
                </button>
              </div>
            </div>

            {/* Nút Tạo Phòng */}
            <button
              id="dock-create-room"
              onClick={() => requireAuth("/dashboard")}
              className="dock-tile !flex-row sm:!flex-col px-6 py-3.5 gap-2.5 shrink-0 justify-center group"
            >
              <Swords size={28} strokeWidth={1.75} className="text-[#135259] group-hover:scale-110 transition-transform duration-300" />
              <span className="font-serif font-bold text-lg text-[#135259] tracking-wide">
                Tạo Phòng
              </span>
            </button>
          </div>

          <a href="#features" className="mt-5 flex flex-col items-center text-sm font-medium text-white/90 hover:text-white transition-colors drop-shadow">
            Lướt xuống
            <ChevronDown size={20} className="animate-bounce mt-0.5 text-cyan-200" />
          </a>
        </div>
      </section>

      {/* ── CÁC CHẾ ĐỘ CHƠI (FEATURES) NGUYÊN BẢN VỚI TÔNG MÀU MỚI ── */}
      <section id="features" className="relative py-28 px-6 overflow-hidden scroll-mt-16 bg-gradient-to-b from-[#10434b] via-[#0b333a] to-[#072428]">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-brush text-6xl md:text-7xl">Tính Năng Nổi Bật</h2>
            <p className="mt-3 text-cyan-200/90 text-lg">Các chế độ học tập đa dạng giúp bạn tiếp thu kiến thức.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="feature-card-vivid group"
                style={{ ["--card-color" as string]: "rgba(56, 189, 248, 0.35)" } as React.CSSProperties}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-full border border-cyan-300/30 flex items-center justify-center text-cyan-100 group-hover:bg-cyan-300/15 group-hover:text-white transition-colors duration-500">
                    <f.icon size={26} strokeWidth={1.4} />
                  </div>
                  <span className="seal-mark !w-9 !h-9 !text-lg rotate-6 group-hover:rotate-0">{idx + 1}</span>
                </div>
                <h3 className="text-brush text-4xl mb-3">{f.title}</h3>
                <p className="text-[#e2f1f3]/85 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LƯU BÚT (FOOTER) NGUYÊN BẢN ── */}
      <footer className="py-10 border-t border-cyan-800/40 text-center text-cyan-200/70 bg-[#072428]">
        <p className="tracking-widest">© 2026 Gaming Edu · Học tập qua trò chơi, kết nối tri thức.</p>
      </footer>
    </div>
  );
}


