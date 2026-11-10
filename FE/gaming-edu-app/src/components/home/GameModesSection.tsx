"use client";

import Link from "next/link";
import {
  Gamepad2,
  Trophy,
  Anchor,
  Sparkles,
  Info,
  Play,
} from "lucide-react";
import { GameAssets } from "@/components/common/GameSvgAssets";

const NEW_SEVEN_GAMES = [
  {
    id: "HEX_CONQUEST",
    name: "Đế Chế Lãnh Thổ",
    subtitle: "Hex Conquest · Vây Thành Đổi Màu BFS 11×11",
    badge: "CHIẾN THUẬT VÂY ĐẤT",
    renderSprite: () => <GameAssets.HexFortress color="#3b82f6" />,
    iconBg: "bg-amber-50 border-amber-200 text-amber-600",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Mở rộng lãnh thổ trên lưới lục giác 11×11 từ góc Tây Bắc & Đông Nam. Bao vây kín cụm ô địch để đồng hóa hàng loạt bằng BFS, bật Tường Thành, Nhảy Dù & Bom Màu.",
  },
  {
    id: "TOWER_DEFENSE",
    name: "Thủ Thành Tri Thức",
    subtitle: "Tower Defense · Công Thủ 2 Làn Đường 1000 HP",
    badge: "CÔNG THỦ 1000 HP",
    renderSprite: () => <GameAssets.DefenseTurret teamColor="#10b981" towerType="ARCHER" level={3} />,
    iconBg: "bg-emerald-50 border-emerald-200 text-emerald-600",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Trả lời đúng nhận 100 Vàng (+50 Vàng thưởng tốc độ). Xây Tháp Cung, Tháp Băng, Tháp Laser phòng thủ hoặc thả Quái Trinh Sát & Chiến Xa Bọc Thép công phá căn cứ địch.",
  },
  {
    id: "DRAGON_BOAT",
    name: "Đua Thuyền Vượt Bão",
    subtitle: "Dragon Boat · Đua Thuyền Rồng 1000m",
    badge: "ĐUA SÔNG 1000M",
    renderSprite: () => (
      <div className="scale-75">
        <GameAssets.DragonBoat color="#ef4444" isNitro={true} />
      </div>
    ),
    iconBg: "bg-orange-50 border-orange-200 text-orange-600",
    badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
    desc: "Mỗi câu trả lời đúng tạo 1 Nhịp Chèo (+15m) cùng hiệu ứng Đồng Tâm Hiệp Lực (+5m). Né Xoáy Nước & Đá Ngầm ở mốc 250m, 500m, 750m, bật Tăng Tốc Nitro & Phun Mực Đen.",
  },
  {
    id: "RUNAWAY_TRAIN",
    name: "Chuyến Tàu Sinh Tử",
    subtitle: "Runaway Train · Ghép Ray Dẫn Đường 12×8",
    badge: "GHÉP RAY 12×8",
    renderSprite: () => <GameAssets.TrainLocomotive isOverdrive={true} />,
    iconBg: "bg-rose-50 border-rose-200 text-rose-600",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "Ghép các mảnh ray thẳng & cua 90° trên bản đồ 12×8 dẫn tàu từ Ga Khởi Hành (Cột 1) đến Ga Đích (Cột 12), dùng Bẻ Ghi Đường Ray, Tăng Áp Lò Hơi & Phanh Khẩn Cấp 12s.",
  },
  {
    id: "ARTILLERY_DUEL",
    name: "Pháo Đài Tri Thức",
    subtitle: "Artillery Duel · Đấu Pháo Tọa Độ Parabol",
    badge: "VẬT LÝ PARABOL",
    renderSprite: () => (
      <div className="scale-90">
        <GameAssets.ArtilleryCannon angle={40} color="#4f46e5" isPiercing={true} />
      </div>
    ),
    iconBg: "bg-indigo-50 border-indigo-200 text-indigo-600",
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    desc: "Căn chỉnh Góc bắn (15°–80°), Lực bắn (10–100) và Gió (-10 đến +10) vượt ngọn núi giữa bản đồ để bắn sập Pháo đài đối phương (1000 HP), bắn Đạn Phân Mảnh & Xuyên Núi.",
  },
  {
    id: "EDU_AMONG_US",
    name: "Truy Tìm Nội Gián",
    subtitle: "Edu Among Us · Trạm Không Gian Ẩn Danh 20%",
    badge: "ẨN DANH 20%",
    renderSprite: () => <GameAssets.AstronautCrew color="#0ea5e9" />,
    iconBg: "bg-sky-50 border-sky-200 text-sky-600",
    badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
    desc: "Nhà Khoa Học (80%) trả lời đúng tự động tăng năng lượng trạm lên 100%, dùng Máy Quét Sinh Trắc & Bỏ phiếu cách ly. Nội Gián (20%) ngụy trang 0% và đánh sập lò phản ứng.",
  },
  {
    id: "QUIZ_BOMBERMAN",
    name: "Đặt Bom Mê Cung",
    subtitle: "Quiz Bomberman · Mê Cung 15×15 (5 Tim HP)",
    badge: "MÊ CUNG 15×15",
    renderSprite: () => <GameAssets.TickingBomb isLongFire={true} />,
    iconBg: "bg-purple-50 border-purple-200 text-purple-600",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Trả lời đúng nhận 3 Bước Di Chuyển + 1 Quả Bom Hẹn Giờ trên mê cung 15×15. Nổ chữ thập phá tường gạch (+50đ), trúng địch trừ 1 Tim, cướp 200đ, dùng Bom Lửa Dài & Đá Bom.",
  },
];

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
              ⚡ 10 Chế Độ Chơi & Đấu Trường
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            DANH SÁCH CHẾ ĐỘ CHƠI & ĐẤU TRƯỜNG HỌC TẬP ĐỒNG NHẤT
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Chế độ 1: Hải Tặc Tri Thức (Edu Naval War) */}
          <div className="bg-white rounded-[28px] border-2 border-slate-200/90 hover:border-cyan-400 p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                  <Anchor size={28} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                  HẢI CHIẾN 15×15
                </span>
              </div>

              <h3 className="font-heading font-black text-xl text-slate-900 group-hover:text-cyan-600 transition-colors">
                Hải Tặc Tri Thức
              </h3>
              <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider mt-0.5 mb-2.5">
                Edu Naval War · Chiến Hạm Đối Kháng 2 Phe
              </p>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Đại chiến hạm đội Đội Đỏ vs Đội Xanh (2–50 người). Trả lời chính xác câu hỏi để nạp đạn pháo kích, kích hoạt Radar quét 3×3, bật Lá chắn bảo vệ và đánh chìm 5 tàu chiến đối phương.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-2 mt-6">
              <div className="flex items-center gap-1.5">
                <Link
                  href="/rooms/SOLO/naval"
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs transition-colors"
                >
                  Chơi Thử 1 Người
                </Link>
                <button
                  type="button"
                  onClick={() => onOpenRulesModal?.()}
                  title="Xem Luật Chơi & Chiến Thuật"
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                >
                  <Info size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => onOpenCreateRoom?.("HOST_PACED", "NAVAL_WAR")}
                className="px-4 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-600 text-cyan-700 hover:text-white font-heading font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={14} fill="currentColor" />
                <span>Mở Phòng Chơi</span>
              </button>
            </div>
          </div>

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

          {/* 7 Chế độ trò chơi tương tác với Sprite Đồ họa riêng */}
          {NEW_SEVEN_GAMES.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-[28px] border-2 border-slate-200/90 hover:border-indigo-400 p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div
                    className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform shadow-2xs ${g.iconBg}`}
                  >
                    {g.renderSprite()}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${g.badgeBg}`}
                  >
                    {g.badge}
                  </span>
                </div>

                <h3 className="font-heading font-black text-xl text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {g.name}
                </h3>
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-0.5 mb-2.5">
                  {g.subtitle}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {g.desc}
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-2 mt-6">
                <Link
                  href={`/rooms/SOLO/multi-game?game=${g.id}`}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs transition-colors"
                >
                  Chơi Thử 1 Người
                </Link>
                <button
                  type="button"
                  onClick={() => onOpenCreateRoom?.("HOST_PACED", g.id)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-heading font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Mở Phòng Chơi</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
