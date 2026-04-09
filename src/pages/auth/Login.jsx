import NavBar from "../../components/common/NavBar/Navbar";
import styles from "./Login.module.css";

import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaEye, FaEyeSlash } from "react-icons/fa";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { loginUser, forgotPassword } from "../../services/authService";
import { signInWithGoogle, signInWithFacebook } from "../../lib/supabase";

const Login = () => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const navigate = useNavigate();

  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [forgotOtp, setForgotOtp] = useState(["", "", "", "", "", ""]);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotCountdown, setForgotCountdown] = useState(0);

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (!showForgot || forgotStep !== 2 || forgotCountdown <= 0) return;
    const timer = setInterval(() => setForgotCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [showForgot, forgotStep, forgotCountdown]);

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
      const res = await loginUser({ email: email.trim(), password: password.trim() });
      const token = res.data?.token;
      if (!token) { setError("No token received"); return; }
      localStorage.setItem("token", token);
      if (res.data?.user) localStorage.setItem("user", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("storage"));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => { setSocialLoading("google"); setError(""); signInWithGoogle(); };
  const handleFacebookLogin = () => { setSocialLoading("facebook"); setError(""); signInWithFacebook(); };

  const openForgotModal = () => {
    setShowForgot(true); setForgotStep(1); setForgotEmail(""); setForgotEmailError("");
    setForgotOtp(["", "", "", "", "", ""]); setForgotError(""); setForgotSuccess(""); setForgotCountdown(0);
  };
  const closeForgotModal = () => setShowForgot(false);

  const handleSendForgotOTP = async () => {
    setForgotEmailError(""); setForgotError("");
    if (!forgotEmail.trim()) { setForgotEmailError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) { setForgotEmailError("Invalid email format"); return; }
    setForgotLoading(true);
    try {
      await forgotPassword({ email: forgotEmail.trim() });
      setForgotStep(2); setForgotOtp(["", "", "", "", "", ""]); setForgotCountdown(300); setForgotSuccess("");
    } catch (err) {
      setForgotError(err.response?.data?.error || err.response?.data?.message || "Failed to send OTP");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...forgotOtp];
    newOtp[index] = value;
    setForgotOtp(newOtp);
    if (value && index < 5) document.getElementById(`forgot-otp-${index + 1}`).focus();
  };

  const handleForgotKeyDown = (e, index) => {
    if (e.key === "Backspace" && !forgotOtp[index] && index > 0)
      document.getElementById(`forgot-otp-${index - 1}`).focus();
  };

  const handleForgotVerifyOTP = () => {
    setForgotError("");
    const otpCode = forgotOtp.join("");
    if (otpCode.length < 6) { setForgotError(t("auth.cpError6digit") || "Please enter the complete 6-digit OTP"); return; }
    setShowForgot(false);
    navigate("/reset-password", { state: { email: forgotEmail.trim(), otp: otpCode } });
  };

  const handleResendForgotOTP = async () => {
    if (forgotCountdown > 0) return;
    setForgotError(""); setForgotLoading(true);
    try {
      await forgotPassword({ email: forgotEmail.trim() });
      setForgotCountdown(300); setForgotOtp(["", "", "", "", "", ""]); setForgotSuccess("OTP resent successfully!");
    } catch (err) {
      setForgotError(err.response?.data?.error || err.response?.data?.message || "Resend failed");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <h2 className={styles.title}>{t("auth.loginTitle")}</h2>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t("auth.loginWelcome")}</h3>
          <p className={styles.cardDesc}>{t("auth.loginSubtitle")}</p>

          <div className={styles.social}>
            <button className={styles.socialBtn} onClick={handleGoogleLogin} disabled={!!socialLoading}>
              {socialLoading === "google" ? <span className={styles.socialSpinner} /> : <FcGoogle />}
              <span>Google</span>
            </button>
            <button className={styles.socialBtn} onClick={handleFacebookLogin} disabled={!!socialLoading}>
              {socialLoading === "facebook" ? <span className={styles.socialSpinner} /> : <FaFacebook className={styles.fbIcon} />}
              <span>Facebook</span>
            </button>
          </div>

          <div className={styles.divider}><span>{t("auth.orSignInWith")}</span></div>

          <form className={styles.form} onSubmit={handleLogin}>
            {error && <p className={styles.error}>{error}</p>}

            <label className={styles.label}>{t("auth.email")}</label>
            <input
              type="text"
              placeholder={t("auth.email")}
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); setError(""); }}
            />
            {errors.email && <p className={styles.fieldError}>{errors.email}</p>}

            <label className={styles.label}>{t("auth.password")}</label>
            <div className={styles.password}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.password")}
                className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); setError(""); }}
              />
              <span className={styles.eye} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errors.password && <p className={styles.fieldError}>{errors.password}</p>}

            <div className={styles.forgot}>
              <span onClick={openForgotModal}>{t("auth.forgotPassword")}</span>
            </div>

            <button type="submit" className={styles.loginBtn} disabled={loading}>
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </button>

            <p className={styles.registerText}>
              {t("auth.noAccount")}{" "}
              <span className={styles.registerLink} onClick={() => navigate("/register")}>
                {t("auth.signUp")}
              </span>
            </p>
          </form>
        </div>
      </div>

      {showForgot && (
        <div className={styles.otpOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeForgotModal(); }}>
          <div className={styles.otpBox}>
            {forgotStep === 1 && (
              <>
                <h3 className={styles.modalTitle}>{t("auth.forgotPasswordTitle")}</h3>
                <p className={styles.modalDesc}>
                  Enter your email address and we'll send you an OTP to reset your password.
                </p>
                {forgotError && <p className={styles.error}>{forgotError}</p>}
                <input
                  type="text"
                  placeholder={t("auth.email")}
                  className={`${styles.modalInput} ${forgotEmailError ? styles.inputError : ""}`}
                  value={forgotEmail}
                  onChange={(e) => { setForgotEmail(e.target.value); setForgotEmailError(""); setForgotError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendForgotOTP(); }}
                />
                {forgotEmailError && <p className={styles.fieldError}>{forgotEmailError}</p>}
                <button className={styles.loginBtn} onClick={handleSendForgotOTP} disabled={forgotLoading}>
                  {forgotLoading ? t("auth.sending") : t("auth.sendOtp")}
                </button>
                <button className={styles.cancelBtn} onClick={closeForgotModal}>{t("auth.cancel")}</button>
              </>
            )}

            {forgotStep === 2 && (
              <>
                <h3 className={styles.modalTitle}>{t("auth.enterOtp")}</h3>
                <p className={styles.modalDesc}>
                  We sent a 6-digit code to <strong>{forgotEmail}</strong>
                </p>
                {forgotError && <p className={styles.error}>{forgotError}</p>}
                {forgotSuccess && <p className={styles.successText}>{forgotSuccess}</p>}
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
                <button className={styles.loginBtn} onClick={handleForgotVerifyOTP} disabled={forgotOtp.some((d) => d === "")}>
                  {t("auth.verifyOtp")}
                </button>
                <p
                  className={`${styles.resendText} ${forgotCountdown > 0 ? styles.resendDisabled : ""}`}
                  onClick={handleResendForgotOTP}
                >
                  {forgotLoading ? t("auth.sending") : forgotCountdown > 0 ? `${t("auth.resendOtp")} (${formatTime(forgotCountdown)})` : t("auth.resendOtp")}
                </p>
                <button className={styles.cancelBtn} onClick={() => setForgotStep(1)}>{t("auth.back")}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
