import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getBrowseFlights } from "../../../services/flightService";
import planeIcon from "../../../assets/icons/plane.png";
import styles from "./BrowseByAirline.module.css";

const PREVIEW = 5; // số card hiện mặc định mỗi hãng

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " ₫";
const fmtTime = (iso) => {
  if (!iso) return "--:--";
  const m = String(iso).match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "--:--";
};
const today = () => new Date().toISOString().slice(0, 10);

export default function BrowseByAirline() {
  const navigate   = useNavigate();
  const { t }      = useTranslation();
  const [groups,   setGroups]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(new Set()); // airline codes đang mở rộng

  useEffect(() => {
    getBrowseFlights(300)
      .then((res) => {
        const allFlights = res.data?.data || [];
        const map = {};
        allFlights.forEach((f) => {
          const key = f.airline?.code || f.airline?.name || "OTHER";
          if (!map[key]) map[key] = { airline: f.airline, flights: [] };
          // Tránh trùng tuyến — lưu tất cả, không giới hạn
          const routes = new Set(map[key].flights.map(x => `${x.departure?.code}-${x.arrival?.code}`));
          const route  = `${f.departure?.code}-${f.arrival?.code}`;
          if (!routes.has(route)) map[key].flights.push(f);
        });
        setGroups(Object.values(map).sort((a, b) => b.flights.length - a.flights.length));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (code) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const handleSelect = (f) => {
    const date = f.departure?.time ? f.departure.time.slice(0, 10) : today();
    navigate(
      `/flights?from=${f.departure?.code}&to=${f.arrival?.code}` +
      `&departureDate=${date}&adults=1&children=0&seatClass=economy&tripType=one-way`,
      { state: { preselectFlight: f } }
    );
  };

  if (loading) {
    return (
      <div className={styles.wrap}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skSection}>
            <div className={styles.skHeader} />
            <div className={styles.skRow}>
              {[1, 2, 3].map((j) => <div key={j} className={styles.skCard} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        <p className={styles.introTitle}>{t("browseFlights.title", "Khám phá chuyến bay")}</p>
        <p className={styles.introSub}>{t("browseFlights.sub", "Chọn tuyến bay phù hợp với bạn")}</p>
      </div>

      {groups.map((g) => {
        const code      = g.airline?.code || g.airline?.name;
        const isExp     = expanded.has(code);
        const visible   = isExp ? g.flights : g.flights.slice(0, PREVIEW);
        const hasMore   = g.flights.length > PREVIEW;

        return (
          <div key={code} className={styles.airlineSection}>
            {/* Airline header */}
            <div className={styles.airlineHeader}>
              <img
                src={g.airline?.logo_url || planeIcon}
                alt={g.airline?.name}
                className={styles.airlineLogo}
                onError={(e) => { e.target.src = planeIcon; }}
              />
              <p className={styles.airlineName}>{g.airline?.name}</p>
              <span className={styles.airlineCode}>{g.airline?.code}</span>
              <span className={styles.flightCount}>{g.flights.length} tuyến</span>
            </div>

            {/* Cards — scroll ngang khi thu gọn, grid khi mở rộng */}
            <div className={isExp ? styles.flightGrid : styles.flightRow}>
              {visible.map((f) => (
                <div
                  key={f.flight_id}
                  className={styles.flightCard}
                  onClick={() => handleSelect(f)}
                >
                  <div className={styles.cardRoute}>
                    <span>{f.departure?.code}</span>
                    <span className={styles.routeArrow}>→</span>
                    <span>{f.arrival?.code}</span>
                  </div>
                  <p className={styles.cardTime}>
                    {fmtTime(f.departure?.time)}
                    {f.departure?.city && f.arrival?.city && (
                      <> · {f.departure.city} – {f.arrival.city}</>
                    )}
                  </p>
                  <div className={styles.cardBottom}>
                    <span className={styles.cardPrice}>{fmt(f.seat?.total_price)}</span>
                    <span className={styles.cardDuration}>{f.duration_label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Toggle button */}
            {hasMore && (
              <div className={styles.toggleBtnWrap}>
                <button
                  className={styles.toggleBtn}
                  onClick={() => toggleExpand(code)}
                >
                  {isExp
                    ? "Thu gọn ↑"
                    : `Xem tất cả ${g.flights.length} tuyến ↓`}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
