"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Trophy } from "lucide-react";
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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!pin.trim()) {
      setError("Vui lòng nhập mã PIN");
      return;
    }

    setLoading(true);
    try {
      // Check if room exists via API
      const res = await api.get(`/rooms/pin/${pin}`);
      if (res.data.success) {
        // Save guest nickname if not logged in
        const user = Cookies.get("user");
        if (!user && nickname.trim()) {
           Cookies.set("guest_nickname", nickname.trim(), { expires: 1 });
        } else if (!user && !nickname.trim()) {
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

  const isGuest = !Cookies.get("user");

  return (
    <div className="min-h-screen flex items-center justify-center bg-hero-gradient relative overflow-hidden">
       {/* Ambient glows */}
       <div className="absolute top-1/4 -left-20 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl" />
       <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl" />

       <div className="relative z-10 w-full max-w-sm px-4">
          <div className="flex items-center gap-2.5 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Trophy size={20} className="text-white" />
            </div>
            <span className="font-800 text-2xl text-white">
              <span className="text-violet-400">Gaming</span> Edu
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
             <h1 className="text-xl font-800 text-center text-gray-900 mb-6">Tham Gia Trò Chơi</h1>
             <form onSubmit={handleJoin} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm font-600 rounded-xl border border-red-100 text-center">
                    {error}
                  </div>
                )}
                
                <div>
                  <Input 
                    type="text" 
                    placeholder="Mã PIN (Ví dụ: 8A4F12)" 
                    value={pin}
                    onChange={(e) => setPin(e.target.value.toUpperCase())}
                    className="text-center font-bold text-lg uppercase tracking-widest h-14"
                  />
                </div>

                {isGuest && (
                  <div>
                    <Input 
                      type="text" 
                      placeholder="Biệt danh của bạn" 
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="text-center h-14 font-semibold"
                    />
                  </div>
                )}

                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  fullWidth 
                  loading={loading}
                  className="h-14 text-lg"
                >
                  Vào Phòng
                </Button>
             </form>
          </div>
       </div>
    </div>
  );
}

export default function PlayJoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Đang tải...</div>}>
      <PlayJoinForm />
    </Suspense>
  );
}
