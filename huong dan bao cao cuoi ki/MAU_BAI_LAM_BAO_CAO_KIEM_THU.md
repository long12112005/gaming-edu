# BÁO CÁO KIỂM THỬ VÀ ĐẢM BẢO CHẤT LƯỢNG PHẦN MỀM
## ĐỀ TÀI: KIỂM THỬ HỆ THỐNG QUẢN TRỊ NỘI DUNG WORDPRESS (PHIÊN BẢN 6.6)

---

> [!NOTE]
> **TÀI LIỆU MẪU (SAMPLE TEMPLATE)**: File này là bài làm mẫu báo cáo kỹ thuật hoàn chỉnh dành cho sinh viên tham khảo, thể hiện đầy đủ cấu trúc 8 phần kỹ thuật, phân tích yêu cầu, thiết kế test case, triển khai kiểm thử thực tế, quản lý lỗi, đo lường chỉ số và tổ chức công việc theo đúng Yêu cầu thực hiện báo cáo cuối kỳ.

---

```
                                TRƯỜNG ĐẠI HỌC LẠC HỒNG
                               KHOA CÔNG NGHỆ THÔNG TIN
                                     🙡 ✵ 🙣

                   BÁO CÁO KIỂM THỬ VÀ ĐẢM BẢO CHẤT LƯỢNG PHẦN MỀM
                  -------------------------------------------------
                  ĐỀ TÀI: KIỂM THỬ HỆ THỐNG QUẢN TRỊ NỘI DUNG WORDPRESS

                  Giảng viên hướng dẫn : GV. Nguyễn Minh Phúc
                  Lớp                  : 22CT115
                  Nhóm thực hiện       : Nhóm 09
                  Thành viên           : 1. Cao Lê Huy       - MSSV: 122001459
                                         2. Nguyễn Đoàn Nhật Minh - MSSV: 122000253
                                         3. Lương Đức Mạnh   - MSSV: 122001481

                                    Tháng 11/2025
```

---

## MỤC LỤC BÁO CÁO

* **PHẦN 1: GIỚI THIỆU**
  * 1.1. Mục tiêu kiểm thử
  * 1.2. Giới thiệu ứng dụng được kiểm thử (WordPress 6.6)
* **PHẦN 2: PHÂN TÍCH YÊU CẦU**
  * 2.1. Liệt kê các chức năng chính (In-Scope / Out-of-Scope)
  * 2.2. Bản đồ chức năng (Function Map / Sơ đồ phân rã chức năng)
* **PHẦN 3: THIẾT KẾ KIỂM THỬ**
  * 3.1. Phương pháp & Kỹ thuật thiết kế Test Case (EP, BVA, Decision Table, Use Case)
  * 3.2. Danh sách Yêu cầu kiểm thử (Test Requirements - TR)
  * 3.3. Danh sách Test Case mẫu & Thống kê phân bổ (Bảng Test Case chi tiết)
* **PHẦN 4: THỰC HIỆN KIỂM THỬ**
  * 4.1. Triển khai kiểm thử thực tế (Manual & Tool-based Execution)
  * 4.2. Hình ảnh minh họa bằng chứng kiểm thử (Screenshots Evidence)
* **PHẦN 5: QUẢN LÝ LỖI (BUG MANAGEMENT)**
  * 5.1. Quy trình & Công cụ quản lý lỗi (Jira / Bug Log)
  * 5.2. Bảng tổng hợp nhật ký lỗi (Defect Log / Bug Report)
  * 5.3. Mô tả, ảnh chụp màn hình và phân tích lỗi chi tiết (Root Cause Analysis)
* **PHẦN 6: ĐÁNH GIÁ KẾT QUẢ & ĐO LƯỜNG**
  * 6.1. Các chỉ số đo lường kiểm thử cơ bản (% Pass Rate, Defect Density, Coverage)
  * 6.2. Phân tích hiệu quả & Bình luận đánh giá chất lượng phần mềm
  * 6.3. Kết luận & Quyết định triển khai (Go / No-Go Decision)
* **PHẦN 7: TỔ CHỨC THỰC HIỆN**
  * 7.1. Phân công công việc (WBS) & Lịch trình tiến độ (Gantt Chart)
  * 7.2. Công cụ hỗ trợ & Môi trường kiểm thử
  * 7.3. Nhật ký kiểm thử (Test Log / Activity Log)
* **PHẦN 8: KẾT LUẬN**
  * 8.1. Nhận xét tổng thể sản phẩm phần mềm
  * 8.2. Hướng cải tiến & Khuyến nghị tiếp theo
* **PHỤ LỤC**
  * Phụ lục A: Bảng Tiến độ Chi tiết WBS & Timeline (`Timeline.xlsx`)
  * Phụ lục B: Khung Nội dung Slide Thuyết trình PowerPoint (`Slide.pptx`)

---

# PHẦN 1: GIỚI THIỆU

### 1.1. Mục Tiêu Kiểm Thử
Dự án kiểm thử được thực hiện nhằm đạt được các mục tiêu kỹ thuật cụ thể sau:
* **Xác minh tính đúng đắn của chức năng (Functional Verification)**: Đảm bảo toàn bộ 100% các tính năng thuộc 6 module chính của hệ thống WordPress 6.6 hoạt động đúng theo đặc tả yêu cầu phần mềm.
* **Phát hiện lỗi và lỗ hổng sớm (Defect Discovery)**: Tìm kiếm các lỗi phát sinh (functional bugs, UI glitches, xung đột theme/plugin, hổng phân quyền RBAC, lỗi bảo mật XSS) trước khi hệ thống đưa vào vận hành thực tế.
* **Đo lường chất lượng sản phẩm (Quality Metrics)**: Đánh giá tỷ lệ Đạt (% Pass Rate), mật độ lỗi (Defect Density), và mức độ bao phủ yêu cầu (TR Coverage) làm căn cứ cho quyết định phát hành.
* **Đưa ra khuyến nghị khắc phục**: Cung cấp báo cáo lỗi chi tiết kèm phân tích nguyên nhân gốc (Root Cause Analysis) giúp đội ngũ lập trình (Dev Team) dễ dàng sửa lỗi.

### 1.2. Giới Thiệu Ứng Dụng Được Kiểm Thử
* **Tên ứng dụng**: Hệ thống Quản trị Nội dung WordPress (WordPress CMS).
* **Phiên bản kiểm thử**: WordPress Version 6.6 (Official Release Build).
* **Loại ứng dụng**: Web Application (Nền tảng Quản trị Nội dung & Mã nguồn mở).
* **Công nghệ phát triển**: PHP 8.2+, MySQL 8.0, JavaScript (React / Gutenberg Editor), HTML5/CSS3.
* **Đối tượng người dùng**: Admin (Quản trị viên), Editor (Biên tập viên), Author (Tác giả), Subscriber (Thành viên đăng ký), Độc giả truy cập trang tin công khai.

---

# PHẦN 2: PHÂN TÍCH YÊU CẦU

### 2.1. Liệt Kê Các Chức Năng Chính

#### 🔹 2.1.1. Trong phạm vi kiểm thử (In-Scope):
1. **Module 1: User & Authentication**: Đăng nhập/Đăng xuất, Quên mật khẩu, Đổi mật khẩu, Quản lý tài khoản User, Phân quyền người dùng theo vai trò (Role-Based Access Control - RBAC: Admin, Editor, Author, Subscriber).
2. **Module 2: Post Management**: CRUD bài viết (Thêm/Sửa/Xóa/Xem), Quản lý Danh mục (Category), Quản lý Thẻ (Tag), Đính kèm ảnh đại diện (Featured Image), Hiển thị ngoài Frontend.
3. **Module 3: Media Management**: Upload file hình ảnh (JPG, PNG, WebP), Chỉnh sửa thông tin Media (Title, Alt Text, Caption), Xóa media, Tìm kiếm & Lọc media trong Thư viện.
4. **Module 4: Plugin Management**: Tìm kiếm, Cài đặt, Kích hoạt (Activate), Hủy kích hoạt (Deactivate), Xóa Plugin, Kiểm tra xung đột Plugin với WordPress core.
5. **Module 5: Theme Management**: Tìm kiếm, Cài đặt, Tùy biến giao diện (Customize Logo, Color, Header, Footer), Chuyển đổi Theme, Xóa Theme.
6. **Module 6: Comment System**: Độc giả gửi bình luận, Admin kiểm duyệt (Approve, Trash, Spam), Trả lời bình luận, Khả năng chống chèn mã độc XSS cơ bản.

#### 🔹 2.1.2. Ngoài phạm vi kiểm thử (Out-of-Scope):
- Kiểm thử WordPress Multisite (Mạng đa trang web).
- Kiểm thử tải cao cấp Server (Load & Stress testing ở hạ tầng Nginx / Apache / MySQL database).
- Kiểm thử các API REST nâng cao và các Plugin trả phí bên thứ ba nằm ngoài danh mục chuẩn.

### 2.2. Bản Đồ Chức Năng (Function Map)

Sơ đồ phân rã chức năng (Function Tree Map) của hệ thống Web WordPress 6.6:

```
                                    🌐 HỆ THỐNG WEB WORDPRESS 6.6
                                                  │
    ┌──────────────────┬──────────────────┬───────┴───────┬──────────────────┬──────────────────┐
    │                  │                  │               │                  │                  │
🔑 USER & AUTH     📝 POST MGMT       🖼️ MEDIA MGMT    🔌 PLUGIN MGMT     🎨 THEME MGMT      💬 COMMENT SYS
    │                  │                  │               │                  │                  │
    ├─ Đăng nhập/xuất  ├─ Viết bài mới    ├─ Upload ảnh   ├─ Cài đặt mới     ├─ Cài Theme mới   ├─ Gửi bình luận
    ├─ Quên mật khẩu   ├─ Sửa/Xóa bài     ├─ Cắt/Sửa ảnh  ├─ Kích hoạt/Hủy  ├─ Tùy biến UI     ├─ Admin duyệt
    ├─ Quản lý Profile ├─ Quản lý Cat/Tag ├─ Xóa file     ├─ Gỡ bỏ Plugin    ├─ Chuyển Theme    ├─ Lọc Spam/Trash
    └─ Phân quyền RBAC └─ Đính ảnh bìa    └─ Lọc/Tìm kiếm └─ Kiểm tra xung đột└─ Xóa Theme       └─ Kiểm tra XSS
```

---

# PHẦN 3: THIẾT KẾ KIỂM THỬ

### 3.1. Phương Pháp và Kỹ Thuật Thiết Kế Test Case
- **Phương pháp kiểm thử chính**: Kiểm thử thủ công (Manual Testing) dựa trên kỹ thuật Kiểm thử hộp đen (Black-box Testing).
- **Các kỹ thuật thiết kế Test Case được áp dụng**:
  1. **Phân vùng tương đương (Equivalence Partitioning - EP)**: Phân chia các tập dữ liệu đầu vào thành các vùng hợp lệ (Valid) và không hợp lệ (Invalid) cho các trường thông tin: Username, Password, Email, Title bài viết.
  2. **Phân tích giá trị biên (Boundary Value Analysis - BVA)**: Xác định giá trị tại biên và lân cận biên đối với dung lượng upload file Media (`file < 2MB`, `file = 2MB`, `file > 2MB`), độ dài mật khẩu (`length < 8`, `length = 8`, `length > 8`).
  3. **Bảng quyết định (Decision Table Testing)**: Áp dụng cho logic xác thực và bảng phân quyền theo vai trò (Admin vs Editor vs Subscriber).
  4. **Kịch bản dựa trên Use Case (Use Case Testing)**: Xây dựng các luồng thực hiện đăng bài, kiểm duyệt bình luận và cài đặt theme/plugin hoàn chỉnh.

### 3.2. Danh Sách Yêu Cầu Kiểm Thử (Test Requirements - TR)

| TR ID | Module | Yêu Cầu Kiểm Thử (Test Requirement) | Loại TR (TR Type) |
| :---: | :--- | :--- | :---: |
| **TR-001** | User & Auth | Hệ thống cho phép người dùng đăng nhập bằng Username/Email và Password hợp lệ. | Functional |
| **TR-002** | User & Auth | Hệ thống phải kiểm tra độ dài và độ mạnh của Mật khẩu khi tạo mới hoặc đổi mật khẩu. | Boundary |
| **TR-003** | Post Mgmt | Admin/Editor có thể tạo mới bài viết gồm Tiêu đề, Nội dung, Danh mục và Ảnh đại diện. | Functional |
| **TR-004** | Media Mgmt | Hệ thống chỉ cho phép Upload các định dạng ảnh hợp lệ (JPG, PNG, WebP) và dung lượng <= 2MB. | Boundary |
| **TR-005** | Security | Người dùng vai trò Subscriber không được phép truy cập vào trang quản trị bài viết `/wp-admin/edit.php`. | Security/RBAC |
| **TR-006** | Plugin Mgmt | Hệ thống cho phép tìm kiếm, cài đặt và kích hoạt thành công plugin từ thư viện WordPress.org. | Functional |
| **TR-007** | Comment Sys | Hệ thống phải lọc và loại bỏ các đoạn mã script `<script>` trong nội dung bình luận chống XSS. | Security |

### 3.3. Danh Sách Test Case Mẫu & Thống Kê Phân Bổ

#### 📊 3.3.1. Thống kê phân bổ Test Case theo Module:

| STT | Tên Module Kiểm Thử | Số Lượng TC | Pass | Fail | Tỷ Lệ Pass (%) |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | Module 1: User & Authentication | 16 | 14 | 2 | 87.50% |
| 2 | Module 2: Post Management | 23 | 21 | 2 | 91.30% |
| 3 | Module 3: Media Management | 23 | 21 | 2 | 91.30% |
| 4 | Module 4: Plugin Management | 20 | 18 | 2 | 90.00% |
| 5 | Module 5: Theme Management | 20 | 18 | 2 | 90.00% |
| 6 | Module 6: Comment System | 15 | 14 | 1 | 93.33% |
| **TỔNG** | **Toàn bộ hệ thống** | **117** | **106** | **11** | **90.60%** |

#### 📝 3.3.2. Bảng Kịch bản kiểm thử chi tiết tiêu biểu (Sample Test Cases):

##### 🔹 Module 1: User & Authentication
| TC ID | Mô Tả Kịch Bản | Điều Kiện Tiên Quyết | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | Kết Quả Thực Tế | Trạng Thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-UA-01** | Đăng nhập thành công với thông tin hợp lệ | User đã tồn tại trong DB | 1. Mở `/wp-login.php`<br>2. Nhập Username + Password đúng<br>3. Click nút "Log In" | User: `admin`<br>Pass: `Admin@123` | Đăng nhập thành công, điều hướng vào Dashboard | Đăng nhập thành công, điều hướng đúng Dashboard | **PASS** |
| **TC-UA-02** | Đăng nhập thất bại với Mật khẩu sai | User đã tồn tại | 1. Nhập Username đúng<br>2. Nhập Password sai<br>3. Click "Log In" | User: `admin`<br>Pass: `WrongPass` | Báo lỗi: *"Error: The password you entered for the username admin is incorrect."* | Báo lỗi đúng thông báo quy định | **PASS** |
| **TC-UA-08** | Gửi email yêu cầu Khôi phục Mật khẩu | User có email hợp lệ | 1. Click "Lost your password?"<br>2. Nhập Email đúng<br>3. Click "Get New Password" | Email: `admin@lhu.edu.vn` | Hệ thống gửi email chứa liên kết reset password vào hộp thư | Hệ thống báo thành công nhưng email không gửi tới hộp thư | **FAIL** |
| **TC-UA-14** | Phân quyền: Subscriber truy cập trang quản trị | Đã đăng nhập tài khoản Subscriber | 1. Truy cập trực tiếp đường dẫn `/wp-admin/options.php` | URL: `/wp-admin/options.php` | Hệ thống chặn và báo lỗi: *"Sorry, you are not allowed to access this page."* | Chặn truy cập thành công, hiện thông báo đúng lỗi | **PASS** |

##### 🔹 Module 2: Post Management & Module 3: Media Management
| TC ID | Mô Tả Kịch Bản | Điều Kiện Tiên Quyết | Các Bước Thực Hiện | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | Kết Quả Thực Tế | Trạng Thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-PM-01** | Tạo bài viết mới đầy đủ thông tin hợp lệ | Đã đăng nhập Admin / Editor | 1. Vào Posts -> Add New<br>2. Nhập Tiêu đề & Nội dung<br>3. Chọn Category & Upload Featured Image<br>4. Click "Publish" | Title: "Kiểm thử WordPress 6.6"<br>Cat: "Công nghệ"<br>Img: `banner.jpg` | Bài viết đăng thành công và hiển thị ngoài trang chủ Frontend | Bài viết được đăng thành công, hiển thị chính xác | **PASS** |
| **TC-PM-02** | Tạo bài viết rỗng tiêu đề | Đã đăng nhập Admin | 1. Để trống Tiêu đề<br>2. Nhập Nội dung bài viết<br>3. Click "Publish" | Title: `""`<br>Content: "Nội dung bài viết mẫu" | Hệ thống yêu cầu nhập tiêu đề hoặc tạo bài tên *(No Title)* | Hệ thống tự động đặt tên *(No Title)* không cảnh báo | **FAIL** |
| **TC-MD-01** | Upload file ảnh JPG dung lượng < 2MB | Vào trang Media Library | 1. Vào Media -> Add New<br>2. Chọn file `test.jpg` (1.2MB)<br>3. Click Upload | File: `test.jpg` (1.2MB) | Upload thành công, ảnh hiển thị dạng Thumbnail | Upload thành công, hiển thị đầy đủ thông số | **PASS** |
| **TC-MD-11** | Xóa file Media đang được dùng trong bài viết | Bài viết A đang chèn ảnh `pic1.jpg` | 1. Vào Media Library<br>2. Chọn `pic1.jpg`<br>3. Click "Delete Permanently" | File ID: `pic1.jpg` | Hệ thống cảnh báo ảnh đang được sử dụng trong bài viết A | Ảnh bị xóa vĩnh viễn, bài viết A bị lỗi hiển thị link ảnh hỏng (404) | **FAIL** |

---

# PHẦN 4: THỰC HIỆN KIỂM THỬ

### 4.1. Triển Khai Kiểm Thử Thực Tế
* **Quy trình triển khai**: Nhóm thực hiện kiểm thử thủ công (Manual testing) kết hợp kiểm thử giao diện và luồng dữ liệu trực tiếp trên phiên bản WordPress 6.6 dựng trên môi trường XAMPP Local.
* **Thời gian thực thi**: Từ 18/11/2025 đến 25/11/2025.
* **Môi trường thực thi**:
  * Server: Localhost XAMPP 8.2 (PHP 8.2.12, MySQL 8.0).
  * Web Browser: Google Chrome v120.0, Microsoft Edge v120.0, Mozilla Firefox v119.0.
  * HĐH: Windows 11 Pro 64-bit / macOS Sonoma.

### 4.2. Hình Ảnh Minh Họa Bằng Chứng Kiểm Thử (Screenshots Evidence)

#### 🖼️ Hình 4.1: Kiểm thử Đăng nhập hệ thống WordPress (`TC-UA-01` - Pass)
```
┌────────────────────────────────────────────────────────────────────────┐
│  [LOG IN FORM - /wp-login.php]                                          │
│  Username or Email Address: admin                                      │
│  Password: ••••••••••••                                                │
│  [✓] Remember Me               [ LOG IN ]                              │
│                                                                        │
│  => Kết quả: Hệ thống đăng nhập thành công và chuyển hướng tới Dashboard│
└────────────────────────────────────────────────────────────────────────┘
```

#### 🖼️ Hình 4.2: Minh họa Lỗi Xóa ảnh đang đính kèm trong bài viết (`TC-MD-11` / `BUG-005` - Fail)
```
┌────────────────────────────────────────────────────────────────────────┐
│  [MEDIA LIBRARY - DELETE PERMANENTLY]                                  │
│  ⚠️ Cảnh báo: File "pic1.jpg" đã bị xóa vĩnh viễn khỏi server!          │
│                                                                        │
│  [FRONTEND ARTICLE VIEW]                                               │
│  <img src="/wp-content/uploads/2025/11/pic1.jpg" alt="Broken Image">   │
│  ❌ Lỗi: Hình ảnh hiển thị biểu tượng mờ 404 hỏng đứt gãy trên bài viết. │
└────────────────────────────────────────────────────────────────────────┘
```

---

# PHẦN 5: QUẢN LÝ LỖI (BUG MANAGEMENT)

### 5.1. Quy Trình & Công Cụ Quản Lý Lỗi
* **Công cụ quản lý lỗi**: Nhóm áp dụng công cụ **Jira Software / Trello** tích hợp Ma trận quản lý lỗi chuyên nghiệp trên Excel (`TR_and_TC_ChiTiet.xlsx`).
* **Vòng đời của Bug (Bug Lifecycle)**:
  `New` ➔ `Open` ➔ `In Progress` ➔ `Resolved` ➔ `Re-tested` ➔ `Closed`.

### 5.2. Bảng Tổng Hợp Nhật Ký Lỗi (Defect Log / Bug Report)

| Bug ID | Module | Mô Tả Lỗi Thực Tế Phát Sinh | Mức Độ (Severity) | Ưu Tiên (Priority) | TC ID Liên Quan | Trạng Thái |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **BUG-001** | User & Auth | Hệ thống không gửi mail Reset Password khi thực hiện chức năng Quên mật khẩu. | **Cao (Critical)** | **High** | TC-UA-08 | Open |
| **BUG-002** | User & Auth | Cho phép lưu mật khẩu yếu mà không bắt buộc xác nhận checkbox Bypass. | Thấp (Minor) | Low | TC-UA-10 | New |
| **BUG-003** | Post Mgmt | Bài viết cho phép đăng mà không cần nhập Tiêu đề (tự tạo tên No Title). | Trung bình | Medium | TC-PM-02 | Open |
| **BUG-004** | Post Mgmt | Đổi tên Slug bài viết không tự động chuyển hướng Redirection 301. | Trung bình | Medium | TC-PM-18 | Open |
| **BUG-005** | Media | Cho phép xóa vĩnh viễn file ảnh đang đính kèm trong bài viết gây lỗi 404. | **Cao (Critical)** | **High** | TC-MD-11 | Open |
| **BUG-006** | Media | Công cụ Cắt ảnh (Crop Image) bị lỗi ngắt trang khi thư viện GD/Imagick thiếu. | **Cao (Critical)** | **High** | TC-MD-17 | Open |
| **BUG-007** | Plugin | Cài đặt Plugin bên thứ ba gây lỗi Fatal Error làm trắng trang Dashboard (WSOD). | **Cao (Critical)** | **High** | TC-PL-09 | Open |
| **BUG-008** | Plugin | Plugin độc hại không bị hệ thống quét cảnh báo quyền ghi thư mục hệ thống. | Trung bình | Medium | TC-PL-18 | Open |
| **BUG-009** | Theme | Kích hoạt Theme mới phá hỏng hoàn toàn cấu trúc Layout của danh mục tin tức. | **Cao (Critical)** | **High** | TC-TH-09 | Open |
| **BUG-010** | Theme | Xung đột giữa Custom CSS của Theme và Plugin hiển thị Form liên hệ. | **Cao (Critical)** | **High** | TC-TH-19 | Open |
| **BUG-011** | Comment | Bình luận chứa mã Script `<script>` vẫn vượt qua bộ lọc nếu gõ dấu cách. | **Cao (Critical)** | **High** | TC-CM-15 | Open |

### 5.3. Mô Tả & Phân Tích Lỗi Chi Tiết (Root Cause Analysis)

#### 📌 Phân tích Lỗi BUG-001 (Mail Reset Password không hoạt động):
- **Hiện tượng**: Khi user nhấn "Get New Password", màn hình báo thành công nhưng không có mail nào chuyển đến hộp thư.
- **Root Cause (Nguyên nhân gốc)**: Môi trường Localhost XAMPP chưa cấu hình SMTP Server hoặc `php.ini` chưa thiết lập thông số `sendmail_path`.
- **Giải pháp đề xuất**: Cài đặt Plugin `WP Mail SMTP` và cấu hình tài khoản Gmail SMTP Authenticated.

#### 📌 Phân tích Lỗi BUG-011 (Bảo mật XSS trong Comment System):
- **Hiện tượng**: Bình luận chèn đoạn mã `<script >alert('XSS')</script >` bị lọt qua bộ lọc làm thực thi đoạn mã script khi Admin mở trang kiểm duyệt.
- **Root Cause**: Hàm làm sạch dữ liệu `wp_filter_comment()` chưa escape triệt để các khoảng trắng bên trong thẻ script.
- **Giải pháp đề xuất**: Bổ sung hàm `sanitize_text_field()` và áp dụng `esc_html()` trước khi lưu vào DB.

---

# PHẦN 6: ĐÁNH GIÁ KẾT QUẢ & ĐO LƯỜNG

### 6.1. Các Chỉ Số Đo Lường Kiểm Thử Cơ Bản (Test Metrics)

1. **Tỷ lệ Pass / Fail (Pass Rate)**:
   $$\text{Pass Rate} = \frac{\text{Số TC Pass}}{\text{Tổng số TC}} \times 100\% = \frac{106}{117} \times 100\% = \mathbf{90.60\%}$$

2. **Mức độ bao phủ Yêu cầu (Test Coverage % - TR Coverage)**:
   $$\text{TR Coverage} = \frac{\text{Số TR đã có Test Case}}{\text{Tổng số TR trích xuất}} \times 100\% = \frac{48}{50} \times 100\% = \mathbf{96.00\%}$$

3. **Mật độ lỗi (Defect Density)**:
   $$\text{Defect Density} = \frac{\text{Tổng số Bug phát hiện}}{\text{Số lượng Module}} = \frac{11}{6} = \mathbf{1.83} \quad (\text{Bugs / Module})$$

4. **Phân bổ mức độ nghiêm trọng của Lỗi (Severity Distribution)**:
   - **Critical / High (Cao)**: 07 Bugs (63.64%)
   - **Medium (Trung bình)**: 03 Bugs (27.27%)
   - **Minor / Low (Thấp)**: 01 Bug (9.09%)

### 6.2. Phân Tích Hiệu Quả & Bình Luận Chất Lượng Phần Mềm
- **Ưu điểm**: Hệ thống WordPress 6.6 có độ ổn định chung rất cao trên các chức năng cốt lõi (Pass rate 90.60%). Giao diện dễ sử dụng, tốc độ xử lý nhanh, khả năng quản lý Post và User tốt.
- **Hạn chế**: Tồn tại 07 lỗi nghiêm trọng (Critical Bugs) tập trung ở tính năng gửi Mail, quản lý rác file Media, xung đột CSS Theme/Plugin và bảo mật XSS bình luận.

### 6.3. Kết Luận & Quyết Định Triển Khai (Go / No-Go Decision)
- **Đánh giá chung**: Phần mềm đạt tiêu chí bao phủ > 95% và tỷ lệ Pass > 90%, tuy nhiên chưa đạt điều kiện Exit Criteria về lỗi Critical.
- **QUYẾT ĐỊNH (DECISION)**: ❌ **NO-GO TEMPORARY** (Tạm hoãn phát hành chính thức). Yêu cầu Dev Team khắc phục triệt để **07 lỗi mức độ Critical** trong vòng 05 ngày trước khi thực hiện Re-test và phát hành bản Official Release.

---

# PHẦN 7: TỔ CHỨC THỰC HIỆN

### 7.1. Phân Công Công Việc (WBS) & Lịch Trình Tiến Độ (Gantt Chart)

#### 📊 7.1.1. Bảng Phân công Công việc theo Cấu trúc WBS:

| Mã WBS | Tên Công Việc | Người Phụ Trách | Ngày Bắt Đầu | Ngày Kết Thúc | % Hoàn Thành |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **1.0** | **GIAI ĐOẠN CHUẨN BỊ & LẬP TEST PLAN** | | | | |
| 1.1 | Khảo sát yêu cầu Web WordPress 6.6 | Nguyễn Đoàn Nhật Minh | 10/11/2025 | 12/11/2025 | 100% |
| 1.2 | Xây dựng Kế hoạch kiểm thử (Test Plan) | Nguyễn Đoàn Nhật Minh | 13/11/2025 | 16/11/2025 | 100% |
| **2.0** | **THIẾT KẾ KỊCH BẢN KIỂM THỬ (TR & TC)** | | | | |
| 2.1 | Thiết kế TR & TC Module User/Auth | Nguyễn Đoàn Nhật Minh | 17/11/2025 | 19/11/2025 | 100% |
| 2.2 | Thiết kế TR & TC Module Post/Media | Lương Đức Mạnh | 17/11/2025 | 20/11/2025 | 100% |
| 2.3 | Thiết kế TR & TC Plugin/Theme/Comment | Cao Lê Huy | 17/11/2025 | 20/11/2025 | 100% |
| **3.0** | **THỰC THI KIỂM THỬ & BUG LOGGING** | | | | |
| 3.1 | Chạy Test Cases & Ghi log kết quả | Cả nhóm | 21/11/2025 | 24/11/2025 | 100% |
| 3.2 | Tạo Defect Log & Phân loại Bug | Cao Lê Huy | 24/11/2025 | 25/11/2025 | 100% |
| **4.0** | **TỔNG HỢP BÁO CÁO & SLIDE** | | | | |
| 4.1 | Viết Báo cáo kỹ thuật (Word/PDF) | Cả nhóm | 26/11/2025 | 27/11/2025 | 100% |
| 4.2 | Soạn Slide PowerPoint & Bảo vệ | Lương Đức Mạnh | 27/11/2025 | 28/11/2025 | 100% |

### 7.2. Công Cụ Hỗ Trợ & Môi Trường Kiểm Thử
- **Quản lý tài liệu & báo cáo**: Microsoft Word, Microsoft Excel, Microsoft PowerPoint.
- **Quản lý lỗi & tiến độ**: Jira Software, Trello, Biểu đồ Gantt Chart Excel.
- **Môi trường Testing**: Web server XAMPP 8.2 (PHP 8.2, MySQL 8.0), Trình duyệt Chrome, Edge, Firefox.

### 7.3. Nhật Ký Kiểm Thử (Test Log / Activity Log)
- **10/11 - 16/11/2025**: Họp nhóm khởi tạo dự án, phân công vai trò, nghiên cứu tài liệu WordPress 6.6 và viết Test Plan.
- **17/11 - 20/11/2025**: Hoàn thành 50 TR và 117 TC chi tiết trên Excel. Review chéo Test Cases giữa các thành viên.
- **21/11 - 25/11/2025**: Tiến hành thực thi 117 TC, ghi nhận 106 Pass, 11 Fail, lập Defect Log 11 Bugs.
- **26/11 - 28/11/2025**: Hoàn thiện Báo cáo kỹ thuật 8 Phần, đóng gói hồ sơ nộp bài và làm Slide thuyết trình bảo vệ.

---

# PHẦN 8: KẾT LUẬN

### 8.1. Nhận Xét Tổng Thể
Dự án kiểm thử Hệ thống Web WordPress 6.6 đã hoàn thành đúng tiến độ và đáp ứng đầy đủ 4 Chuẩn đầu ra học phần (CLO1 - CLO4). Toàn bộ quy trình từ phân tích yêu cầu, thiết kế kịch bản kiểm thử, thực thi thực tế, quản lý lỗi đến đo lường báo cáo được trình bày theo chuẩn báo cáo kỹ thuật chuyên nghiệp.

### 8.2. Hướng Cải Tiến & Khuyến Nghị Tiếp Theo
* **Khuyến nghị cho Dev Team**: Tập trung xử lý triệt để 07 lỗi Critical (đặc biệt là Mail Server, XSS Comment và xóa nhầm file Media) trong thời hạn 05 ngày.
* **Hướng phát triển đợt kiểm thử sau**: Mở rộng áp dụng kiểm thử tự động (Automation Testing với Selenium / Playwright) cho các luồng đăng nhập và viết bài; bổ sung kiểm thử hiệu năng (Performance Testing với JMeter) khi hệ thống có 1,000+ người dùng đồng thời.

---

# PHỤ LỤC

## Phụ Lục A: Bảng Phân Công Công Việc & Tiến Độ Dự Án (`Timeline.xlsx`)

```
========================================================================================
WBS ID   TÊN CÔNG VIỆC                       NGƯỜI PHỤ TRÁCH   BẮT ĐẦU     KẾT THÚC   % HOÀN THÀNH
========================================================================================
1.0      GIAI ĐOẠN CHUẨN BỊ & LẬP TEST PLAN
1.1      Khảo sát yêu cầu Web WordPress       Nguyễn Đoàn Nhật Minh 10/11/2025  12/11/2025    100%
1.2      Xây dựng Kế hoạch kiểm thử          Nguyễn Đoàn Nhật Minh 13/11/2025  16/11/2025    100%
2.0      THIẾT KẾ KỊCH BẢN KIỂM THỬ (TR & TC)
2.1      Thiết kế TR & TC Module User/Auth    Nguyễn Đoàn Nhật Minh 17/11/2025  19/11/2025    100%
2.2      Thiết kế TR & TC Module Post/Media   Lương Đức Mạnh        17/11/2025  20/11/2025    100%
2.3      Thiết kế TR & TC Plugin/Theme/Comm  Cao Lê Huy            17/11/2025  20/11/2025    100%
3.0      THỰC THI KIỂM THỬ & BUG LOGGING
3.1      Chạy Test Cases & Ghi log kết quả   Cả nhóm               21/11/2025  24/11/2025    100%
3.2      Tạo Defect Log & Phân loại Bug      Cao Lê Huy            24/11/2025  25/11/2025    100%
4.0      TỔNG HỢP BÁO CÁO & SLIDE
4.1      Viết Báo cáo kỹ thuật (Word/PDF)    Cả nhóm               26/11/2025  27/11/2025    100%
4.2      Soạn Slide PowerPoint & Bảo vệ      Lương Đức Mạnh        27/11/2025  28/11/2025    100%
========================================================================================
```

---

## Phụ Lục B: Khung Nội Dung Slide Thuyết Trình Bảo Vệ (`Slide.pptx`)

* **Slide 01**: Trang bìa (Tên đề tài, Giảng viên hướng dẫn, Thông tin nhóm 9).
* **Slide 02**: Giới thiệu mục tiêu kiểm thử & Phạm vi kiểm thử (In-Scope / Out-of-Scope).
* **Slide 03**: Sơ đồ phân rã chức năng (Function Map WordPress 6.6).
* **Slide 04**: Phương pháp kiểm thử (Manual, Black-box) & Các kỹ thuật áp dụng (EP, BVA).
* **Slide 05**: Ma trận Yêu cầu kiểm thử (TR Matrix) & Cơ cấu 6 Module.
* **Slide 06**: Thống kê Kịch bản kiểm thử (Tổng số 117 TC phân bổ từng Module).
* **Slide 07**: Demo 02 Kịch bản kiểm thử tiêu biểu (Module User & Post).
* **Slide 08**: Kết quả thực thi thực tế (Biểu đồ tròn 90.6% Pass - 9.4% Fail).
* **Slide 09**: Nhật ký lỗi (Defect Log) - Phân tích 11 Bug phát hiện theo Severity & Jira tool.
* **Slide 10**: Demo chi tiết 02 Bug nghiêm trọng (Critical Bug: Mail reset & XSS Comment).
* **Slide 11**: Kế hoạch khuyến nghị khắc phục & Phân công thời gian Fix bug.
* **Slide 12**: Kết luận dự án, Quyết định Go/No-Go & Lời cảm ơn Giảng viên.

---
*Mẫu báo cáo kỹ thuật chuẩn phục vụ giảng dạy và làm đồ án kiểm thử phần mềm.*
