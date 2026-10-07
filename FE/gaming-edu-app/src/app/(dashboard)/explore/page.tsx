"use client";

import { useState } from "react";
import { Search, Compass, Star, Users, Gamepad2, TrendingUp, Filter } from "lucide-react";
import Link from "next/link";

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Dữ liệu giả lập
  const trendingQuizzes = [
    { id: "1", title: "Khám phá Vũ trụ 🚀", author: "Thầy Hùng", plays: 12400, likes: 350, image: "bg-gradient-to-br from-indigo-500 to-purple-600", tags: ["Khoa học", "Vui nhộn"] },
    { id: "2", title: "Lịch sử Việt Nam Hào Hùng", author: "Cô Lan", plays: 8300, likes: 210, image: "bg-gradient-to-br from-red-500 to-orange-500", tags: ["Lịch sử", "Lớp 9"] },
    { id: "3", title: "English Vocabulary Challenge", author: "Mr. John", plays: 15600, likes: 500, image: "bg-gradient-to-br from-blue-400 to-cyan-500", tags: ["Tiếng Anh", "IELTS"] },
    { id: "4", title: "Đố vui IQ siêu tốc", author: "Hội Trí Tuệ", plays: 22100, likes: 890, image: "bg-gradient-to-br from-pink-500 to-rose-500", tags: ["Giải trí", "IQ"] },
  ];

  return (
    <div className="min-h-screen bg-[#F4F1FA] p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Hero Section */}
        <div className="relative bg-white p-10 rounded-[40px] shadow-[4px_4px_16px_rgba(0,0,0,0.05)] border-4 border-violet-100 overflow-hidden">
          {/* Background decorative blobs */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-full font-bold text-sm">
                <Compass size={16} /> Khám phá thư viện cộng đồng
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                Tìm kiếm những bộ <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-500">câu hỏi đỉnh cao</span>
              </h1>
              <p className="text-gray-500 font-medium text-lg max-w-lg">
                Hàng ngàn bài trắc nghiệm độc đáo đang chờ bạn. Hãy chơi thử hoặc dùng làm tài liệu tham khảo ngay!
              </p>
            </div>
            
            {/* Thanh tìm kiếm to đùng */}
            <div className="w-full md:w-1/2 relative group">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Search size={28} className="text-gray-400 group-focus-within:text-violet-600 transition-colors" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm chủ đề, từ khóa..."
                className="w-full pl-16 pr-6 py-6 bg-gray-50 border-4 border-gray-100 rounded-[24px] text-xl font-bold text-gray-800 placeholder-gray-400 outline-none focus:border-violet-500 focus:bg-white focus:shadow-[0_8px_24px_rgba(124,58,237,0.15)] transition-all duration-300"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-violet-100 text-violet-600 rounded-xl hover:bg-violet-600 hover:text-white transition-colors">
                <Filter size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Section: Đang thịnh hành (Trending) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-[16px] flex items-center justify-center">
              <TrendingUp size={24} className="text-orange-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">Đang thịnh hành tuần này</h2>
          </div>
          
          {/* Grid hiển thị Quiz (Card style: Claymorphism) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingQuizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-[32px] p-4 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] border-4 border-gray-50 hover:border-violet-100 hover:shadow-[0_16px_32px_rgba(124,58,237,0.1)] hover:-translate-y-2 transition-all duration-300 group flex flex-col">
                
                {/* Thumbnail */}
                <div className={`w-full h-40 ${quiz.image} rounded-[24px] mb-4 relative overflow-hidden flex items-center justify-center`}>
                  <Gamepad2 size={48} className="text-white opacity-50" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Link href={`/quiz/${quiz.id}`} className="px-6 py-3 bg-white text-gray-900 font-bold rounded-2xl shadow-lg hover:scale-105 transition-transform">
                      Chơi Ngay
                    </Link>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 line-clamp-2 leading-tight mb-2">
                    {quiz.title}
                  </h3>
                  <p className="text-sm font-semibold text-gray-500 mb-4">Tác giả: {quiz.author}</p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4 mt-auto">
                    {quiz.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-4 border-t-2 border-gray-100 text-gray-500 font-bold text-sm">
                    <div className="flex items-center gap-1">
                      <Users size={16} /> {quiz.plays}
                    </div>
                    <div className="flex items-center gap-1 text-orange-500">
                      <Star size={16} className="fill-orange-500" /> {quiz.likes}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
