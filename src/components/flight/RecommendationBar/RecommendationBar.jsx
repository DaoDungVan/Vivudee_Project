import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRecommendations } from "../../../services/flightService";
import planeIcon from "../../../assets/icons/plane.png";
import styles from "./RecommendationBar.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " ₫";

export default function RecommendationBar({ from, to }) {
  const navigate = useNavigate();
  const [flights, setFlights] = useState([]);

  useEffect(() => {
    if (!from || !to) return;
    getRecommendations(from, to, 3)
      .then((res) => setFlights(res.data?.data?.slice(0, 3) || []))
      .catch(() => {});
  }, [from, to]);

  if (flights.length === 0) return null;

  const handlePick = (f) => {
    const date = f.departure?.time ? f.departure.time.slice(0, 10) : new Date().toISOString().slice(0, 10);
    navigate(`/flights?from=${f.departure?.code}&to=${f.arrival?.code}&departureDate=${date}&adults=1&children=0&seatClass=economy&tripType=one-way`);
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>Bạn cũng có thể quan tâm</p>
      <div className={styles.grid}>
        {flights.map((f) => (
          <div key={f.flight_id} className={styles.card} onClick={() => handlePick(f)}>
            <img
              src={f.airline?.logo_url || planeIcon}
              alt={f.airline?.name}
              className={styles.logo}
              onError={(e) => { e.target.src = planeIcon; }}
            />
            <div className={styles.info}>
              <p className={styles.route}>{f.departure?.code} → {f.arrival?.code}</p>
              <p className={styles.sub}>{f.airline?.name} · {f.duration_label}</p>
            </div>
            <span className={styles.price}>{fmt(f.seat?.total_price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
