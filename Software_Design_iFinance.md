# SOFTWARE DESIGN DOCUMENT  
## iFinance – Intelligent Internal Income and Expense Management System

---

## 1. Giới thiệu

### 1.1 Mục đích tài liệu
Tài liệu này mô tả thiết kế tổng thể của hệ thống **iFinance**, bao gồm kiến trúc, các thành phần chính, luồng xử lý dữ liệu và các chức năng cốt lõi.  
Tài liệu phục vụ cho việc phát triển, kiểm thử và báo cáo học phần **Dự án Phát triển Phần mềm I**.

### 1.2 Phạm vi hệ thống
Hệ thống iFinance là một ứng dụng quản lý thu – chi nội bộ, hỗ trợ người dùng theo dõi, phân loại và tổng hợp dữ liệu tài chính cá nhân hoặc doanh nghiệp nhỏ.  
Hệ thống có tích hợp các kỹ thuật thông minh nhằm hỗ trợ gợi ý phân loại giao dịch và phát hiện các khoản chi bất thường.

---

## 2. Tổng quan hệ thống

### 2.1 Mô tả chung
Hệ thống được xây dựng theo mô hình client–server, trong đó:
- Ứng dụng **Electron** đóng vai trò giao diện người dùng.
- **API Server** xử lý logic nghiệp vụ và tiếp nhận dữ liệu từ các nguồn bên ngoài.
- **Cơ sở dữ liệu SQLite** lưu trữ dữ liệu giao dịch và cấu hình hệ thống.

### 2.2 Đối tượng sử dụng
- Cá nhân kinh doanh nhỏ
- Nhóm làm việc hoặc doanh nghiệp quy mô nhỏ
- Người cần quản lý thu – chi nội bộ thay thế Excel

---

## 3. Kiến trúc hệ thống

### 3.1 Sơ đồ kiến trúc tổng thể

[ Telegram Bot / Email ]
↓
[ API Server ]
↓
SQLite DB
↓
[ Electron App ]


### 3.2 Mô tả các thành phần

#### 3.2.1 Electron Application
- Cung cấp giao diện quản lý thu – chi
- Hiển thị dashboard, báo cáo, danh sách giao dịch
- Cho phép chỉnh sửa và xác nhận phân loại giao dịch

#### 3.2.2 API Server
- Tiếp nhận dữ liệu giao dịch từ Telegram Bot hoặc các nguồn khác
- Xử lý logic phân loại giao dịch
- Phát hiện các giao dịch bất thường
- Cung cấp API cho Electron App truy xuất dữ liệu

#### 3.2.3 Cơ sở dữ liệu SQLite
- Lưu trữ dữ liệu giao dịch
- Lưu danh mục chi tiêu
- Lưu cấu hình và luật phân loại

---

## 4. Chức năng hệ thống

### 4.1 Quản lý giao dịch
- Thêm, sửa, xóa giao dịch thu – chi
- Phân loại giao dịch theo cá nhân hoặc công việc
- Gắn danh mục cho từng giao dịch

### 4.2 Hỗ trợ phân loại giao dịch thông minh
- Phân tích nội dung giao dịch
- So sánh với dữ liệu lịch sử
- Gợi ý loại giao dịch phù hợp
- Người dùng xác nhận hoặc chỉnh sửa gợi ý

### 4.3 Phát hiện giao dịch bất thường
- Phân tích thống kê theo từng danh mục
- Đánh dấu các giao dịch có giá trị vượt ngưỡng thông thường
- Hiển thị cảnh báo trên giao diện dashboard

### 4.4 Báo cáo và thống kê
- Tổng hợp thu – chi theo thời gian
- Biểu đồ so sánh thu – chi
- Báo cáo theo danh mục

---

## 5. Thiết kế giao diện (UI Design)

### 5.1 Các màn hình chính
- Dashboard tổng quan
- Danh sách giao dịch
- Giao dịch cần xác nhận
- Báo cáo – thống kê
- Cài đặt hệ thống

### 5.2 Nguyên tắc thiết kế
- Đơn giản, dễ sử dụng
- Hạn chế nhập liệu thủ công
- Tập trung vào hỗ trợ ra quyết định

---

## 6. Thiết kế dữ liệu

### 6.1 Bảng Transaction
- id
- date
- description
- amount
- type (income / expense)
- scope (personal / business)
- category
- source
- created_at

### 6.2 Bảng Category
- id
- name
- scope

### 6.3 Bảng Rule
- id
- keyword
- category
- scope

---

## 7. Logic thông minh (AI Support)

### 7.1 Nguyên tắc
- Không tự động quyết định hoàn toàn
- Chỉ hỗ trợ gợi ý
- Luôn có bước xác nhận của người dùng

### 7.2 Phân loại giao dịch
- Áp dụng luật nghiệp vụ (rule-based)
- So sánh nội dung giao dịch với lịch sử
- Đưa ra gợi ý có độ tin cậy

### 7.3 Phát hiện bất thường
- Sử dụng thống kê (trung bình, độ lệch chuẩn)
- So sánh giao dịch mới với dữ liệu lịch sử
- Gắn cờ cảnh báo nếu vượt ngưỡng

---

## 8. Công nghệ sử dụng

- Frontend: Electron (HTML, CSS, JavaScript)
- Backend: NodeJS / REST API
- Database: SQLite
- AI hỗ trợ: Rule-based + phân tích thống kê

---

## 9. Kết luận

Hệ thống iFinance được thiết kế nhằm hỗ trợ quản lý thu – chi nội bộ một cách hiệu quả, giảm thiểu sai sót và nâng cao khả năng theo dõi tài chính.  
Thiết kế tập trung vào tính thực tiễn, dễ triển khai và phù hợp với phạm vi học phần **Dự án Phát triển Phần mềm I**.
