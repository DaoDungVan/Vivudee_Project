import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { resetPassword } from "../../services/authService";
import styles from "./ResetPassword.module.css";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const { email, otp } = location.state || {};

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!email || !otp) {
    return (
      <>
        <NavBar />
        <div className={styles.wrapper}>
          <div className={styles.card}>
            <p className={styles.errorMsg}>{t("auth.invalidResetLink")}</p>
            <button className={styles.submitBtn} onClick={() => navigate("/login")}>
              {t("auth.backToLogin")}
            </button>
          </div>
        </div>
      </>
    );
  }

  const validate = () => {
    const errs = {};
    if (!newPassword) errs.newPassword = "Password is required";
    else if (newPassword.length < 8) errs.newPassword = "Password must be at least 8 characters";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (confirmPassword !== newPassword) errs.confirmPassword = "Passwords do not match";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await resetPassword({ email, otp, new_password: newPassword, confirm_password: confirmPassword });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setServerError(err.response?.data?.error || err.response?.data?.message || "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <h2 className={styles.title}>{t("auth.resetPassword")}</h2>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t("auth.createNewPassword")}</h3>
          <p className={styles.cardDesc}>
            {t("auth.resetDesc", { email })}
          </p>

          {success ? (
            <div className={styles.successBox}>
              <p>{t("auth.resetSuccess")}</p>
              <p className={styles.redirectNote}>{t("auth.resetRedirecting")}</p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              {serverError && <p className={styles.error}>{serverError}</p>}

              <label className={styles.label}>{t("auth.newPassword")}</label>
              <div className={styles.passwordWrap}>
                <input
                  type={showNew ? "text" : "password"}
                  placeholder={t("auth.newPassword")}
                  className={`${styles.input} ${errors.newPassword ? styles.inputError : ""}`}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setErrors((p) => ({ ...p, newPassword: "" })); }}
                />
                <span className={styles.eye} onClick={() => setShowNew(!showNew)}>
                  {showNew ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              {errors.newPassword && <p className={styles.fieldError}>{errors.newPassword}</p>}

              <label className={styles.label}>{t("auth.confirmNewPassword")}</label>
              <div className={styles.passwordWrap}>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder={t("auth.confirmNewPassword")}
                  className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: "" })); }}
                />
                <span className={styles.eye} onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              {errors.confirmPassword && <p className={styles.fieldError}>{errors.confirmPassword}</p>}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? t("auth.resetting") : t("auth.resetPassword")}
              </button>

              <button type="button" className={styles.backBtn} onClick={() => navigate("/login")}>
                {t("auth.backToLogin")}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
