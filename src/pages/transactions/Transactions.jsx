// src/pages/transactions/Transactions.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import API from "../../services/axiosInstance";
import styles from "./Transactions.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";

const STATUS_MAP = {
  PENDING:   { label: "Pending",   cls: "pending" },
  PAID:      { label: "Paid",      cls: "paid"    },
  SUCCESS:   { label: "Success",   cls: "paid"    },
  COMPLETED: { label: "Completed", cls: "paid"    },
  CONFIRMED: { label: "Confirmed", cls: "paid"    },
  CANCELLED: { label: "Cancelled", cls: "cancel"  },
  EXPIRED:   { label: "Expired",   cls: "cancel"  },
  FAILED:    { label: "Failed",    cls: "cancel"  },
};

const METHOD_LABEL = {
  BANK_QR: "VietQR",
  MOMO:    "MoMo",
  VISA:    "Visa",
  PAYPAL:  "PayPal",
};

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [filter, setFilter]             = useState("all");

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/payments/my");
      setTransactions(res.data?.payments || res.data?.data || []);
    } catch (err) {
      setTransactions([]);
      if (err?.response?.status !== 404) {
        setError("Unable to load transaction data");
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "all"
    ? transactions
    : transactions.filter((t) => {
        if (filter === "paid")    return ["PAID","SUCCESS","COMPLETED","CONFIRMED"].includes(t.status?.toUpperCase());
        if (filter === "pending") return t.status?.toUpperCase() === "PENDING";
        if (filter === "cancel")  return ["CANCELLED","EXPIRED","FAILED"].includes(t.status?.toUpperCase());
        return true;
      });

  const statusInfo = (status) => STATUS_MAP[status?.toUpperCase()] || { label: status || "N/A", cls: "pending" };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Transaction History</h1>
          <p className={styles.subtitle}>All your payment transactions</p>
        </div>

        {/* Filter tabs */}
        <div className={styles.filterTabs}>
          {[
            { id: "all",     label: "All" },
            { id: "paid",    label: "Successful" },
            { id: "pending", label: "Pending" },
            { id: "cancel",  label: "Cancelled" },
          ].map((f) => (
            <button
              key={f.id}
              className={`${styles.filterTab} ${filter === f.id ? styles.filterActive : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : error ? (
          <div className={styles.errorBox}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>💳</div>
            <p className={styles.emptyTitle}>No transactions yet</p>
            <p className={styles.emptyMsg}>Your payment transactions will appear here</p>
            <button className={styles.emptyBtn} onClick={() => navigate("/")}>
              Search Flights
            </button>
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
                        {txn.created_at && (
                          <> · {new Date(txn.created_at).toLocaleDateString("en-GB")}</>
                        )}
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
