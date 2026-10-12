"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Book, Trophy, ArrowRight, Globe, Lock, Gamepad2, X } from "lucide-react";
import Link from "next/link";

const TOPICS = [
  { value: "TOÁN HỌC", label: "Toán Học", icon: "🔢", color: "text-red-600 bg-red-100 border-red-200 hover:border-red-500 hover:bg-red-50" },
  { value: "KHOA HỌC", label: "Khoa Học", icon: "🔬", color: "text-amber-600 bg-amber-100 border-amber-200 hover:border-amber-500 hover:bg-amber-50" },
  { value: "LỊCH SỬ", label: "Lịch Sử", icon: "📜", color: "text-emerald-600 bg-emerald-100 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50" },
  { value: "NGỮ VĂN", label: "Ngữ Văn", icon: "📖", color: "text-blue-600 bg-blue-100 border-blue-200 hover:border-blue-500 hover:bg-blue-50" },
  { value: "ĐỊA LÝ", label: "Địa Lý", icon: "🌍", color: "text-teal-600 bg-teal-100 border-teal-200 hover:border-teal-500 hover:bg-teal-50" },
  { value: "ANH VĂN", label: "Anh Văn", icon: "🇬🇧", color: "text-indigo-600 bg-indigo-100 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50" },
  { value: "TIN HỌC", label: "Tin Học", icon: "💻", color: "text-cyan-600 bg-cyan-100 border-cyan-200 hover:border-cyan-500 hover:bg-cyan-50" },
  { value: "KHÁC", label: "Khác", icon: "✨", color: "text-pink-600 bg-pink-100 border-pink-200 hover:border-pink-500 hover:bg-pink-50" },
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
      setError("Vui lòng nhập tên bộ đề");
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
    <div className="min-h-screen bg-[#F4F1FA] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white p-6 shadow-sm border-b-4 border-violet-100 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-[0_4px_12px_rgba(124,58,237,0.3)] hover:scale-105 transition-transform">
            <Gamepad2 size={24} className="text-white" />
          </Link>
          <div className="font-black text-2xl text-gray-900 tracking-tight">Tạo Bộ Đề Mới</div>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
        >
          <X size={20} /> Đóng
        </button>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto p-6 md:p-12">
        <div className="bg-white rounded-[40px] shadow-[0_16px_40px_rgba(0,0,0,0.1)] border-4 border-violet-100 p-8 md:p-12 animate-fade-in-up">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-violet-100 rounded-[24px] flex items-center justify-center mx-auto mb-4 border-4 border-violet-200 shadow-sm">
              <span className="text-4xl">📝</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
              Sáng Tạo Nội Dung
            </h1>
            <p className="text-lg font-medium text-gray-500">
              Điền thông tin cơ bản để bắt đầu soạn thảo câu hỏi.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-100 border-2 border-red-200 text-red-600 text-sm font-bold rounded-2xl text-center">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-lg font-black text-gray-900">
                Tên Bộ Đề <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Book size={24} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="VD: Khám Phá Hệ Mặt Trời..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-gray-50 border-4 border-gray-100 rounded-[24px] text-xl font-bold text-gray-800 placeholder-gray-400 outline-none focus:border-violet-500 focus:bg-white focus:shadow-[0_8px_24px_rgba(124,58,237,0.15)] transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Topic chips */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-lg font-black text-gray-900">
                Chọn Chủ Đề
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {TOPICS.map((t) => {
                  const isActive = topic === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTopic(t.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-[24px] border-4 transition-all ${
                        isActive
                          ? "border-violet-500 bg-violet-50 text-violet-700 shadow-[0_4px_12px_rgba(124,58,237,0.2)] -translate-y-1"
                          : t.color
                      }`}
                    >
                      <span className="text-3xl">{t.icon}</span>
                      <span className="font-bold text-sm">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-lg font-black text-gray-900">
                Quyền Truy Cập
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 flex items-center justify-center gap-3 p-5 rounded-[24px] border-4 transition-all ${
                    isPublic
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_4px_12px_rgba(16,185,129,0.2)] -translate-y-1"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-emerald-200"
                  }`}
                >
                  <Globe size={24} /> 
                  <div className="text-left">
                    <div className="font-black">Công Khai</div>
                    <div className="text-xs font-semibold opacity-80 mt-1">Ai cũng có thể tìm thấy</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 flex items-center justify-center gap-3 p-5 rounded-[24px] border-4 transition-all ${
                    !isPublic
                      ? "border-violet-500 bg-violet-50 text-violet-700 shadow-[0_4px_12px_rgba(124,58,237,0.2)] -translate-y-1"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-violet-200"
                  }`}
                >
                  <Lock size={24} /> 
                  <div className="text-left">
                    <div className="font-black">Riêng Tư</div>
                    <div className="text-xs font-semibold opacity-80 mt-1">Chỉ mình bạn xem được</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-6 border-t-4 border-gray-50">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xl rounded-[24px] shadow-[0_8px_0_#5b21b6] active:translate-y-[8px] active:shadow-none hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {!loading && <ArrowRight size={24} />}
                {loading ? "Đang tạo..." : "Xong & Bắt Đầu Soạn Câu Hỏi"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
