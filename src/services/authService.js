import API from "./axiosInstance";

// REGISTER
export const registerUser = (data) => {
  return API.post("/auth/register", data);
};

// LOGIN
export const loginUser = (data) => {
  return API.post("/auth/login", data);
};

// VERIFY OTP
export const verifyOTP = (data) => {
  return API.post("/auth/verify-register-otp", data);
};

// RESEND OTP
export const resendOTP = (data) => {
  return API.post("/auth/resend-otp", data);
};