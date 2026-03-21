import styles from "./FlightCard.module.css";

const FlightCard = ({ flight }) => {
  return (
    <div className={styles.card}>
      {/* LEFT */}
      <div className={styles.left}>
        <div className={styles.logoWrapper}>
          <img src={flight.logo} alt={flight.airline} />
        </div>

        <div className={styles.info}>
          <h3>{flight.airline}</h3>

          <div className={styles.timeline}>
            <span>{flight.departure}</span>

            <div className={styles.line}></div>

            <span>{flight.arrival}</span>
          </div>

          <p className={styles.duration}>{flight.duration}</p>
        </div>
      </div>

      {/* RIGHT */}
      <div className={styles.right}>
        <p className={styles.price}>
          {(flight.price || 1200000).toLocaleString()} VND
        </p>
        <button className={styles.btn}>Select</button>
      </div>
    </div>
  );
};

export default FlightCard;
