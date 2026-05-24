import API from "./axiosInstance";

const normalizePaymentResponse = (body) => ({
  ...body,
  payment: body.data ?? body.payment ?? null,
});

export const initPayment = async (payload) => {
  const res = await API.post("/payments/init", payload);
  return normalizePaymentResponse(res.data);
};

export const getPaymentByCode = async (paymentCode) => {
  const res = await API.get(`/payments/${paymentCode}`);
  return normalizePaymentResponse(res.data);
};

export const confirmPayment = async (payload) => {
  const res = await API.post("/payments/confirm", payload);
  return res.data;
};

export const cancelPayment = async (paymentCode) => {
  const res = await API.post("/payments/cancel", { payment_code: paymentCode });
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
