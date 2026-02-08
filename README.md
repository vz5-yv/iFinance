# iFinance

Hệ thống quản lý thu chi nội bộ thông minh

## Tính năng

- 🔐 Xác thực và phân quyền người dùng (JWT-based)
- 💳 Quản lý giao dịch thu - chi
- 🤖 Phân loại giao dịch thông minh
- ⚠️ Phát hiện giao dịch bất thường
- 📊 Dashboard với thống kê tổng quan
- 📈 Báo cáo chi tiết theo thời gian
- 🔒 Bảo mật dữ liệu với mã hóa
- 📝 Audit log toàn bộ thao tác

## Công nghệ

- **Frontend**: Electron + HTML/CSS/JavaScript
- **Backend**: Node.js + Express.js
- **Database**: SQLite với better-sqlite3
- **Authentication**: JWT + bcrypt
- **Security**: Helmet, Rate Limiting, CORS

## Cài đặt

```bash
# Clone repository
git clone <repository-url>
cd iFinance

# Cài đặt dependencies
npm install

# Tạo file .env từ template
cp .env.example .env

# Chỉnh sửa .env và thay đổi các giá trị bảo mật
notepad .env
```

## Chạy ứng dụng

### Development mode

```bash
# Chạy backend server và Electron app
npm run dev
```

### Production mode

```bash
# Build ứng dụng Windows
npm run build:win

# Build ứng dụng macOS
npm run build:mac

# Build ứng dụng Linux
npm run build:linux
```

## Tài khoản mặc định

- **Username**: admin
- **Password**: admin123
- **Role**: Admin

## Cấu trúc thư mục

```
iFinance/
├── electron/           # Electron main process
├── backend/           # Node.js API server
│   ├── database/     # Database schema & connection
│   ├── models/       # Data models
│   ├── routes/       # API routes
│   ├── middleware/   # Auth & validation
│   └── services/     # Business logic
├── frontend/         # UI pages
│   ├── pages/       # HTML pages
│   ├── css/         # Stylesheets
│   └── js/          # JavaScript utilities
└── package.json
```

## Tính năng bảo mật

- ✅ Mã hóa mật khẩu với bcrypt
- ✅ JWT token authentication
- ✅ Role-based access control
- ✅ Rate limiting
- ✅ Input validation
- ✅ Audit logging
- ✅ CORS protection
- ✅ Helmet security headers

## License

MIT
