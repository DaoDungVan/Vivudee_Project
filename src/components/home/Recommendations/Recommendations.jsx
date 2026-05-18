import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRecommendations } from "../../../services/flightService";
import planeIcon from "../../../assets/icons/plane.png";
import styles from "./Recommendations.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " ₫";
const fmtTime = (iso) => {
  if (!iso) return "--:--";
  const match = String(iso).match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "--:--";
};

export default function Recommendations({ from = "SGN", to = "HAN", title = "✈ Chuyến bay gợi ý" }) {
  const navigate  = useNavigate();
  const sliderRef = useRef(null);
  const drag      = useRef({ down: false, startX: 0, scrollLeft: 0 });
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getRecommendations(from, to, 8)
      .then((res) => {
        if (!active) return;
        setFlights(res.data?.data || []);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to]);

  const onDown  = (e) => { drag.current = { down: true, startX: e.pageX - sliderRef.current.offsetLeft, scrollLeft: sliderRef.current.scrollLeft }; };
  const onLeave = ()  => { drag.current.down = false; };
  const onUp    = ()  => { drag.current.down = false; };
  const onMove  = (e) => {
    if (!drag.current.down) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    sliderRef.current.scrollLeft = drag.current.scrollLeft - (x - drag.current.startX) * 1.5;
  };

  const handleView = (f) => {
    const date = f.departure?.time ? f.departure.time.slice(0, 10) : new Date().toISOString().slice(0, 10);
    navigate(`/flights?from=${f.departure?.code || from}&to=${f.arrival?.code || to}&departureDate=${date}&adults=1&children=0&seatClass=economy&tripType=one-way`);
  };

  if (!loading && flights.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>{title}</h2>
        <div
          className={styles.grid}
          ref={sliderRef}
          onMouseDown={onDown}
          onMouseLeave={onLeave}
          onMouseUp={onUp}
          onMouseMove={onMove}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className={`${styles.skCard} ${styles.skeleton}`} />)
            : flights.map((f) => (
                <div key={f.flight_id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <img
                      src={f.airline?.logo_url || planeIcon}
                      alt={f.airline?.name}
                      className={styles.logo}
                      onError={(e) => { e.target.src = planeIcon; }}
                    />
                    <div>
                      <p className={styles.airlineName}>{f.airline?.name}</p>
                      <p className={styles.flightNum}>{f.flight_number}</p>
                    </div>
                  </div>
                  <div className={styles.route}>
                    <span>{f.departure?.code}</span>
                    <span className={styles.arrow}>→</span>
                    <span>{f.arrival?.code}</span>
                  </div>
                  <p className={styles.time}>{fmtTime(f.departure?.time)} · {f.duration_label}</p>
                  <div className={styles.cardBottom}>
                    <span className={styles.price}>{fmt(f.seat?.total_price)}</span>
                    <button className={styles.viewBtn} onClick={() => handleView(f)}>Xem vé</button>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
