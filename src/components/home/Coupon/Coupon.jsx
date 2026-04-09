import { useRef, useEffect, useState } from "react";
import { toast } from "react-toastify";
import styles from "./Coupon.module.css";
import planeIcon from "../../../assets/icons/plane.png";
import { getCouponErrorMessage, getHomeCoupons } from "../../../services/couponService";
import { useTranslation } from "react-i18next";

export default function Coupon() {
  const sliderRef = useRef(null);
  const [coupons, setCoupons] = useState([]);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    getHomeCoupons()
      .then((list) => setCoupons(list))
      .catch((err) => {
        setError(getCouponErrorMessage(err, "Unable to load coupons right now."));
        setCoupons([]);
      });
  }, []);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(t("couponHome.copied", { code }));
  };

  let isDown = false;
  let startX;
  let scrollLeft;

  const handleMouseDown = (e) => {
    isDown = true;
    startX = e.pageX - sliderRef.current.offsetLeft;
    scrollLeft = sliderRef.current.scrollLeft;
  };
  const handleMouseLeave = () => { isDown = false; };
  const handleMouseUp = () => { isDown = false; };
  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    sliderRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5;
  };

  return (
    <section className={styles.couponSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>{t("couponHome.title")}</h2>
        {error && <p className={styles.error}>{error}</p>}
        <div
          className={styles.grid}
          ref={sliderRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          {coupons.map((coupon, index) => (
            <div key={coupon.id || coupon.code || index} className={styles.card}>
              <div className={styles.top}>
                <div className={styles.icon}>
                  <img src={planeIcon} alt="plane" />
                </div>
                <div>
                  <h3>{t("couponHome.upTo", { discount: coupon.discount })}</h3>
                  <p>{coupon.description || t("couponHome.validFor")}</p>
                </div>
              </div>
              <div className={styles.divider}></div>
              <div className={styles.bottom}>
                <span className={styles.discount}>{coupon.discount}</span>
                <span className={styles.code}>{coupon.code}</span>
                <button className={styles.copyBtn} onClick={() => copyCode(coupon.code)}>
                  {t("couponHome.copy")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
