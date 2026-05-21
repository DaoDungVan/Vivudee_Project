import { useState, useEffect } from "react";
import styles from "./FlightCard.module.css";
import { useTranslation } from "react-i18next";
import planeIcon from "../../../assets/icons/plane.png";
import { LuCalendarDays, LuLuggage, LuBackpack, LuPlus, LuHeart } from "react-icons/lu";
import { addToWishlist, removeFromWishlist, isCachedInWishlist } from "../../../services/wishlistService";

const fmtShort = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}tr` : `${Math.round(n / 1000)}k`;

const FlightCard = ({ flight, onSelect, isSelected, cheapestCalPrice }) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  // Normalize seat class về lowercase để khớp backend
  const seatClass = (flight?.seat?.class || "economy").toLowerCase();
  const flightId  = flight?.flight_id || flight?.id;

  const [saved, setSaved] = useState(() => isCachedInWishlist(flightId, seatClass));
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => { setSaved(isCachedInWishlist(flightId, seatClass)); }, [flightId, seatClass]);

  const handleToggleSave = async (e) => {
    e.stopPropagation();
    if (!flightId) return;
    setSaveLoading(true);

    // Optimistic update — cập nhật UI ngay, revert nếu fail
    const prevSaved = saved;
    setSaved(!saved);

    try {
      if (prevSaved) {
        await removeFromWishlist(flightId, seatClass);
      } else {
        await addToWishlist(flightId, seatClass, flight);
      }
    } catch (err) {
      setSaved(prevSaved); // revert nếu lỗi
      console.error("[Wishlist] Toggle failed:", err?.response?.data || err?.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat("vi-VN").format(price) + " VND";
  const formatExtraBaggagePackages = (options = []) => {
    const validOptions = Array.isArray(options)
      ? options.filter((option) => Number(option?.kg || 0) > 0)
      : [];

    if (validOptions.length === 0) {
      return formatPrice(0);
    }

    return validOptions
      .sort((left, right) => Number(left?.kg || 0) - Number(right?.kg || 0))
      .map((option) => `${option.kg}kg ${formatPrice(Number(option?.price_per_person || 0))}`)
      .join(" · ");
  };

  const formatTime = (iso) => {
    if (!iso) return "--:--";
    const match = String(iso).match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : "--:--";
  };

  return (
    <>
      <div
        className={`${styles.card} ${isSelected ? styles.active : ""}`}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {/* LEFT */}
        <div className={styles.left}>
          <div className={styles.logoWrapper}>
            <img
              src={flight?.airline?.logo_url || planeIcon}
              alt={flight?.airline?.name || "airline"}
              onError={(e) => { e.target.onerror = null; e.target.src = planeIcon; }}
            />
          </div>
          <div className={styles.info}>
            <h3>{flight?.airline?.name || t("flightCard.unknownAirline")}</h3>
            {cheapestCalPrice && flight?.seat?.total_price <= cheapestCalPrice && (
              <span className={styles.bestPriceBadge}>
                {t("flightCard.bestPrice")}
              </span>
            )}
            {cheapestCalPrice && flight?.seat?.total_price > cheapestCalPrice && (
              <span className={styles.cheaperBadge}>
                <LuCalendarDays size={10} />
                {t("flightCard.cheaperBadge", { amount: fmtShort(flight.seat.total_price - cheapestCalPrice) })}
              </span>
            )}
            <div className={styles.timeline}>
              <span>{formatTime(flight?.departure?.time)}</span>
              <div className={styles.line}></div>
              <span>{formatTime(flight?.arrival?.time)}</span>
            </div>
            <p className={styles.duration}>
              {flight?.departure?.city} <strong>({flight?.departure?.code})</strong> →{" "}
              {flight?.arrival?.city} <strong>({flight?.arrival?.code})</strong>{" "}
              • {flight?.duration_label || "--"}
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className={styles.right}>
          <p className={styles.price}>
            <span className={styles.amount}>{formatPrice(flight?.seat?.total_price || 0)}</span>
            <span className={styles.per}>{t("flightCard.perCustomer")}</span>
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className={`${styles.saveBtn} ${saved ? styles.saveBtnActive : ""}`}
              onClick={handleToggleSave}
              disabled={saveLoading}
              title={saved ? t("flightCard.unsave") : t("flightCard.save")}
            >
              <LuHeart size={15} fill={saved ? "currentColor" : "none"} />
            </button>
            <button className={styles.btn} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
              {t("flightCard.select")}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className={styles.detail}>
          <div className={styles.detailContainer}>
            <div className={styles.timelineCol}>
              <div className={styles.timeBlock}>
                <h4>{formatTime(flight?.departure?.time)}</h4>
                <span>{flight?.departure?.date || ""}</span>
              </div>
              <div className={styles.verticalLine} />
              <div className={styles.timeBlock}>
                <h4>{formatTime(flight?.arrival?.time)}</h4>
                <span>{flight?.arrival?.date || ""}</span>
              </div>
            </div>
            <div className={styles.detailContent}>
              <div className={styles.airportBlock}>
                <h3>{flight?.departure?.city} ({flight?.departure?.code})</h3>
                <p>{flight?.departure?.airport_name}</p>
              </div>
              <div className={styles.airline}>
                <strong>{flight?.airline?.name}</strong>
                <span>{flight?.flight_number || "--"} · {flight?.seat?.class || "economy"}</span>
              </div>
              <div className={styles.baggage}>
                <p><LuLuggage size={13} />{t("flightCard.checkedBaggage", { kg: flight?.seat?.baggage_included_kg || 0 })}</p>
                <p><LuBackpack size={13} />{t("flightCard.cabinBaggage", { kg: flight?.seat?.carry_on_kg || 0 })}</p>
                <p><LuPlus size={13} />{t("flightCard.extraBaggage", { options: formatExtraBaggagePackages(flight?.seat?.extra_baggage_options) })}</p>
              </div>
              <div className={`${styles.airportBlock} ${styles.arrivalBlock}`}>
                <h3>{flight?.arrival?.city} ({flight?.arrival?.code})</h3>
                <p>{flight?.arrival?.airport_name}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlightCard;
