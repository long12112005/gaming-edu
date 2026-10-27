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

        const roomTheme = res.data.data?.theme || res.data.data?.gameModeTheme;
        if (roomTheme === "NAVAL_WAR") {
          router.push(`/rooms/${pin}/naval`);
        } else {
          router.push(`/play/${pin}`);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Không tìm thấy phòng chơi với mã PIN này");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900 flex flex-col font-sans relative overflow-hidden">
      {/* Subtle modern ambient background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <SiteHeader />

      <div className="flex-1 flex items-center justify-center p-4 pt-24 relative z-10 font-sans">
        <div className="w-full max-w-md">
          {/* Header Title */}
          <div className="flex flex-col items-center justify-center mb-8 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
              <Compass size={32} />
            </div>
            <h1 className="text-3xl font-black font-heading text-slate-900 tracking-tight">Tham Gia Phòng Chơi</h1>
            <p className="text-sm text-slate-500 max-w-xs">Nhập mã PIN phòng để bắt đầu làm bài trắc nghiệm cùng bạn bè</p>
          </div>

          {/* Pin Entry Card */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200/90 shadow-2xl">
            <form onSubmit={handleJoin} className="space-y-5">
              {error && (
                <div className="p-3.5 bg-rose-50 text-rose-700 text-sm font-bold rounded-2xl text-center border border-rose-200">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={14} className="text-amber-500" /> Mã PIN Phòng
                </label>
                <input 
                  type="text" 
                  placeholder="VD: 123456" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  className="w-full text-center font-black text-2xl uppercase tracking-[0.25em] h-16 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:shadow-md transition-all"
                  autoFocus
                />
              </div>

              {isGuest && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-amber-500" /> Tên Hoặc Biệt Danh Của Bạn
                  </label>
                  <input 
                    type="text" 
                    placeholder="Nhập tên của bạn..." 
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full text-center font-bold text-lg h-14 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 mt-3 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-lg rounded-2xl shadow-md active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider flex items-center justify-center gap-2 font-heading"
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
    <Suspense fallback={<div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center text-indigo-600 font-sans text-xl animate-pulse">Đang kết nối phòng chơi...</div>}>
      <PlayJoinForm />
    </Suspense>
  );
}
