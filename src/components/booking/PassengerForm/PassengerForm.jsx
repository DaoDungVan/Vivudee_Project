import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./PassengerForm.module.css";

const buildBaggageOptions = (flight, t) => {
  const fixedKgs = [0, 5, 10, 20];
  const providedOptions = Array.isArray(flight?.seat?.extra_baggage_options)
    ? flight.seat.extra_baggage_options
    : [];

  if (providedOptions.length > 0) {
    const optionMap = new Map(
      providedOptions.map((option) => [Number(option?.kg || 0), Number(option?.price_per_person || 0)])
    );

    return fixedKgs.map((kg) => ({
      kg,
      label: kg > 0 ? `+${kg} kg` : t("passengerForm.noExtra"),
      price: optionMap.get(kg) || 0,
    }));
  }

  return fixedKgs.map((kg) => ({
    kg,
    label: kg > 0 ? `+${kg} kg` : t("passengerForm.noExtra"),
    price: 0,
  }));
};

const FlightSummary = ({
  flight,
  label,
  baggageKg,
  onBaggageChange,
  baggageOptions,
  formatTime,
  fmt,
  t,
}) => (
  <div className={styles.flightBox}>
    <p className={styles.boxLabel}>{label}</p>

    <div className={styles.flightRow}>
      <div className={styles.airlineInfo}>
        <img
          src={flight.airline?.logo_url || "https://cdn-icons-png.flaticon.com/512/34/34627.png"}
          alt={flight.airline?.name}
          className={styles.airlineLogo}
          onError={(e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/34/34627.png"; }}
        />
        <div>
          <p className={styles.airlineName}>{flight.airline?.name}</p>
          <p className={styles.flightCode}>{flight.flight_number} · {flight.seat?.class}</p>
        </div>
      </div>

      <div className={styles.timeline}>
        <div className={styles.timeBlock}>
          <span className={styles.time}>{formatTime(flight.departure?.time)}</span>
          <span className={styles.code}>{flight.departure?.code}</span>
        </div>
        <div className={styles.timelineLine}>
          <span className={styles.duration}>{flight.duration_label}</span>
          <div className={styles.line} />
          <span className={styles.direct}>{t("passengerForm.direct")}</span>
        </div>
        <div className={styles.timeBlock}>
          <span className={styles.time}>{formatTime(flight.arrival?.time)}</span>
          <span className={styles.code}>{flight.arrival?.code}</span>
        </div>
      </div>

      <div className={styles.priceBlock}>
        <span className={styles.price}>{fmt(flight.seat?.total_price || 0)}</span>
        <span className={styles.perPax}>{t("passengerForm.allPax")}</span>
      </div>
    </div>

    <div className={styles.includedBaggage}>
      🧳 {flight.seat?.baggage_included_kg || 0}kg checked &nbsp;·&nbsp;
      🎒 {flight.seat?.carry_on_kg || 7}kg cabin included
    </div>

    <div className={styles.baggageSection}>
      <p className={styles.baggageTitle}>{t("passengerForm.extraBaggage")}</p>
      <div className={styles.baggageCards}>
        {baggageOptions.map((opt) => (
          <button
            key={opt.kg}
            className={`${styles.baggageCard} ${baggageKg === opt.kg ? styles.baggageActive : ""}`}
            onClick={() => onBaggageChange(opt.kg)}
          >
            <span className={styles.baggageKg}>{opt.label}</span>
            <span className={styles.baggagePrice}>
              {opt.price === 0 ? t("passengerForm.free") : fmt(opt.price)}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const PassengerForm = ({ selectedFlights, passengers, onClose }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [baggageOutbound, setBaggageOutbound] = useState(0);
  const [baggageReturn, setBaggageReturn] = useState(0);

  const paxCount = Math.max(1, Number(passengers?.adults || 0) + Number(passengers?.children || 0));

  const fmt = (n) => `${new Intl.NumberFormat("vi-VN").format(n)} VND`;

  const formatTime = (iso) => {
    if (!iso) return "--:--";
    const d = new Date(iso);
    if (isNaN(d)) return "--:--";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const outboundBaggageOptions = buildBaggageOptions(selectedFlights.outbound, t);
  const returnBaggageOptions = buildBaggageOptions(selectedFlights.return, t);

  const extraOutbound = outboundBaggageOptions.find((o) => o.kg === baggageOutbound)?.price || 0;
  const extraReturn = returnBaggageOptions.find((o) => o.kg === baggageReturn)?.price || 0;

  const totalPrice =
    (selectedFlights.outbound?.seat?.total_price || 0) + extraOutbound * paxCount +
    (selectedFlights.return?.seat?.total_price || 0) + extraReturn * paxCount;

  const handleContinue = () => {
    navigate("/booking", {
      state: {
        selectedFlights,
        passengers,
        baggage: { outbound: baggageOutbound, return: baggageReturn },
        totalPrice,
      },
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.headerTitle}>{t("passengerForm.reviewTrip")}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.paxBadge}>
            👤 {passengers?.adults || 1} {t("passengerForm.adult")}{(passengers?.adults || 1) > 1 ? "s" : ""}
            {passengers?.children > 0 && ` · ${passengers.children} ${t("passengerForm.child")}${passengers.children > 1 ? "ren" : ""}`}
          </div>

          {selectedFlights.outbound && (
            <FlightSummary
              flight={selectedFlights.outbound}
              label={t("passengerForm.outboundFlight")}
              baggageKg={baggageOutbound}
              onBaggageChange={setBaggageOutbound}
              baggageOptions={outboundBaggageOptions}
              formatTime={formatTime}
              fmt={fmt}
              t={t}
            />
          )}

          {selectedFlights.return && (
            <FlightSummary
              flight={selectedFlights.return}
              label={t("passengerForm.returnFlight")}
              baggageKg={baggageReturn}
              onBaggageChange={setBaggageReturn}
              baggageOptions={returnBaggageOptions}
              formatTime={formatTime}
              fmt={fmt}
              t={t}
            />
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.totalBlock}>
            <span className={styles.totalLabel}>{t("passengerForm.total")}</span>
            <span className={styles.totalPrice}>{fmt(totalPrice)}</span>
          </div>
          <button className={styles.continueBtn} onClick={handleContinue}>
            {t("passengerForm.continue")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PassengerForm;
