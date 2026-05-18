// src/pages/transactions/Transactions.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { useTranslation } from "react-i18next";
import API from "../../services/axiosInstance";
import { getPaymentByCode } from "../../services/paymentService";
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
  const [selected,  setSelected]  = useState(null);   // transaction being viewed
  const [detail,    setDetail]    = useState(null);    // full detail from API
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
    .reduce((s, t) => s + (t.final_amount || t.amount || 0), 0);
  const totalPending = transactions.filter(t => t.status?.toUpperCase() === "PENDING").length;

  const statusInfo = (status) => {
    const info = STATUS_MAP[status?.toUpperCase()];
    if (!info) return { label: status || "N/A", cls: "pending", icon: "⏳" };
    return { label: t(`transactions.${info.labelKey}`), cls: info.cls, icon: info.icon };
  };

  const openDetail = async (txn) => {
    setSelected(txn);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await getPaymentByCode(txn.payment_code);
      setDetail(res?.payment || res?.data || null);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setSelected(null); setDetail(null); };

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
            <div className={styles.emptyIcon}>💳</div>
            <p className={styles.emptyTitle}>{t("transactions.empty")}</p>
            <p className={styles.emptyMsg}>{t("transactions.emptyMsg")}</p>
            <button className={styles.emptyBtn} onClick={() => navigate("/")}>{t("transactions.bookNow")}</button>
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

      {/* Detail Modal */}
      {selected && (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className={styles.modal}>
            <div className={styles.modalHandle} />
            <div className={styles.modalHeader}>
              <p className={styles.modalTitle}>{t("transactions.detailTitle")}</p>
              <button className={styles.modalClose} onClick={closeDetail}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* Status hero */}
              {(() => {
                const st = statusInfo(selected.status);
                return (
                  <div className={styles.detailStatus}>
                    <span className={styles.detailStatusIcon}>{st.icon}</span>
                    <div className={styles.detailStatusText}>
                      <p className={`${styles.statusBig} ${st.cls === "paid" ? styles.amountPaid : st.cls === "cancel" ? styles.amountCancel : styles.summaryOrange}`}>
                        {st.label}
                      </p>
                      <p className={styles.statusSub}>
                        {selected.payment_code}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {detailLoading ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>
                  {t("transactions.loading")}
                </p>
              ) : (
                <div className={styles.detailRows}>
                  {/* Method */}
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>{t("transactions.detailMethod")}</span>
                    <span className={styles.detailValue}>
                      <span className={styles.detailMethodRow}>
                        {(() => {
                          const m = METHOD_META[(selected.payment_method || "").toUpperCase()];
                          return m?.img
                            ? <><img src={m.img} alt={m.label} className={styles.detailMethodLogo} /> {m.label}</>
                            : selected.payment_method || "—";
                        })()}
                      </span>
                    </span>
                  </div>

                  {/* Date */}
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>{t("transactions.detailDate")}</span>
                    <span className={styles.detailValue}>{fmtDate(selected.created_at)}</span>
                  </div>

                  {/* Booking code */}
                  {(detail?.booking_code || selected.booking_code) && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailKey}>{t("transactions.detailBooking")}</span>
                      <span
                        className={`${styles.detailValue} ${styles.detailValueBlue} ${styles.detailValueMono}`}
                        onClick={() => { closeDetail(); navigate(`/bookings?code=${detail?.booking_code || selected.booking_code}`); }}
                      >
                        {detail?.booking_code || selected.booking_code}
                      </span>
                    </div>
                  )}

                  {/* Email */}
                  {(detail?.email || selected.email) && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailKey}>{t("transactions.detailEmail")}</span>
                      <span className={styles.detailValue}>{detail?.email || selected.email}</span>
                    </div>
                  )}

                  <hr className={styles.dividerSection} />

                  {/* Amount breakdown */}
                  {(detail?.total_amount || detail?.original_amount) && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailKey}>{t("transactions.detailOriginal")}</span>
                      <span className={styles.detailValue}>{fmt(detail.total_amount || detail.original_amount)}</span>
                    </div>
                  )}

                  {(detail?.discount_amount > 0) && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailKey}>{t("transactions.detailDiscount")}</span>
                      <span className={`${styles.detailValue} ${styles.amountPaid}`}>
                        − {fmt(detail.discount_amount)}
                      </span>
                    </div>
                  )}

                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>{t("transactions.detailFinal")}</span>
                    <span className={`${styles.detailValue} ${styles.detailValueGreen} ${styles.detailValueMono}`}>
                      {fmt(detail?.final_amount || selected.final_amount || selected.amount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className={styles.modalActions}>
                {(detail?.booking_code || selected.booking_code) && (
                  <button
                    className={styles.actionBtnPrimary}
                    onClick={() => { closeDetail(); navigate(`/bookings?code=${detail?.booking_code || selected.booking_code}`); }}
                  >
                    {t("transactions.goToBooking")} →
                  </button>
                )}
                <button className={styles.actionBtnSecondary} onClick={closeDetail}>
                  {t("transactions.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Transactions;
