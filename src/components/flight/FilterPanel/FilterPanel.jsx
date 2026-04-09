import styles from "./FilterPanel.module.css";
import { useTranslation } from "react-i18next";

const TIME_SLOTS = [
  { label: "00:00 - 06:00", value: "00-06" },
  { label: "06:00 - 12:00", value: "06-12" },
  { label: "12:00 - 18:00", value: "12-18" },
  { label: "18:00 - 24:00", value: "18-24" },
];

const getDurationMinutes = (label) => {
  if (!label) return 0;
  const match = label.match(/(\d+)h\s*(\d+)?m?/);
  if (!match) return 0;
  return parseInt(match[1] || 0) * 60 + parseInt(match[2] || 0);
};

const FilterPanel = ({ filters, setFilters, outboundFlights = [], returnFlights = [] }) => {
  const { t } = useTranslation();
  const allFlights = [...outboundFlights, ...returnFlights];

  const airlines = [
    ...new Map(
      allFlights.map((f) => {
        const code = f?.airline?.code || f?.airline_code;
        const name = f?.airline?.name || f?.airline_name;
        return [code, { code, name }];
      }),
    ).values(),
  ].filter((a) => a.code);

  const allPrices = allFlights.map((f) => f?.seat?.total_price || 0).filter(Boolean);
  const minPrice = allPrices.length ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length ? Math.max(...allPrices) : 10000000;
  const currentMax = filters.priceMax ?? maxPrice;

  const allDurations = allFlights.map((f) => getDurationMinutes(f?.duration_label)).filter(Boolean);
  const maxDuration = allDurations.length ? Math.max(...allDurations) : 600;
  const currentDuration = filters.durationMax ?? maxDuration;

  const toggleAirline = (code) => {
    setFilters((prev) => ({
      ...prev,
      airlines: prev.airlines.includes(code)
        ? prev.airlines.filter((v) => v !== code)
        : [...prev.airlines, code],
    }));
  };

  const toggleSlot = (type, value) => {
    setFilters((prev) => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter((v) => v !== value)
        : [...prev[type], value],
    }));
  };

  const formatPrice = (val) => new Intl.NumberFormat("vi-VN").format(val) + " VND";

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const handleReset = () => {
    setFilters({ airlines: [], priceMax: null, departureSlots: [], arrivalSlots: [], durationMax: null, sortPrice: null });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3>{t("filter.title")}</h3>
        <button className={styles.resetBtn} onClick={handleReset}>{t("filter.reset")}</button>
      </div>

      {/* SORT */}
      <div className={styles.group}>
        <p className={styles.groupTitle}>{t("filter.sortByPrice")}</p>
        <div className={styles.sortRow}>
          <button
            className={`${styles.sortBtn} ${filters.sortPrice === "asc" ? styles.sortActive : ""}`}
            onClick={() => setFilters((prev) => ({ ...prev, sortPrice: prev.sortPrice === "asc" ? null : "asc" }))}
          >
            {t("filter.lowestFirst")}
          </button>
          <button
            className={`${styles.sortBtn} ${filters.sortPrice === "desc" ? styles.sortActive : ""}`}
            onClick={() => setFilters((prev) => ({ ...prev, sortPrice: prev.sortPrice === "desc" ? null : "desc" }))}
          >
            {t("filter.highestFirst")}
          </button>
        </div>
      </div>

      {/* PRICE */}
      <div className={styles.group}>
        <p className={styles.groupTitle}>{t("filter.price")}</p>
        <div className={styles.rangeLabels}>
          <span>{formatPrice(minPrice)}</span>
          <span className={styles.rangeValue}>{formatPrice(currentMax)}</span>
        </div>
        <input
          type="range" className={styles.range}
          min={minPrice} max={maxPrice} step={50000} value={currentMax}
          onChange={(e) => setFilters((prev) => ({ ...prev, priceMax: Number(e.target.value) }))}
        />
      </div>

      {/* AIRLINES */}
      <div className={styles.group}>
        <p className={styles.groupTitle}>{t("filter.airlines")}</p>
        {airlines.length === 0 ? (
          <p className={styles.empty}>{t("filter.noAirlines")}</p>
        ) : (
          airlines.map((airline) => (
            <label key={airline.code} className={styles.checkLabel}>
              <input type="checkbox" checked={filters.airlines.includes(airline.code)} onChange={() => toggleAirline(airline.code)} />
              {airline.name}
            </label>
          ))
        )}
      </div>

      {/* DEPARTURE TIME */}
      <div className={styles.group}>
        <p className={styles.groupTitle}>{t("filter.departureTime")}</p>
        <div className={styles.slots}>
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.value}
              className={`${styles.slot} ${filters.departureSlots.includes(slot.value) ? styles.slotActive : ""}`}
              onClick={() => toggleSlot("departureSlots", slot.value)}
            >
              <span>{slot.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ARRIVAL TIME */}
      <div className={styles.group}>
        <p className={styles.groupTitle}>{t("filter.arrivalTime")}</p>
        <div className={styles.slots}>
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.value}
              className={`${styles.slot} ${filters.arrivalSlots.includes(slot.value) ? styles.slotActive : ""}`}
              onClick={() => toggleSlot("arrivalSlots", slot.value)}
            >
              <span>{slot.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DURATION */}
      <div className={styles.group}>
        <p className={styles.groupTitle}>{t("filter.flightDuration")}</p>
        <div className={styles.rangeLabels}>
          <span>0h</span>
          <span className={styles.rangeValue}>{t("filter.max", { value: formatDuration(currentDuration) })}</span>
        </div>
        <input
          type="range" className={styles.range}
          min={0} max={maxDuration} step={30} value={currentDuration}
          onChange={(e) => setFilters((prev) => ({ ...prev, durationMax: Number(e.target.value) }))}
        />
      </div>
    </div>
  );
};

export default FilterPanel;
