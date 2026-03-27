// src/pages/coupons/Coupons.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import API from "../../services/axiosInstance";
import styles from "./Coupons.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n);

const Coupons = () => {
  const navigate = useNavigate();
  const [coupons, setCoupons]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [checkCode, setCheckCode]     = useState("");
  const [checking, setChecking]       = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checkError, setCheckError]   = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await API.get("/coupons/available");
      setCoupons(res.data?.coupons || res.data?.data || []);
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckCoupon = async () => {
    if (!checkCode.trim()) {
      setCheckError("Please enter a coupon code");
      return;
    }
    setChecking(true);
    setCheckResult(null);
    setCheckError("");
    try {
      const res = await API.post("/coupons/validate", { code: checkCode.trim().toUpperCase() });
      setCheckResult(res.data?.coupon || res.data);
    } catch (err) {
      setCheckError(err?.response?.data?.message || "Invalid or expired coupon code");
    } finally {
      setChecking(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
  };

  const discountDisplay = (c) => {
    if (c.discount_type === "percent" || c.discount_percent) {
      return `-${c.discount_percent || c.discount_value}%`;
    }
    return `-${fmt(c.discount_amount || c.discount_value)} ₫`;
  };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>🎟 My Coupons</h1>
          <p className={styles.subtitle}>Promo codes available for your account</p>
        </div>

        {/* Check coupon box */}
        <div className={styles.checkCard}>
          <h3 className={styles.checkTitle}>Check a Coupon Code</h3>
          <div className={styles.checkRow}>
            <input
              className={`${styles.checkInput} ${checkError ? styles.checkInputErr : ""}`}
              type="text"
              placeholder="Enter coupon code..."
              value={checkCode}
              onChange={(e) => { setCheckCode(e.target.value.toUpperCase()); setCheckError(""); setCheckResult(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleCheckCoupon()}
            />
            <button className={styles.checkBtn} onClick={handleCheckCoupon} disabled={checking}>
              {checking ? "Checking..." : "Check"}
            </button>
          </div>
          {checkError && <p className={styles.checkError}>{checkError}</p>}
          {checkResult && (
            <div className={styles.checkSuccess}>
              <div className={styles.checkSuccessTag}>✓ Valid</div>
              <div className={styles.checkSuccessInfo}>
                <p><strong>Code:</strong> {checkResult.code || checkCode}</p>
                {checkResult.discount_percent && <p><strong>Discount:</strong> {checkResult.discount_percent}%</p>}
                {checkResult.discount_amount  && <p><strong>Discount:</strong> {fmt(checkResult.discount_amount)} ₫</p>}
                {checkResult.min_order_amount && <p><strong>Min. order:</strong> {fmt(checkResult.min_order_amount)} ₫</p>}
                {checkResult.expires_at && (
                  <p><strong>Expires:</strong> {new Date(checkResult.expires_at).toLocaleDateString("en-GB")}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Coupon list */}
        {loading ? (
          <div className={styles.loading}>Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🎫</div>
            <p className={styles.emptyTitle}>No coupons yet</p>
            <p className={styles.emptyMsg}>
              Available coupons will appear here. You can also check a code directly using the search box above.
            </p>
          </div>
        ) : (
          <div className={styles.couponGrid}>
            {coupons.map((c, i) => (
              <div key={c.id || c.code || i} className={`${styles.couponCard} ${c.is_used ? styles.used : ""}`}>
                <div className={styles.couponLeft}>
                  <p className={styles.couponDiscount}>{discountDisplay(c)}</p>
                  <p className={styles.couponName}>{c.name || c.description || "Promotion"}</p>
                  {c.min_order_amount > 0 && (
                    <p className={styles.couponMin}>Min. order: {fmt(c.min_order_amount)} ₫</p>
                  )}
                  {c.expires_at && (
                    <p className={styles.couponExpiry}>
                      Expires: {new Date(c.expires_at).toLocaleDateString("en-GB")}
                    </p>
                  )}
                </div>
                <div className={styles.couponRight}>
                  <div className={styles.couponCodeBox}>
                    <span className={styles.couponCode}>{c.code}</span>
                    <button className={styles.copyBtn} onClick={() => copyCode(c.code)} title="Copy">
                      📋
                    </button>
                  </div>
                  {c.is_used ? (
                    <span className={styles.usedBadge}>Used</span>
                  ) : (
                    <button className={styles.useBtn} onClick={() => navigate("/flights")}>
                      Use Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Coupons;
