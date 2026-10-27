"use client";

import { useState } from "react";
import {
  Gamepad2,
  Trophy,
  Anchor,
  Sparkles,
  Shield,
  Radio,
  Crosshair,
  Users,
  ArrowRight,
  Flame,
  Info,
  CheckCircle2,
  Play,
} from "lucide-react";

interface GameModesSectionProps {
  onOpenCreateRoom?: (initialMode?: "HOST_PACED" | "ASYNC_TOURNAMENT", initialTheme?: string) => void;
  onOpenRulesModal?: () => void;
}

export default function GameModesSection({
  onOpenCreateRoom,
  onOpenRulesModal,
}: GameModesSectionProps) {
  return (
    <section className="py-12 sm:py-16" id="kham-pha-tro-choi">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-black uppercase tracking-wider mb-3 font-heading shadow-2xs">
              <Sparkles size={14} className="text-cyan-600" />
              <span>KHÁM PHÁ CÁC CHẾ ĐỘ CHƠI ĐỘC QUYỀN</span>
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 tracking-tight">
              Khám Phá Trò Chơi & Đấu Trường Học Tập
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-2xl leading-relaxed">
              Các chế độ chơi được thiết kế chuẩn sư phạm và gamification 60 FPS, mang đến trải nghiệm học tập kịch tính, cuốn hút cho mọi lớp học.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
              ⚡ 3 Thể Thức Thi Đấu
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CHẾ ĐỘ NỔI BẬT NHẤT: HẢI TẶC TRI THỨC (EDU NAVAL WAR)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="mb-6 relative rounded-[28px] sm:rounded-[36px] bg-gradient-to-br from-[#0b192c] via-[#0f284e] to-[#143a6d] border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/20 text-white overflow-hidden p-6 sm:p-8 lg:p-10">
          {/* Subtle wave ambient glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Cột trái: Thông tin & Tính năng chiến thuật */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 text-[11px] font-black uppercase tracking-wider font-heading">
                  <Flame size={13} className="text-amber-400 fill-amber-400" />
                  CHẾ ĐỘ MỚI & ĐỘC QUYỀN
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-slate-200 border border-white/15 text-[11px] font-bold">
                  <Users size={13} />
                  Đối Kháng 2 - 50 Người
                </span>
              </div>

              <div>
                <h3 className="font-heading font-black text-3xl sm:text-4xl text-white tracking-tight flex items-center gap-3">
                  <span>Hải Tặc Tri Thức</span>
                  <Anchor size={30} className="text-cyan-400 animate-pulse hidden sm:inline" />
                </h3>
                <p className="text-xs sm:text-sm text-cyan-200 font-bold uppercase tracking-wider mt-1">
                  Edu Naval War · Chiến Hạm Đối Kháng PvP Đồng Đội
                </p>
              </div>

              <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                Biến buổi học thành cuộc đại chiến hạm đội trên biển cả! Cả lớp chia làm 2 liên minh (Đội Đỏ vs Đội Xanh). Trả lời chính xác các câu hỏi kiến thức để nạp đạn pháo kích, kích hoạt Radar quét sương mù, bật Lá chắn bảo vệ và đánh chìm toàn bộ 5 tàu chiến đối phương.
              </p>

              {/* Tactical chips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs">
                  <Crosshair size={16} className="text-cyan-300 shrink-0" />
                  <span className="text-xs font-bold text-slate-200 truncate">
                    Nạp Đạn Khi Trả Lời Đúng
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs">
                  <Radio size={16} className="text-cyan-300 shrink-0" />
                  <span className="text-xs font-bold text-slate-200 truncate">
                    Radar Dò Tìm 3×3
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs">
                  <Shield size={16} className="text-cyan-300 shrink-0" />
                  <span className="text-xs font-bold text-slate-200 truncate">
                    Lá Chắn Phòng Thủ
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenCreateRoom?.("HOST_PACED", "NAVAL_WAR")}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-heading font-black text-sm shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Anchor size={18} />
                  <span>Khởi Tạo Phòng Hải Chiến</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenRulesModal?.()}
                  className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-heading font-bold text-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Info size={16} className="text-cyan-300" />
                  <span>Xem Luật Chơi & Chiến Thuật</span>
                </button>
              </div>
            </div>

            {/* Cột phải: Visual showcase minh họa hạm đội */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-sm rounded-3xl bg-cyan-950/40 border border-cyan-400/30 p-5 backdrop-blur-md shadow-2xl flex flex-col items-center text-center">
                {/* Visual Ship Asset */}
                <div className="w-full h-44 rounded-2xl bg-gradient-to-b from-cyan-900/40 to-blue-950/60 flex items-center justify-center relative overflow-hidden border border-cyan-400/20">
                  <img
                    src="/assets/naval-war/ships/Preview.png"
                    alt="Chiến Hạm Hải Tặc Tri Thức"
                    className="max-h-36 max-w-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-xs rounded-lg text-[10px] font-bold text-cyan-200 flex items-center justify-between">
                    <span>Lưới Mặt Biển 15×15</span>
                    <span>5 Chiến Hạm Độc Lập</span>
                  </div>
                </div>

                {/* Score & Tactical Status Badge Preview */}
                <div className="w-full mt-3.5 grid grid-cols-2 gap-2 text-left">
                  <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/30">
                    <span className="text-[10px] font-bold text-rose-300 uppercase block">Đội Đỏ (Red Fleet)</span>
                    <span className="font-heading font-black text-sm text-white">5 Tàu Chiến</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-500/30">
                    <span className="text-[10px] font-bold text-blue-300 uppercase block">Đội Xanh (Blue Armada)</span>
                    <span className="font-heading font-black text-sm text-white">5 Tàu Chiến</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-cyan-200/80 font-medium">
                  <CheckCircle2 size={13} className="text-cyan-400" />
                  <span>Đồng bộ SignalR thời gian thực 60 FPS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            2 THẺ CHẾ ĐỘ BỔ SUNG: PHÒNG THƯỜNG & PHÒNG GIẢI ĐẤU
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chế độ 2: Phòng Thường (Host-Paced Live) */}
          <div className="bg-white rounded-[28px] border-2 border-slate-200/90 hover:border-indigo-400 p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                  <Gamepad2 size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  KINH ĐIỂN
                </span>
              </div>

              <h3 className="font-heading font-black text-xl text-slate-900 group-hover:text-indigo-600 transition-colors">
                Đấu Trường Trực Tiếp (Phòng Thường)
              </h3>
              <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-0.5 mb-2.5">
                Host-Paced Live Arena
              </p>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Tất cả người chơi thi đấu cùng lúc trên màn hình lớn. Hệ thống tự động đếm ngược, chuyển câu hỏi mượt mà, phân tích phổ điểm tức thì và bục vinh danh Podium 3D.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4 mt-6">
              <span className="text-xs font-semibold text-slate-400">
                Lý tưởng cho lớp học trực tiếp
              </span>
              <button
                type="button"
                onClick={() => onOpenCreateRoom?.("HOST_PACED", "CLASSIC")}
                className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-heading font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={14} fill="currentColor" />
                <span>Mở Phòng Thường</span>
              </button>
            </div>
          </div>

          {/* Chế độ 3: Phòng Giải Đấu (Async Tournament) */}
          <div className="bg-white rounded-[28px] border-2 border-slate-200/90 hover:border-amber-400 p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                  <Trophy size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  TỰ LUYỆN TẬP
                </span>
              </div>

              <h3 className="font-heading font-black text-xl text-slate-900 group-hover:text-amber-600 transition-colors">
                Phòng Giải Đấu 24/7 (Async Tournament)
              </h3>
              <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mt-0.5 mb-2.5">
                Async Tournament & Practice
              </p>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Mở phòng thi bất đồng bộ kéo dài nhiều ngày. Thí sinh tự do vào làm bài với đồng hồ đếm ngược cá nhân, tự động lưu nháp mỗi 30s và đua top trên bảng xếp hạng mở.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4 mt-6">
              <span className="text-xs font-semibold text-slate-400">
                Thích hợp bài tập về nhà & ôn thi
              </span>
              <button
                type="button"
                onClick={() => onOpenCreateRoom?.("ASYNC_TOURNAMENT", "CLASSIC")}
                className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white font-heading font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trophy size={14} />
                <span>Mở Giải Đấu</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
