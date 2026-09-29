"use client";

import { RoomModeInfo, RoomMode } from "@/types/database";
import { roomModes } from "@/lib/mockData";
import Button from "@/components/ui/Button";
import { Gamepad2, BookOpen, Trophy } from "lucide-react";

const modeIcons: Record<RoomMode, React.ReactNode> = {
  HOST_PACED: <Gamepad2 size={28} className="text-violet-600" />,
  PLAYER_PACED: <BookOpen size={28} className="text-blue-600" />,
  ASYNC_TOURNAMENT: <Trophy size={28} className="text-yellow-500" />,
};

const modeBorderColors: Record<RoomMode, string> = {
  HOST_PACED: "hover:border-violet-300",
  PLAYER_PACED: "hover:border-blue-300",
  ASYNC_TOURNAMENT: "hover:border-yellow-300",
};

const modeIconBg: Record<RoomMode, string> = {
  HOST_PACED: "bg-violet-100",
  PLAYER_PACED: "bg-blue-100",
  ASYNC_TOURNAMENT: "bg-yellow-100",
};

function RoomModeCard({ mode }: { mode: RoomModeInfo }) {
  return (
    <div
      className={`group bg-white rounded-2xl border-2 border-transparent ${modeBorderColors[mode.mode]} shadow-sm p-6 flex flex-col gap-4 card-hover`}
      id={`card-mode-${mode.mode.toLowerCase()}`}
    >
      {/* Icon */}
      <div
        className={`w-14 h-14 rounded-xl ${modeIconBg[mode.mode]} flex items-center justify-center group-hover:scale-110 transition-transform`}
      >
        {modeIcons[mode.mode]}
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="font-800 text-gray-900 mb-2">{mode.label}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{mode.description}</p>
      </div>

      {/* CTA */}
      <Button
        variant={mode.buttonStyle}
        size="sm"
        fullWidth
        id={`btn-mode-${mode.mode.toLowerCase()}`}
      >
        {mode.buttonLabel}
      </Button>
    </div>
  );
}

export default function GameModesSection() {
  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-900 text-gray-900 mb-1">
            Chế Độ Chơi
          </h2>
          <p className="text-sm text-gray-500">
            Chọn loại đề phù hợp với mục tiêu: điều khiển trực tiếp, tự chơi hoặc thi đấu.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {roomModes.map((mode) => (
            <RoomModeCard key={mode.mode} mode={mode} />
          ))}
        </div>
      </div>
    </section>
  );
}
