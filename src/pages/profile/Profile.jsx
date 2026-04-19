// src/pages/profile/Profile.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import API from "../../services/axiosInstance";
import { forgotPassword, resetPassword } from "../../services/authService";
import styles from "./Profile.module.css";

const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;
const MAX_AVATAR_DIMENSION = 512;
const MAX_AVATAR_DATA_URL_LENGTH = 700000;

const getAvatarFallbackUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=1a6bc4&color=fff&size=128`;

const normalizeDateInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read avatar image."));
    };

    image.src = objectUrl;
  });

const resizeAvatarFile = async (file) => {
  const image = await loadImageFromFile(file);
  const longestSide = Math.max(image.width, image.height) || 1;
  const scale = Math.min(1, MAX_AVATAR_DIMENSION / longestSide);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Your browser does not support image upload.");
  }

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.88;
  let output = canvas.toDataURL("image/jpeg", quality);

  while (output.length > MAX_AVATAR_DATA_URL_LENGTH && quality > 0.5) {
    quality -= 0.08;
    output = canvas.toDataURL("image/jpeg", quality);
  }

  if (output.length > MAX_AVATAR_DATA_URL_LENGTH) {
    throw new Error("Avatar image is still too large after optimization. Please choose a smaller image.");
  }

  return output;
};

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });
  const [form, setForm] = useState({
    full_name:     user?.full_name || "",
    phone:         user?.phone || "",
    date_of_birth: user?.date_of_birth || "",
    gender:        user?.gender || "",
    address:       user?.address || "",
    avatar_url:    user?.avatar_url || "",
  });
  const [loading, setLoading]   = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [success, setSuccess]   = useState("");
  const [error, setError]       = useState("");
  const [activeTab, setActiveTab] = useState("info");

  // ── Change Password Modal ──
  const [showChangePw, setShowChangePw] = useState(false);
  const [cpStep, setCpStep] = useState(1); // 1: send OTP, 2: enter OTP, 3: new password
  const [cpOtp, setCpOtp] = useState(["", "", "", "", "", ""]);
  const [cpOtpCode, setCpOtpCode] = useState(""); // giá trị OTP đã nhập (6 ký tự)
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpShowConfirm, setCpShowConfirm] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState("");
  const [cpCountdown, setCpCountdown] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;

    let active = true;

    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const res = await API.get("/auth/me");
        const freshUser = res.data?.user || res.data?.data || res.data;

        if (!active || !freshUser) return;

        const normalizedUser = {
          ...freshUser,
          date_of_birth: normalizeDateInput(freshUser.date_of_birth),
        };

        setUser(normalizedUser);
        setForm({
          full_name: normalizedUser.full_name || "",
          phone: normalizedUser.phone || "",
          date_of_birth: normalizedUser.date_of_birth || "",
          gender: normalizedUser.gender || "",
          address: normalizedUser.address || "",
          avatar_url: normalizedUser.avatar_url || "",
        });
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        window.dispatchEvent(new Event("storage"));
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || err?.response?.data?.error || "Unable to load profile");
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!showChangePw || cpStep !== 2 || cpCountdown <= 0) return;
    const timer = setInterval(() => setCpCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [showChangePw, cpStep, cpCountdown]);

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const avatarUrl = form.avatar_url || user?.avatar_url || getAvatarFallbackUrl(form.full_name || user?.email || "User");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setError("Avatar image must be smaller than 5MB.");
      event.target.value = "";
      return;
    }

    setAvatarUploading(true);

    try {
      const optimizedAvatar = await resizeAvatarFile(file);
      setForm((prev) => ({ ...prev, avatar_url: optimizedAvatar }));
      setSuccess("Avatar image is ready. Click Save Changes to update your profile.");
    } catch (uploadError) {
      setError(uploadError?.message || "Unable to read avatar image.");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setForm((prev) => ({ ...prev, avatar_url: "" }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ...form,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        avatar_url: form.avatar_url.trim(),
      };

      const res = await API.put("/auth/profile", payload);
      const updated = {
        ...user,
        ...(res.data?.user || payload),
        date_of_birth: normalizeDateInput(res.data?.user?.date_of_birth || payload.date_of_birth),
      };

      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      setForm({
        full_name: updated.full_name || "",
        phone: updated.phone || "",
        date_of_birth: updated.date_of_birth || "",
        gender: updated.gender || "",
        address: updated.address || "",
        avatar_url: updated.avatar_url || "",
      });
      window.dispatchEvent(new Event("storage"));
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Change Password handlers ──
  const openChangePw = () => {
    setShowChangePw(true);
    setCpStep(1);
    setCpOtp(["", "", "", "", "", ""]);
    setCpOtpCode("");
    setCpNewPassword("");
    setCpConfirmPassword("");
    setCpError("");
    setCpSuccess("");
    setCpCountdown(0);
  };

  const closeChangePw = () => setShowChangePw(false);

  const handleSendCpOTP = async () => {
    setCpError("");
    setCpLoading(true);
    try {
      await forgotPassword({ email: user.email });
      setCpStep(2);
      setCpOtp(["", "", "", "", "", ""]);
      setCpCountdown(300);
    } catch (err) {
      setCpError(
        err.response?.data?.error || err.response?.data?.message || "Failed to send OTP"
      );
    } finally {
      setCpLoading(false);
    }
  };

  const handleCpOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...cpOtp];
    newOtp[index] = value;
    setCpOtp(newOtp);
    if (value && index < 5) document.getElementById(`cp-otp-${index + 1}`).focus();
  };

  const handleCpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !cpOtp[index] && index > 0)
      document.getElementById(`cp-otp-${index - 1}`).focus();
  };

  const handleCpVerifyOTP = () => {
    setCpError("");
    const code = cpOtp.join("");
    if (code.length < 6) {
      setCpError("Please enter the complete 6-digit OTP");
      return;
    }
    setCpOtpCode(code);
    setCpStep(3);
    setCpNewPassword("");
    setCpConfirmPassword("");
  };

  const handleResendCpOTP = async () => {
    if (cpCountdown > 0) return;
    setCpError("");
    setCpLoading(true);
    try {
      await forgotPassword({ email: user.email });
      setCpCountdown(300);
      setCpOtp(["", "", "", "", "", ""]);
    } catch (err) {
      setCpError(
        err.response?.data?.error || err.response?.data?.message || "Resend failed"
      );
    } finally {
      setCpLoading(false);
    }
  };

  const handleCpReset = async () => {
    setCpError("");
    if (!cpNewPassword) { setCpError("Password is required"); return; }
    if (cpNewPassword.length < 8) { setCpError("Password must be at least 8 characters"); return; }
    if (cpNewPassword !== cpConfirmPassword) { setCpError("Passwords do not match"); return; }
    setCpLoading(true);
    try {
      await resetPassword({
        email: user.email,
        otp: cpOtpCode,
        new_password: cpNewPassword,
        confirm_password: cpConfirmPassword,
      });
      setCpSuccess("Password changed successfully! Please log in again.");
      // Đăng xuất sau 2 giây
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("storage"));
        navigate("/login");
      }, 2000);
    } catch (err) {
      setCpError(
        err.response?.data?.error || err.response?.data?.message || "Reset failed. Please try again."
      );
    } finally {
      setCpLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.layout}>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            <div className={styles.avatarSection}>
              <img src={avatarUrl} alt="avatar" className={styles.avatar} />
              <p className={styles.sidebarName}>{user?.full_name || "User"}</p>
              <p className={styles.sidebarEmail}>{user?.email}</p>
            </div>
            <nav className={styles.sideNav}>
              {[
                { id: "info",     label: "Personal Info", icon: "👤" },
                { id: "security", label: "Security",      icon: "🔒" },
              ].map((item) => (
                <button
                  key={item.id}
                  className={`${styles.sideNavBtn} ${activeTab === item.id ? styles.sideNavActive : ""}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}
              <hr className={styles.sideNavDivider} />
              <button className={styles.sideNavBtn} onClick={() => navigate("/my-booking")}>
                <span>✈️</span> My Bookings
              </button>
              <button className={styles.sideNavBtn} onClick={() => navigate("/transactions")}>
                <span>💳</span> Transactions
              </button>
              <button className={styles.sideNavBtn} onClick={() => navigate("/coupons")}>
                <span>🎟</span> Coupons
              </button>
            </nav>
          </div>

          {/* Main */}
          <div className={styles.main}>
            {activeTab === "info" && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Personal Information</h2>
                <p className={styles.cardSubtitle}>Update your account details</p>

                {success && <div className={styles.successMsg}>{success}</div>}
                {error   && <div className={styles.errorMsg}>{error}</div>}

                {profileLoading ? (
                  <div className={styles.profileLoading}>Loading profile...</div>
                ) : (
                  <>
                <div className={styles.avatarEditor}>
                  <img src={avatarUrl} alt="avatar preview" className={styles.avatarPreview} />
                  <div className={styles.avatarActions}>
                    <p className={styles.avatarTitle}>Profile photo</p>
                    <p className={styles.avatarHint}>
                      Upload JPG/PNG/WebP from your device. The image will be optimized automatically before saving.
                    </p>
                    <div className={styles.avatarButtonRow}>
                      <label className={`${styles.avatarUploadBtn} ${avatarUploading ? styles.avatarUploadBtnDisabled : ""}`}>
                        {avatarUploading ? "Processing..." : "Upload Image"}
                        <input type="file" accept="image/*" onChange={handleAvatarFileChange} />
                      </label>
                      <button type="button" className={styles.avatarRemoveBtn} onClick={handleRemoveAvatar}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth} ${styles.avatarUrlGroup}`}>
                  <label>Avatar URL</label>
                  <input
                    name="avatar_url"
                    value={form.avatar_url}
                    onChange={handleChange}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Full Name</label>
                    <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="John Doe" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email</label>
                    <input value={user?.email || ""} disabled className={styles.disabled} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Phone Number</label>
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="0901234567" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Date of Birth</label>
                    <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Gender</label>
                    <select name="gender" value={form.gender} onChange={handleChange}>
                      <option value="">-- Select --</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label>Address</label>
                    <input name="address" value={form.address} onChange={handleChange} placeholder="123 Main St, City" />
                  </div>
                </div>

                <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                  </>
                )}
              </div>
            )}

            {activeTab === "security" && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Account Security</h2>
                <p className={styles.cardSubtitle}>Manage your password and security settings</p>
                <div className={styles.securityItem}>
                  <div>
                    <p className={styles.securityLabel}>Password</p>
                    <p className={styles.securitySub}>••••••••</p>
                  </div>
                  <button className={styles.changeBtn} onClick={openChangePw}>
                    Change Password
                  </button>
                </div>
                <div className={styles.securityItem}>
                  <div>
                    <p className={styles.securityLabel}>Verified Email</p>
                    <p className={styles.securitySub}>{user?.email}</p>
                  </div>
                  <span className={styles.verifiedBadge}>✓ Verified</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* CHANGE PASSWORD MODAL */}
      {showChangePw && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) closeChangePw(); }}
        >
          <div className={styles.modalBox}>

            {/* Step 1: Gửi OTP */}
            {cpStep === 1 && (
              <>
                <h3 className={styles.modalTitle}>Change Password</h3>
                <p className={styles.modalDesc}>
                  We'll send a verification code to <strong>{user?.email}</strong> to confirm it's you.
                </p>
                {cpError && <p className={styles.modalError}>{cpError}</p>}
                <button
                  className={styles.modalPrimaryBtn}
                  onClick={handleSendCpOTP}
                  disabled={cpLoading}
                >
                  {cpLoading ? "Sending..." : "Send OTP to Email"}
                </button>
                <button className={styles.modalCancelBtn} onClick={closeChangePw}>
                  Cancel
                </button>
              </>
            )}

            {/* Step 2: Nhập OTP */}
            {cpStep === 2 && (
              <>
                <h3 className={styles.modalTitle}>Enter OTP</h3>
                <p className={styles.modalDesc}>
                  Code sent to <strong>{user?.email}</strong>
                </p>
                {cpError && <p className={styles.modalError}>{cpError}</p>}
                <div className={styles.otpInputs}>
                  {cpOtp.map((digit, index) => (
                    <input
                      key={index}
                      id={`cp-otp-${index}`}
                      type="text"
                      maxLength="1"
                      className={styles.otpInput}
                      value={digit}
                      onChange={(e) => handleCpOtpChange(e.target.value, index)}
                      onKeyDown={(e) => handleCpKeyDown(e, index)}
                    />
                  ))}
                </div>
                <button
                  className={styles.modalPrimaryBtn}
                  onClick={handleCpVerifyOTP}
                  disabled={cpOtp.some((d) => d === "")}
                >
                  Verify OTP
                </button>
                <p
                  className={`${styles.resendText} ${cpCountdown > 0 ? styles.resendDisabled : ""}`}
                  onClick={handleResendCpOTP}
                >
                  {cpLoading
                    ? "Resending..."
                    : cpCountdown > 0
                    ? `Resend OTP (${formatTime(cpCountdown)})`
                    : "Resend OTP"}
                </p>
                <button className={styles.modalCancelBtn} onClick={closeChangePw}>
                  Cancel
                </button>
              </>
            )}

            {/* Step 3: Nhập mật khẩu mới */}
            {cpStep === 3 && (
              <>
                <h3 className={styles.modalTitle}>New Password</h3>
                <p className={styles.modalDesc}>Enter your new password below.</p>

                {cpError && <p className={styles.modalError}>{cpError}</p>}
                {cpSuccess && <p className={styles.modalSuccess}>{cpSuccess}</p>}

                {!cpSuccess && (
                  <>
                    <label className={styles.modalLabel}>New Password</label>
                    <div className={styles.modalPasswordWrap}>
                      <input
                        type={cpShowNew ? "text" : "password"}
                        placeholder="Enter new password"
                        className={styles.modalInput}
                        value={cpNewPassword}
                        onChange={(e) => { setCpNewPassword(e.target.value); setCpError(""); }}
                      />
                      <span className={styles.modalEye} onClick={() => setCpShowNew(!cpShowNew)}>
                        {cpShowNew ? <FaEyeSlash /> : <FaEye />}
                      </span>
                    </div>

                    <label className={styles.modalLabel}>Confirm Password</label>
                    <div className={styles.modalPasswordWrap}>
                      <input
                        type={cpShowConfirm ? "text" : "password"}
                        placeholder="Confirm new password"
                        className={styles.modalInput}
                        value={cpConfirmPassword}
                        onChange={(e) => { setCpConfirmPassword(e.target.value); setCpError(""); }}
                      />
                      <span className={styles.modalEye} onClick={() => setCpShowConfirm(!cpShowConfirm)}>
                        {cpShowConfirm ? <FaEyeSlash /> : <FaEye />}
                      </span>
                    </div>

                    <button
                      className={styles.modalPrimaryBtn}
                      onClick={handleCpReset}
                      disabled={cpLoading}
                    >
                      {cpLoading ? "Saving..." : "Reset Password"}
                    </button>
                    <button className={styles.modalCancelBtn} onClick={closeChangePw}>
                      Cancel
                    </button>
                  </>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
