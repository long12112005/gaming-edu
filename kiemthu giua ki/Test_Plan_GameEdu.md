# KẾ HOẠCH KIỂM THỬ PHẦN MỀM (TEST PLAN)
## DỰ ÁN: HỆ THỐNG HỌC TẬP TRÒ CHƠI HÓA THỜI GIAN THỰC (GAMEEDU)
**Tiêu chuẩn áp dụng:** IEEE 829 Standard for Software Test Documentation  
**Môn học:** Kiểm thử Phần mềm (KTPM) — Báo cáo Giữa kỳ (Đề tài 1)  
**Nhóm thực hiện:** Đội ngũ Đảm bảo Chất lượng Phần mềm (QA Team)  
**Phiên bản tài liệu:** 1.0  
**Ngày phát hành:** 29/10/2026  

---

### MỤC LỤC
1. Giới thiệu tổng quan Kế hoạch kiểm thử (Introduction)
2. Phạm vi kiểm thử (Test Scope: In-Scope & Out-of-Scope)
3. Chiến lược & Phương pháp kiểm thử (Test Strategy & Methodology)
4. Môi trường & Công cụ kiểm thử (Test Environment & Tools)
5. Tiêu chuẩn đánh giá & Tiêu chí nghiệm thu (Entry, Suspension & Exit Criteria)
6. Quy trình quản lý lỗi (Defect Management & Severity Matrix)
7. Quản lý rủi ro kiểm thử & Kế hoạch giảm thiểu (Test Risks & Mitigation Plan)
8. Lịch trình thực hiện & Phân công nhân lực (Schedule & Resource Allocation)
9. Sản phẩm bàn giao sau kiểm thử (Test Deliverables)

---

### 1. GIỚI THIỆU TỔNG QUAN (INTRODUCTION)

#### 1.1 Mục đích tài liệu
Tài liệu Kế hoạch Kiểm thử (Test Plan) này được xây dựng nhằm xác định phạm vi, chiến lược, môi trường, nguồn lực và lịch trình thực hiện kiểm thử cho sản phẩm **GameEdu — Nền tảng Học tập Trò chơi hóa Thời gian thực**. Tài liệu đóng vai trò là kim chỉ nam cho nhóm QA trong việc thiết kế các kịch bản kiểm thử (Test Cases), thực thi kiểm thử hệ thống, ghi nhận kết quả và đánh giá mức độ sẵn sàng phát hành của sản phẩm.

#### 1.2 Giới thiệu dự án GameEdu
GameEdu là ứng dụng Web học tập tương tác thế hệ mới, giải quyết bài toán thiếu tương tác và nhàm chán trong các giờ học trực tuyến/trực tiếp. Hệ thống hỗ trợ giáo viên tạo lập ngân hàng đề thi đa dạng (tự động bằng AI hoặc thủ công), tổ chức thi đấu theo thời gian thực bằng mã PIN 6 số và triển khai các đấu trường trò chơi đối kháng, tiêu biểu là **Hải Tặc Tri Thức (Naval War)** với cơ chế trả lời và bắn pháo theo lượt.

#### 1.3 Tài liệu tham chiếu
- Tài liệu Đặc tả Yêu cầu Sản phẩm: `PRD_Phan_Tich_Yeu_Cau_GameEdu.docx`
- Tiêu chuẩn tài liệu kiểm thử phần mềm IEEE 829-2008.
- Mã nguồn hệ thống: Frontend (Next.js 16 / TypeScript), Backend (.NET 10 / ASP.NET Core API / SignalR).

---

### 2. PHẠM VI KIỂM THỬ (TEST SCOPE)

#### 2.1 Các phân hệ trong phạm vi kiểm thử (In-Scope)
Kiểm thử chức năng (Functional Testing), kiểm thử biên (Boundary Testing), kiểm thử luồng lỗi (Negative Testing) và kiểm thử đồng bộ thời gian thực (Real-time Synchronization) cho 5 phân hệ cốt lõi:
1. **Phân hệ 1 — Xác thực & Phân quyền (`Auth Module`):**
   - Đăng ký tài khoản (hợp lệ, trùng email, mật khẩu ngắn).
   - Đăng nhập hệ thống bằng tài khoản Giáo viên, Học sinh; kiểm tra cấp JWT Cookie.
   - Quên mật khẩu và xác thực mã OTP 6 số gửi qua Email.
   - Đổi mật khẩu, cập nhật hồ sơ cá nhân (Nickname, Avatar).
2. **Phân hệ 2 — Quản lý Bộ đề & AI Tạo đề (`Quiz & AI Module`):**
   - Tạo mới, chỉnh sửa, xóa bộ đề thi Quiz.
   - Quản lý 3 dạng câu hỏi: Trắc nghiệm (`QUIZ`), Điền từ khuyết (`FILL_IN_BLANK` với thuật toán Fuzzy Matching), Ghép cặp đôi (`MATCHING`).
   - Tạo câu hỏi tự động qua AI (Google Gemini API) từ tài liệu đính kèm.
   - Tải lên hình ảnh minh họa cho câu hỏi (kiểm tra giới hạn dung lượng và định dạng file).
3. **Phân hệ 3 — Phòng thi đấu trực tuyến & Chấm điểm Real-time (`Live Arena Module`):**
   - Khởi tạo phòng thi đấu, tạo mã PIN 6 số và mã QR tham gia.
   - Tham gia phòng qua mã PIN từ trình duyệt người chơi.
   - Đồng bộ hiển thị câu hỏi và đồng hồ đếm ngược qua SignalR.
   - **Xử lý biên hết thời gian:** Chạm mốc `0s` mà không trả lời -> Chấm `0 điểm` (`+0 pts`) và tự động chuyển câu hỏi tiếp theo (không đơ giao diện).
   - Cơ chế tính điểm tốc độ (Speed Factor), chuỗi trả lời đúng liên tiếp (Combo Streak) và bảng xếp hạng tức thời.
   - Chống gửi đáp án trùng lặp (Double-submit) cho một câu hỏi.
4. **Phân hệ 4 — Trò chơi Hải Tặc Tri Thức (`Naval War Module`):**
   - Chọn hạm đội: Hạm Đội Lam (Phe A) và Hạm Đội Xích (Phe B); giới hạn tối đa `25 người/đội`.
   - Cân bằng lực lượng: Tự động chia đều quân số khi lệch $\ge 2$ người; kích hoạt bùa `X2 Bắn Pháo` cho đội ít quân khi lệch đúng $1$ người.
   - **Cơ chế theo lượt bắn (Turn-based):**
     - Đội tới lượt: Hiển thị câu hỏi + 4 phương án, đồng hồ đếm ngược hoạt động.
     - Đội đối phương: Câu hỏi bị khóa, hiển thị thẻ chờ lượt *"Đang là lượt của đối phương"*.
   - Khai hỏa đại bác: Trả lời đúng nhận quyền bắn, chọn tọa độ $(r, c)$ trên lưới $15 \times 15$.
   - Chống bắn trùng ô đã bắn, chống khai hỏa khi chưa đến lượt.
   - Kỹ năng chiến thuật (Radar $3 \times 3$, Lá chắn Shield, Bắn chính xác Precision Shot).
   - Điều kiện kết thúc & Phân định thắng thua theo 4 tiêu chí ưu tiên.
5. **Phân hệ 5 — Khôi phục phiên, Thống kê & Giao diện (`Reports & UI Module`):**
   - Người chơi bấm F5 tải lại trang giữa trận -> Khôi phục chính xác trạng thái thi đấu (`ReconnectRoom`).
   - Xem thống kê chi tiết sau trận đấu và xuất báo cáo điểm số ra tệp Microsoft Excel (`.xlsx`).
   - Chuyển đổi giao diện Sáng / Tối (Light / Dark Mode) bên cạnh ảnh đại diện.

#### 2.2 Các nội dung ngoài phạm vi kiểm thử (Out-of-Scope)
- Kiểm thử chịu tải cực hạn (Stress/Load Test với $> 50.000$ kết nối đồng thời trên cụm Server phân tán).
- Kiểm thử xâm nhập bảo mật chuyên sâu hạ tầng mạng (Network Penetration Testing).
- Kiểm thử trên các trình duyệt cũ đã bị khai tử (Internet Explorer, Edge Legacy).

---

### 3. CHIẾN LƯỢC & PHƯƠNG PHÁP KIỂM THỬ (TEST STRATEGY)

#### 3.1 Cấp độ kiểm thử (Testing Levels)
- **Kiểm thử tích hợp (Integration Testing):** Kiểm tra sự tương tác giữa Frontend Next.js và Backend API, cũng như giữa SignalR Hubs và PostgreSQL Database.
- **Kiểm thử hệ thống (System Testing):** Kiểm thử toàn bộ quy trình nghiệp vụ đầu cuối (End-to-End) từ khi Giáo viên tạo đề -> Mở phòng -> Học sinh tham gia -> Thi đấu real-time -> Xuất báo cáo Excel.
- **Kiểm thử chấp nhận người dùng (User Acceptance Testing - UAT):** Đóng vai Giáo viên và Học sinh thực nghiệm trải nghiệm người dùng thực tế.

#### 3.2 Các kỹ thuật thiết kế Test Case (Test Design Techniques)
Nhóm áp dụng 4 kỹ thuật cốt lõi của ngành kiểm thử phần mềm để xây dựng bộ Test Case:
1. **Phân vùng tương đương (Equivalence Partitioning - EP):**
   - Chia miền dữ liệu đầu vào thành các lớp tương đương (Hợp lệ và Không hợp lệ).
   - Ví dụ: Định dạng Email (Email có `@` và đuôi hợp lệ vs. Email thiếu `@` hoặc sai định dạng).
2. **Phân tích giá trị biên (Boundary Value Analysis - BVA):**
   - Tập trung vào các điểm biên nơi hệ thống dễ phát sinh lỗi logic nhất:
   - *Thời gian câu hỏi:* Biên $4s$ (Lỗi), $5s$ (Hợp lệ tối thiểu), $120s$ (Hợp lệ tối đa), $121s$ (Lỗi), chạm mốc $0s$ (Hết giờ).
   - *Quân số mỗi đội Hải Chiến:* Biên $24$ người (vào được), $25$ người (đủ quân), $26$ người (bị chặn).
   - *Tọa độ lưới hải chiến:* Dòng $0..14$, Cột $0..14$. Biên ngoài: Dòng $-1$, Cột $15$.
3. **Bảng quyết định (Decision Table Testing):**
   - Áp dụng kiểm thử các luật logic đa điều kiện:
   - Luật cân bằng đội: Lệch $0$ người $\rightarrow$ Bình thường; Lệch $1$ người $\rightarrow$ Kích hoạt Buff X2; Lệch $\ge 2$ người $\rightarrow$ Tự động chuyển người cân bằng.
   - Luật phân định thắng thua 4 tiêu chí: Xét Tiêu chí 1 $\rightarrow$ Nếu hòa xét Tiêu chí 2 $\rightarrow$ Nếu hòa xét Tiêu chí 3 $\rightarrow$ Nếu hòa xét Tiêu chí 4 $\rightarrow$ Nếu hòa công nhận Hòa.
4. **Đoán lỗi & Kiểm thử luồng tiêu cực (Error Guessing & Negative Testing):**
   - Thử nghiệm các hành vi bất thường của người dùng: Nhấp chuột liên tiếp nhiều lần (Double-click submit), người chơi bấm F5 tải lại trang giữa trận, nhập mã PIN không tồn tại, cố tình gửi lệnh bắn khi đang là lượt của đối thủ.

---

### 4. MÔI TRƯỜNG & CÔNG CỤ KIỂM THỬ (TEST ENVIRONMENT & TOOLS)

#### 4.1 Môi trường kiểm thử
- **Máy trạm kiểm thử (Client/Host):** Máy tính chạy Windows 10/11 64-bit, RAM $\ge 8GB$, màn hình Full HD ($1920 \times 1080$).
- **Trình duyệt Web mục tiêu:**
  - Google Chrome (phiên bản mới nhất)
  - Microsoft Edge (phiên bản mới nhất)
- **Hạ tầng Web Application nội bộ:**
  - Frontend: Next.js 16 (`http://localhost:3000`)
  - Backend: ASP.NET Core 10 Web API & SignalR Hub (`http://localhost:5000`)
  - Database: PostgreSQL Server (`localhost:5432`)

#### 4.2 Công cụ hỗ trợ kiểm thử (Testing Tools)
| Tên công cụ | Mục đích sử dụng |
| :--- | :--- |
| **Google Chrome DevTools** | Kiểm tra Network tab (REST API, WebSocket Frames của SignalR), Console log kiểm soát lỗi JavaScript. |
| **Postman / REST Client** | Kiểm thử trực tiếp các Endpoints API Xác thực, Quiz, Report độc lập trước khi tích hợp UI. |
| **Microsoft Excel** | Thiết kế danh sách kịch bản kiểm thử (Test Cases), Ma trận truy xuất (RTM) và tổng hợp kết quả Pass/Fail. |
| **Snipping Tool / Windows Capture** | Chụp ảnh màn hình minh chứng thực tế (Test Evidence) để lưu trữ và đưa vào báo cáo. |

---

### 5. TIÊU CHUẨN ĐÁNH GIÁ & TIÊU CHÍ NGHIỆM THU (TEST CRITERIA)

#### 5.1 Tiêu chí bắt đầu (Entry Criteria)
- Bản đặc tả yêu cầu (PRD) đã hoàn thiện và được phê duyệt.
- Môi trường kiểm thử (Frontend, Backend, Database) đã được triển khai, build thành công $0$ lỗi và kết nối thông suốt.
- Danh sách Test Case đã được thiết kế và rà soát đầy đủ các trường hợp Normal, Boundary, Error.

#### 5.2 Tiêu chí tạm dừng & Tiếp tục (Suspension & Resumption Criteria)
- **Tạm dừng:** Xuất hiện lỗi nghiêm trọng (Blocker/Critical) làm sập hệ thống (Crash Server API, rớt kết nối SignalR toàn bộ phòng chơi, không thể đăng nhập hoặc không thể tạo phòng).
- **Tiếp tục:** Nhóm phát triển đã sửa lỗi (Hotfix), triển khai lại phiên bản vá lỗi và vượt qua bài kiểm tra khói (Smoke Test).

#### 5.3 Tiêu chí hoàn thành & Nghiệm thu (Exit Criteria)
- $100\%$ các Test Case trong kế hoạch đã được thực thi đầy đủ.
- Tỷ lệ Test Case đạt kết quả **Pass** tối thiểu $\ge 90\%$.
- $100\%$ các Test Case mức độ nghiêm trọng **Blocker** và **Critical** phải đạt **Pass** (không còn lỗi nghiêm trọng tồn đọng).
- Toàn bộ kết quả thực tế và ảnh chụp minh chứng được lưu trữ đầy đủ trong hồ sơ kiểm thử.

---

### 6. QUY TRÌNH QUẢN LÝ LỖI (DEFECT MANAGEMENT)

#### 6.1 Vòng đời của lỗi (Defect Lifecycle)
`Phát hiện (New) -> Xác nhận (Open) -> Đang sửa (Assigned/In Progress) -> Đã sửa (Resolved) -> Kiểm tra lại (Retest) -> Đóng lỗi (Closed)`

#### 6.2 Phân cấp Mức độ nghiêm trọng của lỗi (Severity Levels)
1. **Mức 1 — Blocker / Fatal:** Lỗi làm tê liệt toàn bộ hệ thống hoặc tính năng cốt lõi (ví dụ: Server sập, không thể bắt đầu trận đấu, kết nối SignalR thất bại hoàn toàn).
2. **Mức 2 — Critical:** Lỗi nghiêm trọng ảnh hưởng trực tiếp đến kết quả cuộc thi (ví dụ: Đếm ngược $0s$ bị kẹt màn hình không chuyển câu, chấm sai đáp án đúng/sai, người chơi này bắn nhưng trừ nhầm tàu người khác).
3. **Mức 3 — Major:** Tính năng hoạt động không đúng đặc tả nhưng có đường vòng thay thế (ví dụ: Không hiển thị ảnh minh họa câu hỏi, lọc tìm kiếm Quiz không chính xác).
4. **Mức 4 — Minor / Trivial:** Lỗi giao diện nhỏ, chính tả hoặc thẩm mỹ (ví dụ: Nút bấm lệch $2px$, lỗi phông chữ nhỏ, hiển thị nhãn chưa đẹp ở Dark Mode).

#### 6.3 Phân cấp Mức độ ưu tiên khắc phục (Priority Levels)
- **High (Cao):** Phải sửa ngay lập tức trong phiên bản build tiếp theo.
- **Medium (Vừa):** Khắc phục trong đợt cập nhật thông thường.
- **Low (Thấp):** Có thể xem xét điều chỉnh ở các đợt hoàn thiện giao diện sau.

---

### 7. QUẢN LÝ RỦI RO & KẾ HOẠCH ỨNG PHÓ (RISK MANAGEMENT)

| Mã Rủi ro | Nguy cơ rủi ro | Xác suất / Ảnh hưởng | Giải pháp kiểm thử & Kế hoạch ứng phó |
| :--- | :--- | :--- | :--- |
| **RSK-01** | Người chơi bấm `F5` tải lại trang giữa trận làm mất dữ liệu phòng | Trung bình / Cao | Thiết kế Test Case kiểm thử chức năng `ReconnectRoom`; đảm bảo Server lưu trạng thái theo `PlayerId/Token` để khôi phục nguyên trạng. |
| **RSK-02** | Xung đột lượt bắn khi người chơi click đúp chuột nhanh hoặc nộp câu hỏi 2 lần | Cao / Nghiêm trọng | Kiểm tra cơ chế Debounce 3s tại Controller và vô hiệu hóa nút nộp (`disabled`) ngay sau cú nhấp đầu tiên. |
| **RSK-03** | Bộ đếm giờ chạm mốc `0s` làm đơ giao diện người chơi | Cao / Nghiêm trọng | Kiểm thử tự động kích hoạt sự kiện hết giờ trên Client và Server (`TimeoutTurn`), tự động tính `0 điểm` và gửi lệnh chuyển câu/chuyển lượt. |
| **RSK-04** | Người chơi đội đối phương xem lén tọa độ tàu qua mã nguồn mạng | Thấp / Nghiêm trọng | Kiểm thử bảo mật (Data Leak): Xác minh phản hồi `NavalMapState` của Team A tuyệt đối không chứa mảng tọa độ tàu của Team B. |
| **RSK-05** | Quân số 2 đội lệch nhau gây mất công bằng trận đấu | Cao / Trung bình | Kiểm thử tự động cân bằng quân số (Rebalance) khi lệch $\ge 2$ người và cấp hiệu ứng Buff X2 khi lệch $1$ người. |

---

### 8. LỊCH TRÌNH THỰC HIỆN & PHÂN CÔNG NHÂN SỰ (SCHEDULE & RESOURCES)

#### 8.1 Lịch trình các mốc kiểm thử (Milestones)
- **Mốc 1 (Ngày 25/10 – 26/10):** Khảo sát hệ thống, phân tích đặc tả yêu cầu (PRD) và soạn thảo Kế hoạch kiểm thử (Test Plan).
- **Mốc 2 (Ngày 27/10 – 28/10):** Thiết kế bảng 25 Kịch bản kiểm thử chi tiết (Test Cases) trên Microsoft Excel bao phủ Normal, Boundary, Error.
- **Mốc 3 (Ngày 29/10):** Tiến hành thực thi kiểm thử trên môi trường thực tế, ghi nhận kết quả Pass/Fail và chụp bộ ảnh minh chứng (`evidence_screenshots/`).
- **Mốc 4 (Ngày 30/10):** Tổng hợp số liệu, hoàn thiện Slide báo cáo thuyết trình và đóng gói toàn bộ hồ sơ nộp bài giữa kỳ.

#### 8.2 Phân công vai trò trong nhóm QA
- **Trưởng nhóm QA (QA Lead):** Lập kế hoạch kiểm thử (Test Plan), điều phối lịch trình, quản lý rủi ro và rà soát chất lượng bộ Test Case.
- **Chuyên viên thiết kế Test Case (Test Designer):** Phân tích kỹ thuật EP, BVA, Decision Table để viết 25 Test Case chi tiết cho 5 phân hệ.
- **Kiểm thử viên thực thi (Test Executor):** Chạy thực tế các kịch bản kiểm thử trên Web, ghi nhận kết quả Pass/Fail và chụp ảnh bằng chứng (Screenshots).
- **Phụ trách Báo cáo & Thuyết trình (Report & Presenter):** Thiết kế Slide thuyết trình PowerPoint, tổng hợp biểu đồ thống kê chất lượng.

---

### 9. SẢN PHẨM BÀN GIAO (TEST DELIVERABLES)
Sau khi kết thúc quá trình kiểm thử, nhóm QA bàn giao đầy đủ bộ tài liệu gồm:
1. 📄 **Tài liệu Kế hoạch kiểm thử:** `Test_Plan_GameEdu.docx` (Chuẩn IEEE 829).
2. 📊 **Bộ Kịch bản kiểm thử chi tiết:** `Test_Cases_GameEdu.xlsx` (Gồm Dashboard, Ma trận RTM, 25 Test Cases chi tiết có cột minh chứng).
3. 🖥️ **Slide báo cáo thuyết trình:** `Slide_BaoCao_KTPM_DeTai1.pptx` (Chuyên nghiệp, có chèn ảnh chụp thực tế).
4. 🖼️ **Bộ ảnh chụp minh chứng:** Thư mục `evidence_screenshots/` chứa 10 ảnh bằng chứng thực thi thực tế.

