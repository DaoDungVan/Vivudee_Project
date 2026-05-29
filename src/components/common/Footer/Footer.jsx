import { useTranslation } from "react-i18next";
import { LuMail, LuPhone, LuMapPin } from "react-icons/lu";
import { FaFacebook, FaInstagram, FaXTwitter, FaLinkedinIn } from "react-icons/fa6";
import footerLogo from "../../../assets/images/LogoFooter.svg";
import visa       from "../../../assets/images/payments/visa.png";
import mastercard from "../../../assets/images/payments/mastercard.svg";
import paypal     from "../../../assets/images/payments/paypal.png";
import momo       from "../../../assets/images/payments/momo.png";
import vietqr     from "../../../assets/images/payments/vietqr.png";
import Newsletter from "../Newsletter/Newsletter";
import styles from "./Footer.module.css";

const SOCIALS = [
  { icon: <FaFacebook />,   href: "#", label: "Facebook"  },
  { icon: <FaInstagram />,  href: "#", label: "Instagram" },
  { icon: <FaXTwitter />,   href: "#", label: "X"         },
  { icon: <FaLinkedinIn />, href: "#", label: "LinkedIn"  },
];

const PAYMENTS = [
  { src: visa,       alt: "Visa"       },
  { src: mastercard, alt: "Mastercard" },
  { src: paypal,     alt: "PayPal"     },
  { src: momo,       alt: "MoMo"       },
  { src: vietqr,     alt: "VietQR"     },
];

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <div className={styles.newsletterWrap}>
        <div className={styles.container}>
          <Newsletter />
        </div>
      </div>

      <div className={styles.accentLine} />

      <div className={styles.container}>
        {/* Main grid */}
        <div className={styles.grid}>

          {/* Brand column */}
          <div className={styles.brand}>
            <img src={footerLogo} alt="Vivudee" className={styles.logo} />
            <p className={styles.tagline}>Your Journey Starts Here</p>
            <p className={styles.desc}>
              {t("footer.desc", "Nền tảng đặt vé máy bay trực tuyến — nhanh, tin cậy, giá tốt nhất cho mọi hành trình.")}
            </p>
            <div className={styles.socials}>
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} className={styles.socialBtn} aria-label={s.label}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className={styles.col}>
            <h4 className={styles.colTitle}>{t("footer.product")}</h4>
            <ul className={styles.colList}>
              <li><a href="/flights">{t("footer.searchFlight")}</a></li>
              <li><a href="/checkin">{t("footer.checkin")}</a></li>
              <li><a href="/bookings">{t("footer.myBookings")}</a></li>
              <li><a href="/transactions">{t("footer.transactions")}</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className={styles.col}>
            <h4 className={styles.colTitle}>{t("footer.support")}</h4>
            <ul className={styles.colList}>
              <li><a href="#">{t("footer.helpCenter")}</a></li>
              <li><a href="#">{t("footer.terms")}</a></li>
              <li><a href="#">{t("footer.privacy")}</a></li>
              <li><a href="#">{t("footer.contactLink")}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className={styles.col}>
            <h4 className={styles.colTitle}>{t("footer.contact")}</h4>
            <ul className={styles.contactList}>
              <li><LuMail size={14} /><span>support@vivudee.com</span></li>
              <li><LuPhone size={14} /><span>+84 123 456 789</span></li>
              <li><LuMapPin size={14} /><span>Việt Nam</span></li>
            </ul>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Bottom bar */}
        <div className={styles.bottom}>
          <div className={styles.payments}>
            {PAYMENTS.map((p) => (
              <div key={p.alt} className={styles.payCard}>
                <img src={p.src} alt={p.alt} />
              </div>
            ))}
          </div>
          <p className={styles.copy}>© {new Date().getFullYear()} Vivudee · {t("footer.copyright", "Bảo lưu mọi quyền")}</p>
        </div>
      </div>
    </footer>
  );
}
