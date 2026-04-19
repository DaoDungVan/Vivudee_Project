# Vivudee Frontend

Frontend cho hệ thống đặt vé máy bay Vivudee, xây dựng bằng React + Vite.

README này dùng để:
- giới thiệu nhanh dự án
- chỉ cách chạy local
- mô tả cấu trúc chính của code
- tránh đưa thông tin nhạy cảm vào Git

---

## 1. Dự án này làm gì?

Vivudee là web app đặt vé máy bay.

Người dùng có thể:
- tìm chuyến bay
- nhập thông tin hành khách
- tạo booking
- thanh toán bằng QR, MoMo, PayPal
- xem lịch sử booking
- cập nhật hồ sơ và ảnh đại diện
- xem coupon
- chat với AI hoặc admin

---

## 2. Công nghệ chính

- React 19
- Vite 8
- React Router
- Axios
- i18next
- Socket.IO Client
- React Toastify

---

## 3. Chức năng chính

### Tìm và đặt vé
- Tìm chuyến bay một chiều hoặc khứ hồi
- Lọc kết quả theo giá, hãng bay, giờ bay
- Chọn chuyến bay và nhập thông tin hành khách

### Thanh toán
- Hỗ trợ `BANK_QR`
- Hỗ trợ `MOMO`
- Hỗ trợ `PAYPAL`
- Có áp coupon trước khi tạo giao dịch
- Có polling để kiểm tra trạng thái thanh toán

### Tài khoản
- Đăng ký, đăng nhập, quên mật khẩu
- OAuth qua Supabase redirect
- Cập nhật profile
- Upload ảnh đại diện từ máy

### Chat
- Bong bóng chat nổi, hiện ở mọi trang
- Khách chưa đăng nhập vẫn chat được
- Có chat AI
- Có chuyển sang chat admin khi cần
- Có realtime và thông báo tin mới

---

## 4. Các trang chính

| Route | Mô tả |
|---|---|
| `/` | Trang chủ |
| `/flights` | Kết quả tìm chuyến bay |
| `/booking` | Nhập thông tin đặt vé |
| `/payment` | Thanh toán |
| `/bookings` | Tra cứu và lịch sử booking |
| `/profile` | Thông tin cá nhân |
| `/transactions` | Lịch sử giao dịch |
| `/coupons` | Danh sách coupon |
| `/chat` | Mở nhanh chat widget |
| `/tours` | Trang tours mẫu |
| `/contact` | Liên hệ |
| `/login` / `/register` / `/reset-password` | Xác thực |

---

## 5. Cấu trúc thư mục

```text
src/
  components/   # Các khối UI dùng lại
  pages/        # Các trang
  services/     # Gọi API
  routes/       # Khai báo route
  hooks/        # Custom hooks
  locales/      # i18n
  lib/          # Helper / OAuth
```

Một số file quan trọng:
- `src/App.jsx`: khung app chung
- `src/routes/AppRoutes.jsx`: định nghĩa route
- `src/services/axiosInstance.js`: main API client
- `src/services/paymentService.js`: payment API client
- `src/components/chat/ChatWidget.jsx`: widget chat nổi

---

## 6. Chạy local

### Yêu cầu
- Node.js 18+ khuyến nghị
- npm

### Cài đặt

```bash
npm install
```

### Chạy dev

```bash
npm run dev
```

### Build production

```bash
npm run build
```

### Preview bản build

```bash
npm run preview
```

### Kiểm tra lint

```bash
npm run lint
```

---

## 7. Cấu hình môi trường

Không commit giá trị thật của `.env`.

Hiện tại frontend dùng tối thiểu:

```env
VITE_SUPABASE_URL=<your-supabase-project-url>
```

Lưu ý:
- README này không ghi domain thật, token, key, webhook hay tài khoản test
- Nếu cần đổi endpoint backend, hãy xem trong các file `services`

---

## 8. API và bảo mật

Frontend đang nói với:
- Main API cho auth, flights, booking, coupon, chat
- Payment API cho giao dịch thanh toán

Để tránh lộ thông tin:
- không ghi URL thật trong README
- không ghi API key
- không ghi tài khoản admin
- không ghi OTP, webhook secret hay payment secret

Nếu bàn giao cho người mới:
- chỉ đưa tên biến môi trường
- giá trị thật để ở `.env` local hoặc hệ thống deploy

---

## 9. Dữ liệu lưu ở frontend

App có thể lưu một số giá trị trong `localStorage`:
- `token`
- `user`
- `theme`
- `lang`
- `chat_guest_session_id`

Mục đích:
- giữ phiên đăng nhập
- nhớ giao diện sáng/tối
- nhớ ngôn ngữ
- cho phép guest tiếp tục chat

---

## 10. Ghi chú cho người mới vào code

- App không dùng Redux
- Nhiều dữ liệu được truyền qua `location.state`
- Nhiều trang tự kiểm tra token rồi mới cho phép vào
- Chat hiện tại dùng widget nổi, không phải trang chat cũ
- Thư mục `docs/` dùng để đọc local và có thể đang bị ignore trong Git

---

## 11. Tài liệu local

Nếu máy của bạn có thư mục `docs/`, đó là tài liệu mở rộng để đọc local.

README này chỉ giữ phần:
- tổng quan
- hướng dẫn chạy
- những điểm quan trọng để bắt đầu nhanh

---

## 12. Tình trạng hiện tại

Dự án đang trong giai đoạn phát triển tiếp tục.

Một số phần đang được mở rộng:
- payment flow
- coupon flow
- profile update
- chat guest/admin
- giao diện mobile

Nếu muốn tiếp cận code nhanh:
1. Đọc `src/routes/AppRoutes.jsx`
2. Đọc `src/pages/home/Home.jsx`
3. Đọc `src/pages/payment/Payment.jsx`
4. Đọc `src/components/chat/ChatWidget.jsx`
