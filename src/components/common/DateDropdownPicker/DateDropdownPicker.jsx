import { useState, useRef, useEffect } from "react";
import { LuCalendar, LuChevronDown } from "react-icons/lu";
import styles from "./DateDropdownPicker.module.css";

const MONTHS_VI = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const daysInMonth = (y, m) => (y && m) ? new Date(y, m, 0).getDate() : 31;

const pad = (n) => String(n).padStart(2, "0");

export default function DateDropdownPicker({
  value = "",
  onChange,
  placeholder,
  hasError = false,
  lang = "vi",
  maxYear,
  minYear,
}) {
  const MONTHS  = lang === "vi" ? MONTHS_VI : MONTHS_EN;
  const thisYear = new Date().getFullYear();
  const MAX_Y = maxYear ?? thisYear;
  const MIN_Y = minYear ?? thisYear - 120;
  const YEARS = Array.from({ length: MAX_Y - MIN_Y + 1 }, (_, i) => MAX_Y - i);

  // Parse initial value
  const parse = (v) => {
    if (!v) return { y: "", m: "", d: "" };
    const [yr, mo, da] = v.split("-");
    return { y: yr || "", m: String(parseInt(mo || 0, 10)), d: String(parseInt(da || 0, 10)) };
  };

  const init = parse(value);
  const [selY, setSelY] = useState(init.y);
  const [selM, setSelM] = useState(init.m);
  const [selD, setSelD] = useState(init.d);
  const [open,  setOpen]  = useState(false);
  const [pos,   setPos]   = useState({ top: 0, left: 0 });

  const triggerRef = useRef(null);
  const popupRef   = useRef(null);

  // Sync when parent value changes (e.g. form reset)
  useEffect(() => {
    const p = parse(value);
    setSelY(p.y); setSelM(p.m); setSelD(p.d);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (!triggerRef.current?.contains(e.target) && !popupRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openPicker = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({
        top:  r.bottom + window.scrollY + 6,
        left: r.left   + window.scrollX,
      });
    }
    setOpen((p) => !p);
  };

  // Emit whenever all 3 are chosen
  const emit = (y, m, d) => {
    if (!y || !m || !d) return;
    const maxD = daysInMonth(Number(y), Number(m));
    const safeD = Math.min(Number(d), maxD);
    const str = `${y}-${pad(m)}-${pad(safeD)}`;
    onChange(str);
    setSelD(String(safeD));
    setOpen(false);
  };

  const handleY = (v) => { setSelY(v); emit(v, selM, selD); };
  const handleM = (v) => {
    setSelM(v);
    // Clamp day if needed
    const maxD = daysInMonth(Number(selY), Number(v));
    const newD  = selD && Number(selD) > maxD ? String(maxD) : selD;
    setSelD(newD);
    emit(selY, v, newD);
  };
  const handleD = (v) => { setSelD(v); emit(selY, selM, v); };

  // Display
  const display = selY && selM && selD
    ? `${pad(selD)}/${pad(selM)}/${selY}`
    : "";

  const ph = placeholder ?? (lang === "vi" ? "Chọn ngày sinh" : "Select date of birth");

  return (
    <div className={styles.wrap}>
      <div
        ref={triggerRef}
        className={`${styles.trigger} ${hasError ? styles.triggerError : ""} ${open ? styles.triggerOpen : ""}`}
        onClick={openPicker}
      >
        <LuCalendar size={14} className={styles.icon} />
        <span className={display ? styles.value : styles.placeholder}>
          {display || ph}
        </span>
        <LuChevronDown size={14} className={`${styles.chevron} ${open ? styles.chevronUp : ""}`} />
      </div>

      {open && (
        <div
          ref={popupRef}
          className={styles.popup}
          style={{ top: pos.top, left: pos.left }}
        >
          <p className={styles.popupTitle}>
            {lang === "vi" ? "Chọn ngày sinh" : "Select date of birth"}
          </p>
          <div className={styles.selects}>
            {/* Day */}
            <div className={styles.col}>
              <label className={styles.colLabel}>{lang === "vi" ? "Ngày" : "Day"}</label>
              <div className={styles.selectWrap}>
                <select
                  value={selD}
                  onChange={(e) => handleD(e.target.value)}
                  className={styles.select}
                >
                  <option value="">--</option>
                  {Array.from(
                    { length: daysInMonth(Number(selY), Number(selM)) },
                    (_, i) => i + 1
                  ).map((d) => (
                    <option key={d} value={d}>{pad(d)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Month */}
            <div className={styles.col}>
              <label className={styles.colLabel}>{lang === "vi" ? "Tháng" : "Month"}</label>
              <div className={styles.selectWrap}>
                <select
                  value={selM}
                  onChange={(e) => handleM(e.target.value)}
                  className={styles.select}
                >
                  <option value="">--</option>
                  {MONTHS.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year */}
            <div className={`${styles.col} ${styles.colYear}`}>
              <label className={styles.colLabel}>{lang === "vi" ? "Năm" : "Year"}</label>
              <div className={styles.selectWrap}>
                <select
                  value={selY}
                  onChange={(e) => handleY(e.target.value)}
                  className={styles.select}
                >
                  <option value="">----</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
