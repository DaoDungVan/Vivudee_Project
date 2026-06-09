import { useState, useEffect, useCallback, useRef } from "react";
import { LuPlaneTakeoff, LuMail, LuPhone, LuCopy, LuCalendarDays, LuUndo2, LuUser, LuLuggage } from "react-icons/lu";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { useTranslation } from "react-i18next";
import { getBookingByCode, getMyBookings, cancelBooking } from "../../services/bookingService";
import { requestRefund, requestGuestRefund, requestRefundOTP, requestGuestRefundOTP, verifyRefundOTP } from "../../services/refundService";
import styles from "./Bookings.module.css";

// Mọi refund đều yêu cầu OTP

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
  return isNaN(d) ? "--:--" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
};

const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
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

  const [tab, setTab] = useState(() => {
    if (!isLoggedIn) return "lookup";
    return sessionStorage.getItem("bookings_tab") || "lookup";
  });
  const [lookupCode,    setLookupCode]    = useState("");
  const [lookupResult,  setLookupResult]  = useState(null);
  const [lookupError,   setLookupError]   = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const [myBookings,   setMyBookings]   = useState([]);
  const [myFilter,     setMyFilter]     = useState("all");
  const [myLoading,    setMyLoading]    = useState(false);
  const [myPage,       setMyPage]       = useState(1);
  const [mySearch,     setMySearch]     = useState("");
  const MY_PAGE_SIZE = 10;

  // Modal chi tiết
  const [detailModal,        setDetailModal]        = useState(null); // data
  const [detailModalLoading, setDetailModalLoading] = useState(false);
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
      date_changed:   { bg: "#fef3c7", color: "#b45309", label: "Đã đổi ngày" },                   // amber-dark
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
        totalPrice: data.price?.total_price ?? 0,
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
    if (b.status === "date_changed") return false;
    if (b.status !== "confirmed") return false;
    const dt = depTime(b);
    if (!dt) return false;
    return (new Date(dt) - Date.now()) / 3600000 >= 12;
  };

  const canDateChange = (b) => {
    if (b.status === "date_changed") return false;
    if (b.status !== "confirmed") return false;
    const dt = depTime(b);
    if (!dt) return false;
    // Cho phép đổi ngày khi còn >= 24h trước giờ bay
    return (new Date(dt) - Date.now()) / 3600000 >= 24;
  };

  const handleCancelLookup = async (code) => {
    if (!window.confirm("Bạn có chắc muốn hủy đặt chỗ này không?")) return;
    setCancelLoading(code);
    setCancelError("");
    try {
      await cancelBooking(code);
      const res = await getBookingByCode(code);
      setLookupResult(res.data?.data);
    } catch (err) {
      setCancelError(err.response?.data?.error || t("bookings.cancelFailed"));
    } finally {
      setCancelLoading(null);
    }
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
    Number(b?.price?.total_price)  || Number(b?.total_price) || 0;

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

    await sendOTP();
  };

  const StatusBadge = ({ status }) => {
    const s = getStatusColor(status);
    return <span className={styles.statusBadge} style={{ background: s.bg, color: s.color }}>{s.label || status}</span>;
  };

  // ── Modal mở chi tiết booking ──
  const openDetailModal = async (code) => {
    setDetailModalLoading(true);
    setDetailModal("loading");
    try {
      const res = await getBookingByCode(code);
      setDetailModal(res.data?.data || null);
    } catch {
      setDetailModal(null);
    } finally {
      setDetailModalLoading(false);
    }
  };

  // ── List row cho My Bookings ──
  const BookingListRow = ({ b }) => {
    const airborne = isAirborne(b);
    return (
      <div className={`${styles.listRow} ${airborne ? styles.listRowAirborne : ""}`}>
        <div className={styles.listRowLeft}>
          <div className={styles.listRowCode}>
            {b.booking_code}
            {airborne && <span className={styles.trackDot} style={{ marginLeft: 6 }} />}
          </div>
          <div className={styles.listRowRoute}>
            <strong>{depCode(b)}</strong>
            <span className={styles.listArrow}>→</span>
            <strong>{arrCode(b)}</strong>
            <span className={styles.listMeta}>{formatTime(depTime(b))} · {formatDate(depTime(b))}</span>
          </div>
          <div className={styles.listRowAirline}>{airName(b)}</div>
        </div>
        <div className={styles.listRowRight}>
          <StatusBadge status={b.status} />
          <span className={styles.listPrice}>{fmt(b.final_amount ?? b.total_price)}</span>
          <button
            className={styles.listViewBtn}
            onClick={() => openDetailModal(b.booking_code)}
          >Xem chi tiết</button>
        </div>
      </div>
    );
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
          {canDateChange(b) && (
            <button className={styles.dateChangeBtn} onClick={(e) => { e.stopPropagation(); navigate("/date-change", { state: { booking: b, bookingCode: b.booking_code } }); }}>
              Đổi ngày bay
            </button>
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

  const LookupDetail = ({ data }) => {
    const outbound = data.outbound_flight;
    const returnFl = data.return_flight;
    const fStatus  = flightStatus(outbound);
    const isRound  = !!returnFl || data.trip_type === "round_trip";

    // Dùng giờ từ outbound_flight (đúng local time) thay vì departure_time flat (UTC lệch)
    const detailDepTime = outbound?.departure?.time || depTime(data);
    const hoursLeft = detailDepTime ? (new Date(detailDepTime) - Date.now()) / 3_600_000 : 0;
    const detailCanRefund     = data.status === "confirmed" && hoursLeft >= 12;
    const detailCanDateChange = data.status === "confirmed" && hoursLeft >= 24;

    const durLabel = (flight) => {
      const mins = flight?.duration_minutes;
      if (!mins) return null;
      return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ""}`;
    };

    const FlightCard = ({ flight, label }) => (
      <div className={styles.flightDetailCard}>
        <div className={styles.flightDetailTop}>
          <span className={styles.flightDetailLabel}>{label}</span>
          <div className={styles.flightDetailMeta}>
            <span className={styles.flightDetailAirline}>{flight?.airline?.name}</span>
            <span className={styles.flightDetailDot}>·</span>
            <span className={styles.flightDetailNum}>{flight?.flight_number}</span>
            <span className={`${styles.seatClassBadge} ${styles[`seat_${flight?.seat_class?.toLowerCase()}`] || ""}`}>
              {flight?.seat_class}
            </span>
          </div>
        </div>
        <div className={styles.routeViz}>
          <div className={styles.routePoint}>
            <span className={styles.routeCode}>{flight?.departure?.code}</span>
            <span className={styles.routeTime}>{formatTime(flight?.departure?.time)}</span>
            <span className={styles.routeDate}>{formatDate(flight?.departure?.time)}</span>
          </div>
          <div className={styles.routeLine}>
            <div className={styles.routeDash} />
            <LuPlaneTakeoff size={17} className={styles.routePlane} />
            <div className={styles.routeDash} />
          </div>
          <div className={`${styles.routePoint} ${styles.routePointRight}`}>
            <span className={styles.routeCode}>{flight?.arrival?.code}</span>
            <span className={styles.routeTime}>{formatTime(flight?.arrival?.time)}</span>
            <span className={styles.routeDate}>{formatDate(flight?.arrival?.time)}</span>
          </div>
        </div>
        {durLabel(flight) && (
          <p className={styles.flightDuration}>Bay thẳng · {durLabel(flight)}</p>
        )}
      </div>
    );

    return (
    <div className={styles.detailCard}>

      {/* ── Header ── */}
      <div className={styles.detailHeaderNew}>
        <div>
          <p className={styles.detailCodeLabel}>{t("bookings.bookingCode")}</p>
          <div className={styles.detailCodeRow}>
            <h2 className={styles.detailCode}>{data.booking_code}</h2>
            <button
              className={styles.copyBtn}
              title="Sao chép"
              onClick={() => navigator.clipboard?.writeText(data.booking_code)}
            >
              <LuCopy size={14} />
            </button>
          </div>
          <div className={styles.detailMetaRow}>
            <span>Đặt ngày {formatDate(data.created_at)}</span>
            <span className={styles.metaDot}>·</span>
            <span>{isRound ? "Khứ hồi" : "Một chiều"}</span>
          </div>
        </div>
        <StatusBadge status={data.status} />
      </div>

      <div className={styles.detailDivider} />

      {/* ── Flights ── */}
      <FlightCard flight={outbound} label="Chuyến đi" />
      {returnFl && <FlightCard flight={returnFl} label="Chuyến về" />}

      <div className={styles.detailDivider} />

      {/* ── Passengers ── */}
      <div className={styles.detailSection2}>
        <p className={styles.detailSectionTitle2}>
          <LuUser size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
          Hành khách
        </p>
        {data.passengers?.list?.filter((p) => p.flight_type === "outbound").map((p, i) => (
          <div key={i} className={styles.paxRow2}>
            <div className={styles.paxLeft}>
              <span className={styles.paxName}>{p.full_name}</span>
              <span className={`${styles.paxTypeBadge} ${p.passenger_type === "child" ? styles.paxChild : styles.paxAdult}`}>
                {p.passenger_type === "child" ? "Trẻ em" : p.passenger_type === "infant" ? "Trẻ sơ sinh" : "Người lớn"}
              </span>
            </div>
            <div className={styles.paxRight}>
              {p.seat_number && (
                <span className={styles.paxSeat}>Ghế {p.seat_number}</span>
              )}
              {p.extra_baggage_kg > 0 && (
                <span className={styles.paxBaggage}>
                  <LuLuggage size={11} /> +{p.extra_baggage_kg}kg
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.detailDivider} />

      {/* ── Price breakdown ── */}
      <div className={styles.detailSection2}>
        <p className={styles.detailSectionTitle2}>Chi tiết giá</p>
        {(() => {
          const dc          = data.date_change;
          const pr          = data.price || {};
          const basePrice   = Number(pr.base_price)      || 0;
          const baggageTotal= Number(pr.baggage_total)   || 0;
          const ancTotal    = Number(pr.ancillary_total) || 0;
          const grandTotal  = Number(pr.grand_total)     || (Number(pr.total_price || 0) + ancTotal);
          const finalAmount = Number(pr.final_amount)    || grandTotal;
          const discountAmt = Number(pr.discount_amount) || 0;
          const numPax      = (Number(data.passengers?.adults) || 1) + (Number(data.passengers?.children) || 0);
          const seatClass   = data.outbound_flight?.seat_class || 'economy';

          // Khi booking đã được duyệt đổi ngày → dc object có dữ liệu
          if (dc && Number(dc.original_price) > 0) {
            const origPrice  = Number(dc.original_price);
            const surcharge  = Number(dc.surcharge) || 0;
            const dcAncTotal = ancTotal; // dịch vụ còn hiệu lực sau đổi ngày
            const dcTotal    = origPrice + surcharge + dcAncTotal - discountAmt;
            return (
              <>
                <div className={styles.priceRow}>
                  <span>Giá vé gốc ({dc.old_seat_class} → {dc.new_seat_class})</span>
                  <span>{fmt(origPrice)}</span>
                </div>
                {surcharge > 0 && (
                  <div className={`${styles.priceRow} ${styles.priceSurcharge}`}>
                    <span>Phụ phí đổi ngày</span>
                    <span>+ {fmt(surcharge)}</span>
                  </div>
                )}
                {surcharge < 0 && (
                  <div className={`${styles.priceRow} ${styles.priceDiscount}`}>
                    <span>Hoàn chênh lệch đổi ngày</span>
                    <span>− {fmt(Math.abs(surcharge))}</span>
                  </div>
                )}
                {dcAncTotal > 0 && (
                  <div className={styles.priceRow}>
                    <span>Dịch vụ bổ sung</span>
                    <span>{fmt(dcAncTotal)}</span>
                  </div>
                )}
                {discountAmt > 0 && (
                  <div className={`${styles.priceRow} ${styles.priceDiscount}`}>
                    <span>Giảm giá coupon</span>
                    <span>− {fmt(discountAmt)}</span>
                  </div>
                )}
                <div className={styles.priceTotalRow}>
                  <span>Tổng đã thanh toán</span>
                  <span className={styles.priceTotalValue}>{fmt(dcTotal)}</span>
                </div>
              </>
            );
          }

          // Booking bình thường — từng dòng cộng lại = tổng
          // Phụ phí đổi ngày (nếu có, chưa approve) = final_amount − grand_total
          const pendingDcSurcharge = Math.max(0, finalAmount - grandTotal + discountAmt);
          // Lấy thông tin hành lý extra từ danh sách hành khách để hiển thị rõ
          const paxWithBaggage = (data.passengers?.list || []).filter(p => p.extra_baggage_kg > 0);
          const baggageLabel = paxWithBaggage.length > 0
            ? `Hành lý ký gửi (+${paxWithBaggage[0].extra_baggage_kg}kg${paxWithBaggage.length > 1 ? ` × ${paxWithBaggage.length}` : ''})`
            : 'Hành lý ký gửi';
          return (
            <>
              <div className={styles.priceRow}>
                <span>Giá vé {seatClass}{numPax > 1 ? ` × ${numPax} khách` : ''}</span>
                <span>{fmt(basePrice > 0 ? basePrice * numPax : grandTotal - baggageTotal - ancTotal + discountAmt)}</span>
              </div>
              {baggageTotal > 0 && (
                <div className={styles.priceRow}>
                  <span>{baggageLabel}</span>
                  <span>{fmt(baggageTotal)}</span>
                </div>
              )}
              {ancTotal > 0 && (
                <div className={styles.priceRow}>
                  <span>Dịch vụ bổ sung</span>
                  <span>{fmt(ancTotal)}</span>
                </div>
              )}
              {discountAmt > 0 && (
                <div className={`${styles.priceRow} ${styles.priceDiscount}`}>
                  <span>Giảm giá coupon</span>
                  <span>− {fmt(discountAmt)}</span>
                </div>
              )}
              {pendingDcSurcharge > 0 && (
                <div className={`${styles.priceRow} ${styles.priceSurcharge}`}>
                  <span>Phụ phí đổi ngày bay</span>
                  <span>+ {fmt(pendingDcSurcharge)}</span>
                </div>
              )}
              <div className={styles.priceTotalRow}>
                <span>Tổng cộng</span>
                <span className={styles.priceTotalValue}>{fmt(finalAmount)}</span>
              </div>
            </>
          );
        })()}
      </div>

      <div className={styles.detailDivider} />

      {/* ── Contact ── */}
      <div className={styles.contactRow}>
        <div className={styles.contactItem}>
          <LuMail size={14} />
          <span>{data.contact?.email}</span>
        </div>
        {data.contact?.phone && (
          <div className={styles.contactItem}>
            <LuPhone size={14} />
            <span>{data.contact?.phone}</span>
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className={styles.actionsSection}>
        {data.status === "pending" && (
          <button className={styles.actionContinuePay} onClick={() => handleContinuePayment(data)}>
            {t("bookings.continuePayment")}
          </button>
        )}

        {data.status !== "cancelled" && data.status !== "date_changed" && (
          <button
            className={`${styles.actionTrack} ${fStatus === "landed" ? styles.actionLanded : ""}`}
            onClick={() => {
              if (fStatus === "landed") {
                setTrackerAlert("Chuyến bay đã hạ cánh. Hành trình đã hoàn thành.");
                setTimeout(() => setTrackerAlert(""), 4000);
              } else {
                const fid = outbound?.flight_id ?? outbound?.id ?? outbound?.flightId;
                navigate(`/tracker/${fid}`, { state: { booking: data } });
              }
            }}
          >
            {fStatus === "airborne" && <span className={styles.trackDot} />}
            <LuPlaneTakeoff size={15} />
            {fStatus === "landed" ? "Chuyến bay đã hạ cánh" : "Theo dõi chuyến bay"}
          </button>
        )}

        {(detailCanDateChange || detailCanRefund || data.status === "confirmed") && (
          <div className={styles.actionsGrid}>
            {detailCanDateChange && (
              <button
                className={styles.actionDateChange}
                onClick={() => navigate("/date-change", { state: { booking: data, bookingCode: data.booking_code } })}
              >
                <LuCalendarDays size={15} />
                Đổi ngày bay
              </button>
            )}
            {detailCanRefund && (
              <button className={styles.actionRefund} onClick={() => openRefundModal(data)}>
                {t("bookings.refundBtn")}
              </button>
            )}
            {data.status === "confirmed" && (
              <button
                className={styles.actionCancel}
                disabled={cancelLoading === data.booking_code}
                onClick={() => handleCancelLookup(data.booking_code)}
              >
                {cancelLoading === data.booking_code ? t("bookings.cancelling") : t("bookings.cancelBtn")}
              </button>
            )}
          </div>
        )}

        {cancelError && <p className={styles.actionCancelErr}>{cancelError}</p>}

        {["refund_pending", "refunded"].includes(data.status) && (
          <div className={styles.refundStatusBanner}>
            {data.status === "refund_pending" ? "⏳ Yêu cầu hoàn vé đang xử lý" : "✓ Đã hoàn vé thành công"}
          </div>
        )}
      </div>

    </div>
    );
  };

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
            <button className={`${styles.tab} ${tab === "lookup" ? styles.tabActive : ""}`} onClick={() => { setTab("lookup"); sessionStorage.setItem("bookings_tab", "lookup"); }}>
              {t("bookings.lookupByCode")}
            </button>
            {isLoggedIn && (
              <button className={`${styles.tab} ${tab === "my" ? styles.tabActive : ""}`} onClick={() => { setTab("my"); sessionStorage.setItem("bookings_tab", "my"); }}>
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
              <div className={styles.myToolbar}>
                <input
                  className={styles.mySearchInput}
                  type="text"
                  placeholder="Tìm mã đặt chỗ, hãng bay, điểm đến..."
                  value={mySearch}
                  onChange={(e) => { setMySearch(e.target.value); setMyPage(1); }}
                />
                <div className={styles.filterRow} style={{ margin: 0 }}>
                  {filterOptions.map((f) => (
                    <button key={f.id} className={`${styles.filterBtn} ${myFilter === f.id ? styles.filterActive : ""}`} onClick={() => { setMyFilter(f.id); setMyPage(1); }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {myLoading ? (
                <p className={styles.loading}>{t("bookings.loading")}</p>
              ) : myBookings.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>{t("bookings.noBookingsFound")}</p>
                  <button onClick={() => navigate("/flights")}>{t("bookings.searchFlights")}</button>
                </div>
              ) : (() => {
                const q = mySearch.trim().toLowerCase();
                const filtered = q
                  ? myBookings.filter(b =>
                      b.booking_code?.toLowerCase().includes(q) ||
                      depCode(b)?.toLowerCase().includes(q) ||
                      arrCode(b)?.toLowerCase().includes(q) ||
                      airName(b)?.toLowerCase().includes(q)
                    )
                  : myBookings;
                const totalPages = Math.ceil(filtered.length / MY_PAGE_SIZE);
                const paged = filtered.slice((myPage - 1) * MY_PAGE_SIZE, myPage * MY_PAGE_SIZE);
                return (
                  <>
                    <div className={styles.bookingList}>
                      {paged.length === 0
                        ? <p className={styles.loading}>Không tìm thấy đặt chỗ nào</p>
                        : paged.map((b) => <BookingListRow key={b.booking_id} b={b} />)
                      }
                    </div>
                    {totalPages > 1 && (
                      <div className={styles.myPagination}>
                        <button className={styles.myPageBtn} disabled={myPage <= 1} onClick={() => setMyPage(p => p - 1)}>‹</button>
                        <span className={styles.myPageInfo}>{myPage} / {totalPages}</span>
                        <button className={styles.myPageBtn} disabled={myPage >= totalPages} onClick={() => setMyPage(p => p + 1)}>›</button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* BOOKING DETAIL MODAL */}
      {(detailModal || detailModalLoading) && (
        <div className={styles.detailModalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setDetailModal(null); }}>
          <div className={styles.detailModalBox}>
            <button className={styles.detailModalClose} onClick={() => setDetailModal(null)}>✕</button>
            {detailModalLoading || detailModal === "loading"
              ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Đang tải...</div>
              : detailModal && <LookupDetail data={detailModal} />
            }
          </div>
        </div>
      )}

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

                {/* Chỉ hiện chọn loại hoàn khi khứ hồi — một chiều tự động là "full" */}
                {isRoundTrip(refundTarget) && (
                  <>
                    <label className={styles.refundLabel}>Chọn chuyến muốn hoàn</label>
                    <select className={styles.refundSelect} value={refundType} onChange={(e) => setRefundType(e.target.value)}>
                      <option value="full">Hoàn toàn bộ (cả 2 chiều)</option>
                      <option value="partial_leg_outbound">Chỉ hoàn chuyến đi</option>
                      <option value="partial_leg_return">Chỉ hoàn chuyến về</option>
                    </select>
                  </>
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