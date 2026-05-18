import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { getMyRefunds, cancelRefund } from "../../services/refundService";
import styles from "./Refunds.module.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " ₫";
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("vi-VN") : "—";

const STATUS_META = {
  pending:    { label: "Chờ duyệt",    css: styles.statusPending    },
  approved:   { label: "Đã duyệt",     css: styles.statusApproved   },
  completed:  { label: "Hoàn thành",   css: styles.statusCompleted  },
  rejected:   { label: "Từ chối",      css: styles.statusRejected   },
  cancelled:  { label: "Đã huỷ",       css: styles.statusCancelled  },
  processing: { label: "Đang xử lý",   css: styles.statusProcessing },
  failed:     { label: "Thất bại",     css: styles.statusRejected   },
};

const getStatusMeta = (s = "") => STATUS_META[s.toLowerCase()] || { label: s, css: styles.statusCancelled };

export default function Refunds() {
  const navigate = useNavigate();
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
    if (!window.confirm("Bạn có chắc muốn huỷ yêu cầu hoàn vé này?")) return;
    setCancelling(code);
    try {
      await cancelRefund(code, "Người dùng huỷ yêu cầu");
      load(page);
    } catch (err) {
      alert(err?.response?.data?.error || "Huỷ thất bại.");
    } finally { setCancelling(null); }
  };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Lịch sử hoàn vé</h1>
          <p className={styles.subtitle}>Theo dõi trạng thái các yêu cầu hoàn tiền của bạn</p>
        </div>

        {loading ? (
          <div className={styles.loading}>Đang tải...</div>
        ) : refunds.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>↩️</div>
            <p className={styles.emptyTitle}>Chưa có yêu cầu hoàn vé</p>
            <p className={styles.emptyMsg}>Khi bạn yêu cầu hoàn vé, chúng sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {refunds.map((r) => {
                const sm = getStatusMeta(r.status);
                const canCancel = ["pending", "approved"].includes(r.status);
                return (
                  <div key={r.refund_code || r.id} className={styles.card}>
                    <div className={styles.cardLeft}>
                      <div className={styles.cardTop}>
                        <span className={styles.refundCode}>{r.refund_code}</span>
                        <span className={`${styles.statusBadge} ${sm.css}`}>{sm.label}</span>
                      </div>
                      <p className={styles.bookingInfo}>
                        Mã đặt vé: <strong>{r.booking_code}</strong>
                        {r.refund_type && ` · ${r.refund_type === "full" ? "Hoàn toàn bộ" : r.refund_type === "partial_leg" ? "Hoàn 1 chặng" : "Hoàn theo hành khách"}`}
                      </p>
                      {r.reason && <p className={styles.meta}>Lý do: {r.reason}</p>}
                      <p className={styles.meta}>Ngày tạo: {fmtDate(r.created_at)}</p>
                      {r.admin_notes && <p className={styles.meta}>Ghi chú: {r.admin_notes}</p>}
                    </div>
                    <div className={styles.cardRight}>
                      <span className={styles.amount}>{fmt(r.net_refund_amount ?? r.refund_amount)}</span>
                      {canCancel && (
                        <button
                          className={styles.cancelBtn}
                          disabled={cancelling === r.refund_code}
                          onClick={() => handleCancel(r.refund_code)}
                        >
                          {cancelling === r.refund_code ? "Đang huỷ..." : "Huỷ yêu cầu"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Trước</button>
                <span className={styles.pageInfo}>Trang {page} / {totalPages}</span>
                <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sau →</button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
