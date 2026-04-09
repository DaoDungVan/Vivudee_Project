import Footer from "../../components/common/Footer/Footer";
import styles  from "./Register.module.css";
import NavBar  from "../../components/common/NavBar/Navbar";

import { FcGoogle }                      from "react-icons/fc";
import { FaFacebook, FaEye, FaEyeSlash } from "react-icons/fa";

import { useState, useEffect }                    from "react";
import { useNavigate }                            from "react-router-dom";
import { useTranslation }                         from "react-i18next";
import { registerUser, verifyOTP, resendOTP }     from "../../services/authService";
import { signInWithGoogle, signInWithFacebook }   from "../../lib/supabase";

const Register = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName,            setFullName]            = useState("");
  const [email,               setEmail]               = useState("");
  const [phone,               setPhone]               = useState("");
  const [password,            setPassword]            = useState("");
  const [confirmPassword,     setConfirmPassword]     = useState("");

  const [showOTP,   setShowOTP]   = useState(false);
  const [otp,       setOtp]       = useState(["", "", "", "", "", ""]);
  const [userEmail, setUserEmail] = useState("");

  const [error,     setError]     = useState("");
  const [errors,    setErrors]    = useState({});
  const [success,   setSuccess]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(300);

  const [socialLoading, setSocialLoading] = useState("");

  const validate = () => {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    else if (fullName.trim().length < 2) newErrors.fullName = "Full name must be at least 2 characters";
    else if (/\d/.test(fullName)) newErrors.fullName = "Full name must not contain numbers";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = "Invalid email format";
    if (phone.trim() && !/^(0[3-9][0-9]{8}|\+84[3-9][0-9]{8})$/.test(phone.trim()))
      newErrors.phone = "Invalid phone number (e.g. 0901234567)";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8) newErrors.password = "Password must be at least 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) newErrors.password = "Password must include uppercase, lowercase and a number";
    if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (confirmPassword !== password) newErrors.confirmPassword = "Passwords do not match";
    return newErrors;
  };

  useEffect(() => {
    if (!showOTP || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [showOTP, countdown]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await registerUser({ full_name: fullName, email, phone, password, confirm_password: confirmPassword });
      setUserEmail(email);
      setOtp(["", "", "", "", "", ""]);
      setShowOTP(true);
      setCountdown(300);
      if (import.meta.env.DEV && res.data?.otp_test) console.log("OTP (dev):", res.data.otp_test);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => { setSocialLoading("google"); setError(""); signInWithGoogle(); };
  const handleFacebookLogin = () => { setSocialLoading("facebook"); setError(""); signInWithFacebook(); };

  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) document.getElementById(`otp-${index + 1}`).focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      document.getElementById(`otp-${index - 1}`).focus();
  };

  const handleVerifyOTP = async () => {
    const cleanOtp = otp.join("");
    setError("");
    if (!cleanOtp) { setError("Please enter OTP"); return; }
    setLoading(true);
    try {
      await verifyOTP({ email: userEmail, otp: cleanOtp });
      setSuccess("Verify success!");
      setTimeout(() => { setShowOTP(false); setOtp(["", "", "", "", "", ""]); navigate("/login"); }, 800);
    } catch {
      setError("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    try {
      await resendOTP({ email: userEmail });
      setCountdown(300); setSuccess("OTP resent successfully!"); setError("");
    } catch {
      setError("Resend failed");
    }
  };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <h2 className={styles.title}>{t("auth.registerTitle")}</h2>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t("auth.registerWelcome")}</h3>
          <p className={styles.cardDesc}>{t("auth.registerSubtitle")}</p>

          <div className={styles.social}>
            <button className={styles.socialBtn} onClick={handleGoogleLogin} disabled={!!socialLoading} type="button">
              {socialLoading === "google" ? <span className={styles.socialSpinner} /> : <FcGoogle />}
              <span>Google</span>
            </button>
            <button className={styles.socialBtn} onClick={handleFacebookLogin} disabled={!!socialLoading} type="button">
              {socialLoading === "facebook" ? <span className={styles.socialSpinner} /> : <FaFacebook className={styles.fbIcon} />}
              <span>Facebook</span>
            </button>
          </div>

          <div className={styles.divider}><span>{t("auth.orSignUpWith")}</span></div>

          <form className={styles.form}>
            {error && <p className={styles.error}>{error}</p>}

            <label className={styles.label}>{t("auth.fullName")}</label>
            <input
              type="text"
              placeholder={t("auth.fullName")}
              className={`${styles.input} ${errors.fullName ? styles.inputError : ""}`}
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: "" })); }}
            />
            {errors.fullName && <p className={styles.fieldError}>{errors.fullName}</p>}

            <label className={styles.label}>{t("auth.email")}</label>
            <input
              type="text"
              placeholder={t("auth.email")}
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
            />
            {errors.email && <p className={styles.fieldError}>{errors.email}</p>}

            <label className={styles.label}>
              {t("auth.phone")} <span style={{ color: "#aaa", fontWeight: 400 }}>({t("auth.phonePlaceholder")})</span>
            </label>
            <input
              type="text"
              placeholder={t("auth.phone")}
              className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: "" })); }}
            />
            {errors.phone && <p className={styles.fieldError}>{errors.phone}</p>}

            <label className={styles.label}>{t("auth.password")}</label>
            <div className={styles.password}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.password")}
                className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
              />
              <span className={styles.eye} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errors.password && <p className={styles.fieldError}>{errors.password}</p>}

            <label className={styles.label}>{t("auth.confirmPassword")}</label>
            <div className={styles.password}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t("auth.confirmPassword")}
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: "" })); }}
              />
              <span className={styles.eye} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errors.confirmPassword && <p className={styles.fieldError}>{errors.confirmPassword}</p>}

            <button type="button" className={styles.loginBtn} onClick={handleRegister} disabled={loading}>
              {loading ? t("auth.sending") : t("auth.signUp")}
            </button>

            <p className={styles.registerText}>
              {t("auth.hasAccount")}{" "}
              <span className={styles.registerLink} onClick={() => navigate("/login")}>
                {t("auth.signIn")}
              </span>
            </p>
          </form>
        </div>
      </div>

      {showOTP && (
        <div className={styles.otpOverlay}>
          <div className={styles.otpBox}>
            <h3>{t("auth.verifyOtp")}</h3>
            <p>Enter the code sent to your email</p>
            {error   && <p className={styles.error}>{error}</p>}
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
            <button onClick={handleVerifyOTP} className={styles.loginBtn} disabled={otp.some((d) => d === "") || loading}>
              {loading ? t("auth.verifying") : t("auth.verify")}
            </button>
            <p
              className={`${styles.resend} ${countdown > 0 ? styles.disabled : ""}`}
              onClick={handleResendOTP}
            >
              {t("auth.resendOtp")} {countdown > 0 && `(${formatTime(countdown)})`}
            </p>
            <button className={styles.cancelBtn} onClick={() => setShowOTP(false)}>{t("auth.cancel")}</button>
          </div>
        </div>
      )}
    </>
  );
};

export default Register;
