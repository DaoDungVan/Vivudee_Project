import API from "./axiosInstance";

export const requestRefund  = (bookingCode, payload) =>
  API.post(`/bookings/${bookingCode}/refund`, payload);

export const requestGuestRefund = (bookingCode, guestEmail, payload) =>
  API.post("/refunds/guest", { bookingCode, guestEmail, ...payload });

export const getMyRefunds   = (page = 1, limit = 10) =>
  API.get("/refunds/my", { params: { page, limit } });

export const getRefundByCode = (refundCode) =>
  API.get(`/refunds/${refundCode}`);

export const cancelRefund   = (refundCode, reason) =>
  API.delete(`/refunds/${refundCode}`, { data: { reason } });
