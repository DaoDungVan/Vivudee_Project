import Footer from "../../components/common/Footer/Footer";
import NavBar from "../../components/common/NavBar/NavBar";
import styles from "./Register.module.css";

import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { FaApple, FaEye, FaEyeSlash } from "react-icons/fa";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../services/authService";

// NOTE: import hàm gọi API register

const Register = () => {
  const navigate = useNavigate();

  // ================= STATE =================
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // NOTE: dùng riêng cho confirm password

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ================= HANDLE REGISTER =================
  const handleRegister = async (e) => {
    e.preventDefault();

    // validate password
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      // ================= CALL API =================
      const res = await registerUser({
        fullName,
        email,
        password,
      });

      console.log("Register success:", res.data);

      // NOTE: register thành công → chuyển sang login
      navigate("/login");
    } catch (error) {
      console.error("Register error:", error);

      // NOTE: lấy message từ backend nếu có
      alert(error.response?.data?.message || "Register failed");
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

          {/* ===== Social ===== */}
          <div className={styles.social}>
            {/* TODO: OAuth login */}
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

          {/* ===== Divider ===== */}
          <div className={styles.divider}>
            <span>or sign up with email</span>
          </div>

          {/* ===== FORM ===== */}
          <form className={styles.form} onSubmit={handleRegister}>
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
            <label className={styles.label}>Email address</label>
            <input
              type="email"
              placeholder="Enter your email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            <button type="submit" className={styles.loginBtn}>
              Sign Up
            </button>

            {/* Link login */}
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

      {/* NOTE: nếu muốn thì bật lại */}
      {/* <Footer /> */}
    </>
  );
};

export default Register;
