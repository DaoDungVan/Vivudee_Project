import { useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import styles from "./DateRangePicker.module.css";

const DAYS_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const MONTHS_VI = [
  "Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
  "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12",
];
const MONTHS_EN = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const toStr = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const getGrid = (year, month) => {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = (firstDow + 6) % 7;                 // Mon=0
  const total   = new Date(year, month + 1, 0).getDate();
  const cells   = Array(offset).fill(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
};

const todayStr = () => {
  const n = new Date();
  return toStr(n.getFullYear(), n.getMonth(), n.getDate());
};

export default function DateRangePicker({
  startDate, endDate, tripType, minDate, lang = "vi",
  onChange, onClose,
}) {
  const isVi   = lang === "vi";
  const DAYS   = isVi ? DAYS_VI   : DAYS_EN;
  const MONTHS = isVi ? MONTHS_VI : MONTHS_EN;
  const TODAY  = todayStr();
  const MIN    = minDate || TODAY;

  const initDate = startDate ? new Date(startDate + "T00:00:00") : new Date();
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [start,     setStart]     = useState(startDate || null);
  const [end,       setEnd]       = useState(endDate   || null);
  const [hover,     setHover]     = useState(null);
  // "start" | "end"
  const [picking, setPicking] = useState(
    startDate && !endDate && tripType === "roundtrip" ? "end" : "start"
  );

  // Right month
  const rightMonth = (viewMonth + 1) % 12;
  const rightYear  = viewMonth === 11 ? viewYear + 1 : viewYear;

  const goPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (dateStr) => {
    if (dateStr < MIN) return;

    if (tripType !== "roundtrip") {
      // One-way: chọn ngày → áp dụng + đóng ngay
      setStart(dateStr);
      onChange(dateStr, null);
      onClose();
      return;
    }

    if (picking === "start" || !start) {
      setStart(dateStr); setEnd(null); setPicking("end");
    } else {
      if (dateStr < start) {
        // Chọn ngày trước ngày đi → reset lại từ đầu
        setStart(dateStr); setEnd(null); setPicking("end");
      } else {
        // Round-trip: chọn xong ngày về → áp dụng + đóng ngay
        setEnd(dateStr); setPicking("start");
        onChange(start, dateStr);
        onClose();
      }
    }
  };

  const handleApply = () => {
    if (!start) return;
    onChange(start, end || null);
    onClose();
  };

  // range helpers
  const effectiveEnd = (hover && picking === "end" && start) ? hover : end;
  const lo = start && effectiveEnd ? (start <= effectiveEnd ? start : effectiveEnd) : null;
  const hi = start && effectiveEnd ? (start <= effectiveEnd ? effectiveEnd : start) : null;

  const renderMonth = (year, month) => {
    const grid = getGrid(year, month);
    return (
      <div className={styles.monthBody}>
        <div className={styles.dayRow}>
          {DAYS.map(d => <span key={d} className={styles.dayHead}>{d}</span>)}
        </div>
        <div className={styles.daysGrid}>
          {grid.map((day, i) => {
            if (!day) return <span key={i} className={styles.empty} />;
            const ds      = toStr(year, month, day);
            const isPast  = ds < MIN;
            const isToday = ds === TODAY;
            const isSel   = ds === start || ds === end;
            const isStart = ds === lo;
            const isEnd   = ds === hi;
            const inRange = lo && hi && ds > lo && ds < hi;
            const hasRange = !!(lo && hi);

            const outer = [
              styles.day,
              isPast  && styles.dayPast,
              inRange && styles.inRange,
              isStart && hasRange && styles.edgeLeft,
              isEnd   && hasRange && styles.edgeRight,
            ].filter(Boolean).join(" ");

            const inner = [
              styles.dayInner,
              isSel  && styles.selInner,
              isToday && !isSel && styles.todayInner,
            ].filter(Boolean).join(" ");

            return (
              <span
                key={i}
                className={outer}
                onClick={() => !isPast && handleDay(ds)}
                onMouseEnter={() => !isPast && picking === "end" && start && setHover(ds)}
                onMouseLeave={() => setHover(null)}
              >
                <span className={inner}>{day}</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const canApply = !!start && (tripType !== "roundtrip" || !!end);
  const hint = tripType === "roundtrip" && start && !end
    ? (isVi ? "Chọn ngày về" : "Select return date")
    : "";

  return (
    <div className={styles.picker}>
      <div className={styles.calendars}>
        {/* Left month */}
        <div className={styles.monthCol}>
          <div className={styles.monthHeader}>
            <button className={styles.navBtn} onClick={goPrev} aria-label="prev">
              <LuChevronLeft size={18} />
            </button>
            <span className={styles.monthTitle}>{MONTHS[viewMonth]} {viewYear}</span>
            <span />
          </div>
          {renderMonth(viewYear, viewMonth)}
        </div>

        <div className={styles.sep} />

        {/* Right month */}
        <div className={styles.monthCol}>
          <div className={styles.monthHeader}>
            <span />
            <span className={styles.monthTitle}>{MONTHS[rightMonth]} {rightYear}</span>
            <button className={styles.navBtn} onClick={goNext} aria-label="next">
              <LuChevronRight size={18} />
            </button>
          </div>
          {renderMonth(rightYear, rightMonth)}
        </div>
      </div>

      {hint && (
        <div className={styles.footer}>
          <span className={styles.hint}>{hint}</span>
        </div>
      )}
    </div>
  );
}
