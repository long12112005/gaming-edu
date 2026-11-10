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

export const HEX_CONQUEST_THEME: MiniGameTheme = {
  id: "HEX_CONQUEST",
  name: "Đế Chế Lãnh Thổ",
  tagline: "Vây Thành Đổi Màu BFS 11×11",
  icon: "👑",
  gradient: "from-amber-500 via-orange-600 to-yellow-600",
  accentColor: "#f59e0b",
  badgeClass: "bg-amber-500/15 text-amber-600 border-amber-300",
  borderClass: "border-amber-500/40 hover:border-amber-500",
  description:
    "Mở rộng lãnh thổ trên lưới lục giác 11×11 từ góc Tây Bắc & Đông Nam. Bao vây kín cụm ô địch để đồng hóa hàng loạt bằng thuật toán BFS.",
  techHighlight: "Thuật toán loang vùng BFS Server-authoritative & Kỹ năng Tường Thành, Nhảy Dù, Bom Màu.",
  category: "CHIẾN THUẬT VÂY ĐẤT",
};

export const TOWER_DEFENSE_THEME: MiniGameTheme = {
  id: "TOWER_DEFENSE",
  name: "Thủ Thành Tri Thức",
  tagline: "Công Thủ 2 Làn Đường 1000 HP",
  icon: "🛡️",
  gradient: "from-emerald-600 via-teal-600 to-cyan-700",
  accentColor: "#10b981",
  badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-300",
  borderClass: "border-emerald-500/40 hover:border-emerald-500",
  description:
    "Trả lời đúng nhận 100 Vàng (+50 Vàng tốc độ). Xây Tháp Cung, Tháp Băng, Tháp Pháo Laser hoặc thả Quái Trinh Sát & Chiến Xa Bọc Thép công phá căn cứ địch.",
  techHighlight: "Cơ chế Công - Thủ song hành thời gian thực trên 2 làn đường chiến thuật.",
  category: "THỦ THÀNH ĐỐI KHÁNG",
};

export const DRAGON_BOAT_THEME: MiniGameTheme = {
  id: "DRAGON_BOAT",
  name: "Đua Thuyền Vượt Bão",
  tagline: "Đua Thuyền Rồng 1000m",
  icon: "🐉",
  gradient: "from-orange-500 via-red-600 to-rose-700",
  accentColor: "#f97316",
  badgeClass: "bg-orange-500/15 text-orange-600 border-orange-300",
  borderClass: "border-orange-500/40 hover:border-orange-500",
  description:
    "Mỗi câu trả lời đúng tạo 1 Nhịp Chèo (+15m) cùng hiệu ứng Đồng Tâm Hiệp Lực (+5m). Né Xoáy Nước & Đá Ngầm, bật Tăng Tốc Nitro & Phun Mực Đen.",
  techHighlight: "Đường đua sông 4 làn 1000m với chướng ngại vật tự nhiên tại mốc 250m, 500m, 750m.",
  category: "ĐUA TỐC ĐỘ ĐỒNG ĐỘI",
};

export const RUNAWAY_TRAIN_THEME: MiniGameTheme = {
  id: "RUNAWAY_TRAIN",
  name: "Chuyến Tàu Sinh Tử",
  tagline: "Ghép Ray Dẫn Đường 12×8",
  icon: "🚂",
  gradient: "from-rose-600 via-red-600 to-amber-600",
  accentColor: "#e11d48",
  badgeClass: "bg-rose-500/15 text-rose-600 border-rose-300",
  borderClass: "border-rose-500/40 hover:border-rose-500",
  description:
    "Ghép các mảnh ray thẳng & cua 90° trên bản đồ 12×8 dẫn tàu từ Ga Khởi Hành (Cột 1) đến Ga Đích (Cột 12), dùng Bẻ Ghi, Tăng Áp Lò Hơi & Phanh Khẩn Cấp.",
  techHighlight: "Mô phỏng đoàn tàu tự động tiến 1 ô mỗi chu kỳ & kiểm tra hướng ghép ray.",
  category: "SINH TỒN GHÉP ĐƯỜNG",
};

export const ARTILLERY_DUEL_THEME: MiniGameTheme = {
  id: "ARTILLERY_DUEL",
  name: "Pháo Đài Tri Thức",
  tagline: "Đấu Pháo Tọa Độ Vật Lý Parabol",
  icon: "🎯",
  gradient: "from-indigo-600 via-blue-700 to-violet-700",
  accentColor: "#6366f1",
  badgeClass: "bg-indigo-500/15 text-indigo-600 border-indigo-300",
  borderClass: "border-indigo-500/40 hover:border-indigo-500",
  description:
    "Căn chỉnh Góc bắn (15°–80°), Lực bắn (10–100) và Gió (-10 đến +10) vượt ngọn núi giữa bản đồ để bắn sập Pháo đài đối phương (1000 HP).",
  techHighlight: "Tính toán quỹ đạo vật lý ném xiên Parabol & sức cản gió thời gian thực.",
  category: "TỌA ĐỘ VẬT LÝ",
};

export const EDU_AMONG_US_THEME: MiniGameTheme = {
  id: "EDU_AMONG_US",
  name: "Truy Tìm Nội Gián",
  tagline: "Trạm Không Gian Ẩn Danh 20%",
  icon: "🚀",
  gradient: "from-sky-600 via-indigo-700 to-purple-800",
  accentColor: "#0ea5e9",
  badgeClass: "bg-sky-500/15 text-sky-600 border-sky-300",
  borderClass: "border-sky-500/40 hover:border-sky-500",
  description:
    "Nhà Khoa Học (80%) trả lời đúng tự động tăng năng lượng trạm lên 100%, dùng Máy Quét Sinh Trắc & Bỏ phiếu cách ly. Nội Gián (20%) ngụy trang & phá hoại.",
  techHighlight: "Phân vai bí mật phía Server, Máy Quét Sinh Trắc & Phiên họp bỏ phiếu cách ly.",
  category: "SUY LUẬN ẨN DANH",
};

export const QUIZ_BOMBERMAN_THEME: MiniGameTheme = {
  id: "QUIZ_BOMBERMAN",
  name: "Đặt Bom Mê Cung",
  tagline: "Đấu Trường Mê Cung 15×15 (5 Tim HP)",
  icon: "💣",
  gradient: "from-purple-600 via-fuchsia-600 to-rose-600",
  accentColor: "#9333ea",
  badgeClass: "bg-purple-500/15 text-purple-600 border-purple-300",
  borderClass: "border-purple-500/40 hover:border-purple-500",
  description:
    "Trả lời đúng nhận 3 Bước Di Chuyển + 1 Quả Bom Hẹn Giờ trên mê cung 15×15. Nổ chữ thập phá tường gạch (+50đ), trúng địch trừ 1 Tim, cướp 200đ.",
  techHighlight: "Mê cung 15×15, tính toán vụ nổ chữ thập 4 hướng & kỹ năng Đá Bom / Bom Lửa Dài.",
  category: "HÀNH ĐỘNG MÊ CUNG",
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
  HEX_CONQUEST_THEME,
  TOWER_DEFENSE_THEME,
  DRAGON_BOAT_THEME,
  RUNAWAY_TRAIN_THEME,
  ARTILLERY_DUEL_THEME,
  EDU_AMONG_US_THEME,
  QUIZ_BOMBERMAN_THEME,
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
