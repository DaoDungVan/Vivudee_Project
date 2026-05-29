import { useState, useEffect, useCallback, useRef } from "react";
import { LuPlaneTakeoff, LuMail, LuPhone } from "react-icons/lu";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { useTranslation } from "react-i18next";
import { getBookingByCode, getMyBookings, cancelBooking } from "../../services/bookingService";
import { requestRefund, requestGuestRefund, requestRefundOTP, requestGuestRefundOTP, verifyRefundOTP } from "../../services/refundService";
import styles from "./Bookings.module.css";

const OTP_THRESHOLD = 5_000_000;

const maskEmail = (email = "") => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const masked = local.length <= 3 ? local[0] + "**" : local[0] + "***" + local[local.length - 1];
  return masked + "@" + domain;
};

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

// Normalize booking — hỗ trợ cả flat (my bookings) lẫn nested (lookup)
const depTime  = (b) => b?.departure_time  || b?.flight?.departure?.time || b?.outbound_flight?.departure?.time;
const arrTime  = (b) => b?.arrival_time    || b?.flight?.arrival?.time;
const depCode  = (b) => b?.dep_code        || b?.flight?.departure?.code;
const arrCode  = (b) => b?.arr_code        || b?.flight?.arrival?.code;
const airName  = (b) => b?.airline_name    || b?.flight?.airline?.name;
const flightId = (b) => b?.flight_id       || b?.flight?.flight_id;
const durMin   = (b) => b?.duration_minutes|| b?.flight?.duration_minutes || 120;

const isAirborne = (b) => {
  const dt = depTime(b); if (!dt) return false;
  const now = Date.now(), dep = new Date(dt).getTime();
  return now >= dep && now < dep + durMin(b) * 60000;
};

const isCompleted = (b) => {
  const dt = depTime(b); if (!dt) return false;
  return Date.now() >= new Date(dt).getTime() + durMin(b) * 60000;
};

const flightStatus = (flight) => {
  const depTime  = flight?.departure?.time;
  const duration = flight?.duration_minutes;
  if (!depTime || !duration) return "unknown";
  const now   = Date.now();
  const depMs = new Date(depTime).getTime();
  const arrMs = depMs + duration * 60 * 1000;
  if (now < depMs) return "upcoming";
  if (now < arrMs) return "airborne";
  return "landed";
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
  const [trackerAlert,  setTrackerAlert]  = useState("");

  // Refund modal state
  const [refundTarget,      setRefundTarget]      = useState(null);
  const [refundType,        setRefundType]        = useState("full");
  const [refundReason,      setRefundReason]      = useState("");
  const [guestRefundEmail,  setGuestRefundEmail]  = useState("");
  const [refundLoading,     setRefundLoading]     = useState(false);
  const [refundError,       setRefundError]       = useState("");
  const [refundSuccess,     setRefundSuccess]     = useState("");

  // OTP step state
  const [otpStep,     setOtpStep]     = useState(false);
  const [otpEmail,    setOtpEmail]    = useState("");
  const [otpDigits,   setOtpDigits]   = useState(["", "", "", "", "", ""]);
  const [otpLoading,  setOtpLoading]  = useState(false);
  const [otpError,    setOtpError]    = useState("");
  const [otpSending,  setOtpSending]  = useState(false);

  const getStatusColor = (status) => {
    const map = {
      pending:        { bg: "#fff8e1", color: "#d97706", label: t("bookings.status_pending") },   // amber
      confirmed:      { bg: "#dcfce7", color: "#16a34a", label: t("bookings.status_confirmed") }, // green
      cancelled:      { bg: "#fee2e2", color: "#dc2626", label: t("bookings.status_cancelled") }, // red
      expired:        { bg: "#f1f5f9", color: "#64748b", label: t("bookings.status_expired") },   // slate
      refund_pending: { bg: "#f3e8ff", color: "#7c3aed", label: t("bookings.refundPendingBadge") }, // violet
      refunded:       { bg: "#e0f2fe", color: "#0369a1", label: t("bookings.refundedBadge") },      // sky blue
    };
    return map[status?.toLowerCase()] || { bg: "#f1f5f9", color: "#64748b", label: status || "—" };
  };

  const handleLookup = useCallback(async (code) => {
    const c = (code || lookupCode).trim().toUpperCase();
    if (!c) return;
    setLookupLoading(true); setLookupError(""); setLookupResult(null);
    try {
      const res = await getBookingByCode(c);
      setLookupResult(res.data?.data);
    } catch (err) {
      setLookupError(err.response?.data?.error || t("bookings.notFound"));
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

  const pollCodeRef = useRef(null);
  useEffect(() => {
    if (!lookupResult) return;
    const code = lookupResult.booking_code;
    pollCodeRef.current = code;
    const id = setInterval(async () => {
      try {
        const res = await getBookingByCode(code);
        const fresh = res.data?.data;
        if (fresh && pollCodeRef.current === code) {
          setLookupResult(prev => {
            if (!prev || prev.status === fresh.status) return prev;
            return { ...prev, status: fresh.status };
          });
        }
      } catch { /* silent */ }
    }, 12000);
    return () => clearInterval(id);
  }, [lookupResult?.booking_code]);

  useEffect(() => {
    if (tab === "my" && isLoggedIn) fetchMyBookings();
  }, [tab, isLoggedIn, fetchMyBookings]);

  const handleCancel = async (code) => {
    setConfirmCancel(null); setCancelLoading(code); setCancelError("");
    try {
      await cancelBooking(code);
      fetchMyBookings();
    } catch (err) {
      setCancelError(err.response?.data?.error || t("bookings.cancelFailed"));
    } finally { setCancelLoading(null); }
  };

  const handleContinuePayment = (data) => {
    navigate("/payment", {
      state: {
        bookingData: {
          booking_id:    data.booking_id || data.id,
          booking_code:  data.booking_code,
          held_until:    data.held_until || null,
          baggage:       data.baggage,
          ancillary_items: [],
        },
        contact:    data.contact,
        totalPrice: data.price?.grand_total ?? data.price?.total_price ?? 0,
        passengers: data.passengers?.list?.filter((p) => p.flight_type === "outbound")?.map((p) => ({ fullName: p.full_name })) || [],
      },
    });
  };

  // Tính policy hoàn vé dựa vào giờ còn đến departure
  const getRefundPolicy = (dt) => {
    if (!dt) return null;
    const hoursLeft = (new Date(dt) - Date.now()) / 3600000;
    if (hoursLeft < 0)  return null;
    if (hoursLeft < 12) return { pct: 0,   labelKey: "bookings.policyZero" };
    if (hoursLeft < 24) return { pct: 50,  labelKey: "bookings.policy50" };
    if (hoursLeft < 72) return { pct: 80,  labelKey: "bookings.policy80" };
    return              { pct: 100, labelKey: "bookings.policyFull100" };
  };

  const canRequestRefund = (b) => {
    if (b.status !== "confirmed") return false;
    const dt = depTime(b);
    if (!dt) return false;
    return (new Date(dt) - Date.now()) / 3600000 >= 12;
  };

  // Kiểm tra có phải round-trip không
  const isRoundTrip = (b) =>
    b?.trip_type === "round_trip" || !!b?.return_flight || !!b?.return_departure_time;

  const openRefundModal = (b) => {
    setRefundTarget(b);
    setRefundType("full");
    setRefundReason("");
    setGuestRefundEmail("");
    setRefundError("");
    setRefundSuccess("");
  };

  const closeRefundModal = () => {
    setRefundTarget(null);
    setOtpStep(false);
    setOtpCode("");
    setOtpError("");
  };

  const getBookingAmount = (b) =>
    Number(b?.price?.final_amount) || Number(b?.final_amount) ||
    Number(b?.price?.grand_total)  || Number(b?.total_price) || 0;

  const doSubmitRefund = async () => {
    setRefundLoading(true); setRefundError("");
    try {
      let backendType = refundType;
      let requestedItems = null;
      if (refundType === "partial_leg_outbound") { backendType = "partial_leg"; requestedItems = { legs: ["outbound"] }; }
      else if (refundType === "partial_leg_return") { backendType = "partial_leg"; requestedItems = { legs: ["return"] }; }

      const payload = { refund_type: backendType, reason: refundReason.trim(), requested_items: requestedItems };
      const res = isLoggedIn
        ? await requestRefund(refundTarget.booking_code, payload)
        : await requestGuestRefund(refundTarget.booking_code, guestRefundEmail.trim(), payload);

      const d = res.data?.data || res.data;
      setRefundSuccess(d?.refund_code || "Đã gửi yêu cầu thành công!");
      setOtpStep(false);
      if (isLoggedIn) fetchMyBookings();
    } catch (err) {
      setRefundError(err?.response?.data?.error || err?.response?.data?.message || "Gửi yêu cầu thất bại.");
      setOtpStep(false);
    } finally { setRefundLoading(false); }
  };

  const sendOTP = async () => {
    setOtpSending(true); setRefundError(""); setOtpError("");
    try {
      const res = isLoggedIn
        ? await requestRefundOTP(refundTarget.booking_code)
        : await requestGuestRefundOTP(guestRefundEmail.trim(), refundTarget.booking_code);
      setOtpEmail(res.data?.email || guestRefundEmail.trim());
      setOtpStep(true);
      setOtpDigits(["", "", "", "", "", ""]);
    } catch (err) {
      setRefundError(err?.response?.data?.error || "Không thể gửi mã OTP. Vui lòng thử lại.");
    } finally { setOtpSending(false); }
  };

  const handleOtpDigitChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    setOtpError("");
    if (value && index < 5) {
      document.getElementById(`otp-refund-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      document.getElementById(`otp-refund-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otpDigits];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setOtpDigits(next);
    setOtpError("");
    document.getElementById(`otp-refund-${Math.min(pasted.length, 5)}`)?.focus();
  };

  const handleOTPSubmit = async () => {
    const otpCode = otpDigits.join("");
    if (!/^\d{6}$/.test(otpCode)) { setOtpError("Mã OTP phải là 6 chữ số"); return; }
    setOtpLoading(true); setOtpError("");
    try {
      const email = isLoggedIn ? otpEmail : guestRefundEmail.trim();
      await verifyRefundOTP(email, otpCode);
      await doSubmitRefund();
    } catch (err) {
      setOtpError(err?.response?.data?.error || "Mã OTP không đúng hoặc đã hết hạn");
    } finally { setOtpLoading(false); }
  };

  const handleRefundSubmit = async () => {
    if (refundReason.trim().length < 10) { setRefundError(t("bookings.refundReasonError")); return; }
    if (!isLoggedIn && !guestRefundEmail.trim()) { setRefundError(t("bookings.refundEmailRequired", "Vui lòng nhập email xác thực")); return; }

    const amount = getBookingAmount(refundTarget);
    if (amount >= OTP_THRESHOLD) {
      await sendOTP();
    } else {
      await doSubmitRefund();
    }
  };

  const StatusBadge = ({ status }) => {
    const s = getStatusColor(status);
    return <span className={styles.statusBadge} style={{ background: s.bg, color: s.color }}>{s.label || status}</span>;
  };

  const BookingCard = ({ b, showCancel }) => (
    <div
      className={`${styles.bookingCard} ${isAirborne(b) ? styles.bookingCardAirborne : ""}`}
      onClick={() => { setLookupCode(b.booking_code); setTab("lookup"); handleLookup(b.booking_code); }}
    >
      <div className={styles.cardTop}>
        <div>
          <p className={styles.cardCode}>{b.booking_code}</p>
          <p className={styles.cardDate}>{t("bookings.booked", { date: formatDate(b.created_at) })}</p>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <div className={styles.cardFlight}>
        <div className={styles.cardRoute}>
          <strong>{depCode(b)}</strong>
          <span className={styles.cardArrow}>→</span>
          <strong>{arrCode(b)}</strong>
        </div>
        <div className={styles.cardTimes}>{formatTime(depTime(b))} · {formatDate(depTime(b))}</div>
      </div>
      <div className={styles.cardBottom}>
        <span className={styles.cardAirline}>{airName(b)}</span>
        <span className={styles.cardPrice}>{fmt(b.final_amount ?? b.total_price)}</span>
      </div>

      {b.status !== "cancelled" && (
        <button
          className={`${styles.trackBtn} ${isCompleted(b) ? styles.trackBtnLanded : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isCompleted(b)) {
              setTrackerAlert(t("bookings.flightLanded") || "Chuyến bay đã hạ cánh.");
              setTimeout(() => setTrackerAlert(""), 4000);
            } else {
              navigate(`/tracker/${flightId(b)}`, { state: { booking: b } });
            }
          }}
        >
          {isAirborne(b) && <span className={styles.trackDot} />}
          <LuPlaneTakeoff size={15} style={{marginRight:6,verticalAlign:"middle"}} />
          {isCompleted(b) ? t("bookings.trackLanded") : t("bookings.trackFlight")}
        </button>
      )}

      {isAirborne(b) && (
        <p className={styles.airborneNote}>{t("bookings.airborneNote")}</p>
      )}

      {showCancel && (b.status === "confirmed" || canRequestRefund(b)) && (
        <div className={styles.cardActionsRow}>
          {b.status === "confirmed" && (
            confirmCancel === b.booking_code ? (
              <div className={styles.confirmRow} style={{ flex: 1 }}>
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
          {canRequestRefund(b) && (
            <button className={styles.refundBtn} onClick={(e) => { e.stopPropagation(); openRefundModal(b); }}>
              {t("bookings.refundBtn")}
            </button>
          )}
        </div>
      )}

      {showCancel && ["refund_pending", "refunded"].includes(b.status) && (
        <span className={styles.refundPendingBadge}>
          {b.status === "refund_pending" ? t("bookings.refundPendingBadge") : t("bookings.refundedBadge")}
        </span>
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
          {data.price?.discount_amount > 0 && <span className={styles.detailOriginalPrice}>{fmt(data.price.grand_total ?? data.price.total_price)}</span>}
          <span className={styles.detailPriceValue}>{fmt(data.price?.final_amount ?? data.price?.total_price ?? 0)}</span>
          {data.price?.discount_amount > 0 && <span className={styles.detailDiscountBadge}>−{fmt(data.price.discount_amount)}</span>}
        </div>
      </div>

      <div className={styles.detailContact}>
        <p><LuMail size={14} style={{marginRight:6,verticalAlign:"middle"}} />{data.contact?.email}</p>
        {data.contact?.phone && <p><LuPhone size={14} style={{marginRight:6,verticalAlign:"middle"}} />{data.contact?.phone}</p>}
      </div>

      {data.status === "pending" && (
        <button className={styles.continuePayBtn} onClick={() => handleContinuePayment(data)}>
          {t("bookings.continuePayment")}
        </button>
      )}

      {data.status !== "cancelled" && (
        <button
          className={`${styles.trackBtn} ${flightStatus(data.outbound_flight) === "landed" ? styles.trackBtnLanded : ""}`}
          style={{ marginTop: 12 }}
          onClick={() => {
            if (flightStatus(data.outbound_flight) === "landed") {
              setTrackerAlert("Chuyến bay đã hạ cánh. Hành trình đã hoàn thành.");
              setTimeout(() => setTrackerAlert(""), 4000);
            } else {
              const fid = data.outbound_flight?.flight_id ?? data.outbound_flight?.id ?? data.outbound_flight?.flightId;
              navigate(`/tracker/${fid}`, { state: { booking: data } });
            }
          }}
        >
          {flightStatus(data.outbound_flight) === "airborne" && <span className={styles.trackDot} />}
          {flightStatus(data.outbound_flight) === "landed" ? "Chuyến bay đã hạ cánh" : "Theo dõi chuyến bay"}
        </button>
      )}

      {canRequestRefund(data) && (
        <button
          className={styles.refundBtn}
          style={{ marginTop: 10 }}
          onClick={() => openRefundModal(data)}
        >
          {t("bookings.refundBtn")}
        </button>
      )}

      {["refund_pending", "refunded"].includes(data.status) && (
        <span className={styles.refundPendingBadge} style={{ display: "block", marginTop: 10 }}>
          {data.status === "refund_pending" ? t("bookings.refundPendingBadge") : t("bookings.refundedBadge")}
        </span>
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
    <div className={styles.page}>
      <NavBar />
      <main className={styles.main}>
        <div className={styles.wrapper}>
          <h2 className={styles.pageTitle}>{t("bookings.title")}</h2>

          {trackerAlert && (
            <div className={styles.trackerAlertBanner} onClick={() => setTrackerAlert("")}>
              {trackerAlert}
            </div>
          )}

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
              <div className={styles.refundHistoryLink}>
                <button className={styles.refundHistoryBtn} onClick={() => navigate("/refunds")}>
                  {t("bookings.refundHistoryBtn")}
                </button>
              </div>
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
      </main>
      <Footer />

      {/* REFUND MODAL */}
      {refundTarget && (
        <div className={styles.refundOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeRefundModal(); }}>
          <div className={styles.refundModal}>
            <h3 className={styles.refundModalTitle}>{t("bookings.refundModalTitle")}</h3>
            <p className={styles.refundModalCode}>{t("bookings.refundModalCode")} <strong>{refundTarget.booking_code}</strong></p>

            {/* Hiển thị policy */}
            {(() => {
              const policy = getRefundPolicy(depTime(refundTarget));
              if (!policy) return null;
              return (
                <div className={`${styles.policyBox} ${policy.pct === 0 ? styles.policyZero : policy.pct === 100 ? styles.policyFull : styles.policyPartial}`}>
                  <span>{t(policy.labelKey)}</span>
                  {policy.pct > 0 && (
                    <span className={styles.policyAmt}>
                      ≈ {new Intl.NumberFormat("vi-VN").format(
                        Math.round(
                          (Number(refundTarget.price?.grand_total) || Number(refundTarget.final_amount) || Number(refundTarget.price?.final_amount) || Number(refundTarget.total_price) || Number(refundTarget.price?.total_price) || 0)
                          * (["partial_leg_outbound","partial_leg_return"].includes(refundType) ? 0.5 : 1)
                          * policy.pct / 100
                        )
                      )} VND
                    </span>
                  )}
                </div>
              );
            })()}

            {otpStep ? (
              <div className={styles.otpStep}>
                <div className={styles.otpIconWrap}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="3"/>
                    <polyline points="2,4 12,13 22,4"/>
                  </svg>
                </div>
                <p className={styles.otpTitle}>Xác nhận bằng mã OTP</p>
                <p className={styles.otpDesc}>
                  Mã xác nhận gồm 6 chữ số đã được gửi đến email
                </p>
                <p className={styles.otpEmailDisplay}>{maskEmail(isLoggedIn ? otpEmail : guestRefundEmail)}</p>
                <div className={styles.otpBoxes}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-refund-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={styles.otpBox}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(e.target.value, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                {otpError && <p className={styles.otpError}>{otpError}</p>}
                <button className={styles.resendOtpBtn} onClick={sendOTP} disabled={otpSending}>
                  {otpSending ? "Đang gửi..." : "Gửi lại mã"}
                </button>
                <div className={styles.refundActions}>
                  <button className={styles.refundCancelModalBtn} onClick={() => setOtpStep(false)}>Quay lại</button>
                  <button
                    className={styles.refundSubmitBtn}
                    onClick={handleOTPSubmit}
                    disabled={otpLoading || otpDigits.join("").length !== 6}
                  >
                    {otpLoading ? "Đang xác nhận..." : "Xác nhận"}
                  </button>
                </div>
              </div>
            ) : refundSuccess ? (
              <div className={styles.refundSuccessBox}>
                <p>{t("bookings.refundSuccessMsg")}</p>
                <p className={styles.refundSuccessCode}>{t("bookings.refundSuccessCode")} <strong>{refundSuccess}</strong></p>
                <button className={styles.refundSuccessClose} onClick={() => { closeRefundModal(); navigate("/refunds"); }}>
                  {t("bookings.viewRefunds")}
                </button>
              </div>
            ) : (
              <>
                {!isLoggedIn && (
                  <>
                    <label className={styles.refundLabel}>{t("bookings.refundEmailLabel", "Email xác thực")} <span style={{color:"#ef4444"}}>*</span></label>
                    <input
                      type="email"
                      className={styles.refundTextarea}
                      style={{ height: "auto", padding: "10px 12px" }}
                      placeholder={t("bookings.refundEmailPlaceholder", "Nhập email đã dùng khi đặt vé")}
                      value={guestRefundEmail}
                      onChange={(e) => { setGuestRefundEmail(e.target.value); setRefundError(""); }}
                    />
                  </>
                )}

                <label className={styles.refundLabel}>{t("bookings.refundTypeLabel")}</label>
                {isRoundTrip(refundTarget) ? (
                  <select className={styles.refundSelect} value={refundType} onChange={(e) => setRefundType(e.target.value)}>
                    <option value="full">{t("bookings.refundTypeRoundFull")}</option>
                    <option value="partial_leg_outbound">{t("bookings.refundTypeOutbound")}</option>
                    <option value="partial_leg_return">{t("bookings.refundTypeReturn")}</option>
                  </select>
                ) : (
                  <select className={styles.refundSelect} value={refundType} onChange={(e) => setRefundType(e.target.value)}>
                    <option value="full">{t("bookings.refundTypeFull")}</option>
                  </select>
                )}

                <label className={styles.refundLabel}>{t("bookings.refundReasonLabel")} <span style={{color:"#ef4444"}}>*</span></label>
                <textarea
                  className={styles.refundTextarea}
                  placeholder={t("bookings.refundReasonPlaceholder")}
                  rows={3}
                  value={refundReason}
                  onChange={(e) => { setRefundReason(e.target.value); setRefundError(""); }}
                />
                {refundError && <p className={styles.refundError}>{refundError}</p>}

                <div className={styles.refundActions}>
                  <button className={styles.refundCancelModalBtn} onClick={closeRefundModal}>{t("bookings.refundCancel")}</button>
                  <button
                    className={styles.refundSubmitBtn}
                    onClick={handleRefundSubmit}
                    disabled={refundLoading || getRefundPolicy(depTime(refundTarget))?.pct === 0}
                  >
                    {refundLoading ? t("bookings.refundSubmitting") : t("bookings.refundSubmit")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;