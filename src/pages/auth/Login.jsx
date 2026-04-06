import NavBar from "../../components/common/NavBar/Navbar";
import styles from "./Login.module.css";

import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaEye, FaEyeSlash } from "react-icons/fa";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { loginUser, forgotPassword } from "../../services/authService";
import { signInWithGoogle, signInWithFacebook } from "../../lib/supabase";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);  // Ẩn/hiện mật khẩu
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");         // Lỗi toàn form (từ API)
  const [errors, setErrors] = useState({});       // Lỗi từng field (validate)
  const [loading, setLoading] = useState(false);  // Đang gọi API đăng nhập
  const [socialLoading, setSocialLoading] = useState(""); // "google" | "facebook" | ""
  const navigate = useNavigate();

  // --- Trạng thái cho luồng Quên mật khẩu ---
  const [showForgot, setShowForgot] = useState(false);   // Hiện/ẩn modal
  const [forgotStep, setForgotStep] = useState(1);        // Bước 1: nhập email, Bước 2: nhập OTP
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [forgotOtp, setForgotOtp] = useState(["", "", "", "", "", ""]); // Mảng 6 ô nhập OTP
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotCountdown, setForgotCountdown] = useState(0); // Đếm ngược để gửi lại OTP

  // Chuyển giây thành "MM:SS". Ví dụ: 65 → "01:05"
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // Đếm ngược thời gian chờ gửi lại OTP (chạy mỗi giây).
  // Dừng lại khi modal đóng, không ở bước 2, hoặc đếm về 0.
  useEffect(() => {
    if (!showForgot || forgotStep !== 2 || forgotCountdown <= 0) return;
    const timer = setInterval(() => setForgotCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer); // Dọn dẹp khi component unmount hoặc effect chạy lại
  }, [showForgot, forgotStep, forgotCountdown]);

  // Validate form trước khi gửi API — tránh gọi API với dữ liệu sai.
  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Invalid email format";
    if (!password.trim()) errs.password = "Password is required";
    else if (password.trim().length < 8)
      errs.password = "Password must be at least 8 characters";
    return errs;
  };

  // Xử lý đăng nhập bằng email/password.
  // Sau khi thành công: lưu token + user vào localStorage → điều hướng về trang chủ.
  // dispatchEvent("storage") để Navbar cập nhật trạng thái login ngay lập tức.
  const handleLogin = async (e) => {
    e.preventDefault(); // Ngăn form reload trang
    setError("");
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await loginUser({
        email: email.trim(),
        password: password.trim(),
      });
      const token = res.data?.token;
      if (!token) {
        setError("No token received");
        return;
      }
      localStorage.setItem("token", token);
      if (res.data?.user)
        localStorage.setItem("user", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("storage")); // Thông báo cho Navbar biết đã login
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Login failed",
      );
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập bằng Google OAuth — redirect sang trang Google chọn tài khoản.
  const handleGoogleLogin = () => {
    setSocialLoading("google");
    setError("");
    signInWithGoogle();
  };

  // Đăng nhập bằng Facebook OAuth
  const handleFacebookLogin = () => {
    setSocialLoading("facebook");
    setError("");
    signInWithFacebook();
  };

  // Mở modal quên mật khẩu và reset toàn bộ state về ban đầu.
  const openForgotModal = () => {
    setShowForgot(true);
    setForgotStep(1);
    setForgotEmail("");
    setForgotEmailError("");
    setForgotOtp(["", "", "", "", "", ""]);
    setForgotError("");
    setForgotSuccess("");
    setForgotCountdown(0);
  };

  const closeForgotModal = () => {
    setShowForgot(false);
  };

  // Gửi OTP về email để đặt lại mật khẩu.
  // Nếu thành công → chuyển sang bước 2 và bắt đầu đếm ngược 300 giây.
  const handleSendForgotOTP = async () => {
    setForgotEmailError("");
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotEmailError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setForgotEmailError("Invalid email format");
      return;
    }
    setForgotLoading(true);
    try {
      await forgotPassword({ email: forgotEmail.trim() });
      setForgotStep(2);
      setForgotOtp(["", "", "", "", "", ""]);
      setForgotCountdown(300); // 5 phút đếm ngược
      setForgotSuccess("");
    } catch (err) {
      setForgotError(
        err.response?.data?.error || err.response?.data?.message || "Failed to send OTP"
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // Xử lý nhập từng ô OTP (6 ô riêng lẻ).
  // Chỉ cho phép nhập số. Tự động focus sang ô tiếp theo khi nhập xong.
  const handleForgotOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return; // Chặn ký tự không phải số
    const newOtp = [...forgotOtp];
    newOtp[index] = value;
    setForgotOtp(newOtp);
    if (value && index < 5) document.getElementById(`forgot-otp-${index + 1}`).focus();
  };

  // Nhấn Backspace → focus lùi về ô trước nếu ô hiện tại đang rỗng.
  const handleForgotKeyDown = (e, index) => {
    if (e.key === "Backspace" && !forgotOtp[index] && index > 0)
      document.getElementById(`forgot-otp-${index - 1}`).focus();
  };

  // Xác nhận OTP đã nhập → lưu email + OTP vào state rồi chuyển sang trang reset-password.
  // Việc gọi API verify thực sự diễn ra ở trang ResetPassword khi user nhập mật khẩu mới.
  const handleForgotVerifyOTP = () => {
    setForgotError("");
    const otpCode = forgotOtp.join(""); // Ghép mảng ["1","2","3","4","5","6"] → "123456"
    if (otpCode.length < 6) {
      setForgotError("Please enter the complete 6-digit OTP");
      return;
    }
    setShowForgot(false);
    navigate("/reset-password", { state: { email: forgotEmail.trim(), otp: otpCode } });
  };

  // Gửi lại OTP. Chỉ hoạt động khi đếm ngược về 0.
  const handleResendForgotOTP = async () => {
    if (forgotCountdown > 0) return; // Còn đang đếm → chặn
    setForgotError("");
    setForgotLoading(true);
    try {
      await forgotPassword({ email: forgotEmail.trim() });
      setForgotCountdown(300);
      setForgotOtp(["", "", "", "", "", ""]);
      setForgotSuccess("OTP resent successfully!");
    } catch (err) {
      setForgotError(
        err.response?.data?.error || err.response?.data?.message || "Resend failed"
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Login to your account</h2>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Welcome back!</h3>
          <p className={styles.cardDesc}>
            Sign in to continue your journey with Vivudee
          </p>

          {/* Nút đăng nhập nhanh bằng mạng xã hội */}
          <div className={styles.social}>
            <button
              className={styles.socialBtn}
              onClick={handleGoogleLogin}
              disabled={!!socialLoading}
            >
              {socialLoading === "google" ? (
                <span className={styles.socialSpinner} />
              ) : (
                <FcGoogle />
              )}
              <span>Google</span>
            </button>

            <button
              className={styles.socialBtn}
              onClick={handleFacebookLogin}
              disabled={!!socialLoading}
            >
              {socialLoading === "facebook" ? (
                <span className={styles.socialSpinner} />
              ) : (
                <FaFacebook className={styles.fbIcon} />
              )}
              <span>Facebook</span>
            </button>
          </div>

          <div className={styles.divider}>
            <span>or sign in with email</span>
          </div>

          <form className={styles.form} onSubmit={handleLogin}>
            {error && <p className={styles.error}>{error}</p>}

            <label className={styles.label}>Email address</label>
            <input
              type="text"
              placeholder="Enter your email"
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((p) => ({ ...p, email: "" })); // Xoá lỗi khi user bắt đầu sửa
                setError("");
              }}
            />
            {errors.email && (
              <p className={styles.fieldError}>{errors.email}</p>
            )}

            <label className={styles.label}>Password</label>
            <div className={styles.password}>
              <input
                type={showPassword ? "text" : "password"} // Toggle ẩn/hiện mật khẩu
                placeholder="Enter your password"
                className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: "" }));
                  setError("");
                }}
              />
              <span
                className={styles.eye}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errors.password && (
              <p className={styles.fieldError}>{errors.password}</p>
            )}

            <div className={styles.forgot}>
              <span onClick={openForgotModal}>Forgot password?</span>
            </div>

            <button
              type="submit"
              className={styles.loginBtn}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className={styles.registerText}>
              Don't have an account?{" "}
              <span
                className={styles.registerLink}
                onClick={() => navigate("/register")}
              >
                Register now
              </span>
            </p>
          </form>
        </div>
      </div>

      {/* MODAL QUÊN MẬT KHẨU
          Click ra ngoài modal (overlay) → đóng modal */}
      {showForgot && (
        <div className={styles.otpOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeForgotModal(); }}>
          <div className={styles.otpBox}>
            {/* Bước 1: Nhập email */}
            {forgotStep === 1 && (
              <>
                <h3 className={styles.modalTitle}>Forgot Password</h3>
                <p className={styles.modalDesc}>
                  Enter your email address and we'll send you an OTP to reset your password.
                </p>

                {forgotError && <p className={styles.error}>{forgotError}</p>}

                <input
                  type="text"
                  placeholder="Enter your email"
                  className={`${styles.modalInput} ${forgotEmailError ? styles.inputError : ""}`}
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    setForgotEmailError("");
                    setForgotError("");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendForgotOTP(); }}
                />
                {forgotEmailError && <p className={styles.fieldError}>{forgotEmailError}</p>}

                <button
                  className={styles.loginBtn}
                  onClick={handleSendForgotOTP}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Sending..." : "Send OTP"}
                </button>

                <button className={styles.cancelBtn} onClick={closeForgotModal}>
                  Cancel
                </button>
              </>
            )}

            {/* Bước 2: Nhập mã OTP 6 chữ số */}
            {forgotStep === 2 && (
              <>
                <h3 className={styles.modalTitle}>Enter OTP</h3>
                <p className={styles.modalDesc}>
                  We sent a 6-digit code to <strong>{forgotEmail}</strong>
                </p>

                {forgotError && <p className={styles.error}>{forgotError}</p>}
                {forgotSuccess && <p className={styles.successText}>{forgotSuccess}</p>}

                {/* 6 ô nhập OTP riêng lẻ — UX tốt hơn so với 1 ô nhập liền */}
                <div className={styles.otpInputs}>
                  {forgotOtp.map((digit, index) => (
                    <input
                      key={index}
                      id={`forgot-otp-${index}`}
                      type="text"
                      maxLength="1"
                      className={styles.otpInput}
                      value={digit}
                      onChange={(e) => handleForgotOtpChange(e.target.value, index)}
                      onKeyDown={(e) => handleForgotKeyDown(e, index)}
                    />
                  ))}
                </div>

                {/* Nút bị disable cho đến khi nhập đủ 6 chữ số */}
                <button
                  className={styles.loginBtn}
                  onClick={handleForgotVerifyOTP}
                  disabled={forgotOtp.some((d) => d === "")}
                >
                  Verify OTP
                </button>

                {/* Nút gửi lại: disabled khi còn đang đếm ngược */}
                <p
                  className={`${styles.resendText} ${forgotCountdown > 0 ? styles.resendDisabled : ""}`}
                  onClick={handleResendForgotOTP}
                >
                  {forgotLoading
                    ? "Resending..."
                    : forgotCountdown > 0
                    ? `Resend OTP (${formatTime(forgotCountdown)})`
                    : "Resend OTP"}
                </p>

                <button
                  className={styles.cancelBtn}
                  onClick={() => setForgotStep(1)}
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
