## 🔐 10. Threat Model (Mô hình đe dọa – rút gọn)

### 10.1 Phạm vi Threat Model

Do hệ thống iFinance được sử dụng trong môi trường **nội bộ**, Threat Model được xây dựng ở mức cơ bản, tập trung vào các rủi ro thực tế có thể ảnh hưởng đến tính bảo mật, toàn vẹn và độ tin cậy của dữ liệu thu – chi.

Threat Model không hướng tới các tấn công phức tạp từ bên ngoài Internet mà tập trung vào:

* Người dùng nội bộ
* Thiết bị sử dụng chung
* Kênh tích hợp bên thứ ba (Telegram Bot, Email)

---

### 10.2 Các mối đe dọa chính và biện pháp giảm thiểu

| Mối đe dọa               | Mô tả                                          | Biện pháp xử lý                              |
| ------------------------ | ---------------------------------------------- | -------------------------------------------- |
| Truy cập trái phép       | Người không có quyền đăng nhập vào hệ thống    | Xác thực người dùng, phân quyền theo vai trò |
| Lộ dữ liệu tài chính     | Sao chép hoặc truy cập trái phép cơ sở dữ liệu | Mã hóa dữ liệu, giới hạn quyền truy cập      |
| Sửa đổi dữ liệu sai lệch | Thay đổi giao dịch không có kiểm soát          | Ghi log thao tác, theo dõi lịch sử chỉnh sửa |
| Lạm dụng API             | Gửi request không hợp lệ đến API Server        | Kiểm tra token, giới hạn quyền truy cập API  |
| Lạm dụng Telegram Bot    | Gửi dữ liệu giả mạo qua bot                    | Whitelist user, xác thực nguồn gửi           |

---

### 10.3 Đánh giá mức độ rủi ro

* Các rủi ro được đánh giá ở mức **thấp đến trung bình**, phù hợp với môi trường sử dụng nội bộ.
* Các biện pháp bảo mật được triển khai nhằm **giảm thiểu rủi ro**, không hướng tới việc loại bỏ hoàn toàn các mối đe dọa phức tạp.
