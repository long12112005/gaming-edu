export interface MiniGameTheme {
  id: string;
  name: string;
  tagline: string;
  category: "QUIZ" | "FILL_IN_BLANK" | "MATCHING" | "HYBRID";
  categoryLabel: string;
  icon: string;
  gradient: string;
  accentColor: string;
  badgeClass: string;
  borderClass: string;
  description: string;
  techHighlight: string;
}

export const MINI_GAME_CATEGORIES = [
  { id: "ALL", label: "Tất cả", icon: "✨", count: 10, badge: "10" },
  { id: "QUIZ", label: "Game Trắc nghiệm", icon: "🎯", count: 3, badge: "3" },
  { id: "FILL_IN_BLANK", label: "Game Điền khuyết", icon: "✏️", count: 3, badge: "3" },
  { id: "MATCHING", label: "Game Ghép cặp", icon: "🔗", count: 3, badge: "3" },
  { id: "HYBRID", label: "Game Tổng hợp (Mix)", icon: "🐉", count: 1, badge: "1" },
] as const;

export const MINI_GAME_THEMES: MiniGameTheme[] = [
  // ── Nhóm 1: Tối ưu cho Trắc nghiệm (Quiz) ────────────────
  {
    id: "SPEED_RACER",
    name: "Đấu Trường Tốc Độ",
    tagline: "Speed Racer",
    category: "QUIZ",
    categoryLabel: "Trắc Nghiệm",
    icon: "🏎️",
    gradient: "from-amber-500 via-orange-500 to-red-500",
    accentColor: "#f97316",
    badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    borderClass: "border-orange-500/40 hover:border-orange-400",
    description: "Xe đua bứt tốc theo độ nhanh (Speed Multiplier) & chuỗi đúng (Streak Bonus).",
    techHighlight: "Bảng xếp hạng thời gian thực Redis Sorted Set biến điểm số thành tọa độ trên đường đua.",
  },
  {
    id: "BATTLE_ROYALE",
    name: "Sàn Đấu Sinh Tồn",
    tagline: "Battle Royale / Knockout",
    category: "QUIZ",
    categoryLabel: "Trắc Nghiệm",
    icon: "🥊",
    gradient: "from-rose-600 via-red-500 to-pink-600",
    accentColor: "#f43f5e",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    borderClass: "border-rose-500/40 hover:border-rose-400",
    description: "Mỗi người có 3 Tim. Trả lời sai trừ 1 Tim, người trụ lại cuối cùng sẽ bước lên bục Podium.",
    techHighlight: "Tạo kịch tính mỗi khi Host công bố biểu đồ phân bổ đáp án A, B, C, D.",
  },
  {
    id: "QUIZ_WAGER",
    name: "Đặt Cược Trí Tuệ",
    tagline: "Quiz Wager / All-in",
    category: "QUIZ",
    categoryLabel: "Trắc Nghiệm",
    icon: "🎲",
    gradient: "from-purple-600 via-indigo-600 to-blue-600",
    accentColor: "#a855f7",
    badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    borderClass: "border-purple-500/40 hover:border-purple-400",
    description: "Đặt cược 25%, 50% hoặc 100% điểm trước khi mở phương án. Đúng x2, sai trừ điểm cược.",
    techHighlight: "Tạo cơ hội lội ngược dòng ngoạn mục (+1, +3 bậc) trên Leaderboard ở vòng về đích.",
  },

  // ── Nhóm 2: Tối ưu cho Điền khuyết (Fill-in-the-blank) ───
  {
    id: "DEFUSE_BOMB",
    name: "Gỡ Bom Hẹn Giờ",
    tagline: "Defuse the Bomb",
    category: "FILL_IN_BLANK",
    categoryLabel: "Điền Khuyết",
    icon: "💣",
    gradient: "from-red-600 via-amber-600 to-yellow-500",
    accentColor: "#ef4444",
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/30",
    borderClass: "border-red-500/40 hover:border-red-400",
    description: "Gõ từ khóa giải cứu quả bom đếm ngược. Điền đúng từng ô trống sẽ cắt từng dây bom.",
    techHighlight: "Thuật toán Fuzzy Matching 4 bước hỗ trợ gõ nhanh trên điện thoại không lo lỗi dấu Tiếng Việt.",
  },
  {
    id: "WORD_HUNTER",
    name: "Giải Mã Ô Chữ Bí Ẩn",
    tagline: "Word Hunter / Crossword",
    category: "FILL_IN_BLANK",
    categoryLabel: "Điền Khuyết",
    icon: "🔍",
    gradient: "from-teal-600 via-emerald-600 to-green-500",
    accentColor: "#14b8a6",
    badgeClass: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    borderClass: "border-teal-500/40 hover:border-teal-400",
    description: "Hiển thị ô vuông ký tự gợi ý mở dần theo thời gian. Điểm thưởng giảm dần theo từng giây.",
    techHighlight: "Vận hành mượt mà ở cả Live lẫn Giải đấu nhờ đồng hồ đếm ngược cá nhân trên Redis.",
  },
  {
    id: "BRIDGE_BUILDER",
    name: "Xây Cầu Qua Sông",
    tagline: "Bridge Builder",
    category: "FILL_IN_BLANK",
    categoryLabel: "Điền Khuyết",
    icon: "🌉",
    gradient: "from-sky-600 via-blue-600 to-indigo-500",
    accentColor: "#0284c7",
    badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    borderClass: "border-sky-500/40 hover:border-sky-400",
    description: "Mỗi vị trí điền đúng nối một nhịp cầu đưa nhân vật qua sông. Đúng 3/5 ô đi được 60% quãng đường.",
    techHighlight: "Trực quan hóa Partial Credit (tính điểm theo % số vị trí đúng) cực kỳ thân thiện với học sinh.",
  },

  // ── Nhóm 3: Tối ưu cho Ghép cặp (Matching) ───────────────
  {
    id: "MEMORY_MATRIX",
    name: "Lật Thẻ Nhớ Nhanh",
    tagline: "Memory Matrix",
    category: "MATCHING",
    categoryLabel: "Ghép Cặp",
    icon: "🃏",
    gradient: "from-pink-600 via-rose-600 to-amber-500",
    accentColor: "#ec4899",
    badgeClass: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    borderClass: "border-pink-500/40 hover:border-pink-400",
    description: "Mặt lưới thẻ bài úp mở trong 3 giây đầu. Chạm 2 thẻ tương ứng để triệt tiêu khỏi màn hình.",
    techHighlight: "Chấm điểm theo tỷ lệ cặp ghép đúng trên tổng số cặp và tốc độ hoàn thành.",
  },
  {
    id: "CIRCUIT_CONNECT",
    name: "Nối Mạch Điện Cao Thế",
    tagline: "Circuit Connect",
    category: "MATCHING",
    categoryLabel: "Ghép Cặp",
    icon: "⚡",
    gradient: "from-amber-400 via-yellow-500 to-amber-600",
    accentColor: "#eab308",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    borderClass: "border-amber-500/40 hover:border-amber-400",
    description: "Kéo dây nguồn điện (Cột A) nối bóng đèn (Cột B). Đúng phát sáng xanh, sai xẹt tia lửa điện.",
    techHighlight: "Hiển thị dòng điện SVG trực quan hóa kết quả chấm điểm từng phần rất đẹp mắt.",
  },
  {
    id: "CONVEYOR_BELT",
    name: "Phân Loại Thần Tốc",
    tagline: "Conveyor Belt Sorter",
    category: "MATCHING",
    categoryLabel: "Ghép Cặp",
    icon: "🏭",
    gradient: "from-emerald-600 via-teal-600 to-cyan-500",
    accentColor: "#10b981",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    borderClass: "border-emerald-500/40 hover:border-emerald-400",
    description: "Từ khóa chạy trên băng chuyền, vuốt nhanh thả vào đúng thùng phân loại trước khi rơi mất.",
    techHighlight: "Biến câu hỏi ghép cặp tĩnh thành trò chơi phản xạ tốc độ cao đầy thử thách.",
  },

  // ── Nhóm 4: Tổng hợp ─────────────────────────────────────
  {
    id: "BOSS_RAID",
    name: "Công Thành Chiến / Đánh Boss",
    tagline: "Co-op Boss Raid / Tower Climb",
    category: "HYBRID",
    categoryLabel: "Tổng Hợp (Mix)",
    icon: "🐉",
    gradient: "from-violet-600 via-fuchsia-600 to-pink-500",
    accentColor: "#c084fc",
    badgeClass: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    borderClass: "border-violet-500/40 hover:border-violet-400",
    description: "Cả lớp chung sức đánh 1 Boss lớn (Live) hoặc Leo Tháp Thử Thách độc lập (Async Mode).",
    techHighlight: "Tích hợp cả 3 dạng câu hỏi, cộng dồn sát thương tập thể và vinh danh Top 3 Damage Dealer.",
  },
];

export function getThemeById(themeId?: string): MiniGameTheme {
  return (
    MINI_GAME_THEMES.find((t) => t.id === themeId) ?? MINI_GAME_THEMES[0]
  );
}
