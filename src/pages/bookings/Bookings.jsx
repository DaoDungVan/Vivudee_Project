import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { useTranslation } from "react-i18next";
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

const Bookings = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { t }      = useTranslation();
  const isLoggedIn = !!localStorage.getItem("token");

  const [tab,           setTab]           = useState("lookup");
  const [lookupCode,    setLookupCode]    = useState("");
  const [lookupResult,  setLookupResult]  = useState(null);
  const [lookupError,   setLookupError]   = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const [myBookings,    setMyBookings]    = useState([]);
  const [myFilter,      setMyFilter]      = useState("all");
  const [myLoading,     setMyLoading]     = useState(false);
  const [cancelLoading, setCancelLoading] = useState(null);
  const [cancelError,   setCancelError]   = useState("");
  const [confirmCancel, setConfirmCancel] = useState(null);

  const getStatusColor = (status) => {
    const map = {
      pending:   { bg: "#fff8e1", color: "#f39c12", label: t("bookings.status_pending") },
      confirmed: { bg: "#e8f5e9", color: "#27ae60", label: t("bookings.status_confirmed") },
      cancelled: { bg: "#fce4ec", color: "#e74c3c", label: t("bookings.status_cancelled") },
      expired:   { bg: "#f5f5f5", color: "#999",    label: t("bookings.status_expired") },
    };
    return map[status?.toLowerCase()] || map.pending;
  };

  const handleLookup = useCallback(async (code) => {
    const c = (code || lookupCode).trim().toUpperCase();
    if (!c) return;
    setLookupLoading(true); setLookupError(""); setLookupResult(null);
    try {
      const res = await getBookingByCode(c);
      setLookupResult(res.data?.data);
    } catch (err) {
      setLookupError(err.response?.data?.error || "Booking not found.");
    } finally {
      setLookupLoading(false);
    }
  }, [lookupCode]);

  const fetchMyBookings = useCallback(async () => {
    setMyLoading(true);
    try {
      const res = await getMyBookings(myFilter);
      setMyBookings(res.data?.data || []);
    } catch { setMyBookings([]); } finally { setMyLoading(false); }
  }, [myFilter]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code   = params.get("code");
    if (code) {
      setLookupCode(code.toUpperCase());
      handleLookup(code.toUpperCase());
    }
  }, [location.search, handleLookup]);

  useEffect(() => {
    if (tab === "my" && isLoggedIn) fetchMyBookings();
  }, [tab, isLoggedIn, fetchMyBookings]);

  const handleCancel = async (code) => {
    setConfirmCancel(null); setCancelLoading(code); setCancelError("");
    try {
      await cancelBooking(code);
      fetchMyBookings();
    } catch (err) {
      setCancelError(err.response?.data?.error || "Cancel failed.");
    } finally { setCancelLoading(null); }
  };

  const handleContinuePayment = (data) => {
    navigate("/payment", {
      state: {
        bookingData: { booking_id: data.booking_id || data.id, booking_code: data.booking_code, held_until: null },
        contact:    data.contact,
        totalPrice: data.price?.final_amount ?? data.price?.total_price ?? 0,
        passengers: data.passengers?.list?.filter((p) => p.flight_type === "outbound")?.map((p) => ({ fullName: p.full_name })) || [],
      },
    });
  };

  const StatusBadge = ({ status }) => {
    const s = getStatusColor(status);
    return <span className={styles.statusBadge} style={{ background: s.bg, color: s.color }}>{s.label || status}</span>;
  };

  const BookingCard = ({ b, showCancel }) => (
    <div className={styles.bookingCard} onClick={() => { setLookupCode(b.booking_code); setTab("lookup"); handleLookup(b.booking_code); }}>
      <div className={styles.cardTop}>
        <div>
          <p className={styles.cardCode}>{b.booking_code}</p>
          <p className={styles.cardDate}>{t("bookings.booked", { date: formatDate(b.created_at) })}</p>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <div className={styles.cardFlight}>
        <div className={styles.cardRoute}>
          <strong>{b.flight?.departure?.code}</strong>
          <span className={styles.cardArrow}>→</span>
          <strong>{b.flight?.arrival?.code}</strong>
        </div>
        <div className={styles.cardTimes}>{formatTime(b.flight?.departure?.time)} · {formatDate(b.flight?.departure?.time)}</div>
      </div>
      <div className={styles.cardBottom}>
        <span className={styles.cardAirline}>{b.flight?.airline?.name}</span>
        <span className={styles.cardPrice}>{fmt(b.final_amount ?? b.total_price)}</span>
      </div>
      {showCancel && b.status === "confirmed" && (
        confirmCancel === b.booking_code ? (
          <div className={styles.confirmRow}>
            <span className={styles.confirmText}>{t("bookings.confirmCancel")}</span>
            <button className={styles.confirmYes} disabled={cancelLoading === b.booking_code}
              onClick={(e) => { e.stopPropagation(); handleCancel(b.booking_code); }}>
              {cancelLoading === b.booking_code ? t("bookings.cancelling") : t("bookings.confirmYes")}
            </button>
            <button className={styles.confirmNo} onClick={(e) => { e.stopPropagation(); setConfirmCancel(null); }}>
              {t("bookings.confirmNo")}
            </button>
          </div>
        ) : (
          <button className={styles.cancelBtn} onClick={(e) => { e.stopPropagation(); setConfirmCancel(b.booking_code); }}>
            {t("bookings.cancelBtn")}
          </button>
        )
      )}
    </div>
  );

  const LookupDetail = ({ data }) => (
    <div className={styles.detailCard}>
      <div className={styles.detailHeader}>
        <div>
          <p className={styles.detailCodeLabel}>{t("bookings.bookingCode")}</p>
          <p className={styles.detailCode}>{data.booking_code}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <div className={styles.detailFlight}>
        <p className={styles.detailFlightLabel}>{t("bookings.outboundFlight")}</p>
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

      {data.return_flight && (
        <div className={styles.detailFlight}>
          <p className={styles.detailFlightLabel}>{t("bookings.returnFlight")}</p>
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

      <div className={styles.detailSection}>
        <p className={styles.detailSectionTitle}>{t("bookings.passengersSection")}</p>
        {data.passengers?.list?.filter((p) => p.flight_type === "outbound").map((p, i) => (
          <div key={i} className={styles.detailPaxRow}>
            <span>{p.full_name}</span>
            <span className={styles.detailPaxMeta}>
              {p.passenger_type === "child" ? t("bookings.childLabel") : p.passenger_type === "infant" ? t("bookings.infantLabel") : t("bookings.adultLabel")}
              &nbsp;·&nbsp;{t("bookings.seat", { number: p.seat_number || t("bookings.tbaSeat") })}
            </span>
            {p.extra_baggage_kg > 0 && <span className={styles.detailBaggage}>+{p.extra_baggage_kg}kg</span>}
          </div>
        ))}
      </div>

      <div className={styles.detailPrice}>
        <span>{t("bookings.totalPrice")}</span>
        <div className={styles.detailPriceRight}>
          {data.price?.discount_amount > 0 && <span className={styles.detailOriginalPrice}>{fmt(data.price.total_price)}</span>}
          <span className={styles.detailPriceValue}>{fmt(data.price?.final_amount ?? data.price?.total_price ?? 0)}</span>
          {data.price?.discount_amount > 0 && <span className={styles.detailDiscountBadge}>−{fmt(data.price.discount_amount)}</span>}
        </div>
      </div>

      <div className={styles.detailContact}>
        <p>📧 {data.contact?.email}</p>
        {data.contact?.phone && <p>📞 {data.contact?.phone}</p>}
      </div>

      {data.status === "pending" && (
        <button className={styles.continuePayBtn} onClick={() => handleContinuePayment(data)}>
          {t("bookings.continuePayment")}
        </button>
      )}
    </div>
  );

  const filterOptions = [
    { id: "all",       label: t("bookings.filterAll") },
    { id: "upcoming",  label: t("bookings.filterPending") },
    { id: "completed", label: t("bookings.filterCompleted") },
    { id: "cancelled", label: t("bookings.filterCancelled") },
  ];

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <h2 className={styles.pageTitle}>{t("bookings.title")}</h2>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === "lookup" ? styles.tabActive : ""}`} onClick={() => setTab("lookup")}>
            {t("bookings.lookupByCode")}
          </button>
          {isLoggedIn && (
            <button className={`${styles.tab} ${tab === "my" ? styles.tabActive : ""}`} onClick={() => setTab("my")}>
              {t("bookings.myBookings")}
            </button>
          )}
        </div>

        {tab === "lookup" && (
          <div className={styles.lookupSection}>
            <div className={styles.lookupBox}>
              <input
                type="text"
                placeholder={t("bookings.enterCode")}
                className={styles.lookupInput}
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              />
              <button className={styles.lookupBtn} onClick={() => handleLookup()} disabled={lookupLoading}>
                {lookupLoading ? t("bookings.searching") : t("bookings.search")}
              </button>
            </div>
            {lookupError  && <p className={styles.lookupError}>{lookupError}</p>}
            {lookupResult && <LookupDetail data={lookupResult} />}
          </div>
        )}

        {tab === "my" && isLoggedIn && (
          <div className={styles.mySection}>
            {cancelError && <div className={styles.cancelErrorBanner}>{cancelError}</div>}
            <div className={styles.filterRow}>
              {filterOptions.map((f) => (
                <button key={f.id} className={`${styles.filterBtn} ${myFilter === f.id ? styles.filterActive : ""}`} onClick={() => setMyFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            {myLoading ? (
              <p className={styles.loading}>{t("bookings.loading")}</p>
            ) : myBookings.length === 0 ? (
              <div className={styles.emptyState}>
                <p>{t("bookings.noBookingsFound")}</p>
                <button onClick={() => navigate("/flights")}>{t("bookings.searchFlights")}</button>
              </div>
            ) : (
              <div className={styles.bookingGrid}>
                {myBookings.map((b) => <BookingCard key={b.booking_id} b={b} showCancel />)}
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
