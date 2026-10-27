# BÁO CÁO TIẾN ĐỘ DỰ ÁN GAMING-EDU (LƯU VẾT BÀN GIAO)
*Cập nhật lúc: 2026-10-21*  
*Nhánh Git công việc hiện tại:* `N_Long` *(Lưu local an toàn, sẵn sàng đẩy lên remote)*

---

## 1. TỔNG QUAN TIẾN ĐỘ THỰC HIỆN THEO THỨ TỰ CÁC PHÂN HỆ

Toàn bộ các phân hệ chức năng từ Phần 1 đến Phần 6 được rà soát, đối chiếu và hoàn thiện nghiêm ngặt theo **Bảng phân tích chức năng đề tài** (`Miêu tả phân tích chức năng đề tài.xlsx`) và **Sơ đồ kiến trúc luồng đi của hệ thống**:

### ✅ PHÂN HỆ 1: QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN (Mục 1.1 - 1.8)
- **1.1 Đăng ký tài khoản & 1.3 Xác thực OTP:** Route riêng `/register`, bộ đếm ngược 60 giây và nút "Gửi lại OTP" trực quan. Đăng ký thành công cấp sẵn quyền Host & Player.
- **1.2 Đăng nhập:** Cơ chế Single Session qua JTI token, tự động kick phiên cũ trên thiết bị khác khi đăng nhập thiết bị mới. Khóa tài khoản tạm thời 15 phút nếu nhập sai quá 5 lần liên tiếp.
- **1.4 Đặt lại mật khẩu:** Quy trình OTP email an toàn, mã hóa mật khẩu Bcrypt và thu hồi mọi session cũ.
- **1.5 Cập nhật Profile:** Cập nhật Nickname và AvatarUrl.
- **1.6 Xóa / Khóa tài khoản:** Soft delete tài khoản cá nhân, Admin có API khóa/xóa tài khoản gian lận.
- **1.8 Quản lý Quota tài nguyên:** Bộ lọc `[CheckQuota]` kiểm soát số lượng lượt gọi AI và tạo phòng thi đấu.

---

### ✅ PHÂN HỆ 2: QUẢN LÝ NHÓM / KHÔNG GIAN CHƠI (Mục 2.1 - 2.4)
- **2.1 Tạo nhóm:** Tự sinh mã `GroupCode` 6 chữ số ngẫu nhiên không trùng lặp, Host quản trị nhóm.
- **2.2 Yêu cầu gia nhập:** Học viên/Player nhập mã 6 chữ số, hệ thống ghi nhận trạng thái `PENDING` (Chờ duyệt).
- **2.3 Phê duyệt thành viên:**
  - Host mở modal quản lý nhóm -> Xem danh sách "Yêu Cầu Chờ Duyệt (PENDING)".
  - Nút **Chấp thuận** / **Từ chối** hoạt động tức thời, bắn tín hiệu Push Notification qua SignalR `NotificationHub` tới thiết bị người chơi.
- **2.4 Quản lý thành viên & Không gian nhóm:**
  - **Chỉnh sửa Tên & Mô tả nhóm:** Tích hợp nút `Sửa Nhóm` và Modal cập nhật thông tin gọi API `PUT /api/groups/{id}`.
  - **Tổ chức phòng chơi cho nhóm (Mục 4.2):** Tích hợp nút `Tổ Chức Chơi` (Gamepad icon) trên thẻ nhóm và trong modal chi tiết: Host chọn Quiz trong kho đề cá nhân -> Tự động tạo phòng -> Bắn tín hiệu SignalR mời toàn bộ thành viên trong nhóm tham gia -> Tự động chuyển Host sang `/host/[roomId]`.
  - **Kích thành viên:** Host loại thành viên vi phạm khỏi nhóm kèm xác nhận bảo mật.
  - **Rời nhóm / Giải tán nhóm:** Thành viên tự rời nhóm (`POST/DELETE /api/groups/{id}/leave`), Host giải tán nhóm vĩnh viễn (`DELETE /api/groups/{id}`).

---

### ✅ PHÂN HỆ 3: QUẢN LÝ & TẠO BỘ CÂU HỎI (SLIDE BUILDER & AI CORE) (Mục 3.1 - 3.4)
- **3.1 Tạo bộ câu hỏi (Game Quiz):** CRUD bộ đề, ảnh bìa, chủ đề, xóa mềm (`is_deleted`). Thống nhất CSDL chung cho cả câu hỏi tự tạo và câu hỏi do AI sinh ra.
- **3.2 Thiết kế Slide & AI Core (Human-in-the-loop):**
  - AI Engine (`GeminiApiService.cs`): Sinh đồng thời cả 3 định dạng `QUIZ` (Trắc nghiệm), `FILL_IN_BLANK` (Điền khuyết từ khóa chuẩn & đồng nghĩa), và `MATCHING` (Ghép cặp 2 vế A ↔ B).
  - Background Worker (`AIJobWorker.cs`): Chèn slide vào CSDL với trạng thái `DRAFT` và `IsAIGenerated = true`. Invalidate cache tức thời.
  - Slide Builder Editor (`quiz/[id]/edit/page.tsx`): Trình soạn thảo chuyên biệt cho từng loại câu hỏi, thanh công cụ duyệt từng câu hoặc duyệt tất cả (`approve-all`).
  - Validation API (`SlidesController.cs`): Chấp nhận đầy đủ cả 2 phương thức `POST` và `PUT`, xác thực từ khóa điền khuyết và cả 2 vế ghép nối.
- **3.3 Khảo sát Poll & Word Cloud:** Slide bình chọn tỷ lệ % và slide đám mây từ khóa tần suất cao.
- **3.4 Chia sẻ học liệu & Mẫu đề (Template):**
  - Bổ sung nút **"Nhân Bản Vào Thư Viện"** (`handleCloneQuiz`) gọi `POST /api/quizzes/{id}/clone` trên cả trang Thư viện (`quizzes/page.tsx`) và trang Chi tiết bộ đề (`quiz/[id]/page.tsx`).
  - Bổ sung nút **"Chia Sẻ Bộ Đề (Copy Link)"** sao chép Template Link gửi cho các giáo viên/Host khác.

---

### ✅ PHÂN HỆ 4: PHÒNG TƯƠNG TÁC THỜI GIAN THỰC (Mục 4.1 - 4.4)
- **4.1 Khởi tạo phòng chơi (3 chế độ):**
  - `Phòng thường` (Host-paced): Chủ phòng chủ động điều khiển nhịp từng slide câu hỏi.
  - `Phòng tự động` (Live Player-paced): Học sinh tự bấm sẵn sàng và tự làm bài.
  - `Phòng giải đấu` (Async Mode): Khung thời gian linh hoạt, Async timer chạy ngầm chống gian lận.
  - Tự động sinh mã PIN 6 số và **ảnh QR Code Base64** chuẩn qua thư viện `QRCoder` hiển thị ngay tại sảnh chờ.
- **4.2 Mời nhóm vào phòng (Private Mode):** Bắn tín hiệu SignalR `NotificationReceived` kèm PIN và roomId, người nhận click "Vào phòng ngay" mà không cần gõ PIN.
- **4.3 Quản lý phòng chờ (Lobby):** Live counter người chơi thời gian thực qua `GameHub`, Host có quyền Kick, Khóa/Mở khóa phòng, phát lệnh đếm ngược 3-2-1 đồng bộ.
- **4.4 Kiểm soát trạng thái & Tái kết nối (Rejoin):** Giữ phiên chơi trong cache 180-210 giây, khôi phục điểm số và vị trí slide, cơ chế chống kẹt phòng khi Host AFK quá 3 phút và quy tắc bỏ qua câu đã lỡ (Sync Lag).

---

### ✅ PHÂN HỆ 5: CHẾ ĐỘ VẬN HÀNH TRÒ CHƠI & BÁO CÁO (Mục 5.1 - 5.5)
- **5.1 Thu thập phản hồi & Làm bài thi:**
  - Tự động lưu nháp mỗi 30s (`PUT /api/rooms/answers/draft`) lưu vào Redis Cache cho chế độ Async.
  - Ghi nhận thời gian phản hồi chính xác đến miligiây (`ResponseTimeMs`).
- **5.2 Fuzzy Matching & Chấm điểm động:**
  - Thuật toán chuẩn hóa chuỗi 4 bước trong `FuzzyMatchingService.cs` (chuyển chữ thường, khử sạch dấu Tiếng Việt, chuẩn hóa khoảng trắng thừa, so khớp Levenshtein với dung sai nhỏ).
  - Chấm điểm từng phần (Partial Credit) cho Điền khuyết và Ghép cặp.
  - Hệ số tốc độ (Speed Multiplier) thưởng điểm cho người trả lời nhanh.
- **5.3 Bảng xếp hạng (Leaderboard):** Sắp xếp điểm số theo thời gian thực (Top 5 / Top 10) cập nhật giữa các câu hỏi.
- **5.4 Bục vinh danh (Podium):** Màn hình kết thúc vinh danh Top 3 kèm hiệu ứng pháo hoa `canvas-confetti`.
- **5.5 Báo cáo & Thống kê phiên chơi:**
  - API `GET /api/rooms/{id}/report`: Trả về toàn bộ chỉ số thí sinh, độ chính xác, câu khó/dễ nhất.
  - Xuất Excel nâng cao 2 Sheet (`ExportRoomReportAsync` qua `ClosedXML`):
    * **Sheet 1:** Bảng điểm thí sinh, thời gian trung bình, tô màu vinh danh Top 3 (Vàng / Bạc / Đồng).
    * **Sheet 2:** Phân tích câu hỏi sư phạm theo mức độ khó/dễ, tỷ lệ đúng %.
  - Giao diện Web: Nút "Xem Thống Kê" mở Modal popup trực quan trên web và nút "Tải Báo Cáo Excel".

---

### ✅ PHÂN HỆ 6: TƯƠNG TÁC BỔ TRỢ (Q&A & BÌNH CHỌN) (Mục 6.1 - 6.2)
- **6.1 Đặt câu hỏi & Upvote câu hỏi hay:**
  - Player mở popup Q&A gửi câu hỏi thắc mắc và upvote các câu hỏi hay qua SignalR `QAHub`.
  - Tự động sắp xếp câu hỏi ưu tiên theo số lượng Upvote giảm dần.
- **6.2 Kiểm duyệt & Giải đáp:**
  - Host có nút **Ghim lên màn hình** (Pin) -> Đồng bộ hiển thị **Banner màu hổ phách nổi bật** trên màn hình của cả Host và tất cả Player.
  - Host đánh dấu câu hỏi đã giải quyết xong (`Resolve`) hoặc ẩn/xóa câu hỏi vi phạm (`Hide`).

---

## 2. KẾT QUẢ KIỂM THỬ BIÊN DỊCH (TESTING & BUILDS)
- **Backend (.NET 10 API):** `dotnet build` đạt kết quả **0 Error**.
- **Frontend (Next.js 16 Turbopack):** `npm run build` đạt **16/16 routes 100% thành công**, không có bất kỳ lỗi TypeScript hay Linting nào.

---

## 3. DANH SÁCH FILE VỪA HOÀN THIỆN
1. `FE/gaming-edu-app/src/app/(dashboard)/groups/page.tsx`:
   - Thêm nút & Modal Chỉnh sửa Tên & Mô tả nhóm (`PUT /api/groups/{id}`).
   - Thêm nút & Modal Tổ chức phòng chơi cho nhóm (`POST /api/rooms` + `POST /api/rooms/{roomId}/invite-group/{groupId}`).
2. `FE/gaming-edu-app/src/app/(dashboard)/quiz/[id]/page.tsx`:
   - Thêm nút "Nhân bản vào thư viện của tôi" (`handleCloneQuiz`).
   - Thêm nút "Chia sẻ bộ đề (Copy Link)" (`handleCopyShareLink`).
3. `BE/GamingEdu.API/Controllers/SlidesController.cs`:
   - Hỗ trợ cả `[HttpPut]` và `[HttpPost]` cho các route duyệt slide AI.
   - Hoàn thiện validation từ khóa điền khuyết và 2 vế ghép nối.
