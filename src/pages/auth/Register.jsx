import Footer from "../../components/common/Footer/Footer";
import styles from "./Register.module.css";
import NavBar from "../../components/common/NavBar/Navbar";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { FaApple, FaEye, FaEyeSlash } from "react-icons/fa";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, verifyOTP, resendOTP } from "../../services/authService";

const Register = () => {
  const navigate = useNavigate();
  const formatTime = (seconds) => {
    // dùng để format time thành phút
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // ===== STATE =====
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 🔥 OTP STATE
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [userEmail, setUserEmail] = useState("");

  // 🔥 NEW STATE (ADD)
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(300);

  const validate = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    } else if (/\d/.test(fullName)) {
      newErrors.fullName = "Full name must not contain numbers";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Invalid email format (e.g. example@email.com)";
    }

    if (phone.trim() && !/^(0[3-9][0-9]{8}|\+84[3-9][0-9]{8})$/.test(phone.trim())) {
      newErrors.phone = "Invalid phone number (e.g. 0901234567)";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = "Password must include uppercase, lowercase and a number";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;
  };

  // 🔥 COUNTDOWN
  useEffect(() => {
    if (!showOTP) return;
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [showOTP, countdown]);

  // ===== HANDLE REGISTER =====
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const payload = {
      full_name: fullName,
      email,
      phone,
      password,
      confirm_password: confirmPassword,
    };

    setLoading(true); // ✅ thêm vào đây
    try {
      const res = await registerUser(payload);
      setUserEmail(email);
      setOtp(["", "", "", "", "", ""]);
      setShowOTP(true);
      setCountdown(300);
      if (process.env.NODE_ENV === "development" && res.data?.otp_test) {
        console.log("OTP (dev):", res.data.otp_test);
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Register failed",
      );
    } finally {
      setLoading(false); // ✅ thêm vào đây
    }
  };

  // handle otp 6 ô
  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // auto next
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  // handle cho phép mũi tên ngược về
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  // ===== VERIFY OTP =====
  const [loading, setLoading] = useState(false);

  const handleVerifyOTP = async () => {
    const cleanOtp = otp.join("");
    setError("");

    if (!cleanOtp) {
      setError("Please enter OTP");
      return;
    }

    setLoading(true); // 🔥 bắt đầu loading
    try {
      await verifyOTP({ email: userEmail, otp: cleanOtp });

      setSuccess("Verify success!");
      setTimeout(() => {
        setShowOTP(false);
        setOtp(["", "", "", "", "", ""]);
        navigate("/login");
      }, 800); // có thể giảm xuống 500-800ms
    } catch (err) {
      setError("Invalid OTP");
    } finally {
      setLoading(false); // 🔥 kết thúc loading
    }
  };

  // ===== RESEND OTP =====
  const handleResendOTP = async () => {
    if (countdown > 0) return;

    try {
      await resendOTP({
        email: userEmail, // 🔥 chỉ cần email
      });

      setCountdown(300);
      setSuccess("OTP resent successfully!");
      setError("");
    } catch (err) {
      console.log(err.response?.data);
      setError("Resend failed");
    }
  };

  return (
    <>
      <NavBar />

      <div className={styles.wrapper}>
        <h2 className={styles.title}>Create your account</h2>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Get started!</h3>
          <p className={styles.cardDesc}>
            Create an account to start booking flights
          </p>

          {/* SOCIAL (GIỮ NGUYÊN) */}
          <div className={styles.social}>
            <button className={styles.socialBtn}>
              <FcGoogle />
              <span>Google</span>
            </button>

            <button className={styles.socialBtn}>
              <FaFacebook className={styles.fbIcon} />
              <span>Facebook</span>
            </button>

            <button className={styles.socialBtn}>
              <FaApple />
              <span>Apple ID</span>
            </button>
          </div>

          <div className={styles.divider}>
            <span>or sign up with email</span>
          </div>

          {/* FORM */}
          <form className={styles.form}>
            {error && <p className={styles.error}>{error}</p>}

            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              className={`${styles.input} ${errors.fullName ? styles.inputError : ""}`}
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors((prev) => ({ ...prev, fullName: "" })); }}
            />
            {errors.fullName && <p className={styles.fieldError}>{errors.fullName}</p>}

            <label className={styles.label}>Email</label>
            <input
              type="text"
              placeholder="Enter your email"
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: "" })); }}
            />
            {errors.email && <p className={styles.fieldError}>{errors.email}</p>}

            <label className={styles.label}>Phone <span style={{ color: "#aaa", fontWeight: 400 }}>(optional)</span></label>
            <input
              type="text"
              placeholder="Enter your phone number"
              className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: "" })); }}
            />
            {errors.phone && <p className={styles.fieldError}>{errors.phone}</p>}

            <label className={styles.label}>Password</label>
            <div className={styles.password}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: "" })); }}
              />
              <span
                className={styles.eye}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errors.password && <p className={styles.fieldError}>{errors.password}</p>}

            <label className={styles.label}>Confirm Password</label>
            <div className={styles.password}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((prev) => ({ ...prev, confirmPassword: "" })); }}
              />
              <span
                className={styles.eye}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errors.confirmPassword && <p className={styles.fieldError}>{errors.confirmPassword}</p>}

            <button
              type="button"
              className={styles.loginBtn}
              onClick={handleRegister}
              disabled={loading} // ✅ chống spam click
            >
              {loading ? "Sending OTP..." : "Sign Up"}
            </button>
            <p className={styles.registerText}>
              Already have an account?{" "}
              <span
                className={styles.registerLink}
                onClick={() => navigate("/login")}
              >
                Login now
              </span>
            </p>
          </form>
        </div>
      </div>

      {/* OTP MODAL */}
      {showOTP && (
        <div className={styles.otpOverlay}>
          <div className={styles.otpBox}>
            <h3>Verify OTP</h3>
            <p>Enter the code sent to your email</p>

            {error && <p className={styles.error}>{error}</p>}
            {success && <p className={styles.success}>{success}</p>}

            <div className={styles.otpInputs}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  className={styles.otpInput}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOTP}
              className={styles.loginBtn}
              disabled={otp.some((d) => d === "") || loading} // disable khi loading
            >
              {loading ? "Verifying..." : "Verify"} {/* đổi text */}
            </button>

            <p
              className={`${styles.resend} ${countdown > 0 ? styles.disabled : ""}`}
              onClick={handleResendOTP}
            >
              Resend OTP {countdown > 0 && `(${formatTime(countdown)})`}
            </p>

            <button
              className={styles.cancelBtn}
              onClick={() => setShowOTP(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Register;
