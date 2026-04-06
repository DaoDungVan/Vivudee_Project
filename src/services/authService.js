import API from "./axiosInstance";

// Đăng ký tài khoản mới.
// Gửi { full_name, email, phone, password } → backend tạo user + gửi OTP qua email.
export const registerUser = (data) => {
  return API.post("/auth/register", data);
};

// Đăng nhập.
// Gửi { email, password } → backend trả về { token, user }.
// Token được lưu vào localStorage để dùng cho các request sau.
export const loginUser = (data) => {
  return API.post("/auth/login", data);
};

// Xác thực OTP sau khi đăng ký.
// Gửi { email, otp } → backend kích hoạt tài khoản.
// Tại sao cần OTP? Để xác nhận email thật sự tồn tại và thuộc về user.
export const verifyOTP = (data) => {
  return API.post("/auth/verify-register-otp", data);
};

// Gửi lại OTP khi OTP cũ hết hạn.
// Gửi { email } → backend gửi OTP mới về email.
export const resendOTP = (data) => {
  return API.post("/auth/resend-otp", data);
};

// Quên mật khẩu — bước 1: gửi OTP về email.
// Gửi { email } → backend gửi mã OTP đặt lại mật khẩu.
export const forgotPassword = (data) => {
  return API.post("/auth/forgot-password", data);
};

// Quên mật khẩu — bước 2: xác thực OTP + đặt mật khẩu mới.
// Gửi { email, otp, new_password } → backend cập nhật mật khẩu.
export const resetPassword = (data) => {
  return API.post("/auth/reset-password", data);
};

// Đổi mật khẩu khi đã đăng nhập (cần nhập mật khẩu cũ để xác nhận).
// Gửi { old_password, new_password } → backend kiểm tra rồi cập nhật.
export const changePassword = (data) => {
  return API.post("/auth/change-password", data);
};
