import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { LuMail, LuPhone, LuMapPin, LuSend } from "react-icons/lu";
import { FaFacebook, FaInstagram, FaXTwitter, FaLinkedinIn } from "react-icons/fa6";
import footerLogo  from "../../../assets/images/LogoFooter.svg";
import visaDark    from "../../../assets/images/payments/visa_dark.png";
import mastercardDk from "../../../assets/images/payments/mastercard_dark.png";
import paypalDark  from "../../../assets/images/payments/paypal_dark.png";
import momoDark    from "../../../assets/images/payments/momo_dark.png";
import vietqrDark  from "../../../assets/images/payments/vietqr_dark.png";
import styles from "./Footer.module.css";

const SOCIALS = [
  { icon: <FaFacebook />,   href: "#", label: "Facebook"  },
  { icon: <FaInstagram />,  href: "#", label: "Instagram" },
  { icon: <FaXTwitter />,   href: "#", label: "X"         },
  { icon: <FaLinkedinIn />, href: "#", label: "LinkedIn"  },
];

const PAYMENTS = [
  { src: visaDark,     alt: "Visa"       },
  { src: mastercardDk, alt: "Mastercard" },
  { src: paypalDark,   alt: "PayPal"     },
  { src: momoDark,     alt: "MoMo"       },
  { src: vietqrDark,   alt: "VietQR"     },
];

export default function Footer() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");

  const handleSubscribe = () => {
    if (!email.trim()) { toast.error(t("newsletter.error")); return; }
    toast.success(t("newsletter.success"));
    setEmail("");
  };

  return (
    <footer className={styles.footer}>

      {/* ── Newsletter strip ── */}
      <div className={styles.nlStrip}>
        <div className={styles.nlInner}>
          <div className={styles.nlText}>
            <LuSend size={18} className={styles.nlIcon} />
            <div>
              <p className={styles.nlTitle}>{t("newsletter.title")}</p>
              <p className={styles.nlDesc}>{t("newsletter.desc")}</p>
            </div>
          </div>
          <div className={styles.nlForm}>
            <input
              type="email"
              className={styles.nlInput}
              placeholder={t("newsletter.placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
            />
            <button className={styles.nlBtn} onClick={handleSubscribe}>
              {t("newsletter.btn")}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.accentLine} />

      <div className={styles.container}>

        {/* ── Main grid ── */}
        <div className={styles.grid}>
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

          <div className={styles.col}>
            <h4 className={styles.colTitle}>{t("footer.product")}</h4>
            <ul className={styles.colList}>
              <li><a href="/flights">{t("footer.searchFlight")}</a></li>
              <li><a href="/checkin">{t("footer.checkin")}</a></li>
              <li><a href="/bookings">{t("footer.myBookings")}</a></li>
              <li><a href="/transactions">{t("footer.transactions")}</a></li>
            </ul>
          </div>

          <div className={styles.col}>
            <h4 className={styles.colTitle}>{t("footer.support")}</h4>
            <ul className={styles.colList}>
              <li><a href="#">{t("footer.helpCenter")}</a></li>
              <li><a href="#">{t("footer.terms")}</a></li>
              <li><a href="#">{t("footer.privacy")}</a></li>
              <li><a href="#">{t("footer.contactLink")}</a></li>
            </ul>
          </div>

          <div className={styles.col}>
            <h4 className={styles.colTitle}>{t("footer.contact")}</h4>
            <ul className={styles.contactList}>
              <li><LuMail size={13} /><span>support@vivudee.com</span></li>
              <li><LuPhone size={13} /><span>+84 123 456 789</span></li>
              <li><LuMapPin size={13} /><span>Việt Nam</span></li>
            </ul>
          </div>
        </div>

        <div className={styles.divider} />

        {/* ── Bottom bar ── */}
        <div className={styles.bottom}>
          <div className={styles.payments}>
            {PAYMENTS.map((p) => (
              <div key={p.alt} className={styles.payCard}>
                <img src={p.src} alt={p.alt} />
              </div>
            ))}
          </div>
          <p className={styles.copy}>© {new Date().getFullYear()} Vivudee · {t("footer.allRights", "Bảo lưu mọi quyền")}</p>
        </div>

      </div>
    </footer>
  );
}
