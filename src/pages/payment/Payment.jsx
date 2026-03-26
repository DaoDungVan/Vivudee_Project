import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import styles from "./Payment.module.css";

import visaImg     from "../../assets/images/payments/visa.png";
import masterImg   from "../../assets/images/payments/mastercard.svg";
import momoImg     from "../../assets/images/payments/momo.png";
import vietqrImg   from "../../assets/images/payments/vietqr.png";
import paypalImg   from "../../assets/images/payments/paypal.png";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + " VND";

const formatTime = (iso) => {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return isNaN(d) ? "--:--" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const PAYMENT_METHODS = [
  { id: "visa",    label: "Visa / Credit Card",  img: visaImg },
  { id: "master",  label: "Mastercard",           img: masterImg },
  { id: "momo",    label: "MoMo",                 img: momoImg },
  { id: "vietqr",  label: "VietQR",               img: vietqrImg },
  { id: "paypal",  label: "PayPal",               img: paypalImg },
];

const Payment = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  if (!state?.bookingData) {
    return (
      <div className={styles.empty}>
        <p>No booking data found.</p>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  const { bookingData, selectedFlights, passengers, contact, totalPrice } = state;
  const [selectedMethod, setSelectedMethod] = useState("vietqr");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  const bookingCode = bookingData.booking_code;
  const heldUntil   = bookingData.held_until;

  // QR data
  const qrContent = `BOOKING:${bookingCode}|AMOUNT:${totalPrice}|EMAIL:${contact?.email}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrContent)}`;

  const handleConfirmPayment = async () => {
    setLoading(true);
    // TODO: gọi POST /api/payments khi backend có endpoint
    // const res = await API.post("/payments", { booking_code: bookingCode, method: selectedMethod, amount: totalPrice });
    setTimeout(() => {
      setLoading(false);
      setPaid(true);
    }, 1500);
  };

  if (paid) {
    return (
      <>
        <NavBar />
        <div className={styles.successWrapper}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✅</div>
            <h2>Payment Successful!</h2>
            <p>Your booking has been confirmed.</p>
            <div className={styles.successCode}>{bookingCode}</div>
            <p className={styles.successNote}>A confirmation email has been sent to <strong>{contact?.email}</strong></p>
            <div className={styles.successBtns}>
              <button onClick={() => navigate(`/bookings?code=${bookingCode}`)} className={styles.btnPrimary}>
                View Booking
              </button>
              <button onClick={() => navigate("/")} className={styles.btnSecondary}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.layout}>

          {/* LEFT — Invoice */}
          <div className={styles.left}>
            <h2 className={styles.pageTitle}>Payment</h2>

            {/* Booking code + timer */}
            <div className={styles.bookingCodeCard}>
              <div>
                <p className={styles.codeLabel}>Booking Code</p>
                <p className={styles.codeValue}>{bookingCode}</p>
              </div>
              {heldUntil && (
                <div className={styles.heldTimer}>
                  <span>⏱ Hold expires:</span>
                  <strong>{formatDate(heldUntil)} {formatTime(heldUntil)}</strong>
                </div>
              )}
            </div>

            {/* Invoice */}
            <div className={styles.invoiceCard}>
              <h3 className={styles.invoiceTitle}>Invoice Detail</h3>

              {/* Outbound */}
              {selectedFlights?.outbound && (
                <div className={styles.invoiceRow}>
                  <div className={styles.invoiceLeft}>
                    <p className={styles.invoiceFlightLabel}>✈️ Outbound</p>
                    <p className={styles.invoiceFlightName}>
                      {selectedFlights.outbound.airline?.name} · {selectedFlights.outbound.flight_number}
                    </p>
                    <p className={styles.invoiceFlightRoute}>
                      {selectedFlights.outbound.departure?.code} → {selectedFlights.outbound.arrival?.code} &nbsp;
                      {formatTime(selectedFlights.outbound.departure?.time)} – {formatTime(selectedFlights.outbound.arrival?.time)}
                    </p>
                  </div>
                  <p className={styles.invoicePrice}>{fmt(selectedFlights.outbound.seat?.total_price || 0)}</p>
                </div>
              )}

              {/* Return */}
              {selectedFlights?.return && (
                <div className={styles.invoiceRow}>
                  <div className={styles.invoiceLeft}>
                    <p className={styles.invoiceFlightLabel}>🔁 Return</p>
                    <p className={styles.invoiceFlightName}>
                      {selectedFlights.return.airline?.name} · {selectedFlights.return.flight_number}
                    </p>
                    <p className={styles.invoiceFlightRoute}>
                      {selectedFlights.return.departure?.code} → {selectedFlights.return.arrival?.code} &nbsp;
                      {formatTime(selectedFlights.return.departure?.time)} – {formatTime(selectedFlights.return.arrival?.time)}
                    </p>
                  </div>
                  <p className={styles.invoicePrice}>{fmt(selectedFlights.return.seat?.total_price || 0)}</p>
                </div>
              )}

              {/* Passengers */}
              <div className={styles.invoiceDivider} />
              <div className={styles.invoicePassengers}>
                <p className={styles.invoiceSectionLabel}>Passengers</p>
                {passengers?.map((p, i) => (
                  <div key={i} className={styles.invoicePaxRow}>
                    <span>{p.fullName}</span>
                    <span className={styles.invoicePaxType}>{i < (state.passengers?.length) ? "Adult" : "Child"}</span>
                  </div>
                ))}
              </div>

              <div className={styles.invoiceDivider} />

              {/* Extras */}
              {bookingData.baggage?.extra_baggage_total > 0 && (
                <div className={styles.invoiceRowSmall}>
                  <span>Extra baggage</span>
                  <span>{fmt(bookingData.baggage.extra_baggage_total)}</span>
                </div>
              )}

              {/* Total */}
              <div className={styles.invoiceTotal}>
                <span>Total Amount</span>
                <span className={styles.invoiceTotalPrice}>{fmt(totalPrice)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className={styles.methodCard}>
              <h3 className={styles.methodTitle}>Payment Method</h3>
              <div className={styles.methodGrid}>
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    className={`${styles.methodBtn} ${selectedMethod === m.id ? styles.methodActive : ""}`}
                    onClick={() => setSelectedMethod(m.id)}
                  >
                    <img src={m.img} alt={m.label} />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              className={styles.payBtn}
              onClick={handleConfirmPayment}
              disabled={loading}
            >
              {loading ? "Processing..." : `Pay ${fmt(totalPrice)}`}
            </button>
          </div>

          {/* RIGHT — QR */}
          <div className={styles.right}>
            <div className={styles.qrCard}>
              <h3 className={styles.qrTitle}>Scan to Pay</h3>
              <img src={qrUrl} alt="QR Code" className={styles.qrImage} />
              <p className={styles.qrCode}>{bookingCode}</p>
              <p className={styles.qrAmount}>{fmt(totalPrice)}</p>
              <p className={styles.qrNote}>
                Open your banking app and scan this QR code to complete payment
              </p>
            </div>

            {/* Contact summary */}
            <div className={styles.contactCard}>
              <p className={styles.contactTitle}>Confirmation sent to</p>
              <p className={styles.contactEmail}>{contact?.email}</p>
              <p className={styles.contactPhone}>{contact?.phone}</p>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
};

export default Payment;