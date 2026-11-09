"use client";

import React, { useState } from "react";
import { GameAssets } from "@/components/common/GameSvgAssets";
import { soundFX } from "@/utils/gameSoundEngine";
import {
  AlertOctagon,
  Activity,
  Vote,
  Wrench,
  Flame,
  Shield,
  Eye,
  Radio,
  Zap,
} from "lucide-react";

interface AmongUsPlayer {
  id: string;
  nickname: string;
  role?: string;
  isIsolated: boolean;
  avatarColor?: string;
}

interface EduAmongUsMapProps {
  boardState: any;
  actionPoints: number;
  playerTeam: string;
  isIsolated: boolean;
  playerRole?: string;
  playersList?: AmongUsPlayer[];
  onPerformAction: (actionType: string, payload: any) => Promise<void>;
  onUseSkill: (skillName: string, payload: any) => Promise<void>;
}

export default function EduAmongUsMap({
  boardState,
  actionPoints,
  playerTeam,
  isIsolated,
  playerRole = "SCIENTIST",
  playersList = [],
  onPerformAction,
  onUseSkill,
}: EduAmongUsMapProps) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const progress = boardState?.stationProgress ?? 0;
  const isMeltdown = boardState?.meltdownActive ?? false;
  const isMeeting = boardState?.meetingActive ?? false;
  const isSystemShield = boardState?.systemShieldActive ?? false;
  const isSignalJam = boardState?.signalJamActive ?? false;
  const caller = boardState?.meetingCallerNickname;
  const activityLog: string[] = boardState?.activityLog || [];

  const isImpostor = playerRole?.toUpperCase() === "IMPOSTOR";

  const handleRepair = async () => {
    if (actionPoints < 1 || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playHexClaim();
      await onPerformAction("REPAIR_TASK", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleSabotage = async () => {
    if (actionPoints < 1 || isIsolated || submitting || !isImpostor) return;
    try {
      setSubmitting(true);
      soundFX.playEmergencyAlarm();
      await onPerformAction("SABOTAGE", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleJamSignal = async () => {
    if (actionPoints < 1 || isIsolated || submitting || !isImpostor) return;
    try {
      setSubmitting(true);
      soundFX.playEmergencyAlarm();
      await onUseSkill("JAM_SIGNAL", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleCallMeeting = async () => {
    if (actionPoints < 1 || isIsolated || submitting || isMeeting) return;
    try {
      setSubmitting(true);
      soundFX.playEmergencyAlarm();
      await onPerformAction("CALL_MEETING", {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async () => {
    if (!selectedSuspect || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playHexClaim();
      await onPerformAction("VOTE_ISOLATE", { suspectPlayerId: selectedSuspect });
      setSelectedSuspect(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometricScan = async () => {
    if (isIsolated || submitting) return;
    try {
      setSubmitting(true);
      setShowScanner(true);
      soundFX.playTowerLaser();
      await onUseSkill("BIOMETRIC_SCAN", { targetPlayerId: selectedSuspect || "" });
      setTimeout(() => setShowScanner(false), 2500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSystemShield = async () => {
    if (actionPoints < 1 || isIsolated || submitting || isImpostor) return;
    try {
      setSubmitting(true);
      soundFX.playCorrectCombo(2);
      await onUseSkill("SYSTEM_SHIELD", {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center gap-4 w-full max-w-5xl mx-auto p-4 rounded-3xl border backdrop-blur-md shadow-2xl text-white transition-all duration-300 ${
        isMeltdown
          ? "impostor-sabotage-alarm border-red-500 bg-red-950/70"
          : "border-purple-500/30 bg-slate-900/95"
      }`}
    >
      {/* Tia quét sinh trắc học */}
      {showScanner && (
        <div className="absolute inset-x-0 h-16 biometric-scanner-beam pointer-events-none z-30 opacity-70" />
      )}

      {/* Header trạng thái Trạm Không Gian & Vai trò bí mật (80% Nhà Khoa Học / 20% Nội Gián) */}
      <div className="flex items-center justify-between w-full px-4 py-3 bg-slate-800/80 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-3">
          <GameAssets.AstronautCrew
            color={isImpostor ? "#ef4444" : "#3b82f6"}
            isIsolated={isIsolated}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                Thân phận bí mật:
              </span>
              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                  isImpostor
                    ? "bg-red-500/30 text-red-300 border-red-400/50 animate-pulse"
                    : "bg-cyan-500/30 text-cyan-300 border-cyan-400/50"
                }`}
              >
                {isImpostor ? "😈 NỘI GIÁN (20% IMPOSTOR)" : "🔬 NHÀ KHOA HỌC (80% SCIENTIST)"}
              </span>
              {isSystemShield && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  🛡️ Bảo Toàn Hệ Thống (15s)
                </span>
              )}
              {isSignalJam && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse">
                  ⚡ Nhiễu Tín Hiệu (8s)
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-slate-300 mt-0.5">
              {isImpostor
                ? "Trả lời đúng = +0% tiến độ trạm (ngụy trang) & nhận +1 Điểm Phá Hoại!"
                : "Trả lời đúng = Tự động +3% tiến độ Trạm Không Gian & nhận +1 Điểm Tác Vụ!"}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 font-semibold">
            {isImpostor ? "Điểm Phá Hoại" : "Điểm Tác Vụ"}
          </div>
          <div className="text-xl font-black text-amber-400">{actionPoints} Điểm</div>
        </div>
      </div>

      {/* Thanh tiến độ sửa chữa Trạm Không Gian (Khởi đầu 0% -> Mục tiêu 100%) */}
      <div className="w-full flex flex-col gap-1 px-2">
        <div className="flex justify-between items-center text-xs font-bold">
          <span className="text-slate-300 flex items-center gap-1.5">
            <Radio size={14} className="text-cyan-400 animate-pulse" />
            Tiến độ Năng lượng Trạm Không Gian (Khởi đầu 0% ➔ Đích 100%):
          </span>
          <span
            className={`text-sm font-black ${
              progress >= 80 ? "text-emerald-400" : progress <= 30 ? "text-red-400" : "text-amber-400"
            }`}
          >
            {progress}% / 100%
          </span>
        </div>
        <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              progress >= 80
                ? "bg-gradient-to-r from-emerald-500 to-green-400"
                : progress <= 30
                ? "bg-gradient-to-r from-red-600 to-rose-500"
                : "bg-gradient-to-r from-cyan-500 to-blue-500"
            }`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      </div>

      {/* Báo động khẩn cấp hoặc Phiên Họp Bỏ Phiếu Cách Ly */}
      {isMeltdown && (
        <div className="w-full py-2.5 px-4 bg-red-600/30 border border-red-500 rounded-xl text-red-200 text-sm font-bold flex items-center justify-center gap-2 animate-pulse">
          <AlertOctagon size={18} className="text-red-400" />
          BÁO ĐỘNG ĐỎ: Lò phản ứng bị Nội gián đánh sập (-8% năng lượng)!
        </div>
      )}

      {(isMeeting || selectedSuspect) && (
        <div className="w-full py-2.5 px-4 bg-amber-600/30 border border-amber-500 rounded-xl text-amber-200 text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Vote size={18} className="text-amber-400 animate-bounce" />
            <span>
              PHIÊN HỌP BỎ PHIẾU CÁCH LY (Cách ly 2 câu hỏi • Nếu trúng Nội gián: +10% năng lượng trạm!)
            </span>
          </div>
          {selectedSuspect && (
            <button
              type="button"
              onClick={handleVote}
              disabled={submitting}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black shadow-lg"
            >
              Xác nhận Bỏ Phiếu Cách Ly
            </button>
          )}
        </div>
      )}

      {/* Danh sách phi hành gia trong phòng (Click để chọn Quét Sinh Trắc hoặc Bỏ Phiếu Cách Ly) */}
      <div className="w-full p-4 bg-slate-800/70 rounded-2xl border border-slate-700">
        <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Activity size={14} className="text-purple-400" /> Thành viên trên Trạm Không Gian ({playersList.length || 0}) — Click chọn nghi can để Quét Sinh Trắc hoặc Bỏ Phiếu Cách Ly:
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {playersList.length > 0 ? (
            playersList.map((p, idx) => (
              <div
                key={p.id || idx}
                onClick={() => setSelectedSuspect(p.id === selectedSuspect ? null : p.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  selectedSuspect === p.id
                    ? "bg-red-900/60 border-red-400 ring-2 ring-red-400/50 scale-105"
                    : p.isIsolated
                    ? "bg-slate-900/40 border-slate-800 opacity-50 grayscale"
                    : "bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500"
                }`}
              >
                <div className="scale-75">
                  <GameAssets.AstronautCrew
                    color={p.avatarColor || (idx % 2 === 0 ? "#38bdf8" : "#ec4899")}
                    isIsolated={p.isIsolated}
                  />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-200 truncate">{p.nickname}</div>
                  <div className="text-[10px] text-slate-400">
                    {p.isIsolated ? "🔒 Đang bị cách ly (2 câu)" : "Đang hoạt động"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-4 text-xs text-slate-400">
              Đang đồng bộ danh sách phi hành đoàn...
            </div>
          )}
        </div>
      </div>

      {/* Bảng nút Hành động & Kỹ năng Chiến thuật */}
      <div className="flex flex-wrap items-center justify-between w-full gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Kỹ năng của Nhà Khoa Học */}
          {!isImpostor && (
            <>
              <button
                type="button"
                onClick={handleRepair}
                disabled={actionPoints < 1 || isIsolated || submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
                title="Đóng góp thêm +3% tiến độ sửa chữa Trạm Không Gian"
              >
                <Wrench size={15} />
                <span>Sửa Chữa Trạm (+3%)</span>
              </button>

              <button
                type="button"
                onClick={handleBiometricScan}
                disabled={isIsolated || submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
                title="Máy Quét Sinh Trắc Học (Mở khóa ở Combo 4): Kiểm tra 1 người chơi xem trong 3 câu gần nhất họ có đóng góp % nào cho trạm hay không"
              >
                <Eye size={15} />
                <span>Máy Quét Sinh Trắc (Combo 4)</span>
              </button>

              <button
                type="button"
                onClick={handleSystemShield}
                disabled={actionPoints < 1 || isIsolated || submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
                title="Lá Chắn Bảo Toàn Hệ Thống: Khóa thanh tiến độ trạm không bị trừ điểm bởi kỹ năng phá hoại trong 15 giây"
              >
                <Shield size={15} />
                <span>Lá Chắn Hệ Thống (15s)</span>
              </button>
            </>
          )}

          {/* Kỹ năng của Nội Gián */}
          {isImpostor && (
            <>
              <button
                type="button"
                onClick={handleSabotage}
                disabled={actionPoints < 1 || isIsolated || submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg shadow-red-500/20 transition-all animate-pulse"
                title="Đánh Sập Lò Phản Ứng: Trừ trực tiếp -8% vào Thanh tiến độ chung và bật còi báo động đỏ"
              >
                <Flame size={15} />
                <span>Đánh Sập Lò Phản Ứng (-8%)</span>
              </button>

              <button
                type="button"
                onClick={handleJamSignal}
                disabled={actionPoints < 1 || isIsolated || submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
                title="Gây Nhiễu Tín Hiệu: Làm khung câu hỏi của phe Nhà Khoa Học bị nhấp nháy trong 8 giây"
              >
                <Zap size={15} />
                <span>Gây Nhiễu Tín Hiệu (8s)</span>
              </button>
            </>
          )}

          {/* Triệu tập Họp Bỏ Phiếu Cách Ly */}
          <button
            type="button"
            onClick={handleCallMeeting}
            disabled={actionPoints < 1 || isIsolated || submitting || isMeeting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
          >
            <Vote size={15} />
            <span>Mở Họp Bỏ Phiếu Cách Ly</span>
          </button>
        </div>

        {/* Nhật ký trạm nghiên cứu */}
        {activityLog.length > 0 && (
          <div className="text-xs text-slate-200 max-w-full bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
            📡 {activityLog[activityLog.length - 1]}
          </div>
        )}
      </div>
    </div>
  );
}
