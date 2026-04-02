import { useEffect, useState } from "react";
import styles from "./HeroBanner.module.css";
import SearchFlightForm from "../SearchFlightForm/SearchFlightForm";

const SLIDE_IMAGES = [
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1483450388369-9ed95738483c?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=1600&auto=format",
  "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=1600&auto=format",
];

export default function HeroBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDE_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className={styles.hero}>
      {/* Tất cả ảnh xếp chồng, chỉ ảnh active mới opacity=1 */}
      {SLIDE_IMAGES.map((src, i) => (
        <div
          key={src}
          className={`${styles.slide} ${i === index ? styles.slideActive : ""}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}

      {/* Dark overlay */}
      <div className={styles.overlay} />

      <div className={styles.title}>
        <h1>Find Cheap Flights & Airline Deals</h1>
        <p>Compare hundreds of airlines. Book the best deal for your trip.</p>
      </div>

      <div className={styles.formWrap}>
        <SearchFlightForm />
      </div>

      {/* Dot indicators */}
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
