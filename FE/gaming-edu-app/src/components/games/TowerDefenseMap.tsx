"use client";

import React, { useState } from "react";
import { GameAssets } from "@/components/common/GameSvgAssets";
import { soundFX } from "@/utils/gameSoundEngine";
import { Heart, Shield, Snowflake, Zap, Swords } from "lucide-react";

interface TowerDefenseMapProps {
  boardState: any;
  actionPoints: number; // Gold
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
  const [submitting, setSubmitting] = useState(false);

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
      soundFX.playCorrectCombo(3);
      await onUseSkill("TOWER_BOOST", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleBaseShield = async () => {
    if (actionPoints < 100 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playCorrectCombo(2);
      await onUseSkill("BASE_SHIELD", {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center gap-4 w-full max-w-5xl mx-auto p-4 bg-slate-950/90 rounded-3xl border border-emerald-500/30 backdrop-blur-md shadow-2xl text-white ${
        isFreezeActive ? "td-freeze-overlay" : ""
      }`}
    >
      {/* Header 2 Căn Cứ (Đội A Bên Trái 1000 HP - Đội B Bên Phải 1000 HP) & Vàng Tri Thức */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 w-full px-5 py-3 bg-slate-900/80 rounded-2xl border border-slate-800">
        {/* Căn cứ Đội A (Bên trái - 1000 HP) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-blue-400">
              <Heart size={14} className="fill-blue-500 text-blue-500" /> Căn Cứ Đội A (Trái)
            </span>
            <span className="text-blue-300 font-black">
              {teamABaseHp}/1000 HP {teamAShield > 0 ? `(+${teamAShield} Khiên)` : ""}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (teamABaseHp / 1000) * 100))}%` }}
            />
          </div>
        </div>

        {/* Vàng Tri Thức trung tâm */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <GameAssets.DefenseTurret teamColor="#10b981" />
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                Kho Vàng Tri Thức ({playerTeam === "TEAM_B" ? "Đội B" : "Đội A"})
              </div>
              <div className="text-xl font-black text-amber-400">
                💰 {actionPoints} Vàng
              </div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">
            Đúng 1 câu = +100 Vàng (+50 Vàng thưởng tốc độ &le;5s)
          </span>
        </div>

        {/* Căn cứ Đội B (Bên phải - 1000 HP) */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-rose-400">
              <Heart size={14} className="fill-rose-500 text-rose-500" /> Căn Cứ Đội B (Phải)
            </span>
            <span className="text-rose-300 font-black">
              {teamBBaseHp}/1000 HP {teamBShield > 0 ? `(+${teamBShield} Khiên)` : ""}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-orange-400 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (teamBBaseHp / 1000) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bản đồ 2 Làn Đường Song Song & Các Ô Đặt Tháp (5 hàng x 8 cột) */}
      <div className="w-full overflow-x-auto">
        <div className="grid grid-cols-8 gap-2 p-3 bg-slate-900/60 rounded-2xl border border-slate-800 w-full min-w-[540px]">
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
                  className={`relative h-14 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    isBaseA
                      ? "bg-blue-950/90 border-blue-400 shadow-md"
                      : isBaseB
                      ? "bg-rose-950/90 border-rose-400 shadow-md"
                      : isPath
                      ? "bg-amber-950/40 border-amber-700/50 cursor-default"
                      : tower
                      ? "bg-emerald-950/70 border-emerald-400 hover:scale-105"
                      : "bg-slate-800/60 border-slate-700 hover:border-emerald-400/70"
                  }`}
                  title={
                    isBaseA
                      ? "Căn cứ Đội A (Bên trái)"
                      : isBaseB
                      ? "Căn cứ Đội B (Bên phải)"
                      : isPath
                      ? `Làn đường số ${r === 1 ? 1 : 2}`
                      : tower
                      ? `Tháp ${tower.type} Lv.${tower.level} (${tower.ownerTeam || "TEAM_A"}) - Bấm để nâng cấp (80g)`
                      : `Ô Đặt Tháp (${r}, ${c}) - Bấm để xây ${selectedTowerType}`
                  }
                >
                  {isBaseA && <span className="text-[10px] font-black text-blue-300">🏰 CĂN CỨ A</span>}
                  {isBaseB && <span className="text-[10px] font-black text-rose-300">🏯 CĂN CỨ B</span>}
                  {isPath && !isBaseA && !isBaseB && creepsOnTile.length === 0 && (
                    <span className="text-[9px] text-amber-500/60 font-bold">LÀN {r === 1 ? "1" : "2"}</span>
                  )}

                  {/* Quái vật di chuyển trên làn đường */}
                  {creepsOnTile.length > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 animate-bounce bg-slate-950/60 rounded-xl">
                      <span className="text-sm">
                        {creepsOnTile[0].type === "TANK" ? "🚜" : "👾"}
                      </span>
                      <span className="text-[9px] font-black text-amber-300">
                        {creepsOnTile[0].hp} HP {creepsOnTile[0].isFrozen ? "❄️" : ""}
                      </span>
                    </div>
                  )}

                  {/* Tháp phòng thủ tại Tower Slot */}
                  {tower && (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-sm">
                        {tower.type === "LASER" || tower.type === "CANNON"
                          ? "⚡"
                          : tower.type === "FREEZE"
                          ? "❄️"
                          : "🏹"}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-300">
                        {tower.type} Lv{tower.level}
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Nhánh Phòng Thủ (Xây Tháp) & Nhánh Tấn Công (Thả Quái) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
        {/* Nhánh Phòng Thủ */}
        <div className="flex flex-col gap-2 p-3 bg-slate-900/90 rounded-2xl border border-emerald-500/30">
          <div className="text-xs font-black text-emerald-400 uppercase flex items-center justify-between">
            <span>🛡️ Nhánh Phòng Thủ (Click ô trống để xây)</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTowerType("ARCHER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                selectedTowerType === "ARCHER"
                  ? "bg-emerald-600 border-emerald-400 text-white shadow-md"
                  : "bg-slate-800 border-slate-700 text-slate-300"
              }`}
            >
              🏹 Tháp Cung (100g)
            </button>
            <button
              type="button"
              onClick={() => setSelectedTowerType("FREEZE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                selectedTowerType === "FREEZE"
                  ? "bg-cyan-600 border-cyan-400 text-white shadow-md"
                  : "bg-slate-800 border-slate-700 text-slate-300"
              }`}
            >
              ❄️ Tháp Băng -40% tốc (150g)
            </button>
            <button
              type="button"
              onClick={() => setSelectedTowerType("LASER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                selectedTowerType === "LASER"
                  ? "bg-purple-600 border-purple-400 text-white shadow-md"
                  : "bg-slate-800 border-slate-700 text-slate-300"
              }`}
            >
              ⚡ Tháp Pháo Laser xuyên giáp (200g)
            </button>
          </div>
        </div>

        {/* Nhánh Tấn Công */}
        <div className="flex flex-col gap-2 p-3 bg-slate-900/90 rounded-2xl border border-rose-500/30">
          <div className="text-xs font-black text-rose-400 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Swords size={14} /> Nhánh Tấn Công (Thả Quái sang sân địch)
            </span>
            <div className="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedLane(0)}
                className={`px-2 py-0.5 rounded ${selectedLane === 0 ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                Làn 1
              </button>
              <button
                type="button"
                onClick={() => setSelectedLane(1)}
                className={`px-2 py-0.5 rounded ${selectedLane === 1 ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-400"}`}
              >
                Làn 2
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSpawnCreep("SCOUT")}
              disabled={actionPoints < 100 || isIsolated || submitting}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-xs font-bold text-white shadow-md active:scale-95 transition-all"
              title="Quái Trinh Sát: Chạy nhanh, 50 HP, gây 20 sát thương vào căn cứ địch"
            >
              👾 Thả Quái Trinh Sát (100g • 50HP)
            </button>
            <button
              type="button"
              onClick={() => handleSpawnCreep("TANK")}
              disabled={actionPoints < 250 || isIsolated || submitting}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-bold text-white shadow-md active:scale-95 transition-all"
              title="Chiến Xa Bọc Thép: Đi chậm, máu trâu 300 HP, gây 100 sát thương vào căn cứ địch"
            >
              🚜 Thả Chiến Xa Bọc Thép (250g • 300HP)
            </button>
          </div>
        </div>
      </div>

      {/* Hệ thống Kỹ năng Chiến thuật */}
      <div className="flex flex-wrap items-center justify-between w-full px-4 py-3 bg-slate-900/90 rounded-2xl border border-slate-800 gap-3">
        <span className="text-xs font-bold text-slate-300">Kỹ năng Chiến thuật:</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGlobalFreeze}
            disabled={actionPoints < 150 || isIsolated || submitting}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Đóng băng toàn bộ quái vật của đối phương đang di chuyển trên đường trong 5 giây (150g)"
          >
            <Snowflake size={14} />
            <span>Đóng Băng Toàn Cầu 5s (150g)</span>
          </button>

          <button
            type="button"
            onClick={handleTowerBoost}
            disabled={isIsolated || submitting}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Combo 3: Tăng gấp đôi (x2) tốc độ bắn cho toàn bộ tháp pháo của đội trong 8 giây"
          >
            <Zap size={14} />
            <span>Cường Hóa Tháp x2 (Combo 3)</span>
          </button>

          <button
            type="button"
            onClick={handleBaseShield}
            disabled={actionPoints < 100 || isIsolated || submitting}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Tạo lớp giáp ảo hấp thụ 200 sát thương trước khi trừ vào máu thật của Căn cứ chính (100g)"
          >
            <Shield size={14} />
            <span>Khiên Căn Cứ +200 Giáp (100g)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
