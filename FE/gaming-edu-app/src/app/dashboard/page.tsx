"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, Copy, Play } from "lucide-react";
import { QuizAPI } from "@/lib/api";

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res: any = await QuizAPI.getMine();
      if (res.success) setQuizzes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleCreate = async () => {
    const title = prompt("Nhập tên bộ đề mới:");
    if (!title) return;
    try {
      const res: any = await QuizAPI.create({ title: title.trim(), isPublic: false });
      if (res.success) {
        window.location.href = `/quiz/${res.data.id}/edit`;
      }
    } catch (err: any) {
      alert(err.message || "Lỗi tạo bộ đề!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bộ đề này?")) return;
    try {
      await QuizAPI.delete(id);
      fetchQuizzes();
    } catch (err: any) {
      alert(err.message || "Lỗi xóa bộ đề!");
    }
  };

  const handleClone = async (id: string) => {
    try {
      await QuizAPI.clone(id);
      fetchQuizzes();
    } catch (err: any) {
      alert(err.message || "Lỗi nhân bản bộ đề!");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tổng quan</h1>
          <p className="text-gray-500 mt-1">Quản lý và tạo mới các bộ đề (Quizzes) của bạn</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Tạo bộ đề mới
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Library className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Chưa có bộ đề nào</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">Hãy bắt đầu tạo bộ đề đầu tiên để trải nghiệm các tính năng tương tác học tập tuyệt vời!</p>
          <button onClick={handleCreate} className="text-blue-600 font-medium hover:underline">Tạo ngay &rarr;</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
              <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-500 relative">
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded">
                  {quiz.isPublic ? "PUBLIC" : "PRIVATE"}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate mb-1" title={quiz.title}>
                  {quiz.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">
                  {quiz.topic ? `${quiz.topic} • ` : ""}{quiz.slideCount ?? 0} câu hỏi
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex space-x-1">
                    <Link href={`/quiz/${quiz.id}/edit`} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Chỉnh sửa">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <button onClick={() => handleClone(quiz.id)} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Nhân bản">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(quiz.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <Link href={`/host/setup/${quiz.id}`} className="flex items-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                    <Play className="w-4 h-4 mr-1.5 fill-current" />
                    Host Game
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Mock icon missing
function Library(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>;
}
