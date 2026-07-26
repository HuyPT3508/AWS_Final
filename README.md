# 🎬 HCMUT Cinema - AWS Cloud Native 🚀

![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![AWS](https://img.shields.io/badge/AWS-Cloud%20Native-FF9900.svg)
![Node.js](https://img.shields.io/badge/Node.js-Express-43853D.svg)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)
![DynamoDB](https://img.shields.io/badge/Database-DynamoDB-4053D6.svg)

Hệ thống Quản lý và Đặt vé Rạp chiếu phim được thiết kế lại toàn diện từ một kiến trúc truyền thống nguyên khối sang mô hình **Micro-services / Cloud Native** để triển khai trên hệ sinh thái **Amazon Web Services (AWS)**.

Dự án này là bài tập lớn / đồ án giải quyết bài toán cốt lõi của các hệ thống bán vé: **Xử lý lượng truy cập đồng thời lớn (Concurrency) và Tránh xung đột khóa ghế (Race Condition)**.

---

## 🏗 Kiến Trúc Hệ Thống (AWS Architecture)

Hệ thống được chia tách hoàn toàn giữa Frontend và Backend (Decoupled Architecture), ứng dụng mô hình **Polyglot Persistence** (Đa CSDL) để tối ưu hóa hiệu suất:

1. **Amazon S3 (Frontend Hosting):** 
   - Phân phối nội dung tĩnh (HTML, CSS, JS tĩnh). 
   - Đảm nhận toàn bộ giao diện Khách hàng (SPA) và Quản trị viên (Admin Dashboard).
2. **Amazon EC2 (Backend API):** 
   - Máy chủ chạy **Node.js/Express** cung cấp RESTful APIs xử lý toàn bộ logic nghiệp vụ, giao tiếp với các dịch vụ AWS thông qua AWS SDK v3.
3. **Amazon RDS - PostgreSQL (Core Database):** 
   - Lưu trữ dữ liệu bền vững, yêu cầu tính toàn vẹn cao (ACID): Thông tin Rạp, Phim, Suất chiếu, Vé, và User.
4. **Amazon DynamoDB (High-speed Cache):** 
   - Bảng `HCMUTCinema_SeatLocks` đảm nhận nhiệm vụ **Khóa ghế tạm thời (Real-time Seat Locking)**. 
   - Tận dụng cơ chế `ConditionExpression` để chống đụng ghế cấp Database và `Time-to-Live (TTL)` để tự động giải phóng ghế sau 5 phút nếu user không thanh toán.
5. **Amazon SES (Simple Email Service):** 
   - Tự động hóa việc gửi mã OTP xác thực thanh toán và gửi E-Ticket (Mã QR Code) qua email cho khách hàng.

---

## ✨ Tính Năng Nổi Bật

### 🧑‍💻 Phân Hệ Khách Hàng
- **Khóa ghế Real-time:** Đảm bảo không bao giờ có 2 người mua được cùng 1 ghế nhờ cơ chế Lock tức thời qua DynamoDB.
- **Thanh toán bảo mật (Guest Checkout):** Tích hợp mua vé không cần tạo tài khoản, xác thực giao dịch qua **Mã OTP** gửi tới Email.
- **E-Ticket (Vé điện tử QR):** Sau khi mua thành công, mã QR tự động sinh ra hiển thị trên màn hình và gửi bản sao về hòm thư.

### 👑 Phân Hệ Quản Trị Viên (Admin)
- **Kiểm soát xung đột Lịch Chiếu (Smart Scheduling):** Thuật toán tự động phân tích thời lượng phim + 15 phút dọn phòng để **chặn các suất chiếu bị chồng chéo** thời gian trên cùng 1 phòng chiếu.
- **Tự động lọc Phòng theo Định Dạng:** (VD: Cài đặt phim chuẩn IMAX thì hệ thống tự động giấu các phòng 2D/3D).
- **Dashboard Thống kê Nâng cao:** 
  - Biểu đồ Doughnut tỉ lệ lấp đầy, Trend doanh thu tuần.
  - **Bản đồ Nhiệt (Heatmap):** Phân tích trực quan các vị trí ghế được khách mua nhiều nhất.
- **Tiện ích tra cứu:** Check điểm thành viên và kiểm tra tình trạng từng chiếc ghế trong rạp một cách siêu tốc.

---

## 📂 Cấu Trúc Thư Mục (Monorepo)

```text
AWS/
├── backend/                  # Chứa toàn bộ Backend (Node.js/Express)
│   ├── config/db.js          # Khởi tạo kết nối Postgres, DynamoDB, SES
│   ├── routes/               # RESTful APIs (clientRoutes.js, adminRoutes.js)
│   ├── server.js             # Entry-point của backend (chạy cổng 3000)
│   └── package.json          # Dependencies
├── database/
│   └── database_postgres.sql # Script khởi tạo Schema và Trigger cho RDS Postgres 
└── frontend/                 
    └── public/               # Thư mục gốc để deploy lên AWS S3
        ├── index.html        # Giao diện Khách hàng
        ├── admin.html        # Giao diện Admin
        ├── css/style.css     # CSS dùng chung
        └── js/app.js         # Logic DOM & Fetch API kết nối với EC2
```

---

## 🚀 Hướng Dẫn Triển Khai (Deployment)

1. **Database:** 
   - Chạy script `database/database_postgres.sql` trên PostgreSQL.
   - Tạo bảng DynamoDB tên `HCMUTCinema_SeatLocks` với Partition Key là `SeatKey` (String), bật tính năng TTL cho trường `TTL`.
2. **Backend:**
   - Trỏ các thông số Database, AWS Region, Access Key vào file `.env` (tạo từ `.env.example`).
   - Mở Terminal chạy: 
     ```bash
     cd backend
     npm install
     node server.js
     ```
3. **Frontend:**
   - Trong file `frontend/public/js/app.js`, tìm và thay thế `localhost:3000` thành IP Public của Backend EC2.
   - Bật tính năng **Static Website Hosting** trên S3 Bucket và upload toàn bộ nội dung thư mục `public/` lên Bucket đó.

---
*Dự án đồ án sinh viên - Thiết kế và Tái cấu trúc chuẩn Cloud Native.*

Trang Khách hàng (Đặt vé): 👉 http://hcmut-cinema-frontend-huypt.s3-website-ap-southeast-1.amazonaws.com
Trang Quản trị viên (Sửa/Xóa phim): 👉 http://hcmut-cinema-frontend-huypt.s3-website-ap-southeast-1.amazonaws.com/admin.html
