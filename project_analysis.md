# Phân Tích Chi Tiết Dự Án Gaming-EDU 
Dưới đây là bảng đối chiếu chi tiết giữa tài liệu yêu cầu (PDF) và tình trạng thực tế của codebase hiện tại, phân rã đến từng module nhỏ nhất.

## 1. Quản lý tài khoản & Phân quyền
*   **1.1 Đăng ký tài khoản**
    *   ✅ *Đã làm:* API `AuthService.RegisterAsync` tạo user, gán quota mặc định, mã hóa mật khẩu Bcrypt.
    *   ❌ *Cần bổ sung:* 
        *   Tích hợp dịch vụ gửi Email (ví dụ SendGrid, MailKit).
        *   API gửi OTP (6 số, hiệu lực 5 phút) và lưu OTP vào Redis/MemoryCache.
        *   Sửa luồng: `Gửi Email` -> `Nhập OTP` -> `Xác thực thành công mới lưu User vào DB`.
*   **1.2 Đăng nhập**
    *   ✅ *Đã làm:* API `LoginAsync` cấp JWT Token.
    *   ❌ *Cần bổ sung:* 
        *   Cơ chế **Single Session**: Lưu active session ID vào Redis. Khi user đăng nhập ở thiết bị B, xóa session ở thiết bị A để kick họ ra.
        *   Giao diện Frontend (FE) trang Home chuẩn hóa 3 vùng: Tham gia nhanh (nhập PIN/QR), Không gian chủ phòng (Tạo đề), Quản lý bộ đề.
*   **1.3 Gửi lại OTP & Chống brute-force**
    *   ❌ *Cần bổ sung toàn bộ:*
        *   Middleware Rate-limit: Chặn gọi API gửi OTP > 5 lần/giờ.
        *   Tracking lỗi đăng nhập: Nếu sai mật khẩu 5 lần, update trạng thái `LockedUntil` = hiện tại + 15 phút.
*   **1.4 Đặt lại mật khẩu**
    *   ❌ *Cần bổ sung toàn bộ:*
        *   Tạo API Quên mật khẩu -> Gửi OTP.
        *   API Xác thực OTP + Reset Password (hủy toàn bộ session cũ).
*   **1.5 Cập nhật thông tin cá nhân**
    *   ✅ *Đã làm:* Entity đã có cột `Nickname`, `AvatarUrl`.
    *   ❌ *Cần bổ sung:* API `PUT /users/profile` để đổi Avatar và Nickname. Trang profile FE.
*   **1.6 Xóa/Khóa tài khoản (Phân quyền Admin)**
    *   ✅ *Đã làm:* Trong entity User có field `IsAdmin` và `Status` (ACTIVE, LOCKED, DELETED).
    *   ❌ *Cần bổ sung:* 
        *   API cho người dùng tự xóa (Soft delete: đổi status thành `DELETED`).
        *   **Khu vực Admin**: Module dành riêng cho `IsAdmin=true` (Quản lý User), API để admin khóa/xóa user vi phạm (Cập nhật `LockedUntil`).
*   **1.8 Quản lý giới hạn (Quota)**
    *   ✅ *Đã làm:* Đã tạo bảng `user_quotas`.
    *   ❌ *Cần bổ sung:* Thêm logic kiểm tra Quota (ActionFilter / Interceptor) trước khi cho phép tạo phòng hoặc tạo đề AI.

## 2. Quản lý Nhóm / Không gian chơi
*   ✅ *Đã làm:* Đã có Model Entities `Group` và `GroupMember`.
*   ❌ *Cần bổ sung toàn bộ (Chưa có Controller & Service):*
    *   **2.1 Tạo nhóm:** API `POST /groups`, sinh mã `GroupCode` 6 ký tự.
    *   **2.2 Yêu cầu gia nhập:** API `POST /groups/join` (Gửi request vào hàng đợi duyệt).
    *   **2.3 Phê duyệt:** API cho Host Accept/Reject request. Cần tích hợp Push Notification (SignalR) để báo người chơi.
    *   **2.4 Quản lý:** API cho Host xóa thành viên, giải tán nhóm.

## 3. Quản lý & Tạo bộ câu hỏi (Slide Builder)
*   **3.1 Quản lý bộ câu hỏi (Quiz)**
    *   ✅ *Đã làm:* `QuizService` tạo quiz, lấy danh sách, có Caching.
    *   ❌ *Cần bổ sung:* API Edit (Sửa quiz), Delete (Xóa quiz).
*   **3.2 Thiết kế Slide & AI**
    *   ✅ *Đã làm:* Đã có cấu trúc `AIJobWorker` để sinh đề, Model `Slide` đầy đủ.
    *   ❌ *Cần bổ sung:* 
        *   Luồng **Duyệt AI (Human-in-the-loop)**: AI sinh xong lưu ở trạng thái `DRAFT`. Phải có API `Approve` để Host duyệt đổi thành `PUBLISHED`.
        *   Giao diện Editor bên FE cho phép chỉnh sửa từng loại câu hỏi.
*   **3.3 Slide Khảo sát & Word Cloud**
    *   ✅ *Đã làm:* Hỗ trợ Type `POLL`, `WORD_CLOUD`, không tính điểm (đã xử lý trong hàm `GradeAnswerExact`).
    *   ❌ *Cần bổ sung:* Thuật toán Word Cloud Frequency Analyzer để nhóm từ khóa trực tiếp qua SignalR khi user gửi lên.
*   **3.4 Chia sẻ & Clone**
    *   ❌ *Cần bổ sung:* API `POST /quizzes/{id}/clone` để nhân bản bộ đề vào database của tài khoản hiện tại.

## 4. Phòng tương tác thời gian thực
*   **4.1 Khởi tạo phòng**
    *   ✅ *Đã làm:* Hỗ trợ 3 Mode, sinh mã PIN ngẫu nhiên.
    *   ❌ *Cần bổ sung:* FE cần logic tạo QR Code từ mã PIN. Phân luồng chạy Background Job khi phòng giải đấu Async được tạo.
*   **4.2 Tham gia phòng nhóm (Private Mode)**
    *   ❌ *Cần bổ sung:* Nút "Mở phòng cho nhóm", tự động bắn SignalR push notification cho tất cả thành viên trong `Group` để click vào chơi ngay không cần PIN.
*   **4.3 Quản lý sảnh chờ (Lobby)**
    *   ✅ *Đã làm:* Cấu trúc thư mục Hubs cho WebSockets.
    *   ❌ *Cần bổ sung:*
        *   Hoàn thiện SignalR Hub: Gửi danh sách user live.
        *   Tính năng Host kích (Kick) người chơi hoặc Khóa (Lock) phòng.
        *   Hiệu ứng đếm ngược 3-2-1 đồng bộ từ Server xuống mọi Clients.

## 5. Chế độ vận hành trò chơi & Báo cáo
*   **5.1 Thu thập phản hồi & Làm bài (Realtime & Async)**
    *   ✅ *Đã làm:* Logic submit trả lời.
    *   ❌ *Cần bổ sung quan trọng:*
        *   **Redis Async Timer:** Đồng hồ đếm ngược chạy độc lập trên server Redis cho chế độ giải đấu để chống hack time trên client.
        *   **API Auto-Save:** `PUT /api/answers/draft` gọi mỗi 30s để lưu tạm.
        *   **Message Queue (RabbitMQ):** Đẩy việc chấm điểm vào hàng đợi thay vì gọi đồng bộ để chống quá tải (bottle-neck) nếu hàng nghìn user submit cùng lúc.
*   **5.2 Xử lý kết quả (Chấm điểm)**
    *   ✅ *Đã làm:* Có `FuzzyMatchingService` làm mượt chuỗi, chấm điểm từng phần (Partial credit). Có Speed Multiplier.
    *   ❌ *Cần bổ sung:* Biểu đồ hiển thị kết quả (Chart.js / Recharts) trên FE cho Host.
*   **5.3 Bảng xếp hạng (Leaderboard)**
    *   ✅ *Đã làm:* Hàm `GetLeaderboardAsync`.
    *   ❌ *Cần bổ sung:* Thay vì gọi DB liên tục, cần đưa Leaderboard vào Redis Sorted Set để lấy kết quả realtime hiệu năng cao. Hiệu ứng leo rank (+3 bậc) trên FE.
*   **5.4 Bục vinh danh**
    *   ❌ *Cần bổ sung:* Logic tính điểm chốt sổ, đổi trạng thái phòng thành `FINISHED`. Giao diện pháo hoa Podium (Hạng 1-2-3) trên FE.
*   **5.5 Xuất báo cáo (Export)**
    *   ❌ *Cần bổ sung:* Dùng thư viện (VD: ClosedXML hoặc CsvHelper) xây dựng API `GET /api/v1/sessions/{id}/export` xuất file .xlsx, .csv kèm chữ ký số (presigned-URL hạn 15 phút).

## 6. Tương tác bổ trợ (Q&A & Bình chọn) - *CHƯA CÓ CODE*
*   Phần này đang thiếu hoàn toàn ở BE.
*   ❌ *Cần bổ sung:*
    *   Tạo Entity `QuestionQA` (Id, RoomId, PlayerId, Content, Upvotes, Status: Pending, Pinned, Hidden, Resolved).
    *   Viết SignalR Hub riêng cho màn hình Q&A (Để user đẩy câu hỏi realtime, nhận upvote realtime).
    *   Quyền cho Host: Ghim, Ẩn câu hỏi, Đánh dấu giải quyết.

## 7. Các hạ tầng (Infrastructure) cần setup bổ sung
1. **Redis Server:** Dùng để lưu OTP, Session Login, Async Timer cho phòng giải đấu, và Realtime Leaderboard (Sorted Set).
2. **RabbitMQ Server:** Message Broker để xử lý chấm điểm nền (Background Worker) và tác vụ AI.
3. **Mail Server:** Tích hợp SMTP gửi mã OTP đăng ký và lấy lại mật khẩu.
4. **Hệ thống SignalR (WebSockets):** Cần code chi tiết các hàm Event (OnPlayerJoined, OnQuestionChanged, OnLeaderboardUpdated, v.v.).
