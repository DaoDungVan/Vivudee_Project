import styles from "./Airlines.module.css";

import vietnam from "../../../assets/images/airlines/vietnam.png";
import vietjet from "../../../assets/images/airlines/vietjet.png";
import bamboo from "../../../assets/images/airlines/bamboo.png";
import singapore from "../../../assets/images/airlines/singapore.png";
import thai from "../../../assets/images/airlines/thai.png";
import korean from "../../../assets/images/airlines/korea.png";
import pacific from "../../../assets/images/airlines/pacific.png"
import airasia from "../../../assets/images/airlines/airasia.png"
import scoot from "../../../assets/images/airlines/scoot.png"
import silkair from "../../../assets/images/airlines/SilkAir.png"

export default function Airlines() {

  const airlines = [
    vietnam,
    vietjet,
    bamboo,
    singapore,
    thai,
    korean,
    pacific,
    airasia,
    scoot,
    silkair,
  ];

  return (

    <section className={styles.airlinesSection}>

      <div className={styles.container}>

        <h2 className={styles.title}>
          Popular Airlines
        </h2>

        <div className={styles.grid}>

          {airlines.map((logo, index) => (

            <div key={index} className={styles.card}>
              <img src={logo} alt="airline"/>
            </div>

          ))}

        </div>

      </div>

    </section>

  );

}