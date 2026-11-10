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
  Cpu,
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

const CREW_PALETTE = [
  "#38bdf8",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#a855f7",
  "#f43f5e",
  "#22d3ee",
  "#84cc16",
];

const SECTORS = [
  "Khoang Lò Phản Ứng",
  "Buồng Chỉ Huy Trung Tâm",
  "Phòng Y Tế Sinh Trắc",
  "Đài Radar Viễn Thông",
];

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
      className={`relative flex flex-col items-center gap-3.5 w-full max-w-5xl mx-auto p-4 rounded-3xl border-2 backdrop-blur-md shadow-[0_0_45px_rgba(56,189,248,0.16)] text-white transition-all duration-300 overflow-hidden ${
        isMeltdown
          ? "impostor-sabotage-alarm border-red-500 bg-gradient-to-b from-red-950/90 via-slate-950 to-red-950/80"
          : "border-cyan-500/40 bg-gradient-to-b from-[#060b19] via-[#0c1428] to-[#080d1a]"
      }`}
    >
      {/* Tia laser quét sinh trắc học toàn màn hình */}
      {showScanner && (
        <div className="absolute inset-x-0 h-16 biometric-scanner-beam pointer-events-none z-30 opacity-80" />
      )}

      {/* BẢNG ĐỊNH DANH THÂN PHẬN BÍ MẬT & ĐIỂM TÁC VỤ KHÔNG GIAN */}
      <div className="flex flex-wrap items-center justify-between w-full px-5 py-3 bg-slate-900/95 rounded-2xl border border-cyan-500/30 gap-3 shadow-inner">
        <div className="flex items-center gap-3.5">
          <div className="p-1 rounded-2xl bg-cyan-950/50 border border-cyan-500/40">
            <GameAssets.AstronautCrew
              color={isImpostor ? "#ef4444" : "#38bdf8"}
              isIsolated={isIsolated}
              isImpostorBadge={isImpostor}
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-cyan-400 font-black">
                Hồ Sơ Định Danh Trạm Orbital-IX:
              </span>
              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                  isImpostor
                    ? "bg-red-500/30 text-red-200 border-red-400 animate-pulse"
                    : "bg-cyan-500/25 text-cyan-200 border-cyan-400/60"
                }`}
              >
                {isImpostor ? "⚠️ NỘI GIÁN (20% IMPOSTOR)" : "🔬 NHÀ KHOA HỌC (80% SCIENTIST)"}
              </span>
              {isSystemShield && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                  🛡️ Lá Chắn Bảo Toàn (15s)
                </span>
              )}
              {isSignalJam && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 animate-pulse">
                  ⚡ Nhiễu Sóng Radar (8s)
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-slate-300 mt-1">
              {isImpostor
                ? "Mục tiêu: Ngụy trang (+0% tiến độ khi trả lời đúng) & dùng Điểm Phá Hoại đánh sập Lò Phản Ứng!"
                : "Mục tiêu: Trả lời đúng tự động +3% Năng lượng Trạm & dùng Máy Quét Sinh Trắc vạch mặt Nội Gián!"}
            </div>
          </div>
        </div>

        <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl px-4 py-1.5 text-right">
          <div className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold">
            {isImpostor ? "Điểm Phá Hoại Ngầm" : "Điểm Tác Vụ Khoa Học"}
          </div>
          <div className="text-xl font-black text-amber-400">{actionPoints} Điểm</div>
        </div>
      </div>

      {/* BẢN ĐỒ KIẾN TRÚC TRẠM VŨ TRỤ 2D (SPACE STATION BLUEPRINT DECK) */}
      <div className="relative w-full rounded-2xl border-2 border-cyan-500/40 bg-[#050a18] p-3.5 overflow-hidden shadow-2xl">
        {/* Nền Vũ Trụ Sao Đêm & Đường Chân Trời Hành Tinh */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e0f2fe_1px,transparent_1px)] [background-size:26px_26px] opacity-25" />

        {/* Sơ đồ 3 Khoang Tàu Vũ Trụ nối nhau bằng Hành Lang Áp Suất */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {/* KHOANG 1 (TÂY): LÒ PHẢN ỨNG NHIỆT HẠCH (REACTOR CORE) */}
          <div
            className={`relative rounded-2xl border-2 p-3 flex flex-col justify-between transition-all ${
              isMeltdown
                ? "bg-red-950/75 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.45)] animate-pulse"
                : "bg-slate-900/90 border-cyan-500/40"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Flame size={14} className={isMeltdown ? "text-red-400" : "text-cyan-400"} />
                KHOANG A: LÒ PHẢN ỨNG
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-emerald-400 border border-emerald-500/30">
                {isMeltdown ? "CRITICAL -8%" : "3,400 K"}
              </span>
            </div>

            {/* Đồ họa Lõi Plasma Hạt Nhân */}
            <div className="my-2 flex items-center justify-center relative h-20">
              <svg viewBox="0 0 160 80" className="w-full h-full">
                {/* Đường ống dẫn Plasma */}
                <rect x="8" y="32" width="144" height="16" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                <line x1="12" y1="40" x2="148" y2="40" stroke={isMeltdown ? "#ef4444" : "#22d3ee"} strokeWidth="4" strokeDasharray="8 4" />
                {/* Vòng xoay Tokamak Core */}
                <circle
                  cx="80"
                  cy="40"
                  r="30"
                  fill="#090d16"
                  stroke={isMeltdown ? "#ef4444" : "#38bdf8"}
                  strokeWidth="3"
                />
                <circle
                  cx="80"
                  cy="40"
                  r="22"
                  fill="none"
                  stroke={isMeltdown ? "#fca5a5" : "#fde047"}
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                <circle cx="80" cy="40" r="11" fill={isMeltdown ? "#dc2626" : "#06b6d4"} />
                <circle cx="80" cy="40" r="5" fill="#ffffff" />
              </svg>
            </div>

            <div className="text-[10px] text-center text-slate-300 font-semibold bg-slate-950/80 py-1 rounded-lg border border-slate-800">
              {isMeltdown ? "⚠️ Đang rò rỉ bức xạ hạt nhân!" : "Hệ thống truyền dẫn Plasma ổn định"}
            </div>
          </div>

          {/* KHOANG 2 (TRUNG TÂM): BUỒNG CHỈ HUY & LÕI NĂNG LƯỢNG TRẠM */}
          <div className="relative rounded-2xl border-2 border-indigo-400/60 bg-gradient-to-b from-slate-900/95 to-indigo-950/80 p-3 flex flex-col justify-between shadow-[0_0_25px_rgba(99,102,241,0.2)]">
            <div className="flex items-center justify-between border-b border-indigo-500/30 pb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Cpu size={14} className="text-amber-400 animate-spin" />
                KHOANG B: TRUNG TÂM CHỈ HUY
              </span>
              <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-400/50">
                {progress}% / 100%
              </span>
            </div>

            {/* Bàn Họp Khẩn Cấp & Nút Báo Động + Thanh Năng Lượng Hologram */}
            <div className="my-2 flex flex-col items-center justify-center gap-2">
              <svg viewBox="0 0 180 68" className="w-full h-16">
                {/* Bàn điều khiển Hologram hình elip */}
                <ellipse
                  cx="90"
                  cy="38"
                  rx="68"
                  ry="22"
                  fill="#1e1b4b"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                />
                <ellipse
                  cx="90"
                  cy="35"
                  rx="52"
                  ry="15"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                />
                {/* Nút Họp Khẩn Cấp Đỏ ở tâm bàn */}
                <rect x="76" y="22" width="28" height="16" rx="4" fill="#334155" stroke="#cbd5e1" strokeWidth="1.2" />
                <circle cx="90" cy="28" r="6" fill="#ef4444" stroke="#fef08a" strokeWidth="1.5" />
              </svg>

              {/* Thanh tiến độ Năng lượng Trạm Không Gian */}
              <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-indigo-400/50 p-0.5">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    progress >= 80
                      ? "bg-gradient-to-r from-emerald-500 to-green-300"
                      : progress <= 30
                      ? "bg-gradient-to-r from-red-600 via-amber-500 to-yellow-300"
                      : "bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400"
                  }`}
                  style={{ width: `${Math.max(6, Math.min(100, progress))}%` }}
                />
              </div>
            </div>

            <div className="text-[10px] text-center text-amber-200 font-bold bg-slate-950/80 py-1 rounded-lg border border-indigo-500/30">
              Đạt 100% Năng lượng ➔ Đội Nhà Khoa Học Chiến Thắng!
            </div>
          </div>

          {/* KHOANG 3 (ĐÔNG): PHÒNG Y TẾ SINH TRẮC & ĐÀI RADAR */}
          <div
            className={`relative rounded-2xl border-2 p-3 flex flex-col justify-between transition-all ${
              isSignalJam
                ? "bg-amber-950/75 border-amber-500 animate-pulse"
                : "bg-slate-900/90 border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Radio size={14} className={isSignalJam ? "text-amber-400" : "text-emerald-400"} />
                KHOANG C: ĐÀI SINH TRẮC
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 border border-cyan-500/30">
                {isSignalJam ? "JAMMED" : "BIO-SCAN OK"}
              </span>
            </div>

            {/* Bệ Quét Sinh Trắc Học MedBay & Màn Hình Radar */}
            <div className="my-2 flex items-center justify-center relative h-20">
              <svg viewBox="0 0 160 80" className="w-full h-full">
                {/* Màn hình sóng Radar bên trái */}
                <circle cx="42" cy="40" r="24" fill="#052e16" stroke="#10b981" strokeWidth="2" />
                <circle cx="42" cy="40" r="14" fill="none" stroke="#34d399" strokeWidth="1" strokeDasharray="3 2" />
                <line x1="42" y1="40" x2="58" y2="24" stroke="#6ee7b7" strokeWidth="2" />
                <circle cx="50" cy="30" r="2.5" fill="#fde047" />

                {/* Bệ Quét Sinh Trắc Học Hologram bên phải */}
                <ellipse cx="116" cy="56" rx="28" ry="11" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
                <ellipse cx="116" cy="56" rx="18" ry="6" fill="#10b981" opacity="0.5" />
                {/* Chùm sáng quét đứng */}
                <polygon
                  points="94,56 102,14 130,14 138,56"
                  fill="rgba(52, 211, 153, 0.22)"
                  stroke="#6ee7b7"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />
              </svg>
            </div>

            <div className="text-[10px] text-center text-slate-300 font-semibold bg-slate-950/80 py-1 rounded-lg border border-slate-800">
              {isSignalJam ? "⚠️ Sóng Radar đang bị Nội gián gây nhiễu!" : "Sẵn sàng quét đóng góp của Nghi can"}
            </div>
          </div>
        </div>
      </div>

      {/* Báo động khẩn cấp hoặc Phiên Họp Bỏ Phiếu Cách Ly */}
      {isMeltdown && (
        <div className="w-full py-2 px-4 bg-red-600/30 border border-red-500 rounded-xl text-red-200 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
          <AlertOctagon size={16} className="text-red-400" />
          BÁO ĐỘNG ĐỎ: Lò phản ứng bị Nội gián phá hoại (-8% năng lượng)! Hãy sửa chữa ngay!
        </div>
      )}

      {(isMeeting || selectedSuspect) && (
        <div className="w-full py-2 px-4 bg-amber-600/30 border border-amber-400 rounded-xl text-amber-200 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Vote size={16} className="text-amber-300 animate-bounce" />
            <span>
              ĐÃ CHỌN NGHI CAN — Bấm &ldquo;Xác nhận Bỏ Phiếu Cách Ly&rdquo; (Khóa 2 câu • Trúng Nội gián thưởng +10% Năng lượng!)
            </span>
          </div>
          {selectedSuspect && (
            <button
              type="button"
              onClick={handleVote}
              disabled={submitting}
              className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border border-yellow-300 text-white rounded-lg text-xs font-black shadow-lg"
            >
              🚨 Xác Nhận Bỏ Phiếu Cách Ly
            </button>
          )}
        </div>
      )}

      {/* HỒ SƠ SINH TRẮC HỌC PHI HÀNH ĐOÀN (CREW BIOMETRIC DOSSIERS) */}
      <div className="w-full p-3.5 bg-slate-900/90 rounded-2xl border border-cyan-500/30">
        <div className="text-xs font-black text-cyan-300 mb-2.5 flex items-center justify-between uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Activity size={14} className="text-emerald-400" /> Hồ Sơ Sinh Trắc Học Phi Hành Đoàn ({playersList.length || 0}) — Click chọn nghi can để Quét hoặc Cách Ly:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {playersList.length > 0 ? (
            playersList.map((p, idx) => {
              const isSelected = selectedSuspect === p.id;
              const sectorName = SECTORS[idx % SECTORS.length];
              return (
                <div
                  key={p.id || idx}
                  onClick={() => setSelectedSuspect(isSelected ? null : p.id)}
                  className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-red-950/75 border-2 border-red-400 ring-2 ring-red-400/40 scale-[1.03]"
                      : p.isIsolated
                      ? "bg-slate-950/70 border-red-500/50 opacity-75"
                      : "bg-slate-800/80 border-slate-700 hover:bg-slate-800 hover:border-cyan-400/60"
                  }`}
                >
                  <div className="shrink-0">
                    <GameAssets.AstronautCrew
                      color={p.avatarColor || CREW_PALETTE[idx % CREW_PALETTE.length]}
                      isIsolated={p.isIsolated}
                    />
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="text-xs font-black text-white truncate">{p.nickname}</div>
                    <div className="text-[10px] text-cyan-300/90 font-semibold truncate">
                      📍 {sectorName}
                    </div>
                    {/* Đường sóng điện tâm đồ ECG */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <svg viewBox="0 0 60 14" className="w-14 h-3.5">
                        <polyline
                          points="0,7 12,7 16,2 20,12 24,4 28,10 32,7 60,7"
                          fill="none"
                          stroke={p.isIsolated ? "#ef4444" : "#10b981"}
                          strokeWidth="1.6"
                        />
                      </svg>
                      <span
                        className={`text-[9px] font-mono font-bold ${
                          p.isIsolated ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {p.isIsolated ? "LOCKED" : "76 BPM"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-4 text-xs text-slate-400">
              Đang đồng bộ danh sách phi hành đoàn...
            </div>
          )}
        </div>
      </div>

      {/* BẢNG ĐIỀU KHIỂN TÁC VỤ KHOA HỌC & KỸ NĂNG CHIẾN THUẬT */}
      <div className="flex flex-wrap items-center justify-between w-full gap-3 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Kỹ năng của Nhà Khoa Học */}
          {!isImpostor && (
            <>
              <button
                type="button"
                onClick={handleRepair}
                disabled={actionPoints < 1 || isIsolated || submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-300/50 disabled:opacity-40 rounded-xl font-black text-xs shadow-lg transition-all"
                title="Đóng góp thêm +3% tiến độ sửa chữa Trạm Không Gian"
              >
                <Wrench size={15} />
                <span>Sửa Chữa Trạm (+3%)</span>
              </button>

              <button
                type="button"
                onClick={handleBiometricScan}
                disabled={isIsolated || submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/50 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
                title="Máy Quét Sinh Trắc Học (Mở khóa ở Combo 4): Kiểm tra 1 người chơi xem trong 3 câu gần nhất họ có đóng góp % nào cho trạm hay không"
              >
                <Eye size={15} />
                <span>Máy Quét Sinh Trắc (Combo 4)</span>
              </button>

              <button
                type="button"
                onClick={handleSystemShield}
                disabled={actionPoints < 1 || isIsolated || submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 border border-teal-400/50 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
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
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border border-red-400/60 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg shadow-red-500/20 transition-all animate-pulse"
                title="Đánh Sập Lò Phản Ứng: Trừ trực tiếp -8% vào Thanh tiến độ chung và bật còi báo động đỏ"
              >
                <Flame size={15} />
                <span>Đánh Sập Lò Phản Ứng (-8%)</span>
              </button>

              <button
                type="button"
                onClick={handleJamSignal}
                disabled={actionPoints < 1 || isIsolated || submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 border border-purple-400/50 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 border border-yellow-300/50 disabled:opacity-40 rounded-xl font-bold text-xs shadow-lg transition-all"
          >
            <Vote size={15} />
            <span>Mở Họp Bỏ Phiếu Cách Ly</span>
          </button>
        </div>

        {/* Nhật ký trạm nghiên cứu */}
        {activityLog.length > 0 && (
          <div className="text-xs text-cyan-200 max-w-full bg-slate-900/95 px-3 py-1.5 rounded-xl border border-cyan-500/35">
            {activityLog[activityLog.length - 1]}
          </div>
        )}
      </div>
    </div>
  );
}
