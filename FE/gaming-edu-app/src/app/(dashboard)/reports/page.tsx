"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Users, Clock, Trophy, Play, Plus, BookOpen } from "lucide-react";
import SiteHeader from "@/components/layout/SiteHeader";

type TabType = "hosted" | "played";

interface HostedGame {
  id: number | string;
  title: string;
  date: string;
  players: number;
  mode: string;
}

interface PlayedGame {
  id: number | string;
  title: string;
  date: string;
  host: string;
  rank: number;
  score: number;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("hosted");

  // Dữ liệu thực tế (bỏ dữ liệu mẫu giả lập)
  const hostedGames: HostedGame[] = [];
  const playedGames: PlayedGame[] = [];

  return (
    <div className="min-h-screen text-[#1B2A2E] font-serif flex flex-col relative">
      {/* Landscape background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-sunrise-peak.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />
      {/* Warm fog overlay */}
      <div className="fixed inset-0 z-0" style={{ background: "rgba(248,244,235,0.52)" }} />
      <SiteHeader />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-5xl mx-auto w-full space-y-8 relative z-10">
        {/* Header Section */}
        <div className="bg-white/60 backdrop-blur-xl p-8 md:p-10 rounded-[32px] border border-white/80 shadow-[0_16px_40px_rgba(8,38,42,0.12)] flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold font-serif text-[#08282e] tracking-tight drop-shadow-sm">
              Báo Cáo & Lịch Sử Thi Đấu 📊
            </h1>
            <p className="text-teal-800/80 mt-2 font-sans text-base">
              Theo dõi kết quả học tập và các phòng thi đấu bạn đã tổ chức hoặc tham gia.
            </p>
          </div>
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-amber-400 to-teal-600 rounded-2xl shadow-lg flex items-center justify-center transform -rotate-3 hover:rotate-0 hover:scale-105 transition-all">
            <BarChart3 size={36} className="text-white" />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-3 p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-white/70 w-fit font-sans">
          <button
            onClick={() => setActiveTab("hosted")}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm md:text-base transition-all ${
              activeTab === "hosted"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                : "text-teal-700/70 hover:text-teal-900"
            }`}
          >
            Phòng Đã Tổ Chức
          </button>
          <button
            onClick={() => setActiveTab("played")}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm md:text-base transition-all ${
              activeTab === "played"
                ? "bg-gradient-to-r from-amber-400 to-amber-600 text-amber-950 shadow-md"
                : "text-teal-700/70 hover:text-teal-900"
            }`}
          >
            Phòng Đã Tham Gia
          </button>
        </div>

        {/* Danh sách thẻ hoặc Empty State */}
        <div className="grid grid-cols-1 gap-6 font-sans">
          {activeTab === "hosted" && (
            hostedGames.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl border-2 border-dashed border-teal-400/40 p-12 text-center shadow-sm">
                <div className="w-20 h-20 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-400/30">
                  <Play size={36} className="text-emerald-700 ml-1" />
                </div>
                <h3 className="text-xl font-bold font-serif text-[#08282e] mb-2">Chưa có phòng thi nào được tổ chức</h3>
                <p className="text-sm font-sans text-teal-800/70 max-w-md mx-auto mb-6">
                  Bạn chưa chủ trì phòng thi đấu nào. Khi mở phòng thi cho người học, báo cáo điểm số và bảng xếp hạng chi tiết sẽ được tự động lưu trữ tại đây.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus size={18} /> Mở Phòng Ngay
                </Link>
              </div>
            ) : (
              hostedGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-white/65 backdrop-blur-xl p-6 rounded-2xl border border-white/80 hover:border-emerald-400/50 hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group shadow-md"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                      <Play size={24} className="text-emerald-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-serif text-[#08282e]">{game.title}</h3>
                      <div className="flex items-center gap-4 mt-1.5 text-xs font-sans text-teal-700/70">
                        <span className="flex items-center gap-1"><Clock size={14} /> {game.date}</span>
                        <span className="flex items-center gap-1"><Users size={14} /> {game.players} người tham gia</span>
                        <span className="px-2.5 py-0.5 bg-white/50 rounded-full border border-teal-300/40 text-teal-700">{game.mode}</span>
                      </div>
                    </div>
                  </div>
                  <button className="px-5 py-2.5 bg-white/60 hover:bg-white/80 border border-teal-300/40 text-teal-800 font-sans font-bold text-sm rounded-xl transition-all hover:scale-105 active:scale-95">
                    Xem chi tiết
                  </button>
                </div>
              ))
            )
          )}

          {activeTab === "played" && (
            playedGames.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-xl rounded-3xl border-2 border-dashed border-amber-400/40 p-12 text-center shadow-sm">
                <div className="w-20 h-20 bg-amber-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-400/30">
                  <Trophy size={36} className="text-amber-600" />
                </div>
                <h3 className="text-xl font-bold font-serif text-[#08282e] mb-2">Chưa có lịch sử tham gia bài thi</h3>
                <p className="text-sm font-sans text-teal-800/70 max-w-md mx-auto mb-6">
                  Bạn chưa tham gia phòng thi đấu nào. Nhập mã PIN hoặc khám phá các bộ đề cộng đồng để bắt đầu thử thách kiến thức của mình!
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    href="/play"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-bold text-sm rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    <Play size={18} /> Nhập Mã PIN
                  </Link>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/70 hover:bg-white border border-teal-300/40 text-teal-900 font-bold text-sm rounded-xl transition-all shadow-sm"
                  >
                    <BookOpen size={18} /> Khám Phá Đề
                  </Link>
                </div>
              </div>
            ) : (
              playedGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-white/65 backdrop-blur-xl p-6 rounded-2xl border border-white/80 hover:border-amber-400/50 hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group shadow-md"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                      <Trophy size={24} className="text-amber-600 group-hover:text-amber-950 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-serif text-[#08282e]">{game.title}</h3>
                      <div className="flex items-center gap-4 mt-1.5 text-xs font-sans text-teal-700/70">
                        <span className="flex items-center gap-1"><Clock size={14} /> {game.date}</span>
                        <span className="flex items-center gap-1"><Users size={14} /> Người tạo: {game.host}</span>
                        <span className="px-2.5 py-0.5 bg-amber-400/15 text-amber-700 rounded-full border border-amber-400/30 font-bold">
                          Hạng {game.rank} ({game.score.toLocaleString()} đ)
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-sans font-bold text-sm rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md">
                    Kết quả
                  </button>
                </div>
              ))
            )
          )}
        </div>
      </main>

      <footer className="py-8 border-t border-amber-600/20 text-center text-teal-800/60 bg-white/50 backdrop-blur-md text-xs font-sans relative z-10">
        <p>© 2026 Gaming Edu · Hệ thống quản lý và báo cáo thành tích học tập.</p>
      </footer>
    </div>
  );
}

