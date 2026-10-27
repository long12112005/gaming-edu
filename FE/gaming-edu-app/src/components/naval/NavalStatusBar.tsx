"use client";

import React from "react";
import { Radio, Crosshair, Shield, Zap, Flame, Target, Play, Flag, Volume2, VolumeX } from "lucide-react";
import { NAVAL_ASSETS } from "@/lib/navalAssets";
import { navalSounds } from "@/lib/navalSoundEffects";

interface NavalStatusBarProps {
  myTeamSide: "TEAM_A" | "TEAM_B" | "HOST" | null;
  teamAShipsRemaining: number;
  teamBShipsRemaining: number;
  currentCombo: number;
  energyPoints: number;
  shotsEarned: number;
  radarRemaining: number;
  shieldRemaining: number;
  skillMode: "NORMAL" | "RADAR" | "SHIELD" | "PRECISION";
  onSelectSkill: (mode: "NORMAL" | "RADAR" | "SHIELD" | "PRECISION") => void;
  isHost?: boolean;
  isMatchStarted: boolean;
  onStartMatch?: () => void;
  onEndEarly?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const NavalStatusBar: React.FC<NavalStatusBarProps> = ({
  myTeamSide,
  teamAShipsRemaining,
  teamBShipsRemaining,
  currentCombo,
  energyPoints,
  shotsEarned,
  radarRemaining,
  shieldRemaining,
  skillMode,
  onSelectSkill,
  isHost = false,
  isMatchStarted,
  onStartMatch,
  onEndEarly,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
      {/* Fleet health with ship thumbnails: TEAM_A vs TEAM_B */}
      <div className="flex items-center gap-6">
        {/* TEAM_A */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-cyan-400">HẠM ĐỘI LAM (A)</span>
            <div className="flex gap-1.5 mt-1">
              {[1, 2, 3, 4, 5].map((shipType, i) => {
                const isAlive = i < teamAShipsRemaining;
                const shipImg = NAVAL_ASSETS.ships[shipType];
                return (
                  <div
                    key={shipType}
                    title={NAVAL_ASSETS.shipNames[shipType]}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center p-0.5 border transition-all relative ${
                      isAlive
                        ? "bg-cyan-950/80 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                        : "bg-slate-900 border-slate-800 opacity-40 grayscale"
                    }`}
                  >
                    <img src={shipImg} alt={`Ship ${shipType}`} className="w-full h-full object-contain" />
                    {!isAlive && (
                      <span className="absolute inset-0 flex items-center justify-center text-red-500 font-bold text-xs">
                        ✕
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-slate-500">VS</span>

        {/* TEAM_B */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-rose-400">HẠM ĐỘI XÍCH (B)</span>
            <div className="flex gap-1.5 mt-1">
              {[1, 2, 3, 4, 5].map((shipType, i) => {
                const isAlive = i < teamBShipsRemaining;
                const shipImg = NAVAL_ASSETS.ships[shipType];
                return (
                  <div
                    key={shipType}
                    title={NAVAL_ASSETS.shipNames[shipType]}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center p-0.5 border transition-all relative ${
                      isAlive
                        ? "bg-rose-950/80 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                        : "bg-slate-900 border-slate-800 opacity-40 grayscale"
                    }`}
                  >
                    <img src={shipImg} alt={`Ship ${shipType}`} className="w-full h-full object-contain" />
                    {!isAlive && (
                      <span className="absolute inset-0 flex items-center justify-center text-red-500 font-bold text-xs">
                        ✕
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* If HOST: Neutral Referee Controls */}
      {isHost ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-400/40 text-indigo-300">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wide uppercase">TRỌNG TÀI QUAN SÁT TRUNG LẬP</span>
          </div>

          {/* Mute toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {isMatchStarted && (
            <button
              type="button"
              onClick={onEndEarly}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 border border-rose-400/50 shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <Flag className="w-4 h-4" /> Kết Thúc Trận Đấu Sớm
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Combo, Energy & Shots Earned */}
          <div className="flex items-center gap-5">
            {/* Shots Earned Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                shotsEarned > 0
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 border-amber-300 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
            >
              <Target className="w-4 h-4" />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] uppercase font-bold tracking-wider">Quyền Bắn</span>
                <span className="text-sm font-extrabold">{shotsEarned} lượt</span>
              </div>
            </div>

            {/* Combo flame */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
              <Flame className={`w-4 h-4 ${currentCombo >= 2 ? "text-orange-400 animate-flame-flicker" : "text-slate-500"}`} />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Combo</span>
                <span className="text-sm font-bold text-white">{currentCombo}x</span>
              </div>
            </div>

            {/* Energy Bar */}
            <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
              <Zap className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col leading-none">
                <div className="flex justify-between text-[10px] text-slate-300 font-bold mb-1">
                  <span>NĂNG LƯỢNG</span>
                  <span>{energyPoints} EP</span>
                </div>
                <div className="w-20 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (energyPoints / 100) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3 Tactical Skill Buttons */}
          <div className="flex items-center gap-2">
            {/* Radar */}
            <button
              type="button"
              onClick={() => {
                onSelectSkill(skillMode === "RADAR" ? "NORMAL" : "RADAR");
                navalSounds.playRadarPing();
              }}
              disabled={radarRemaining <= 0}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                skillMode === "RADAR"
                  ? "bg-cyan-500 border-cyan-300 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.8)] scale-105"
                  : radarRemaining > 0
                  ? "bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-500/30"
                  : "bg-slate-800/50 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed"
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Radar ({radarRemaining})</span>
            </button>

            {/* Bắn chính xác */}
            <button
              type="button"
              onClick={() => {
                onSelectSkill(skillMode === "PRECISION" ? "NORMAL" : "PRECISION");
                navalSounds.playLaserPrecision();
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                skillMode === "PRECISION"
                  ? "bg-orange-500 border-orange-300 text-slate-950 shadow-[0_0_12px_rgba(249,115,22,0.8)] scale-105"
                  : "bg-slate-800 hover:bg-slate-700 text-orange-300 border-orange-500/30"
              }`}
            >
              <Crosshair className="w-4 h-4" />
              <span>Bắn Chính Xác</span>
            </button>

            {/* Lá chắn phòng thủ */}
            <button
              type="button"
              onClick={() => {
                onSelectSkill(skillMode === "SHIELD" ? "NORMAL" : "SHIELD");
                navalSounds.playShieldActivate();
              }}
              disabled={shieldRemaining <= 0}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                skillMode === "SHIELD"
                  ? "bg-emerald-500 border-emerald-300 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.8)] scale-105"
                  : shieldRemaining > 0
                  ? "bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/30"
                  : "bg-slate-800/50 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed"
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Lá Chắn ({shieldRemaining})</span>
            </button>

            {/* Mute toggle */}
            <button
              type="button"
              onClick={onToggleMute}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
