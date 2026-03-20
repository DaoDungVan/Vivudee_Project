import styles from "./Airlines.module.css";

import vietnam from "../../../assets/images/airlines/vietnam.png";
import vietjet from "../../../assets/images/airlines/vietjet.png";
import bamboo from "../../../assets/images/airlines/bamboo.png";
import singapore from "../../../assets/images/airlines/singapore.png";
import thai from "../../../assets/images/airlines/thai.png";
import korean from "../../../assets/images/airlines/korea.png";

export default function Airlines() {

  const airlines = [
    vietnam,
    vietjet,
    bamboo,
    singapore,
    thai,
    korean
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