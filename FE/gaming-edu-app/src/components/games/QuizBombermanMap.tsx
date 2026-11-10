"use client";

import React, { useState, useEffect } from "react";
import { GameAssets } from "@/components/common/GameSvgAssets";
import { soundFX } from "@/utils/gameSoundEngine";
import {
  Bomb,
  Heart,
  Shield,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Flame,
  Footprints,
  Sparkles,
} from "lucide-react";

interface BombermanPlayer {
  playerId: string;
  nickname: string;
  teamSide?: string;
  r: number;
  c: number;
  hp: number;
  moveSteps?: number;
  bombRange: number;
  shieldActive: boolean;
  isEliminated: boolean;
  bricksDestroyed: number;
  hitsScored?: number;
}

interface ActiveBombData {
  id: string;
  r: number;
  c: number;
  timerTicks: number;
  range: number;
  ownerPlayerId: string;
  ownerNickname: string;
}

interface QuizBombermanMapProps {
  boardState: any;
  actionPoints: number;
  playerTeam: string;
  isIsolated: boolean;
  onPerformAction: (actionType: string, payload: any) => Promise<void>;
  onUseSkill: (skillName: string, payload: any) => Promise<void>;
}

export default function QuizBombermanMap({
  boardState,
  actionPoints,
  playerTeam,
  isIsolated,
  onPerformAction,
  onUseSkill,
}: QuizBombermanMapProps) {
  const [submitting, setSubmitting] = useState(false);
  const [lastFlames, setLastFlames] = useState<{ r: number; c: number }[]>([]);
  const [lastDir, setLastDir] = useState<"UP" | "DOWN" | "LEFT" | "RIGHT">("RIGHT");

  const size = boardState?.size || 15;
  const grid: string[][] = boardState?.grid || [];
  const bombs: ActiveBombData[] = boardState?.bombs || [];
  const players: BombermanPlayer[] = boardState?.players || [];
  const myPlayer =
    players.find((p) => p.teamSide === playerTeam && !p.isEliminated) ||
    players.find((p) => !p.isEliminated) ||
    players[0];

  const availableSteps = myPlayer?.moveSteps ?? 0;

  const handleMove = async (dir: "UP" | "DOWN" | "LEFT" | "RIGHT") => {
    if (isIsolated || submitting || myPlayer?.isEliminated || availableSteps < 1) return;
    setLastDir(dir);
    try {
      setSubmitting(true);
      await onPerformAction("MOVE_STEP", { direction: dir });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlantBomb = async () => {
    if (actionPoints < 1 || isIsolated || submitting || myPlayer?.isEliminated) return;
    try {
      setSubmitting(true);
      soundFX.playHexClaim();
      const pr = myPlayer?.r ?? 1;
      const pc = myPlayer?.c ?? 1;
      const range = myPlayer?.bombRange ?? 2;
      await onPerformAction("PLANT_BOMB", {});
      // Bom hẹn giờ phát nổ sau 3.2 giây theo hình chữ thập (+) bán kính 2-4 ô
      setTimeout(async () => {
        soundFX.playBigExplosion();
        const flames: { r: number; c: number }[] = [{ r: pr, c: pc }];
        for (let step = 1; step <= range; step++) {
          flames.push({ r: pr - step, c: pc });
          flames.push({ r: pr + step, c: pc });
          flames.push({ r: pr, c: pc - step });
          flames.push({ r: pr, c: pc + step });
        }
        setLastFlames(flames);
        try {
          await onPerformAction("DETONATE_BOMB", { r: pr, c: pc, range });
        } catch {}
        setTimeout(() => setLastFlames([]), 700);
      }, 3200);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLongFireBomb = async () => {
    if (isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playCorrectCombo(3);
      await onUseSkill("LONG_FIRE_BOMB", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleShield = async () => {
    if (actionPoints < 1 || isIsolated || submitting || myPlayer?.shieldActive) return;
    try {
      setSubmitting(true);
      soundFX.playTowerLaser();
      await onUseSkill("SHIELD", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleKickBomb = async () => {
    if (actionPoints < 1 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playBigExplosion();
      await onUseSkill("KICK_BOMB", { direction: lastDir });
    } finally {
      setSubmitting(false);
    }
  };

  // Lắng nghe bàn phím (WASD / Mũi tên / Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "KeyW"].includes(e.code)) handleMove("UP");
      else if (["ArrowDown", "KeyS"].includes(e.code)) handleMove("DOWN");
      else if (["ArrowLeft", "KeyA"].includes(e.code)) handleMove("LEFT");
      else if (["ArrowRight", "KeyD"].includes(e.code)) handleMove("RIGHT");
      else if (["Space"].includes(e.code)) handlePlantBomb();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submitting, actionPoints, isIsolated, myPlayer]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-5xl mx-auto p-4 bg-slate-900/95 rounded-3xl border border-amber-500/30 backdrop-blur-md shadow-2xl text-white">
      {/* Header trạng thái Bomber & 5 Tim (HP) */}
      <div className="flex items-center justify-between w-full px-4 py-3 bg-slate-800/85 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-2xl border border-amber-400/30">
            <GameAssets.TickingBomb isLongFire={(myPlayer?.bombRange ?? 2) > 2} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <Bomb size={14} className="text-amber-400" /> Đặt Bom Mê Cung ({size}×{size}) • Bán kính nổ: {myPlayer?.bombRange ?? 2} ô
            </div>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Heart
                  key={i}
                  size={17}
                  className={`${
                    i < (myPlayer?.hp ?? 5)
                      ? "fill-rose-500 text-rose-500"
                      : "fill-slate-700 text-slate-700"
                  }`}
                />
              ))}
              <span className="ml-1.5 text-xs font-bold text-rose-300">
                {myPlayer?.hp ?? 5}/5 Tim
              </span>
              {myPlayer?.shieldActive && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40 text-[10px] font-bold flex items-center gap-1">
                  <Shield size={10} /> Khiên Chống Nổ
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-semibold flex items-center justify-end gap-1">
              <Footprints size={12} className="text-cyan-400" /> Bước Di Chuyển
            </div>
            <div className="text-xl font-black text-cyan-400">
              {myPlayer?.moveSteps ?? actionPoints * 3} Bước
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 font-semibold">Bom Hẹn Giờ</div>
            <div className="text-xl font-black text-amber-400">{actionPoints} Quả</div>
          </div>
        </div>
      </div>

      {/* Sàn đấu Mê Cung 15x15 với Tile đồ họa SVG */}
      <div className="relative p-2 sm:p-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner overflow-x-auto max-w-full">
        <div
          className="grid gap-0.5"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(26px, 34px))`,
            gridTemplateRows: `repeat(${size}, minmax(26px, 34px))`,
          }}
        >
          {Array.from({ length: size }).map((_, r) =>
            Array.from({ length: size }).map((_, c) => {
              const cellType = grid[r]?.[c] || ".";
              const bomb = bombs.find((b) => b.r === r && b.c === c);
              const isFlame = lastFlames.some((f) => f.r === r && f.c === c);
              const playersHere = players.filter((p) => p.r === r && p.c === c && !p.isEliminated);

              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative flex items-center justify-center rounded text-[10px] font-bold transition-all select-none overflow-hidden ${
                    isFlame
                      ? "bomb-cross-flame border border-orange-300 z-30"
                      : cellType === "W"
                      ? "bg-slate-800"
                      : cellType === "B"
                      ? "bg-amber-950/60"
                      : "bg-slate-900/50 border border-slate-800/70"
                  }`}
                  style={{ width: "100%", aspectRatio: "1/1" }}
                >
                  {/* Tường Sắt cố định (SVG) */}
                  {cellType === "W" && <GameAssets.MazeWallTile type="W" />}

                  {/* Tường Gạch Nung phá được +50đ (SVG) */}
                  {cellType === "B" && <GameAssets.MazeWallTile type="B" />}

                  {/* Quả bom hẹn giờ */}
                  {bomb && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 scale-75">
                      <GameAssets.TickingBomb isLongFire={(bomb.range ?? 2) > 2} />
                    </div>
                  )}

                  {/* Nhân vật Bomberman bằng Sprite SVG */}
                  {playersHere.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <GameAssets.BomberCharacter
                        color={
                          playersHere[0].playerId === myPlayer?.playerId
                            ? "#10b981"
                            : "#e11d48"
                        }
                        label={playersHere[0].nickname.substring(0, 1).toUpperCase()}
                        hasShield={playersHere[0].shieldActive}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bộ điều khiển di chuyển D-Pad, Đặt Bom & 3 Kỹ năng Chiến thuật */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full p-4 bg-slate-800/75 rounded-2xl border border-slate-700">
        {/* D-Pad di chuyển */}
        <div className="flex flex-col items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => handleMove("UP")}
            disabled={submitting || isIsolated || availableSteps < 1}
            className="w-11 h-11 bg-slate-700 hover:bg-slate-600 active:bg-cyan-600 disabled:opacity-40 rounded-xl flex items-center justify-center shadow-md border border-slate-600 active:scale-95 transition-all"
          >
            <ArrowUp size={18} />
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleMove("LEFT")}
              disabled={submitting || isIsolated || availableSteps < 1}
              className="w-11 h-11 bg-slate-700 hover:bg-slate-600 active:bg-cyan-600 disabled:opacity-40 rounded-xl flex items-center justify-center shadow-md border border-slate-600 active:scale-95 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => handleMove("DOWN")}
              disabled={submitting || isIsolated || availableSteps < 1}
              className="w-11 h-11 bg-slate-700 hover:bg-slate-600 active:bg-cyan-600 disabled:opacity-40 rounded-xl flex items-center justify-center shadow-md border border-slate-600 active:scale-95 transition-all"
            >
              <ArrowDown size={18} />
            </button>
            <button
              type="button"
              onClick={() => handleMove("RIGHT")}
              disabled={submitting || isIsolated || availableSteps < 1}
              className="w-11 h-11 bg-slate-700 hover:bg-slate-600 active:bg-cyan-600 disabled:opacity-40 rounded-xl flex items-center justify-center shadow-md border border-slate-600 active:scale-95 transition-all"
            >
              <ArrowRight size={18} />
            </button>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 text-center">
            {availableSteps < 1
              ? "Hết bước di chuyển! Trả lời đúng câu hỏi để nhận +3 Bước & +1 Bom"
              : "Đúng 1 câu = +3 Bước Di Chuyển + 1 Quả Bom • Phá gạch +50đ • Trúng địch -1 Tim & cướp 200đ"}
          </span>
        </div>

        {/* Nút Đặt Bom & 3 Kỹ năng Chiến thuật */}
        <div className="flex flex-col items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={handlePlantBomb}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="w-full py-2.5 px-5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 disabled:opacity-40 rounded-2xl font-black text-xs shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Bomb size={18} />
            <span>ĐẶT BOM NỔ CHỮ THẬP (-1 Bom) [Space]</span>
          </button>

          <div className="grid grid-cols-3 gap-2 w-full">
            <button
              type="button"
              onClick={handleLongFireBomb}
              disabled={isIsolated || submitting}
              className="py-2 px-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
              title="Bom Lửa Dài (Combo 3): Tăng phạm vi tia lửa nổ chữ thập từ 2 ô lên 4 ô"
            >
              <Sparkles size={13} />
              <span>Bom Lửa Dài (4 ô)</span>
            </button>

            <button
              type="button"
              onClick={handleKickBomb}
              disabled={actionPoints < 1 || isIsolated || submitting}
              className="py-2 px-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
              title="Đá Bom: Đá văng quả bom đang đặt ở ô trước mặt trượt thẳng về phía đối phương (tối đa 4 ô)"
            >
              <Flame size={13} />
              <span>Đá Bom (4 ô)</span>
            </button>

            <button
              type="button"
              onClick={handleShield}
              disabled={actionPoints < 1 || isIsolated || submitting || myPlayer?.shieldActive}
              className="py-2 px-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
              title="Khiên Chống Nổ: Tạo vòng tròn bảo vệ nhân vật không bị mất máu trước 1 vụ nổ bom"
            >
              <Shield size={13} />
              <span>Khiên Chống Nổ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
