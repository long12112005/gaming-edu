"use client";

import React, { useState } from "react";
import { CombatLogItem, NavalPlayerContribution, NavalMatchResult } from "@/hooks/useNavalWarHub";
import { ScrollText, Trophy, Medal, Crown, Target, Crosshair, Zap, Shield, Sparkles } from "lucide-react";

interface NavalLogAndLeaderboardProps {
  combatLogs: CombatLogItem[];
  leaderboard: NavalPlayerContribution[];
  matchResult: NavalMatchResult | null;
}

export const NavalLogAndLeaderboard: React.FC<NavalLogAndLeaderboardProps> = ({
  combatLogs,
  leaderboard,
  matchResult,
}) => {
  const [activeTab, setActiveTab] = useState<"LOG" | "LEADERBOARD">("LOG");

  return (
    <div className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col h-[320px]">
      {/* Tabs */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("LOG")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === "LOG"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ScrollText className="w-4 h-4" /> Nhật Ký Chiến Sự ({combatLogs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LEADERBOARD")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === "LEADERBOARD"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4" /> Bảng Xếp Hạng ({leaderboard.length})
          </button>
        </div>

        {matchResult && (
          <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
            {matchResult.winningTeam === "DRAW" ? "Trận Đấu Hòa" : `Đội Thắng: ${matchResult.winningTeam}`}
          </span>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {activeTab === "LOG" ? (
          combatLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Chưa có sự kiện chiến sự nào được ghi nhận.
            </div>
          ) : (
            combatLogs.map((log) => {
              let badgeColor = "bg-slate-800 text-slate-300 border-slate-700";
              let badgeLabel = "TIN BÁO";

              if (log.type === "HIT") {
                badgeColor = "bg-orange-500/20 text-orange-400 border-orange-500/40";
                badgeLabel = "TRÚNG ĐÍCH";
              } else if (log.type === "MISS") {
                badgeColor = "bg-blue-500/20 text-blue-400 border-blue-500/40";
                badgeLabel = "BẮN TRƯỢT";
              } else if (log.type === "SUNK") {
                badgeColor = "bg-red-500/20 text-red-400 border-red-500/40";
                badgeLabel = "CHÌM TÀU";
              } else if (log.type === "SHIELD") {
                badgeColor = "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
                badgeLabel = "LÁ CHẮN";
              } else if (log.type === "RADAR") {
                badgeColor = "bg-purple-500/20 text-purple-400 border-purple-500/40";
                badgeLabel = "RADAR";
              }

              return (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-start gap-2.5 transition-all hover:border-slate-700"
                >
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badgeColor}`}>
                    {badgeLabel}
                  </span>
                  <p className="flex-1 text-slate-200 leading-tight">{log.text}</p>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">{log.time}</span>
                </div>
              );
            })
          )
        ) : (
          /* LEADERBOARD VIEW */
          leaderboard.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Bảng xếp hạng đóng góp cá nhân sẽ cập nhật khi có kết quả phát bắn và câu hỏi.
            </div>
          ) : (
            leaderboard.map((p, idx) => (
              <div
                key={p.playerId}
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
              >
                {/* Rank & Nickname */}
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center font-bold text-slate-400">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{p.nickname}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          p.teamSide === "TEAM_A"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {p.teamSide === "TEAM_A" ? "Phe A" : "Phe B"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Chính xác: {p.hitAccuracy}% • Trúng {p.hitsCount}/{p.validShotsCount}
                    </span>
                  </div>
                </div>

                {/* Score & Contribution stats */}
                <div className="flex items-center gap-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">Đóng góp</span>
                    <span className="text-slate-300 font-semibold">
                      {p.shipsSunkContribution > 0 ? `🏴‍☠️ ${p.shipsSunkContribution} tàu` : `⚡ ${p.skillsUsedCount} skill`}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400">Điểm số</span>
                    <span className="font-mono font-bold text-amber-400">{p.totalScore}</span>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
