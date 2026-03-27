import axios from "axios";

// Payment backend riêng deploy trên Render
const PAYMENT_API = axios.create({
  baseURL: "https://backend-pay-ticket-function.onrender.com",
});

/**
 * Khởi tạo thanh toán
 * POST /payments/init
 * @param {object} payload - { booking_id, email, phone, name, payment_method, voucher_code? }
 */
export const initPayment = async (payload) => {
  const res = await PAYMENT_API.post("/payments/init", payload);
  return res.data; // { success: true, payment: { ... } }
};

/**
 * Lấy thông tin payment theo mã
 * GET /payments/:paymentCode
 */
export const getPaymentByCode = async (paymentCode) => {
  const res = await PAYMENT_API.get(`/payments/${paymentCode}`);
  return res.data;
};

/**
 * Xác nhận thanh toán thủ công (dùng cho test/admin)
 * POST /payments/confirm
 */
export const confirmPayment = async (payload) => {
  const res = await PAYMENT_API.post("/payments/confirm", payload);
  return res.data;
};

/**
 * Huỷ thanh toán
 * POST /payments/cancel
 */
export const cancelPayment = async (paymentCode) => {
  const res = await PAYMENT_API.post("/payments/cancel", { payment_code: paymentCode });
  return res.data;
};

/**
 * Tạo VietQR URL thật từ VietQR.io
 * Dùng tài khoản VietinBank thật đã cấu hình trong backend
 */
export const buildVietQRUrl = ({ bankCode, accountNumber, accountName, amount, transferContent, template = "compact2" }) => {
  return (
    `https://img.vietqr.io/image/` +
    `${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNumber)}-${encodeURIComponent(template)}.png` +
    `?amount=${encodeURIComponent(amount)}` +
    `&addInfo=${encodeURIComponent(transferContent)}` +
    `&accountName=${encodeURIComponent(accountName)}`
  );
};
