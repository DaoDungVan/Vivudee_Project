import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { resetPassword } from "../../services/authService";
import styles from "./ResetPassword.module.css";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // email + otp được truyền qua navigation state từ màn forgot password
  const { email, otp } = location.state || {};

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Nếu không có email/otp (truy cập trực tiếp), redirect về login
  if (!email || !otp) {
    return (
      <>
        <NavBar />
        <div className={styles.wrapper}>
          <div className={styles.card}>
            <p className={styles.errorMsg}>
              Invalid or expired reset link. Please start over.
            </p>
            <button className={styles.submitBtn} onClick={() => navigate("/login")}>
              Back to Login
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
      await resetPassword({
        email,
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setServerError(
        err.response?.data?.error || err.response?.data?.message || "Reset failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Reset Password</h2>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Create new password</h3>
          <p className={styles.cardDesc}>
            Enter a new password for <strong>{email}</strong>
          </p>

          {success ? (
            <div className={styles.successBox}>
              <p>Password reset successfully!</p>
              <p className={styles.redirectNote}>Redirecting to login...</p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              {serverError && <p className={styles.error}>{serverError}</p>}

              <label className={styles.label}>New Password</label>
              <div className={styles.passwordWrap}>
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="Enter new password"
                  className={`${styles.input} ${errors.newPassword ? styles.inputError : ""}`}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrors((p) => ({ ...p, newPassword: "" }));
                  }}
                />
                <span className={styles.eye} onClick={() => setShowNew(!showNew)}>
                  {showNew ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              {errors.newPassword && <p className={styles.fieldError}>{errors.newPassword}</p>}

              <label className={styles.label}>Confirm Password</label>
              <div className={styles.passwordWrap}>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((p) => ({ ...p, confirmPassword: "" }));
                  }}
                />
                <span className={styles.eye} onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              {errors.confirmPassword && <p className={styles.fieldError}>{errors.confirmPassword}</p>}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                className={styles.backBtn}
                onClick={() => navigate("/login")}
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
