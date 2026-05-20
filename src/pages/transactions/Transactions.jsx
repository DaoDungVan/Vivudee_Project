// src/pages/transactions/Transactions.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { useTranslation } from "react-i18next";
import API from "../../services/axiosInstance";
import { getPaymentByCode } from "../../services/paymentService";
import { getBookingByCode } from "../../services/bookingService";
import planeIcon from "../../assets/icons/plane.png";
import styles from "./Transactions.module.css";
import { LuHourglass, LuCircleCheck, LuCircleX, LuCreditCard, LuPlaneTakeoff } from "react-icons/lu";

import momoImg   from "../../assets/images/payments/momo.png";
import vietqrImg from "../../assets/images/payments/vietqr.png";
import paypalImg from "../../assets/images/payments/paypal.png";
import visaImg   from "../../assets/images/payments/visa.png";
import masterImg from "../../assets/images/payments/mastercard.svg";

const METHOD_META = {
  BANK_QR: { label: "VietQR", img: vietqrImg },
  MOMO:    { label: "MoMo",   img: momoImg   },
  PAYPAL:  { label: "PayPal", img: paypalImg  },
  VISA:    { label: "Visa",   img: visaImg    },
  MASTER:  { label: "Mastercard", img: masterImg },
};

const STATUS_MAP = {
  PENDING:   { labelKey: "status_pending",   cls: "pending", icon: <LuHourglass  size={18} /> },
  PAID:      { labelKey: "status_paid",      cls: "paid",    icon: <LuCircleCheck size={18} /> },
  SUCCESS:   { labelKey: "status_paid",      cls: "paid",    icon: <LuCircleCheck size={18} /> },
  COMPLETED: { labelKey: "status_paid",      cls: "paid",    icon: <LuCircleCheck size={18} /> },
  CONFIRMED: { labelKey: "status_paid",      cls: "paid",    icon: <LuCircleCheck size={18} /> },
  CANCELLED: { labelKey: "status_cancelled", cls: "cancel",  icon: <LuCircleX     size={18} /> },
  EXPIRED:   { labelKey: "status_cancelled", cls: "cancel",  icon: <LuCircleX     size={18} /> },
  FAILED:    { labelKey: "status_cancelled", cls: "cancel",  icon: <LuCircleX     size={18} /> },
};

const fmt    = (n) => n != null ? new Intl.NumberFormat("vi-VN").format(n) + " VND" : "—";
const fmtDur = (min) => {
  if (!min) return null;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN") + " · " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const Transactions = () => {
  const navigate    = useNavigate();
  const { t }       = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [filter,    setFilter]    = useState("all");
  const [expandedCode, setExpandedCode] = useState(null); // payment_code đang mở
  const [detailMap,    setDetailMap]    = useState({});   // { [payment_code]: { detail, booking } }
  const [loadingCode,  setLoadingCode]  = useState(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await API.get("/payments/my");
      setTransactions(res.data?.payments || res.data?.data || []);
    } catch (err) {
      setTransactions([]);
      if (err?.response?.status !== 404) setError(t("transactions.unable"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchTransactions();
  }, [navigate, fetchTransactions]);

  const filtered = filter === "all"
    ? transactions
    : transactions.filter((tx) => {
        const s = tx.status?.toUpperCase();
        if (filter === "paid")    return ["PAID","SUCCESS","COMPLETED","CONFIRMED"].includes(s);
        if (filter === "pending") return s === "PENDING";
        if (filter === "cancel")  return ["CANCELLED","EXPIRED","FAILED"].includes(s);
        return true;
      });

  // Summary stats
  const totalPaid    = transactions.filter(t => ["PAID","SUCCESS","COMPLETED","CONFIRMED"].includes(t.status?.toUpperCase()))
    .reduce((s, t) => s + (Number(t.final_amount) || Number(t.amount) || 0), 0);
  const totalPending   = transactions.filter(t => t.status?.toUpperCase() === "PENDING").length;
  const totalCancelled = transactions.filter(t => ["CANCELLED","EXPIRED","FAILED"].includes(t.status?.toUpperCase())).length;

  const statusInfo = (status) => {
    const info = STATUS_MAP[status?.toUpperCase()];
    if (!info) return { label: status || "N/A", cls: "pending", icon: <LuHourglass size={18} /> };
    return { label: t(`transactions.${info.labelKey}`), cls: info.cls, icon: info.icon };
  };

  const toggleDetail = async (txn) => {
    const code = txn.payment_code;
    // Collapse nếu đang mở
    if (expandedCode === code) { setExpandedCode(null); return; }

    setExpandedCode(code);
    // Đã có data rồi thì không fetch lại
    if (detailMap[code]) return;

    setLoadingCode(code);
    try {
      const [payRes, bkRes] = await Promise.allSettled([
        getPaymentByCode(code),
        txn.booking_code ? getBookingByCode(txn.booking_code) : Promise.reject(),
      ]);
      setDetailMap(prev => ({
        ...prev,
        [code]: {
          detail:  payRes.status === "fulfilled" ? (payRes.value?.payment || payRes.value?.data || null) : null,
          booking: bkRes.status  === "fulfilled" ? (bkRes.value?.data?.data  || bkRes.value?.data  || null) : null,
        }
      }));
    } catch { /* silent */ }
    finally { setLoadingCode(null); }
  };

  const filterTabs = [
    { id: "all",     label: t("transactions.all")       },
    { id: "paid",    label: t("transactions.paid")      },
    { id: "pending", label: t("transactions.pending")   },
    { id: "cancel",  label: t("transactions.cancelled") },
  ];

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("transactions.title")}</h1>
          <p className={styles.subtitle}>{t("transactions.subtitle")}</p>
        </div>

        {/* Summary */}
        {!loading && transactions.length > 0 && (
          <div className={styles.summaryBar}>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t("transactions.totalTx")}</p>
              <p className={styles.summaryValue}>{transactions.length}</p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t("transactions.totalPaid")}</p>
              <p className={`${styles.summaryValue} ${styles.summaryGreen}`}>{fmt(totalPaid)}</p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t("transactions.totalPending")}</p>
              <p className={`${styles.summaryValue} ${totalPending > 0 ? styles.summaryOrange : ""}`}>{totalPending}</p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{t("transactions.totalCancelled")}</p>
              <p className={`${styles.summaryValue} ${totalCancelled > 0 ? styles.summaryRed : ""}`}>{totalCancelled}</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className={styles.filterTabs}>
          {filterTabs.map((f) => (
            <button
              key={f.id}
              className={`${styles.filterTab} ${filter === f.id ? styles.filterActive : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className={styles.loading}>{t("transactions.loading")}</div>
        ) : error ? (
          <div className={styles.errorBox}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              {filter === "paid" ? <LuCircleCheck size={48} color="#22c55e" /> : filter === "pending" ? <LuHourglass size={48} color="#f59e0b" /> : filter === "cancel" ? <LuCircleX size={48} color="#ef4444" /> : <LuCreditCard size={48} color="#0e81cd" />}
            </div>
            <p className={styles.emptyTitle}>
              {filter === "paid"    ? t("transactions.emptyPaid")
                : filter === "pending" ? t("transactions.emptyPending")
                : filter === "cancel"  ? t("transactions.emptyCancel")
                : t("transactions.emptyAll")}
            </p>
            <p className={styles.emptyMsg}>
              {filter === "paid"    ? t("transactions.emptyPaidMsg")
                : filter === "pending" ? t("transactions.emptyPendingMsg")
                : filter === "cancel"  ? t("transactions.emptyCancelMsg")
                : t("transactions.emptyAllMsg")}
            </p>
            {filter === "all" && (
              <button className={styles.emptyBtn} onClick={() => navigate("/")}>{t("transactions.bookNow")}</button>
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((txn, i) => {
              const st       = statusInfo(txn.status);
              const method   = METHOD_META[txn.payment_method?.toUpperCase()];
              const accent   = st.cls === "paid" ? styles.accentPaid : st.cls === "cancel" ? styles.accentCancel : styles.accentPending;
              const isOpen   = expandedCode === txn.payment_code;
              const cached   = detailMap[txn.payment_code];
              const isLoading= loadingCode === txn.payment_code;

              return (
                <div key={txn.payment_code || i} className={`${styles.txnCard} ${isOpen ? styles.txnCardOpen : ""}`}>
                  {/* ── Card header (clickable) ── */}
                  <div className={styles.cardRow} onClick={() => toggleDetail(txn)}>
                  <div className={`${styles.accentBar} ${accent}`} />
                  <div className={styles.cardInner}>
                    <div className={styles.methodLogoWrap}>
                      {method?.img
                        ? <img src={method.img} alt={method.label} className={styles.methodLogo} />
                        : <span className={styles.methodEmoji}><LuCreditCard size={22} /></span>}
                    </div>

                    <div className={styles.cardInfo}>
                      <p className={styles.cardCode}>{txn.payment_code || "—"}</p>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMethod}>{method?.label || txn.payment_method || "—"}</span>
                        {txn.created_at && (
                          <><span className={styles.cardDot}>•</span>
                          <span className={styles.cardDate}>{new Date(txn.created_at).toLocaleDateString("vi-VN")}</span></>
                        )}
                      </div>
                      {txn.booking_code && <p className={styles.bookingRef}>{txn.booking_code}</p>}
                    </div>

                    <div className={styles.cardRight}>
                      <p className={`${styles.cardAmount} ${st.cls === "paid" ? styles.amountPaid : st.cls === "cancel" ? styles.amountCancel : ""}`}>
                        {fmt(txn.final_amount || txn.amount)}
                      </p>
                      <span className={`${styles.statusBadge} ${styles[st.cls]}`}>{st.label}</span>
                      <span className={`${styles.chevron} ${isOpen ? styles.chevronUp : ""}`}>›</span>
                    </div>
                  </div>
                  </div>{/* end cardRow */}

                  {/* ── Inline expand ── */}
                  {isOpen && (
                    <div className={styles.expandPanel}>
                      {isLoading ? (
                        <p className={styles.expandLoading}>{t("transactions.loading")}</p>
                      ) : (() => {
                        const detail  = cached?.detail;
                        const booking = cached?.booking;
                        const flight  = booking?.outbound_flight;
                        const passengers = booking?.passengers?.list?.filter(p => p.flight_type === "outbound") || [];
                        const finalAmt = Number(detail?.final_amount) || Number(txn.final_amount) || Number(txn.amount) || 0;

                        return (
                          <div className={styles.expandGrid}>
                            {/* LEFT — flight detail */}
                            {flight && (
                              <div className={styles.expandLeft}>
                                <div className={styles.boardingPass}>
                                  {/* Row 1: Airline */}
                                  <div className={styles.bpAirlineRow}>
                                    <img
                                      src={flight.airline?.logo_url || planeIcon}
                                      alt={flight.airline?.name}
                                      className={styles.bpLogo}
                                      onError={e => { e.target.src = planeIcon; }}
                                    />
                                    <div>
                                      <p className={styles.bpAirlineName}>{flight.airline?.name}</p>
                                      <p className={styles.bpFlightNum}>{flight.flight_number} · {flight.seat_class || booking?.outbound_seat_class || "Economy"}</p>
                                    </div>
                                    {(flight.duration_label || flight.duration_minutes) && (
                                      <span className={styles.bpDurBadge}>{flight.duration_label || fmtDur(flight.duration_minutes)}</span>
                                    )}
                                  </div>

                                  {/* Row 2: Route */}
                                  <div className={styles.bpRoute}>
                                    <div className={styles.bpApt}>
                                      <p className={styles.bpTime}>{flight.departure?.time ? new Date(flight.departure.time).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",hour12:false}) : "—"}</p>
                                      <p className={styles.bpIata}>{flight.departure?.code}</p>
                                      <p className={styles.bpCity}>{flight.departure?.city}</p>
                                      <p className={styles.bpDate}>{fmtDate(flight.departure?.time)}</p>
                                    </div>
                                    <div className={styles.bpLine}>
                                      <div className={styles.bpLineDot}/>
                                      <div className={styles.bpLineTrack}/>
                                      <span className={styles.bpLinePlane}><LuPlaneTakeoff size={13} /></span>
                                      <div className={styles.bpLineTrack}/>
                                      <div className={styles.bpLineDot}/>
                                    </div>
                                    <div className={`${styles.bpApt} ${styles.bpAptRight}`}>
                                      <p className={styles.bpTime}>{flight.arrival?.time ? new Date(flight.arrival.time).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",hour12:false}) : "—"}</p>
                                      <p className={styles.bpIata}>{flight.arrival?.code}</p>
                                      <p className={styles.bpCity}>{flight.arrival?.city}</p>
                                      <p className={styles.bpDate}>{fmtDate(flight.arrival?.time)}</p>
                                    </div>
                                  </div>

                                  {/* Perforation */}
                                  {passengers.length > 0 && <div className={styles.bpPerf} />}

                                  {/* Row 3: Passengers */}
                                  {passengers.length > 0 && (
                                    <div className={styles.bpPaxSection}>
                                      <p className={styles.bpPaxLabel}>{t("transactions.passengers")}</p>
                                      <div className={styles.bpPaxList}>
                                        {passengers.map((p, idx) => (
                                          <div key={idx} className={styles.bpPaxRow}>
                                            <span className={styles.bpPaxName}>{p.full_name}</span>
                                            <span className={styles.bpPaxSeat}>{p.seat_number ? `Ghế ${p.seat_number}` : t("transactions.seatTba")}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* RIGHT — payment info */}
                            <div className={styles.expandRight}>
                              <div className={styles.expandPayInfo}>
                                <div className={styles.expandPayRow}>
                                  <span className={styles.expandPayLabel}>{t("transactions.detailMethod")}</span>
                                  <span className={styles.expandPayVal}>{method?.label || txn.payment_method}</span>
                                </div>
                                <div className={styles.expandPayRow}>
                                  <span className={styles.expandPayLabel}>{t("transactions.detailDate")}</span>
                                  <span className={styles.expandPayVal}>{fmtDate(txn.created_at)}</span>
                                </div>
                                {detail?.discount_amount > 0 && (
                                  <div className={styles.expandPayRow}>
                                    <span className={styles.expandPayLabel}>{t("transactions.detailDiscount")}</span>
                                    <span className={`${styles.expandPayVal} ${styles.amountPaid}`}>−{fmt(detail.discount_amount)}</span>
                                  </div>
                                )}
                                <div className={`${styles.expandPayRow} ${styles.expandPayTotal}`}>
                                  <span className={styles.expandPayLabel}>{t("transactions.detailFinal")}</span>
                                  <span className={`${styles.expandPayVal} ${styles.amountPaid}`}>{fmt(finalAmt)}</span>
                                </div>
                              </div>
                              {txn.booking_code && (
                                <button className={styles.expandGoBtn} onClick={() => navigate(`/bookings?code=${txn.booking_code}`)}>
                                  {t("transactions.goToBooking")} →
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Transactions;
