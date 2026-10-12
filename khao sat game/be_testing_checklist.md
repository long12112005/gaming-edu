# Hướng Dẫn Cầm Tay Chỉ Việc - Test Backend bằng Swagger UI

Tài liệu này hướng dẫn bạn **từng cú click chuột** trên màn hình Swagger để test hệ thống Backend của Gaming Edu.

> **Chuẩn bị:** Đảm bảo bạn đang mở Terminal và đã chạy lệnh `dotnet run` ở thư mục Backend. Sau đó mở trình duyệt web lên và truy cập vào đường dẫn: **http://localhost:5000**

---

## 🟢 NHÓM 1: ĐĂNG KÝ VÀ ĐĂNG NHẬP (AUTH)

### Bước 1: Gửi mã OTP Đăng ký
1. Kéo xuống tìm thẻ màu xanh lá cây có chữ **`POST`** và đường dẫn **`/api/auth/send-register-otp`**.
2. Click chuột trái vào dòng đó để nó xổ ra.
3. Bấm vào nút màu trắng **"Try it out"** (Góc trên bên phải của bảng đó).
4. Ở phần hộp thoại **Request body**, bạn nhập nguyên xi đoạn chữ sau:
   ```json
   {
     "email": "test1@gmail.com"
   }
   ```
   *(Mẹo: Bạn có thể nhập chính email thật của bạn hoặc của bạn bè để test thử việc nhận thư).*
5. Bấm nút màu xanh dương **"Execute"** bự ở ngay bên dưới.
6. **Lấy mã OTP:** Mở hộp thư Email mà bạn vừa điền ở bước trên, hệ thống sẽ gửi một bức thư chứa mã OTP 6 số. Hãy lấy 6 số này nhé! (Nếu không thấy ở Hộp thư đến, hãy kiểm tra mục Thư rác/Spam).

### Bước 2: Hoàn tất Đăng ký
1. Kéo tìm cái bảng **`POST /api/auth/register`**. Bấm vào nó.
2. Bấm nút **"Try it out"**.
3. Điền vào ô **Request body** như sau (nhớ thay cái MÃ_OTP_CỦA_BẠN bằng 6 số lúc nãy):
   ```json
   {
     "email": "test1@gmail.com",
     "otp": "MÃ_OTP_CỦA_BẠN",
     "nickname": "AnhHùngBànPhím"
   }
   ```
4. Bấm **"Execute"**. Kéo xuống thấy báo Code `201` tức là tạo nick thành công.

### Bước 3: Đăng nhập lấy Chìa Khóa (Token)
1. Bấm vào bảng **`POST /api/auth/login`**.
2. Bấm nút **"Try it out"**.
3. Sửa cái body thành:
   ```json
   {
     "email": "test1@gmail.com",
     "password": "password123"
   }
   ```
4. Bấm **"Execute"**.
5. Kéo xuống phần kết quả **Server response** (Code 200). Trong cái cục đen đen đó có một dòng ghi: `"token": "eyJhbGc..."`. 
6. **Rất quan trọng:** Bạn hãy bôi đen copy đoạn mã dài thòng lọng đó (không copy dấu ngoặc kép `"` nhé).

### Bước 4: Nhập Chìa Khóa (Token) vào hệ thống
1. Cuộn trang web Swagger lên **trên cùng**.
2. Bạn sẽ thấy một cái nút màu xanh lá tên là **"Authorize"** có hình cái ổ khoá 🔒. Bấm vào nó.
3. Một bảng hiện ra. Ở cái ô nhập văn bản (Value), bạn gõ chữ `Bearer ` (nhớ có 1 dấu cách), sau đó **dán (Paste)** cái đoạn token dài thòng hồi nãy vào. (Ví dụ: `Bearer eyJhbGc...`)
4. Bấm nút **"Authorize"** màu xanh lá, rồi bấm **"Close"**.
👉 *Giờ đây ổ khoá của tất cả các API đã khoá lại. Bạn đã có đặc quyền của người dùng đăng nhập!*

---

## 🟡 NHÓM 2: TẠO BỘ ĐỀ (QUIZZES)

### Bước 5: Tạo 1 Bộ Đề (Quiz)
1. Cuộn xuống tìm **`POST /api/quizzes`**. Mở nó ra và bấm **"Try it out"**.
2. Sửa nội dung Body thành:
   ```json
   {
     "title": "Bộ đề Tiếng Việt",
     "topic": "Ngữ Văn",
     "isPublic": true
   }
   ```
3. Bấm **"Execute"**.
4. Ở phần kết quả trả về `201`, hãy tìm dòng có chữ `"id": "mã_chữ_và_số_lằng_nhằng"`. Hãy copy cái id này ra Notepad để lát nữa xài.

---

## 🔵 NHÓM 3: THÊM CÂU HỎI VÀO ĐỀ (SLIDES)

### Bước 6: Đút câu hỏi vào Bộ Đề
1. Tìm bảng **`POST /api/quizzes/{quizId}/slides`**. Bấm **"Try it out"**.
2. Ở ô **`quizId`** (nằm trên ô Request body), bạn dán cái `id` của bộ đề mà bạn vừa copy ở Bước 5 vào.
3. Ở ô **Request body**, hãy copy và dán nguyên vẹn đoạn JSON chuẩn này vào:
   ```json
   {
     "type": "QUIZ",
     "questionText": "Con mèo kêu như thế nào?",
     "timeLimit": 30,
     "points": 1000,
     "options": [
       { "content": "Gâu gâu", "isCorrect": false },
       { "content": "Meo meo", "isCorrect": true },
       { "content": "Quác quác", "isCorrect": false },
       { "content": "Cục tác", "isCorrect": false }
     ]
   }
   ```
3. Bấm **"Execute"**. Thấy trả về 201 là đã xong, bộ đề của bạn giờ đã có 1 câu hỏi!

---

## 🟣 NHÓM 4: MỞ PHÒNG CHƠI (ROOMS)

### Bước 7: Bấm nút Host game
1. Tìm **`POST /api/rooms`**. Bấm **"Try it out"**.
2. Nhập Body:
   ```json
   {
     "quizId": "NHẬP_LẠI_CÁI_ID_BỘ_ĐỀ_ĐÓ",
     "mode": "HOST_PACED"
   }
   ```
3. Bấm **"Execute"**. 
4. Nếu kết quả trả về mã code 200, trong thân báo có chữ `"pinCode": "123456"`. Chúc mừng bạn! Backend của bạn đang chạy cực kỳ hoàn hảo không một lỗi lầm, phòng đã mở và sẵn sàng chờ người chơi vào nhập PIN!
