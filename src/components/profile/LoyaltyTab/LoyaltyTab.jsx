import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getMembership, getRewards, getLoyaltyHistory, redeemReward } from "../../../services/loyaltyService";
import styles from "./LoyaltyTab.module.css";

const TIER_META = {
  member:   { label: "Đồng",     icon: "🥉", css: styles.tierBronze,   abbr: "Đ"  },
  silver:   { label: "Bạc",      icon: "🥈", css: styles.tierSilver,   abbr: "B"  },
  gold:     { label: "Vàng",     icon: "🥇", css: styles.tierGold,     abbr: "V"  },
  platinum: { label: "Bạch Kim", icon: "💎", css: styles.tierPlatinum, abbr: "BK" },
};

const getTierMeta = (name = "") => TIER_META[name.toLowerCase()] || TIER_META.member;

const fmtPts = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0);
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("vi-VN") : "—";

export default function LoyaltyTab() {
  const { t } = useTranslation();

  const [membership, setMembership]   = useState(null);
  const [rewards,    setRewards]      = useState([]);
  const [history,    setHistory]      = useState([]);
  const [totalPages, setTotalPages]   = useState(1);
  const [page,       setPage]         = useState(1);
  const [loading,    setLoading]      = useState(true);
  const [error,      setError]        = useState("");
  const [voucher,    setVoucher]      = useState(null);
  const [redeeming,  setRedeeming]    = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [memRes, rewRes] = await Promise.all([getMembership(), getRewards()]);
        if (!active) return;
        setMembership(memRes.data?.data || memRes.data);
        setRewards(rewRes.data?.data || rewRes.data || []);
        setError("");
      } catch {
        if (active) setError("Không thể tải thông tin membership.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getLoyaltyHistory(page, 8)
      .then((res) => {
        if (!active) return;
        const d = res.data?.data || res.data;
        setHistory(Array.isArray(d?.transactions) ? d.transactions : (Array.isArray(d) ? d : []));
        if (d?.pagination) setTotalPages(d.pagination.total_pages || 1);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [page]);

  const handleRedeem = async (rewardId) => {
    setRedeeming(rewardId);
    try {
      const res = await redeemReward(rewardId);
      const d = res.data?.data || res.data;
      setVoucher(d?.voucherCode || d?.voucher_code || "—");
      const memRes = await getMembership();
      setMembership(memRes.data?.data || memRes.data);
    } catch (err) {
      alert(err?.response?.data?.error || err?.response?.data?.message || "Đổi thưởng thất bại.");
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) return <div className={styles.loading}>Đang tải...</div>;
  if (error)   return <div className={styles.errorMsg}>{error}</div>;

  const tier     = getTierMeta(membership?.tier_name);
  const curPts   = membership?.tier_points ?? 0;
  const nextPts  = membership?.next_tier?.required_points;
  const progress = nextPts ? Math.min(100, Math.round((curPts / nextPts) * 100)) : 100;
  const isMax    = !nextPts;

  const txSign = (type) => (type === "earn" ? "+" : "−");
  const txClass = (type) => {
    if (type === "earn")   return `${styles.txPoints} ${styles.txPositive}`;
    if (type === "redeem") return `${styles.txPoints} ${styles.txNegative}`;
    return `${styles.txPoints} ${styles.txNegative}`;
  };
  const txBadge = (type) => {
    if (type === "earn")   return `${styles.txType} ${styles.txEarn}`;
    if (type === "redeem") return `${styles.txType} ${styles.txRedeem}`;
    return `${styles.txType} ${styles.txRevoke}`;
  };

  return (
    <div>
      {/* Voucher notification */}
      {voucher && (
        <div className={styles.voucherBox}>
          <div>
            <p className={styles.voucherLabel}>Mã voucher của bạn</p>
            <p className={styles.voucherCode}>{voucher}</p>
          </div>
          <button className={styles.voucherClose} onClick={() => setVoucher(null)}>✕</button>
        </div>
      )}

      {/* Tier banner */}
      <div className={`${styles.tierBanner} ${tier.css}`}>
        <div className={styles.tierTop}>
          <div className={styles.tierBadge}>
            <span className={styles.tierIcon}>{tier.icon}</span>
            <div>
              <p className={styles.tierName}>{tier.label}</p>
              <p className={styles.tierLabel}>Hạng thành viên</p>
            </div>
          </div>
          <div className={styles.tierPtsBox}>
            <p className={styles.tierPts}>{fmtPts(membership?.current_points)}</p>
            <p className={styles.tierPtsLabel}>điểm tích lũy</p>
          </div>
        </div>

        <div className={styles.progressRow}>
          <span>{fmtPts(curPts)} điểm hạng</span>
          {!isMax && <span>Cần {fmtPts(nextPts)} → {membership?.next_tier?.name}</span>}
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <p className={styles.progressNote}>
          {isMax
            ? "🎉 Bạn đang ở hạng cao nhất!"
            : `Còn ${fmtPts(nextPts - curPts)} điểm để lên hạng ${membership?.next_tier?.name}`}
        </p>
      </div>

      {/* Benefits */}
      {membership?.benefits?.length > 0 && (
        <div className={styles.benefitsCard}>
          <p className={styles.sectionTitle}>Quyền lợi hạng {tier.label}</p>
          <ul className={styles.benefitsList}>
            {membership.benefits.map((b, i) => (
              <li key={i} className={styles.benefitItem}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Rewards */}
      <div className={styles.rewardsCard}>
        <p className={styles.sectionTitle}>Đổi điểm lấy thưởng</p>
        {rewards.length === 0 ? (
          <p className={styles.emptyRewards}>Hiện chưa có phần thưởng nào.</p>
        ) : (
          <div className={styles.rewardsGrid}>
            {rewards.map((r) => {
              const canRedeem = (membership?.current_points ?? 0) >= r.points_required;
              return (
                <div key={r.id} className={styles.rewardItem}>
                  <p className={styles.rewardPoints}>{fmtPts(r.points_required)}</p>
                  <p className={styles.rewardPtsLabel}>điểm</p>
                  <p className={styles.rewardName}>{r.name || r.description}</p>
                  {r.discount_amount && (
                    <p className={styles.rewardDesc}>
                      Giảm {new Intl.NumberFormat("vi-VN").format(r.discount_amount)} VND
                    </p>
                  )}
                  <button
                    className={styles.redeemBtn}
                    disabled={!canRedeem || redeeming === r.id}
                    onClick={() => handleRedeem(r.id)}
                  >
                    {redeeming === r.id ? "Đang đổi..." : "Đổi thưởng"}
                  </button>
                  {!canRedeem && (
                    <p className={styles.rewardNoFunds}>
                      Thiếu {fmtPts(r.points_required - (membership?.current_points ?? 0))} điểm
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      <div className={styles.historyCard}>
        <p className={styles.sectionTitle}>Lịch sử giao dịch điểm</p>
        {history.length === 0 ? (
          <p className={styles.emptyHistory}>Chưa có giao dịch nào.</p>
        ) : (
          <>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Loại</th>
                  <th>Mô tả</th>
                  <th>Điểm</th>
                  <th>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span className={txBadge(tx.type)}>
                        {tx.type === "earn" ? "Tích" : tx.type === "redeem" ? "Đổi" : "Hoàn"}
                      </span>
                    </td>
                    <td>{tx.description || tx.booking_id || "—"}</td>
                    <td className={txClass(tx.type)}>
                      {txSign(tx.type)}{fmtPts(tx.points)}
                    </td>
                    <td>{fmtDate(tx.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
