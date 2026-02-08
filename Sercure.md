1️⃣ Mục tiêu bảo mật

Đảm bảo chỉ người được phép mới truy cập hệ thống

Bảo vệ dữ liệu thu – chi khỏi truy cập trái phép

Đảm bảo dữ liệu không bị chỉnh sửa hoặc giả mạo

Phù hợp với mô hình ứng dụng nội bộ

2️⃣ Mô hình bảo mật tổng thể
[ User ]
   ↓ Login
[ Electron App ]
   ↓ Token
[ API Server ]
   ↓
[ Encrypted SQLite ]

3️⃣ Xác thực & phân quyền (Authentication & Authorization)
3.1 Xác thực người dùng

Người dùng đăng nhập bằng:

Username / Password

Mật khẩu:

được mã hóa bằng bcrypt

không lưu plaintext

3.2 Token-based Authentication

Sau khi đăng nhập thành công:

server cấp JWT Token

Token được dùng để:

xác thực các request API

giới hạn thời gian sử dụng

4️⃣ Phân quyền người dùng (Authorization)
Các vai trò (Role-based Access Control)
Vai trò	Quyền hạn
Admin	Quản lý toàn bộ hệ thống
Accountant	Quản lý giao dịch
Viewer	Chỉ xem báo cáo

Mỗi API endpoint kiểm tra quyền truy cập

Electron App hiển thị chức năng theo quyền

5️⃣ Bảo mật dữ liệu
5.1 Mã hóa dữ liệu lưu trữ

Cơ sở dữ liệu SQLite:

sử dụng SQLCipher hoặc mã hóa cấp ứng dụng

Các trường nhạy cảm:

số tiền

ghi chú

nguồn giao dịch

5.2 Bảo mật dữ liệu truyền tải

Giao tiếp Electron ↔ Server:

thông qua HTTPS

Token được gửi qua HTTP Header

6️⃣ Bảo mật Bot & tích hợp ngoài
Telegram Bot

Giới hạn:

whitelist user_id

Mỗi tin nhắn:

xác thực nguồn gửi

Không cho phép bot thao tác trực tiếp DB

7️⃣ Ghi log & kiểm soát truy cập

Ghi log:

đăng nhập

thao tác thêm / sửa / xóa giao dịch

Phục vụ:

kiểm tra sai lệch

truy vết sự cố

8️⃣ Bảo vệ khỏi các rủi ro phổ biến
Rủi ro	Giải pháp
Truy cập trái phép	JWT + Role
Lộ dữ liệu	Mã hóa DB
Sửa dữ liệu trái phép	Audit log
Lạm dụng API	Rate limit