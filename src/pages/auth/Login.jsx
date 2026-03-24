import Footer from "../../components/common/Footer/Footer";
import NavBar from "../../components/common/NavBar/Navbar";
import styles from "./Login.module.css";

import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { FaApple, FaEye, FaEyeSlash } from "react-icons/fa";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginUser } from "../../services/authService";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter email and password");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Invalid email format");
      return;
    }

    setLoading(true);

    try {
      const res = await loginUser({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      const token = res.data?.token;

      if (!token) {
        setError("No token received");
        return;
      }

      localStorage.setItem("token", token);
      if (res.data?.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }

      // ✅ FIX CHÍNH: báo cho NavBar biết localStorage đã thay đổi
      // mà không cần reload trang → tránh lag/chậm
      window.dispatchEvent(new Event("storage"));

      navigate("/");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Login failed",
      );
    } finally {
      setLoading(false);
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
            <span>or sign in with email</span>
          </div>

          {/* FORM */}
          <form className={styles.form} onSubmit={handleLogin}>
            {error && <p className={styles.error}>{error}</p>}

            {/* Email */}
            <label className={styles.label}>Email address</label>
            <input
              type="email"
              placeholder="Enter your email"
              className={styles.input}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
            />

            {/* Password */}
            <label className={styles.label}>Password</label>
            <div className={styles.password}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className={styles.input}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
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

            {/* Forgot */}
            <div className={styles.forgot}>
              <span onClick={() => navigate("/forgot-password")}>
                Forgot password?
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={styles.loginBtn}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Register */}
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

      {/* <Footer /> */}
    </>
  );
};

export default Login;