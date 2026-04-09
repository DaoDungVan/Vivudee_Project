// src/pages/coupons/Coupons.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { useTranslation } from "react-i18next";
import {
  getAvailableCoupons,
  getCouponErrorMessage,
  validateCoupon,
} from "../../services/couponService";
import styles from "./Coupons.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n);

const Coupons = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [coupons, setCoupons]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [checkCode, setCheckCode]     = useState("");
  const [checking, setChecking]       = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checkError, setCheckError]   = useState("");
  const [apiError, setApiError]       = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const list = await getAvailableCoupons();
      setCoupons(list);
      setApiError("");
    } catch (err) {
      setCoupons([]);
      setApiError(getCouponErrorMessage(err, "Unable to load coupons right now."));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckCoupon = async () => {
    if (!checkCode.trim()) { setCheckError(t("coupons.errEnterCode")); return; }
    setChecking(true); setCheckResult(null); setCheckError("");
    try {
      const coupon = await validateCoupon(checkCode);
      setCheckResult(coupon);
    } catch (err) {
      setCheckError(getCouponErrorMessage(err, "Invalid or expired coupon code"));
    } finally {
      setChecking(false);
    }
  };

  const copyCode = (code) => { navigator.clipboard.writeText(code).catch(() => {}); };

  const discountDisplay = (c) => {
    if (c.discount_type === "percent" || c.discount_percent) return `-${c.discount_percent || c.discount_value}%`;
    return `-${fmt(c.discount_amount || c.discount_value)} VND`;
  };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("coupons.title")}</h1>
          <p className={styles.subtitle}>{t("coupons.subtitle")}</p>
          {apiError && <p className={styles.apiError}>{apiError}</p>}
        </div>

        <div className={styles.checkCard}>
          <h3 className={styles.checkTitle}>{t("coupons.checkTitle")}</h3>
          <div className={styles.checkRow}>
            <input
              className={`${styles.checkInput} ${checkError ? styles.checkInputErr : ""}`}
              type="text"
              placeholder={t("coupons.checkPlaceholder")}
              value={checkCode}
              onChange={(e) => { setCheckCode(e.target.value.toUpperCase()); setCheckError(""); setCheckResult(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleCheckCoupon()}
            />
            <button className={styles.checkBtn} onClick={handleCheckCoupon} disabled={checking}>
              {checking ? t("coupons.checking") : t("coupons.checkBtn")}
            </button>
          </div>
          {checkError && <p className={styles.checkError}>{checkError}</p>}
          {checkResult && (
            <div className={styles.checkSuccess}>
              <div className={styles.checkSuccessTag}>{t("coupons.valid")}</div>
              <div className={styles.checkSuccessInfo}>
                <p><strong>{t("coupons.codeLabel")}</strong> {checkResult.code || checkCode}</p>
                {checkResult.discount_percent && <p><strong>{t("coupons.discountLabel")}</strong> {checkResult.discount_percent}%</p>}
                {checkResult.discount_amount  && <p><strong>{t("coupons.discountLabel")}</strong> {fmt(checkResult.discount_amount)} VND</p>}
                {checkResult.min_order_amount && <p><strong>{t("coupons.minOrderLabel")}</strong> {fmt(checkResult.min_order_amount)} VND</p>}
                {checkResult.expires_at && <p><strong>{t("coupons.expiresLabel")}</strong> {new Date(checkResult.expires_at).toLocaleDateString("en-GB")}</p>}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className={styles.loading}>{t("coupons.loading")}</div>
        ) : coupons.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🎫</div>
            <p className={styles.emptyTitle}>{t("coupons.empty")}</p>
            <p className={styles.emptyMsg}>{t("coupons.emptyMsg")}</p>
          </div>
        ) : (
          <div className={styles.couponGrid}>
            {coupons.map((c, i) => (
              <div key={c.id || c.code || i} className={`${styles.couponCard} ${c.is_used ? styles.used : ""}`}>
                <div className={styles.couponLeft}>
                  <p className={styles.couponDiscount}>{discountDisplay(c)}</p>
                  <p className={styles.couponName}>{c.name || c.description || "Promotion"}</p>
                  {c.min_order_amount > 0 && <p className={styles.couponMin}>{t("coupons.minOrder", { amount: fmt(c.min_order_amount) })}</p>}
                  {c.expires_at && <p className={styles.couponExpiry}>{t("coupons.expiry", { date: new Date(c.expires_at).toLocaleDateString("en-GB") })}</p>}
                </div>
                <div className={styles.couponRight}>
                  <div className={styles.couponCodeBox}>
                    <span className={styles.couponCode}>{c.code}</span>
                    <button className={styles.copyBtn} onClick={() => copyCode(c.code)} title={t("coupons.copy")}>📋</button>
                  </div>
                  {c.is_used ? (
                    <span className={styles.usedBadge}>{t("coupons.used")}</span>
                  ) : (
                    <button className={styles.useBtn} onClick={() => navigate("/flights")}>{t("coupons.use")}</button>
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
