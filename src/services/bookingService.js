import API from "./axiosInstance";

export const createBooking  = (payload)  => API.post("/bookings", payload);
export const getMyBookings  = (filter = "all") => API.get(`/bookings/my?filter=${filter}`);
export const getBookingByCode = (code)   => API.get(`/bookings/${code.toUpperCase()}`);
export const cancelBooking  = (code)     => API.post(`/bookings/${code.toUpperCase()}/cancel`);