"use client";

import React, { useState } from "react";
import { GameAssets } from "@/components/common/GameSvgAssets";
import { soundFX } from "@/utils/gameSoundEngine";
import { Crosshair, Shield, Wind, Zap, Flame, Target, Bomb } from "lucide-react";

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
  const [angle, setAngle] = useState<number>(50);
  const [power, setPower] = useState<number>(76);
  const [firingAnim, setFiringAnim] = useState<boolean>(false);
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
    const impactX = hitMountain
      ? 50
      : Math.max(2, Math.min(98, Math.round((startX + range * direction) * 10) / 10));
    return {
      startX,
      targetX,
      impactX,
      maxHeight: Math.round(maxHeight),
      hitMountain,
    };
  }, [angle, power, wind, isTeamA, myPiercing, mountainHeight, boardState?.basePosA, boardState?.basePosB]);

  const triggerShotEffect = () => {
    setFiringAnim(true);
    setTimeout(() => setFiringAnim(false), 900);
  };

  const handleFire = async () => {
    if (actionPoints < 1 || isIsolated || submitting || hpA <= 0 || hpB <= 0) return;
    try {
      setSubmitting(true);
      triggerShotEffect();
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
      triggerShotEffect();
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

  // Tọa độ đường cong Parabol trên SVG (viewBox 0 0 1000 280)
  const svgStartX = trajectoryInfo.startX * 10;
  const svgEndX = trajectoryInfo.impactX * 10;
  const svgMidX = (svgStartX + svgEndX) / 2;
  const svgPeakY = Math.max(12, 225 - trajectoryInfo.maxHeight * 3.8);

  return (
    <div className="flex flex-col items-center gap-3.5 w-full max-w-5xl mx-auto p-4 bg-gradient-to-b from-[#0b1120] via-[#111827] to-[#0f172a] rounded-3xl border-2 border-indigo-500/40 backdrop-blur-md shadow-[0_0_45px_rgba(59,130,246,0.18)] text-white">
      {/* BẢNG RADAR CHỈ HUY PHÁO BINH: PHÁO ĐÀI A (X=12) - PHONG VŨ BIỂU GIÓ - PHÁO ĐÀI B (X=88) */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3 w-full px-5 py-3 bg-slate-900/95 rounded-2xl border border-indigo-500/30 shadow-inner">
        {/* Pháo Đài Đội A (X = 12) */}
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2 text-xs font-black text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
              PHÁO ĐÀI A (X=12) {isTeamA && "• BẠN"}
            </span>
            <span className="text-xs font-black text-sky-300">{hpA} / 1000 HP</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-sky-500/40 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, (hpA / 1000) * 100))}%` }}
            />
          </div>
        </div>

        {/* Phong Vũ Biểu Khí Tượng & Kho Đạn Pháo */}
        <div className="flex flex-col items-center justify-center bg-indigo-950/50 border border-indigo-500/40 rounded-xl py-1.5 px-3">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-black uppercase tracking-widest">
            <Wind size={13} className="animate-pulse text-cyan-300" /> Khí Tượng Chiến Trường (-10 ➔ +10)
          </div>
          <div className="text-base font-black text-white flex items-center gap-1.5">
            {wind > 0
              ? `💨 ➔ +${wind} (Gió Xuôi Đông)`
              : wind < 0
              ? `💨 ⬅ ${wind} (Gió Ngược Tây)`
              : "⚖️ 0 (Lặng Gió)"}
          </div>
          <div className="text-[11px] text-slate-300">
            Kho Đạn Trọng Pháo: <b className="text-emerald-400">{actionPoints} Viên</b>
            {myPiercing && (
              <span className="ml-2 px-1.5 py-0.2 rounded bg-purple-500/30 border border-purple-400 text-purple-200 font-bold text-[10px]">
                ⚡ Đạn Xuyên Núi
              </span>
            )}
          </div>
        </div>

        {/* Pháo Đài Đội B (X = 88) */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-black text-rose-300">{hpB} / 1000 HP</span>
            <span className="flex items-center gap-2 text-xs font-black text-rose-400">
              PHÁO ĐÀI B (X=88) {!isTeamA && "• BẠN"}
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            </span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-rose-500/40 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-orange-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, (hpB / 1000) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* CHIẾN TRƯỜNG PARALLAX 2D ĐẤU PHÁO TỌA ĐỘ (X = 0 -> 100) */}
      <div className="relative w-full h-[296px] bg-gradient-to-b from-[#060916] via-[#111c38] to-[#1e1b38] rounded-2xl border-2 border-indigo-400/40 overflow-hidden shadow-2xl flex items-end justify-between px-6 pb-7 select-none">
        {/* Lưới Radar Tọa Độ Quân Sự */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.06)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

        {/* Bảng Máy Tính Đạn Đạo (Ballistic Computer HUD) lơ lửng trên bầu trời */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-slate-950/90 border border-cyan-500/40 rounded-xl px-4 py-1.5 text-center shadow-lg backdrop-blur-sm">
          <div className="text-xs font-black text-amber-300 flex items-center justify-center gap-2">
            <span>🎯 Mục tiêu: X={trajectoryInfo.targetX}</span>
            <span>•</span>
            <span>Điểm rơi dự báo: X={trajectoryInfo.impactX}</span>
          </div>
          <div className="text-[10.5px] text-slate-300 mt-0.5">
            Đỉnh quỹ đạo: <b className="text-cyan-300">{trajectoryInfo.maxHeight}m</b> so với Đỉnh núi:{" "}
            <b className="text-amber-300">{mountainHeight}m</b>{" "}
            {trajectoryInfo.hitMountain ? (
              <span className="text-rose-400 font-black">⚠️ (Vướng đỉnh núi X=50! Hãy tăng Góc bắn!)</span>
            ) : (
              <span className="text-emerald-400 font-black">✓ (Đạn bay vượt qua đỉnh núi!)</span>
            )}
          </div>
        </div>

        {/* LỚP SVG TOÀN CẢNH: TRĂNG KHUYẾT, MÂY GIÓ, DÃY NÚI XA, ĐƯỜNG ĐẠN PARABOL & TÂM NGẮM */}
        <svg
          viewBox="0 0 1000 280"
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="trajSafe" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="trajBlocked" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Mặt trăng & Hào quang đêm chiến trường */}
          <circle cx="860" cy="48" r="24" fill="rgba(254, 240, 138, 0.15)" />
          <circle cx="860" cy="48" r="15" fill="#fef08a" opacity="0.9" />
          <circle cx="866" cy="44" r="13" fill="#0b1329" />

          {/* Các luồng gió chiến trường trên bầu trời */}
          <g opacity="0.45">
            <path d="M 160 55 Q 210 48 260 55" stroke="#7dd3fc" strokeWidth="2" fill="none" strokeDasharray="8 4" />
            <path d="M 680 75 Q 730 68 780 75" stroke="#7dd3fc" strokeWidth="2" fill="none" strokeDasharray="8 4" />
          </g>

          {/* Bóng dãy núi mờ phía xa (Parallax Far Mountains) */}
          <polygon
            points="0,250 120,150 260,220 420,120 580,210 740,135 900,215 1000,170 1000,255 0,255"
            fill="#0f172a"
            opacity="0.7"
          />

          {/* Đường cong quỹ đạo Parabol */}
          <path
            d={`M ${svgStartX} 218 Q ${svgMidX} ${svgPeakY} ${svgEndX} 225`}
            fill="none"
            stroke={
              myPiercing
                ? "#c084fc"
                : trajectoryInfo.hitMountain
                ? "url(#trajBlocked)"
                : "url(#trajSafe)"
            }
            strokeWidth="3.5"
            strokeDasharray="10 6"
          />

          {/* Đầu đạn mô phỏng đang bay ở đỉnh quỹ đạo */}
          <circle
            cx={svgMidX}
            cy={(218 + svgPeakY) / 2}
            r="5.5"
            fill="#fde047"
            stroke="#ef4444"
            strokeWidth="2"
          />

          {/* Tâm Ngắm Radar Đa Vòng (Target Reticle) tại điểm rơi dự kiến */}
          <g transform={`translate(${svgEndX}, 225)`}>
            <circle
              cx="0"
              cy="0"
              r="16"
              fill="rgba(250, 204, 21, 0.15)"
              stroke={trajectoryInfo.hitMountain ? "#f43f5e" : "#fde047"}
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <circle
              cx="0"
              cy="0"
              r="6"
              fill={trajectoryInfo.hitMountain ? "#f43f5e" : "#10b981"}
            />
            <line x1="-22" y1="0" x2="22" y2="0" stroke="#fde047" strokeWidth="1.5" />
            <line x1="0" y1="-22" x2="0" y2="22" stroke="#fde047" strokeWidth="1.5" />
          </g>

          {/* Hiệu ứng Khai Hỏa Bắn Pháo Thực Tế */}
          {firingAnim && (
            <g>
              <path
                d={`M ${svgStartX} 218 Q ${svgMidX} ${svgPeakY} ${svgEndX} 225`}
                fill="none"
                stroke="#fef08a"
                strokeWidth="6"
              />
              <circle cx={svgEndX} cy="220" r="34" fill="rgba(239, 68, 68, 0.55)" />
              <circle cx={svgEndX} cy="220" r="20" fill="#f97316" />
              <circle cx={svgEndX} cy="220" r="10" fill="#fef08a" />
            </g>
          )}
        </svg>

        {/* PHÁO ĐÀI ĐỘI A (X = 12) */}
        <div className="relative flex flex-col items-center z-20">
          {shieldA && (
            <div className="absolute -top-10 -inset-x-4 h-32 artillery-dome-shield pointer-events-none z-20" />
          )}
          <div className="flex items-end -mb-3">
            <GameAssets.TdBaseCastle team="TEAM_A" hasShield={shieldA} />
            <div className="scale-105 -ml-3">
              <GameAssets.ArtilleryCannon
                angle={isTeamA ? angle : 45}
                color="#3b82f6"
                isPiercing={piercingA}
              />
            </div>
          </div>
          <div className="w-36 h-7 bg-gradient-to-r from-blue-950 via-sky-900 to-blue-950 border border-sky-400/70 rounded-t-lg flex items-center justify-center text-[11px] font-black text-sky-200 shadow-lg">
            PHÁO ĐÀI A (X=12)
          </div>
        </div>

        {/* DÃY NÚI ĐÁ TRUNG TÂM HÙNG VĨ (X = 45..55, CAO 28M) */}
        <div className="flex flex-col items-center justify-end h-full z-15">
          <div
            className="relative w-44 flex flex-col items-center justify-end"
            style={{ height: `${Math.min(156, mountainHeight * 3.8)}px` }}
            title={`Dãy núi đá chắn giữa bản đồ (X=45..55, Cao ${mountainHeight}m)`}
          >
            <svg viewBox="0 0 180 140" className="w-full h-full overflow-visible drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]">
              {/* Khối núi sườn Tây */}
              <polygon points="4,140 56,36 108,140" fill="#334155" stroke="#94a3b8" strokeWidth="1.8" />
              <polygon points="56,36 74,140 4,140" fill="#1e293b" />
              {/* Khối núi sườn Đông */}
              <polygon points="66,140 124,24 176,140" fill="#475569" stroke="#cbd5e1" strokeWidth="1.8" />
              <polygon points="124,24 140,140 66,140" fill="#334155" />
              {/* Đỉnh núi chính giữa X=50 */}
              <polygon points="28,140 90,4 152,140" fill="#64748b" stroke="#f1f5f9" strokeWidth="2.2" />
              <polygon points="90,4 106,140 28,140" fill="#475569" />
              {/* Chỏm băng tuyết trắng xóa trên đỉnh núi */}
              <polygon points="90,4 70,48 82,40 90,52 100,39 110,48" fill="#f8fafc" />
              <polygon points="124,24 112,52 124,46 136,54" fill="#e2e8f0" />
            </svg>
            <div className="absolute bottom-2 flex flex-col items-center">
              <span className="text-[9.5px] font-black text-amber-300 bg-slate-950/90 border border-amber-400/50 px-2 py-0.5 rounded shadow">
                ⛰️ ĐỈNH NÚI {mountainHeight}M (X=50)
              </span>
            </div>
          </div>
        </div>

        {/* PHÁO ĐÀI ĐỘI B (X = 88) */}
        <div className="relative flex flex-col items-center z-20">
          {shieldB && (
            <div className="absolute -top-10 -inset-x-4 h-32 artillery-dome-shield pointer-events-none z-20" />
          )}
          <div className="flex items-end -mb-3">
            <div className="scale-105 -mr-3 scale-x-[-1]">
              <GameAssets.ArtilleryCannon
                angle={!isTeamA ? angle : 45}
                color="#ef4444"
                isPiercing={piercingB}
              />
            </div>
            <GameAssets.TdBaseCastle team="TEAM_B" hasShield={shieldB} />
          </div>
          <div className="w-36 h-7 bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border border-rose-400/70 rounded-t-lg flex items-center justify-center text-[11px] font-black text-rose-200 shadow-lg">
            PHÁO ĐÀI B (X=88)
          </div>
        </div>

        {/* THƯỚC ĐO TỌA ĐỘ MẶT ĐẤT (X = 0 ➔ X = 100) */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-slate-950/95 border-t border-indigo-500/40 flex items-center justify-between px-6 text-[9px] font-mono font-bold text-slate-400 z-20">
          {[0, 12, 25, 35, 50, 65, 75, 88, 100].map((mark) => (
            <span
              key={mark}
              className={
                mark === 12
                  ? "text-sky-400 font-black"
                  : mark === 50
                  ? "text-amber-400 font-black"
                  : mark === 88
                  ? "text-rose-400 font-black"
                  : ""
              }
            >
              X={mark}
            </span>
          ))}
        </div>
      </div>

      {/* BẢNG ĐIỀU KHIỂN THÔNG SỐ BẮN: GÓC NÂNG NÒNG (15° -> 80°) & LỰC THUỐC PHÁO (10 -> 100) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/90 rounded-2xl border border-indigo-500/30">
        {/* Slider góc bắn (15° -> 80°) */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-cyan-400 uppercase tracking-wide">
              <Crosshair size={14} /> Góc Nâng Nòng Đại Pháo (15° – 80°)
            </span>
            <span className="text-base font-black text-cyan-200 px-2.5 py-0.5 rounded-lg bg-cyan-950 border border-cyan-400/50">
              {angle}°
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={80}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>15° (Bắn thẳng)</span>
            <span>45° (Tầm xa cực đại)</span>
            <span>80° (Cầu vồng vượt núi)</span>
          </div>
        </div>

        {/* Slider lực bắn (10 -> 100) */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-amber-400 uppercase tracking-wide">
              <Flame size={14} /> Liều Thuốc Pháo Khai Hỏa (10 – 100)
            </span>
            <span className="text-base font-black text-amber-200 px-2.5 py-0.5 rounded-lg bg-amber-950 border border-amber-400/50">
              {power} Lực
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            value={power}
            onChange={(e) => setPower(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>10 (Cự ly gần)</span>
            <span>55 (Tầm trung)</span>
            <span>100 (Công suất tối đa)</span>
          </div>
        </div>
      </div>

      {/* NÚT KHAI HỎA TRỌNG PHÁO & 4 KỸ NĂNG CHIẾN THUẬT */}
      <div className="flex flex-wrap items-center justify-between w-full gap-3 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFire}
            disabled={actionPoints < 1 || isIsolated || submitting || hpA <= 0 || hpB <= 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-500 hover:to-orange-500 border border-yellow-300/60 disabled:opacity-40 rounded-2xl font-black text-xs shadow-[0_0_20px_rgba(239,68,68,0.35)] transition-all hover:scale-105 active:scale-95"
          >
            <Target size={16} />
            <span>KHAI HỎA BẮN PHÁO (-1 Đạn)</span>
          </button>

          <button
            type="button"
            onClick={handleClusterShell}
            disabled={isIsolated || submitting || hpA <= 0 || hpB <= 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 border border-orange-400/50 disabled:opacity-40 rounded-xl font-bold text-xs transition-all"
            title="Đạn Phân Mảnh (Combo 3): Tách làm 3 đầu đạn nhỏ rơi trải rộng quanh mục tiêu, gây tối đa 220 sát thương"
          >
            <Bomb size={14} />
            <span>Đạn Phân Mảnh (Combo 3)</span>
          </button>

          <button
            type="button"
            onClick={handlePiercingShell}
            disabled={actionPoints < 1 || isIsolated || submitting || myPiercing}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 border border-purple-400/50 disabled:opacity-40 rounded-xl font-bold text-xs transition-all"
            title="Đạn Xuyên Địa Hình: Cho phép viên đạn tiếp theo bay xuyên qua ngọn núi chắn ở giữa bản đồ"
          >
            <Zap size={14} />
            <span>Đạn Xuyên Địa Hình</span>
          </button>

          <button
            type="button"
            onClick={handleDomeShield}
            disabled={actionPoints < 1 || isIsolated || submitting || myShield}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 border border-blue-400/50 disabled:opacity-40 rounded-xl font-bold text-xs transition-all"
            title="Lá Chắn Vòm: Dựng khiên năng lượng bảo vệ Pháo đài khỏi 1 phát đạn của đối phương"
          >
            <Shield size={14} />
            <span>Lá Chắn Vòm</span>
          </button>

          <button
            type="button"
            onClick={handleControlWind}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/50 disabled:opacity-40 rounded-xl font-bold text-xs transition-all"
            title="Đảo Chiều Gió: Thay đổi hướng gió và cường độ gió ngay lập tức"
          >
            <Wind size={14} />
            <span>Đảo Chiều Gió</span>
          </button>
        </div>

        {/* Nhật ký đường đạn */}
        {history.length > 0 && (
          <div className="text-xs text-amber-200 max-w-full bg-slate-900/95 px-3 py-1.5 rounded-xl border border-amber-500/35">
            {history[history.length - 1]}
          </div>
        )}
      </div>
    </div>
  );
}
