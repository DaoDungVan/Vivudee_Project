import { useState } from "react";
import styles from "./PassengerForm.module.css";

const PassengerForm = ({ selectedFlights, passengers, onClose }) => {
  const [baggage, setBaggage] = useState({
    outbound: 0,
    return: 0,
  });

  const handleBaggageChange = (type, kg) => {
    setBaggage((prev) => ({
      ...prev,
      [type]: Number(kg),
    }));
  };

  const paxCount = Math.max(
    1,
    Number(passengers?.adults || 0) + Number(passengers?.children || 0),
  );

  const formatTime24 = (iso) => {
    if (!iso) return "--:--";
    const d = new Date(iso);
    if (isNaN(d)) return "--:--";
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const totalPrice = (() => {
    let total = 0;

    if (selectedFlights.outbound) {
      total += (selectedFlights.outbound.seat?.total_price || 0) * paxCount;
      total += baggage.outbound * 25000;
    }

    if (selectedFlights.return) {
      total += (selectedFlights.return.seat?.total_price || 0) * paxCount;
      total += baggage.return * 25000;
    }

    return total;
  })();

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        {/* HEADER */}
        <div className={styles.header}>
          <h3>Xem lại chuyến bay</h3>
          <button onClick={onClose}>✕</button>
        </div>

        {/* OUTBOUND */}
        {selectedFlights.outbound && (
          <div className={styles.flightBox}>
            <h4>Khởi hành</h4>

            <div className={styles.flightRow}>
              {/* LEFT */}
              <div>
                <p className={styles.airline}>
                  {selectedFlights.outbound.airline.name}
                </p>
                <p className={styles.flightCode}>
                  {selectedFlights.outbound.flight_number} •{" "}
                  {selectedFlights.outbound.seat?.class}
                </p>
              </div>

              {/* RIGHT TIMELINE */}
              <div className={styles.timeline}>
                <div>
                  <strong>{formatTime24(selectedFlights.outbound.departure?.time)}</strong>
                  <p>{selectedFlights.outbound.departure.code}</p>
                </div>

                <div className={styles.line}></div>

                <div>
                  <strong>{formatTime24(selectedFlights.outbound.arrival?.time)}</strong>
                  <p>{selectedFlights.outbound.arrival.code}</p>
                </div>
              </div>
            </div>

            {/* BAGGAGE */}
            <select
              value={baggage.outbound}
              onChange={(e) => handleBaggageChange("outbound", e.target.value)}
            >
              <option value={0}>0 kg</option>
              <option value={15}>+15 kg</option>
              <option value={20}>+20 kg</option>
            </select>
          </div>
        )}

        {/* RETURN */}
        {selectedFlights.return && (
          <div className={styles.flightBox}>
            <h4>Chuyến về</h4>

            <div className={styles.flightRow}>
              {/* LEFT */}
              <div>
                <p className={styles.airline}>{selectedFlights.return.airline.name}</p>
                <p className={styles.flightCode}>
                  {selectedFlights.return.flight_number} •{" "}
                  {selectedFlights.return.seat?.class}
                </p>
              </div>

              {/* RIGHT TIMELINE */}
              <div className={styles.timeline}>
                <div>
                  <strong>{formatTime24(selectedFlights.return.departure?.time)}</strong>
                  <p>{selectedFlights.return.departure.code}</p>
                </div>

                <div className={styles.line}></div>

                <div>
                  <strong>{formatTime24(selectedFlights.return.arrival?.time)}</strong>
                  <p>{selectedFlights.return.arrival.code}</p>
                </div>
              </div>
            </div>

            {/* BAGGAGE */}
            <select
              value={baggage.return}
              onChange={(e) => handleBaggageChange("return", e.target.value)}
            >
              <option value={0}>0 kg</option>
              <option value={15}>+15 kg</option>
              <option value={20}>+20 kg</option>
            </select>
          </div>
        )}

        {/* TOTAL */}
        <div className={styles.total}>
          {new Intl.NumberFormat("vi-VN").format(totalPrice)} VND
        </div>

        <button className={styles.btn}>Tiếp tục</button>
      </div>
    </div>
  );
};

export default PassengerForm;
