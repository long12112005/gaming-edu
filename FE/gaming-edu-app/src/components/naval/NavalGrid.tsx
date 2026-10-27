"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ShipCell, NavalShipModel, ShotHistoryItem } from "@/hooks/useNavalWarHub";
import { NAVAL_ASSETS } from "@/lib/navalAssets";
import { Shield, Crosshair, Radio, Skull } from "lucide-react";

interface NavalGridProps {
  title: string;
  isEnemy: boolean;
  mapSize: number;
  myShips?: NavalShipModel[];
  enemyShots?: ShotHistoryItem[];
  shotsEarned?: number;
  radarScanWave?: { centerRow: number; centerCol: number; detected: boolean } | null;
  skillMode?: "NORMAL" | "RADAR" | "SHIELD" | "PRECISION";
  isSpectator?: boolean;
  teamTheme?: "blue" | "red";
  onFire?: (r: number, c: number, isPrecision: boolean) => void;
  onUseRadar?: (r: number, c: number) => void;
  onApplyShield?: (r: number, c: number) => void;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const NavalGrid: React.FC<NavalGridProps> = ({
  title,
  isEnemy,
  mapSize,
  myShips = [],
  enemyShots = [],
  shotsEarned = 0,
  radarScanWave,
  skillMode = "NORMAL",
  isSpectator = false,
  teamTheme = "blue",
  onFire,
  onUseRadar,
  onApplyShield,
}) => {
  const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(null);
  const [recentImpact, setRecentImpact] = useState<{ r: number; c: number; result: string } | null>(null);

  // Kích hoạt hiệu ứng diễn hoạt nổ đạn / tóe nước khi có lượt bắn mới cập nhật
  React.useEffect(() => {
    if ((isEnemy || isSpectator) && enemyShots && enemyShots.length > 0) {
      const latest = enemyShots[enemyShots.length - 1];
      setRecentImpact({ r: latest.targetRow, c: latest.targetCol, result: latest.result });
      const timer = setTimeout(() => setRecentImpact(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [isEnemy, isSpectator, enemyShots]);

  // Map ship cells for friendly fleet or spectator
  const myCellMap = new Map<string, { ship: NavalShipModel; cell: ShipCell }>();
  if (!isEnemy || isSpectator) {
    for (const ship of myShips) {
      for (const cell of ship.coordinates) {
        myCellMap.set(`${cell.r},${cell.c}`, { ship, cell });
      }
    }
  }

  // Map shot records for enemy waters or spectator
  const enemyShotMap = new Map<string, ShotHistoryItem>();
  if (isEnemy || isSpectator) {
    for (const shot of enemyShots) {
      enemyShotMap.set(`${shot.targetRow},${shot.targetCol}`, shot);
    }
  }

  const handleCellClick = (r: number, c: number) => {
    if (isSpectator) return;
    if (isEnemy) {
      if (skillMode === "RADAR") {
        onUseRadar?.(r, c);
        return;
      }
      if (shotsEarned > 0 && !enemyShotMap.has(`${r},${c}`)) {
        const isPrecision = skillMode === "PRECISION";
        onFire?.(r, c, isPrecision);
      }
    } else {
      if (skillMode === "SHIELD") {
        onApplyShield?.(r, c);
      }
    }
  };

  const isRadarHovered = (r: number, c: number) => {
    if (isSpectator || !isEnemy || skillMode !== "RADAR" || !hoverCell) return false;
    return Math.abs(hoverCell.r - r) <= 1 && Math.abs(hoverCell.c - c) <= 1;
  };

  const isRadarWaveActive = (r: number, c: number) => {
    if (isSpectator || !isEnemy || !radarScanWave) return false;
    return Math.abs(radarScanWave.centerRow - r) <= 1 && Math.abs(radarScanWave.centerCol - c) <= 1;
  };

  return (
    <div className={`flex flex-col items-center bg-slate-900/85 border ${
      teamTheme === "red" ? "border-rose-700/60" : "border-cyan-700/60"
    } rounded-2xl p-4 shadow-2xl backdrop-blur-md relative overflow-hidden`}>
      {/* Header bar */}
      <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          {isSpectator ? (
            <Radio className={`w-5 h-5 ${teamTheme === "red" ? "text-rose-400" : "text-cyan-400"} animate-pulse`} />
          ) : isEnemy ? (
            <Crosshair className="w-5 h-5 text-red-400 animate-pulse" />
          ) : (
            <Shield className="w-5 h-5 text-cyan-400" />
          )}
          <span className="font-bold text-sm tracking-wide text-white uppercase">{title}</span>
        </div>
        <div className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
          {mapSize}×{mapSize}
        </div>
      </div>

      {/* Grid container */}
      <div className="relative select-none">
        {/* Column Headers (A, B, C...) */}
        <div className="flex pl-6 pb-1">
          {Array.from({ length: mapSize }).map((_, c) => (
            <div
              key={c}
              className="w-7 sm:w-8 text-center text-[10px] font-mono font-bold text-slate-400"
            >
              {LETTERS[c] || c + 1}
            </div>
          ))}
        </div>

        {/* Rows with Row Headers (1, 2, 3...) */}
        {Array.from({ length: mapSize }).map((_, r) => (
          <div key={r} className="flex items-center">
            {/* Row Number */}
            <div className="w-6 text-right pr-2 text-[10px] font-mono font-bold text-slate-400">
              {r + 1}
            </div>

            {/* Cells */}
            <div className="flex gap-0.5">
              {Array.from({ length: mapSize }).map((_, c) => {
                const key = `${r},${c}`;
                const friendlyData = myCellMap.get(key);
                const shotData = enemyShotMap.get(key);
                const inRadarHover = isRadarHovered(r, c);
                const inRadarWave = isRadarWaveActive(r, c);

                let cellBg = "bg-slate-950/75 border-slate-800/80 hover:border-cyan-500/60";
                let content: React.ReactNode = null;

                if (isSpectator) {
                  // CHẾ ĐỘ QUAN SÁT (HOST / TRỌNG TÀI): Thấy toàn bộ tàu và phát bắn thời gian thực của cả hai bên
                  if (shotData) {
                    if (shotData.result === "BLOCKED_BY_SHIELD") {
                      cellBg = "bg-amber-950/80 border-amber-500 shadow-[inset_0_0_10px_#f59e0b]";
                      content = (
                        <img
                          src={NAVAL_ASSETS.animations.shieldGlow}
                          alt="Shield Blocked"
                          className="w-5 h-5 object-contain"
                        />
                      );
                    } else if (shotData.result === "SUNK") {
                      cellBg = "bg-red-950 border-red-600 shadow-[inset_0_0_12px_#dc2626]";
                      content = (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={NAVAL_ASSETS.animations.scorch}
                            alt="Sunk"
                            className="absolute inset-0 w-full h-full object-contain opacity-70"
                          />
                          <Skull className="w-4 h-4 text-red-400 relative z-10 animate-pulse" />
                        </div>
                      );
                    } else if (shotData.result === "HIT") {
                      cellBg = "bg-orange-950 border-orange-500 shadow-[inset_0_0_10px_#ea580c]";
                      content = (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {friendlyData && NAVAL_ASSETS.ships[friendlyData.ship.shipType] && (
                            <img
                              src={NAVAL_ASSETS.ships[friendlyData.ship.shipType]}
                              alt="Ship"
                              className="w-4 h-4 object-contain opacity-30 grayscale"
                            />
                          )}
                          <img
                            src={NAVAL_ASSETS.animations.hitFlame}
                            alt="Hit"
                            className="absolute inset-0 w-full h-full object-contain animate-flame-flicker pointer-events-none"
                          />
                        </div>
                      );
                    } else {
                      // MISS
                      cellBg = "bg-blue-950/60 border-blue-800/80";
                      content = (
                        <img
                          src={NAVAL_ASSETS.animations.waterSplash}
                          alt="Splash"
                          className="w-4 h-4 object-contain opacity-80 animate-water-ripple"
                        />
                      );
                    }
                  } else if (friendlyData) {
                    // Tàu của đội còn nguyên vẹn
                    const { ship } = friendlyData;
                    const shipImg = NAVAL_ASSETS.ships[ship.shipType];
                    const isVertical = ship.orientation === "VERTICAL" || (ship.coordinates?.length > 1 && ship.coordinates[0].c === ship.coordinates[1].c);
                    const rotClass = isVertical ? "rotate-90" : "";

                    cellBg = teamTheme === "red"
                      ? "bg-rose-950/70 border-rose-500/80 shadow-[inset_0_0_8px_#f43f5e]"
                      : "bg-blue-950/70 border-blue-500/80 shadow-[inset_0_0_8px_#3b82f6]";

                    content = shipImg ? (
                      <img
                        src={shipImg}
                        alt="Ship"
                        className={`w-5 h-5 object-contain ${rotClass}`}
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-white">{ship.shipType}</span>
                    );
                  }
                } else if (!isEnemy) {
                  // ĐỘI MÌNH: Hiển thị chiến hạm và trạng thái hư hại / lá chắn
                  if (friendlyData) {
                    const { cell, ship } = friendlyData;
                    const shipImg = NAVAL_ASSETS.ships[ship.shipType];

                    const isVertical = ship.orientation === "VERTICAL" || (ship.coordinates?.length > 1 && ship.coordinates[0].c === ship.coordinates[1].c);
                    const rotClass = isVertical ? "rotate-90" : "";

                    if (cell.hit) {
                      cellBg = "bg-red-950 border-red-500/90 shadow-[inset_0_0_10px_#ef4444]";
                      content = (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {shipImg && (
                            <img
                              src={shipImg}
                              alt="Ship"
                              className={`w-4 h-4 object-contain opacity-40 grayscale ${rotClass}`}
                            />
                          )}
                          <img
                            src={NAVAL_ASSETS.animations.hitFlame}
                            alt="Fire"
                            className="absolute inset-0 w-full h-full object-contain animate-flame-flicker pointer-events-none"
                          />
                        </div>
                      );
                    } else if (cell.shielded) {
                      cellBg = "bg-cyan-950 border-cyan-400 shadow-[0_0_14px_rgba(56,189,248,0.7)] animate-shield-pulse";
                      content = (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {/* Vòng tròn lá chắn bọc ngoài với CSS Animation mượt mà */}
                          <div className="absolute inset-[-5px] rounded-full border-2 border-cyan-400/90 shadow-[0_0_12px_rgba(56,189,248,0.8)] animate-shield-circle-aura pointer-events-none z-20" />
                          <div className="absolute inset-[-2px] rounded-full border border-dashed border-cyan-300/60 animate-shield-ring-spin pointer-events-none z-15" />
                          {shipImg && (
                            <img
                              src={shipImg}
                              alt="Ship"
                              className={`w-4 h-4 object-contain opacity-85 ${rotClass}`}
                            />
                          )}
                          <img
                            src={NAVAL_ASSETS.animations.shieldGlow}
                            alt="Shield"
                            className="absolute inset-0 w-full h-full object-contain animate-pulse pointer-events-none z-10"
                          />
                        </div>
                      );
                    } else {
                      // Tàu còn nguyên vẹn
                      cellBg = ship.isSunk
                        ? "bg-slate-800 border-slate-600 opacity-50"
                        : "bg-indigo-950/90 border-indigo-400/90 shadow-[inset_0_0_6px_#6366f1]";
                      content = shipImg ? (
                        <img
                          src={shipImg}
                          alt="Ship"
                          className={`w-5 h-5 object-contain transition-transform hover:scale-110 ${rotClass}`}
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-indigo-300">{ship.shipType}</span>
                      );
                    }
                  }
                } else {
                  // ĐỐI PHƯƠNG: Hiển thị các ô đã bắn hoặc hiệu ứng quét sóng
                  if (shotData) {
                    if (shotData.result === "BLOCKED_BY_SHIELD") {
                      cellBg = "bg-amber-950 border-amber-500 shadow-[inset_0_0_10px_#f59e0b]";
                      content = (
                        <img
                          src={NAVAL_ASSETS.animations.shieldGlow}
                          alt="Shield Blocked"
                          className="w-5 h-5 object-contain"
                        />
                      );
                    } else if (shotData.result === "SUNK") {
                      cellBg = "bg-red-950 border-red-600 shadow-[inset_0_0_12px_#dc2626]";
                      content = (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={NAVAL_ASSETS.animations.scorch}
                            alt="Sunk"
                            className="absolute inset-0 w-full h-full object-contain opacity-70"
                          />
                          <Skull className="w-4 h-4 text-red-400 relative z-10 animate-pulse" />
                        </div>
                      );
                    } else if (shotData.result === "HIT") {
                      cellBg = "bg-orange-950 border-orange-500 shadow-[inset_0_0_10px_#ea580c]";
                      content = (
                        <img
                          src={NAVAL_ASSETS.animations.hitFlame}
                          alt="Hit"
                          className="w-5 h-5 object-contain animate-flame-flicker"
                        />
                      );
                    } else {
                      // MISS - Hiệu ứng nước bắn tung tóe (White puff splash)
                      cellBg = "bg-blue-950/60 border-blue-800/80";
                      content = (
                        <img
                          src={NAVAL_ASSETS.animations.waterSplash}
                          alt="Splash"
                          className="w-4 h-4 object-contain opacity-80 animate-water-ripple"
                        />
                      );
                    }
                  } else if (inRadarHover) {
                    cellBg = "bg-cyan-900/40 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]";
                  } else if (inRadarWave) {
                    cellBg = radarScanWave?.detected
                      ? "bg-red-950/80 border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.8)]"
                      : "bg-cyan-950/70 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]";
                    content = (
                      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                        {/* Vòng quét sóng Radar mở rộng bằng CSS Animation */}
                        <div
                          className={`absolute inset-0 rounded-full border-2 pointer-events-none animate-radar-sweep-wave ${
                            radarScanWave?.detected ? "border-red-400 bg-red-500/20" : "border-cyan-400 bg-cyan-500/20"
                          }`}
                        />
                        <img
                          src={NAVAL_ASSETS.animations.radarWave}
                          alt="Radar"
                          className={`w-5 h-5 object-contain animate-radar-grid-sweep ${
                            radarScanWave?.detected ? "filter drop-shadow-[0_0_8px_#ef4444]" : ""
                          }`}
                        />
                        {radarScanWave?.detected && (
                          <span className="absolute text-[8px] font-black text-red-300 uppercase tracking-tighter z-10 bg-red-950/90 px-0.5 rounded border border-red-500/60">
                            CÓ TÀU
                          </span>
                        )}
                      </div>
                    );
                  }
                }

                // Điều kiện click
                const canFire = !isSpectator && isEnemy && shotsEarned > 0 && !shotData;
                const canShield = !isSpectator && !isEnemy && skillMode === "SHIELD" && friendlyData && !friendlyData.cell.hit;
                const isClickDisabled = isSpectator || (isEnemy && (!canFire && skillMode !== "RADAR")) || (!isEnemy && !canShield);

                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCellClick(r, c)}
                    onMouseEnter={() => setHoverCell({ r, c })}
                    onMouseLeave={() => setHoverCell(null)}
                    disabled={isClickDisabled}
                    className={`w-7 h-7 sm:w-8 sm:h-8 border flex items-center justify-center transition-all duration-150 rounded-sm relative ${cellBg} ${
                      canFire || canShield ? "cursor-crosshair hover:scale-105 hover:z-10" : isSpectator ? "cursor-default" : ""
                    }`}
                  >
                    {content}

                    {/* Hiệu ứng nổ pháo / tóe nước bộc phát khi đạn vừa chạm đích */}
                    {recentImpact?.r === r && recentImpact?.c === c && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                        <img
                          src={
                            recentImpact.result === "MISS"
                              ? NAVAL_ASSETS.animations.waterSplash
                              : recentImpact.result === "BLOCKED_BY_SHIELD"
                              ? NAVAL_ASSETS.animations.shieldGlow
                              : NAVAL_ASSETS.animations.hitExplosion
                          }
                          alt="Impact Burst"
                          className="w-8 h-8 object-contain animate-hit-explosion"
                        />
                      </div>
                    )}

                    {/* Hiệu ứng hồng tâm ngắm bắn từ asset crosshair-029.png */}
                    {isEnemy && canFire && hoverCell?.r === r && hoverCell?.c === c && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <img
                          src={NAVAL_ASSETS.animations.crosshair}
                          alt="Reticle"
                          className="w-7 h-7 object-contain animate-spin"
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Grid Legend & Status Footer */}
      <div className="w-full flex items-center justify-around pt-3 mt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
        {isEnemy ? (
          <>
            <div className="flex items-center gap-1.5">
              <img src={NAVAL_ASSETS.animations.waterSplash} alt="Miss" className="w-3.5 h-3.5 object-contain" /> Bắn trượt
            </div>
            <div className="flex items-center gap-1.5">
              <img src={NAVAL_ASSETS.animations.hitFlame} alt="Hit" className="w-3.5 h-3.5 object-contain" /> Bắn trúng
            </div>
            <div className="flex items-center gap-1.5">
              <Skull className="w-3.5 h-3.5 text-red-500" /> Đánh chìm
            </div>
            <div className="flex items-center gap-1.5">
              <img src={NAVAL_ASSETS.animations.shieldGlow} alt="Shield" className="w-3.5 h-3.5 object-contain" /> Chặn đạn
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <img src={NAVAL_ASSETS.ships[1]} alt="Ship" className="w-3.5 h-3.5 object-contain" /> Tàu chiến
            </div>
            <div className="flex items-center gap-1.5">
              <img src={NAVAL_ASSETS.animations.shieldGlow} alt="Shield" className="w-3.5 h-3.5 object-contain" /> Lá chắn bọc
            </div>
            <div className="flex items-center gap-1.5">
              <img src={NAVAL_ASSETS.animations.hitFlame} alt="Fire" className="w-3.5 h-3.5 object-contain" /> Bị trúng đạn
            </div>
          </>
        )}
      </div>
    </div>
  );
};
