"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, X, Play, Clock, Users, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { GameItem } from "./SoloGameModal";

interface LeaderboardModalProps {
  game: GameItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayNow: (game: GameItem) => void;
}

export default function LeaderboardModal({
  game,
  isOpen,
  onClose,
  onPlayNow,
}: LeaderboardModalProps) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && game) {
      const storageKey = `leaderboard_game_${game.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setLeaderboard(JSON.parse(saved));
        } catch {
          setLeaderboard(game.leaderboard);
        }
      } else {
        setLeaderboard(game.leaderboard);
      }
    }
  }, [isOpen, game]);

  if (!isOpen || !game) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          title="Đóng"
        >
          <X size={18} />
        </button>

        {/* Header với ảnh trò chơi */}
        <div className="relative h-40 w-full overflow-hidden border-b border-slate-100">
          <Image
            src={game.image}
            alt={game.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${game.badgeColor}`}>
                {game.category}
              </span>
              <span className="text-[10px] text-white/90 font-bold flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                <ShieldCheck size={12} className="text-emerald-400" />
                Admin Duyệt
              </span>
            </div>
            <h3 className="font-heading font-black text-xl text-white">
              Bảng Xếp Hạng: {game.title}
            </h3>
          </div>
        </div>

        {/* Nội dung danh sách */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy size={14} className="text-amber-500" /> Top Cao Thủ Điểm Cao Nhất
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {leaderboard.length} người ghi danh
            </span>
          </div>

          <div className="space-y-2 mb-6">
            {leaderboard.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 border border-slate-200/60 rounded-2xl">
                Chưa có ai ghi danh trên bảng xếp hạng. Hãy chơi ngay để giành vị trí Top 1!
              </div>
            ) : (
              leaderboard.map((entry, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-indigo-50/40 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                    entry.rank === 1 ? "bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-300" :
                    entry.rank === 2 ? "bg-slate-300 text-slate-950" :
                    entry.rank === 3 ? "bg-amber-700 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {entry.rank}
                  </span>
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                      {entry.nickname}
                    </h5>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {entry.timeSeconds}s · {entry.date}
                    </span>
                  </div>
                </div>

                <div className="font-mono font-black text-sm text-indigo-700">
                  {entry.score.toLocaleString()} đ
                </div>
              </div>
            )))}
          </div>
        </div>

        {/* Nút hành động Chơi Ngay trong Footer cố định */}
        <div className="p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md shrink-0">
          <button
            onClick={() => {
              onClose();
              onPlayNow(game);
            }}
            className="w-full py-3.5 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-heading font-black text-sm shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play size={16} fill="currentColor" />
            <span>Chơi Ngay Để Phá Kỷ Lục BXH</span>
          </button>
        </div>
      </div>
    </div>
  );
}
