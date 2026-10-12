"use client";

import { useState } from "react";
import { BarChart3, Users, Clock, Trophy, Play, User } from "lucide-react";

type TabType = "hosted" | "played";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("hosted");

  // Dữ liệu giả lập (Sau này nối API từ bảng Room và RoomPlayer)
  const hostedGames = [
    { id: 1, title: "Toán học lớp 9 - Thi kỳ 1", date: "10/10/2026", players: 45, mode: "HOST_PACED" },
    { id: 2, title: "Lịch sử Việt Nam", date: "12/10/2026", players: 32, mode: "RACING" },
  ];

  const playedGames = [
    { id: 3, title: "English Vocabulary", date: "15/10/2026", host: "Cô Lan", rank: 2, score: 9500 },
    { id: 4, title: "Vật lý vui", date: "16/10/2026", host: "Thầy Hùng", rank: 1, score: 12400 },
  ];

  return (
    <div className="min-h-screen bg-[#F4F1FA] p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header - Vibrant & Block-based */}
        <div className="bg-white p-8 rounded-[32px] shadow-[4px_4px_16px_rgba(0,0,0,0.05)] border-4 border-emerald-50 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Báo cáo & Lịch sử 📊
            </h1>
            <p className="text-gray-500 mt-2 font-medium">
              Xem lại các trận game bạn đã tổ chức và tham gia.
            </p>
          </div>
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[24px] shadow-[inset_-2px_-2px_8px_rgba(0,0,0,0.2),_4px_4px_12px_rgba(16,185,129,0.4)] flex items-center justify-center transform -rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300">
            <BarChart3 size={40} className="text-white" />
          </div>
        </div>

        {/* Tab Selection - Claymorphism Toggle */}
        <div className="flex gap-4 p-2 bg-white rounded-3xl border-4 border-gray-50 shadow-[inset_2px_2px_8px_rgba(0,0,0,0.02)] w-fit">
          <button 
            onClick={() => setActiveTab("hosted")}
            className={`px-8 py-3 rounded-2xl font-bold text-lg transition-all duration-300 ${
              activeTab === "hosted" 
              ? "bg-violet-600 text-white shadow-[0_4px_12px_rgba(124,58,237,0.4),_inset_0_-4px_0_rgba(0,0,0,0.15)] translate-y-[-2px]" 
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            }`}
          >
            Trận đã Host
          </button>
          <button 
            onClick={() => setActiveTab("played")}
            className={`px-8 py-3 rounded-2xl font-bold text-lg transition-all duration-300 ${
              activeTab === "played" 
              ? "bg-pink-500 text-white shadow-[0_4px_12px_rgba(236,72,153,0.4),_inset_0_-4px_0_rgba(0,0,0,0.15)] translate-y-[-2px]" 
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            }`}
          >
            Trận đã Chơi
          </button>
        </div>

        {/* Danh sách thẻ khối (Block-based Cards) */}
        <div className="grid grid-cols-1 gap-6">
          {activeTab === "hosted" && hostedGames.map((game) => (
            <div key={game.id} className="bg-white p-6 rounded-[32px] border-4 border-violet-50 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_rgba(124,58,237,0.12)] hover:-translate-y-2 transition-all duration-300 flex items-center justify-between group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-violet-100 rounded-[20px] flex items-center justify-center group-hover:bg-violet-600 transition-colors duration-300">
                  <Play size={28} className="text-violet-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{game.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm font-semibold text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={15}/> {game.date}</span>
                    <span className="flex items-center gap-1"><Users size={15}/> {game.players} người chơi</span>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-700">{game.mode}</span>
                  </div>
                </div>
              </div>
              <button className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-2xl shadow-sm active:translate-y-1 active:shadow-none hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all">
                Xem chi tiết
              </button>
            </div>
          ))}

          {activeTab === "played" && playedGames.map((game) => (
            <div key={game.id} className="bg-white p-6 rounded-[32px] border-4 border-pink-50 shadow-[4px_4px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_rgba(236,72,153,0.12)] hover:-translate-y-2 transition-all duration-300 flex items-center justify-between group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-pink-100 rounded-[20px] flex items-center justify-center group-hover:bg-pink-500 transition-colors duration-300">
                  <Trophy size={28} className="text-pink-500 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{game.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm font-semibold text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={15}/> {game.date}</span>
                    <span className="flex items-center gap-1"><User size={15}/> Host: {game.host}</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold border-2 border-yellow-200">
                      Hạng {game.rank} ({game.score} đ)
                    </span>
                  </div>
                </div>
              </div>
              <button className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-2xl shadow-sm active:translate-y-1 active:shadow-none hover:bg-pink-50 hover:border-pink-300 hover:text-pink-600 transition-all">
                Kết quả
              </button>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}
