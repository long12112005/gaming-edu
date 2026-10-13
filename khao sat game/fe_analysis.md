# Phân tích & Kế hoạch triển khai Frontend (Gaming Edu)

Dựa trên cấu trúc thư mục hiện tại của `gaming-edu-app` và các API/Hub đã được xây dựng hoàn thiện ở tầng Backend, dưới đây là phân tích chi tiết và danh sách công việc cần triển khai cho Frontend.

## 1. Công nghệ sử dụng hiện tại
- **Framework:** Next.js (App Router), React 19.
- **Styling:** Tailwind CSS v4, kết hợp `clsx` và `tailwind-merge`.
- **Icons:** `lucide-react`.
- **Call API & Real-time:** `axios` (HTTP API) và `@microsoft/signalr` (WebSocket).
- **Quản lý Session:** `js-cookie` (Lưu JWT).

---

## 2. Kế hoạch chi tiết theo từng Module

### Module 1: Quản lý tài khoản & Phân quyền (`app/auth`)
Backend đã có: `Login`, `Register`, `Send OTP`, `Reset Password`.
**Công việc FE cần làm:**
1. **Trang Đăng nhập (`/auth/login`):** Form đăng nhập, call API lấy JWT Token và lưu vào Cookies.
2. **Trang Đăng ký (`/auth/register`):** 
   - Bước 1: Nhập Email/Password/Nickname -> Call API `SendRegisterOtp`.
   - Bước 2: Hiển thị form nhập 6 số OTP -> Call API `Register` -> Chuyển hướng Dashboard.
3. **Trang Quên mật khẩu (`/auth/forgot-password`):** Nhập email -> Gửi OTP -> Reset mật khẩu.

### Module 2: Dashboard & Quản lý Nhóm (`app/dashboard`)
Backend đã có: API CRUD Quizzes, API CRUD Groups, Notification Hub (Mời vào phòng).
**Công việc FE cần làm:**
1. **Sidebar / Layout:** Hiển thị thông tin User, số lượng Quota AI (lấy từ auth profile).
2. **Không gian của tôi (My Quizzes):** Danh sách bộ đề, nút Tạo mới, Edit, Xóa, Nhân bản.
3. **Quản lý Nhóm (Groups):**
   - Tạo nhóm (lấy Group Code).
   - Tham gia nhóm (nhập Group Code).
   - Host duyệt/từ chối thành viên.
4. **Tích hợp Notification Hub:** Bật connection ngầm trong Layout để lắng nghe sự kiện `InvitedToRoom` (khi Host mời cả nhóm vào chơi). Hiển thị Toast Notification cho phép click "Tham gia ngay".

### Module 3: Slide Builder - Trình tạo đề thi (`app/quiz/[id]`)
Backend đã có: Cấu trúc Slide phức tạp (Multiple Choice, Fill-in-blank, Matching, Word Cloud), AI Generate, duyệt AI.
**Công việc FE cần làm:**
1. **Giao diện Editor:** Panel bên trái danh sách Slide, giữa là khung thiết kế, bên phải là Setting (Thời gian, Điểm, Loại câu hỏi).
2. **Tích hợp tạo đề bằng AI:** Nút upload PDF/DOCX, gọi API tạo AIJob, polling API status mỗi 5s. Khi xong hiển thị slide dạng DRAFT để Host duyệt.
3. **Xử lý các loại câu hỏi:**
   - Cần form nhập `BlankKeywords` cho Fill-in-blank.
   - Cần form nhập `MatchingPair` cho Matching.

### Module 4: Giao diện Host - Điều khiển phòng chơi (`app/host/[roomId]`)
Backend đã có: Tạo phòng (PIN Code), Game Hub, Q&A Hub, Kick/Lock, Podium.
**Công việc FE cần làm:**
1. **Sảnh chờ (Lobby):** Hiển thị PIN Code (cần generate QRCode từ PIN), danh sách người chơi (Live qua SignalR `PlayerJoined`). Nút Lock phòng, click vào người chơi để Kick.
2. **Giao diện điều khiển (In-game):** Nút "Next Slide", đếm ngược 3-2-1. Hiển thị Leaderboard ở giữa các câu hỏi.
3. **Màn hình hiển thị Word Cloud:** Dùng thư viện (như `react-wordcloud` hoặc D3) để hứng data cập nhật liên tục từ SignalR.
4. **Bục vinh danh (Podium) & Xuất báo cáo:** Khi end game, hiển thị Top 3 với hiệu ứng pháo hoa (`canvas-confetti`). Hiển thị nút "Tải báo cáo Excel" gọi API `/export`.

### Module 5: Giao diện Player - Người chơi (`app/play`)
Backend đã có: Tham gia bằng PIN, Submit Answer Queue, Cá nhân hóa kết quả.
**Công việc FE cần làm:**
1. **Sảnh nhập PIN (`/play`):** Nhập mã phòng và nickname.
2. **Chờ Host (Waiting Room):** Màn hình hiển thị "Bạn đã vào phòng, hãy nhìn lên màn hình chính...". Lắng nghe event `SlideStarted` từ Game Hub.
3. **Giao diện tương tác:** Tùy thuộc vào `slide.type`:
   - 4 Nút màu (Quiz).
   - Ô nhập text (Fill-in-blank).
   - Kéo thả ghép nối (Matching).
   - Nhập từ khóa (Word Cloud).
4. **Auto-save (Draft):** Gọi API PUT draft mỗi 10-30s khi đang làm bài.
5. **Hiển thị đúng/sai:** Hứng event `AnswerResult` để nhấp nháy xanh/đỏ màn hình đt.

### Module 6: Tương tác Q&A (Mới bổ sung Backend)
Backend đã có: `QAHub` (Hỏi, Vote, Pin, Hide, Resolve).
**Công việc FE cần làm:**
1. **Player UI:** Nút nổi (Floating Button) góc dưới để mở hộp thoại "Hỏi đáp". Nhập text gửi đi, ấn like (upvote) các câu hỏi khác.
2. **Host UI:** Panel Q&A trên màn hình máy chiếu hoặc màn hình điều khiển. Có nút Pin, Hide, Mark as Resolved.

---

## 3. Kiến trúc State & SignalR đề xuất (FE)
- Khuyến nghị tạo một Custom Hook (ví dụ: `useGameHub` và `useQAHub`) sử dụng Context API (hoặc Zustand) để quản lý kết nối WebSocket tập trung, tránh rò rỉ bộ nhớ hoặc render lại quá nhiều.
- Các biểu đồ kết quả (Chart.js / Recharts) và Pháo hoa (`canvas-confetti`) sẽ được cài bổ sung vào `package.json` khi code đến phần tương ứng.
