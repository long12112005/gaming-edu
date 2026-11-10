"use client";

import React, { useState } from "react";
import { GameAssets } from "@/components/common/GameSvgAssets";
import { soundFX } from "@/utils/gameSoundEngine";
import { Waves, Compass, Flame, Shield, Bomb, Trophy } from "lucide-react";

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

  const boatA = boardState?.boatA || {
    distance: 0,
    currentLane: 1,
    comboRow: 0,
    nitroStrokesLeft: 0,
    hasWindShield: false,
  };
  const boatB = boardState?.boatB || {
    distance: 0,
    currentLane: 2,
    comboRow: 0,
    nitroStrokesLeft: 0,
    hasWindShield: false,
  };
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
      className={`relative flex flex-col items-center gap-3.5 w-full max-w-5xl mx-auto p-4 bg-gradient-to-b from-[#07192b] via-[#092742] to-[#051424] rounded-3xl border-2 border-cyan-500/40 backdrop-blur-md shadow-[0_0_45px_rgba(6,182,212,0.18)] text-white ${
        isInkBlind ? "ink-blind-effect" : ""
      }`}
    >
      {/* Header Lễ Hội Đua Thuyền Rồng & Thanh Tiến Độ Thủy Trình 1000m */}
      <div className="flex flex-col gap-2.5 w-full px-5 py-3 bg-slate-900/90 rounded-2xl border border-cyan-500/30 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Thuyền Đội Bạn */}
          <div className="flex items-center gap-3">
            <div className="scale-90 -ml-2">
              <GameAssets.DragonBoat
                color={playerTeam === "TEAM_A" ? "#ef4444" : "#3b82f6"}
                isNitro={isNitro || myBoat.nitroStrokesLeft > 0}
                hasShield={myBoat.hasWindShield}
              />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-amber-300 font-black">
                {playerTeam === "TEAM_A" ? "🐉 Hỏa Long Chiến Thuyền (Bạn)" : "🐉 Thanh Long Chiến Thuyền (Bạn)"}
              </div>
              <div className="text-xl font-black text-white flex items-center gap-2">
                <span className="text-amber-400">{myBoat.distance}m</span>
                <span className="text-xs text-slate-400 font-semibold">/ 1000m</span>
                {myBoat.nitroStrokesLeft > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-400 text-[10px] text-orange-300 font-black animate-pulse">
                    🔥 Long Diễm x2 ({myBoat.nitroStrokesLeft})
                  </span>
                )}
                {myBoat.hasWindShield && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-400 text-[10px] text-teal-200 font-black">
                    🛡️ Phong Thuẫn
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Trống Lệnh Nhịp Chèo Tri Thức */}
          <div className="flex flex-col items-center bg-cyan-950/50 border border-cyan-500/40 rounded-xl px-4 py-1.5">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-300">
              🥁 Nhịp Trống Chèo Thuyền (+15m/nhịp • Đồng Tâm +5m)
            </div>
            <div className="text-2xl font-black text-emerald-400 drop-shadow">
              {actionPoints} Nhịp Chèo
            </div>
          </div>

          {/* Thuyền Đối Thủ */}
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-rose-400 font-black">
              {playerTeam === "TEAM_A" ? "🌊 Thủy Long Đối Thủ (Đội B)" : "🔥 Hỏa Long Đối Thủ (Đội A)"}
            </div>
            <div className="text-xl font-black text-rose-300">
              {enemyBoat.distance}m <span className="text-xs text-slate-400">/ 1000m</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Đang ở Làn nước số {enemyBoat.currentLane || 2}
            </div>
          </div>
        </div>

        {/* Thanh bản đồ thu nhỏ (Mini Thủy Trình 0m -> 1000m) */}
        <div className="relative w-full h-3 bg-slate-950 rounded-full border border-cyan-500/30 overflow-hidden">
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-300 transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, (myBoat.distance / 1000) * 100)}%` }}
          />
          <div
            className="absolute top-0 bottom-0 left-0 bg-blue-500/60 transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, (enemyBoat.distance / 1000) * 100)}%` }}
          />
        </div>
      </div>

      {/* ĐẠI GIANG ĐUA THUYỀN RỒNG 1000M (BỜ BẮC LỄ HỘI - 4 LÀN SÔNG PHAO TIÊU - CỔNG LONG MÔN) */}
      <div className="relative w-full rounded-2xl border-2 border-amber-500/50 overflow-hidden shadow-2xl select-none bg-[#042f4b]">
        {/* BỜ BẮC LỄ HỘI: Thảm cỏ xanh, Cờ Hội Ngũ Sắc & Trống Hội */}
        <div className="w-full h-7 bg-gradient-to-r from-emerald-950 via-green-900 to-emerald-950 border-b-2 border-amber-500/60 flex items-center justify-between px-4 relative overflow-hidden">
          <div className="flex items-center gap-2 text-[10px] font-black text-amber-300 tracking-wider z-10">
            <span>🏮 BỜ BẮC TRƯỜNG GIANG • LỄ HỘI ĐUA THUYỀN RỒNG</span>
          </div>
          {/* Dây cờ hội ngũ sắc trang trí dọc bờ sông */}
          <svg viewBox="0 0 320 20" className="w-64 h-4 opacity-90">
            {Array.from({ length: 16 }).map((_, i) => {
              const colors = ["#ef4444", "#fbbf24", "#10b981", "#3b82f6", "#a855f7"];
              return (
                <polygon
                  key={i}
                  points={`${i * 20},0 ${i * 20 + 16},0 ${i * 20 + 8},15`}
                  fill={colors[i % colors.length]}
                />
              );
            })}
          </svg>
          <div className="text-[10px] font-bold text-emerald-300 hidden sm:block z-10">
            Cờ Trống Cổ Vũ Nhộn Nhịp
          </div>
        </div>

        {/* LÒNG SÔNG 4 LÀN NƯỚC VỚI SÓNG CUỘN & DÂY PHAO TIÊU ĐỎ - VÀNG */}
        <div className="relative w-full h-[304px] bg-gradient-to-r from-[#073b61] via-[#095080] to-[#062d4d] river-water-flow flex flex-col justify-between py-1">
          {/* Lớp gợn sóng bạc trang trí mặt sông */}
          <svg
            viewBox="0 0 800 300"
            className="pointer-events-none absolute inset-0 w-full h-full opacity-25"
            preserveAspectRatio="none"
          >
            <path
              d="M 20 40 Q 60 30 100 40 T 180 40 M 260 110 Q 300 100 340 110 T 420 110 M 520 65 Q 560 55 600 65 T 680 65 M 140 195 Q 180 185 220 195 T 300 195 M 440 250 Q 480 240 520 250 T 600 250"
              fill="none"
              stroke="#bae6fd"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Các cột mốc thủy trình 250m, 500m, 750m */}
          {[250, 500, 750].map((mark) => (
            <div
              key={`mark-${mark}`}
              className="absolute top-0 bottom-0 border-r-2 border-dashed border-cyan-300/35 pointer-events-none z-0"
              style={{ left: `${(mark / 1000) * 84}%` }}
            >
              <span className="inline-block mt-1 ml-1 text-[9px] font-black text-amber-200 bg-slate-950/85 border border-amber-400/50 px-1.5 py-0.5 rounded shadow">
                ⚑ MỐC {mark}M
              </span>
            </div>
          ))}

          {/* CỔNG VẠCH ĐÍCH "VƯỢT VŨ MÔN - 1000M" */}
          <div className="absolute right-3 top-0 bottom-0 w-7 bg-[repeating-linear-gradient(0deg,#fde047_0px,#fde047_10px,#991b1b_10px,#991b1b_20px)] border-x-2 border-yellow-300 z-20 flex flex-col items-center justify-between py-2 shadow-[0_0_25px_rgba(250,204,21,0.5)]">
            <Trophy size={15} className="text-yellow-200 drop-shadow" />
            <span className="rotate-90 whitespace-nowrap text-[10px] font-black text-yellow-200 bg-red-950/95 border border-yellow-400 px-2.5 py-0.5 rounded shadow-md">
              LONG MÔN ĐÍCH 1000M
            </span>
            <Trophy size={15} className="text-yellow-200 drop-shadow" />
          </div>

          {/* 4 LÀN SÔNG ĐUA & DÂY PHAO TIÊU PHÂN LÀN */}
          {[1, 2, 3, 4].map((laneIndex) => (
            <div
              key={`lane-${laneIndex}`}
              onClick={() => handleSteerLane(laneIndex)}
              className={`relative w-full h-[72px] flex items-center px-3 cursor-pointer transition-colors ${
                myBoat.currentLane === laneIndex
                  ? "bg-gradient-to-r from-cyan-400/20 via-sky-400/15 to-transparent"
                  : "hover:bg-white/5"
              }`}
            >
              {/* Dây phao tiêu đỏ-vàng phân làn dưới mỗi làn */}
              {laneIndex < 4 && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-10 h-1.5 flex items-center justify-between opacity-75">
                  <div className="w-full h-px bg-cyan-200/40 absolute" />
                  {Array.from({ length: 22 }).map((_, bi) => (
                    <span
                      key={bi}
                      className={`w-2.5 h-1.5 rounded-full z-10 ${
                        bi % 2 === 0 ? "bg-amber-400" : "bg-red-500"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Biển số Làn nước */}
              <div
                className={`z-10 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                  myBoat.currentLane === laneIndex
                    ? "bg-amber-500 text-slate-950 border-yellow-200 shadow"
                    : "bg-slate-950/70 text-cyan-200 border-cyan-500/30"
                }`}
              >
                Làn {laneIndex}
              </div>

              {/* Chướng ngại vật tự nhiên (Xoáy Nước Cuồng Lưu & Đá Ngầm Tai Mèo) tại 250m, 500m, 750m */}
              {obstacles
                .filter((o: any) => o.lane === laneIndex)
                .map((obs: any, idx: number) => {
                  const leftPercent = (obs.distance / 1000) * 84;
                  return (
                    <div
                      key={`obs-${idx}`}
                      className="absolute flex flex-col items-center z-10"
                      style={{ left: `${leftPercent}%` }}
                      title={`${obs.type === "WHIRLPOOL" ? "Xoáy Nước Cuồng Lưu" : "Đá Ngầm Tai Mèo"} tại ${obs.distance}m`}
                    >
                      <GameAssets.RiverObstacle type={obs.type} />
                      <span className="text-[8.5px] font-black text-amber-200 bg-slate-950/90 border border-amber-400/40 px-1.5 rounded -mt-1.5 shadow">
                        {obs.type === "WHIRLPOOL" ? "Xoáy" : "Đá"} {obs.distance}m
                      </span>
                    </div>
                  );
                })}

              {/* Thuyền Rồng Đội Bạn */}
              {myBoat.currentLane === laneIndex && (
                <div
                  className={`absolute transition-all duration-300 z-20 ${
                    isNitro || myBoat.nitroStrokesLeft > 0 ? "boat-nitro-boost" : ""
                  }`}
                  style={{ left: `${Math.max(5, Math.min(76, 5 + (myBoat.distance / 1000) * 72))}%` }}
                >
                  <div className="relative flex flex-col items-center">
                    <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black text-[8.5px] shadow -mb-1 z-30">
                      THUYỀN BẠN ({myBoat.distance}m)
                    </span>
                    <GameAssets.DragonBoat
                      color={playerTeam === "TEAM_A" ? "#ef4444" : "#3b82f6"}
                      isNitro={isNitro || myBoat.nitroStrokesLeft > 0}
                      hasShield={myBoat.hasWindShield}
                    />
                  </div>
                </div>
              )}

              {/* Thuyền Rồng Đối Thủ */}
              {enemyBoat.currentLane === laneIndex && (
                <div
                  className="absolute transition-all duration-300 z-15 opacity-95"
                  style={{ left: `${Math.max(5, Math.min(76, 5 + (enemyBoat.distance / 1000) * 72))}%` }}
                >
                  <div className="relative flex flex-col items-center">
                    <span className="px-1.5 py-0.2 rounded bg-sky-500 text-slate-950 font-black text-[8.5px] shadow -mb-1 z-30">
                      ĐỐI THỦ ({enemyBoat.distance}m)
                    </span>
                    <GameAssets.DragonBoat
                      color={playerTeam === "TEAM_A" ? "#3b82f6" : "#ef4444"}
                      isNitro={enemyBoat.nitroStrokesLeft > 0}
                      hasShield={enemyBoat.hasWindShield}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* BỜ NAM LỄ HỘI */}
        <div className="w-full h-6 bg-gradient-to-r from-emerald-950 via-green-900 to-emerald-950 border-t-2 border-amber-500/60 flex items-center justify-between px-4 text-[10px] font-bold text-amber-200/90">
          <span>🏮 BỜ NAM TRƯỜNG GIANG • CLICK VÀO LÀN SÔNG BẤT KỲ ĐỂ BẺ LÁI NÉ CHƯỚNG NGẠI VẬT</span>
          <span className="hidden md:inline text-cyan-300">Đích đến: Cổng Long Môn 1000m</span>
        </div>
      </div>

      {/* BẢNG ĐIỀU KHIỂN: BẺ LÁI 4 LÀN, TRỐNG LỆNH CHÈO THUYỀN (+15M) & 3 TUYỆT KỸ THỦY CHIẾN */}
      <div className="flex flex-wrap items-center justify-between w-full px-4 py-3 bg-slate-900/95 rounded-2xl border border-cyan-500/30 gap-3">
        {/* Nút chuyển làn né Xoáy Nước / Đá Ngầm */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
            <Compass size={14} /> Bẻ Lái:
          </span>
          {[1, 2, 3, 4].map((l) => (
            <button
              key={`steer-${l}`}
              type="button"
              onClick={() => handleSteerLane(l)}
              disabled={isIsolated || submitting}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                myBoat.currentLane === l
                  ? "bg-amber-500 border-yellow-200 text-slate-950 shadow-md ring-2 ring-amber-400/40"
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
          className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 border border-yellow-300/70 disabled:opacity-40 text-sm font-black text-white flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 transition-all"
        >
          <Waves size={18} />
          <span>KHUA MÁI CHÈO (+15M)!</span>
        </button>

        {/* 3 Kỹ năng Thủy chiến */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleInkTorpedo}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-400/50 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Phun Mực Đen / Thủy Lôi: Làm thuyền dẫn đầu lùi -20m và che mực đen khung câu hỏi 6 giây"
          >
            <Bomb size={14} />
            <span>Thủy Lôi Mực Đen (-20m)</span>
          </button>

          <button
            type="button"
            onClick={handleNitroBoost}
            disabled={isIsolated || submitting}
            className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 border border-orange-400/50 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Long Diễm Tăng Tốc (Combo Đội 4): Giúp 3 nhịp chèo tiếp theo đạt gấp đôi quãng đường (+30m/nhịp)"
          >
            <Flame size={14} />
            <span>Long Diễm Nitro (Combo 4)</span>
          </button>

          <button
            type="button"
            onClick={handleWindShield}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 border border-teal-400/50 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Phong Thần Hộ Thuẫn: Giúp thuyền lướt qua vùng Xoáy Nước / Đá Ngầm hoặc chặn 1 quả Thủy Lôi"
          >
            <Shield size={14} />
            <span>Phong Thần Thuẫn</span>
          </button>
        </div>
      </div>
    </div>
  );
}
