import styles from "./FlightCard.module.css";

const FlightCard = ({ flight, onSelect, isSelected }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " VND";
  };

  // 🔥 format time an toàn
  const formatTime = (iso) => {
    if (!iso) return "--:--";

    const date = new Date(iso);
    if (isNaN(date)) return "--:--";

    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // 🔥 24h format
    });
  };
  return (
    <div
      className={`${styles.card} ${isSelected ? styles.active : ""}`}
      onClick={onSelect}
    >
      {/* LEFT */}
      <div className={styles.left}>
        <div className={styles.logoWrapper}>
          <img
            src={
              flight?.airline?.logo_url ||
              "https://cdn-icons-png.flaticon.com/512/34/34627.png"
            }
            alt={flight?.airline?.name || "airline"}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "https://cdn-icons-png.flaticon.com/512/34/34627.png";
            }}
          />
        </div>

        <div className={styles.info}>
          <h3>{flight?.airline?.name || "Unknown Airline"}</h3>

          <div className={styles.timeline}>
            <span>{formatTime(flight?.departure?.time)}</span>

            <div className={styles.line}></div>

            <span>{formatTime(flight?.arrival?.time)}</span>
          </div>

          <p className={styles.duration}>
            {flight?.departure?.city}{" "}
            <strong>({flight?.departure?.code})</strong> →{" "}
            {flight?.arrival?.city} <strong>({flight?.arrival?.code})</strong> •{" "}
            {flight?.duration_label || "--"}
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div className={styles.right}>
        <p className={styles.price}>
          <span className={styles.amount}>
            {formatPrice(flight?.seat?.total_price || 0)}
          </span>
          <span className={styles.per}>/Customer</span>
        </p>

        <button className={styles.btn}>Select</button>
      </div>
    </div>
  );
};

export default FlightCard;
