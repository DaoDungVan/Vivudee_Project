import styles from "./Payments.module.css";

import visa from "../../../assets/images/payments/visa.png";
import mastercard from "../../../assets/images/payments/mastercard.svg";
import paypal from "../../../assets/images/payments/paypal.png";
import momo from "../../../assets/images/payments/momo.png";
import vietqr from "../../../assets/images/payments/vietqr.png";

export default function Payments() {

  const payments = [
    {
      name: "Visa",
      logo: visa
    },
    {
      name: "Mastercard",
      logo: mastercard
    },
    {
      name: "PayPal",
      logo: paypal
    },
    {
      name: "MoMo",
      logo: momo
    },
    {
      name: "VietQR",
      logo: vietqr
    }
  ];

  return (
    <section className={styles.paymentsSection}>

      <div className={styles.container}>

        <h2 className={styles.title}>
          Payment Methods
        </h2>

        <div className={styles.grid}>

          {payments.map((payment, index) => (
            <div key={index} className={styles.card}>
              <img src={payment.logo} alt={payment.name} />
            </div>
          ))}

        </div>

      </div>

    </section>
  );
}