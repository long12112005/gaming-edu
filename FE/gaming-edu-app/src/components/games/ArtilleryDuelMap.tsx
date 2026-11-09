"use client";

import React, { useState } from "react";
import { GameAssets } from "@/components/common/GameSvgAssets";
import { soundFX } from "@/utils/gameSoundEngine";
import { Crosshair, Shield, Wind, Zap, Flame, Target, Bomb, Mountain } from "lucide-react";

interface ArtilleryDuelMapProps {
  boardState: any;
  actionPoints: number;
  playerTeam: string;
  isIsolated: boolean;
  onPerformAction: (actionType: string, payload: any) => Promise<void>;
  onUseSkill: (skillName: string, payload: any) => Promise<void>;
}

export default function ArtilleryDuelMap({
  boardState,
  actionPoints,
  playerTeam,
  isIsolated,
  onPerformAction,
  onUseSkill,
}: ArtilleryDuelMapProps) {
  const [angle, setAngle] = useState<number>(45);
  const [power, setPower] = useState<number>(78);
  const [submitting, setSubmitting] = useState(false);

  const hpA = boardState?.fortressHpA ?? 1000;
  const hpB = boardState?.fortressHpB ?? 1000;
  const wind = boardState?.currentWind ?? 0;
  const mountainHeight = boardState?.mountainHeight ?? 28;
  const shieldA = boardState?.shieldActiveA ?? false;
  const shieldB = boardState?.shieldActiveB ?? false;
  const piercingA = boardState?.piercingReadyA ?? false;
  const piercingB = boardState?.piercingReadyB ?? false;
  const history: string[] = boardState?.shotHistory || [];

  const isTeamA = playerTeam === "TEAM_A";
  const myShield = isTeamA ? shieldA : shieldB;
  const myPiercing = isTeamA ? piercingA : piercingB;

  // Công thức vật lý Parabol chuẩn Server (trục X = 0 -> 100)
  const trajectoryInfo = React.useMemo(() => {
    const startX = isTeamA ? (boardState?.basePosA ?? 12) : (boardState?.basePosB ?? 88);
    const targetX = isTeamA ? (boardState?.basePosB ?? 88) : (boardState?.basePosA ?? 12);
    const direction = isTeamA ? 1 : -1;
    const rad = (angle * Math.PI) / 180.0;
    const range = power * 0.96 * Math.sin(2 * rad) + wind * 1.5 * direction;
    const maxHeight = power * 0.65 * Math.pow(Math.sin(rad), 2);
    const hitMountain = !myPiercing && maxHeight < mountainHeight && range > 33;
    const impactX = hitMountain ? 50 : Math.round((startX + range * direction) * 10) / 10;
    return { startX, targetX, impactX, maxHeight: Math.round(maxHeight), hitMountain };
  }, [angle, power, wind, isTeamA, myPiercing, mountainHeight, boardState?.basePosA, boardState?.basePosB]);

  const handleFire = async () => {
    if (actionPoints < 1 || isIsolated || submitting || hpA <= 0 || hpB <= 0) return;
    try {
      setSubmitting(true);
      soundFX.playBigExplosion();
      await onPerformAction("FIRE_CANNON", {
        angle: Number(angle),
        power: Number(power),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClusterShell = async () => {
    if (isIsolated || submitting || hpA <= 0 || hpB <= 0) return;
    try {
      setSubmitting(true);
      soundFX.playBigExplosion();
      await onUseSkill("CLUSTER_SHELL", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handlePiercingShell = async () => {
    if (actionPoints < 1 || isIsolated || submitting || myPiercing) return;
    try {
      setSubmitting(true);
      soundFX.playTowerLaser();
      await onUseSkill("PIERCING_SHELL", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleDomeShield = async () => {
    if (actionPoints < 1 || isIsolated || submitting || myShield) return;
    try {
      setSubmitting(true);
      soundFX.playTowerLaser();
      await onUseSkill("DOME_SHIELD", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleControlWind = async () => {
    if (actionPoints < 1 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playHexClaim();
      await onUseSkill("WIND_CONTROLLER", {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-5xl mx-auto p-4 bg-slate-900/95 rounded-3xl border border-blue-500/30 backdrop-blur-md shadow-2xl text-white">
      {/* Header thanh máu 2 Pháo Đài (1000 HP) & Sức Gió (-10 đến +10) */}
      <div className="grid grid-cols-3 items-center w-full px-4 py-3 bg-slate-800/80 rounded-2xl border border-slate-700">
        {/* Pháo Đài Đội A (X = 12) */}
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-xs font-bold text-blue-400">
              Pháo Đài A (X=12) {isTeamA && "• Bạn"}
            </span>
          </div>
          <div className="w-full max-w-[160px] h-3 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
            <div
              className="h-full bg-blue-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, (hpA / 1000) * 100))}%` }}
            />
          </div>
          <span className="text-sm font-black text-blue-300">{hpA} / 1000 HP</span>
        </div>

        {/* Trọng tâm: Chỉ số gió (-10 đến +10) */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold uppercase tracking-wider">
            <Wind size={14} className="animate-pulse" /> Sức Gió (-10 đến +10)
          </div>
          <div className="text-lg font-black text-slate-100 flex items-center gap-1">
            {wind > 0
              ? `➔ +${wind} (Gió Xuôi Đông)`
              : wind < 0
              ? `⬅ ${wind} (Gió Ngược Tây)`
              : "0 (Lặng Gió)"}
          </div>
          <div className="text-[11px] text-slate-400">
            Đạn Pháo Tri Thức: <b className="text-emerald-400">{actionPoints} Viên</b>
            {myPiercing && <span className="ml-2 text-amber-300 font-bold">⚡ Đạn Xuyên Núi Sẵn Sàng</span>}
          </div>
        </div>

        {/* Pháo Đài Đội B (X = 88) */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-rose-400">
              Pháo Đài B (X=88) {!isTeamA && "• Bạn"}
            </span>
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
          </div>
          <div className="w-full max-w-[160px] h-3 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
            <div
              className="h-full bg-rose-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, (hpB / 1000) * 100))}%` }}
            />
          </div>
          <span className="text-sm font-black text-rose-300">{hpB} / 1000 HP</span>
        </div>
      </div>

      {/* Sàn đấu Pháo Đài Parabol 2D (Tọa độ X từ 0 đến 100) */}
      <div className="relative w-full h-64 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/60 rounded-2xl border border-slate-800 overflow-hidden shadow-inner flex items-end justify-between px-10 pb-4">
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

        {/* Căn cứ & Khẩu pháo Đội A (X = 12) */}
        <div className="relative flex flex-col items-center z-10">
          {shieldA && (
            <div className="absolute -top-12 -inset-x-4 h-32 artillery-dome-shield pointer-events-none z-10" />
          )}
          <div className="scale-125 mb-1">
            <GameAssets.ArtilleryCannon angle={isTeamA ? angle : 45} color="#3b82f6" />
          </div>
          <div className="w-28 h-8 bg-blue-900/70 border border-blue-500/50 rounded-t-lg flex items-center justify-center text-xs font-black text-blue-300 shadow-lg">
            PHÁO ĐÀI A (X=12)
          </div>
        </div>

        {/* Ngọn núi cao chắn ở chính giữa bản đồ (X = 45..55) */}
        <div className="flex flex-col items-center justify-end h-full pb-2 z-10">
          <div className="mb-2 text-center">
            <div className="text-[11px] font-bold text-amber-300">
              🎯 Mục tiêu: X={trajectoryInfo.targetX} • Điểm rơi dự kiến: X={trajectoryInfo.impactX}
            </div>
            <div className="text-[10px] text-slate-400">
              Độ cao đỉnh đạn: {trajectoryInfo.maxHeight}m vs Đỉnh núi: {mountainHeight}m{" "}
              {trajectoryInfo.hitMountain ? (
                <span className="text-rose-400 font-bold">(⚠️ Vướng núi giữa bản đồ!)</span>
              ) : (
                <span className="text-emerald-400 font-bold">(✓ Vượt qua đỉnh núi)</span>
              )}
            </div>
          </div>

          <div
            className="w-28 bg-gradient-to-t from-stone-800 via-stone-700 to-slate-500 border-t-2 border-stone-400 rounded-t-3xl flex flex-col items-center justify-center shadow-xl"
            style={{ height: `${Math.min(130, mountainHeight * 3)}px` }}
            title={`Ngọn núi chắn giữa bản đồ (X=45..55, Cao ${mountainHeight}m)`}
          >
            <Mountain size={20} className="text-stone-300" />
            <span className="text-[9px] font-black text-stone-200">NÚI CAO {mountainHeight}m</span>
            <span className="text-[8px] text-stone-300">X = 45..55</span>
          </div>
        </div>

        {/* Căn cứ & Khẩu pháo Đội B (X = 88) */}
        <div className="relative flex flex-col items-center z-10">
          {shieldB && (
            <div className="absolute -top-12 -inset-x-4 h-32 artillery-dome-shield pointer-events-none z-10" />
          )}
          <div className="scale-125 mb-1 scale-x-[-1]">
            <GameAssets.ArtilleryCannon angle={!isTeamA ? angle : 45} color="#ef4444" />
          </div>
          <div className="w-28 h-8 bg-rose-900/70 border border-rose-500/50 rounded-t-lg flex items-center justify-center text-xs font-black text-rose-300 shadow-lg">
            PHÁO ĐÀI B (X=88)
          </div>
        </div>
      </div>

      {/* Bảng điều khiển hỏa lực: Góc bắn (15° -> 80°) & Lực bắn (10 -> 100) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/70 rounded-2xl border border-slate-700">
        {/* Slider góc bắn (15° -> 80°) */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1 text-cyan-400">
              <Crosshair size={14} /> Góc Nâng Nòng Pháo (15° – 80°)
            </span>
            <span className="text-base font-black text-white px-2.5 py-0.5 rounded bg-cyan-900/40 border border-cyan-500/40">
              {angle}°
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={80}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>15° (Thấp)</span>
            <span>45° (Xa nhất)</span>
            <span>80° (Cầu vồng vượt núi)</span>
          </div>
        </div>

        {/* Slider lực bắn (10 -> 100) */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1 text-amber-400">
              <Flame size={14} /> Lực Bắn Thuốc Súng (10 – 100)
            </span>
            <span className="text-base font-black text-white px-2.5 py-0.5 rounded bg-amber-900/40 border border-amber-500/40">
              {power}
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            value={power}
            onChange={(e) => setPower(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>10 (Gần)</span>
            <span>55 (Trung bình)</span>
            <span>100 (Tối đa)</span>
          </div>
        </div>
      </div>

      {/* Hành động Khai Hỏa & 4 Kỹ năng Chiến thuật */}
      <div className="flex flex-wrap items-center justify-between w-full gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFire}
            disabled={actionPoints < 1 || isIsolated || submitting || hpA <= 0 || hpB <= 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 rounded-2xl font-black text-xs shadow-xl shadow-red-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Target size={16} />
            <span>KHAI HỎA BẮN PHÁO (-1 Đạn)</span>
          </button>

          <button
            type="button"
            onClick={handleClusterShell}
            disabled={isIsolated || submitting || hpA <= 0 || hpB <= 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 rounded-xl font-bold text-xs transition-all"
            title="Đạn Phân Mảnh (Combo 3): Tách làm 3 đầu đạn nhỏ rơi trải rộng quanh mục tiêu, gây tối đa 220 sát thương"
          >
            <Bomb size={14} />
            <span>Đạn Phân Mảnh (Combo 3)</span>
          </button>

          <button
            type="button"
            onClick={handlePiercingShell}
            disabled={actionPoints < 1 || isIsolated || submitting || myPiercing}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-xl font-bold text-xs transition-all"
            title="Đạn Xuyên Địa Hình: Cho phép viên đạn tiếp theo bay xuyên qua ngọn núi chắn ở giữa bản đồ"
          >
            <Zap size={14} />
            <span>Đạn Xuyên Địa Hình</span>
          </button>

          <button
            type="button"
            onClick={handleDomeShield}
            disabled={actionPoints < 1 || isIsolated || submitting || myShield}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-bold text-xs transition-all"
            title="Lá Chắn Vòm: Dựng khiên năng lượng bảo vệ Pháo đài khỏi 1 phát đạn của đối phương"
          >
            <Shield size={14} />
            <span>Lá Chắn Vòm</span>
          </button>

          <button
            type="button"
            onClick={handleControlWind}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl font-bold text-xs transition-all"
            title="Đảo Chiều Gió: Thay đổi hướng gió và cường độ gió ngay lập tức"
          >
            <Wind size={14} />
            <span>Đảo Chiều Gió</span>
          </button>
        </div>

        {/* Lịch sử phát bắn & tọa độ điểm rơi thực tế */}
        {history.length > 0 && (
          <div className="text-xs text-amber-200 max-w-full bg-slate-800/90 px-3 py-1.5 rounded-lg border border-amber-500/30">
            🎯 {history[history.length - 1]}
          </div>
        )}
      </div>
    </div>
  );
}
