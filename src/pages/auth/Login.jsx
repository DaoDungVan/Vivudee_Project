import Footer from "../../components/common/Footer/Footer";
import NavBar from "../../components/common/NavBar/NavBar";
import styles from "./Login.module.css";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { FaApple } from "react-icons/fa";
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { useNavigate } from "react-router-dom"; // NOTE: dùng để điều hướng sau khi đăng nhập thành công.

import { loginUser } from "../../services/authService";

// NOTE: gọi API login

// NOTE:
// FaEye = mở mắt
// FaEyeSlash = mắt gạch (ẩn password)

// NOTE:
// Fc = flat color (Google đẹp sẵn)
// Fa = FontAwesome

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  // NOTE: false = ẩn, true = hiện

  const navigate = useNavigate();

  // NOTE: dùng để chuyển trang sau khi login thành công

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // NOTE: state này sẽ giữ dữ liệu form
  // TODO: sau này gửi email/password lên API login

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // ================= CALL API =================
      const res = await loginUser({
        email,
        password,
      });

      console.log("Login success:", res.data);

      // ================= LƯU TOKEN =================
      const token = res.data.token;

      // NOTE: lưu token để dùng cho request sau
      localStorage.setItem("token", token);

      // ================= REDIRECT =================
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);

      alert(error.response?.data?.message || "Login failed");
    }
  };
  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Login to your account</h2>

        {/* NOTE: Card chứa form login */}
        <div className={styles.card}>
          {/* NOTE: tiêu đề trong card */}
          <h3 className={styles.cardTitle}>Welcome back!</h3>
          {/* NOTE: mô tả */}
          <p className={styles.cardDesc}>
            Sign in to continue your journey with Vivudee
          </p>
          <div className={styles.social}>
            {/* TODO: gắn OAuth login (Google, Facebook)*/}
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
          {/* NOTE: Divider */}
          <div className={styles.divider}>
            <span>or sign in with email</span>
          </div>
          {/* NOTE: Form login */}
          <form className={styles.form} onSubmit={handleLogin}>
            {/* NOTE: label cho email */}
            <label className={styles.label}>Email address</label>
            <input
              type="email"
              placeholder="Enter your email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* NOTE: label cho password */}
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
            {/* NOTE: Forgot password */}
            <div className={styles.forgot}>
              <span>Forgot password?</span>
            </div>
            {/* NOTE: Submit button */}
            <button type="submit" className={styles.loginBtn}>
              Sign In
            </button>
            {/* NOTE: Link sang register */}
            <p className={styles.registerText}>
              Don’t have an account?{" "}
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
      {/* <Footer /> */}
    </>
  );
};

export default Login;
