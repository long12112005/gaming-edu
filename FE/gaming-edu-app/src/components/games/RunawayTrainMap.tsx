"use client";

import React, { useState, useEffect } from "react";
import { GameAssets } from "@/components/common/GameSvgAssets";
import { soundFX } from "@/utils/gameSoundEngine";
import { AlertTriangle, Clock, Compass, Flame, ShieldAlert, Shuffle, Trophy, Zap } from "lucide-react";

interface TrackPiece {
  x: number;
  y: number;
  trackType: string; // STRAIGHT_H | STRAIGHT_V | CURVE_SE | CURVE_SW | CURVE_NE | CURVE_NW
}

interface RunawayTrainMapProps {
  boardState: any;
  actionPoints: number;
  playerTeam: string;
  isIsolated: boolean;
  onPerformAction: (actionType: string, payload: any) => Promise<void>;
  onUseSkill: (skillName: string, payload: any) => Promise<void>;
}

const TRACK_OPTIONS = [
  { type: "STRAIGHT_H", label: "Ray Ngang (━)" },
  { type: "STRAIGHT_V", label: "Ray Dọc (┃)" },
  { type: "CURVE_SE", label: "Cua Đông-Nam (┏)" },
  { type: "CURVE_SW", label: "Cua Tây-Nam (┓)" },
  { type: "CURVE_NE", label: "Cua Đông-Bắc (┗)" },
  { type: "CURVE_NW", label: "Cua Tây-Bắc (┛)" },
];

// Sprite Nhà Ga Cổ Điển Châu Âu (Có Tháp Đồng Hồ & Mái Vòm)
function TrainStationSprite({ isGoal = false }: { isGoal?: boolean }) {
  const roofCol = isGoal ? "#f59e0b" : "#10b981";
  const wallCol = isGoal ? "#78350f" : "#065f46";
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10 overflow-visible drop-shadow">
      {/* Tháp đồng hồ trung tâm */}
      <polygon points="24,2 14,14 34,14" fill={roofCol} stroke="#fef08a" strokeWidth="1.2" />
      <rect x="8" y="14" width="32" height="24" rx="2" fill={wallCol} stroke="#fde047" strokeWidth="1.5" />
      {/* Mặt đồng hồ nhà ga */}
      <circle cx="24" cy="21" r="4.5" fill="#fef9c3" stroke="#78350f" strokeWidth="1.2" />
      <line x1="24" y1="21" x2="24" y2="18" stroke="#0f172a" strokeWidth="1.2" />
      <line x1="24" y1="21" x2="26.5" y2="21" stroke="#0f172a" strokeWidth="1.2" />
      {/* Cổng vòm nhà ga */}
      <path d="M18 38 V30 A6 6 0 0 1 30 30 V38 Z" fill="#0f172a" stroke="#fde047" strokeWidth="1.2" />
      {/* Biển hiệu Ga */}
      <rect x="4" y="37" width="40" height="9" rx="2" fill="#0f172a" stroke={roofCol} strokeWidth="1.2" />
      <text x="24" y="43.5" textAnchor="middle" fill="#fef08a" fontSize="6.5" fontWeight="900">
        {isGoal ? "GA ĐÍCH" : "GA ĐẦU"}
      </text>
    </svg>
  );
}

// Sprite Núi Đá Chắn Đường + Bó Thuốc Nổ TNT Dynamite
function MountainDynamiteSprite() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10 overflow-visible drop-shadow">
      {/* Khối núi đá hoa cương 3D */}
      <polygon points="4,40 16,10 28,24 34,8 44,40" fill="#57534e" stroke="#d6d3d1" strokeWidth="1.5" />
      <polygon points="16,10 22,26 10,40" fill="#44403c" />
      <polygon points="34,8 39,26 26,40 28,24" fill="#292524" />
      {/* Đỉnh tuyết trắng */}
      <polygon points="16,10 12,19 16,17 20,19" fill="#f5f5f4" />
      <polygon points="34,8 30,17 34,15 38,18" fill="#f5f5f4" />
      {/* Bó thuốc nổ TNT gắn ở chân đá */}
      <rect x="16" y="31" width="16" height="8" rx="2" fill="#dc2626" stroke="#fef08a" strokeWidth="1.2" />
      <text x="24" y="37" textAnchor="middle" fill="#ffffff" fontSize="5.5" fontWeight="900">
        TNT
      </text>
      <path d="M32 34 Q37 30 38 35" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
      <circle cx="38" cy="35" r="2" fill="#fde047" />
    </svg>
  );
}

export default function RunawayTrainMap({
  boardState,
  actionPoints,
  playerTeam,
  isIsolated,
  onPerformAction,
  onUseSkill,
}: RunawayTrainMapProps) {
  const [selectedTrackType, setSelectedTrackType] = useState<string>("STRAIGHT_H");
  const [submitting, setSubmitting] = useState(false);

  const gridCols = boardState?.gridCols || 12;
  const gridRows = boardState?.gridRows || 8;
  const train = boardState?.train || {
    x: 0,
    y: 1,
    dx: 1,
    dy: 0,
    isDerailed: false,
    reachedStation: false,
  };
  const stationPos = boardState?.stationPos || [11, 6];
  const placedTracks: TrackPiece[] = boardState?.placedTracks || [];
  const obstacles: number[][] = boardState?.obstacles || [];
  const isBrakeActive = boardState?.isBrakeActive || false;
  const isBoilerOverdrive = boardState?.isBoilerOverdrive || false;
  const tickIntervalSec = isBoilerOverdrive ? 6 : 12;
  const [tickCountdown, setTickCountdown] = useState<number>(tickIntervalSec);
  const [derailCountdown, setDerailCountdown] = useState<number>(10);

  // Ô dự kiến tiếp theo trước mũi tàu
  const nextTrainX = (train.x ?? 1) + (train.dx || 1);
  const nextTrainY = (train.y ?? 1) + (train.dy || 0);

  // Đồng hồ đếm ngược 12 giây (hoặc 6s khi Tăng Áp Lò Hơi) để tàu tự động nhích tới trước 1 ô
  useEffect(() => {
    if (train.reachedStation) return;

    if (train.isDerailed) {
      setDerailCountdown(10);
      const derailTimer = setInterval(() => {
        setDerailCountdown((prev) => {
          if (prev <= 1) {
            onPerformAction("ADVANCE_TRAIN_TICK", { recoverDerail: true }).catch(() => {});
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(derailTimer);
    }

    if (isBrakeActive) {
      setTickCountdown(12);
      return;
    }

    setTickCountdown(tickIntervalSec);
    const timer = setInterval(() => {
      setTickCountdown((prev) => {
        if (prev <= 1) {
          onPerformAction("ADVANCE_TRAIN_TICK", {}).catch(() => {});
          return tickIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [train.reachedStation, train.isDerailed, isBrakeActive, tickIntervalSec, train.x, train.y]);

  const handleCellClick = async (x: number, y: number) => {
    if (isIsolated || submitting || train.reachedStation) return;
    if (actionPoints < 1) return;

    const isObstacle = obstacles.some(([ox, oy]) => ox === x && oy === y);
    if (isObstacle) return;

    try {
      setSubmitting(true);
      soundFX.playTrainWhistle();
      await onPerformAction("PLACE_TRACK", {
        x,
        y,
        trackType: selectedTrackType,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmergencyBrake = async () => {
    if (actionPoints < 1 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playTrainWhistle();
      await onUseSkill("EMERGENCY_BRAKE", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchTrack = async () => {
    if (actionPoints < 1 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playTrainWhistle();
      await onUseSkill("SWITCH_TRACK", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleBoilerOverdrive = async () => {
    if (actionPoints < 1 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playTrainWhistle();
      await onUseSkill("BOILER_OVERDRIVE", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleDynamite = async (x: number, y: number) => {
    if (actionPoints < 1 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playBigExplosion();
      await onUseSkill("DYNAMITE_OBSTACLE", { x, y });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3.5 w-full max-w-5xl mx-auto p-4 bg-gradient-to-b from-[#1c1917] via-[#18181b] to-[#0f172a] rounded-3xl border-2 border-amber-500/40 backdrop-blur-md shadow-[0_0_45px_rgba(245,158,11,0.15)] text-white">
      {/* BẢNG ĐIỀU KHIỂN ĐẦU MÁY HƠI NƯỚC STEAMPUNK */}
      <div className="flex flex-wrap items-center justify-between w-full px-5 py-3 bg-gradient-to-r from-stone-900 via-neutral-900 to-stone-900 rounded-2xl border border-amber-500/35 gap-3 shadow-inner">
        <div className="flex items-center gap-3.5">
          <div
            className={`p-1.5 rounded-xl bg-amber-950/40 border border-amber-500/40 ${
              isBrakeActive ? "train-emergency-brake" : ""
            }`}
          >
            <GameAssets.TrainLocomotive isOverdrive={isBoilerOverdrive} isDerailed={train.isDerailed} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-400 font-black flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400 animate-pulse" /> Chuyến Tàu Tốc Hành Steampunk ({gridCols}×{gridRows})
            </div>
            <div className="text-sm font-black text-stone-200 mt-0.5">
              Tọa độ Đầu máy: <span className="text-amber-300">Cột {train.x + 1}/{gridCols} • Hàng {train.y + 1}</span>{" "}
              • Hướng chạy:{" "}
              <span className="text-cyan-300">
                {train.dx > 0 ? "Đông (➔)" : train.dx < 0 ? "Tây (⬅)" : train.dy > 0 ? "Nam (⬇)" : "Bắc (⬆)"}
              </span>
            </div>
            <div className="text-[11px] text-stone-400">
              Ô kế tiếp cần có ray: Cột {Math.min(gridCols, Math.max(1, nextTrainX + 1))}, Hàng{" "}
              {Math.min(gridRows, Math.max(1, nextTrainY + 1))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!train.reachedStation && (
            <div
              className={`px-3.5 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 shadow ${
                train.isDerailed
                  ? "bg-red-500/20 border-red-400 text-red-200 animate-pulse"
                  : isBrakeActive
                  ? "bg-amber-500/20 border-amber-400 text-amber-200"
                  : isBoilerOverdrive
                  ? "bg-rose-500/20 border-rose-400 text-rose-200 animate-pulse"
                  : "bg-emerald-950/70 border-emerald-400/50 text-emerald-300"
              }`}
            >
              <Clock size={15} />
              {train.isDerailed
                ? `🔧 Sửa trật bánh: ${derailCountdown}s`
                : isBrakeActive
                ? "🛑 Đang kéo Phanh Khẩn Cấp"
                : `🚂 Tàu tự tiến 1 ô sau: ${tickCountdown}s`}
            </div>
          )}
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl px-3.5 py-1.5 text-right">
            <div className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">
              Kho Mảnh Đường Ray
            </div>
            <div className="text-xl font-black text-emerald-400">{actionPoints} Mảnh Ray</div>
          </div>
        </div>
      </div>

      {/* Cảnh báo Trật bánh hoặc Chúc mừng về đích */}
      {train.isDerailed && (
        <div className="w-full py-2.5 px-4 bg-red-600/30 border border-red-500 rounded-xl text-red-200 text-sm font-bold flex items-center justify-center gap-2 animate-bounce">
          <AlertTriangle size={18} className="text-red-400" />
          CẢNH BÁO TRẬT BÁNH TẠM THỜI: Tàu thiếu ray nối tiếp! Dừng sửa chữa 10 giây (-50đ) — Hãy lắp ngay mảnh ray vào ô viền vàng phía trước mũi tàu!
        </div>
      )}
      {train.reachedStation && (
        <div className="w-full py-2.5 px-4 bg-emerald-600/30 border border-emerald-500 rounded-xl text-emerald-200 text-sm font-bold flex items-center justify-center gap-2">
          <Trophy size={18} className="text-amber-400" />
          XUẤT SẮC: Đoàn tàu đã tiến vào Ga Đích (Cột 12) an toàn! Hoàn thành sứ mệnh!
        </div>
      )}

      {/* SA BÀN THUNG LŨNG ĐƯỜNG SẮT 12x8 */}
      <div className="relative p-3.5 bg-gradient-to-b from-[#14241b] via-[#19281f] to-[#121e17] rounded-2xl border-2 border-amber-600/40 shadow-2xl overflow-x-auto max-w-full">
        {/* Thanh đánh số Cột 1 -> 12 */}
        <div
          className="grid gap-1.5 mb-1"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(44px, 52px))`,
          }}
        >
          {Array.from({ length: gridCols }).map((_, idx) => (
            <div
              key={`col-h-${idx}`}
              className={`text-center text-[9px] font-black py-0.5 rounded ${
                idx === 0
                  ? "bg-emerald-900/70 text-emerald-200"
                  : idx === gridCols - 1
                  ? "bg-amber-900/70 text-amber-200"
                  : "text-stone-400"
              }`}
            >
              Cột {idx + 1}
            </div>
          ))}
        </div>

        {/* Lưới địa hình 12x8 */}
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(44px, 52px))`,
            gridTemplateRows: `repeat(${gridRows}, minmax(44px, 52px))`,
          }}
        >
          {Array.from({ length: gridRows }).map((_, y) =>
            Array.from({ length: gridCols }).map((_, x) => {
              const isTrain = train.x === x && train.y === y;
              const isNextTarget = !train.reachedStation && nextTrainX === x && nextTrainY === y;
              const isStartStation = x === 0 && y === 1;
              const isStation = stationPos[0] === x && stationPos[1] === y;
              const track = placedTracks.find((t) => t.x === x && t.y === y);
              const isObstacle = obstacles.some(([ox, oy]) => ox === x && oy === y);

              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => {
                    if (isObstacle) {
                      handleDynamite(x, y);
                    } else {
                      handleCellClick(x, y);
                    }
                  }}
                  className={`relative flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer select-none border overflow-hidden ${
                    isTrain
                      ? "bg-gradient-to-b from-amber-950/90 to-red-950/90 border-2 border-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.5)] scale-105 z-20"
                      : isStation
                      ? "bg-gradient-to-b from-amber-900/70 to-stone-900 border-2 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)] z-10"
                      : isStartStation
                      ? "bg-gradient-to-b from-emerald-900/70 to-stone-900 border-2 border-emerald-400 text-emerald-300"
                      : isObstacle
                      ? "bg-[#262320] border-stone-500 hover:border-red-400 text-stone-300 hover:scale-105"
                      : isNextTarget
                      ? "bg-amber-500/20 border-2 border-dashed border-amber-400 animate-pulse"
                      : track
                      ? "bg-[#1f2937] border-cyan-400/60 shadow-inner"
                      : "bg-[#1a2e22]/85 border-emerald-900/70 hover:border-amber-400/70 hover:bg-[#223b2c]"
                  }`}
                  style={{ width: "100%", aspectRatio: "1/1" }}
                  title={`Cột ${x + 1}, Hàng ${y + 1}${
                    isObstacle
                      ? " - Núi đá chắn đường (Click dùng Thuốc nổ TNT phá đá)"
                      : isNextTarget
                      ? " - Ô kế tiếp trước mũi tàu! Click để lắp ray ngay!"
                      : ""
                  }`}
                >
                  {/* Họa tiết cỏ thảo nguyên nhẹ cho các ô trống */}
                  {!track && !isObstacle && !isStation && !isStartStation && !isTrain && (
                    <span className="text-[8px] font-semibold text-emerald-700/70 select-none">
                      {isNextTarget ? "LẮP RAY" : `${x + 1},${y + 1}`}
                    </span>
                  )}

                  {/* Đoạn ray đã đặt bằng Sprite SVG */}
                  {track && <GameAssets.RailTrackTile trackType={track.trackType} />}

                  {/* Ga Khởi Hành (Cột 1, Hàng 2) */}
                  {isStartStation && !isTrain && <TrainStationSprite isGoal={false} />}

                  {/* Ga Đích Đến (Cột 12, Hàng 7) */}
                  {isStation && <TrainStationSprite isGoal={true} />}

                  {/* Chướng ngại vật Núi đá + Thuốc nổ TNT */}
                  {isObstacle && (
                    <div className="flex flex-col items-center justify-center group w-full h-full">
                      <MountainDynamiteSprite />
                    </div>
                  )}

                  {/* Đầu máy xe lửa Steampunk */}
                  {isTrain && (
                    <div
                      className={`absolute inset-0 flex items-center justify-center z-20 ${
                        isBrakeActive ? "train-emergency-brake" : ""
                      }`}
                    >
                      <GameAssets.TrainLocomotive
                        isOverdrive={isBoilerOverdrive}
                        isDerailed={train.isDerailed}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* BẢNG CHỌN 6 LOẠI ĐƯỜNG RAY KỸ THUẬT */}
      <div className="flex flex-wrap items-center justify-center gap-2 w-full p-3 bg-stone-900/90 rounded-2xl border border-amber-500/30">
        <span className="text-xs font-black text-amber-300 mr-1 flex items-center gap-1 uppercase">
          <Compass size={14} className="text-amber-400" /> Chọn Mảnh Ray Để Lắp:
        </span>
        {TRACK_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => setSelectedTrackType(opt.type)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
              selectedTrackType === opt.type
                ? "bg-amber-950 text-amber-200 border-amber-400 shadow-md shadow-amber-500/25 scale-105 ring-2 ring-amber-400/40"
                : "bg-stone-800/90 text-stone-300 border-stone-700 hover:bg-stone-800"
            }`}
          >
            <div className="w-7 h-7 rounded bg-stone-950 border border-stone-700 overflow-hidden shrink-0">
              <GameAssets.RailTrackTile trackType={opt.type} />
            </div>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* 3 KỸ NĂNG ĐƯỜNG SẮT CHIẾN THUẬT */}
      <div className="flex flex-wrap items-center justify-between w-full gap-3 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleEmergencyBrake}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border border-yellow-300/50 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
            title="Phanh Khẩn Cấp: Kéo phanh giữ tàu của đội mình đứng yên tại chỗ trong 12 giây"
          >
            <ShieldAlert size={15} />
            <span>Phanh Khẩn Cấp (12s)</span>
          </button>

          <button
            type="button"
            onClick={handleSwitchTrack}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/50 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
            title="Bẻ Ghi Đường Ray: Xoay ngang 1 mảnh đường ray ngay phía trước mũi tàu đối phương khiến tàu họ rẽ lệch hướng"
          >
            <Shuffle size={15} />
            <span>Bẻ Ghi Đường Ray</span>
          </button>

          <button
            type="button"
            onClick={handleBoilerOverdrive}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 border border-rose-400/50 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
            title="Tăng Áp Lò Hơi: Làm tàu hỏa của đối phương tăng gấp đôi tốc độ di chuyển trong 10 giây"
          >
            <Flame size={15} />
            <span>Tăng Áp Lò Hơi (10s)</span>
          </button>
        </div>

        <div className="text-xs text-amber-200/80 font-semibold">
          💡 Click vào ô Núi đá có nhãn <span className="text-red-400 font-black">TNT</span> để kích nổ phá đá mở đường!
        </div>
      </div>
    </div>
  );
}
