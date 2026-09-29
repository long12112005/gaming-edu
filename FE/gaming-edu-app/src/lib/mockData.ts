import {
  Quiz,
  SlideTypeInfo,
  RoomModeInfo,
  NavbarUser,
} from "@/types/database";

// ============================================================
// MOCK USER DATA
// ============================================================
export const mockCurrentUser: NavbarUser = {
  nickname: "Alex_Nhật",
  avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  quota: {
    id: "quota-001",
    user_id: "user-001",
    ai_generation_limit: 10,
    ai_used_today: 3,
    max_room_capacity: 50,
    reset_date: "2026-09-26",
  },
};

// ============================================================
// MOCK QUIZ DATA (maps to quizzes table)
// ============================================================
export const mockPublicQuizzes: Quiz[] = [
  {
    id: "quiz-001",
    creator_id: "user-001",
    title: "Phương Trình Bậc Hai",
    cover_image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=250&fit=crop",
    topic: "TOÁN HỌC",
    is_public: true,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    slide_count: 12,
    play_count: 3400,
    creator_nickname: "Thầy Minh",
    creator_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ThayMinh",
  },
  {
    id: "quiz-002",
    creator_id: "user-002",
    title: "Hệ Mặt Trời",
    cover_image_url: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=400&h=250&fit=crop",
    topic: "KHOA HỌC",
    is_public: true,
    created_at: "2026-09-05T00:00:00Z",
    updated_at: "2026-09-05T00:00:00Z",
    slide_count: 20,
    play_count: 2100,
    creator_nickname: "Cô Lan",
    creator_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CoLan",
  },
  {
    id: "quiz-003",
    creator_id: "user-003",
    title: "Thời Kỳ Phục Hưng",
    cover_image_url: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&h=250&fit=crop",
    topic: "LỊCH SỬ",
    is_public: true,
    created_at: "2026-09-10T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
    slide_count: 15,
    play_count: 750,
    creator_nickname: "Thầy Tuấn",
    creator_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ThayTuan",
  },
  {
    id: "quiz-004",
    creator_id: "user-004",
    title: "Từ Vựng Mới",
    cover_image_url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=250&fit=crop",
    topic: "NGỮ VĂN",
    is_public: true,
    created_at: "2026-09-15T00:00:00Z",
    updated_at: "2026-09-15T00:00:00Z",
    slide_count: 30,
    play_count: 1600,
    creator_nickname: "Cô Hoa",
    creator_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CoHoa",
  },
];

// ============================================================
// SLIDE TYPES (maps to slides.type column)
// ============================================================
export const slideTypes: SlideTypeInfo[] = [
  {
    type: "QUIZ",
    label: "Trắc Nghiệm",
    icon: "🎯",
    description: "Câu hỏi nhiều lựa chọn",
    color: "#7c3aed",
    bgColor: "rgba(124, 58, 237, 0.12)",
  },
  {
    type: "FILL_IN_BLANK",
    label: "Điền Khuyết",
    icon: "✏️",
    description: "Điền vào chỗ trống",
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.12)",
  },
  {
    type: "MATCHING",
    label: "Ghép Nối",
    icon: "🔗",
    description: "Nối cặp câu trả lời",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.12)",
  },
  {
    type: "POLL",
    label: "Bình Chọn",
    icon: "📊",
    description: "Khảo sát ý kiến",
    color: "#ec4899",
    bgColor: "rgba(236, 72, 153, 0.12)",
  },
  {
    type: "WORD_CLOUD",
    label: "Đám Mây Từ Vựng",
    icon: "☁️",
    description: "Brainstorm từ vựng",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.12)",
  },
];

// ============================================================
// ROOM MODES (maps to rooms.mode column)
// ============================================================
export const roomModes: RoomModeInfo[] = [
  {
    mode: "HOST_PACED",
    label: "Host Điều Khiển",
    icon: "🎮",
    description:
      "Điều khiển toàn bộ tốc độ của các câu. Phù hợp cho buổi học trực tiếp và thuyết trình.",
    accentColor: "#7c3aed",
    buttonLabel: "Khởi Tạo",
    buttonStyle: "primary",
  },
  {
    mode: "PLAYER_PACED",
    label: "Người Chơi Tự Chơi",
    icon: "🕹️",
    description:
    "Học sinh tự hoàn thành theo tốc độ riêng. Phù hợp để tự học và ôn tập.",
    accentColor: "#3b82f6",
    buttonLabel: "Giao Bài",
    buttonStyle: "blue",
  },
  {
    mode: "ASYNC_TOURNAMENT",
    label: "Giải Đấu",
    icon: "🏆",
    description:
      "Cho học sinh tham gia bất kỳ lúc nào trong thời gian định. Bảng xếp hạng toàn cầu.",
    accentColor: "#f59e0b",
    buttonLabel: "Khởi Động",
    buttonStyle: "yellow",
  },
];

// ============================================================
// QUIZ BADGE LABELS
// ============================================================
export const getQuizBadge = (index: number): { label: string; className: string } => {
  const badges = [
    { label: "TOÁN HỌC", className: "badge-hot" },
    { label: "KHOA HỌC", className: "badge-featured" },
    { label: "LỊCH SỬ", className: "badge-new" },
    { label: "NGỮ VĂN", className: "badge-new" },
  ];
  return badges[index % badges.length];
};
