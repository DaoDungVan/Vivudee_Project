import axios from "axios";

const API = "http://localhost:5000/api/auth";

// NOTE: đây là backend URL (sau này backend team cung cấp)

export const registerUser = (data) => {
  return axios.post(`${API}/register`, data);
};

// NOTE:
// data = { fullName, email, password }

export const loginUser = (data) => {
  return axios.post(`${API}/login`, data);
};