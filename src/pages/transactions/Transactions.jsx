// src/pages/transactions/Transactions.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { useTranslation } from "react-i18next";
import API from "../../services/axiosInstance";
import styles from "./Transactions.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + " VND";

const STATUS_MAP = {
  PENDING:   { labelKey: "status_pending", cls: "pending" },
  PAID:      { labelKey: "status_paid",    cls: "paid"    },
  SUCCESS:   { labelKey: "status_paid",    cls: "paid"    },
  COMPLETED: { labelKey: "status_paid",    cls: "paid"    },
  CONFIRMED: { labelKey: "status_paid",    cls: "paid"    },
  CANCELLED: { labelKey: "status_cancelled", cls: "cancel" },
  EXPIRED:   { labelKey: "status_cancelled", cls: "cancel" },
  FAILED:    { labelKey: "status_cancelled", cls: "cancel" },
};

const METHOD_LABEL = {
  BANK_QR: "VietQR",
  MOMO:    "MoMo",
  VISA:    "Visa",
  PAYPAL:  "PayPal",
};

const Transactions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [filter, setFilter]             = useState("all");

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
        if (filter === "paid")    return ["PAID","SUCCESS","COMPLETED","CONFIRMED"].includes(tx.status?.toUpperCase());
        if (filter === "pending") return tx.status?.toUpperCase() === "PENDING";
        if (filter === "cancel")  return ["CANCELLED","EXPIRED","FAILED"].includes(tx.status?.toUpperCase());
        return true;
      });

  const statusInfo = (status) => {
    const info = STATUS_MAP[status?.toUpperCase()];
    if (!info) return { label: status || "N/A", cls: "pending" };
    return { label: t(`transactions.${info.labelKey}`), cls: info.cls };
  };

  const filterTabs = [
    { id: "all",     label: t("transactions.all") },
    { id: "paid",    label: t("transactions.paid") },
    { id: "pending", label: t("transactions.pending") },
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
              const st = statusInfo(txn.status);
              return (
                <div key={txn.payment_code || i} className={styles.txnCard}>
                  <div className={styles.txnLeft}>
                    <div className={styles.txnIcon}>
                      {st.cls === "paid" ? "✅" : st.cls === "cancel" ? "❌" : "⏳"}
                    </div>
                    <div>
                      <p className={styles.txnCode}>{txn.payment_code}</p>
                      <p className={styles.txnMeta}>
                        {METHOD_LABEL[txn.payment_method] || txn.payment_method}
                        {txn.created_at && <> · {new Date(txn.created_at).toLocaleDateString("en-GB")}</>}
                      </p>
                    </div>
                  </div>
                  <div className={styles.txnRight}>
                    <p className={`${styles.txnAmount} ${st.cls === "paid" ? styles.amountPaid : ""}`}>
                      {fmt(txn.final_amount || txn.amount || 0)}
                    </p>
                    <span className={`${styles.statusBadge} ${styles[st.cls]}`}>{st.label}</span>
                  </div>
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
