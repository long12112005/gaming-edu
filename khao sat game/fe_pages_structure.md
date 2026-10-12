# Cấu Trúc Các Trang Frontend (FE) Dự Án Gaming-Edu

Dựa vào mã nguồn của Frontend (Next.js 14+ với App Router), dự án có tổng cộng **14 trang (pages)**. Dưới đây là danh sách phân loại chi tiết các trang này để dễ dàng theo dõi và kiểm tra chức năng:

## 🏠 1. Các trang cơ bản
* **`/`** (`src/app/page.tsx`)
  * **Chức năng:** Trang chủ (Home/Landing Page). Giới thiệu ứng dụng, hiển thị các bộ đề công khai phổ biến để thu hút người chơi.

## 🔐 2. Nhóm trang Xác thực (Authentication)
* **`/auth/login`** (`src/app/auth/login/page.tsx`)
  * **Chức năng:** Đăng nhập vào hệ thống.
* **`/auth/register`** (`src/app/auth/register/page.tsx`)
  * **Chức năng:** Đăng ký tài khoản mới (Có kết hợp xác thực mã OTP gửi về Email).
* **`/auth/forgot-password`** (`src/app/auth/forgot-password/page.tsx`)
  * **Chức năng:** Quên mật khẩu & Đặt lại mật khẩu mới thông qua mã OTP từ Email.

## 📊 3. Nhóm trang Bảng điều khiển (Dashboard)
* **`/dashboard`** (`src/app/dashboard/page.tsx`)
  * **Chức năng:** Tổng quan thông tin tài khoản người dùng, thống kê tóm tắt.
* **`/dashboard/quizzes`** (`src/app/dashboard/quizzes/page.tsx`)
  * **Chức năng:** Quản lý danh sách các bộ đề do chính người dùng tạo.
* **`/dashboard/groups`** (`src/app/dashboard/groups/page.tsx`)
  * **Chức năng:** Quản lý nhóm / Lớp học (Tạo nhóm mới, mời thành viên, phê duyệt vào nhóm).

## 📝 4. Nhóm trang Quản lý Bộ đề (Quizzes & Slides Editor)
* **`/quiz/create`** (`src/app/quiz/create/page.tsx`)
  * **Chức năng:** Khởi tạo thông tin sơ bộ (Tiêu đề, Mô tả) cho một bộ đề mới.
* **`/quiz/[id]/edit`** (`src/app/quiz/[id]/edit/page.tsx`)
  * **Chức năng:** Sửa lại thông tin chung của bộ đề (Tiêu đề, Hình bìa, Chủ đề).
* **`/quiz/[id]`** (`src/app/quiz/[id]/page.tsx`)
  * **Chức năng:** Màn hình Không gian làm việc (Workspace / Slide Editor). Tại đây Host có thể tạo thủ công các câu hỏi, nhập liệu đáp án, tính năng tạo câu hỏi bằng AI, và duyệt các câu hỏi (DRAFT) từ người chơi đề xuất.

## 🎮 5. Nhóm trang Máy chủ trò chơi (Host)
* **`/host/setup/[id]`** (`src/app/host/setup/[id]/page.tsx`)
  * **Chức năng:** Thiết lập phòng chơi trước khi bắt đầu (Chọn chế độ chơi, v.v.). Bấm xác nhận sẽ sinh ra mã PIN phòng.
* **`/host/[roomId]`** (`src/app/host/[roomId]/page.tsx`)
  * **Chức năng:** Màn hình điều khiển chính của Host. Hiển thị mã PIN to ở sảnh đợi, điều khiển bấm Next qua các câu hỏi, hiển thị bảng xếp hạng, quản lý mục Hỏi & Đáp (Q&A), và tải báo cáo Excel cuối game.

## 📱 6. Nhóm trang Người chơi (Player)
* **`/play`** (`src/app/play/page.tsx`)
  * **Chức năng:** Trang dành cho người chơi tham gia. Người chơi nhập Mã PIN và Tên (Nickname) để vào phòng.
* **`/play/[pin]`** (`src/app/play/[pin]/page.tsx`)
  * **Chức năng:** Màn hình tương tác trong lúc chơi của người chơi. Tự động hiển thị các nút đáp án đồng bộ theo thời gian thực (Real-time SignalR) khi Host chuyển câu hỏi, gửi câu hỏi nháp (Draft), hoặc gửi câu hỏi Q&A lên màn hình Host.
