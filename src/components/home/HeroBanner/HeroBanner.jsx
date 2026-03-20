import { useEffect, useState } from "react";
import styles from "./HeroBanner.module.css";

import img from "../../../assets/images/slide.jpg";
import img1 from "../../../assets/images/slide1.jpg";
import img2 from "../../../assets/images/slide2.jpg";
import img3 from "../../../assets/images/slide3.jpg";
import img4 from "../../../assets/images/slide4.jpg";

import SearchFlightForm from "../SearchFlightForm/SearchFlightForm";

const images = [img, img1, img2, img3, img4];

export default function HeroBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * images.length);
      setIndex(randomIndex);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className={styles.hero}
      style={{ backgroundImage: `url(${images[index]})` }}
    >
      <div className={styles.title}>
        <h1>Find Cheap Flights & Airline Deals to Anywhere in the World</h1>
      </div>

      <SearchFlightForm />
    </section>
  );
}