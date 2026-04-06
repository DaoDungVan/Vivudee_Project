import API from "./axiosInstance";

// Tạo booking mới sau khi user điền thông tin hành khách.
// payload gồm: flight IDs, danh sách hành khách, contact, tổng tiền...
// Backend trả về booking_code (mã đặt chỗ), ví dụ: VVD-A1B2C3
export const createBooking  = (payload)  => API.post("/bookings", payload);

// Lấy danh sách booking của user đang đăng nhập.
// filter = "all" | "upcoming" | "past" | "cancelled"
// Token được tự động gắn vào qua axiosInstance interceptor.
export const getMyBookings  = (filter = "all") => API.get(`/bookings/my?filter=${filter}`);

// Lấy chi tiết một booking theo mã đặt chỗ.
// Ví dụ: getBookingByCode("VVD-A1B2C3") → GET /bookings/VVD-A1B2C3
// .toUpperCase() để đảm bảo không phân biệt hoa/thường
export const getBookingByCode = (code)   => API.get(`/bookings/${code.toUpperCase()}`);

// Huỷ booking theo mã đặt chỗ.
// Dùng POST (không phải DELETE) vì backend xử lý như một action/event.
export const cancelBooking  = (code)     => API.post(`/bookings/${code.toUpperCase()}/cancel`);
