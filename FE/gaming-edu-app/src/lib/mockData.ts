import {
  Quiz,
  SlideTypeInfo,
  RoomModeInfo,
} from "@/types/database";

// Empty quizzes array
export const mockPublicQuizzes: Quiz[] = [];

// ============================================================
// SLIDE TYPES METADATA (maps to slides.type column)
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
// ROOM MODES METADATA (maps to rooms.mode column)
// ============================================================
export const roomModes: RoomModeInfo[] = [
  {
    mode: "HOST_PACED",
    label: "Phòng Thường",
    icon: "🎮",
    description:
      "Thi đấu trực tiếp cùng lúc. Hệ thống tự động đếm ngược và chuyển câu hỏi, chủ phòng theo dõi và có quyền kết thúc trò chơi.",
    accentColor: "#7c3aed",
    buttonLabel: "Tạo Phòng Thường",
    buttonStyle: "primary",
  },
  {
    mode: "ASYNC_TOURNAMENT",
    label: "Phòng Giải Đấu",
    icon: "🏆",
    description:
      "Mở giải đấu bảng xếp hạng, người tham gia làm bài bất đồng bộ với timer cá nhân, tự động lưu nháp.",
    accentColor: "#f59e0b",
    buttonLabel: "Tạo Giải Đấu",
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
