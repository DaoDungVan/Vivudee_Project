import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../hooks/useTheme";
import { getRecommendations, normalizeFlight } from "../../../services/flightService";
import planeIcon from "../../../assets/icons/plane.png";
import styles from "./RecommendationBar.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " ₫";
// Lấy ngày hôm nay theo local time — KHÔNG dùng toISOString (quy đổi UTC sẽ lùi 1 ngày
// trong khoảng 00:00-06:59 giờ VN vì lệch UTC+7)
const todayLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function RecommendationBar({ from, to }) {
  const navigate   = useNavigate();
  const { t }      = useTranslation();
  const { isDark } = useTheme();
  const [flights, setFlights] = useState([]);

  useEffect(() => {
    if (!from || !to) return;
    getRecommendations(from, to, 3)
      .then((res) => setFlights((res.data?.data?.flights || []).slice(0, 3).map(normalizeFlight)))
      .catch(() => {});
  }, [from, to]);

  if (flights.length === 0) return null;

  const handlePick = (f) => {
    const date = f.departure?.time ? f.departure.time.slice(0, 10) : todayLocal();
    navigate(
      `/flights?from=${f.departure?.code}&to=${f.arrival?.code}&departureDate=${date}&adults=1&children=0&seatClass=economy&tripType=one-way`,
      { state: { preselectFlight: f } }
    );
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>{t("recommendations.alsoLike")}</p>
      <div className={styles.grid}>
        {flights.map((f) => (
          <div key={f.flight_id} className={styles.card} onClick={() => handlePick(f)}>
            <img
              src={(isDark && f.airline?.logo_dark) ? f.airline.logo_dark : (f.airline?.logo_url || planeIcon)}
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
