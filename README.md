# iFinance - Intelligent Internal Management System

**iFinance** là hệ thống quản lý thu chi nội bộ thông minh, được thiết kế để hoạt động an toàn và hiệu quả trực tiếp trên máy tính của bạn (Local-first). Hệ thống tích hợp Trí tuệ Nhân tạo (AI) để phân loại giao dịch tự động và phát hiện các dấu hiệu bất thường trong chi tiêu.

---

## 🌟 Tính năng nổi bật

- **🔐 Bảo mật đa tầng**: Xác thực người dùng qua JWT, phân quyền (Admin/Accountant/Viewer), và mã hóa dữ liệu.
- **🤖 Trí tuệ nhân tạo (AI Local)**: Tích hợp mô hình ngôn ngữ lớn (LLM - Qwen 2.5) để tự động phân loại danh mục và giải thích giao dịch.
- **⚠️ Cảnh báo bất thường**: Thuật toán thống kê thông minh giúp phát hiện các giao dịch chi tiêu vượt mức hoặc sai quy luật.
- **📊 Báo cáo trực quan**: Dashboard với biểu đồ biến động thu chi và cơ cấu danh mục (Chart.js).
- **📝 Audit Logging**: Ghi vết toàn bộ thao tác hệ thống để đảm bảo tính minh bạch và an toàn dữ liệu.
- **📱 Thông báo Telegram**: Kết nối Bot Telegram để nhận cảnh báo tức thời khi có giao dịch bất thường.

---

## 🛠 Công nghệ sử dụng

- **Frontend**: Electron, HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (better-sqlite3) - Lưu trữ file cục bộ, không cần server.
- **Security**: JWT, bcryptjs, Helmet, Rate Limiting, Audit Logs.
- **AI Engine**: llama.cpp (GGUF) tích hợp sẵn local server.

---

## 📦 Hướng dẫn Cài đặt & Sử dụng

### 1. Yêu cầu hệ thống
- Node.js (v18 trở lên)
- npm hoặc yarn

### 2. Cài đặt
```bash
# Clone repository
git clone https://github.com/duydttn/iFinance.git
cd iFinance

# Cài đặt thư viện
npm install
```

### 3. Chạy ứng dụng (Development)
```bash
# Khởi động đồng thời Backend Server và Electron App
npm run dev
```

---

## 🏗 Đóng gói ứng dụng (Build Setup)

Để tạo file cài đặt cho người dùng cuối:

- **Windows**: `npm run build:win` (Tạo file .exe trong thư mục `dist/`)
- **macOS**: `npm run build:mac`
- **Linux**: `npm run build:linux`

*Lưu ý: Việc build các thư viện native yêu cầu máy tính có sẵn C++ Build Tools.*

---

## 🔑 Tài khoản mặc định
- **Username**: `admin`
- **Password**: `admin123`
- **Quyền**: Quản trị viên (Admin)

---

## 📄 Bản quyền
Dự án được phát hành dưới giấy phép MIT. Phát triển bởi **vzdev** & **duydttn**.
