"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { BookOpen, Sparkles, ArrowRight, Globe, Lock, ScrollText } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";

const TOPICS = [
  { value: "TOÁN HỌC", label: "Toán Học", icon: "🔢", desc: "Đại số, hình học & toán tư duy logic" },
  { value: "KHOA HỌC", label: "Khoa Học", icon: "🔬", desc: "Vật lý, Hóa học, Sinh học & đời sống" },
  { value: "LỊCH SỬ", label: "Lịch Sử", icon: "📜", desc: "Lịch sử Việt Nam & văn minh thế giới" },
  { value: "NGỮ VĂN", label: "Ngữ Văn", icon: "📖", desc: "Văn học, đọc hiểu & tiếng Việt" },
  { value: "ĐỊA LÝ", label: "Địa Lý", icon: "🌍", desc: "Địa lý tự nhiên, kinh tế & xã hội" },
  { value: "ANH VĂN", label: "Tiếng Anh", icon: "🌐", desc: "Từ vựng, ngữ pháp & giao tiếp" },
  { value: "TIN HỌC", label: "Tin Học", icon: "💻", desc: "Lập trình, thuật toán & công nghệ" },
  { value: "KHÁC", label: "Tổng Hợp", icon: "✨", desc: "Kiến thức chung, đố vui & đời sống" },
];

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("KHOA HỌC");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tên bộ đề trắc nghiệm.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/quizzes", {
        title: title.trim(),
        topic,
        isPublic,
        coverImageUrl: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=600&h=350&fit=crop",
      });
      if (res.data.success) {
        router.push(`/quiz/${res.data.data.id}/edit`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Lỗi khi tạo bộ đề. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#14343B] font-serif flex flex-col relative overflow-hidden">
      {/* Misty Mountain Background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: "url('/bg-quiz-create.jpg')",
          backgroundPosition: "center 40%",
        }}
      />

      {/* Atmospheric Mist Wash */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(235, 246, 248, 0.42) 0%, rgba(225, 243, 246, 0.55) 50%, rgba(215, 238, 243, 0.7) 100%)",
        }}
      />

      {/* Animated Floating Mist Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Upper Drifting Fog */}
        <div className="absolute -left-1/4 top-20 w-[150%] h-80 bg-gradient-to-r from-transparent via-white/45 to-transparent blur-3xl animate-mist-slow" />
        {/* Lower Valley Fog */}
        <div className="absolute -right-1/4 bottom-10 w-[150%] h-96 bg-gradient-to-r from-transparent via-cyan-100/50 to-transparent blur-3xl animate-mist-reverse" />
        {/* Soft Center Glow */}
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/20 rounded-full blur-3xl" />
      </div>

      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-4xl mx-auto w-full relative z-10">
        <div className="bg-white/80 backdrop-blur-2xl border border-white/90 rounded-[32px] p-6 md:p-12 shadow-[0_24px_60px_rgba(8,38,42,0.12),0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Header Title */}
          <div className="text-center mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 rounded-full font-bold text-xs tracking-wider uppercase font-sans shadow-xs">
              <ScrollText size={15} /> Khởi Tạo Bộ Đề Mới
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#0C3138] tracking-tight">
              Tạo Bộ Đề Học Tập Mới
            </h1>
            <p className="text-[#28535B] font-sans text-base max-w-lg mx-auto">
              Nhập tiêu đề và phân loại môn học để bắt đầu tạo các câu hỏi đa dạng: Trắc nghiệm, Điền khuyết, Ghép nối...
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-8 font-sans">
            {error && (
              <div className="p-4 bg-red-500/15 border border-red-400/40 text-red-700 text-sm font-bold rounded-2xl text-center shadow-xs">
                {error}
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-base font-bold text-[#0C3138]">
                <BookOpen size={18} className="text-amber-500" />
                Tên Bộ Đề / Giáo Án <span className="text-amber-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="VD: Khám Phá Hệ Mặt Trời - Khoa Học Lớp 6..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-5 py-4 bg-white/90 border-2 border-teal-900/15 rounded-2xl text-lg font-bold text-[#0C3138] placeholder-teal-800/35 outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-400/20 shadow-xs transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Topic Selection */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-base font-bold text-[#0C3138]">
                <Sparkles size={18} className="text-amber-500" />
                Môn Học / Chủ Đề
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TOPICS.map((t) => {
                  const isActive = topic === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTopic(t.value)}
                      className={`flex flex-col items-center text-center p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "border-amber-500 bg-amber-50/90 text-amber-950 shadow-[0_6px_20px_rgba(245,158,11,0.22)] ring-2 ring-amber-400/50 scale-[1.02]"
                          : "border-teal-900/10 bg-white/70 text-[#1B434C] hover:bg-white hover:border-teal-600/30 hover:shadow-xs"
                      }`}
                    >
                      <span className="text-2xl mb-1">{t.icon}</span>
                      <span className="font-bold text-sm text-[#0C3138]">{t.label}</span>
                      <span className="text-[11px] text-[#3D6971] mt-0.5 line-clamp-1">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility Selection */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-base font-bold text-[#0C3138]">
                Quyền Truy Cập
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    isPublic
                      ? "border-emerald-600 bg-emerald-50/85 text-emerald-950 shadow-[0_6px_20px_rgba(16,185,129,0.2)] ring-2 ring-emerald-500/40"
                      : "border-teal-900/10 bg-white/70 text-[#1B434C] hover:bg-white hover:border-teal-600/30"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${isPublic ? "bg-emerald-600/15 text-emerald-700" : "bg-teal-900/5 text-[#3D6971]"}`}>
                    <Globe size={22} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-[#0C3138] text-base">Công Khai</div>
                    <div className="text-xs text-[#3D6971] mt-0.5">Tất cả người dùng đều có thể tìm thấy và trải nghiệm</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    !isPublic
                      ? "border-amber-500 bg-amber-50/85 text-amber-950 shadow-[0_6px_20px_rgba(245,158,11,0.2)] ring-2 ring-amber-400/40"
                      : "border-teal-900/10 bg-white/70 text-[#1B434C] hover:bg-white hover:border-teal-600/30"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${!isPublic ? "bg-amber-500/15 text-amber-700" : "bg-teal-900/5 text-[#3D6971]"}`}>
                    <Lock size={22} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-[#0C3138] text-base">Riêng Tư</div>
                    <div className="text-xs text-[#3D6971] mt-0.5">Chỉ bạn mới có quyền xem và tổ chức phòng chơi</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-teal-900/10 flex flex-col sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/80 hover:bg-white text-[#1B434C] font-bold border border-teal-900/15 shadow-xs transition-colors cursor-pointer"
              >
                Quay Lại
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 flex items-center justify-center gap-3 py-4 px-8 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-amber-500 text-teal-950 font-black text-lg rounded-2xl shadow-[0_10px_25px_rgba(245,158,11,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                {!loading && <ArrowRight size={22} />}
                {loading ? "Đang Thiết Lập..." : "Hoàn Tất & Bắt Đầu Soạn Câu Hỏi"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
