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
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(300);

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

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

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
              className={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <label className={styles.label}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className={styles.label}>Phone</label>
            <input
              type="text"
              placeholder="Enter your phone number"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <label className={styles.label}>Password</label>
            <div className={styles.password}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span
                className={styles.eye}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            <label className={styles.label}>Confirm Password</label>
            <div className={styles.password}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <span
                className={styles.eye}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

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
