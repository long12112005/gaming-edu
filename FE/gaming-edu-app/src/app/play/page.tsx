"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, Sparkles, Key, User } from "lucide-react";
import { api } from "@/lib/api";
import Cookies from "js-cookie";
import { useEffect, Suspense } from "react";
import SiteHeader from "@/components/layout/SiteHeader";

function PlayJoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    setIsGuest(!Cookies.get("user"));
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!pin.trim()) {
      setError("Vui lòng nhập mã PIN phòng chơi");
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/rooms/pin/${pin}`);
      if (res.data.success) {
        if (isGuest && nickname.trim()) {
          Cookies.set("guest_nickname", nickname.trim(), { expires: 1 });
        } else if (isGuest && !nickname.trim()) {
          setError("Vui lòng nhập tên hoặc biệt danh của bạn");
          setLoading(false);
          return;
        }
        router.push(`/play/${pin}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Không tìm thấy phòng chơi với mã PIN này");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-[#1B2A2E] relative overflow-hidden font-serif">
      {/* Landscape background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-cloud-valley.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* White fog overlay */}
      <div className="fixed inset-0 z-0" style={{ background: "rgba(238,248,250,0.5)" }} />

      <SiteHeader />

      <div className="flex-1 flex items-center justify-center p-4 pt-24 relative z-10 font-sans">
        <div className="w-full max-w-md">
          {/* Header Title */}
          <div className="flex flex-col items-center justify-center mb-8 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-600 shadow-[0_0_25px_rgba(251,191,36,0.2)]">
              <Compass size={32} />
            </div>
            <h1 className="text-3xl font-bold font-serif text-[#08282e] tracking-wide drop-shadow-sm">Tham Gia Phòng Chơi</h1>
            <p className="text-sm text-teal-700/70 max-w-xs">Nhập mã PIN phòng để bắt đầu làm bài trắc nghiệm cùng bạn bè</p>
          </div>

          {/* Pin Entry Card */}
          <div className="bg-white/65 backdrop-blur-xl rounded-[32px] p-8 border border-white/85 shadow-[0_20px_50px_rgba(8,38,42,0.18)]">
            <form onSubmit={handleJoin} className="space-y-5">
              {error && (
                <div className="p-3.5 bg-red-500/20 text-red-200 text-sm font-bold rounded-2xl text-center border border-red-400/40">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={14} className="text-amber-600" /> Mã PIN Phòng
                </label>
                <input 
                  type="text" 
                  placeholder="VD: 123456" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  className="w-full text-center font-black text-2xl uppercase tracking-[0.25em] h-16 bg-white/70 backdrop-blur-md border-2 border-teal-300/40 rounded-2xl text-[#08282e] placeholder-teal-500/40 outline-none focus:border-amber-500 focus:bg-white/90 focus:shadow-[0_0_24px_rgba(20,120,100,0.2)] transition-all"
                  autoFocus
                />
              </div>

              {isGuest && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-amber-600" /> Tên Hoặc Biệt Danh Của Bạn
                  </label>
                  <input 
                    type="text" 
                    placeholder="Nhập tên của bạn..." 
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full text-center font-bold text-lg h-14 bg-white/70 backdrop-blur-md border-2 border-teal-300/40 rounded-2xl text-[#08282e] placeholder-teal-500/40 outline-none focus:border-amber-500 focus:bg-white/90 transition-all"
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 mt-3 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-black text-lg rounded-2xl shadow-[0_0_25px_rgba(251,191,36,0.4)] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {loading ? "Đang Kết Nối..." : "Tham Gia Ngay"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayJoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#10434b] flex items-center justify-center text-cyan-200 font-serif text-2xl animate-pulse">Đang kết nối phòng chơi...</div>}>
      <PlayJoinForm />
    </Suspense>
  );
}
