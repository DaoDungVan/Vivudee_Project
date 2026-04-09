import styles from "./Footer.module.css";
import footerLogo from "../../../assets/images/LogoFooter.svg";
import visa from "../../../assets/images/payments/visa.png";
import mastercard from "../../../assets/images/payments/mastercard.svg";
import paypal from "../../../assets/images/payments/paypal.png";
import momo from "../../../assets/images/payments/momo.png";
import vietqr from "../../../assets/images/payments/vietqr.png";
import { useTranslation } from "react-i18next";

const PAYMENT_LOGOS = [visa, mastercard, paypal, momo, vietqr];

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* BRAND */}
          <div className={styles.brand}>
            <img src={footerLogo} alt="Vivudee Logo" />
            <h3>{t("footer.paymentPartners")}</h3>
            <div className={styles.payPartner}>
              {PAYMENT_LOGOS.map((logo, i) => (
                <div key={i} className={styles.sigleItem}>
                  <div className={styles.icon}>
                    <img src={logo} alt="Payment Partner" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COMPANY */}
          <div className={styles.menufooter}>
            <h3>{t("footer.company")}</h3>
            <ul>
              <li>{t("footer.aboutUs")}</li>
              <li>{t("footer.careers")}</li>
              <li>{t("footer.press")}</li>
              <li>{t("footer.blog")}</li>
            </ul>
          </div>

          {/* SUPPORT */}
          <div className={styles.menufooter}>
            <h3>{t("footer.support")}</h3>
            <ul>
              <li>{t("footer.helpCenter")}</li>
              <li>{t("footer.terms")}</li>
              <li>{t("footer.privacy")}</li>
              <li>{t("footer.contactLink")}</li>
            </ul>
          </div>

          {/* CONTACT */}
          <div className={styles.menufooter}>
            <h3>{t("footer.contact")}</h3>
            <ul>
              <li>Email: support@vivudee.com</li>
              <li>Phone: +84 123 456 789</li>
              <li>Vietnam</li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>{t("footer.copyright")}</p>
          <span>{t("footer.legal")}</span>
        </div>
      </div>
    </footer>
  );
}
