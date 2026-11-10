"use client";

import React, { useState } from "react";
import { GameAssets } from "@/components/common/GameSvgAssets";
import { soundFX } from "@/utils/gameSoundEngine";
import { Heart, Shield, Snowflake, Zap, Swords, Flame, Sparkles } from "lucide-react";

interface TowerDefenseMapProps {
  boardState: any;
  actionPoints: number; // Gold (Ngân Lượng / Vàng Tri Thức)
  playerTeam?: string;
  isIsolated: boolean;
  onPerformAction: (actionType: string, payload: any) => Promise<void>;
  onUseSkill: (skillName: string, payload: any) => Promise<void>;
}

export default function TowerDefenseMap({
  boardState,
  actionPoints,
  playerTeam = "TEAM_A",
  isIsolated,
  onPerformAction,
  onUseSkill,
}: TowerDefenseMapProps) {
  const [selectedTowerType, setSelectedTowerType] = useState<"ARCHER" | "FREEZE" | "LASER">("ARCHER");
  const [selectedLane, setSelectedLane] = useState<number>(0);
  const [isFreezeActive, setIsFreezeActive] = useState(false);
  const [isTowerBoosted, setIsTowerBoosted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastCombatBanner, setLastCombatBanner] = useState<string>(
    "Trống trận đã điểm! Hãy xây Đài Phòng Ngự hoặc phái Võ Tướng công thành!"
  );

  const teamABaseHp = boardState?.teamABaseHp ?? boardState?.baseHp ?? 1000;
  const teamBBaseHp = boardState?.teamBBaseHp ?? 1000;
  const teamAShield = boardState?.teamAShield ?? 0;
  const teamBShield = boardState?.teamBShield ?? 0;
  const towers = boardState?.towers || [];
  const creeps = boardState?.creeps || [];
  const pathTiles: number[][] = boardState?.pathTiles || [
    [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7],
    [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7],
  ];

  const handleTileClick = async (x: number, y: number) => {
    if (isIsolated || submitting) return;
    const isPath = pathTiles.some((p) => p[0] === x && p[1] === y);
    if (isPath) return;

    const existingTower = towers.find((t: any) => t.x === x && t.y === y);
    if (existingTower) {
      try {
        setSubmitting(true);
        soundFX.playTowerLaser();
        setLastCombatBanner(`⚡ Đã thăng cấp Đài Phòng Ngự tại (${x}, ${y}) lên Cấp ${(existingTower.level || 1) + 1}!`);
        await onPerformAction("UPGRADE_TOWER", { towerId: existingTower.id });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      setSubmitting(true);
      soundFX.playTowerLaser();
      if (selectedTowerType === "FREEZE") {
        setIsFreezeActive(true);
        setTimeout(() => setIsFreezeActive(false), 2000);
      }
      const towerName =
        selectedTowerType === "ARCHER"
          ? "Gia Cát Liên Nỏ Đài"
          : selectedTowerType === "FREEZE"
          ? "Huyền Băng Bát Quái Đài"
          : "Thần Công Hỏa Pháo Đài";
      setLastCombatBanner(`🏯 Đã dựng ${towerName} tại tọa độ (${x}, ${y})!`);
      await onPerformAction("BUILD_TOWER", {
        x,
        y,
        lane: x <= 2 ? 0 : 1,
        towerType: selectedTowerType,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpawnCreep = async (creepType: "SCOUT" | "TANK") => {
    const cost = creepType === "TANK" ? 250 : 100;
    if (actionPoints < cost || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playTowerLaser();
      setLastCombatBanner(
        creepType === "TANK"
          ? `⚔️ Xuất chinh Trọng Giáp Hổ Phù Tướng (300 HP) tiến đánh ${selectedLane === 0 ? "Thượng Đạo" : "Hạ Đạo"}!`
          : `🐎 Phái Khinh Kỵ Tiên Phong (50 HP) đột kích ${selectedLane === 0 ? "Thượng Đạo" : "Hạ Đạo"}!`
      );
      await onPerformAction("SPAWN_CREEP", { creepType, lane: selectedLane });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGlobalFreeze = async () => {
    if (actionPoints < 150 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      setIsFreezeActive(true);
      soundFX.playBigExplosion();
      setLastCombatBanner("❄️ Kích hoạt Tuyệt Kỹ: Hàn Băng Vạn Lý Phong Ấn toàn quân địch trong 5 giây!");
      await onUseSkill("GLOBAL_FREEZE", {});
      setTimeout(() => setIsFreezeActive(false), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTowerBoost = async () => {
    if (isIsolated || submitting) return;
    try {
      setSubmitting(true);
      setIsTowerBoosted(true);
      soundFX.playCorrectCombo(3);
      setLastCombatBanner("🥁 Trống Trận Lạc Hồng nổi lên! Toàn bộ Đài Phòng Ngự tăng gấp đôi (x2) hỏa lực!");
      await onUseSkill("TOWER_BOOST", {});
      setTimeout(() => setIsTowerBoosted(false), 6000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBaseShield = async () => {
    if (actionPoints < 100 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playCorrectCombo(2);
      setLastCombatBanner("🛡️ Khởi động Hộ Thành Bát Quái Đại Trận (+200 Giáp Bảo Hộ Thành Trì)!");
      await onUseSkill("BASE_SHIELD", {});
    } finally {
      setSubmitting(false);
    }
  };

  // Tính toán danh sách các đường đạn tấn công cổ trang (Hỏa Tiễn, Hàn Băng, Thần Công) từ các trụ tới mục tiêu
  const activeAttacks = towers.map((tw: any, idx: number) => {
    // Tọa độ tâm của ô trụ trong hệ viewBox 800 x 340 (8 cột x 5 hàng)
    const startX = tw.y * 100 + 50;
    const startY = tw.x * 68 + 30;

    // Tìm quái địch gần nhất hoặc nhắm về phía cổng thành đối phương
    const enemyCreeps = creeps.filter((cr: any) => cr.ownerTeam !== (tw.ownerTeam || "TEAM_A"));
    let targetCreep = enemyCreeps.find((cr: any) => (cr.lane === 1 ? 3 : 1) === (tw.x <= 2 ? 1 : 3));
    if (!targetCreep && enemyCreeps.length > 0) {
      targetCreep = enemyCreeps[idx % enemyCreeps.length];
    }

    const targetCol = targetCreep ? targetCreep.pathIndex : 7;
    const targetRow = targetCreep ? (targetCreep.lane === 1 ? 3 : 1) : tw.x <= 2 ? 1 : 3;
    const endX = targetCol * 100 + 50;
    const endY = targetRow * 68 + 34;

    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 32;

    return {
      id: tw.id || `atk-${idx}`,
      type: (tw.type || "ARCHER").toUpperCase(),
      level: tw.level || 1,
      startX,
      startY,
      endX,
      endY,
      midX,
      midY,
      hasTargetCreep: Boolean(targetCreep),
    };
  });

  return (
    <div
      className={`relative flex flex-col items-center gap-3.5 w-full max-w-5xl mx-auto p-4 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-[#1a0f0a] via-[#141824] to-[#0f172a] shadow-[0_0_50px_rgba(245,158,11,0.15)] text-white overflow-hidden ${
        isFreezeActive ? "td-freeze-overlay" : ""
      }`}
    >
      {/* Hoa văn mây cổ phong (Tường Vân) trang trí góc chiến trường */}
      <div className="pointer-events-none absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700 opacity-80" />

      {/* BẢNG CHỈ HUY QUAN ẢI: LONG THÀNH (TRÁI) - NGÂN KHỐ HOÀNG KIM - HỔ QUAN (PHẢI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 w-full px-5 py-3 bg-gradient-to-r from-[#1e1b2e]/95 via-[#2a1810]/95 to-[#2d1219]/95 rounded-2xl border border-amber-500/35 shadow-inner">
        {/* Thanh Long Thành - Đội A (Bên trái - 1000 HP) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-sky-300 tracking-wide">
              <Heart size={14} className="fill-sky-400 text-sky-400" /> THANH LONG THÀNH (ĐỘI A)
            </span>
            <span className="text-amber-300 font-black">
              {teamABaseHp}/1000 HP {teamAShield > 0 ? `• Khiên +${teamAShield}` : ""}
            </span>
          </div>
          <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-amber-500/40 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-700 via-sky-500 to-cyan-300 transition-all duration-300 shadow-[0_0_10px_#38bdf8]"
              style={{ width: `${Math.max(0, Math.min(100, (teamABaseHp / 1000) * 100))}%` }}
            />
          </div>
        </div>

        {/* Ngân Khố Quân Lương (Kim Nguyên Bảo) */}
        <div className="flex flex-col items-center justify-center bg-amber-950/40 border border-amber-500/40 rounded-xl py-1.5 px-3">
          <div className="flex items-center gap-2.5">
            {/* Biểu tượng Kim Nguyên Bảo (Thỏi Vàng Cổ Trang) */}
            <svg viewBox="0 0 48 36" className="w-9 h-7 drop-shadow-[0_2px_6px_rgba(251,191,36,0.6)]">
              <path
                d="M4 18 Q12 6 24 14 Q36 6 44 18 L38 30 Q24 34 10 30 Z"
                fill="#fbbf24"
                stroke="#fef08a"
                strokeWidth="2"
              />
              <ellipse cx="24" cy="15" rx="10" ry="5" fill="#fde047" stroke="#d97706" strokeWidth="1.5" />
            </svg>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-amber-300 font-black">
                Ngân Khố Quân Lương ({playerTeam === "TEAM_B" ? "Hổ Quan" : "Long Thành"})
              </div>
              <div className="text-xl font-black text-yellow-300 drop-shadow">
                {actionPoints} Lượng Vàng
              </div>
            </div>
          </div>
          <span className="text-[10px] text-amber-200/80">
            Đúng 1 câu = +100 Lượng (+50 Lượng thưởng thần tốc &le;5s)
          </span>
        </div>

        {/* Chu Tước Hổ Quan - Đội B (Bên phải - 1000 HP) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-rose-300 tracking-wide">
              <Heart size={14} className="fill-rose-500 text-rose-500" /> CHU TƯỚC HỔ QUAN (ĐỘI B)
            </span>
            <span className="text-amber-300 font-black">
              {teamBBaseHp}/1000 HP {teamBShield > 0 ? `• Khiên +${teamBShield}` : ""}
            </span>
          </div>
          <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-amber-500/40 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-800 via-rose-500 to-amber-400 transition-all duration-300 shadow-[0_0_10px_#f43f5e]"
              style={{ width: `${Math.max(0, Math.min(100, (teamBBaseHp / 1000) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Thanh Cáo Thị Chiến Sự Cổ Trang */}
      <div className="w-full flex items-center justify-between px-4 py-1.5 rounded-xl bg-amber-950/50 border border-amber-500/30 text-xs text-amber-200">
        <span className="flex items-center gap-2 font-semibold">
          <Flame size={14} className="text-amber-400 animate-pulse" />
          {lastCombatBanner}
        </span>
        <span className="text-[11px] text-amber-400 font-bold hidden sm:inline">
          Đài Phòng Ngự đang khai hỏa: {towers.length} Đài • Quân trên chiến trường: {creeps.length} Đạo
        </span>
      </div>

      {/* SA BÀN CHIẾN TRƯỜNG CỔ TRANG (5 HÀNG x 8 CỘT + LỚP ĐẠN ĐẠO HỎA TIỄN / THẦN CÔNG / HÀN BĂNG) */}
      <div className="w-full overflow-x-auto">
        <div className="relative p-3.5 rounded-2xl border-2 border-amber-600/40 bg-gradient-to-b from-[#231912] via-[#1c221b] to-[#1f1712] shadow-2xl w-full min-w-[680px]">
          {/* Họa tiết nền chiến trường cổ đạo + Trống trận 4 góc */}
          <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:18px_18px] rounded-2xl" />

          {/* LỚP SVG HIỆU ỨNG TẤN CÔNG CỔ TRANG TRỰC TIẾP (HỎA TIỄN, HÀN BĂNG PHÙ, ĐẠN THẦN CÔNG) */}
          <svg
            viewBox="0 0 800 340"
            className="pointer-events-none absolute inset-0 w-full h-full z-30 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="fireArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.2" />
                <stop offset="60%" stopColor="#f97316" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="frostBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="dragonCannonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#ec4899" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="1" />
              </linearGradient>
            </defs>

            {activeAttacks.map((atk: any) => {
              const pathD = `M ${atk.startX} ${atk.startY} Q ${atk.midX} ${atk.midY} ${atk.endX} ${atk.endY}`;
              if (atk.type === "ARCHER") {
                return (
                  <g key={atk.id}>
                    {/* Quỹ đạo Mưa Tên Lửa (Hỏa Tiễn Liên Châu) */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="url(#fireArrowGrad)"
                      strokeWidth="3.2"
                      strokeDasharray="10 6"
                      className="animate-pulse"
                    />
                    {/* Mũi tên lửa đang găm vào mục tiêu */}
                    <line
                      x1={atk.endX - 24}
                      y1={atk.endY - 14}
                      x2={atk.endX}
                      y2={atk.endY}
                      stroke="#fef08a"
                      strokeWidth="3"
                    />
                    <polygon
                      points={`${atk.endX + 4},${atk.endY + 2} ${atk.endX - 8},${atk.endY - 8} ${atk.endX - 11},${atk.endY}`}
                      fill="#ef4444"
                    />
                    {/* Vòng lửa bùng nổ tại điểm trúng tên */}
                    <circle cx={atk.endX} cy={atk.endY} r="12" fill="rgba(239,68,68,0.35)" stroke="#fde047" strokeWidth="1.5" />
                    <circle cx={atk.endX} cy={atk.endY} r="5" fill="#fef08a" />
                  </g>
                );
              }

              if (atk.type === "FREEZE") {
                return (
                  <g key={atk.id}>
                    {/* Luồng Hàn Khí Cửu Thiên Băng Phù */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="url(#frostBeamGrad)"
                      strokeWidth="4"
                      strokeDasharray="6 4"
                    />
                    {/* Pháp trận bông tuyết Bát Quái tại điểm trúng đích */}
                    <circle
                      cx={atk.endX}
                      cy={atk.endY}
                      r="16"
                      fill="rgba(34,211,238,0.28)"
                      stroke="#67e8f9"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                    <path
                      d={`M ${atk.endX - 10} ${atk.endY} H ${atk.endX + 10} M ${atk.endX} ${atk.endY - 10} V ${atk.endY + 10}`}
                      stroke="#ecfeff"
                      strokeWidth="2"
                    />
                  </g>
                );
              }

              return (
                <g key={atk.id}>
                  {/* Đạn Thần Công Hỏa Lôi Cửu Long */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#dragonCannonGrad)"
                    strokeWidth="4.5"
                  />
                  {/* Quả cầu lửa Thần Công & Chấn động nổ */}
                  <circle
                    cx={atk.endX}
                    cy={atk.endY}
                    r="18"
                    fill="rgba(245, 158, 11, 0.35)"
                    stroke="#fef08a"
                    strokeWidth="2.2"
                  />
                  <circle cx={atk.endX} cy={atk.endY} r="9" fill="#ef4444" />
                  <circle cx={atk.endX} cy={atk.endY} r="4" fill="#ffffff" />
                </g>
              );
            })}
          </svg>

          {/* LƯỚI SA BÀN 5 HÀNG x 8 CỘT */}
          <div className="grid grid-cols-8 gap-2 relative z-10">
            {Array.from({ length: 5 }).map((_, r) =>
              Array.from({ length: 8 }).map((_, c) => {
                const isPath = r === 1 || r === 3;
                const isBaseA = isPath && c === 0;
                const isBaseB = isPath && c === 7;
                const tower = towers.find((t: any) => t.x === r && t.y === c);
                const creepsOnTile = creeps.filter((cr: any) => {
                  const laneRow = cr.lane === 1 ? 3 : 1;
                  return laneRow === r && cr.pathIndex === c;
                });

                return (
                  <button
                    key={`td-${r}-${c}`}
                    type="button"
                    onClick={() => handleTileClick(r, c)}
                    disabled={isIsolated || submitting || isPath}
                    className={`relative h-[66px] rounded-xl border flex flex-col items-center justify-center transition-all ${
                      isBaseA
                        ? "bg-gradient-to-b from-sky-950 via-blue-950 to-slate-950 border-2 border-amber-400 shadow-[0_0_20px_rgba(56,189,248,0.35)]"
                        : isBaseB
                        ? "bg-gradient-to-b from-rose-950 via-red-950 to-slate-950 border-2 border-amber-400 shadow-[0_0_20px_rgba(244,63,94,0.35)]"
                        : isPath
                        ? "bg-gradient-to-r from-[#3b2818] via-[#4a3520] to-[#3b2818] border-amber-600/50 shadow-inner cursor-default"
                        : tower
                        ? `bg-gradient-to-b from-[#1f2e22] to-[#111c15] border-2 border-amber-400/90 hover:scale-105 ${
                            isTowerBoosted ? "ring-2 ring-yellow-300 shadow-[0_0_18px_#fbbf24]" : ""
                          }`
                        : "bg-[#1c241e]/80 border-stone-700/80 hover:border-amber-400/80 hover:bg-[#273229]"
                    }`}
                    title={
                      isBaseA
                        ? "Thanh Long Thành - Đại Bản Doanh Đội A"
                        : isBaseB
                        ? "Chu Tước Hổ Quan - Đại Bản Doanh Đội B"
                        : isPath
                        ? `${r === 1 ? "Thượng Đạo (Nhạn Môn Quan)" : "Hạ Đạo (Hổ Lao Quan)"}`
                        : tower
                        ? `Đài ${tower.type} Cấp ${tower.level} - Click để Thăng Cấp (80 Lượng)`
                        : `Đài Điểm Tướng (${r}, ${c}) - Click để dựng ${selectedTowerType}`
                    }
                  >
                    {/* Lầu Thành Cổ Trang 2 Bên Quan Ải */}
                    {isBaseA && (
                      <div className="flex flex-col items-center -mt-1 z-20">
                        <GameAssets.TdBaseCastle team="TEAM_A" hasShield={teamAShield > 0} />
                      </div>
                    )}
                    {isBaseB && (
                      <div className="flex flex-col items-center -mt-1 z-20">
                        <GameAssets.TdBaseCastle team="TEAM_B" hasShield={teamBShield > 0} />
                      </div>
                    )}

                    {/* Cổ Đạo Lát Đá Thanh Thạch (Làn đường hành quân) */}
                    {isPath && !isBaseA && !isBaseB && creepsOnTile.length === 0 && (
                      <div className="flex flex-col items-center justify-center w-full h-full relative">
                        {/* Vân đá lát đường & Vết bánh chiến xa */}
                        <div className="w-4/5 h-px bg-amber-400/20 mb-1" />
                        <span className="text-[9px] text-amber-300/85 font-black tracking-widest uppercase">
                          {r === 1 ? "⚔ THƯỢNG ĐẠO ➔" : "⚔ HẠ ĐẠO ➔"}
                        </span>
                        <div className="w-4/5 h-px bg-amber-400/20 mt-1" />
                      </div>
                    )}

                    {/* Bệ Đá Bát Quái Chờ Xây Đài Phòng Ngự */}
                    {!isPath && !tower && (
                      <div className="flex flex-col items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                        <svg viewBox="0 0 36 36" className="w-8 h-8">
                          <polygon
                            points="12,2 24,2 34,12 34,24 24,34 12,34 2,24 2,12"
                            fill="rgba(30,41,59,0.7)"
                            stroke="#d97706"
                            strokeWidth="1.2"
                            strokeDasharray="3 2"
                          />
                          <circle cx="18" cy="18" r="7" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />
                          <path d="M18 13 V23 M13 18 H23" stroke="#fde047" strokeWidth="1.6" />
                        </svg>
                        <span className="text-[8px] text-amber-400/70 font-bold -mt-0.5">Đài Trống</span>
                      </div>
                    )}

                    {/* Đạo Quân Cổ Trang (Khinh Kỵ / Võ Tướng Thiết Giáp) Đang Hành Quân */}
                    {creepsOnTile.length > 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-stone-950/80 rounded-xl border border-amber-400/60 p-0.5 shadow-lg">
                        <GameAssets.TdCreepUnit
                          creepType={creepsOnTile[0].type}
                          isFrozen={creepsOnTile[0].isFrozen || isFreezeActive}
                        />
                        <div className="px-1.5 py-0.2 bg-red-950/90 border border-amber-400/70 rounded text-[8.5px] font-black text-fde047 text-amber-300 leading-tight -mt-1">
                          {creepsOnTile[0].hp} HP
                        </div>
                      </div>
                    )}

                    {/* Đài Phòng Ngự Cổ Trang (Gia Cát Liên Nỏ / Huyền Băng Đài / Thần Công Pháo) */}
                    {tower && (
                      <div className="flex flex-col items-center justify-center z-20 -mt-1">
                        <GameAssets.DefenseTurret
                          teamColor={tower.ownerTeam === "TEAM_B" ? "#f43f5e" : "#fbbf24"}
                          towerType={tower.type}
                          level={tower.level || 1}
                        />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* BẢNG ĐIỀU BINH KHIỂN TƯỚNG: NHÁNH THỦ THÀNH & NHÁNH CÔNG THÀNH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
        {/* Nhánh Kiến Thiết Đài Phòng Ngự */}
        <div className="flex flex-col gap-2 p-3.5 bg-gradient-to-br from-[#1b241e] to-[#111827] rounded-2xl border border-amber-500/35">
          <div className="text-xs font-black text-amber-300 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" /> Kiến Thiết Đài Phòng Ngự (Click Đài Trống để xây)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTowerType("ARCHER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                selectedTowerType === "ARCHER"
                  ? "bg-gradient-to-r from-emerald-700 to-teal-600 border-amber-300 text-white shadow-md"
                  : "bg-slate-800/90 border-slate-700 text-slate-300 hover:border-amber-500/50"
              }`}
            >
              <span>🏹 Gia Cát Liên Nỏ Đài (100 Vàng)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTowerType("FREEZE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                selectedTowerType === "FREEZE"
                  ? "bg-gradient-to-r from-cyan-700 to-sky-600 border-amber-300 text-white shadow-md"
                  : "bg-slate-800/90 border-slate-700 text-slate-300 hover:border-amber-500/50"
              }`}
            >
              <span>❄️ Huyền Băng Bát Quái Đài (150 Vàng)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTowerType("LASER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                selectedTowerType === "LASER"
                  ? "bg-gradient-to-r from-amber-700 to-red-700 border-amber-300 text-white shadow-md"
                  : "bg-slate-800/90 border-slate-700 text-slate-300 hover:border-amber-500/50"
              }`}
            >
              <span>🔥 Thần Công Hỏa Pháo Đài (200 Vàng)</span>
            </button>
          </div>
        </div>

        {/* Nhánh Xuất Binh Công Thành */}
        <div className="flex flex-col gap-2 p-3.5 bg-gradient-to-br from-[#2a1418] to-[#111827] rounded-2xl border border-rose-500/35">
          <div className="text-xs font-black text-rose-300 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Swords size={14} className="text-rose-400" /> Điểm Binh Xuất Chinh Công Thành
            </span>
            <div className="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedLane(0)}
                className={`px-2.5 py-0.5 rounded font-bold border ${
                  selectedLane === 0
                    ? "bg-amber-600 border-yellow-300 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}
              >
                Thượng Đạo (Làn 1)
              </button>
              <button
                type="button"
                onClick={() => setSelectedLane(1)}
                className={`px-2.5 py-0.5 rounded font-bold border ${
                  selectedLane === 1
                    ? "bg-amber-600 border-yellow-300 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}
              >
                Hạ Đạo (Làn 2)
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSpawnCreep("SCOUT")}
              disabled={actionPoints < 100 || isIsolated || submitting}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border border-amber-300/60 disabled:opacity-40 text-xs font-bold text-white shadow-md active:scale-95 transition-all"
              title="Khinh Kỵ Tiên Phong: Xung kích nhanh, 50 HP, phá 40 HP cổng thành địch"
            >
              🐎 Phái Khinh Kỵ Tiên Phong (100 Vàng • 50 HP)
            </button>
            <button
              type="button"
              onClick={() => handleSpawnCreep("TANK")}
              disabled={actionPoints < 250 || isIsolated || submitting}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 border border-amber-300/60 disabled:opacity-40 text-xs font-bold text-white shadow-md active:scale-95 transition-all"
              title="Trọng Giáp Hổ Phù Tướng: Minh Quang Giáp 300 HP, vung đại đao phá 200 HP thành địch"
            >
              ⚔️ Phái Trọng Giáp Hổ Phù Tướng (250 Vàng • 300 HP)
            </button>
          </div>
        </div>
      </div>

      {/* Binh Pháp Kỳ Thư (3 Tuyệt Kỹ Cổ Trang) */}
      <div className="flex flex-wrap items-center justify-between w-full px-4 py-2.5 bg-gradient-to-r from-slate-900 via-[#221812] to-slate-900 rounded-2xl border border-amber-500/30 gap-3">
        <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
          📜 Binh Pháp Kỳ Thư:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGlobalFreeze}
            disabled={actionPoints < 150 || isIsolated || submitting}
            className="px-3.5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 border border-cyan-300/50 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Hàn Băng Vạn Lý: Đóng băng toàn bộ đạo quân địch trên chiến trường trong 5 giây (150 Vàng)"
          >
            <Snowflake size={14} />
            <span>Hàn Băng Vạn Lý 5s (150 Vàng)</span>
          </button>

          <button
            type="button"
            onClick={handleTowerBoost}
            disabled={isIsolated || submitting}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 border border-yellow-300/60 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Combo 3: Nổi Trống Trận Lạc Hồng tăng gấp đôi (x2) tốc độ bắn cho mọi Đài Phòng Ngự"
          >
            <Zap size={14} />
            <span>Trống Trận Cường Hóa x2 (Combo 3)</span>
          </button>

          <button
            type="button"
            onClick={handleBaseShield}
            disabled={actionPoints < 100 || isIsolated || submitting}
            className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 border border-teal-300/50 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Hộ Thành Bát Quái Trận: Dựng Kim Chung Tráo hấp thụ 200 sát thương bảo vệ Long Thành (100 Vàng)"
          >
            <Shield size={14} />
            <span>Hộ Thành Đại Trận +200 Giáp (100 Vàng)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
