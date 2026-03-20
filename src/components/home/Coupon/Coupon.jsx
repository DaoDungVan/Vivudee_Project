import { useRef } from "react";
import styles from "./Coupon.module.css";
import planeIcon from "../../../assets/icons/plane.png";

export default function Coupon() {

  const sliderRef = useRef(null);

  const coupons = [
    {
      discount: "20% OFF",
      code: "VIVUDEE20"
    },
    {
      discount: "15% OFF",
      code: "VIVUDEE15"
    },
    {
      discount: "10% OFF",
      code: "VIVUDEE10"
    },
    {
      discount: "25% OFF",
      code: "VIVUDEE25"
    },
    {
      discount: "30% OFF",
      code: "VIVUDEE30"
    }
  ];


  /* =========================
     COPY CODE
  ========================== */

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert("Copied: " + code);
  };


  /* =========================
     DRAG SCROLL
  ========================== */

  let isDown = false;
  let startX;
  let scrollLeft;

  const handleMouseDown = (e) => {
    isDown = true;
    startX = e.pageX - sliderRef.current.offsetLeft;
    scrollLeft = sliderRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDown = false;
  };

  const handleMouseUp = () => {
    isDown = false;
  };

  const handleMouseMove = (e) => {

    if (!isDown) return;

    e.preventDefault();

    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;

    sliderRef.current.scrollLeft = scrollLeft - walk;

  };


  return (

    <section className={styles.couponSection}>

      <div className={styles.container}>

        <h2 className={styles.title}>
          Coupon
        </h2>

        <div
          className={styles.grid}
          ref={sliderRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >

          {coupons.map((coupon, index) => (

            <div key={index} className={styles.card}>

              {/* TOP */}

              <div className={styles.top}>

                <div className={styles.icon}>
                  <img src={planeIcon} alt="plane"/>
                </div>

                <div>
                  <h3>Up to {coupon.discount} for Flight Booking</h3>
                  <p>Valid for new users only</p>
                </div>

              </div>


              {/* DIVIDER */}

              <div className={styles.divider}></div>


              {/* BOTTOM */}

              <div className={styles.bottom}>

                <span className={styles.discount}>
                  {coupon.discount}
                </span>

                <span className={styles.code}>
                  {coupon.code}
                </span>

                <button
                  className={styles.copyBtn}
                  onClick={() => copyCode(coupon.code)}
                >
                  Copy
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </section>

  );

}