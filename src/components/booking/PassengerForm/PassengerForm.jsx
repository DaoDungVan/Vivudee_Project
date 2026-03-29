import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PassengerForm.module.css";

// Tạo baggage options từ extra_baggage_price của flight (lấy từ API)
const buildBaggageOptions = (flight) => {
  const pricePerKg = flight?.seat?.extra_baggage_price || 250000;
  return [
    { kg: 0,  label: "No extra", price: 0 },
    { kg: 5,  label: "+5 kg",    price: 5  * pricePerKg },
    { kg: 10, label: "+10 kg",   price: 10 * pricePerKg },
    { kg: 20, label: "+20 kg",   price: 20 * pricePerKg },
  ];
};

const PassengerForm = ({ selectedFlights, passengers, onClose }) => {
  const navigate = useNavigate();

  const [baggageOutbound, setBaggageOutbound] = useState(0);
  const [baggageReturn,   setBaggageReturn]   = useState(0);

  const paxCount = Math.max(
    1,
    Number(passengers?.adults || 0) + Number(passengers?.children || 0)
  );

  const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + " VND";

  const formatTime = (iso) => {
    if (!iso) return "--:--";
    const d = new Date(iso);
    if (isNaN(d)) return "--:--";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const outboundBaggageOptions = buildBaggageOptions(selectedFlights.outbound);
  const returnBaggageOptions   = buildBaggageOptions(selectedFlights.return);

  const extraOutbound = outboundBaggageOptions.find(o => o.kg === baggageOutbound)?.price || 0;
  const extraReturn   = returnBaggageOptions.find(o => o.kg === baggageReturn)?.price     || 0;

  // ✅ FIX: seat.total_price đã tính cho tất cả hành khách từ backend
  // Chỉ cộng thêm tiền baggage (nhân paxCount vì mỗi người chọn thêm)
  const totalPrice =
    (selectedFlights.outbound?.seat?.total_price || 0) + extraOutbound * paxCount +
    (selectedFlights.return?.seat?.total_price   || 0) + extraReturn   * paxCount;

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

  const FlightSummary = ({ flight, label, baggageKg, onBaggageChange, baggageOptions }) => (
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
            <span className={styles.direct}>Direct</span>
          </div>
          <div className={styles.timeBlock}>
            <span className={styles.time}>{formatTime(flight.arrival?.time)}</span>
            <span className={styles.code}>{flight.arrival?.code}</span>
          </div>
        </div>

        <div className={styles.priceBlock}>
          <span className={styles.price}>{fmt(flight.seat?.total_price || 0)}</span>
          <span className={styles.perPax}>all pax</span>
        </div>
      </div>

      {/* Included baggage info từ API */}
      <div className={styles.includedBaggage}>
        🧳 {flight.seat?.baggage_included_kg || 0}kg checked &nbsp;·&nbsp;
        🎒 {flight.seat?.carry_on_kg || 7}kg cabin included
      </div>

      {/* Baggage cards từ extra_baggage_price API */}
      <div className={styles.baggageSection}>
        <p className={styles.baggageTitle}>Extra baggage (per person)</p>
        <div className={styles.baggageCards}>
          {baggageOptions.map((opt) => (
            <button
              key={opt.kg}
              className={`${styles.baggageCard} ${baggageKg === opt.kg ? styles.baggageActive : ""}`}
              onClick={() => onBaggageChange(opt.kg)}
            >
              <span className={styles.baggageKg}>{opt.label}</span>
              <span className={styles.baggagePrice}>
                {opt.price === 0 ? "Free" : fmt(opt.price)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.headerTitle}>Review your trip</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.paxBadge}>
            👤 {passengers?.adults || 1} Adult{(passengers?.adults || 1) > 1 ? "s" : ""}
            {passengers?.children > 0 && ` · ${passengers.children} Child${passengers.children > 1 ? "ren" : ""}`}
          </div>

          {selectedFlights.outbound && (
            <FlightSummary
              flight={selectedFlights.outbound}
              label="Outbound flight"
              baggageKg={baggageOutbound}
              onBaggageChange={setBaggageOutbound}
              baggageOptions={outboundBaggageOptions}
            />
          )}

          {selectedFlights.return && (
            <FlightSummary
              flight={selectedFlights.return}
              label="Return flight"
              baggageKg={baggageReturn}
              onBaggageChange={setBaggageReturn}
              baggageOptions={returnBaggageOptions}
            />
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.totalBlock}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalPrice}>{fmt(totalPrice)}</span>
          </div>
          <button className={styles.continueBtn} onClick={handleContinue}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
};

export default PassengerForm;