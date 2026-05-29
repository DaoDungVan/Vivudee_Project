import { useTheme } from "../../../hooks/useTheme";
import styles from "./Payments.module.css";

import visa        from "../../../assets/images/payments/visa.png";
import visaDark    from "../../../assets/images/payments/visa_dark.png";
import mastercard  from "../../../assets/images/payments/mastercard.png";
import mastercardDark from "../../../assets/images/payments/mastercard_dark.png";
import paypal      from "../../../assets/images/payments/paypal.png";
import paypalDark  from "../../../assets/images/payments/paypal_dark.png";
import momo        from "../../../assets/images/payments/momo.png";
import momoDark    from "../../../assets/images/payments/momo_dark.png";
import vietqr      from "../../../assets/images/payments/vietqr.png";
import vietqrDark  from "../../../assets/images/payments/vietqr_dark.png";

export default function Payments() {
  const { isDark } = useTheme();

  const payments = [
    { name: "Visa",       logo: visa,       logoDark: visaDark       },
    { name: "Mastercard", logo: mastercard, logoDark: mastercardDark },
    { name: "PayPal",     logo: paypal,     logoDark: paypalDark     },
    { name: "MoMo",       logo: momo,       logoDark: momoDark       },
    { name: "VietQR",     logo: vietqr,     logoDark: vietqrDark     },
  ];

  return (
    <section className={styles.paymentsSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Payment Methods</h2>
        <div className={styles.grid}>
          {payments.map((payment) => (
            <div key={payment.name} className={styles.card}>
              <img src={isDark ? payment.logoDark : payment.logo} alt={payment.name} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
