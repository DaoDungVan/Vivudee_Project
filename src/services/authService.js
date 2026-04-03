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

// FORGOT PASSWORD — gửi OTP về email
export const forgotPassword = (data) => {
  return API.post("/auth/forgot-password", data);
};

// RESET PASSWORD — xác thực OTP + đổi mật khẩu
export const resetPassword = (data) => {
  return API.post("/auth/reset-password", data);
};

// CHANGE PASSWORD — đổi mật khẩu khi đã đăng nhập (cần old password)
export const changePassword = (data) => {
  return API.post("/auth/change-password", data);
};