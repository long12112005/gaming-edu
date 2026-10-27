export interface MiniGameTheme {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  gradient: string;
  accentColor: string;
  badgeClass?: string;
  borderClass?: string;
  description: string;
  techHighlight?: string;
  category?: string;
  image?: string;
}

export const NAVAL_WAR_THEME: MiniGameTheme = {
  id: "NAVAL_WAR",
  name: "Hải Tặc Tri Thức",
  tagline: "Chiến Hạm Đối Kháng PvP 50 Người",
  icon: "⚓",
  gradient: "from-cyan-600 via-blue-600 to-indigo-700",
  accentColor: "#06b6d4",
  badgeClass: "bg-cyan-500/15 text-cyan-600 border-cyan-300",
  borderClass: "border-cyan-500/40 hover:border-cyan-500",
  description:
    "Đấu trường chiến thuật Bắn Tàu chia 2 phe Đội Đỏ vs Đội Xanh. Trả lời đúng câu hỏi để nạp đạn pháo, kích hoạt Radar dò hạm đội địch và Lá chắn bảo vệ tàu.",
  techHighlight: "Bản đồ lưới 15x15, 5 lớp chiến hạm và đồng bộ phát bắn SignalR 60 FPS.",
  category: "CHIẾN THUẬT ĐỐI KHÁNG",
  image: "/assets/naval-war/ships/Preview.png",
};

export const STANDARD_ARENA_THEME: MiniGameTheme = {
  id: "STANDARD_ARENA",
  name: "Đấu Trường Trực Tiếp",
  tagline: "Phòng Thi Trắc Nghiệm Cùng Lớp",
  icon: "🎮",
  gradient: "from-indigo-600 via-purple-600 to-pink-600",
  accentColor: "#6366f1",
  badgeClass: "bg-indigo-500/15 text-indigo-600 border-indigo-300",
  borderClass: "border-indigo-500/40 hover:border-indigo-500",
  description:
    "Cả lớp cùng thi đấu trực tiếp theo thời gian thực. Hệ thống tự động chuyển câu hỏi, bục vinh danh Podium 3D và thống kê phổ điểm tức thì.",
  techHighlight: "Đồng bộ SignalR thời gian thực & biểu đồ tỷ lệ lựa chọn",
  category: "TRỰC TIẾP CÙNG LỚP",
};

export const ASYNC_TOURNAMENT_THEME: MiniGameTheme = {
  id: "ASYNC_TOURNAMENT",
  name: "Phòng Giải Đấu 24/7",
  tagline: "Đua Top Bảng Xếp Hạng Độc Lập",
  icon: "🏆",
  gradient: "from-amber-500 via-orange-500 to-red-500",
  accentColor: "#f59e0b",
  badgeClass: "bg-amber-500/15 text-amber-600 border-amber-300",
  borderClass: "border-amber-500/40 hover:border-amber-500",
  description:
    "Mở phòng thi đấu bất đồng bộ dài ngày. Người chơi tự do vào làm bài với đồng hồ đếm ngược cá nhân, tự động lưu nháp mỗi 30s.",
  techHighlight: "Xếp hạng cá nhân bất đồng bộ & tính điểm theo tốc độ trả lời",
  category: "GIẢI ĐẤU MỞ RỘNG",
};

export const MINI_GAME_THEMES: MiniGameTheme[] = [
  NAVAL_WAR_THEME,
  STANDARD_ARENA_THEME,
  ASYNC_TOURNAMENT_THEME,
];

export const DEFAULT_THEME = STANDARD_ARENA_THEME;

export function getThemeById(themeId?: string): MiniGameTheme {
  if (!themeId) return DEFAULT_THEME;
  const found = MINI_GAME_THEMES.find(
    (t) => t.id.toUpperCase() === themeId.toUpperCase()
  );
  return found || DEFAULT_THEME;
}
