import API from "./axiosInstance";

export const getCheckinStatus = (bookingCode) =>
  API.get(`/checkin/status/${bookingCode.toUpperCase()}`);

export const checkinAll = (bookingCode, flightType = "outbound") =>
  API.post("/checkin", { booking_code: bookingCode.toUpperCase(), flight_type: flightType });

export const getBoardingPass = (boardingPassCode) =>
  API.get(`/checkin/${boardingPassCode}/boarding-pass`);
