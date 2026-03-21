import Footer from "../../components/common/Footer/Footer";
import NavBar from "../../components/common/NavBar/NavBar";
import styles from "./Register.module.css";

import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { FaApple, FaEye, FaEyeSlash } from "react-icons/fa";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, verifyOTP } from "../../services/authService";

const Register = () => {
  const navigate = useNavigate();

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
  const [otp, setOtp] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // ===== HANDLE REGISTER =====
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      alert("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const payload = {
      full_name: fullName,
      email,
      phone,
      password,
      confirm_password: confirmPassword,
    };

    try {
      console.log("FINAL FIX PAYLOAD:", payload);

      const res = await registerUser(payload);

      console.log("Success:", res.data);

      // 🔥 mở OTP modal
      setUserEmail(email);
      setOtp("");
      setShowOTP(true);

      if (res.data?.otp_test) {
        alert("OTP (dev): " + res.data.otp_test);
      }

    } catch (error) {
      console.log("Status:", error.response?.status);
      console.log("Backend:", error.response?.data);

      alert(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Register failed"
      );
    }
  };

  // ===== VERIFY OTP =====
  const handleVerifyOTP = async () => {
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      alert("Please enter OTP");
      return;
    }

    try {
      const res = await verifyOTP({
        email: userEmail,
        otp: cleanOtp,
      });

      console.log("Verify success:", res.data);

      alert("Verify success!");

      setShowOTP(false);
      setOtp("");

      navigate("/login");

    } catch (err) {
      console.log("Verify error:", err.response?.data);
      alert("Invalid OTP");
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

          {/* SOCIAL */}
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
            {/* Full Name */}
            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              className={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            {/* Email */}
            <label className={styles.label}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Phone */}
            <label className={styles.label}>Phone</label>
            <input
              type="text"
              placeholder="Enter your phone number"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {/* Password */}
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

            {/* Confirm Password */}
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

            {/* Submit */}
            <button type="button" className={styles.loginBtn} onClick={handleRegister}>
              Sign Up
            </button>

            {/* Login link */}
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

      {/* 🔥 OTP MODAL */}
      {showOTP && (
        <div className={styles.otpOverlay}>
          <div className={styles.otpBox}>
            <h3>Verify OTP</h3>
            <p>Enter the code sent to your email</p>

            <input
              type="text"
              placeholder="Enter OTP"
              className={styles.input}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, ""))
              }
            />

            <button
              onClick={handleVerifyOTP}
              className={styles.loginBtn}
              disabled={!otp}
            >
              Verify
            </button>

            <button onClick={() => setShowOTP(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* <Footer /> */}
    </>
  );
};

export default Register;