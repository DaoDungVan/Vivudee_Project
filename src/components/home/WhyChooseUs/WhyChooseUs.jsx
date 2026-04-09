import styles from "./WhyChooseUs.module.css";
import price from "../../../assets/icons/price.png";
import booking from "../../../assets/icons/booking.png";
import secure from "../../../assets/icons/secure.png";
import support from "../../../assets/icons/support.png";
import { useTranslation } from "react-i18next";

const ICONS = [booking, price, secure, support];

export default function WhyChooseUs() {
  const { t } = useTranslation();
  const features = t("why.features", { returnObjects: true });

  return (
    <section className={styles.whySection}>
      <div className={styles.container}>
        <h2 className={styles.title}>{t("why.title")}</h2>
        <div className={styles.grid}>
          {features.map((item, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.icon}>
                <img src={ICONS[index]} alt={item.title} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
