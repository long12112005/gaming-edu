-- Database Schema cho Hệ thống Khảo sát & Sinh đề AI
-- Chuẩn CSDL: Microsoft SQL Server (T-SQL)

CREATE DATABASE GameEdu;
GO

USE GameEdu;
GO

-- 1. Bảng Users (Người dùng)
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    nickname NVARCHAR(100) NOT NULL,
    avatar_url NVARCHAR(500),
    is_admin BIT DEFAULT 0, -- Trong SQL Server không có kiểu BOOLEAN, dùng BIT (0 là False, 1 là True)
    status NVARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, LOCKED, DELETED
    locked_until DATETIME2, -- SQL Server dùng DATETIME2 thay cho TIMESTAMP
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng User Quotas (Hạn mức tài nguyên)
CREATE TABLE user_quotas (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    user_id UNIQUEIDENTIFIER REFERENCES users(id) ON DELETE CASCADE,
    ai_generation_limit INT DEFAULT 10,
    ai_used_today INT DEFAULT 0,
    max_room_capacity INT DEFAULT 50,
    reset_date DATE,
    UNIQUE(user_id)
);

-- 3. Bảng Groups (Không gian nhóm)
CREATE TABLE groups (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    host_id UNIQUEIDENTIFIER REFERENCES users(id) ON DELETE CASCADE,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    group_code NVARCHAR(10) UNIQUE NOT NULL,
    status NVARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, DISBANDED
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Group Members (Thành viên nhóm)
CREATE TABLE group_members (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    group_id UNIQUEIDENTIFIER REFERENCES groups(id) ON DELETE NO ACTION,
    user_id UNIQUEIDENTIFIER REFERENCES users(id) ON DELETE NO ACTION,
    status NVARCHAR(50) DEFAULT 'PENDING', -- PENDING, ACTIVE, REJECTED
    joined_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- 5. Bảng Quizzes (Thư viện Bộ đề)
CREATE TABLE quizzes (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    creator_id UNIQUEIDENTIFIER REFERENCES users(id) ON DELETE CASCADE,
    title NVARCHAR(255) NOT NULL,
    cover_image_url NVARCHAR(500),
    topic NVARCHAR(100),
    is_public BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng Slides (Chi tiết Câu hỏi/Slide)
CREATE TABLE slides (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    quiz_id UNIQUEIDENTIFIER REFERENCES quizzes(id) ON DELETE CASCADE,
    type NVARCHAR(50) NOT NULL, -- QUIZ, FILL_IN_BLANK, MATCHING, POLL, WORD_CLOUD
    question_text NVARCHAR(MAX) NOT NULL,
    time_limit INT DEFAULT 30,
    points INT DEFAULT 1000,
    status NVARCHAR(50) DEFAULT 'PUBLISHED', -- DRAFT (chờ duyệt), PUBLISHED (đã duyệt)
    order_index INT NOT NULL,
    is_ai_generated BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bảng Slide Options (Đáp án/Cặp/Từ khóa)
CREATE TABLE slide_options (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    slide_id UNIQUEIDENTIFIER REFERENCES slides(id) ON DELETE CASCADE,
    content NVARCHAR(MAX) NOT NULL,
    is_correct BIT DEFAULT 0,
    matching_pair NVARCHAR(MAX), -- Dùng cho câu ghép cặp
    blank_keywords NVARCHAR(255), -- Từ khóa chấp nhận (câu điền khuyết)
    order_index INT DEFAULT 0
);

-- 8. Bảng AI Jobs (Hàng đợi sinh đề)
CREATE TABLE ai_jobs (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    user_id UNIQUEIDENTIFIER REFERENCES users(id) ON DELETE NO ACTION,
    quiz_id UNIQUEIDENTIFIER REFERENCES quizzes(id) ON DELETE NO ACTION,
    file_url NVARCHAR(500) NOT NULL,
    status NVARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    error_message NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME2
);

-- 9. Bảng Rooms (Phòng chơi/Khảo sát thời gian thực)
CREATE TABLE rooms (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    host_id UNIQUEIDENTIFIER REFERENCES users(id) ON DELETE NO ACTION,
    quiz_id UNIQUEIDENTIFIER REFERENCES quizzes(id) ON DELETE NO ACTION,
    pin_code NVARCHAR(20) UNIQUE NOT NULL,
    mode NVARCHAR(50) NOT NULL, -- HOST_PACED, PLAYER_PACED, ASYNC_TOURNAMENT
    status NVARCHAR(50) DEFAULT 'WAITING', -- WAITING, PLAYING, FINISHED
    start_time DATETIME2,
    end_time DATETIME2,
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

-- 10. Bảng Room Players (Người chơi trong phòng)
CREATE TABLE room_players (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    room_id UNIQUEIDENTIFIER REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UNIQUEIDENTIFIER REFERENCES users(id) ON DELETE NO ACTION,
    nickname NVARCHAR(100) NOT NULL,
    avatar_url NVARCHAR(500),
    total_score INT DEFAULT 0,
    rank INT,
    joined_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bảng Player Responses (Lịch sử trả lời)
CREATE TABLE player_responses (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    room_player_id UNIQUEIDENTIFIER REFERENCES room_players(id) ON DELETE CASCADE,
    slide_id UNIQUEIDENTIFIER REFERENCES slides(id) ON DELETE NO ACTION,
    answer_data NVARCHAR(MAX), -- SQL Server dùng NVARCHAR(MAX) để lưu JSON
    is_correct BIT DEFAULT 0,
    score_awarded INT DEFAULT 0,
    response_time_ms INT,
    answered_at DATETIME2 DEFAULT CURRENT_TIMESTAMP
);

-- Đánh Index để tối ưu truy vấn (Performance Indexes)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_groups_code ON groups(group_code);
CREATE INDEX idx_rooms_pin ON rooms(pin_code);
CREATE INDEX idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX idx_slides_quiz ON slides(quiz_id);
CREATE INDEX idx_slide_options_slide ON slide_options(slide_id);
CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_player_responses_room_player ON player_responses(room_player_id);
