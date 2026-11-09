"use client";

import React, { useState } from "react";
import { GameAssets } from "@/components/common/GameSvgAssets";
import { soundFX } from "@/utils/gameSoundEngine";
import { Shield, Sparkles, Crown, Bomb, Navigation } from "lucide-react";

interface HexCellData {
  r: number;
  c: number;
  owner: string; // NONE | TEAM_A | TEAM_B
  fortified: boolean;
  fortifiedTurns?: number;
  isBase?: boolean;
}

interface HexConquestMapProps {
  boardState: any;
  actionPoints: number;
  playerTeam: string;
  isIsolated: boolean;
  onPerformAction: (actionType: string, payload: any) => Promise<void>;
  onUseSkill: (skillName: string, payload: any) => Promise<void>;
}

export default function HexConquestMap({
  boardState,
  actionPoints,
  playerTeam,
  isIsolated,
  onPerformAction,
  onUseSkill,
}: HexConquestMapProps) {
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [animatingCell, setAnimatingCell] = useState<{ r: number; c: number } | null>(null);
  const [activeSkillMode, setActiveSkillMode] = useState<"NONE" | "PARACHUTE" | "COLOR_BOMB">("NONE");
  const [submitting, setSubmitting] = useState(false);

  const rows = boardState?.rows || 11;
  const cols = boardState?.cols || 11;
  const totalCells = rows * cols;
  const winTarget = Math.floor(totalCells * 0.7) + 1;
  const cells: HexCellData[] = boardState?.cells || [];
  const teamACount = boardState?.teamACells ?? cells.filter((c) => c.owner === "TEAM_A").length;
  const teamBCount = boardState?.teamBCells ?? cells.filter((c) => c.owner === "TEAM_B").length;

  const handleCellClick = async (cell: HexCellData) => {
    if (isIsolated || submitting) return;
    setSelectedCell({ r: cell.r, c: cell.c });

    try {
      setSubmitting(true);
      setAnimatingCell({ r: cell.r, c: cell.c });
      soundFX.playHexClaim();

      if (activeSkillMode === "PARACHUTE") {
        await onUseSkill("PARACHUTE_DROP", { r: cell.r, c: cell.c });
        setActiveSkillMode("NONE");
        return;
      }

      if (activeSkillMode === "COLOR_BOMB") {
        await onUseSkill("COLOR_BOMB", { r: cell.r, c: cell.c });
        setActiveSkillMode("NONE");
        return;
      }

      if (actionPoints < 1 || cell.owner === playerTeam) return;
      await onPerformAction("CLAIM_HEX", { r: cell.r, c: cell.c });
    } finally {
      setSubmitting(false);
      setTimeout(() => setAnimatingCell(null), 600);
    }
  };

  const handleFortify = async () => {
    if (!selectedCell || isIsolated || submitting) return;
    try {
      setSubmitting(true);
      soundFX.playHexClaim();
      await onUseSkill("FORTIFY_HEX", { r: selectedCell.r, c: selectedCell.c });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerColorBombInstant = async () => {
    if (selectedCell) {
      try {
        setSubmitting(true);
        soundFX.playBigExplosion();
        await onUseSkill("COLOR_BOMB", { r: selectedCell.r, c: selectedCell.c });
        setActiveSkillMode("NONE");
      } finally {
        setSubmitting(false);
      }
    } else {
      setActiveSkillMode((prev) => (prev === "COLOR_BOMB" ? "NONE" : "COLOR_BOMB"));
    }
  };

  const handleTriggerParachute = async () => {
    if (selectedCell && cells.find((c) => c.r === selectedCell.r && c.c === selectedCell.c)?.owner === "NONE") {
      try {
        setSubmitting(true);
        soundFX.playHexClaim();
        await onUseSkill("PARACHUTE_DROP", { r: selectedCell.r, c: selectedCell.c });
        setActiveSkillMode("NONE");
      } finally {
        setSubmitting(false);
      }
    } else {
      setActiveSkillMode((prev) => (prev === "PARACHUTE" ? "NONE" : "PARACHUTE"));
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-5xl mx-auto p-4 bg-slate-900/90 rounded-3xl border border-indigo-500/30 backdrop-blur-md shadow-2xl text-white">
      {/* Header trạng thái lãnh thổ */}
      <div className="flex items-center justify-between w-full px-4 py-2.5 bg-slate-800/80 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-3">
          <GameAssets.HexFortress color="#3b82f6" />
          <div>
            <div className="text-xs uppercase tracking-wider text-blue-400 font-bold">Đội A (Tây Bắc)</div>
            <div className="text-xl font-black text-blue-300">
              {teamACount} / {winTarget} Ô ({Math.round((teamACount / totalCells) * 100)}%)
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
            <Crown size={14} /> Thắng tuyệt đối: &gt;70% ({winTarget}/{totalCells} Ô)
          </div>
          <div className="text-xs font-black px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            Bạn: {playerTeam === "TEAM_A" ? "Đội A (Tây Bắc)" : "Đội B (Đông Nam)"} • Lượt chiếm đất: {actionPoints}
          </div>
          {activeSkillMode !== "NONE" && (
            <div className="text-[11px] font-bold text-amber-300 animate-pulse">
              {activeSkillMode === "PARACHUTE"
                ? "🎯 Hãy click vào 1 ô Trung lập bất kỳ trên bản đồ để Nhảy Dù Đột Kích!"
                : "💣 Hãy click vào 1 ô mục tiêu để ném Bom Màu (nhuộm 4 ô)!"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="text-xs uppercase tracking-wider text-rose-400 font-bold">Đội B (Đông Nam)</div>
            <div className="text-xl font-black text-rose-300">
              {teamBCount} / {winTarget} Ô ({Math.round((teamBCount / totalCells) * 100)}%)
            </div>
          </div>
          <GameAssets.HexFortress color="#ef4444" />
        </div>
      </div>

      {/* Lưới Hexagonal tương tác (odd-r layout 11x11 hoặc 17x17) */}
      <div className="relative overflow-x-auto py-5 px-4 flex flex-col items-center select-none max-w-full">
        {Array.from({ length: rows }).map((_, r) => {
          const isOddRow = r % 2 !== 0;
          return (
            <div
              key={`row-${r}`}
              className="flex justify-center -my-2"
              style={{ transform: isOddRow ? "translateX(18px)" : "none" }}
            >
              {Array.from({ length: cols }).map((_, c) => {
                const cell = cells.find((item) => item.r === r && item.c === c) || {
                  r,
                  c,
                  owner: "NONE",
                  fortified: false,
                  isBase: (r + c <= 1) || (r >= rows - 2 && c >= cols - 2 && r + c >= rows + cols - 3),
                };
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isClaimedAnim = animatingCell?.r === r && animatingCell?.c === c;

                let cellColor = "bg-slate-700/60 border-slate-600 hover:bg-slate-600 text-slate-300";
                if (cell.owner === "TEAM_A") {
                  cellColor = "bg-blue-600 border-blue-400 text-white shadow-blue-500/50 shadow-md";
                } else if (cell.owner === "TEAM_B") {
                  cellColor = "bg-rose-600 border-rose-400 text-white shadow-rose-500/50 shadow-md";
                }

                return (
                  <button
                    key={`hex-${r}-${c}`}
                    type="button"
                    onClick={() => handleCellClick(cell)}
                    disabled={isIsolated || submitting}
                    className={`relative w-10 h-11 mx-0.5 transition-all duration-200 cursor-pointer flex items-center justify-center font-black text-[10px] ${cellColor} ${
                      isSelected ? "ring-3 ring-amber-400 scale-110 z-10" : ""
                    } ${isClaimedAnim ? "hex-cell-claimed" : ""}`}
                    style={{
                      clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                    }}
                    title={`Ô (${r}, ${c}) - Sở hữu: ${cell.owner}${cell.isBase ? " (Căn cứ chính)" : ""}${
                      cell.fortified ? ` [Tường Thành: ${cell.fortifiedTurns || 2} lượt]` : ""
                    }`}
                  >
                    {cell.fortified && (
                      <Shield size={12} className="text-amber-300 drop-shadow absolute top-0.5" />
                    )}
                    {cell.isBase ? (
                      <Crown size={11} className="text-yellow-300 drop-shadow" />
                    ) : (
                      <span className="text-[9px] opacity-80">
                        {r},{c}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Thanh kỹ năng chiến thuật & quy tắc Vây Thành Đổi Màu */}
      <div className="flex flex-wrap items-center justify-between w-full px-4 py-3 bg-slate-800/90 rounded-2xl border border-slate-700 gap-3">
        <div className="flex flex-col text-xs text-slate-300">
          <div>
            <span className="font-bold text-amber-400">Lượt Chiếm Đất: {actionPoints}</span> • Ô Trung lập: đổi màu ngay (1 lượt) • Ô Địch: click 1 hạ về Trung lập, click 2 chiếm hẳn.
          </div>
          <div className="text-[11px] text-slate-400">
            ✨ Vây Thành Đổi Màu (BFS Server): Bao vây kín cụm ô địch/trung lập (không chạm biên & căn cứ) sẽ đồng hóa toàn bộ ngay lập tức!
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFortify}
            disabled={!selectedCell || isIsolated || submitting}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Mở khóa ở Combo 2: Đặt khiên bảo vệ ô biên giới của đội mình trong 2 lượt tiếp theo"
          >
            <Shield size={14} />
            <span>Tường Thành (Combo 2)</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerParachute}
            disabled={isIsolated || submitting}
            className={`px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
              activeSkillMode === "PARACHUTE"
                ? "bg-emerald-500 ring-2 ring-amber-300"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
            title="Mở khóa ở Combo 3: Chiếm ngay 1 ô Trung lập ở bất kỳ vị trí nào không cần kề cạnh"
          >
            <Navigation size={14} />
            <span>Nhảy Dù Đột Kích (Combo 3)</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerColorBombInstant}
            disabled={isIsolated || submitting}
            className={`px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
              activeSkillMode === "COLOR_BOMB"
                ? "bg-rose-500 ring-2 ring-amber-300"
                : "bg-purple-600 hover:bg-purple-500"
            }`}
            title="Mở khóa khi đủ 100 Năng lượng (hoặc 2 lượt): Nhuộm màu đồng loạt ô tâm và 3 ô lục giác liền kề"
          >
            <Bomb size={14} />
            <span>Bom Màu (100 NL)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

