import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../hooks/useTheme";
import { getBrandCombinations } from "../../../services/flightService";
import planeIcon from "../../../assets/icons/plane.png";
import styles from "./BrandComboBanner.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " VND";

// Gợi ý kết hợp 2 hãng khác nhau (chiều đi/về) khi nó rẻ hơn bay 1 hãng cả 2 chiều
export default function BrandComboBanner({
  from, to, departureDate, returnDate,
  seatClass = "economy", adults = 1, children = 0,
  outboundFlights = [], returnFlights = [],
  onApply,
}) {
  const { t }      = useTranslation();
  const { isDark } = useTheme();
  const [combo, setCombo]         = useState(null);
  const [saving, setSaving]       = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setCombo(null);
    setDismissed(false);
    if (!from || !to || !departureDate || !returnDate) return;

    let active = true;
    getBrandCombinations({
      departure_code: from, arrival_code: to,
      departure_date: departureDate, return_date: returnDate,
      seat_class: seatClass, adults, children, limit: 5,
    })
      .then((res) => {
        if (!active) return;
        const data = res.data?.data;
        // combo.highlight (set bởi backend) đảm bảo: khác hãng + giá nằm trong nhóm tốt nhất
        const best = data?.combinations?.find((c) => c.highlight);
        if (best) {
          setCombo(best);
          setSaving(data.summary?.saving_by_mixing > 0 ? data.summary.saving_by_mixing : 0);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [from, to, departureDate, returnDate, seatClass, adults, children]);

  if (!combo || dismissed) return null;

  const { outbound_flight: out, return_flight: ret } = combo;

  const logo = (airline) =>
    (isDark && airline?.logo_dark) ? airline.logo_dark : (airline?.logo_url || planeIcon);

  const handleApply = () => {
    const matchedOut = outboundFlights.find((f) => f.flight_id === out.flight_id) || null;
    const matchedRet = returnFlights.find((f) => f.flight_id === ret.flight_id) || null;
    if (matchedOut || matchedRet) onApply?.(matchedOut, matchedRet);
  };

  return (
    <div className={styles.banner}>
      <div className={styles.info}>
        <img src={logo(out.airline)} alt={out.airline?.name} className={styles.logo} onError={(e) => { e.target.src = planeIcon; }} />
        <img src={logo(ret.airline)} alt={ret.airline?.name} className={styles.logo} onError={(e) => { e.target.src = planeIcon; }} />
        <div className={styles.text}>
          <p className={styles.title}>
            {t("brandCombo.suggestion", { airline1: out.airline?.name, airline2: ret.airline?.name })}
          </p>
          <p className={styles.sub}>
            {saving > 0
              ? t("brandCombo.savingLabel", { amount: fmt(saving) })
              : t("brandCombo.bestValueLabel")}
            {" · "}{t("brandCombo.totalLabel", { amount: fmt(combo.total_price) })}
          </p>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.applyBtn} onClick={handleApply}>{t("brandCombo.applyBtn")}</button>
        <button className={styles.closeBtn} onClick={() => setDismissed(true)} aria-label="close">✕</button>
      </div>
    </div>
  );
}
