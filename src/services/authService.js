import axios from "axios";

const API = "https://backend-log-function-2.onrender.com/api/auth";

// NOTE: đây là backend URL (sau này backend team cung cấp)

export const registerUser = (data) => {
  return axios.post(`${API}/register`, data);
};

// NOTE:
// data = { fullName, email, password }

export const loginUser = (data) => {
  return axios.post(`${API}/login`, data);
};

// 🔥 VERIFY OTP
export const verifyOTP = (data) => {
  return axios.post(`${API}/verify-register-otp`, data);
};