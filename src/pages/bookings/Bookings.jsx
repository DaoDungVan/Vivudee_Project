import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { getBookingByCode, getMyBookings, cancelBooking } from "../../services/bookingService";
import styles from "./Bookings.module.css";

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

const STATUS_COLOR = {
  pending:   { bg: "#fff8e1", color: "#f39c12" },
  confirmed: { bg: "#e8f5e9", color: "#27ae60" },
  cancelled: { bg: "#fce4ec", color: "#e74c3c" },
  expired:   { bg: "#f5f5f5", color: "#999" },
};

const Bookings = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const isLoggedIn = !!localStorage.getItem("token");

  // Tabs: "lookup" | "my"
  const [tab, setTab]           = useState("lookup");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError]   = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const [myBookings, setMyBookings]   = useState([]);
  const [myFilter, setMyFilter]       = useState("all");
  const [myLoading, setMyLoading]     = useState(false);
  const [cancelLoading, setCancelLoading] = useState(null);

  // Auto lookup nếu có ?code= trong URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code   = params.get("code");
    if (code) {
      setLookupCode(code.toUpperCase());
      handleLookup(code.toUpperCase());
    }
  }, []);

  // Load my bookings khi switch tab
  useEffect(() => {
    if (tab === "my" && isLoggedIn) fetchMyBookings();
  }, [tab, myFilter]);

  const handleLookup = async (code) => {
    const c = (code || lookupCode).trim().toUpperCase();
    if (!c) return;
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    try {
      const res = await getBookingByCode(c);
      setLookupResult(res.data?.data);
    } catch (err) {
      setLookupError(err.response?.data?.error || "Booking not found.");
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    setMyLoading(true);
    try {
      const res = await getMyBookings(myFilter);
      setMyBookings(res.data?.data || []);
    } catch {
      setMyBookings([]);
    } finally {
      setMyLoading(false);
    }
  };

  const handleCancel = async (code) => {
    if (!window.confirm(`Cancel booking ${code}?`)) return;
    setCancelLoading(code);
    try {
      await cancelBooking(code);
      fetchMyBookings();
    } catch (err) {
      alert(err.response?.data?.error || "Cancel failed.");
    } finally {
      setCancelLoading(null);
    }
  };

  const StatusBadge = ({ status }) => {
    const s = STATUS_COLOR[status] || STATUS_COLOR.pending;
    return (
      <span className={styles.statusBadge} style={{ background: s.bg, color: s.color }}>
        {status}
      </span>
    );
  };

  const BookingCard = ({ b, showCancel }) => (
    <div className={styles.bookingCard} onClick={() => { setLookupCode(b.booking_code); setTab("lookup"); handleLookup(b.booking_code); }}>
      <div className={styles.cardTop}>
        <div>
          <p className={styles.cardCode}>{b.booking_code}</p>
          <p className={styles.cardDate}>Booked {formatDate(b.created_at)}</p>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <div className={styles.cardFlight}>
        <div className={styles.cardRoute}>
          <strong>{b.flight?.departure?.code}</strong>
          <span className={styles.cardArrow}>→</span>
          <strong>{b.flight?.arrival?.code}</strong>
        </div>
        <div className={styles.cardTimes}>
          {formatTime(b.flight?.departure?.time)} · {formatDate(b.flight?.departure?.time)}
        </div>
      </div>
      <div className={styles.cardBottom}>
        <span className={styles.cardAirline}>{b.flight?.airline?.name}</span>
        <span className={styles.cardPrice}>{fmt(b.final_amount ?? b.total_price)}</span>
      </div>
      {showCancel && b.status === "confirmed" && (
        <button
          className={styles.cancelBtn}
          disabled={cancelLoading === b.booking_code}
          onClick={(e) => { e.stopPropagation(); handleCancel(b.booking_code); }}
        >
          {cancelLoading === b.booking_code ? "Cancelling..." : "Cancel"}
        </button>
      )}
    </div>
  );

  const LookupDetail = ({ data }) => (
    <div className={styles.detailCard}>
      <div className={styles.detailHeader}>
        <div>
          <p className={styles.detailCodeLabel}>Booking Code</p>
          <p className={styles.detailCode}>{data.booking_code}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {/* Outbound */}
      <div className={styles.detailFlight}>
        <p className={styles.detailFlightLabel}>✈️ Outbound Flight</p>
        <div className={styles.detailFlightRow}>
          <div>
            <p className={styles.detailAirline}>{data.outbound_flight?.airline?.name}</p>
            <p className={styles.detailFlightNum}>{data.outbound_flight?.flight_number} · {data.outbound_flight?.seat_class}</p>
          </div>
          <div className={styles.detailTimes}>
            <span>{data.outbound_flight?.departure?.code} {formatTime(data.outbound_flight?.departure?.time)}</span>
            <span className={styles.detailArrow}>→</span>
            <span>{data.outbound_flight?.arrival?.code} {formatTime(data.outbound_flight?.arrival?.time)}</span>
          </div>
          <p className={styles.detailFlightDate}>{formatDate(data.outbound_flight?.departure?.time)}</p>
        </div>
      </div>

      {/* Return */}
      {data.return_flight && (
        <div className={styles.detailFlight}>
          <p className={styles.detailFlightLabel}>🔁 Return Flight</p>
          <div className={styles.detailFlightRow}>
            <div>
              <p className={styles.detailAirline}>{data.return_flight?.airline?.name}</p>
              <p className={styles.detailFlightNum}>{data.return_flight?.flight_number} · {data.return_flight?.seat_class}</p>
            </div>
            <div className={styles.detailTimes}>
              <span>{data.return_flight?.departure?.code} {formatTime(data.return_flight?.departure?.time)}</span>
              <span className={styles.detailArrow}>→</span>
              <span>{data.return_flight?.arrival?.code} {formatTime(data.return_flight?.arrival?.time)}</span>
            </div>
            <p className={styles.detailFlightDate}>{formatDate(data.return_flight?.departure?.time)}</p>
          </div>
        </div>
      )}

      {/* Passengers */}
      <div className={styles.detailSection}>
        <p className={styles.detailSectionTitle}>Passengers</p>
        {data.passengers?.list?.filter(p => p.flight_type === "outbound").map((p, i) => (
          <div key={i} className={styles.detailPaxRow}>
            <span>{p.full_name}</span>
            <span className={styles.detailPaxMeta}>{p.passenger_type} · Seat {p.seat_number || "TBA"}</span>
            {p.extra_baggage_kg > 0 && <span className={styles.detailBaggage}>+{p.extra_baggage_kg}kg</span>}
          </div>
        ))}
      </div>

      {/* Price */}
      <div className={styles.detailPrice}>
        <span>Total</span>
        <div className={styles.detailPriceRight}>
          {data.price?.discount_amount > 0 && (
            <span className={styles.detailOriginalPrice}>{fmt(data.price.total_price)}</span>
          )}
          <span className={styles.detailPriceValue}>
            {fmt(data.price?.final_amount ?? data.price?.total_price ?? 0)}
          </span>
          {data.price?.discount_amount > 0 && (
            <span className={styles.detailDiscountBadge}>-{fmt(data.price.discount_amount)}</span>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className={styles.detailContact}>
        <p>📧 {data.contact?.email}</p>
        {data.contact?.phone && <p>📞 {data.contact?.phone}</p>}
      </div>
    </div>
  );

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <h2 className={styles.pageTitle}>Bookings</h2>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === "lookup" ? styles.tabActive : ""}`} onClick={() => setTab("lookup")}>
            🔍 Lookup by Code
          </button>
          {isLoggedIn && (
            <button className={`${styles.tab} ${tab === "my" ? styles.tabActive : ""}`} onClick={() => setTab("my")}>
              📋 My Bookings
            </button>
          )}
        </div>

        {/* LOOKUP TAB */}
        {tab === "lookup" && (
          <div className={styles.lookupSection}>
            <div className={styles.lookupBox}>
              <input
                type="text"
                placeholder="Enter booking code (e.g. AB123456)"
                className={styles.lookupInput}
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              />
              <button className={styles.lookupBtn} onClick={() => handleLookup()} disabled={lookupLoading}>
                {lookupLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {lookupError && <p className={styles.lookupError}>{lookupError}</p>}
            {lookupResult && <LookupDetail data={lookupResult} />}
          </div>
        )}

        {/* MY BOOKINGS TAB */}
        {tab === "my" && isLoggedIn && (
          <div className={styles.mySection}>
            <div className={styles.filterRow}>
              {["all", "completed", "upcoming", "cancelled"].map((f) => (
                <button
                  key={f}
                  className={`${styles.filterBtn} ${myFilter === f ? styles.filterActive : ""}`}
                  onClick={() => setMyFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {myLoading ? (
              <p className={styles.loading}>Loading...</p>
            ) : myBookings.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No bookings found.</p>
                <button onClick={() => navigate("/flights")}>Search Flights</button>
              </div>
            ) : (
              <div className={styles.bookingGrid}>
                {myBookings.map((b) => (
                  <BookingCard key={b.booking_id} b={b} showCancel />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Bookings;