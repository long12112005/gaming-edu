// ============================================================
// TypeScript interfaces mapped from database_schema.sql
// ============================================================

// --- users table ---
export interface User {
  id: string; // UNIQUEIDENTIFIER
  email: string; // NVARCHAR(255)
  password_hash: string; // NVARCHAR(255)
  nickname: string; // NVARCHAR(100)
  avatar_url?: string | null; // NVARCHAR(500)
  is_admin: boolean; // BIT (0/1)
  status: "ACTIVE" | "LOCKED" | "DELETED"; // NVARCHAR(50)
  locked_until?: string | null; // DATETIME2
  created_at: string; // DATETIME2
  updated_at: string; // DATETIME2
}

// --- user_quotas table ---
export interface UserQuota {
  id: string;
  user_id: string; // FK -> users.id
  ai_generation_limit: number; // INT DEFAULT 10
  ai_used_today: number; // INT DEFAULT 0
  max_room_capacity: number; // INT DEFAULT 50
  reset_date: string; // DATE
}

// --- groups table ---
export interface Group {
  id: string;
  host_id: string; // FK -> users.id
  name: string; // NVARCHAR(255)
  description?: string | null; // NVARCHAR(MAX)
  group_code: string; // NVARCHAR(10) UNIQUE
  status: "ACTIVE" | "DISBANDED"; // NVARCHAR(50)
  created_at: string;
  updated_at: string;
}

// --- group_members table ---
export interface GroupMember {
  id: string;
  group_id: string; // FK -> groups.id
  user_id: string; // FK -> users.id
  status: "PENDING" | "ACTIVE" | "REJECTED"; // NVARCHAR(50)
  joined_at: string; // DATETIME2
}

// --- quizzes table ---
export interface Quiz {
  id: string;
  creator_id: string; // FK -> users.id
  title: string; // NVARCHAR(255)
  cover_image_url?: string | null; // NVARCHAR(500)
  topic?: string | null; // NVARCHAR(100)
  is_public: boolean; // BIT
  created_at: string;
  updated_at: string;
  // Extended (joined) fields for UI
  slide_count?: number;
  play_count?: number;
  creator_nickname?: string;
  creator_avatar?: string;
}

// --- slides table ---
export type SlideType =
  | "QUIZ"
  | "FILL_IN_BLANK"
  | "MATCHING"
  | "POLL"
  | "WORD_CLOUD";

export interface Slide {
  id: string;
  quiz_id: string; // FK -> quizzes.id
  type: SlideType; // NVARCHAR(50)
  question_text: string; // NVARCHAR(MAX)
  time_limit: number; // INT DEFAULT 30
  points: number; // INT DEFAULT 1000
  status: "DRAFT" | "PUBLISHED"; // NVARCHAR(50)
  order_index: number; // INT
  is_ai_generated: boolean; // BIT
  created_at: string;
}

// --- slide_options table ---
export interface SlideOption {
  id: string;
  slide_id: string; // FK -> slides.id
  content: string; // NVARCHAR(MAX)
  is_correct: boolean; // BIT
  matching_pair?: string | null; // NVARCHAR(MAX) - for MATCHING type
  blank_keywords?: string | null; // NVARCHAR(255) - for FILL_IN_BLANK type
  order_index: number; // INT DEFAULT 0
}

// --- ai_jobs table ---
export type AIJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface AIJob {
  id: string;
  user_id: string; // FK -> users.id
  quiz_id?: string | null; // FK -> quizzes.id
  file_url: string; // NVARCHAR(500)
  status: AIJobStatus; // NVARCHAR(50)
  error_message?: string | null; // NVARCHAR(MAX)
  created_at: string;
  completed_at?: string | null; // DATETIME2
}

// --- rooms table ---
export type RoomMode = "HOST_PACED" | "PLAYER_PACED" | "ASYNC_TOURNAMENT";
export type RoomStatus = "WAITING" | "PLAYING" | "FINISHED";

export interface Room {
  id: string;
  host_id: string; // FK -> users.id
  quiz_id: string; // FK -> quizzes.id
  pin_code: string; // NVARCHAR(20) UNIQUE
  mode: RoomMode; // NVARCHAR(50)
  status: RoomStatus; // NVARCHAR(50)
  start_time?: string | null; // DATETIME2
  end_time?: string | null; // DATETIME2
  created_at: string;
}

// --- room_players table ---
export interface RoomPlayer {
  id: string;
  room_id: string; // FK -> rooms.id
  user_id?: string | null; // FK -> users.id (nullable for guest)
  nickname: string; // NVARCHAR(100)
  avatar_url?: string | null; // NVARCHAR(500)
  total_score: number; // INT DEFAULT 0
  rank?: number | null; // INT
  joined_at: string; // DATETIME2
}

// --- player_responses table ---
export interface PlayerResponse {
  id: string;
  room_player_id: string; // FK -> room_players.id
  slide_id: string; // FK -> slides.id
  answer_data?: unknown; // NVARCHAR(MAX) - JSON stored as string
  is_correct: boolean; // BIT
  score_awarded: number; // INT DEFAULT 0
  response_time_ms?: number | null; // INT
  answered_at: string; // DATETIME2
}

// ============================================================
// UI-specific types (not from DB, used for frontend display)
// ============================================================

export interface SlideTypeInfo {
  type: SlideType;
  label: string;
  icon: string;
  description: string;
  color: string;
  bgColor: string;
}

export interface RoomModeInfo {
  mode: RoomMode;
  label: string;
  icon: string;
  description: string;
  accentColor: string;
  buttonLabel: string;
  buttonStyle: "primary" | "blue" | "yellow";
}

export interface NavbarUser {
  nickname: string;
  avatar_url: string;
  quota: UserQuota;
}

export interface AuthFormState {
  email: string;
  password: string;
  nickname?: string;
}
