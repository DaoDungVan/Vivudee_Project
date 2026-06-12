import { useState, useEffect } from "react";
import styles from "./FlightCard.module.css";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../hooks/useTheme";
import planeIcon from "../../../assets/icons/plane.png";
import { LuCalendarDays, LuLuggage, LuBackpack, LuPlus, LuHeart, LuFlame, LuTrendingDown, LuTrendingUp } from "react-icons/lu";
import { addToWishlist, removeFromWishlist, isCachedInWishlist } from "../../../services/wishlistService";
import { getFlightPriceAnalysis } from "../../../services/flightService";

const fmtShort = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}tr` : `${Math.round(n / 1000)}k`;

// Phân loại season_info để chọn màu badge: peak (lễ/cao điểm), low (thấp điểm), info (mùa thường)
const getSeasonBadgeVariant = (seasonInfo) => {
  if (!seasonInfo) return null;
  const multiplier = Number(seasonInfo.multiplier) || 1;
  if (seasonInfo.isHoliday || multiplier >= 1.2) return "peak";
  if (multiplier < 1) return "low";
  return "info";
};

const FlightCard = ({ flight, onSelect, isSelected, cheapestCalPrice }) => {
  const [expanded, setExpanded] = useState(false);
  const [priceVisible, setPriceVisible] = useState(false);
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const airlineLogo = (isDark && flight?.airline?.logo_dark) ? flight.airline.logo_dark : (flight?.airline?.logo_url || planeIcon);

  useEffect(() => {
    const delay = 700 + Math.random() * 500;
    const timer = setTimeout(() => setPriceVisible(true), delay);
    return () => clearTimeout(timer);
  }, []);
  // Normalize seat class về lowercase để khớp backend
  const seatClass = (flight?.seat?.class || "economy").toLowerCase();
  const flightId  = flight?.flight_id || flight?.id;

  const [saved, setSaved] = useState(() => isCachedInWishlist(flightId, seatClass));
  const [saveLoading, setSaveLoading] = useState(false);
  const [priceAnalysis, setPriceAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Lazy-load phân tích giá chi tiết khi mở rộng card lần đầu
  useEffect(() => {
    if (!expanded || priceAnalysis || analysisLoading || !flightId) return;
    setAnalysisLoading(true);
    getFlightPriceAnalysis(flightId)
      .then((res) => setPriceAnalysis(res.data?.data || null))
      .catch(() => setPriceAnalysis(null))
      .finally(() => setAnalysisLoading(false));
  }, [expanded, priceAnalysis, analysisLoading, flightId]);

  const handleToggleSave = async (e) => {
    e.stopPropagation();
    if (!flightId) {
      console.warn("[Wishlist] flightId undefined — flight:", flight);
      return;
    }
    setSaveLoading(true);

    const prevSaved = saved;
    setSaved(!saved); // optimistic

    try {
      if (prevSaved) {
        await removeFromWishlist(flightId, seatClass);
      } else {
        await addToWishlist(flightId, seatClass, flight);
      }
    } catch (err) {
      setSaved(prevSaved); // revert
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Lỗi";
      console.error("[Wishlist] failed:", msg, "| flightId:", flightId, "| seatClass:", seatClass);
      // Hiện toast ngắn để dễ debug
      const toast = document.createElement("div");
      toast.textContent = `Wishlist error: ${msg}`;
      Object.assign(toast.style, { position:"fixed", bottom:"20px", left:"50%", transform:"translateX(-50%)", background:"#ef4444", color:"#fff", padding:"8px 16px", borderRadius:"8px", zIndex:99999, fontSize:"13px" });
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
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

  // Giá gốc trước khi áp hệ số mùa/ngày/nhu cầu — chỉ hiện khi khác giá hiện tại
  const originalTotalPrice = flight?.seat?.original_total_price;
  const currentTotalPrice = flight?.seat?.total_price || 0;
  const showOriginalPrice = originalTotalPrice > 0 && Math.round(originalTotalPrice) !== Math.round(currentTotalPrice);

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
              src={airlineLogo}
              alt={flight?.airline?.name || "airline"}
              onError={(e) => { e.target.onerror = null; e.target.src = planeIcon; }}
            />
          </div>
          <div className={styles.info}>
            <h3>{flight?.airline?.name || t("flightCard.unknownAirline")}</h3>
            {priceVisible && cheapestCalPrice && flight?.seat?.total_price <= cheapestCalPrice && (
              <span className={styles.bestPriceBadge}>
                {t("flightCard.bestPrice")}
              </span>
            )}
            {priceVisible && cheapestCalPrice && flight?.seat?.total_price > cheapestCalPrice && (
              <span className={styles.cheaperBadge}>
                <LuCalendarDays size={10} />
                {t("flightCard.cheaperBadge", { amount: fmtShort(flight.seat.total_price - cheapestCalPrice) })}
              </span>
            )}
            {flight?.season_info && (() => {
              const variant = getSeasonBadgeVariant(flight.season_info);
              const Icon = variant === "low" ? LuTrendingDown : LuFlame;
              return (
                <span
                  className={`${styles.seasonBadge} ${styles[`seasonBadge_${variant}`]}`}
                  title={flight.season_info.reason || ""}
                >
                  <Icon size={10} />
                  {flight.season_info.name} (×{flight.season_info.multiplier})
                </span>
              );
            })()}
            {flight?.price_alert && (
              <span
                className={`${styles.priceAlertBadge} ${styles[`priceAlert_${flight.price_alert.level}`]}`}
                title={flight.price_alert.message || ""}
              >
                <LuTrendingUp size={10} />
                {t(`flightCard.priceAlert.${flight.price_alert.level}`, { percent: flight.price_alert.percentage })}
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
          <div className={styles.priceCol}>
            {priceVisible && showOriginalPrice && (
              <div className={styles.originalPriceRow}>
                <span className={`${styles.originalPriceLabel} ${styles.priceReveal}`}>{t("flightCard.priceAnalysis.basePrice")}</span>
                <span className={`${styles.originalPrice} ${styles.priceReveal}`}>{formatPrice(originalTotalPrice)}</span>
              </div>
            )}
            <p className={styles.price}>
              {!priceVisible ? (
                <span className={styles.priceShimmer} />
              ) : (
                <>
                  <span className={`${styles.amount} ${styles.priceReveal}`}>
                    {formatPrice(currentTotalPrice)}
                  </span>
                  <span className={`${styles.per} ${styles.priceReveal}`}>
                    {t("flightCard.perCustomer")}
                  </span>
                </>
              )}
            </p>
          </div>
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

          <div className={styles.priceAnalysis}>
            <h4 className={styles.priceAnalysisTitle}>
              <LuTrendingUp size={14} /> {t("flightCard.priceAnalysis.title")}
            </h4>

            {analysisLoading && (
              <div className={styles.analysisLoading}>{t("flightCard.priceAnalysis.loading")}</div>
            )}

            {!analysisLoading && priceAnalysis && (
              <>
                {priceAnalysis.season && (
                  <div className={`${styles.analysisSeasonNote} ${(priceAnalysis.season.isHoliday || priceAnalysis.season.multiplier >= 1.2) ? styles.seasonNotePeak : ""}`}>
                    <LuFlame size={12} />
                    <span>{priceAnalysis.season.name} (×{priceAnalysis.season.multiplier}) — {priceAnalysis.season.reason}</span>
                  </div>
                )}

                <div className={styles.analysisGrid}>
                  <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>{t("flightCard.priceAnalysis.basePrice")}</span>
                    <span className={styles.analysisValue}>{formatPrice(priceAnalysis.basePrice)}</span>
                  </div>
                  <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>{t("flightCard.priceAnalysis.currentPrice")}</span>
                    <span className={styles.analysisValue}>{formatPrice(priceAnalysis.currentPrice)}</span>
                  </div>
                  <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>{t("flightCard.priceAnalysis.dayOfWeek", { label: priceAnalysis.pricingBreakdown?.dayOfWeek?.label })}</span>
                    <span className={styles.analysisValue}>×{priceAnalysis.pricingBreakdown?.dayOfWeek?.multiplier}</span>
                  </div>
                  <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>{t("flightCard.priceAnalysis.advanceBooking", { days: priceAnalysis.pricingBreakdown?.advanceBooking?.daysUntilDeparture })}</span>
                    <span className={styles.analysisValue}>×{priceAnalysis.pricingBreakdown?.advanceBooking?.multiplier}</span>
                  </div>
                  <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>{t("flightCard.priceAnalysis.demand", { rate: priceAnalysis.pricingBreakdown?.demand?.occupancyRate })}</span>
                    <span className={styles.analysisValue}>×{priceAnalysis.pricingBreakdown?.demand?.multiplier}</span>
                  </div>
                  <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>{t("flightCard.priceAnalysis.finalMultiplier")}</span>
                    <span className={`${styles.analysisValue} ${styles.analysisValueStrong}`}>×{priceAnalysis.pricingBreakdown?.finalMultiplier}</span>
                  </div>
                </div>

                {priceAnalysis.recommendation?.message ? (
                  <div className={`${styles.analysisRecommendation} ${styles[`recommend_${priceAnalysis.recommendation.urgency}`] || ""}`}>
                    <LuTrendingUp size={12} /> {priceAnalysis.recommendation.message}
                  </div>
                ) : (
                  <div className={styles.analysisRecommendation}>
                    {t("flightCard.priceAnalysis.stable")}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FlightCard;
