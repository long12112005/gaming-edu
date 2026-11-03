# DANH SÁCH CÁC BƯỚC CÔNG VIỆC CẦN LÀM — ĐỀ TÀI 1 (GIỮA KỲ KTPM)

**Tên đề tài:** Lập kế hoạch và thiết kế Test Case cho ứng dụng Web thực tế — **Hệ thống Học tập Trò chơi hóa Thời gian thực (GameEdu)**  
**Vai trò nhóm:** Đội ngũ Đảm bảo Chất lượng Phần mềm (QA Team)  
**Bộ sản phẩm bắt buộc phải nộp (3 file + bộ ảnh minh chứng):**
1. 📄 **File 1 — Kế hoạch kiểm thử (`Test_Plan_GameEdu.docx`)**
2. 📊 **File 2 — Kịch bản kiểm thử (`Test_Cases_GameEdu.xlsx`)** *(tối thiểu 15–20 Test Case, khuyến nghị 25 Test Case bao phủ Normal, Boundary, Error + cột Minh chứng)*
3. 🖥️ **File 3 — Slide thuyết trình (`Slide_BaoCao_KTPM_DeTai1.pptx`)** *(có chèn ảnh chụp màn hình thực thi Test Case thực tế)*
4. 🖼️ **Thư mục ảnh minh chứng (`evidence_screenshots/`)** *(10 ảnh chụp màn hình chứng minh đã thực thi kiểm thử thực tế trên Web)*

---

## GIAI ĐOẠN 1: KHẢO SÁT HỆ THỐNG & PHÂN TÍCH ĐẶC TẢ YÊU CẦU (PRD)

- [x] **Bước 1.1: Xác định các tác nhân (Actors) của hệ thống GameEdu** (Đã hoàn thành - xem file PRD)
  - **Giáo viên / Chủ phòng (Host):** Tạo bộ câu hỏi, tạo phòng thi đấu mã PIN, điều phối trận đấu, làm trọng tài quan sát và xuất báo cáo Excel.
  - **Học sinh / Người chơi (Player / Guest):** Tham gia phòng qua mã PIN/QR, chọn đội, trả lời câu hỏi theo thời gian thực và tương tác chiến thuật.
  - **Quản trị viên (Admin):** Quản lý người dùng và giám sát hệ thống.

- [x] **Bước 1.2: Chốt 5 phân hệ cốt lõi (Core Modules) đưa vào phạm vi kiểm thử** (Đã hoàn thành - xem file PRD)
  1. **Module 1 — Xác thực & Tài khoản (`Auth`):** Đăng ký, Đăng nhập JWT, Quên mật khẩu qua OTP Email, Đổi mật khẩu, Cập nhật hồ sơ.
  2. **Module 2 — Quản lý Bộ câu hỏi & AI Tạo đề (`Quiz & Slide`):** Thêm/Sửa/Xóa Quiz, 3 dạng câu hỏi (Trắc nghiệm `QUIZ`, Điền khuyết `FILL_IN_BLANK`, Ghép cặp `MATCHING`), Tạo đề tự động bằng AI từ file tài liệu, Upload ảnh minh họa.
  3. **Module 3 — Phòng thi đấu Trực tuyến & Chấm điểm Real-time (`Live Room`):** Tạo phòng sinh mã PIN 6 chữ số, Tham gia phòng, Đồng hồ đếm ngược câu hỏi, Tự động tính `0 điểm` và chuyển câu khi hết thời gian (`0s`), Tính điểm tốc độ & chuỗi Combo.
  4. **Module 4 — Trò chơi Hải Tặc Tri Thức (`Naval War`):**
     - Chia 2 phe (Hạm Đội Lam A & Hạm Đội Xích B), giới hạn tối đa `25 người/đội`.
     - Tự động cân bằng quân số khi lệch `>= 2 người`; cấp bùa **X2 Bắn Pháo** khi lệch `1 người`.
     - Cơ chế **trả lời và khai hỏa theo lượt bắn**: Chỉ hiện câu hỏi khi đến lượt đội mình; trả lời đúng được cấp quyền bắn đại bác trên bản đồ $15 \times 15$; trả lời sai hoặc hết giờ tự động chuyển lượt cho đối phương.
     - Kỹ năng chiến thuật (Radar quét $3 \times 3$, Lá chắn phòng thủ, Bắn chính xác) và phân định thắng thua theo 4 tiêu chí ưu tiên.
  5. **Module 5 — Thống kê, Báo cáo & Giao diện (`Reports & UI`):** Xem bảng xếp hạng tổng kết, Xuất báo cáo kết quả ra file Excel (`.xlsx`), Chuyển đổi giao diện Sáng / Tối (Light / Dark Mode).

- [x] **Bước 1.3: Tổng hợp các quy tắc nghiệp vụ & giá trị biên (Boundary Rules)** (Đã hoàn thành - xem file PRD)
  - Mã PIN phòng chơi: đúng `6 ký tự số`.
  - Thời gian trả lời câu hỏi (`timeLimit`): biên tối thiểu `5s` – tối đa `120s`, mốc hết giờ `0s`.
  - Quân số mỗi đội Hải Chiến: biên `0`, `1`, `24`, `25` (tối đa) và `26` (vượt biên).
  - Tọa độ bản đồ Hải Chiến: biên dòng/cột từ `0` đến `14` (bản đồ $15 \times 15$), ngoài biên `< 0` hoặc `>= 15`.
  - Dung lượng & định dạng file upload: kiểm tra file hợp lệ (`.png`, `.jpg`, `.pdf`, `.docx`) và file sai định dạng/quá dung lượng.

---

## GIAI ĐOẠN 2: XÂY DỰNG TÀI LIỆU TEST PLAN (FILE 1 — `.docx`)

- [x] **Bước 2.1: Viết phần Giới thiệu & Tóm tắt Đặc tả Yêu cầu (PRD Summary)** (Đã hoàn thành - xem Test_Plan_GameEdu.docx)
  - Mô tả mục đích hệ thống GameEdu, kiến trúc Web (Frontend Next.js + Backend ASP.NET Core & SignalR + PostgreSQL).
  - Liệt kê danh sách yêu cầu chức năng (`FR-01` đến `FR-17`) và phi chức năng (`NFR-01` đến `NFR-05`).

- [x] **Bước 2.2: Xác định Phạm vi Kiểm thử (Scope of Testing)** (Đã hoàn thành - xem Test_Plan_GameEdu.docx)
  - **In-Scope (Trong phạm vi):** Kiểm thử chức năng (Functional), Kiểm thử biên & ngoại lệ (Boundary & Negative), Kiểm thử đồng bộ thời gian thực qua WebSocket/SignalR, Kiểm thử giao diện (UI/UX, Responsive, Sáng/Tối).
  - **Out-of-Scope (Ngoài phạm vi):** Kiểm thử chịu tải hàng chục nghìn kết nối đồng thời (Load/Stress Test quy mô lớn), Kiểm thử xâm nhập bảo mật chuyên sâu (Penetration Test).

- [x] **Bước 2.3: Lập Chiến lược, Môi trường & Công cụ Kiểm thử** (Đã hoàn thành - xem Test_Plan_GameEdu.docx)
  - Phương pháp thiết kế Test Case: **Phân vùng tương đương (Equivalence Partitioning)**, **Phân tích giá trị biên (Boundary Value Analysis)**, **Đoán lỗi (Error Guessing)** và **Bảng quyết định (Decision Table)**.
  - Môi trường kiểm thử: Windows 10/11, Chrome / Edge, Node.js, .NET 10, PostgreSQL.

- [x] **Bước 2.4: Phân tích Rủi ro & Giải pháp Giảm thiểu (Risk Management)** (Đã hoàn thành - xem Test_Plan_GameEdu.docx)
  - Rủi ro ngắt kết nối mạng hoặc người chơi bấm `F5` tải lại trang khi đang thi đấu -> Kiểm thử tính năng `ReconnectRoom`.
  - Rủi ro xung đột lượt bắn hoặc nộp câu trả lời 2 lần liên tiếp -> Kiểm thử khóa nút nộp và kiểm tra lượt trên Server.
  - Rủi ro kẹt màn hình khi đếm ngược về `0s` -> Kiểm thử tự động chấm `0 điểm` và chuyển câu/chuyển lượt.

- [x] **Bước 2.5: Định nghĩa Tiêu chí Kiểm thử & Lịch trình Phân công** (Đã hoàn thành - xem Test_Plan_GameEdu.docx)
  - Tiêu chí bắt đầu (Entry Criteria), Tiêu chí tạm dừng (Suspension Criteria), Tiêu chí hoàn thành (Exit Criteria: 100% Test Case được thực thi, >= 90% Pass, 0 lỗi Blocker/Critical tồn đọng).
  - Bảng phân công nhiệm vụ cho các thành viên trong nhóm QA.

---

## GIAI ĐOẠN 3: THIẾT KẾ TEST CASE CHI TIẾT (FILE 2 — `.xlsx`)

- [x] **Bước 3.1: Tạo cấu trúc bảng Excel Test Case chuẩn QA** (Đã hoàn thành - xem Test_Cases_GameEdu.xlsx)
  - Sheet 1: **Tổng quan & Thống kê (Dashboard Summary)** (Tổng số TC, Normal/Boundary/Error, Pass/Fail).
  - Sheet 2: **Ma trận Truy xuất Yêu cầu (RTM)** ánh xạ từ `PRD Requirement ID` sang `Test Case ID`.
  - Sheet 3: **Danh sách Test Case Chi tiết** với các cột:
    `Mã TC | Phân hệ (Module) | Tên kịch bản | Phân loại (Normal/Boundary/Error) | Độ ưu tiên | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Kết quả thực tế | Trạng thái (Pass/Fail) | Ảnh minh chứng (Evidence)`

- [x] **Bước 3.2: Viết tối thiểu 25 Test Case bao phủ cả 3 nhóm (Normal, Boundary, Error)** (Đã hoàn thành - xem Test_Cases_GameEdu.xlsx)
  - **Nhóm 1 — Xác thực & Tài khoản (5 Test Cases):**
    - `TC_AUTH_01` *(Normal)*: Đăng ký và đăng nhập thành công với thông tin hợp lệ.
    - `TC_AUTH_02` *(Error)*: Đăng nhập thất bại khi nhập sai mật khẩu hoặc tài khoản không tồn tại.
    - `TC_AUTH_03` *(Error)*: Đăng ký thất bại khi dùng Email đã tồn tại trong hệ thống.
    - `TC_AUTH_04` *(Boundary)*: Kiểm tra độ dài biên mật khẩu (quá ngắn `< 6` ký tự hoặc để trống).
    - `TC_AUTH_05` *(Error)*: Xác thực OTP quên mật khẩu khi nhập mã OTP sai hoặc đã hết hạn.
  - **Nhóm 2 — Quản lý Bộ câu hỏi & Upload (5 Test Cases):**
    - `TC_QUIZ_01` *(Normal)*: Tạo mới bộ đề Quiz gồm đủ 3 dạng câu hỏi (Trắc nghiệm, Điền khuyết, Ghép cặp).
    - `TC_QUIZ_02` *(Normal)*: Tạo bộ câu hỏi tự động bằng AI từ văn bản/tài liệu tải lên.
    - `TC_QUIZ_03` *(Boundary)*: Thiết lập thời gian trả lời (`timeLimit`) ở giá trị biên nhỏ nhất/lớn nhất và kiểm tra khi nhập `<= 0`.
    - `TC_QUIZ_04` *(Error)*: Lưu câu hỏi trắc nghiệm khi chưa chọn đáp án đúng hoặc để trống nội dung câu hỏi.
    - `TC_QUIZ_05` *(Error/Boundary)*: Upload file hình ảnh vượt quá dung lượng cho phép hoặc sai định dạng file.
  - **Nhóm 3 — Phòng thi đấu Real-time & Chấm điểm (5 Test Cases):**
    - `TC_ROOM_01` *(Normal)*: Chủ phòng mở phòng chơi và học sinh tham gia thành công bằng mã PIN 6 chữ số.
    - `TC_ROOM_02` *(Error)*: Học sinh nhập mã PIN không tồn tại hoặc phòng đã kết thúc (`FINISHED`).
    - `TC_ROOM_03` *(Normal)*: Học sinh trả lời đúng câu hỏi trong thời gian quy định, hệ thống cộng điểm thưởng tốc độ & tăng chuỗi Combo.
    - `TC_ROOM_04` *(Boundary)*: Đồng hồ đếm ngược chạm mốc `0s` khi người chơi chưa chọn đáp án -> Hệ thống tính `0 điểm` và tự động chuyển sang câu hỏi tiếp theo (không bị đứng màn hình).
    - `TC_ROOM_05` *(Error)*: Chống gửi đáp án trùng lặp (Double Submit) cho cùng một câu hỏi trong cùng lượt.
  - **Nhóm 4 — Trò chơi Hải Tặc Tri Thức / Naval War (7 Test Cases):**
    - `TC_NAVAL_01` *(Normal)*: Hiển thị câu hỏi đúng theo lượt bắn của đội — Đội đang tới lượt thấy câu hỏi để trả lời, đội đối phương thấy màn hình chờ lượt.
    - `TC_NAVAL_02` *(Normal)*: Trả lời đúng câu hỏi trong lượt -> Nhận quyền bắn (`shotsEarned`), bắn trúng tàu địch trên lưới $15 \times 15$ và tự động chuyển lượt cho đội đối phương sau khi bắn xong.
    - `TC_NAVAL_03` *(Normal/Error)*: Trả lời sai hoặc hết thời gian (`0s`) trong lượt -> Không nhận quyền bắn và lập tức chuyển lượt sang đội đối phương.
    - `TC_NAVAL_04` *(Error)*: Cố tình gọi thao tác bắn hoặc gửi đáp án khi đang là lượt của đội đối phương -> Hệ thống từ chối và báo lỗi.
    - `TC_NAVAL_05` *(Error)*: Bắn lặp lại vào ô tọa độ $(r, c)$ đã bắn trước đó trên bản đồ đối phương -> Hệ thống chặn và yêu cầu chọn ô khác.
    - `TC_NAVAL_06` *(Boundary)*: Kiểm tra giới hạn biên tối đa `25 người/đội` (người thứ 26 gia nhập đội sẽ bị chặn và thông báo đội đã đầy).
    - `TC_NAVAL_07` *(Boundary)*: Kiểm tra tự động cân bằng quân số khi chênh lệch `>= 2 người` và cấp hiệu ứng **X2 Bắn Pháo** khi chênh lệch đúng `1 người`.
  - **Nhóm 5 — Báo cáo, Khôi phục kết nối & Giao diện (3 Test Cases):**
    - `TC_REP_01` *(Normal)*: Người chơi bấm `F5` tải lại trang giữa trận đấu -> Hệ thống tự động khôi phục đúng đội, điểm số, bản đồ tàu và lượt bắn hiện tại (`ReconnectRoom`).
    - `TC_REP_02` *(Normal)*: Chủ phòng xem bảng tổng kết sau trận đấu và xuất báo cáo điểm chi tiết ra file Excel (`.xlsx`).
    - `TC_REP_03` *(Normal)*: Chuyển đổi giao diện Sáng / Tối (Light / Dark Mode) trên thanh điều hướng bên cạnh ảnh đại diện và lưu trạng thái khi chuyển trang.

---

## GIAI ĐOẠN 4: THỰC THI KIỂM THỬ & CHỤP ẢNH CHỨNG MINH (TEST EVIDENCE)

> **Lưu ý quan trọng:** Trong báo cáo Kiểm thử phần mềm, **Ảnh chứng minh (Test Evidence Screenshots)** là bằng chứng thực tế chứng tỏ nhóm đã thực thi các Test Case trên ứng dụng thật (bao gồm cả ca thành công **Normal**, ca bắt lỗi **Error** và ca kiểm thử biên **Boundary**).
>
> **Quy tắc chụp ảnh chuẩn QA:**
> 1. Chụp toàn màn hình trình duyệt (thấy rõ thanh địa chỉ URL `localhost:3000/...` để chứng minh hệ thống đang chạy thật).
> 2. Với các Test Case kiểm thử song song 2 người chơi (như **Hải Tặc Tri Thức theo lượt**), đặt **2 cửa sổ trình duyệt cạnh nhau (Split Screen trái - phải)**: bên trái là **Đội Lam (Phe A)**, bên phải là **Đội Xích (Phe B)** để thấy rõ bên tới lượt hiện câu hỏi, bên kia hiện màn hình chờ.
> 3. Lưu ảnh vào thư mục `kiemthu giua ki/evidence_screenshots/` theo đúng mã tên dưới đây để điền vào cột `Evidence` trong file Excel và chèn vào Slide thuyết trình.

### Danh mục 10 ảnh chứng minh cần chụp cụ thể:

- [x] **Ảnh 1 (`EV_01_Auth_Error_Boundary.png`) — Minh chứng `TC_AUTH_02` & `TC_AUTH_04` (Kiểm thử Lỗi & Biên Đăng nhập/Đăng ký)**
  - **Cách chụp:** Mở trang `/login` hoặc `/register`, nhập mật khẩu sai hoặc mật khẩu ngắn hơn biên quy định để hệ thống hiển thị thông báo lỗi màu đỏ trên giao diện.
  - **Điểm cần thấy rõ:** Khung nhập liệu + Thông báo lỗi trả về đúng như Expected Result.

- [x] **Ảnh 2 (`EV_02_Quiz_Creation_AI.png`) — Minh chứng `TC_QUIZ_01` & `TC_QUIZ_02` (Tạo bộ câu hỏi & AI tạo đề)**
  - **Cách chụp:** Mở trang quản lý/chỉnh sửa bộ đề Quiz hoặc giao diện tạo câu hỏi bằng AI, hiển thị danh sách câu hỏi gồm các dạng Trắc nghiệm / Điền khuyết / Ghép cặp và cấu hình thời gian `timeLimit`.
  - **Điểm cần thấy rõ:** Nội dung câu hỏi, các phương án trả lời, thời gian đếm ngược và điểm số mỗi câu.

- [x] **Ảnh 3 (`EV_03_Room_PIN_Lobby.png`) — Minh chứng `TC_ROOM_01` & `TC_ROOM_02` (Phòng chờ mã PIN 6 số & QR Code)**
  - **Cách chụp:** Mở màn hình Chủ phòng (hiển thị mã PIN 6 chữ số + mã QR + danh sách học sinh đã vào phòng) hoặc chụp kèm màn hình `/play` khi nhập sai mã PIN báo lỗi.
  - **Điểm cần thấy rõ:** Mã PIN 6 số, mã QR và danh sách người chơi đồng bộ theo thời gian thực.

- [x] **Ảnh 4 (`EV_04_Timeout_ZeroScore_AutoNext.png`) — Minh chứng `TC_ROOM_04` (Kiểm thử biên hết thời gian `0s`)**
  - **Cách chụp:** Trong phòng chơi `/play/[pin]`, để đồng hồ đếm ngược chạm mốc `0s` mà không bấm chọn đáp án. Chụp ngay khoảnh khắc hệ thống hiện thông báo **"HẾT GIỜ! +0 pts (Không tính điểm câu này)"** trước khi tự động chuyển sang câu tiếp theo.
  - **Điểm cần thấy rõ:** Đồng hồ `0s`, thông báo `+0 pts` và trạng thái tự động chuyển câu (chứng minh đã xử lý triệt để lỗi đứng màn hình khi hết giờ).

- [x] **Ảnh 5 (`EV_05_Naval_TurnBased_SplitScreen.png`) — Minh chứng `TC_NAVAL_01` (Kiểm thử trả lời theo lượt bắn Hải Tặc Tri Thức)** *(Ảnh quan trọng nhất)*
  - **Cách chụp:** Chia đôi màn hình 2 cửa sổ trình duyệt:
    - Cửa sổ Trái (**Hạm Đội Lam - Phe A**): Đang ở **Lượt Bắn #1**, hiển thị huy hiệu `🎯 LƯỢT ĐỘI BẠN (#1)` và **xuất hiện câu hỏi + 4 đáp án** để trả lời.
    - Cửa sổ Phải (**Hạm Đội Xích - Phe B**): Hiển thị màn hình khóa **`Lượt Bắn #1 — Chờ Lượt Đội Bạn: Đang là lượt của Hạm Đội Lam (Phe A). Câu hỏi sẽ xuất hiện ngay khi đến lượt bắn của đội bạn!`**.
  - **Điểm cần thấy rõ:** Sự đối lập trực quan giữa 2 màn hình chứng minh đúng yêu cầu nghiệp vụ trả lời theo lượt.

- [x] **Ảnh 6 (`EV_06_Naval_Shoot_And_SwitchTurn.png`) — Minh chứng `TC_NAVAL_02` & `TC_NAVAL_05` (Trả lời đúng -> Bắn tàu trên lưới $15 \times 15$ & Chống bắn trùng ô)**
  - **Cách chụp:** Sau khi trả lời đúng nhận `1 lượt bắn` (hoặc `2 lượt bắn` nếu có buff X2), chụp màn hình hiển thị thông báo **"Chính xác! Hãy nhấp vào ô trên bản đồ Hải Phận Đối Phương để bắn đại bác"** cùng các ô trúng đích (`HIT`/`SUNK`) hoặc thông báo chặn khi nhấp vào ô đã bắn.
  - **Điểm cần thấy rõ:** Bản đồ $15 \times 15$, số lượt bắn còn lại và nhật ký chiến trường (Combat Log) ghi nhận chuyển lượt `🔄 CHUYỂN LƯỢT #2`.

- [x] **Ảnh 7 (`EV_07_Naval_Balance_DoubleShot.png`) — Minh chứng `TC_NAVAL_06` & `TC_NAVAL_07` (Kiểm thử biên quân số & Buff X2 Bắn Pháo)**
  - **Cách chụp:** Chụp màn hình sảnh chờ hoặc trong trận khi quân số 2 bên chênh lệch 1 người (ví dụ 1 vs 2), hiển thị thông báo vàng: **`⚡ BẠN ĐANG CÓ HIỆU ỨNG X2 BẮN PHÁO (BUFF X2)`** để cân bằng lực lượng.
  - **Điểm cần thấy rõ:** Banner Buff X2 hoặc thông báo cân bằng đội tự động.

- [x] **Ảnh 8 (`EV_08_Host_Spectator_Referee.png`) — Minh chứng vai trò Trọng tài quan sát & Kết thúc trận đấu**
  - **Cách chụp:** Chụp màn hình của Chủ phòng (Trọng tài quan sát trung lập) nhìn thấy toàn cảnh 2 bản đồ Hạm Đội Lam & Hạm Đội Xích cùng lúc, hoặc hộp thoại **Kết quả Chiến thắng (4 tiêu chí ưu tiên)**.
  - **Điểm cần thấy rõ:** Bảng đối chiếu 4 tiêu chí phân định thắng thua (Số tàu chìm, Số ô trúng, Tỷ lệ đúng, Tổng thời gian).

- [x] **Ảnh 9 (`EV_09_Report_And_Excel.png`) — Minh chứng `TC_REP_02` (Thống kê báo cáo & Xuất file Excel)**
  - **Cách chụp:** Mở trang `/reports/[roomId]` hiển thị bảng xếp hạng học sinh, tỷ lệ câu đúng/sai và file `.xlsx` vừa tải về ở góc trình duyệt.
  - **Điểm cần thấy rõ:** Bảng điểm tổng kết và nút/file Xuất Báo Cáo Excel.

- [x] **Ảnh 10 (`EV_10_Light_Dark_Theme.png`) — Minh chứng `TC_REP_03` (Kiểm thử giao diện Sáng / Tối cạnh ảnh đại diện)**
  - **Cách chụp:** Ghép 2 ảnh (hoặc chụp 2 cửa sổ) trang chủ `/home` ở chế độ **Giao diện Sáng (Light Mode)** và **Giao diện Tối (Dark Mode)** với nút mặt trời/mặt trăng nằm ngay bên cạnh ảnh đại diện (Avatar) trên thanh Header.
  - **Điểm cần thấy rõ:** Nút chuyển đổi Sáng/Tối cạnh Avatar và màu sắc toàn trang thay đổi đồng bộ.

---

## GIAI ĐOẠN 5: THIẾT KẾ SLIDE THUYẾT TRÌNH (FILE 3 — `.pptx`)

- [x] **Bước 5.1: Xây dựng nội dung 10–12 Slide báo cáo (có chèn ảnh minh chứng)**
  - **Slide 1:** Trang bìa (Tên đề tài 1, Tên ứng dụng GameEdu, Danh sách thành viên nhóm QA).
  - **Slide 2:** Tổng quan ứng dụng Web thực tế GameEdu & Kiến trúc hệ thống *(Chèn Ảnh `EV_10`)*.
  - **Slide 3:** Tóm tắt phân tích đặc tả yêu cầu (PRD) & 5 phân hệ cốt lõi *(Chèn Ảnh `EV_02`, `EV_03`)*.
  - **Slide 4:** Tổng quan Kế hoạch kiểm thử (Test Plan: Phạm vi In-Scope / Out-of-Scope).
  - **Slide 5:** Chiến lược kiểm thử & Các kỹ thuật thiết kế Test Case áp dụng (EP, BVA, Decision Table, Error Guessing).
  - **Slide 6:** Quản lý rủi ro chất lượng & Tiêu chí hoàn thành (Entry / Exit Criteria).
  - **Slide 7:** Thống kê danh mục 25 Test Case theo phân hệ và phân loại (Normal / Boundary / Error).
  - **Slide 8:** Minh họa Test Case & Bằng chứng thực thi #1 — Phòng thi đấu Real-time & Xử lý biên hết giờ `0s` *(Chèn Ảnh `EV_04`)*.
  - **Slide 9:** Minh họa Test Case & Bằng chứng thực thi #2 — Hải Tặc Tri Thức theo lượt bắn & Cân bằng biên *(Chèn Ảnh `EV_05`, `EV_06`, `EV_07`)*.
  - **Slide 10:** Kết quả thực thi kiểm thử (Biểu đồ tỷ lệ Pass/Fail), Báo cáo thống kê *(Chèn Ảnh `EV_08`, `EV_09`)* & Kết luận.

- [x] **Bước 5.2: Rà soát bộ hồ sơ cuối cùng trước khi nộp**
  - Kiểm tra đủ các thành phần trong thư mục `kiemthu giua ki`:
    1. `Test_Plan_GameEdu.docx` (Kế hoạch kiểm thử chi tiết)
    2. `Test_Cases_GameEdu.xlsx` (Danh sách 25 Test Case + Ma trận RTM + Thống kê)
    3. `Slide_BaoCao_KTPM_DeTai1.pptx` (Slide thuyết trình kèm hình ảnh minh chứng)
    4. `evidence_screenshots/` (Bộ ảnh chụp màn hình chứng minh kết quả kiểm thử)
