import API from "./axiosInstance";

const getLang = () => localStorage.getItem("lang") || "en";

export const getAncillaryOptions = () => API.get("/ancillaries", { params: { lang: getLang() } });

export const getBookingAncillaries = (bookingCode) =>
  API.get(`/bookings/${bookingCode.toUpperCase()}/ancillaries`, { params: { lang: getLang() } });
