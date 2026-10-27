export interface AvatarFrame {
  id: string;
  name: string;
  tier: "FREE" | "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  description: string;
  badge?: string;
  badgeBg?: string;
  glowColor: string;
  borderClass: string;
  containerClass: string;
  cornerClass?: string;
  animationClass?: string;
  previewBg: string;
}

export const AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: "default",
    name: "Tối Giản",
    tier: "FREE",
    description: "Khung viền viền xám cơ bản, tinh gọn và thanh lịch.",
    glowColor: "rgba(148, 163, 184, 0.2)",
    borderClass: "border-slate-200 ring-1 ring-slate-300/60 shadow-sm",
    containerClass: "p-0.5 bg-slate-100",
    previewBg: "from-slate-100 to-slate-200",
  },
  {
    id: "bronze",
    name: "Tân Thủ - Đồng",
    tier: "COMMON",
    description: "Khung viền kim loại đồng cổ điển dành cho các tân thủ chăm chỉ.",
    badge: "BRONZE",
    badgeBg: "bg-amber-700/80 text-amber-100",
    glowColor: "rgba(180, 83, 9, 0.25)",
    borderClass: "border-amber-700/80 ring-2 ring-amber-600/40 shadow-md shadow-amber-900/10",
    containerClass: "p-1 bg-gradient-to-br from-amber-600 via-amber-700 to-stone-800",
    previewBg: "from-amber-600 to-amber-900",
  },
  {
    id: "silver",
    name: "Chiến Binh - Bạc",
    tier: "RARE",
    description: "Khung viền bạch kim ánh bạc lấp lánh cho những tay đấu cừ khôi.",
    badge: "SILVER",
    badgeBg: "bg-slate-500/80 text-slate-100",
    glowColor: "rgba(203, 213, 225, 0.4)",
    borderClass: "border-slate-300 ring-2 ring-slate-400/50 shadow-md shadow-slate-400/20",
    containerClass: "p-1 bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-400",
    previewBg: "from-slate-300 to-slate-500",
  },
  {
    id: "gold",
    name: "Quán Quân - Hoàng Kim",
    tier: "EPIC",
    description: "Hào quang hoàng kim rực rỡ dành riêng cho bậc thầy đấu trường.",
    badge: "CHAMPION",
    badgeBg: "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black",
    glowColor: "rgba(245, 158, 11, 0.45)",
    borderClass: "border-amber-400 ring-2 ring-yellow-400/80 shadow-lg shadow-amber-500/30",
    containerClass: "p-1.5 bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600 animate-pulse",
    previewBg: "from-yellow-400 to-amber-600",
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon 2077",
    tier: "EPIC",
    description: "Phong cách tương lai với viền led Cyan - Magenta rực rỡ.",
    badge: "CYBER",
    badgeBg: "bg-cyan-500 text-slate-950 font-black",
    glowColor: "rgba(6, 182, 212, 0.5)",
    borderClass: "border-cyan-400 ring-2 ring-fuchsia-500 shadow-xl shadow-cyan-500/30",
    containerClass: "p-1.5 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-indigo-500",
    previewBg: "from-cyan-500 to-fuchsia-600",
  },
  {
    id: "flame_dragon",
    name: "Hỏa Long Vương",
    tier: "LEGENDARY",
    description: "Ngọn lửa rồng bừng cháy uy quyền, biểu tượng của sự hủy diệt bảng xếp hạng.",
    badge: "🔥 LEGEND",
    badgeBg: "bg-gradient-to-r from-rose-600 to-orange-500 text-white font-black",
    glowColor: "rgba(244, 63, 94, 0.55)",
    borderClass: "border-rose-500 ring-2 ring-orange-500 shadow-xl shadow-rose-600/40",
    containerClass: "p-1.5 bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-400 animate-pulse",
    previewBg: "from-rose-600 to-orange-500",
  },
  {
    id: "cosmic_aurora",
    name: "Vũ Trụ Cực Quang",
    tier: "LEGENDARY",
    description: "Ánh sáng tinh vân huyền bí từ chiều không gian siêu vũ trụ Gaming Edu.",
    badge: "✨ COSMIC",
    badgeBg: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-black",
    glowColor: "rgba(147, 51, 234, 0.55)",
    borderClass: "border-purple-400 ring-2 ring-pink-500/80 shadow-xl shadow-purple-600/40",
    containerClass: "p-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500",
    previewBg: "from-indigo-600 to-purple-800",
  },
  {
    id: "amethyst_gem",
    name: "Bảo Thạch Tím Amethyst",
    tier: "RARE",
    description: "Cắt vát tinh xảo từ tinh thể thạch anh tím quý giá.",
    badge: "💎 GEM",
    badgeBg: "bg-violet-600 text-white font-bold",
    glowColor: "rgba(139, 92, 246, 0.4)",
    borderClass: "border-violet-400 ring-2 ring-purple-400 shadow-md shadow-violet-500/20",
    containerClass: "p-1 bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-700",
    previewBg: "from-violet-500 to-purple-700",
  },
  {
    id: "emerald_nature",
    name: "Ngọc Lục Bảo Trí Tuệ",
    tier: "RARE",
    description: "Năng lượng sinh sôi của thiên nhiên và tri thức xanh trường tồn.",
    badge: "🌿 SAGE",
    badgeBg: "bg-emerald-600 text-white font-bold",
    glowColor: "rgba(16, 185, 129, 0.4)",
    borderClass: "border-emerald-400 ring-2 ring-teal-400 shadow-md shadow-emerald-500/20",
    containerClass: "p-1 bg-gradient-to-br from-emerald-400 via-teal-500 to-green-700",
    previewBg: "from-emerald-500 to-teal-700",
  },
];

export function getAvatarFrame(frameId?: string | null): AvatarFrame {
  const found = AVATAR_FRAMES.find((f) => f.id === frameId);
  return found || AVATAR_FRAMES[0];
}
