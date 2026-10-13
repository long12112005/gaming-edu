"use client";

import { useState } from "react";
import { User, Key, Save, Camera, Mail, Sparkles, Shield, Zap } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import SiteHeader from "@/components/layout/SiteHeader";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 800);
  };

  const aiLimit = user?.ai_generation_limit ?? 10;
  const aiUsed = user?.ai_used_today ?? 0;
  const remainingAi = Math.max(0, aiLimit - aiUsed);

  return (
    <div className="min-h-screen text-[#1B2A2E] font-serif flex flex-col relative overflow-hidden">
      {/* Landscape background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-pine-lake.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* White fog overlay */}
      <div className="fixed inset-0 z-0" style={{ background: "rgba(238,248,245,0.5)" }} />

      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-4xl mx-auto w-full relative z-10 space-y-8 font-sans">
        {/* Profile Banner */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[32px] p-6 md:p-8 shadow-[0_16px_40px_rgba(8,38,42,0.12)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-300 via-emerald-300 to-cyan-300 p-1 shadow-[0_0_25px_rgba(56,189,248,0.35)]">
                <div className="w-full h-full rounded-full bg-[#08282e] flex items-center justify-center overflow-hidden">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-cyan-200" />
                  )}
                </div>
              </div>
              <button 
                type="button" 
                title="Thay đổi ảnh đại diện"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-amber-400 text-teal-950 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <Camera size={16} />
              </button>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 rounded-full font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles size={13} /> Thành Viên
              </div>
              <h1 className="text-2xl md:text-3xl font-bold font-serif text-[#08282e] tracking-tight">
                {user?.nickname || "Người Dùng"}
              </h1>
              <p className="text-teal-700/70 text-sm mt-1">{user?.email || "Chưa cập nhật email"}</p>
            </div>
          </div>

          {/* AI quota badge */}
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md border border-teal-300/30 rounded-2xl p-4 w-full md:w-auto">
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-600">
              <Zap size={24} />
            </div>
            <div>
              <div className="text-xs text-teal-700/70 font-semibold uppercase tracking-wider">Lượt Tạo Đề AI Hôm Nay</div>
              <div className="text-lg font-bold text-[#08282e] font-serif">
                Còn <span className="text-amber-600 font-bold">{remainingAi}</span> / {aiLimit} lượt
              </div>
            </div>
          </div>
        </div>

        {/* Profile edit card */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[32px] p-6 md:p-10 shadow-[0_16px_40px_rgba(8,38,42,0.12)]">
          <div className="mb-6 pb-4 border-b border-teal-400/20 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-serif text-[#08282e]">Thông Tin Cá Nhân</h2>
              <p className="text-teal-700/70 text-sm mt-0.5">Cập nhật tên hiển thị và mật khẩu tài khoản của bạn.</p>
            </div>
            <Shield size={24} className="text-cyan-300/60" />
          </div>

          {savedSuccess && (
            <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-bold rounded-2xl text-center">
              Lưu thông tin thành công! Dữ liệu đã được cập nhật.
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Email (Readonly) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-teal-800">
                <Mail size={16} className="text-teal-600" /> Địa Chỉ Email
              </label>
              <input 
                type="email" 
                value={user?.email || "user@example.com"} 
                readOnly
                className="w-full px-5 py-4 bg-white/50 border border-teal-300/40 rounded-2xl text-teal-700/60 font-semibold cursor-not-allowed outline-none"
              />
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-teal-800">
                <User size={16} className="text-amber-600" /> Tên Hiển Thị (Nickname)
              </label>
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Nhập tên hiển thị của bạn..."
                className="w-full px-5 py-4 bg-white/70 backdrop-blur-md border-2 border-teal-300/40 rounded-2xl text-[#08282e] font-bold placeholder-teal-500/40 outline-none focus:border-amber-500 focus:bg-white/90 focus:shadow-[0_0_20px_rgba(20,120,100,0.15)] transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-teal-800">
                <Key size={16} className="text-amber-600" /> Mật Khẩu Mới (Tùy chọn)
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Bỏ trống nếu không muốn đổi mật khẩu..."
                className="w-full px-5 py-4 bg-white/70 backdrop-blur-md border-2 border-teal-300/40 rounded-2xl text-[#08282e] font-bold placeholder-teal-500/40 outline-none focus:border-amber-500 focus:bg-white/90 focus:shadow-[0_0_20px_rgba(20,120,100,0.15)] transition-all"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex justify-end">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-black text-lg rounded-2xl shadow-[0_0_25px_rgba(251,191,36,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-teal-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={20} /> Lưu Thay Đổi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
