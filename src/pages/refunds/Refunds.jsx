import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { getMyRefunds, cancelRefund } from "../../services/refundService";
import styles from "./Refunds.module.css";
import { LuUndo2 } from "react-icons/lu";
import { FaBolt } from "react-icons/fa";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " ₫";
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("vi-VN") : "—";

const AUTO_REFUND_THRESHOLD = 1_000_000;
const isAutoApproved = (r) =>
  r.status === "approved" &&
  parseFloat(r.net_refund_amount ?? r.refund_amount ?? 0) < AUTO_REFUND_THRESHOLD;

const STATUS_CSS = {
  pending: styles.statusPending, approved: styles.statusApproved,
  completed: styles.statusCompleted, rejected: styles.statusRejected,
  cancelled: styles.statusCancelled, processing: styles.statusProcessing, failed: styles.statusRejected,
};

export default function Refunds() {
  const navigate = useNavigate();
  const { t }    = useTranslation();
  const [refunds,    setRefunds]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
  }, [navigate]);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await getMyRefunds(p, 10);
      const d   = res.data?.data || res.data;
      setRefunds(Array.isArray(d?.refunds) ? d.refunds : (Array.isArray(d) ? d : []));
      if (d?.pagination) setTotalPages(d.pagination.total_pages || 1);
    } catch { setRefunds([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [page]); // eslint-disable-line

  const handleCancel = async (code) => {
    if (!window.confirm(t("refunds.confirmCancel"))) return;
    setCancelling(code);
    try {
      await cancelRefund(code, "Người dùng huỷ yêu cầu");
      load(page);
    } catch (err) {
      alert(err?.response?.data?.error || t("refunds.cancelError"));
    } finally { setCancelling(null); }
  };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("refunds.title")}</h1>
          <p className={styles.subtitle}>{t("refunds.subtitle")}</p>
        </div>

        {loading ? (
          <div className={styles.loading}>{t("refunds.loading")}</div>
        ) : refunds.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><LuUndo2 size={48} /></div>
            <p className={styles.emptyTitle}>{t("refunds.emptyTitle")}</p>
            <p className={styles.emptyMsg}>{t("refunds.emptyMsg")}</p>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {refunds.map((r) => {
                const statusKey = `refunds.status${r.status?.charAt(0).toUpperCase() + r.status?.slice(1)}`;
                const statusCss = STATUS_CSS[r.status?.toLowerCase()] || styles.statusCancelled;
                const canCancel = r.status === "pending";
                const typeLabel = r.refund_type === "full" ? t("refunds.typeFull")
                  : r.refund_type === "partial_leg" ? t("refunds.typeLeg")
                  : r.refund_type === "partial_passenger" ? t("refunds.typePassenger") : "";
                const auto = isAutoApproved(r);
                return (
                  <div key={r.refund_code || r.id} className={styles.card}>
                    <div className={styles.cardLeft}>
                      <div className={styles.cardTop}>
                        <span className={styles.refundCode}>{r.refund_code}</span>
                        <span className={`${styles.statusBadge} ${statusCss}`}>{t(statusKey, { defaultValue: r.status })}</span>
                        {auto && (
                          <span className={styles.autoBadge}>
                            <FaBolt size={10} /> Tự động
                          </span>
                        )}
                      </div>
                      <p className={styles.bookingInfo}>
                        {t("refunds.bookingCodeLabel")}: <strong>{r.booking_code}</strong>
                        {typeLabel && ` · ${typeLabel}`}
                      </p>
                      {auto && (
                        <p className={styles.autoNote}>
                          <FaBolt size={11} />
                          Hoàn tiền được duyệt tự động do số tiền dưới {fmt(AUTO_REFUND_THRESHOLD)}
                        </p>
                      )}
                      {r.reason && <p className={styles.meta}>{t("refunds.reasonLabel")}: {r.reason}</p>}
                      <p className={styles.meta}>{t("refunds.createdAt")}: {fmtDate(r.created_at)}</p>
                      {r.admin_notes && <p className={styles.meta}>{t("refunds.adminNotes")}: {r.admin_notes}</p>}
                    </div>
                    <div className={styles.cardRight}>
                      <span className={styles.amount}>{fmt(r.net_refund_amount ?? r.refund_amount)}</span>
                      {canCancel && (
                        <button
                          className={styles.cancelBtn}
                          disabled={cancelling === r.refund_code}
                          onClick={() => handleCancel(r.refund_code)}
                        >
                          {cancelling === r.refund_code ? t("refunds.cancellingBtn") : t("refunds.cancelBtn")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t("refunds.prevPage")}</button>
                <span className={styles.pageInfo}>{t("refunds.pageLabel", { page, total: totalPages })}</span>
                <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t("refunds.nextPage")}</button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
