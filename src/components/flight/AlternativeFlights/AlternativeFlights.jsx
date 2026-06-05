import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../hooks/useTheme";
import { getAlternatives } from "../../../services/flightService";
import API from "../../../services/axiosInstance";
import planeIcon from "../../../assets/icons/plane.png";
import styles from "./AlternativeFlights.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " ₫";
const fmtTime = (iso) => {
  if (!iso) return "--:--";
  const m = String(iso).match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "--:--";
};

// Cache airlines để không fetch lại nhiều lần
let airlinesCache = null;
const getAirlines = () => {
  if (airlinesCache) return Promise.resolve(airlinesCache);
  return API.get("/flights/airlines").then(res => {
    airlinesCache = res.data?.data || [];
    return airlinesCache;
  });
};

export default function AlternativeFlights({ selectedFlight, seatClass = "economy", adults = 1, onSelect }) {
  const { t }      = useTranslation();
  const { isDark } = useTheme();
  const [alts,     setAlts]     = useState([]);
  const [airlines, setAirlines] = useState([]);

  useEffect(() => {
    getAirlines().then(setAirlines).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFlight?.flight_id) { setAlts([]); return; }
    getAlternatives(selectedFlight.flight_id, seatClass, adults)
      .then((res) => {
        const raw = res.data?.data || [];
        setAlts(raw.filter((f) => f.flight_id !== selectedFlight.flight_id).slice(0, 3));
      })
      .catch(() => setAlts([]));
  }, [selectedFlight?.flight_id, seatClass, adults]);

  const getLogo = (f) => {
    // Ưu tiên logo có sẵn trong dữ liệu
    if (isDark && f.airline?.logo_dark) return f.airline.logo_dark;
    if (f.airline?.logo_url) return f.airline.logo_url;
    // Tìm trong danh sách airlines theo code hoặc name
    const match = airlines.find(a =>
      (f.airline?.code && a.code?.toUpperCase() === f.airline.code.toUpperCase()) ||
      (f.airline?.name && a.name?.toLowerCase() === f.airline.name.toLowerCase())
    );
    if (!match) return planeIcon;
    return (isDark && match.logo_dark) ? match.logo_dark : (match.logo_url || planeIcon);
  };

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
                src={getLogo(f)}
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
