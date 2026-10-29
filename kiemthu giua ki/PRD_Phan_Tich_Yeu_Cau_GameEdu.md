# TÀI LIỆU ĐẶC TẢ YÊU CẦU SẢN PHẨM (PRD) & PHÂN TÍCH HỆ THỐNG
## DỰ ÁN: NỀN TẢNG HỌC TẬP TRÒ CHƠI HÓA THỜI GIAN THỰC (GAMEEDU)
**Đối tượng:** Đội ngũ Đảm bảo Chất lượng Phần mềm (QA/QC Team)  
**Mục tiêu:** Cung cấp tài liệu nền tảng phục vụ xây dựng Kế hoạch Kiểm thử (Test Plan) và Thiết kế Kịch bản Kiểm thử (Test Cases) — Đề tài 1 (KTPM)  
**Ngày cập nhật:** 29/10/2026  
**Phiên bản:** 1.0  

---

### 1. TỔNG QUAN HỆ THỐNG
GameEdu là nền tảng Web học tập tương tác kết hợp cơ chế trò chơi hóa (Gamification) và công nghệ truyền thông hai chiều thời gian thực (Real-time WebSockets/SignalR). Hệ thống cho phép giáo viên tạo lập ngân hàng đề thi đa phương thức (tạo thủ công hoặc tạo tự động qua AI), tổ chức phòng thi đấu trực tuyến bằng mã PIN, và triển khai các chế độ trò chơi giáo dục đối kháng như **Hải Tặc Tri Thức (Naval War / Battleship)**, **Đấu Boss (Boss Raid)**, và **Kéo Co Tri Thức (Tug of War)**.

#### Kiến trúc Công nghệ:
- **Frontend:** Next.js 16 (App Router), React, TypeScript, TailwindCSS, SignalR Client, Lucide Icons, Canvas-Confetti.
- **Backend:** ASP.NET Core (.NET 10 Web API), Entity Framework Core, SignalR Hubs (`GameHub`, `NavalWarHub`, `QAHub`, `NotificationHub`), JWT Authentication.
- **Cơ sở dữ liệu:** PostgreSQL.
- **AI Service:** Google Gemini AI API (hỗ trợ trích xuất câu hỏi từ file PDF/Docx/văn bản).

---

### 2. CÁC TÁC NHÂN HỆ THỐNG (ACTORS)
1. **Giáo viên / Chủ phòng (Host):**
   - Đăng ký, đăng nhập tài khoản giảng viên.
   - Quản lý ngân hàng bộ đề (Quiz, Slide câu hỏi, đáp án, giải thích).
   - Sử dụng AI để sinh câu hỏi tự động từ giáo trình/tài liệu.
   - Khởi tạo phòng chơi (sinh mã PIN 6 số và mã QR).
   - Làm trọng tài quan sát trung lập (Neutral Referee/Spectator), điều phối trận đấu, kết thúc sớm và xuất báo cáo kết quả ra file Excel.
2. **Học sinh / Người tham gia (Player / Guest):**
   - Đăng ký/đăng nhập tài khoản cá nhân hoặc tham gia ẩn danh (Guest).
   - Nhập mã PIN 6 chữ số để vào phòng thi đấu.
   - Chọn hạm đội (Phe Lam - Team A hoặc Phe Xích - Team B).
   - Trả lời câu hỏi theo thời gian thực (theo lượt hoặc chạy đua tốc độ), nhận quyền bắn đại bác và kích hoạt kỹ năng chiến thuật.
   - Xem bảng xếp hạng cá nhân, chuỗi combo, điểm năng lượng và thống kê cuối trận.
3. **Quản trị viên (Admin):**
   - Quản trị tài khoản người dùng, giám sát trạng thái hệ thống.

---

### 3. CÁC PHÂN HỆ CỐT LÕI & YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)

#### Phân hệ 1: Quản lý Xác thực & Tài khoản (`Auth & Account`)
- **FR-01: Đăng ký tài khoản (Register):**
  - Cho phép người dùng đăng ký tài khoản với Nickname, Email, Mật khẩu và Vai trò (Giáo viên / Học sinh).
  - Quy tắc: Email phải đúng định dạng `^[^@\s]+@[^@\s]+\.[^@\s]+$`, mật khẩu tối thiểu 6 ký tự, mã hóa mật khẩu bằng BCrypt.
- **FR-02: Đăng nhập & Xác thực (Login & JWT):**
  - Đăng nhập bằng Email và Mật khẩu. Khi thành công, hệ thống cấp JWT Token lưu trữ trong Cookie an toàn.
  - Xử lý thông báo lỗi khi thông tin không khớp hoặc tài khoản bị khóa.
- **FR-03: Quên mật khẩu & Đặt lại qua OTP (Forgot Password & Reset):**
  - Người dùng gửi yêu cầu quên mật khẩu, hệ thống sinh mã OTP 6 số ngẫu nhiên có thời hạn 5 phút và gửi về Email.
  - Nhập đúng OTP để tạo mật khẩu mới.
- **FR-04: Cập nhật hồ sơ & Đổi mật khẩu (Profile & Security):**
  - Cập nhật Nickname, Avatar URL, đổi mật khẩu khi cung cấp đúng mật khẩu hiện tại.

#### Phân hệ 2: Quản lý Bộ đề học liệu & Tạo câu hỏi AI (`Quiz & Content Management`)
- **FR-05: Quản lý Bộ đề thi (Quiz Management):**
  - Tạo mới, sửa, xóa Quiz; gán tên danh mục, mô tả, ảnh bìa, trạng thái công khai / riêng tư.
- **FR-06: Quản lý Slide câu hỏi (Multi-format Questions):**
  - Hỗ trợ 3 định dạng câu hỏi tự động chấm:
    1. **Trắc nghiệm (`QUIZ`):** 2–4 phương án A, B, C, D; chọn 1 hoặc nhiều đáp án đúng.
    2. **Điền khuyết (`FILL_IN_BLANK`):** Nhập chuỗi văn bản, chấm điểm thông minh qua thuật toán so khớp mờ (Fuzzy Matching Levenshtein).
    3. **Ghép cặp (`MATCHING`):** Ghép đôi khái niệm ở cột Trái với định nghĩa tương ứng ở cột Phải.
  - Cấu hình thời gian giới hạn (`timeLimit`: 5s đến 120s) và điểm số cơ bản (`points`: 500 – 2000).
- **FR-07: Tạo câu hỏi tự động bằng AI (AI Quiz Generator):**
  - Cho phép tải lên file văn bản/PDF/tài liệu bài giảng, AI tự động phân tích và sinh danh sách câu hỏi kèm đáp án gợi ý.
- **FR-08: Tải lên tệp tin phương tiện (File Upload):**
  - Hỗ trợ tải ảnh minh họa cho câu hỏi (định dạng JPG, PNG, WebP; dung lượng tối đa 5MB).

#### Phân hệ 3: Phòng thi đấu trực tuyến & Chấm điểm thời gian thực (`Live Arena`)
- **FR-09: Khởi tạo & Tham gia phòng chơi (Room Management):**
  - Giáo viên tạo phòng thi đấu, hệ thống sinh mã PIN ngẫu nhiên gồm 6 chữ số kèm mã QR tham gia nhanh.
  - Học sinh nhập mã PIN tại trang `/play` để kết nối vào phòng qua SignalR (`GameHub`).
- **FR-10: Điều phối câu hỏi & Đồng hồ đếm ngược (Question HUD & Timer):**
  - Chủ phòng bấm bắt đầu -> hệ thống phát câu hỏi đồng bộ tới toàn bộ người chơi.
  - Đồng hồ đếm ngược thời gian thực trên giao diện người chơi.
  - **Quy tắc biên hết giờ:** Khi đồng hồ chạm mốc `0s` mà học sinh chưa gửi câu trả lời, hệ thống ghi nhận `0 điểm` (`+0 pts`), thông báo *"Hết giờ!"* và tự động chuyển sang câu hỏi tiếp theo (không làm đơ/kẹt màn hình).
- **FR-11: Chấm điểm, Tốc độ trả lời & Chuỗi Combo:**
  - Điểm được tính dựa trên: Điểm cơ bản $\times$ Tỷ lệ đúng $\times$ Hệ số tốc độ (trả lời càng nhanh điểm càng cao).
  - Chuỗi trả lời đúng liên tiếp (Combo $\ge 2$) được cộng thêm điểm thưởng và kích hoạt hiệu ứng lửa/combo.

#### Phân hệ 4: Trò chơi Hải Tặc Tri Thức (`Naval War - Real-time Turn-based Battleship`)
- **FR-12: Phân chia Hạm Đội & Cân bằng lực lượng (Team Balancing):**
  - Người chơi chọn gia nhập **Hạm Đội Lam (Team A)** hoặc **Hạm Đội Xích (Team B)**.
  - Giới hạn tối đa **25 người/đội**.
  - **Quy tắc tự động cân bằng:**
    - Khi chênh lệch quân số giữa 2 bên $\ge 2$ người: Hệ thống tự động chia đều người chơi giữa 2 đội khi bấm Khai chiến.
    - Khi chênh lệch đúng $1$ người: Chọn ngẫu nhiên 1 người bên đội ít quân hơn nhận buff **X2 Bắn Pháo** (trả lời đúng 1 câu được thưởng 2 phát bắn).
- **FR-13: Cơ chế Trả lời & Khai hỏa theo Lượt bắn (Turn-based Mechanics):**
  - Trận đấu bắt đầu: Mặc định Team A đi trước ở **Lượt #1**.
  - **Chỉ hiển thị câu hỏi khi đến lượt đội mình:**
    - Đội đang tới lượt: Câu hỏi và các phương án xuất hiện, đồng hồ đếm ngược hoạt động để người chơi thảo luận/trả lời.
    - Đội đối phương: Câu hỏi bị ẩn hoàn toàn, hiển thị màn hình khóa chiến thuật: *"Đang là lượt bắn của đối phương — Câu hỏi sẽ xuất hiện ngay khi đến lượt đội bạn!"*.
  - **Chuyển lượt:**
    - Trả lời đúng: Nhận quyền bắn (`shotsEarned = 1` hoặc `2`), nhấp tọa độ bắn trên bản đồ Hải phận đối phương ($15 \times 15$). Bắn xong hết quyền bắn -> Tự động chuyển lượt sang đội đối phương (`NavalTurnChanged`).
    - Trả lời sai hoặc hết giờ (`0s`): Không được bắn, mất chuỗi combo -> Lập tức chuyển lượt sang đội đối phương.
  - **Bảo mật chiến thuật:** Tọa độ đội tàu của mỗi bên được bảo mật tuyệt đối trên Server, đối thủ chỉ nhìn thấy kết quả bắn (`HIT` trúng, `MISS` trượt, `SUNK` chìm tàu, `BLOCKED` bị lá chắn cản).
- **FR-14: Kỹ năng chiến thuật & Tiêu chí phân định thắng thua:**
  - Kỹ năng Radar quét $3 \times 3$, Lá chắn phòng thủ (Shield), Bắn chính xác (Precision Shot).
  - Kết thúc trận đấu: Khi 1 đội bắn chìm toàn bộ 5 tàu của đối phương, hoặc Chủ phòng bấm kết thúc sớm.
  - Phân định thắng thua theo **4 tiêu chí ưu tiên**:
    1. Số tàu đối phương bị đánh chìm (Ships Sunk).
    2. Tổng số ô tàu đối phương bị bắn trúng (Hit Cells).
    3. Tỷ lệ trả lời đúng của toàn đội (Accuracy Rate).
    4. Tổng thời gian trả lời hợp lệ (Response Time - ít hơn là thắng). Nếu bằng nhau cả 4 tiêu chí -> Công nhận Hòa (Draw).

#### Phân hệ 5: Thống kê, Báo cáo & Trải nghiệm giao diện (`Reports & UX`)
- **FR-15: Khôi phục phiên kết nối (F5 Reconnect):**
  - Người chơi hoặc Host tải lại trang (F5) khi đang thi đấu -> Hệ thống tự động nhận diện danh tính và khôi phục nguyên trạng đội, điểm số, trạng thái 2 bản đồ và lượt bắn hiện tại.
- **FR-16: Báo cáo kết quả & Xuất file Excel (`Reports & Export`):**
  - Thống kê chi tiết tỷ lệ đúng/sai theo từng câu hỏi, xếp hạng cá nhân, đóng góp tiêu diệt tàu.
  - Xuất báo cáo điểm ra tệp Microsoft Excel (`.xlsx`).
- **FR-17: Chuyển đổi giao diện Sáng / Tối (Light / Dark Mode Toggle):**
  - Nút chuyển đổi giao diện đặt cạnh ảnh đại diện trên thanh Header, hỗ trợ lưu trữ trạng thái vào LocalStorage/HTML class.

---

### 4. CÁC QUY TẮC NGHIỆP VỤ & GIÁ TRỊ BIÊN (BUSINESS & BOUNDARY RULES)
| Phân hệ / Tham số | Quy tắc / Giới hạn hợp lệ | Giá trị Biên (Boundary Values) | Hành vi khi vi phạm |
| :--- | :--- | :--- | :--- |
| **Mã PIN phòng** | Chuỗi số đúng 6 ký tự (`000000`–`999999`) | 5 số, 6 số, 7 số, chữ cái | Báo lỗi mã PIN không hợp lệ |
| **Độ dài mật khẩu** | Tối thiểu 6 ký tự | 5 ký tự (invalid), 6 ký tự (valid), 7 ký tự (valid) | Báo lỗi mật khẩu phải $\ge 6$ ký tự |
| **Thời gian câu hỏi** | 5 giây đến 120 giây | 4s, 5s, 120s, 121s; mốc đếm ngược `0s` | Không cho lưu $< 5s$; hết giờ `0s` tính 0 điểm |
| **Quân số Hải Chiến** | Tối đa 25 người / hạm đội | 0, 1, 24, 25 (đủ), 26 (vượt biên) | Chặn người thứ 26 vào đội, báo đội đã đầy |
| **Tọa độ bản đồ** | Lưới $15 \times 15$ (Dòng: 0..14, Cột: 0..14) | $(0,0)$, $(14,14)$, $(-1, 0)$, $(15, 10)$ | Ném ngoại lệ `ArgumentOutOfRangeException` |
| **Bắn trùng tọa độ** | Mỗi ô chỉ được bắn 1 lần | Ô chưa bắn (valid), Ô đã bắn (invalid) | Báo lỗi ô đã được bắn trước đó |
| **Lượt bắn Hải Chiến** | Chỉ đội đương nhiệm mới được gửi đáp án & bắn | Đúng phe (valid), Sai phe (invalid) | Từ chối thao tác, báo lỗi chưa đến lượt |

---

### 5. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)
- **NFR-01 (Độ trễ thời gian thực):** Tín hiệu SignalR phát sóng (Broadcast) câu hỏi, điểm số, và phát bắn đại bác phải đến các máy người chơi trong vòng $\le 500ms$ trên mạng nội bộ/Internet tiêu chuẩn.
- **NFR-02 (Tính toàn vẹn dữ liệu):** Không để xảy ra tình trạng nộp trùng đáp án (Double-submit) khi người chơi nhấp chuột nhiều lần liên tiếp (áp dụng cơ chế Debounce 3s trên Server).
- **NFR-03 (Khả năng chịu lỗi & Khôi phục):** Mạng chập chờn hoặc người chơi bấm F5 phải khôi phục phiên trong vòng $\le 2s$ qua sự kiện `ReconnectRoom`.
- **NFR-04 (Tương thích giao diện):** Tương thích tốt trên độ phân giải máy tính (Desktop/Laptop $\ge 1280 \times 720$) và máy tính bảng; hỗ trợ đầy đủ 2 chủ đề Sáng và Tối (Light & Dark Mode).
- **NFR-05 (Bảo mật):** Tọa độ đội tàu của đối thủ không bao giờ được gửi về Client của đội kia trước khi tàu bị bắn trúng, ngăn chặn hoàn toàn việc xem tọa độ qua DevTools (F12 / Network Tab).

