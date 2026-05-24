import axios from "axios";

const PAYMENT_API = axios.create({
  baseURL: "https://backend-log-function-2.onrender.com/api",
});

// Khởi tạo thanh toán — bước đầu tiên khi user bấm "Pay".
// payload: { booking_id, email, phone, name, payment_method, voucher_code? }
// Trả về thông tin giao dịch: payment_code, QR url (với BANK_QR) hoặc redirect url (với MoMo).
// Backend mới trả về { success, data: {...} } — chuẩn hóa về { success, payment: {...} }
// để Payment.jsx vẫn đọc được res.payment như cũ.
const normalizePaymentResponse = (body) => ({
  ...body,
  payment: body.data ?? body.payment ?? null,
});

export const initPayment = async (payload) => {
  const res = await PAYMENT_API.post("/payments/init", payload);
  return normalizePaymentResponse(res.data);
};

export const getPaymentByCode = async (paymentCode) => {
  const res = await PAYMENT_API.get(`/payments/${paymentCode}`);
  return normalizePaymentResponse(res.data);
};

// Xác nhận thanh toán thủ công (dùng để test hoặc admin confirm).
// Trong thực tế, backend tự xác nhận qua webhook từ MoMo hoặc bank.
export const confirmPayment = async (payload) => {
  const res = await PAYMENT_API.post("/payments/confirm", payload);
  return res.data;
};

// Huỷ giao dịch thanh toán đang chờ.
// Gọi khi user bấm "Cancel" trên màn hình thanh toán.
export const cancelPayment = async (paymentCode) => {
  const res = await PAYMENT_API.post("/payments/cancel", { payment_code: paymentCode });
  return res.data;
};

// Tạo URL ảnh QR chuyển khoản từ VietQR.io (dịch vụ miễn phí).
// URL trả về là ảnh PNG chứa QR code đã điền sẵn thông tin ngân hàng + số tiền + nội dung.
// Tại sao không tạo QR ở frontend trực tiếp?
//   → Dùng VietQR.io để đảm bảo định dạng chuẩn mà tất cả app ngân hàng VN đều đọc được.
export const buildVietQRUrl = ({ bankCode, accountNumber, accountName, amount, transferContent, template = "compact2" }) => {
  return (
    `https://img.vietqr.io/image/` +
    `${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNumber)}-${encodeURIComponent(template)}.png` +
    `?amount=${encodeURIComponent(amount)}` +
    `&addInfo=${encodeURIComponent(transferContent)}` +
    `&accountName=${encodeURIComponent(accountName)}`
  );
};
