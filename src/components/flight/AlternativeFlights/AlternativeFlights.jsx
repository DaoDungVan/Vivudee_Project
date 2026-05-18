import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAlternatives } from "../../../services/flightService";
import planeIcon from "../../../assets/icons/plane.png";
import styles from "./AlternativeFlights.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " ₫";
const fmtTime = (iso) => {
  if (!iso) return "--:--";
  const m = String(iso).match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "--:--";
};

export default function AlternativeFlights({ selectedFlight, seatClass = "economy", adults = 1, onSelect }) {
  const { t }     = useTranslation();
  const [alts, setAlts] = useState([]);

  useEffect(() => {
    if (!selectedFlight?.flight_id) { setAlts([]); return; }
    getAlternatives(selectedFlight.flight_id, seatClass, adults)
      .then((res) => {
        const raw = res.data?.data || [];
        // Filter out the selected flight itself
        setAlts(raw.filter((f) => f.flight_id !== selectedFlight.flight_id).slice(0, 3));
      })
      .catch(() => setAlts([]));
  }, [selectedFlight?.flight_id, seatClass, adults]);

  if (alts.length === 0) return null;

  const selectedPrice = selectedFlight?.seat?.total_price ?? 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.title}>{t("alternatives.title")}</p>
        <p className={styles.subtitle}>{t("alternatives.subtitle")}</p>
      </div>
      <div className={styles.list}>
        {alts.map((f) => {
          const price   = f.seat?.total_price ?? f.base_price ?? 0;
          const diff    = selectedPrice - price;
          const cheaper = diff > 0;
          return (
            <div key={f.flight_id} className={styles.card}>
              <img
                src={f.airline?.logo_url || planeIcon}
                alt={f.airline?.name}
                className={styles.logo}
                onError={(e) => { e.target.src = planeIcon; }}
              />
              <div className={styles.info}>
                <p className={styles.route}>
                  {f.departure?.code} → {f.arrival?.code}
                </p>
                <p className={styles.sub}>
                  {f.airline?.name} · {fmtTime(f.departure?.time)} · {f.duration_label || "—"}
                </p>
              </div>
              <div className={styles.right}>
                <span className={styles.price}>{fmt(price)}</span>
                {cheaper && selectedPrice > 0 && (
                  <span className={styles.cheaper}>
                    ↓ {fmt(diff)}
                  </span>
                )}
                <button
                  className={styles.selectBtn}
                  onClick={() => onSelect?.(f)}
                >
                  {t("alternatives.selectBtn")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
