import Footer from "../../components/common/Footer/Footer";
import NavBar from "../../components/common/NavBar/Navbar";
import styles from "./Login.module.css";

import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaEye, FaEyeSlash } from "react-icons/fa";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { loginUser } from "../../services/authService";
import { signInWithGoogle, signInWithFacebook } from "../../lib/supabase";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const navigate = useNavigate();

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

  const handleLogin = async (e) => {
    e.preventDefault();
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
      window.dispatchEvent(new Event("storage"));
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

  const handleGoogleLogin = () => {
    setSocialLoading("google");
    setError("");
    signInWithGoogle(); // redirect sang Supabase → Google
  };

  const handleFacebookLogin = () => {
    setSocialLoading("facebook");
    setError("");
    signInWithFacebook(); // redirect sang Supabase → Facebook
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

          {/* SOCIAL — Apple đã xóa */}
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
                setErrors((p) => ({ ...p, email: "" }));
                setError("");
              }}
            />
            {errors.email && (
              <p className={styles.fieldError}>{errors.email}</p>
            )}

            <label className={styles.label}>Password</label>
            <div className={styles.password}>
              <input
                type={showPassword ? "text" : "password"}
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
              <span onClick={() => navigate("/forgot-password")}>
                Forgot password?
              </span>
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
    </>
  );
};

export default Login;
