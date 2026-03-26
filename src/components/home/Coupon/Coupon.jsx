import { useRef, useEffect, useState } from "react";
import styles from "./Coupon.module.css";
import planeIcon from "../../../assets/icons/plane.png";
import API from "../../../services/axiosInstance";

export default function Coupon() {
  const sliderRef = useRef(null);
  const [coupons, setCoupons] = useState([]);

  useEffect(() => {
    API.get("/coupons")
      .then((res) => setCoupons(res.data?.data || []))
      .catch(() => {
        // fallback nếu API chưa có
        setCoupons([
          { discount: "20% OFF", code: "VIVUDEE20", description: "Valid for new users only" },
          { discount: "15% OFF", code: "VIVUDEE15", description: "Valid for new users only" },
          { discount: "10% OFF", code: "VIVUDEE10", description: "Valid for all users" },
          { discount: "25% OFF", code: "VIVUDEE25", description: "Weekend flights only" },
          { discount: "30% OFF", code: "VIVUDEE30", description: "Limited time offer" },
        ]);
      });
  }, []);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert("Copied: " + code);
  };

  let isDown = false, startX, scrollLeft;
  const handleMouseDown = (e) => { isDown = true; startX = e.pageX - sliderRef.current.offsetLeft; scrollLeft = sliderRef.current.scrollLeft; };
  const handleMouseLeave = () => { isDown = false; };
  const handleMouseUp    = () => { isDown = false; };
  const handleMouseMove  = (e) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - sliderRef.current.offsetLeft; sliderRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5; };

  return (
    <section className={styles.couponSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Coupon</h2>
        <div className={styles.grid} ref={sliderRef}
          onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
          {coupons.map((coupon, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.top}>
                <div className={styles.icon}><img src={planeIcon} alt="plane" /></div>
                <div>
                  <h3>Up to {coupon.discount} for Flight Booking</h3>
                  <p>{coupon.description || "Valid for new users only"}</p>
                </div>
              </div>
              <div className={styles.divider}></div>
              <div className={styles.bottom}>
                <span className={styles.discount}>{coupon.discount}</span>
                <span className={styles.code}>{coupon.code}</span>
                <button className={styles.copyBtn} onClick={() => copyCode(coupon.code)}>Copy</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}