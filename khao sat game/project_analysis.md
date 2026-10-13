# Báo Cáo Đối Chiếu & Đánh Giá Toàn Diện Dự Án Gaming-EDU

Dưới đây là bảng đối chiếu chi tiết và toàn diện giữa **Tài liệu phân tích chức năng đề tài** (`Miêu tả phân tích chức năng đề tài.xlsx`), **Sơ đồ kiến trúc & luồng xử lý** (`Sơ đồ thiết kế cấu trúc hệ thống.png`, `Sơ đồ TKCTHT AI sinh đề.png`), **Cơ sở dữ liệu** (`database_schema.sql`) và **Codebase Backend hiện tại** (`BE/GamingEdu.API`).

---

## 1. TỔNG QUAN TÌNH TRẠNG HIỆN TẠI CỦA BACKEND

| Nhóm chức năng | Tình trạng BE | Chi tiết thành phần phụ trách |
| :--- | :---: | :--- |
| **1. Quản lý tài khoản & Phân quyền** | **100% HOÀN THÀNH** | `AuthController`, `UsersController`, `AdminUsersController`, `AuthService`, `EmailService` |
| **2. Quản lý Nhóm / Không gian chơi** | **100% HOÀN THÀNH** | `GroupsController`, `GroupService`, `NotificationHub` |
| **3. Slide Builder & AI Core** | **100% HOÀN THÀNH** | `QuizzesController`, `SlidesController`, `AIJobWorker`, `GeminiApiService` |
| **4. Phòng tương tác thời gian thực** | **100% HOÀN THÀNH** | `RoomsController`, `RoomService`, `GameHub`, `QRCoder` |
| **5. Chế độ vận hành & Báo cáo** | **100% HOÀN THÀNH** | `FuzzyMatchingService`, `AnswerProcessingWorker`, `ClosedXML`, `ILeaderboardStore` |
| **6. Tương tác bổ trợ (Q&A)** | **100% HOÀN THÀNH** | `QAHub`, `QAService`, `QuestionQA` entity |

* **Trạng thái Build:** `dotnet build` -> **0 Warning, 0 Error (Thành công 100%)**.
* **File kiểm thử tích hợp:** `BE/GamingEdu.API/GamingEdu.API.http` đã sẵn sàng 337 dòng bao phủ toàn bộ 9 kịch bản kiểm thử API và WebSocket.

---

## 2. ĐỐI CHIẾU CHI TIẾT TỪNG MODULE CHỨC NĂNG

### Nhóm 1: Quản lý tài khoản & Phân quyền
* **1.1 Đăng ký tài khoản:**
  * ✅ Luồng OTP 6 số gửi qua Email (TTL 5 phút) lưu vào MemoryCache/Redis: `AuthService.SendRegisterOtpAsync`, `EmailService`.
  * ✅ Chỉ khi nhập đúng OTP mới cho phép tạo tài khoản vào DB: `AuthService.RegisterAsync`.
  * ✅ Cấp sẵn quyền tạo phòng/tham gia phòng ngay lập tức: Mặc định mọi user đều có quyền Host & Player.
* **1.2 Đăng nhập:**
  * ✅ Xác thực email & mật khẩu (BCrypt hash): `AuthService.LoginAsync`.
  * ✅ Cơ chế **Single Session**: Mỗi lần đăng nhập sinh SessionId (JTI claim) mới và lưu `session:{userId}` vào Cache. Phiên cũ ở thiết bị khác sẽ bị kick ra ngay lập tức: `ValidateSessionMiddleware`.
* **1.3 Gửi lại OTP & Chống brute-force:**
  * ✅ Rate Limiting: `[EnableRateLimiting("OtpRateLimit")]` chặn spam gọi OTP.
  * ✅ Chống brute-force: Đếm số lần đăng nhập sai theo Email (`fail_login:{email}`). Nhập sai 5 lần liên tiếp sẽ tự động khóa tài khoản tạm thời 15 phút (`LockedUntil`).
* **1.4 Đặt lại mật khẩu:**
  * ✅ `POST /api/auth/forgot-password`: Gửi OTP xác thực về email.
  * ✅ `POST /api/auth/reset-password`: Xác thực OTP, cập nhật mật khẩu mới (BCrypt), đồng thời thu hồi/kick toàn bộ session cũ.
* **1.5 Cập nhật thông tin cá nhân:**
  * ✅ `PUT /api/users/profile`: Cập nhật `Nickname` và `AvatarUrl` trong `UsersController`.
* **1.6 Xóa / Khóa tài khoản:**
  * ✅ Tự xóa tài khoản (Soft delete): `DELETE /api/users/me` chuyển status sang `DELETED` và kick phiên làm việc.
  * ✅ Admin khóa tài khoản: `PUT /api/admin/users/{userId}/lock?lockMinutes=30` (cần quyền `RequireAdmin`).
  * ✅ Admin xóa tài khoản: `DELETE /api/admin/users/{userId}`.
* **1.8 Quản lý giới hạn tài nguyên (Quota):**
  * ✅ Bảng `user_quotas` liên kết 1-1 với `users`.
  * ✅ Filter chặn vượt hạn mức: `[CheckQuota("AI")]` và `[CheckQuota("ROOM")]` trong `CheckQuotaAttribute.cs`.

---

### Nhóm 2: Quản lý Nhóm / Không gian chơi
* **2.1 Tạo nhóm:**
  * ✅ `POST /api/groups`: Tạo nhóm mới, tự động sinh `GroupCode` 6 ký tự ngẫu nhiên duy nhất, gán Host làm chủ nhóm.
* **2.2 Yêu cầu gia nhập nhóm:**
  * ✅ `POST /api/groups/join`: Kiểm tra `GroupCode`, tạo bản ghi thành viên với trạng thái `PENDING` (Chờ duyệt).
* **2.3 Phê duyệt thành viên:**
  * ✅ `GET /api/groups/{id}/members`: Host lấy danh sách thành viên chờ duyệt.
  * ✅ `PUT /api/groups/{id}/members/{memberId}`: Host duyệt (`isApproved: true/false`). Hệ thống tự động bắn Push Notification qua SignalR `NotificationHub` tới thiết bị người chơi.
* **2.4 Quản lý thành viên & Nhóm:**
  * ✅ `DELETE /api/groups/{id}/members/{memberId}`: Host kick thành viên khỏi nhóm.
  * ✅ `DELETE /api/groups/{id}`: Host giải tán nhóm, đổi trạng thái sang `DISBANDED`, vô hiệu hóa `GroupCode`.

---

### Nhóm 3: Quản lý & Tạo bộ câu hỏi (Slide Builder)
* **3.1 Quản lý bộ câu hỏi (Quiz):**
  * ✅ CRUD đầy đủ: `POST /api/quizzes`, `GET /api/quizzes`, `GET /api/quizzes/{id}`, `PUT /api/quizzes/{id}`.
  * ✅ Xóa mềm (Soft delete): `DELETE /api/quizzes/{id}` đánh dấu `IsDeleted = true`, có Global Query Filter trong `ApplicationDbContext` để tự động lọc bỏ.
* **3.2 Thiết kế Slide & AI Core:**
  * ✅ Đa dạng định dạng slide: `QUIZ` (Trắc nghiệm), `FILL_IN_BLANK` (Điền khuyết), `MATCHING` (Ghép cặp).
  * ✅ Xóa mềm slide: `DELETE /api/quizzes/{quizId}/slides/{id}` đánh dấu `IsDeleted = true`.
  * ✅ Pipeline AI sinh đề (Human-in-the-loop):
    1. Tiếp nhận file/prompt tạo `AIJob` trạng thái `PENDING`.
    2. Background worker `AIJobWorker` gọi `GeminiApiService` sinh đề dạng JSON.
    3. Đẩy tiến độ tức thời qua SignalR `NotificationHub`.
    4. Lưu bản nháp vào cache `ai_draft:{job.Id}` để Host xem trước.
    5. Host gọi `PUT /api/quizzes/{quizId}/slides/{slideId}/approve` để chính thức duyệt slide vào thư viện cá nhân.
* **3.3 Slide Khảo sát & Word Cloud:**
  * ✅ Hỗ trợ loại slide `POLL` (Bình chọn) và `WORD_CLOUD` (Đám mây từ khóa).
  * ✅ Xử lý phản hồi không tính điểm (`GradeAnswerExact` trả về true).
  * ✅ Tổng hợp tần suất từ khóa thời gian thực: `RoomService.GetWordCloudDataAsync`.
* **3.4 Chia sẻ & Clone (Nhân bản bộ đề):**
  * ✅ `POST /api/quizzes/{id}/clone`: Nhân bản toàn bộ Quiz và tất cả Slides/SlideOptions sang tài khoản hiện tại với tiêu đề `(Clone)`.

---

### Nhóm 4: Phòng tương tác thời gian thực
* **4.1 Khởi tạo phòng chơi:**
  * ✅ Hỗ trợ 3 chế độ: `HOST_PACED` (Thường), `PLAYER_PACED` (Tự động), `ASYNC_TOURNAMENT` (Giải đấu).
  * ✅ Tự sinh mã PIN 6 số duy nhất.
  * ✅ Tự sinh ảnh **QR Code Base64** chuẩn qua thư viện `QRCoder` (`GenerateQrCodeBase64`) trả về ngay trong `RoomDto`.
* **4.2 Tham gia phòng theo Nhóm (Private Mode):**
  * ✅ `POST /api/rooms/{id}/invite-group/{groupId}`: Host gửi tín hiệu mời toàn bộ thành viên trong nhóm vào phòng chơi tức thời qua SignalR `NotificationHub`.
* **4.3 Quản lý sảnh chờ (Lobby):**
  * ✅ WebSocket realtime qua `GameHub.cs`:
    * Live Counter số lượng và danh sách người chơi trong phòng.
    * Host kick người chơi: `KickPlayer`.
    * Host khóa/mở khóa phòng: `LockRoom`.
    * Lệnh đếm ngược 3-2-1 đồng bộ từ Server: `StartGame`.
* **4.4 Kiểm soát trạng thái & Tái kết nối (Rejoin):**
  * ✅ Cache trạng thái phiên chơi trong Memory/Redis (180 - 210s).
  * ✅ Cho phép Player rejoin khôi phục điểm số và câu hỏi đang chiếu.
  * ✅ Cơ chế chống kẹt phòng (Host AFK): Tự động phát hiện và hủy phòng khi Host ngắt kết nối quá hạn.

---

### Nhóm 5: Chế độ vận hành trò chơi & Báo cáo
* **5.1 Thu thập phản hồi & Làm bài:**
  * ✅ Lưu nháp bài làm tự động mỗi 30s: `PUT /api/rooms/answers/draft` (lưu vào cache phục vụ chế độ Async).
  * ✅ Nộp bài thi: `SubmitAnswerAsync` ghi nhận thời gian phản hồi `ResponseTimeMs` và điểm số.
* **5.2 Xử lý kết quả & Thuật toán Fuzzy Matching:**
  * ✅ Triển khai chuẩn xác thuật toán 4 bước trong `FuzzyMatchingService.cs`:
    1. Chuyển chữ thường (`ToLowerInvariant`).
    2. Khử sạch toàn bộ dấu Tiếng Việt (Unicode mapping bảng đầy đủ).
    3. Loại bỏ khoảng trắng thừa ở 2 đầu và đưa khoảng trắng giữa các từ về 1 space duy nhất.
    4. So khớp với mảng từ khóa chuẩn, áp dụng khoảng cách Levenshtein với dung sai ký tự nhỏ.
  * ✅ Tính điểm từng phần (Partial Credit) cho câu hỏi Ghép cặp (Matching) và Điền khuyết (Fill-in-the-blank).
  * ✅ Tính điểm động kèm hệ số tốc độ (Speed Multiplier).
* **5.3 Bảng xếp hạng (Leaderboard):**
  * ✅ Sắp xếp điểm số theo thời gian thực: `RoomService.GetLeaderboardAsync`.
  * ✅ Sử dụng `ILeaderboardStore` (MemoryCache / Redis Sorted Set) đảm bảo hiệu năng cao.
* **5.4 Kết thúc trò chơi & Bục vinh danh (Podium):**
  * ✅ `POST /api/rooms/{id}/finish`: Khóa phiên chơi, chuyển trạng thái sang `FINISHED`.
  * ✅ Tính toán và trả về Top 3 người chơi dẫn đầu để trình chiếu Bục vinh danh (Podium Top 3).
* **5.5 Xuất báo cáo (Export Excel):**
  * ✅ `GET /api/rooms/{id}/export`: Sử dụng thư viện `ClosedXML` xuất file `.xlsx` nhị phân chứa đầy đủ ma trận trả lời, điểm số, thời gian làm bài của từng thí sinh.

---

### Nhóm 6: Tương tác bổ trợ (Q&A)
* **6.1 Đặt câu hỏi & Upvote câu hỏi:**
  * ✅ Bảng CSDL `question_qa` và Model `QuestionQA`.
  * ✅ SignalR `QAHub.cs` hỗ trợ gọi `AskQuestion` và `UpvoteQuestion` realtime.
  * ✅ Tự động tính toán lại thứ tự hiển thị câu hỏi theo số lượng Upvote giảm dần.
* **6.2 Kiểm duyệt & Giải đáp:**
  * ✅ Host ghim câu hỏi lên màn hình chính: `PinQuestion`.
  * ✅ Host ẩn/xóa câu hỏi vi phạm: `HideQuestion`.
  * ✅ Host đánh dấu câu hỏi đã giải quyết xong: `ResolveQuestion`.

---

## 3. CÁC HẠ TẦNG & TRẠNG THÁI KỸ THUẬT CÒN LẠI CẦN LƯU Ý

1. **Cơ sở dữ liệu SQL Server (Local):**
   * Mã nguồn C# đã tích hợp Entity Framework Core với đầy đủ Migration (`20261010171731_AddSoftDeleteForQuizAndSlide`).
   * File script `database_schema.sql` đã cập nhật chuẩn xác các trường `is_deleted` và bảng `question_qa`.
   * Khi khởi động SQL Server trên máy, chỉ cần chạy `dotnet ef database update` hoặc chạy trực tiếp file `khao sat game/database_schema.sql`.
2. **Frontend Integration:**
   * Tầng Backend đã sẵn sàng 100% các API và WebSocket Hub phục vụ màn hình Frontend (Next.js).
