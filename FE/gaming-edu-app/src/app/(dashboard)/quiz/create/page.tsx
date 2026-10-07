"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Book, Trophy, ArrowRight, Globe, Lock } from "lucide-react";
import Link from "next/link";

const TOPICS = [
  { value: "TOÁN HỌC", label: "Toán Học", icon: "🔢" },
  { value: "KHOA HỌC", label: "Khoa Học", icon: "🔬" },
  { value: "LỊCH SỬ", label: "Lịch Sử", icon: "📜" },
  { value: "NGỮ VĂN", label: "Ngữ Văn", icon: "📖" },
  { value: "ĐỊA LÝ", label: "Địa Lý", icon: "🌍" },
  { value: "ANH VĂN", label: "Anh Văn", icon: "🇬🇧" },
  { value: "TIN HỌC", label: "Tin Học", icon: "💻" },
  { value: "KHÁC", label: "Khác", icon: "✨" },
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
        coverImageUrl:
          "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=600&h=350&fit=crop",
      });
      if (res.data.success) {
        const quiz = res.data.data;
        // Redirect to editor so user can add slides immediately
        router.push(`/quiz/${quiz.id}/edit`);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ?? "Lỗi khi tạo bộ đề. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white p-4 shadow-sm border-b border-gray-100 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Trophy size={15} className="text-white" />
            </div>
          </Link>
          <div className="font-800 text-gray-900">Tạo Bộ Đề Mới</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard")}
          id="btn-cancel-create"
        >
          Hủy
        </Button>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 animate-fade-in-up">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📝</span>
            </div>
            <h1 className="text-xl font-900 text-gray-900 mb-1">
              Tạo Bộ Đề Mới
            </h1>
            <p className="text-sm text-gray-500">
              Điền thông tin cơ bản, sau đó thêm câu hỏi trong trình chỉnh sửa.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-600 rounded-xl">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-700 text-gray-700 mb-2">
                Tên Bộ Đề <span className="text-red-500">*</span>
              </label>
              <Input
                icon={Book}
                type="text"
                placeholder="VD: Khám Phá Hệ Mặt Trời"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={!title.trim() && error ? "Bắt buộc" : undefined}
                id="input-quiz-title"
                autoFocus
              />
            </div>

            {/* Topic chips */}
            <div>
              <label className="block text-sm font-700 text-gray-700 mb-2">
                Chủ Đề
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TOPICS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTopic(t.value)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-700 transition-all ${
                      topic === t.value
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    id={`btn-topic-${t.value}`}
                  >
                    <span className="text-lg">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-700 text-gray-700 mb-2">
                Quyền Truy Cập
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-700 transition-all ${
                    isPublic
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                  id="btn-public"
                >
                  <Globe size={15} /> Công Khai
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-700 transition-all ${
                    !isPublic
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                  id="btn-private"
                >
                  <Lock size={15} /> Riêng Tư
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                id="btn-create-quiz-submit"
                className="font-800"
              >
                {!loading && <ArrowRight size={17} />}
                {loading ? "Đang tạo..." : "Tạo Bộ Đề & Thêm Câu Hỏi"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
