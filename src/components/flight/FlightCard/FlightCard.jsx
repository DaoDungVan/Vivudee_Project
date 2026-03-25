import { useState } from "react";
import styles from "./FlightCard.module.css";

const FlightCard = ({ flight, onSelect, isSelected }) => {
  const [expanded, setExpanded] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " VND";
  };

  const formatTime = (iso) => {
    if (!iso) return "--:--";

    const date = new Date(iso);
    if (isNaN(date)) return "--:--";

    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // 🔥 toggle detail
  const handleToggle = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <>
      <div
        className={`${styles.card} ${isSelected ? styles.active : ""}`}
        onClick={handleToggle}
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
              {flight?.arrival?.city} <strong>({flight?.arrival?.code})</strong>{" "}
              • {flight?.duration_label || "--"}
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

          <button
            className={styles.btn}
            onClick={(e) => {
              e.stopPropagation(); // 🔥 QUAN TRỌNG
              onSelect();
            }}
          >
            Select
          </button>
        </div>
      </div>

      {/* 🔥 DETAIL */}
      {expanded && (
        <div className={styles.detail}>
          <div className={styles.detailContainer}>
            {/* LEFT TIMELINE */}
            <div className={styles.timelineCol}>
              <div className={styles.timeBlock}>
                <h4>{formatTime(flight?.departure?.time)}</h4>
                <span>{flight?.departure?.date || ""}</span>
              </div>

              <div className={styles.verticalLine}></div>

              <div className={styles.timeBlock}>
                <h4>{formatTime(flight?.arrival?.time)}</h4>
                <span>{flight?.arrival?.date || ""}</span>
              </div>
            </div>

            {/* RIGHT */}
            <div className={styles.detailContent}>
              {/* DEPART */}
              <div className={styles.airportBlock}>
                <h3>
                  {flight?.departure?.city} ({flight?.departure?.code})
                </h3>
                <p>{flight?.departure?.airport_name}</p>
              </div>

              {/* AIRLINE */}
              <div className={styles.airline}>
                <strong>{flight?.airline?.name}</strong>
                <span>
                  {flight?.flight_number || "--"} •{" "}
                  {flight?.seat?.class || "economy"}
                </span>
              </div>

              {/* BAGGAGE */}
              <div className={styles.baggage}>
                <p>
                  🧳 {flight?.seat?.baggage_included_kg || 0} kg checked baggage
                </p>
                <p>🎒 {flight?.seat?.carry_on_kg || 0} kg cabin baggage</p>
                <p>
                  ➕ Extra baggage:{" "}
                  {new Intl.NumberFormat("vi-VN").format(
                    flight?.seat?.extra_baggage_price || 0,
                  )}{" "}
                  VND
                </p>
              </div>

              {/* ARRIVE */}
              <div className={styles.airportBlock}>
                <h3>
                  {flight?.arrival?.city} ({flight?.arrival?.code})
                </h3>
                <p>{flight?.arrival?.airport_name}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlightCard;
