import styles from "./Footer.module.css";
import Newsletter from "../Newsletter/Newsletter";
import footerLogo from "../../../assets/images/LogoFooter.svg";
import visa from "../../../assets/images/payments/visa.png";
import mastercard from "../../../assets/images/payments/mastercard.svg";
import paypal from "../../../assets/images/payments/paypal.png";
import momo from "../../../assets/images/payments/momo.png";
import vietqr from "../../../assets/images/payments/vietqr.png";

export default function Footer() {
  const payment = [
    {
      logo: visa,
    },
    {
      logo: mastercard,
    },
    {
      logo: paypal,
    },
    {
      logo: momo,
    },
    {
      logo: vietqr,
    },
  ];
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* NEWSLETTER */}

        <Newsletter />

        <div className={styles.grid}>
          {/* BRAND */}

          <div className={styles.brand}>
            <img src={footerLogo} alt="Vivudee Logo" />

            <h3>Payment Partners</h3>

            <div className={styles.payPartner}>
                {payment.map((item, index) => (
                  <div key={index} className={styles.sigleItem}>
                      <div  className={styles.icon}>
                        <img src={item.logo} alt="Payment Partners" />
                      </div>
                  </div>
                ))}
            </div>
          </div>

          {/* COMPANY */}

          <div className={styles.menufooter}>
            <h3>Company</h3>

            <ul>
              <li>About Us</li>
              <li>Careers</li>
              <li>Press</li>
              <li>Blog</li>
            </ul>
          </div>

          {/* SUPPORT */}

          <div className={styles.menufooter}>
            <h3>Support</h3>

            <ul>
              <li>Help Center</li>
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Contact</li>
            </ul>
          </div>

          {/* CONTACT */}

          <div className={styles.menufooter}>
            <h3>Contact</h3>

            <ul>
              <li>Email: support@vivudee.com</li>
              <li>Phone: +84 123 456 789</li>
              <li>Vietnam</li>
            </ul>
          </div>
        </div>

        {/* COPYRIGHT */}

        <div className={styles.bottom}>
          <p>© 2026 Vivudee. All rights reserved.</p>
          <span>
            Privacy Policy | Terms of Service | Cookie Policy | Contact Us.
          </span>
        </div>
      </div>
    </footer>
  );
}
