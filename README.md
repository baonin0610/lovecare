# 💖 LoveCare - Web App & iPhone PWA Chăm Sóc Người Yêu

> Ứng dụng quản lý và nhắc nhở người yêu uống nước, ăn uống đúng giờ. Bắt buộc chụp ảnh camera xác thực thực tế để ghi nhận hoàn thành!

---

## 🌟 Tính Năng Nổi Bật

1. **Chụp Ảnh Xác Thực (Camera Verification)**:
   - Khi đến giờ uống nước hoặc ăn cơm, người yêu mở camera chụp trực tiếp hoặc tải ảnh.
   - Hệ thống tự động đóng dấu mộc watermark thời gian thực (Giờ, Ngày, Tên món / Số ml nước) lên ảnh.
   - Bắt buộc phải có ảnh thì nhiệm vụ mới được tính là hoàn thành.
   - Hiệu ứng pháo hoa chúc mừng (Confetti) và âm thanh vui tươi khi check-in thành công.

2. **Rung Chuông Nhắc Nhở Thời Gian Thực (Real-time Nudge / Buzz)**:
   - Bạn trai trên máy tính hoặc điện thoại có thể bấm nút **"Rung Chuông Nhắc"**.
   - Điện thoại của người yêu lập tức reo chuông, rung và hiện popup nhắc nhở kèm nút bấm mở camera chụp ngay.

3. **Thú Cưng Ảo (Pet Mascot) Thay Đổi Cảm Xúc**:
   - Mascot phản ứng theo lượng nước đã uống trong ngày:
     - Chưa uống nước: Buồn ngủ / khát nước `🥺`
     - Uống được một phần: Vui vẻ `😊`
     - Sắp đạt chỉ tiêu: Yêu thương `🥰`
     - Đạt 100% mục tiêu: Nhảy múa ăn mừng `🥳`

4. **Nhật Ký & Album Bằng Chứng (Couple Photo Timeline)**:
   - Xem toàn bộ ảnh cốc nước và bữa ăn người yêu đã nộp theo ngày.
   - Bạn trai có thể phóng to xem ảnh, thả tim (`❤️`, `🥰`, `🤤`, `👏`, `👑`) và gửi lời khen ngợi ngọt ngào.

5. **Lịch Trình Tùy Biến**:
   - Bạn trai có thể tự do thêm, sửa, xóa các mốc giờ uống nước và ăn uống.
   - Cài đặt lượng nước mục tiêu (VD: 2000ml / ngày) và lời nhắn riêng cho từng mốc.

6. **Chạy Hoàn Hảo Trên iPhone (PWA - Progressive Web App)**:
   - Không cần nộp lên App Store hay trả phí Apple Developer 99$/năm.
   - Mở trên Safari iPhone -> Chọn "Chia sẻ" -> "Thêm vào Màn hình chính".
   - Mở app full màn hình, có icon app riêng, không còn thanh địa chỉ của trình duyệt.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt thư viện (nếu mới clone)
```bash
npm install
```

### 2. Khởi chạy ứng dụng
```bash
npm start
```
Ứng dụng sẽ chạy tại: **`http://localhost:3001`**

---

## 📱 Cách Sử Dụng Trên iPhone (Cùng Mạng Wi-Fi)

1. **Tìm địa chỉ IP của máy tính**:
   - Trên Mac, mở Terminal gõ:
     ```bash
     ipconfig getifaddr en0
     ```
     *(Ví dụ ra kết quả: `192.168.1.15`)*

2. **Mở trên iPhone**:
   - Đảm bảo iPhone và máy tính kết nối chung mạng Wi-Fi.
   - Mở trình duyệt **Safari** trên iPhone, truy cập:
     ```text
     http://<IP_MÁY_TÍNH>:3001
     (Ví dụ: http://192.168.1.15:3001)
     ```

3. **Cài đặt thành App trên màn hình chính iPhone**:
   - Bấm nút **Chia sẻ** (biểu tượng hình vuông có mũi tên trỏ lên ở thanh đáy Safari).
   - Chọn **"Thêm vào Màn hình chính" (Add to Home Screen)**.
   - Bấm **"Thêm" (Add)** ở góc trên bên phải.
   - Giờ đây LoveCare đã xuất hiện như 1 ứng dụng iPhone thật với icon dễ thương!

---

## 👥 Tài Khoản Demo Có Sẵn

Bạn có thể bấm trực tiếp các nút **"Thử vai Anh Yêu"** hoặc **"Thử vai Em Yêu"** trên màn hình chính, hoặc đăng nhập:

| Tài khoản | Tên đăng nhập | Mật khẩu | Vai trò | Mã phòng đôi |
| :--- | :--- | :--- | :--- | :--- |
| **Anh Yêu (Quản lý)** | `anhyeu` | `123` | Caretaker | `LOVE88` |
| **Em Yêu (Thực hiện)** | `emyeu` | `123` | Lover | `LOVE88` |

Hoặc cả 2 có thể đăng ký tài khoản mới và kết nối với nhau bằng Mã phòng đôi (Couple Code).
