import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPriceCalendar } from "../../../services/flightService";
import styles from "./HeatCalendar.module.css";

const WEEK_DAYS_VI = ["T2","T3","T4","T5","T6","T7","CN"];
const WEEK_DAYS_EN = ["Mo","Tu","We","Th","Fr","Sa","Su"];
const MONTHS_VI = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmtShort = (n) => {
  if (!n) return null;
  return n >= 1e6 ? `${(n/1e6).toFixed(1)}tr` : `${Math.round(n/1000)}k`;
};


export default function HeatCalendar({ from, to, selectedDate, seatClass = "economy", adults = 1 }) {
  const navigate   = useNavigate();
  const { t, i18n } = useTranslation();
  const isVI       = i18n.language?.startsWith("vi");

  const initMonth = () => {
    if (selectedDate) return selectedDate.slice(0, 7);
    return new Date().toISOString().slice(0, 7);
  };

  const [month,   setMonth]   = useState(initMonth);
  const [calData, setCalData] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchMonth = useCallback(async (m) => {
    if (!from || !to) return;
    setLoading(true);
    try {
      const res  = await getPriceCalendar(from, to, m, seatClass, adults);
      const rows = res.data?.data || [];
      const map  = {};
      rows.forEach(r => { map[String(r.flight_date).slice(0, 10)] = Number(r.min_price); });
      setCalData(prev => ({ ...prev, ...map }));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [from, to, seatClass, adults]);

  useEffect(() => { fetchMonth(month); }, [month, fetchMonth]);

  // Build calendar grid
  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  // Monday = 0 ... Sunday = 6
  let startOffset = (firstDay.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, "0")}`;
    cells.push(dateStr);
  }

  // Price stats for heatmap
  const prices = Object.entries(calData)
    .filter(([k]) => k.startsWith(month))
    .map(([, v]) => v)
    .filter(Boolean);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 0;

  const prevMonth = () => {
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  };
  const nextMonth = () => {
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  };

  const goToDate = (dateStr) => {
    const params = new URLSearchParams(window.location.search);
    params.set("departureDate", dateStr);
    navigate(`/flights?${params.toString()}`);
  };

  const today = new Date().toISOString().slice(0, 10);
  const weekDays = isVI ? WEEK_DAYS_VI : WEEK_DAYS_EN;
  const monthName = `${isVI ? MONTHS_VI[m-1] : MONTHS_EN[m-1]} ${y}`;

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <p className={styles.title}>
          {t("heatCalendar.title", "Lịch giá")} · {from} → {to}
        </p>
        <div className={styles.navRow}>
          <button className={styles.navBtn} onClick={prevMonth}>‹</button>
          <span className={styles.monthLabel}>{monthName}</span>
          <button className={styles.navBtn} onClick={nextMonth}>›</button>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendCheap}>{t("heatCalendar.cheap", "Rẻ")}</span>
        <div className={styles.legendBar} />
        <span className={styles.legendExp}>{t("heatCalendar.expensive", "Đắt")}</span>
      </div>

      {/* Day-of-week header */}
      <div className={styles.weekRow}>
        {weekDays.map(d => <div key={d} className={styles.weekDay}>{d}</div>)}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className={styles.loading}>{t("heatCalendar.loading", "Đang tải...")}</div>
      ) : (
        <div className={styles.grid}>
          {cells.map((dateStr, idx) => {
            if (!dateStr) return <div key={`e-${idx}`} className={`${styles.cell} ${styles.cellEmpty}`} />;

            const price  = calData[dateStr];
            const isPast = dateStr < today;
            const isSel  = dateStr === selectedDate;

            const getBg = () => {
              if (!price || minP === maxP || isPast) return undefined;
              const ratio = (price - minP) / (maxP - minP);
              if (ratio <= 0.33) return { bg: "rgba(34,197,94,0.13)",  text: "#16a34a" };  // xanh mint nhẹ
              if (ratio <= 0.66) return { bg: "rgba(234,179,8,0.13)",  text: "#ca8a04" };  // vàng nhạt
              return               { bg: "rgba(239,68,68,0.13)",  text: "#dc2626" };        // đỏ nhạt
            };
            const colorSet = getBg();

            return (
              <div
                key={dateStr}
                className={`${styles.cell} ${isPast ? styles.cellPast : ""} ${isSel ? styles.cellSelected : ""}`}
                style={colorSet ? { background: colorSet.bg } : {}}
                onClick={() => !isPast && goToDate(dateStr)}
                title={price ? `${new Intl.NumberFormat("vi-VN").format(price)} VND` : ""}
              >
                <span className={styles.cellNum}>{dateStr.slice(-2)}</span>
                {price
                  ? <span className={styles.cellPrice} style={{ color: colorSet?.text }}>{fmtShort(price)}</span>
                  : !isPast && <span className={styles.cellNoPrice}>—</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
