import API from "./axiosInstance";

export const getAncillaryOptions = () => API.get("/ancillaries");

export const getBookingAncillaries = (bookingCode) =>
  API.get(`/bookings/${bookingCode.toUpperCase()}/ancillaries`);
