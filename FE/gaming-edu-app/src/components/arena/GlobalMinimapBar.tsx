"use client";

import { useMemo } from "react";
import { Flag, Trophy, Crown, Sparkles, Ghost } from "lucide-react";
import { PlayerArenaProgress } from "@/hooks/useGameHub";

interface GlobalMinimapBarProps {
  players: PlayerArenaProgress[];
  currentUserId?: string;
  className?: string;
}

export default function GlobalMinimapBar({
  players,
  currentUserId,
  className = "",
}: GlobalMinimapBarProps) {
  // Sắp xếp players để vẽ theo thứ tự layer (currentUser vẽ trên cùng)
  const sortedForRendering = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.isCurrentUser) return 1;
      if (b.isCurrentUser) return -1;
      return (a.score || 0) - (b.score || 0);
    });
  }, [players]);

  return (
    <div
      className={`w-full bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 py-2 select-none z-30 ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Vạch xuất phát 0% */}
        <div className="flex items-center gap-1 shrink-0 text-slate-400 font-mono text-[10px] font-black uppercase">
          <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center">
            <Flag size={12} fill="currentColor" />
          </div>
          <span className="hidden sm:inline">0%</span>
        </div>

        {/* Thanh đường ray toàn chặng (Minimap Track Bar) */}
        <div className="relative flex-1 h-3.5 bg-slate-900/90 rounded-full border border-white/15 overflow-visible">
          {/* Neon track glow fill */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-amber-500/15 rounded-full pointer-events-none" />

          {/* Vạch mốc chia chặng: 25%, 50%, 75% */}
          <div className="absolute top-0 bottom-0 left-1/4 w-[1px] bg-white/15" />
          <div className="absolute top-0 bottom-0 left-2/4 w-[1px] bg-white/20">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-slate-500">
              50%
            </span>
          </div>
          <div className="absolute top-0 bottom-0 left-3/4 w-[1px] bg-white/15" />

          {/* Render 100% các chấm Avatar người chơi trên đường ray */}
          {sortedForRendering.map((p) => {
            const isMe =
              Boolean(p.isCurrentUser) ||
              Boolean(
                currentUserId &&
                  String(p.playerId).toLowerCase() === String(currentUserId).toLowerCase()
              );
            const clampedRatio = Math.max(0.02, Math.min(0.98, p.progressRatio || 0));
            const leftPercent = `${(clampedRatio * 100).toFixed(1)}%`;

            return (
              <div
                key={p.playerId}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 ease-out group"
                style={{ left: leftPercent, zIndex: isMe ? 40 : p.rank === 1 ? 30 : 20 }}
              >
                {/* Micro avatar dot */}
                <div
                  className={`relative rounded-full transition-transform cursor-pointer ${
                    isMe
                      ? "w-6 h-6 ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950 scale-110 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                      : p.isGhost
                      ? "w-4 h-4 ring-1 ring-purple-400 opacity-75 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                      : p.rank === 1
                      ? "w-5 h-5 ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.6)]"
                      : "w-4 h-4 ring-1 ring-white/40 hover:scale-125"
                  }`}
                >
                  {p.avatarUrl ? (
                    <img
                      src={p.avatarUrl}
                      alt={p.nickname}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full rounded-full flex items-center justify-center text-[8px] font-black text-white ${
                        isMe
                          ? "bg-amber-500"
                          : p.isGhost
                          ? "bg-purple-600"
                          : p.rank === 1
                          ? "bg-amber-600"
                          : "bg-indigo-600"
                      }`}
                    >
                      {p.isGhost ? "👻" : p.nickname ? p.nickname.charAt(0).toUpperCase() : "P"}
                    </div>
                  )}

                  {/* Leader Crown */}
                  {p.rank === 1 && !isMe && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-yellow-300">
                      <Crown size={8} fill="currentColor" />
                    </div>
                  )}

                  {/* You Pin Tag */}
                  {isMe && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[7px] tracking-wider border border-white whitespace-nowrap shadow-xs flex items-center gap-0.5">
                      <Sparkles size={6} className="text-slate-950" />
                      <span>BẠN</span>
                    </div>
                  )}
                </div>

                {/* Hover Tooltip */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none hidden group-hover:flex flex-col items-center z-50">
                  <div className="px-2 py-1 rounded-md bg-slate-900 border border-white/20 text-white text-[10px] font-bold whitespace-nowrap shadow-xl">
                    <span className="text-amber-300">#{p.rank}</span> {p.nickname} (
                    {p.score.toLocaleString()} pts)
                  </div>
                  <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5 border-r border-b border-white/20" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Vạch về đích 100% */}
        <div className="flex items-center gap-1 shrink-0 text-amber-300 font-mono text-[10px] font-black uppercase">
          <span className="hidden sm:inline">100%</span>
          <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center">
            <Trophy size={12} fill="currentColor" />
          </div>
        </div>
      </div>
    </div>
  );
}
