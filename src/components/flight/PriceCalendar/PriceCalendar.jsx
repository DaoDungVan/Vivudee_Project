import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LuCalendarDays, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { getPriceCalendar } from "../../../services/flightService";
import styles from "./PriceCalendar.module.css";

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const fmtShort   = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}tr` : `${Math.round(n / 1000)}k`;

const toKey  = (d) => d.toISOString().slice(0, 10);
const addDay = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toKey(d);
};

const WINDOW = 2; // ngày trước + ngày sau

export default function PriceCalendar({ from, to, selectedDate, seatClass = "economy", adults = 1, onCalendarLoad }) {
  const navigate  = useNavigate();
  const { t }     = useTranslation();
  const [calData, setCalData]   = useState({});   // { "YYYY-MM-DD": min_price }
  const [loading, setLoading]   = useState(false);
  const [offset,  setOffset]    = useState(0);    // dịch cửa sổ ngày

  // Gọi onCalendarLoad sau khi calData thay đổi — KHÔNG gọi trong setState updater
  const onCalendarLoadRef = useRef(onCalendarLoad);
  useEffect(() => { onCalendarLoadRef.current = onCalendarLoad; }, [onCalendarLoad]);
  useEffect(() => {
    if (Object.keys(calData).length > 0) onCalendarLoadRef.current?.(calData);
  }, [calData]);

  const fetchCalendar = useCallback(async (date) => {
    if (!from || !to || !date) return;
    setLoading(true);
    try {
      const month = date.slice(0, 7); // YYYY-MM
      const res   = await getPriceCalendar(from, to, month, seatClass, adults);
      const rows  = res.data?.data || [];
      const map   = {};
      rows.forEach((r) => { map[r.flight_date.slice(0, 10)] = Number(r.min_price); });
      setCalData((prev) => ({ ...prev, ...map })); // merge để giữ data các tháng khác nhau khi navigate
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [from, to, seatClass, adults]);

  // Xóa data cũ khi route hoặc hạng ghế thay đổi — tránh hiển thị giá sai class
  useEffect(() => {
    setCalData({});
  }, [from, to, seatClass, adults]);

  useEffect(() => {
    if (selectedDate) fetchCalendar(selectedDate);
  }, [selectedDate, fetchCalendar]);

  if (!from || !to || !selectedDate) return null;

  // Tạo mảng 5 ngày: center = selectedDate + offset
  const today      = new Date().toISOString().slice(0, 10);
  const centerDate = addDay(selectedDate, offset);
  const days       = Array.from({ length: 5 }, (_, i) => addDay(centerDate, i - WINDOW));

  // Không cho scroll trái khi ngày đầu tiên <= hôm nay
  const canGoLeft  = days[0] > today;

  const selectedPrice = calData[selectedDate];

  const goToDate = (dateStr) => {
    if (dateStr <= today) return; // Không cho chọn ngày quá khứ
    const params = new URLSearchParams(window.location.search);
    params.set("departureDate", dateStr);
    navigate(`/flights?${params.toString()}`);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.title}><LuCalendarDays size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />{t("priceCalendar.title")}</p>
        <button
          className={styles.navBtn}
          onClick={() => setOffset((o) => o - 1)}
          disabled={!canGoLeft}
        ><LuChevronLeft size={16}/></button>
        <button
          className={styles.navBtn}
          onClick={() => setOffset((o) => o + 1)}
          disabled={offset >= 30}
        ><LuChevronRight size={16}/></button>
      </div>

      <div className={styles.grid}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.skCell} />)
          : days.map((day) => {
              const price    = calData[day];
              const isToday  = day === selectedDate;
              const isPast   = day < today;
              const diff     = price && selectedPrice ? price - selectedPrice : null;
              const cheaper  = diff !== null && diff < 0;
              const pricier  = diff !== null && diff > 0;
              const d        = new Date(day + "T00:00:00");

              return (
                <div
                  key={day}
                  className={`${styles.cell} ${isToday ? styles.cellSelected : ""} ${isPast ? styles.cellPast : ""} ${!isToday && !isPast && cheaper ? styles.cellCheaper : ""} ${!isToday && !isPast && pricier ? styles.cellPricier : ""}`}
                  onClick={() => !isToday && !isPast && goToDate(day)}
                  style={{ cursor: isToday || isPast ? "default" : "pointer" }}
                >
                  <p className={styles.dayLabel}>{DAY_LABELS[d.getDay()]}</p>
                  <p className={styles.dateNum}>{d.getDate()}/{d.getMonth() + 1}</p>
                  {price
                    ? <p className={styles.cellPrice}>{fmtShort(price)}</p>
                    : <p className={styles.noPrice}>—</p>}
                  {!isToday && diff !== null && (
                    <p className={`${styles.diffLabel} ${pricier ? styles.diffPricier : ""}`}>
                      {cheaper ? `↓ ${fmtShort(Math.abs(diff))}` : `↑ ${fmtShort(diff)}`}
                    </p>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}
