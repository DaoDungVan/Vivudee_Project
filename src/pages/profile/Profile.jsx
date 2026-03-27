// src/pages/profile/Profile.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import API from "../../services/axiosInstance";
import styles from "./Profile.module.css";

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
  });
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState("");
  const [error, setError]       = useState("");
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/login");
  }, [navigate]);

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || "User")}&background=1a6bc4&color=fff&size=128`;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await API.put("/auth/profile", form);
      const updated = { ...user, ...form };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      window.dispatchEvent(new Event("storage"));
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err?.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
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
                  <button className={styles.changeBtn}>Change Password</button>
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
    </>
  );
};

export default Profile;
