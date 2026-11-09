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
  { type: "STRAIGHT_H", label: "Ray Thẳng Ngang ━", symbol: "━" },
  { type: "STRAIGHT_V", label: "Ray Thẳng Dọc ┃", symbol: "┃" },
  { type: "CURVE_SE", label: "Ray Cua ┏", symbol: "┏" },
  { type: "CURVE_SW", label: "Ray Cua ┓", symbol: "┓" },
  { type: "CURVE_NE", label: "Ray Cua ┗", symbol: "┗" },
  { type: "CURVE_NW", label: "Ray Cua ┛", symbol: "┛" },
];

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
  const train = boardState?.train || { x: 0, y: 1, dx: 1, dy: 0, isDerailed: false, reachedStation: false };
  const stationPos = boardState?.stationPos || [11, 6];
  const placedTracks: TrackPiece[] = boardState?.placedTracks || [];
  const obstacles: number[][] = boardState?.obstacles || [];
  const isBrakeActive = boardState?.isBrakeActive || false;
  const isBoilerOverdrive = boardState?.isBoilerOverdrive || false;
  const tickIntervalSec = isBoilerOverdrive ? 6 : 12;
  const [tickCountdown, setTickCountdown] = useState<number>(tickIntervalSec);
  const [derailCountdown, setDerailCountdown] = useState<number>(10);

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
    <div className="flex flex-col items-center gap-4 w-full max-w-5xl mx-auto p-4 bg-slate-900/95 rounded-3xl border border-red-500/30 backdrop-blur-md shadow-2xl text-white">
      {/* Header trạng thái đoàn tàu */}
      <div className="flex items-center justify-between w-full px-4 py-3 bg-slate-800/80 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`${isBrakeActive ? "train-emergency-brake" : ""}`}>
            <GameAssets.TrainLocomotive />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400 animate-pulse" /> Chuyến Tàu Sinh Tử (Bản đồ {gridCols}×{gridRows})
            </div>
            <div className="text-sm font-black text-slate-200">
              Vị trí tàu: Cột {train.x + 1}/{gridCols} (Hàng {train.y + 1}) • Hướng:{" "}
              {train.dx > 0 ? "Đông ➔" : train.dx < 0 ? "Tây ⬅" : train.dy > 0 ? "Nam ⬇" : "Bắc ⬆"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!train.reachedStation && (
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${
                train.isDerailed
                  ? "bg-red-500/20 border-red-400/50 text-red-300 animate-pulse"
                  : isBrakeActive
                  ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                  : isBoilerOverdrive
                  ? "bg-rose-500/20 border-rose-400/50 text-rose-300 animate-pulse"
                  : "bg-cyan-500/15 border-cyan-400/30 text-cyan-300"
              }`}
            >
              <Clock size={14} />
              {train.isDerailed
                ? `Sửa trật bánh: ${derailCountdown}s`
                : isBrakeActive
                ? "Đang kéo Phanh Khẩn Cấp (Đứng yên)"
                : `Tàu nhích 1 ô sau: ${tickCountdown}s`}
            </div>
          )}
          <div className="text-right">
            <div className="text-xs text-slate-400 font-semibold">Mảnh Đường Ray (PLACE_TRACK)</div>
            <div className="text-xl font-black text-emerald-400">{actionPoints} Mảnh Ray</div>
          </div>
          {isBrakeActive && (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold animate-pulse">
              🛑 PHANH KHẨN CẤP (12s)
            </span>
          )}
          {isBoilerOverdrive && (
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/40 text-xs font-bold animate-pulse">
              🔥 TĂNG ÁP LÒ HƠI x2
            </span>
          )}
        </div>
      </div>

      {/* Thông báo Trật bánh tạm thời (10s) hoặc cập bến Ga Đích */}
      {train.isDerailed && (
        <div className="w-full py-2.5 px-4 bg-red-600/30 border border-red-500 rounded-xl text-red-200 text-sm font-bold flex items-center justify-center gap-2 animate-bounce">
          <AlertTriangle size={18} className="text-red-400" />
          CẢNH BÁO TRẬT BÁNH TẠM THỜI: Tàu thiếu ray nối tiếp! Bị dừng sửa chữa 10 giây (-50đ) — Hãy đặt mảnh ray vào ô tiếp theo để tàu chạy tiếp!
        </div>
      )}
      {train.reachedStation && (
        <div className="w-full py-2.5 px-4 bg-emerald-600/30 border border-emerald-500 rounded-xl text-emerald-200 text-sm font-bold flex items-center justify-center gap-2">
          <Trophy size={18} className="text-amber-400" />
          XUẤT SẮC: Tàu đã cập bến Ga Đích (Cột 12) an toàn! Hoàn thành sứ mệnh!
        </div>
      )}

      {/* Bản đồ lưới 12x8 */}
      <div className="relative p-3 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner overflow-x-auto max-w-full">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(36px, 44px))`,
            gridTemplateRows: `repeat(${gridRows}, minmax(36px, 44px))`,
          }}
        >
          {Array.from({ length: gridRows }).map((_, y) =>
            Array.from({ length: gridCols }).map((_, x) => {
              const isTrain = train.x === x && train.y === y;
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
                  className={`relative flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer select-none border ${
                    isTrain
                      ? "bg-red-500/40 border-red-400 shadow-lg shadow-red-500/50 scale-105 z-20"
                      : isStation
                      ? "bg-amber-500/30 border-amber-400 text-amber-300 z-10"
                      : isStartStation
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                      : isObstacle
                      ? "bg-stone-800 border-stone-600 hover:border-red-400 text-stone-300 hover:scale-105"
                      : track
                      ? "bg-cyan-900/40 border-cyan-500/50 text-cyan-300"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-600 hover:bg-slate-800/40"
                  }`}
                  style={{ width: "100%", aspectRatio: "1/1" }}
                  title={`Cột ${x + 1}, Hàng ${y + 1}${isObstacle ? " - Chướng ngại vật đá/hố sâu (Bấm để phá)" : ""}`}
                >
                  {/* Ga xuất phát (Cột 1) */}
                  {isStartStation && !isTrain && (
                    <span className="text-[8px] font-black text-emerald-300">GA ĐẦU</span>
                  )}

                  {/* Trạm đích (Cột 12) */}
                  {isStation && (
                    <div className="flex flex-col items-center">
                      <Trophy size={15} className="text-amber-400 animate-pulse" />
                      <span className="text-[8px] font-black text-amber-300">GA ĐÍCH</span>
                    </div>
                  )}

                  {/* Chướng ngại vật đá / sông suối */}
                  {isObstacle && (
                    <div className="flex flex-col items-center group">
                      <span className="text-sm">🪨</span>
                      <span className="text-[8px] text-stone-400 group-hover:text-red-400">Phá</span>
                    </div>
                  )}

                  {/* Đoạn ray đã đặt */}
                  {!isTrain && track && (
                    <span className="text-base font-black text-cyan-400 drop-shadow">
                      {track.trackType === "STRAIGHT_H" && "━"}
                      {track.trackType === "STRAIGHT_V" && "┃"}
                      {track.trackType === "CURVE_SE" && "┏"}
                      {track.trackType === "CURVE_SW" && "┓"}
                      {track.trackType === "CURVE_NE" && "┗"}
                      {track.trackType === "CURVE_NW" && "┛"}
                    </span>
                  )}

                  {/* Đầu máy xe lửa */}
                  {isTrain && (
                    <div className={`scale-90 ${isBrakeActive ? "train-emergency-brake" : "animate-pulse"}`}>
                      <GameAssets.TrainLocomotive />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Thanh chọn loại ray để ghép (Ray Thẳng hoặc Ray Cua 90 độ) */}
      <div className="flex flex-wrap items-center justify-center gap-2 w-full p-3 bg-slate-800/70 rounded-2xl border border-slate-700">
        <span className="text-xs font-bold text-slate-300 mr-2 flex items-center gap-1">
          <Compass size={14} className="text-cyan-400" /> Chọn Mảnh Ray:
        </span>
        {TRACK_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => setSelectedTrackType(opt.type)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              selectedTrackType === opt.type
                ? "bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/30 scale-105"
                : "bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700"
            }`}
          >
            <span className="text-sm">{opt.symbol}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* 3 Kỹ năng Chiến thuật */}
      <div className="flex flex-wrap items-center justify-between w-full gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleEmergencyBrake}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
            title="Phanh Khẩn Cấp: Kéo phanh giữ tàu của đội mình đứng yên tại chỗ trong 12 giây"
          >
            <ShieldAlert size={15} />
            <span>Phanh Khẩn Cấp (12s)</span>
          </button>

          <button
            type="button"
            onClick={handleSwitchTrack}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
            title="Bẻ Ghi Đường Ray: Xoay ngang 1 mảnh đường ray ngay phía trước mũi tàu đối phương khiến tàu họ rẽ lệch hướng"
          >
            <Shuffle size={15} />
            <span>Bẻ Ghi Đường Ray</span>
          </button>

          <button
            type="button"
            onClick={handleBoilerOverdrive}
            disabled={actionPoints < 1 || isIsolated || submitting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
            title="Tăng Áp Lò Hơi: Làm tàu hỏa của đối phương tăng gấp đôi tốc độ di chuyển trong 10 giây"
          >
            <Flame size={15} />
            <span>Tăng Áp Lò Hơi (10s)</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Mục tiêu: Dẫn đường từ Ga Khởi Hành (Cột 1) đến Ga Đích (Cột 12)!
        </div>
      </div>
    </div>
  );
}
