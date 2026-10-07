"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gamepad2 } from "lucide-react";
import { api } from "@/lib/api";
import Cookies from "js-cookie";
import { useEffect, Suspense } from "react";

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
      setError("Vui lòng nhập mã PIN");
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/rooms/pin/${pin}`);
      if (res.data.success) {
        if (isGuest && nickname.trim()) {
           Cookies.set("guest_nickname", nickname.trim(), { expires: 1 });
        } else if (isGuest && !nickname.trim()) {
           setError("Vui lòng nhập biệt danh của bạn");
           setLoading(false);
           return;
        }
        router.push(`/play/${pin}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Không tìm thấy phòng với mã PIN này");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F1FA] relative overflow-hidden font-sans">
      {/* Background blobs (Vibrant) */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-500 opacity-90"></div>
      
      {/* Floating decorative blocks */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-white/20 backdrop-blur-xl rounded-[32px] rotate-12 animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-yellow-400/30 backdrop-blur-xl rounded-full -rotate-12"></div>
      <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-cyan-400/30 backdrop-blur-md rounded-xl rotate-45"></div>

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Logo Area */}
        <div className="flex flex-col items-center justify-center mb-8 gap-4">
          <div className="w-20 h-20 bg-white rounded-[24px] shadow-[0_8px_16px_rgba(0,0,0,0.1),_inset_0_-4px_0_rgba(0,0,0,0.05)] flex items-center justify-center transform hover:rotate-12 transition-transform">
            <Gamepad2 size={40} className="text-violet-600" />
          </div>
          <h1 className="text-4xl font-black text-white drop-shadow-md tracking-tight">GamingEdu</h1>
        </div>

        {/* Pin Entry Card (Claymorphism) */}
        <div className="bg-white rounded-[40px] shadow-[0_16px_40px_rgba(0,0,0,0.2)] p-8 border-4 border-white/50">
          <form onSubmit={handleJoin} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-100 text-red-600 text-sm font-bold rounded-2xl text-center border-2 border-red-200">
                {error}
              </div>
            )}
            
            <div>
              <input 
                type="text" 
                placeholder="MÃ PIN PHÒNG" 
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                className="w-full text-center font-black text-2xl uppercase tracking-[0.2em] h-16 bg-gray-100 border-4 border-gray-200 rounded-[20px] placeholder-gray-400 outline-none focus:bg-white focus:border-violet-500 focus:shadow-[0_8px_24px_rgba(124,58,237,0.2)] transition-all"
              />
            </div>

            {isGuest && (
              <div>
                <input 
                  type="text" 
                  placeholder="Biệt danh của bạn" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full text-center font-bold text-xl h-16 bg-gray-100 border-4 border-gray-200 rounded-[20px] placeholder-gray-400 outline-none focus:bg-white focus:border-pink-500 focus:shadow-[0_8px_24px_rgba(236,72,153,0.2)] transition-all"
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 mt-2 bg-gray-900 text-white font-black text-xl rounded-[20px] shadow-[0_6px_0_#1f2937] active:translate-y-[6px] active:shadow-none hover:bg-black transition-all disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              {loading ? "Đang vào..." : "Vào Chơi"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PlayJoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-violet-600 flex items-center justify-center text-white font-black text-2xl animate-pulse">Đang tải...</div>}>
      <PlayJoinForm />
    </Suspense>
  );
}
