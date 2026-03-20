import styles from "./WhyChooseUs.module.css";

import price from "../../../assets/icons/price.png";
import booking from "../../../assets/icons/booking.png";
import secure from "../../../assets/icons/secure.png";
import support from "../../../assets/icons/support.png";

export default function WhyChooseUs() {

  const features = [  
    {
      icon: booking,
      title: "Complete travel solutions",
      desc: "An all-in-one solution that helps you find flights and hotels across Vietnam and Southeast Asia in a convenient and cost-effective way."
    },
    {
      icon: price,
      title: "Best prices every day",
      desc: "The price you see is the price you pay. Easily compare prices with no hidden fees."
    },
    {
      icon: secure,
      title: "Secure and flexible payment methods",
      desc: "Safe online transactions with multiple payment options such as convenience store payments, bank transfers, credit cards, and Internet Banking. No transaction fees."
    },
    {
      icon: support,
      title: "24/7 customer support",
      desc: "Our customer support team is always ready to assist you at every step of the booking process."
    }
  ];

  return (
    <section className={styles.whySection}>

      <div className={styles.container}>

        <h2 className={styles.title}>
          Why book with Vivudee?
        </h2>

        <div className={styles.grid}>

          {features.map((item, index) => (

            <div key={index} className={styles.card}>

              <div className={styles.icon}>
                <img src={item.icon} alt={item.title}/>
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