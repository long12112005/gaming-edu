"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { RoomAPI, QuizAPI } from "@/lib/api";
import { Play, Settings, Users, Trophy } from "lucide-react";

export default function RoomSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: quizId } = use(params);
  
  const [quiz, setQuiz] = useState<any>(null);
  const [mode, setMode] = useState("HOST_PACED");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const res: any = await QuizAPI.getById(quizId);
      if (res.success) setQuiz(res.data);
    } catch (err: any) {
      alert(err.message || "Lỗi tải thông tin đề thi.");
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const res: any = await RoomAPI.create({
        quizId,
        mode
      });
      if (res.success) {
        router.push(`/host/${res.data.id}?pin=${res.data.pinCode}`);
      }
    } catch (err: any) {
      alert(err.message || "Lỗi tạo phòng chơi.");
    } finally {
      setLoading(false);
    }
  };

  if (!quiz) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="bg-indigo-600 p-8 text-white text-center">
          <h2 className="text-3xl font-extrabold mb-2">{quiz.title}</h2>
          <p className="text-indigo-100">Thiết lập phòng chơi mới</p>
        </div>
        
        <div className="p-8 space-y-8">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-indigo-500" />
              Chế độ chơi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setMode("HOST_PACED")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  mode === "HOST_PACED" 
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" 
                  : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 font-bold">1</div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Cổ điển (Classic)</h4>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Người chơi thi đấu trực tiếp. Host điều khiển qua từng câu hỏi.</p>
              </div>

              <div 
                onClick={() => setMode("ASYNC_TOURNAMENT")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  mode === "ASYNC_TOURNAMENT" 
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30" 
                  : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
                }`}
              >
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3 font-bold"><Trophy className="w-4 h-4" /></div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Giải đấu (Async)</h4>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Người chơi tự làm bài theo tốc độ riêng. Đồng hồ chạy trên server.</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            {loading ? "Đang tạo phòng..." : (
              <>
                <Play className="w-6 h-6 mr-2 fill-current" />
                MỞ PHÒNG NGAY
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
