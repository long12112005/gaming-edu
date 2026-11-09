"use client";

import React, { useState } from "react";
import { GameAssets } from "@/components/common/GameSvgAssets";
import { soundFX } from "@/utils/gameSoundEngine";
import { Waves, Compass, Flame, Shield, Bomb } from "lucide-react";

interface DragonBoatMapProps {
  boardState: any;
  actionPoints: number; // Row strokes
  playerTeam: string;
  isIsolated: boolean;
  onPerformAction: (actionType: string, payload: any) => Promise<void>;
  onUseSkill: (skillName: string, payload: any) => Promise<void>;
}

export default function DragonBoatMap({
  boardState,
  actionPoints,
  playerTeam,
  isIsolated,
  onPerformAction,
  onUseSkill,
}: DragonBoatMapProps) {
  const [isNitro, setIsNitro] = useState(false);
  const [isInkBlind, setIsInkBlind] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const boatA = boardState?.boatA || { distance: 0, currentLane: 1, comboRow: 0, nitroStrokesLeft: 0, hasWindShield: false };
  const boatB = boardState?.boatB || { distance: 0, currentLane: 2, comboRow: 0, nitroStrokesLeft: 0, hasWindShield: false };
  const myBoat = playerTeam === "TEAM_B" ? boatB : boatA;
  const enemyBoat = playerTeam === "TEAM_B" ? boatA : boatB;
  const obstacles = boardState?.obstacles || [
    { distance: 250, lane: 1, type: "WHIRLPOOL" },
    { distance: 250, lane: 3, type: "ROCK_REEF" },
    { distance: 500, lane: 2, type: "WHIRLPOOL" },
    { distance: 500, lane: 4, type: "ROCK_REEF" },
    { distance: 750, lane: 1, type: "ROCK_REEF" },
    { distance: 750, lane: 3, type: "WHIRLPOOL" },
  ];

  const handleRow = async () => {
    if (actionPoints < 1 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playBoatSplash();
      setIsNitro(true);
      setTimeout(() => setIsNitro(false), 800);
      await onPerformAction("ROW_BOAT", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleSteerLane = async (lane: number) => {
    if (isIsolated || submitting || myBoat.currentLane === lane) return;
    try {
      setSubmitting(true);
      soundFX.playBoatSplash();
      await onPerformAction("STEER_LANE", { lane });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNitroBoost = async () => {
    if (isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playBoatSplash();
      setIsNitro(true);
      setTimeout(() => setIsNitro(false), 2000);
      await onUseSkill("NITRO_BOOST", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleInkTorpedo = async () => {
    if (actionPoints < 1 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playBoatSplash();
      setIsInkBlind(true);
      setTimeout(() => setIsInkBlind(false), 2500);
      await onUseSkill("INK_TORPEDO", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleWindShield = async () => {
    if (actionPoints < 1 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playCorrectCombo(2);
      await onUseSkill("WIND_SHIELD", {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center gap-4 w-full max-w-5xl mx-auto p-4 bg-sky-950/90 rounded-3xl border border-cyan-500/30 backdrop-blur-md shadow-2xl text-white ${
        isInkBlind ? "ink-blind-effect" : ""
      }`}
    >
      {/* Header Tiến độ Đua 1000m */}
      <div className="flex items-center justify-between w-full px-5 py-3 bg-slate-900/80 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <GameAssets.DragonBoat color={playerTeam === "TEAM_A" ? "#ef4444" : "#3b82f6"} />
          <div>
            <div className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
              Thuyền Đội Bạn ({playerTeam === "TEAM_A" ? "Thuyền Đỏ" : "Thuyền Xanh"})
            </div>
            <div className="text-xl font-black text-amber-400">
              {myBoat.distance}m / 1000m
              {myBoat.nitroStrokesLeft > 0 && (
                <span className="ml-2 text-xs text-orange-400 font-bold">🔥 Nitro ({myBoat.nitroStrokesLeft} nhịp x2)</span>
              )}
              {myBoat.hasWindShield && (
                <span className="ml-2 text-xs text-cyan-300 font-bold">🛡️ Lá Chắn Gió</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-xs font-bold text-slate-300">Nhịp Chèo Tri Thức (+15m/nhịp • Đồng Tâm +5m)</div>
          <div className="text-2xl font-black text-emerald-400">{actionPoints} Nhịp Chèo</div>
        </div>

        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-rose-400 font-bold">Thuyền Đối Thủ</div>
          <div className="text-xl font-black text-rose-300">{enemyBoat.distance}m / 1000m</div>
        </div>
      </div>

      {/* Sông Đua 1000m chia 4 Làn nước & Chướng ngại vật (250m, 500m, 750m) */}
      <div className="relative w-full h-72 bg-linear-to-r from-blue-900 via-sky-800 to-indigo-900 rounded-2xl border-2 border-cyan-400/50 overflow-hidden flex flex-col justify-around p-2 select-none shadow-inner">
        {/* Các cột mốc 250m, 500m, 750m */}
        {[250, 500, 750].map((mark) => (
          <div
            key={`mark-${mark}`}
            className="absolute top-0 bottom-0 border-r border-dashed border-cyan-300/30 pointer-events-none"
            style={{ left: `${(mark / 1000) * 85}%` }}
          >
            <span className="text-[9px] font-bold text-cyan-200/70 bg-slate-900/60 px-1 rounded">
              {mark}m
            </span>
          </div>
        ))}

        {/* Vạch đích 1000m */}
        <div className="absolute right-6 top-0 bottom-0 w-2 border-r-4 border-dashed border-amber-400 z-10 flex items-center justify-center">
          <span className="rotate-90 text-[10px] font-black text-amber-300 bg-slate-900 px-2 py-0.5 rounded shadow">
            ĐÍCH 1000M
          </span>
        </div>

        {/* 4 Làn sông (Đỏ, Xanh, Vàng, Tím) */}
        {[1, 2, 3, 4].map((laneIndex) => (
          <div
            key={`lane-${laneIndex}`}
            className={`relative w-full h-14 border-b border-cyan-500/20 flex items-center px-4 ${
              myBoat.currentLane === laneIndex ? "bg-cyan-500/15" : ""
            }`}
          >
            <span className="absolute left-2 text-[10px] font-bold text-cyan-300/70 uppercase">
              Làn {laneIndex}
            </span>

            {/* Chướng ngại vật tự nhiên tại mốc 250m, 500m, 750m */}
            {obstacles
              .filter((o: any) => o.lane === laneIndex)
              .map((obs: any, idx: number) => {
                const leftPercent = (obs.distance / 1000) * 85;
                return (
                  <div
                    key={`obs-${idx}`}
                    className="absolute flex flex-col items-center z-10"
                    style={{ left: `${leftPercent}%` }}
                    title={`${obs.type === "WHIRLPOOL" ? "Xoáy Nước" : "Đá Ngầm"} tại ${obs.distance}m`}
                  >
                    <span className="text-base animate-pulse">
                      {obs.type === "WHIRLPOOL" ? "🌀" : "🪨"}
                    </span>
                    <span className="text-[8px] font-black text-amber-300 bg-slate-950/80 px-1 rounded">
                      {obs.distance}m
                    </span>
                  </div>
                );
              })}

            {/* Thuyền phe bạn */}
            {myBoat.currentLane === laneIndex && (
              <div
                className={`absolute transition-all duration-300 z-20 ${
                  isNitro || myBoat.nitroStrokesLeft > 0 ? "boat-nitro-boost" : ""
                }`}
                style={{ left: `${Math.min(85, (myBoat.distance / 1000) * 85)}%` }}
              >
                <GameAssets.DragonBoat color={playerTeam === "TEAM_A" ? "#ef4444" : "#3b82f6"} />
              </div>
            )}

            {/* Thuyền đối thủ */}
            {enemyBoat.currentLane === laneIndex && (
              <div
                className="absolute transition-all duration-300 z-20 opacity-85"
                style={{ left: `${Math.min(85, (enemyBoat.distance / 1000) * 85)}%` }}
              >
                <GameAssets.DragonBoat color={playerTeam === "TEAM_A" ? "#3b82f6" : "#ef4444"} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Điều khiển: Chuyển làn, Chèo Thuyền (+15m) & 3 Kỹ năng Chiến thuật */}
      <div className="flex flex-wrap items-center justify-between w-full px-4 py-3 bg-slate-900/90 rounded-2xl border border-slate-800 gap-3">
        {/* Nút chuyển làn né Xoáy Nước / Đá Ngầm */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
            <Compass size={14} /> Làn:
          </span>
          {[1, 2, 3, 4].map((l) => (
            <button
              key={`steer-${l}`}
              type="button"
              onClick={() => handleSteerLane(l)}
              disabled={isIsolated || submitting}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                myBoat.currentLane === l
                  ? "bg-cyan-600 border-cyan-400 text-white shadow-md ring-2 ring-cyan-400/40"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Làn {l}
            </button>
          ))}
        </div>

        {/* Nút Chèo thuyền lớn (+15m) */}
        <button
          type="button"
          onClick={handleRow}
          disabled={actionPoints < 1 || isIsolated || submitting}
          className="px-6 py-2.5 rounded-2xl bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-sm font-black text-white flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <Waves size={18} />
          <span>CHÈO THUYỀN (+15M)!</span>
        </button>

        {/* 3 Kỹ năng Chiến thuật */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleInkTorpedo}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Phun Mực Đen / Thủy Lôi: Làm thuyền dẫn đầu lùi -20m và che mực đen khung câu hỏi 6 giây"
          >
            <Bomb size={14} />
            <span>Phun Mực / Thủy Lôi (-20m)</span>
          </button>

          <button
            type="button"
            onClick={handleNitroBoost}
            disabled={isIsolated || submitting}
            className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Tăng Tốc Nitro (Combo Đội 4): Giúp 3 nhịp chèo tiếp theo đạt gấp đôi quãng đường (+30m/nhịp)"
          >
            <Flame size={14} />
            <span>Tăng Tốc Nitro (Combo 4)</span>
          </button>

          <button
            type="button"
            onClick={handleWindShield}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Lá Chắn Gió: Giúp thuyền lướt qua vùng Xoáy Nước / Đá Ngầm hoặc chặn 1 quả Thủy Lôi"
          >
            <Shield size={14} />
            <span>Lá Chắn Gió</span>
          </button>
        </div>
      </div>
    </div>
  );
}

