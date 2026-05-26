import { useEffect, useState } from "react";
import styles from "./HeroBanner.module.css";
import SearchFlightForm from "../SearchFlightForm/SearchFlightForm";
import { useTranslation } from "react-i18next";
import hero1 from "../../../assets/images/herobanner/hero1.jpg";
import hero2 from "../../../assets/images/herobanner/hero2.jpg";
import hero3 from "../../../assets/images/herobanner/hero3.jpg";
import hero4 from "../../../assets/images/herobanner/hero4.jpg";
import hero5 from "../../../assets/images/herobanner/hero5.jpg";
import hero6 from "../../../assets/images/herobanner/hero6.jpg";
import hero7 from "../../../assets/images/herobanner/hero7.jpg";
import hero8 from "../../../assets/images/herobanner/hero8.jpg";
import hero9 from "../../../assets/images/herobanner/hero9.jpg";

const SLIDE_IMAGES = [hero1, hero2, hero3, hero4, hero5, hero6, hero7, hero8, hero9];

export default function HeroBanner() {
  const [index, setIndex] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDE_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className={styles.hero}>
      {SLIDE_IMAGES.map((src, i) => (
        <div
          key={src}
          className={`${styles.slide} ${i === index ? styles.slideActive : ""}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className={styles.overlay} />
      <div className={styles.title}>
        <h1>{t("hero.title")}</h1>
        <p>{t("hero.subtitle")}</p>
      </div>
      <div className={styles.formWrap}>
        <SearchFlightForm />
      </div>
      <div className={styles.dots}>
        {SLIDE_IMAGES.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
