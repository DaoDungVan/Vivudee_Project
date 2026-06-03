import API from "./axiosInstance";

export const requestDateChange = (bookingCode, data) =>
  API.post(`/date-changes/bookings/${bookingCode}/change-flight`, data);

export const confirmDateChangeOTP = (email, otp, requestCode) =>
  API.post("/date-changes/confirm", { email, otp, requestCode });

export const getMyDateChanges = (page = 1, limit = 10) =>
  API.get("/date-changes/my", { params: { page, limit } });

export const getDateChangeDetail = (requestCode) =>
  API.get(`/date-changes/${requestCode}`);

export const cancelDateChange = (requestCode) =>
  API.delete(`/date-changes/${requestCode}`);

export const createDateChangePayment = (requestCode, paymentMethod) =>
  API.post(`/date-changes/${requestCode}/payment`, { payment_method: paymentMethod });

export const getDateChangePaymentStatus = (requestCode) =>
  API.get(`/date-changes/${requestCode}/payment`);

export const cancelDateChangePayment = (requestCode) =>
  API.delete(`/date-changes/${requestCode}/payment`);
