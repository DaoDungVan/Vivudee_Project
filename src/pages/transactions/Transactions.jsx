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
  PENDING:   { labelKey: "status_pending", cls: "pending", icon: "⏳" },
  PAID:      { labelKey: "status_paid",    cls: "paid",    icon: "✅" },
  SUCCESS:   { labelKey: "status_paid",    cls: "paid",    icon: "✅" },
  COMPLETED: { labelKey: "status_paid",    cls: "paid",    icon: "✅" },
  CONFIRMED: { labelKey: "status_paid",    cls: "paid",    icon: "✅" },
  CANCELLED: { labelKey: "status_cancelled", cls: "cancel", icon: "❌" },
  EXPIRED:   { labelKey: "status_cancelled", cls: "cancel", icon: "❌" },
  FAILED:    { labelKey: "status_cancelled", cls: "cancel", icon: "❌" },
};

const fmt    = (n) => n != null ? new Intl.NumberFormat("vi-VN").format(n) + " VND" : "—";
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
  const [selected,  setSelected]  = useState(null);
  const [detail,    setDetail]    = useState(null);    // payment detail
  const [booking,   setBooking]   = useState(null);    // booking detail
  const [detailLoading, setDetailLoading] = useState(false);

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
    if (!info) return { label: status || "N/A", cls: "pending", icon: "⏳" };
    return { label: t(`transactions.${info.labelKey}`), cls: info.cls, icon: info.icon };
  };

  const openDetail = async (txn) => {
    setSelected(txn);
    setDetail(null);
    setBooking(null);
    setDetailLoading(true);
    try {
      const [payRes, bkRes] = await Promise.allSettled([
        getPaymentByCode(txn.payment_code),
        txn.booking_code ? getBookingByCode(txn.booking_code) : Promise.reject(),
      ]);
      if (payRes.status === "fulfilled") setDetail(payRes.value?.payment || payRes.value?.data || null);
      if (bkRes.status  === "fulfilled") setBooking(bkRes.value?.data?.data || bkRes.value?.data || null);
    } catch { /* silent */ }
    finally { setDetailLoading(false); }
  };

  const closeDetail = () => { setSelected(null); setDetail(null); setBooking(null); };

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
              {filter === "paid" ? "✅" : filter === "pending" ? "⏳" : filter === "cancel" ? "❌" : "💳"}
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
              const st     = statusInfo(txn.status);
              const method = METHOD_META[txn.payment_method?.toUpperCase()];
              const accent = st.cls === "paid" ? styles.accentPaid : st.cls === "cancel" ? styles.accentCancel : styles.accentPending;
              return (
                <div
                  key={txn.payment_code || i}
                  className={styles.txnCard}
                  onClick={() => openDetail(txn)}
                >
                  <div className={`${styles.accentBar} ${accent}`} />
                  <div className={styles.cardInner}>
                    {/* Method logo */}
                    <div className={styles.methodLogoWrap}>
                      {method?.img
                        ? <img src={method.img} alt={method.label} className={styles.methodLogo} />
                        : <span className={styles.methodEmoji}>💳</span>}
                    </div>

                    {/* Info */}
                    <div className={styles.cardInfo}>
                      <p className={styles.cardCode}>{txn.payment_code || "—"}</p>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardMethod}>{method?.label || txn.payment_method || "—"}</span>
                        {txn.created_at && (
                          <>
                            <span className={styles.cardDot}>•</span>
                            <span className={styles.cardDate}>
                              {new Date(txn.created_at).toLocaleDateString("vi-VN")}
                            </span>
                          </>
                        )}
                      </div>
                      {txn.booking_code && (
                        <p className={styles.bookingRef}>{txn.booking_code}</p>
                      )}
                    </div>

                    {/* Amount + Status */}
                    <div className={styles.cardRight}>
                      <p className={`${styles.cardAmount} ${st.cls === "paid" ? styles.amountPaid : st.cls === "cancel" ? styles.amountCancel : ""}`}>
                        {fmt(txn.final_amount || txn.amount)}
                      </p>
                      <span className={`${styles.statusBadge} ${styles[st.cls]}`}>{st.label}</span>
                      <button
                        className={styles.viewDetailBtn}
                        onClick={(e) => { e.stopPropagation(); openDetail(txn); }}
                      >
                        {t("transactions.viewDetail")} →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />

      {/* E-Ticket Modal */}
      {selected && (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className={styles.modal}>
            <div className={styles.modalHandle} />

            {detailLoading ? (
              <div className={styles.ticketLoading}>{t("transactions.loading")}</div>
            ) : (() => {
              const st = statusInfo(selected.status);
              const bkCode = booking?.booking_code || detail?.booking_code || selected.booking_code;
              const flight = booking?.outbound_flight;
              const passengers = booking?.passengers?.list?.filter(p => p.flight_type === "outbound") || [];
              const method = METHOD_META[(selected.payment_method || "").toUpperCase()];
              const finalAmt = Number(detail?.final_amount) || Number(selected.final_amount) || Number(selected.amount) || 0;

              return (
                <>
                  {/* ── Ticket header ── */}
                  <div className={styles.ticketHeader}>
                    <div className={styles.ticketHeaderLeft}>
                      <span className={`${styles.statusBadge} ${styles[st.cls]}`}>{st.icon} {st.label}</span>
                      {bkCode && <p className={styles.ticketBkCode}>{bkCode}</p>}
                    </div>
                    <div className={styles.ticketHeaderRight}>
                      {flight?.airline?.logo_url
                        ? <img src={flight.airline.logo_url} alt={flight.airline.name} className={styles.ticketAirlineLogo} onError={(e) => { e.target.src = planeIcon; }} />
                        : <img src={planeIcon} alt="airline" className={styles.ticketAirlineLogo} />}
                      {flight?.airline?.name && <p className={styles.ticketAirlineName}>{flight.airline.name}</p>}
                    </div>
                    <button className={styles.modalClose} onClick={closeDetail}>✕</button>
                  </div>

                  {/* ── Flight route ── */}
                  {flight && (
                    <div className={styles.ticketRoute}>
                      <div className={styles.ticketAirport}>
                        <p className={styles.ticketIata}>{flight.departure?.code}</p>
                        <p className={styles.ticketCity}>{flight.departure?.city}</p>
                        <p className={styles.ticketTime}>{fmtDate(flight.departure?.time)}</p>
                        <p className={styles.ticketTimeHour}>{flight.departure?.time ? new Date(flight.departure.time).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",hour12:false}) : "—"}</p>
                      </div>
                      <div className={styles.ticketRouteMiddle}>
                        <p className={styles.ticketDuration}>{flight.duration_label || "—"}</p>
                        <div className={styles.ticketRouteLine}>
                          <span className={styles.ticketDot} />
                          <div className={styles.ticketLineTrack} />
                          <span className={styles.ticketPlaneIcon}>✈</span>
                          <div className={styles.ticketLineTrack} />
                          <span className={styles.ticketDot} />
                        </div>
                        <p className={styles.ticketFlightNum}>{flight.flight_number} · {flight.seat_class || booking?.outbound_seat_class || "Economy"}</p>
                      </div>
                      <div className={`${styles.ticketAirport} ${styles.ticketAirportRight}`}>
                        <p className={styles.ticketIata}>{flight.arrival?.code}</p>
                        <p className={styles.ticketCity}>{flight.arrival?.city}</p>
                        <p className={styles.ticketTime}>{fmtDate(flight.arrival?.time)}</p>
                        <p className={styles.ticketTimeHour}>{flight.arrival?.time ? new Date(flight.arrival.time).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit",hour12:false}) : "—"}</p>
                      </div>
                    </div>
                  )}

                  {/* ── Perforation ── */}
                  <div className={styles.perforation}>
                    <div className={styles.perforationCircle} />
                    <div className={styles.perforationDash} />
                    <div className={styles.perforationCircle} />
                  </div>

                  <div className={styles.ticketBody}>
                    {/* ── Passengers ── */}
                    {passengers.length > 0 && (
                      <div className={styles.ticketSection}>
                        <p className={styles.ticketSectionLabel}>{t("transactions.passengers", "Hành khách")}</p>
                        {passengers.map((p, i) => (
                          <div key={i} className={styles.ticketPaxRow}>
                            <span className={styles.ticketPaxName}>{p.full_name}</span>
                            <span className={styles.ticketPaxSeat}>
                              {p.seat_number ? `Ghế ${p.seat_number}` : t("transactions.seatTba","Thông báo khi check-in")}
                            </span>
                            {p.ticket_number && <span className={styles.ticketPaxNum}>{p.ticket_number}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Payment info ── */}
                    <div className={styles.ticketSection}>
                      <p className={styles.ticketSectionLabel}>{t("transactions.detailTitle")}</p>
                      <div className={styles.ticketInfoGrid}>
                        <div>
                          <p className={styles.ticketInfoLabel}>{t("transactions.detailMethod")}</p>
                          <div className={styles.detailMethodRow}>
                            {method?.img && <img src={method.img} alt={method.label} className={styles.detailMethodLogo} />}
                            <span className={styles.ticketInfoVal}>{method?.label || selected.payment_method}</span>
                          </div>
                        </div>
                        <div>
                          <p className={styles.ticketInfoLabel}>{t("transactions.detailDate")}</p>
                          <p className={styles.ticketInfoVal}>{fmtDate(selected.created_at)}</p>
                        </div>
                        {detail?.discount_amount > 0 && (
                          <div>
                            <p className={styles.ticketInfoLabel}>{t("transactions.detailDiscount")}</p>
                            <p className={`${styles.ticketInfoVal} ${styles.amountPaid}`}>−{fmt(detail.discount_amount)}</p>
                          </div>
                        )}
                        <div>
                          <p className={styles.ticketInfoLabel}>{t("transactions.detailFinal")}</p>
                          <p className={`${styles.ticketInfoVal} ${styles.ticketAmount}`}>{fmt(finalAmt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* ── Payment code barcode-style ── */}
                    <div className={styles.ticketBarcode}>
                      <p className={styles.ticketBarcodeLabel}>{t("transactions.detailCode")}</p>
                      <p className={styles.ticketBarcodeVal}>{selected.payment_code}</p>
                    </div>
                  </div>

                  {/* ── Actions ── */}
                  <div className={styles.ticketActions}>
                    {bkCode && (
                      <button className={styles.actionBtnPrimary} onClick={() => { closeDetail(); navigate(`/bookings?code=${bkCode}`); }}>
                        {t("transactions.goToBooking")} →
                      </button>
                    )}
                    <button className={styles.actionBtnSecondary} onClick={closeDetail}>{t("transactions.close")}</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
};

export default Transactions;
