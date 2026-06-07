import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../hooks/useTheme";
import { getRecommendations, getBrowseFlights } from "../../../services/flightService";
import planeIcon from "../../../assets/icons/plane.png";
import styles from "./Recommendations.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " VND";
// Lấy ngày hôm nay theo local time — KHÔNG dùng toISOString (quy đổi UTC sẽ lùi 1 ngày
// trong khoảng 00:00-06:59 giờ VN vì lệch UTC+7)
const todayLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtTime = (iso) => {
  if (!iso) return "--:--";
  const match = String(iso).match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "--:--";
};

const SCROLL_BY = 320;

export default function Recommendations({ from = "SGN", to = "HAN" }) {
  const navigate   = useNavigate();
  const { t }      = useTranslation();
  const { isDark } = useTheme();
  const sliderRef  = useRef(null);
  const drag       = useRef({ down: false, startX: 0, scrollLeft: 0 });
  const [flights,  setFlights]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    let active = true;
    getRecommendations(from, to, 8)
      .then((res) => {
        if (!active) return;
        const data = res.data?.data || [];
        if (data.length > 0) { setFlights(data); return; }
        return getBrowseFlights(8).then((r) => {
          if (!active) return;
          setFlights(r.data?.data || []);
        });
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to]);

  const updateArrows = () => {
    const el = sliderRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => { updateArrows(); }, [flights]);

  const scroll = (dir) => {
    sliderRef.current?.scrollBy({ left: dir * SCROLL_BY, behavior: "smooth" });
    setTimeout(updateArrows, 350);
  };

  const onDown  = (e) => { drag.current = { down: true, startX: e.pageX - sliderRef.current.offsetLeft, scrollLeft: sliderRef.current.scrollLeft }; };
  const onLeave = ()  => { drag.current.down = false; };
  const onUp    = ()  => { drag.current.down = false; updateArrows(); };
  const onMove  = (e) => {
    if (!drag.current.down) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    sliderRef.current.scrollLeft = drag.current.scrollLeft - (x - drag.current.startX) * 1.5;
  };

  const handleView = (f) => {
    const date = f.departure?.time ? f.departure.time.slice(0, 10) : todayLocal();
    navigate(
      `/flights?from=${f.departure?.code || from}&to=${f.arrival?.code || to}&departureDate=${date}&adults=1&children=0&seatClass=economy&tripType=one-way`,
      { state: { preselectFlight: f } }
    );
  };

  if (!loading && flights.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Tiêu đề + nút điều hướng cùng hàng */}
        <div className={styles.header}>
          <h2 className={styles.title}>{t("recommendations.title")}</h2>
          <div className={styles.navBtns}>
            <button className={styles.navBtn} disabled={!canLeft}  onClick={() => scroll(-1)}>‹</button>
            <button className={styles.navBtn} disabled={!canRight} onClick={() => scroll(1)}>›</button>
          </div>
        </div>

        <div
          className={styles.grid}
          ref={sliderRef}
          onMouseDown={onDown}
          onMouseLeave={onLeave}
          onMouseUp={onUp}
          onMouseMove={onMove}
          onScroll={updateArrows}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className={`${styles.skCard} ${styles.skeleton}`} />)
            : flights.map((f) => (
                <div key={f.flight_id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <img
                      src={(isDark && f.airline?.logo_dark) ? f.airline.logo_dark : (f.airline?.logo_url || planeIcon)}
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
                    <button className={styles.viewBtn} onClick={() => handleView(f)}>{t("recommendations.viewBtn")}</button>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
