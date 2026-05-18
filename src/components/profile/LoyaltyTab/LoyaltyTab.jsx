import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { getMembership, getRewards, getLoyaltyHistory, redeemReward } from "../../../services/loyaltyService";
import styles from "./LoyaltyTab.module.css";

// Ngưỡng điểm để xác định tier tiếp theo khi API không trả next_tier
const TIER_THRESHOLDS = {
  member:   { next: "silver",   nextPts: 5000  },
  silver:   { next: "gold",     nextPts: 20000 },
  gold:     { next: "platinum", nextPts: 50000 },
  platinum: { next: null,       nextPts: null  },
};

// 4-pointed sparkle star path (center 30,29)
const STAR_PATH = "M30,18 L32.6,25.8 L40.5,28.5 L32.6,31.2 L30,39 L27.4,31.2 L19.5,28.5 L27.4,25.8 Z";

// Gem shape — rounded badge/jewel narrowing to bottom
const GEM_PATH = "M30,2 C44,2 58,13 58,28 C58,43 50,55 38,63 C35,65.5 30,68 30,68 C30,68 25,65.5 22,63 C10,55 2,43 2,28 C2,13 16,2 30,2 Z";

const GEM_CONFIGS = {
  member: {
    body:  ["#f0a060","#c06828","#7a3010","#b05820"],
    rim:   "#e08840",
    shine: "#ffd8b0",
    glow:  "rgba(200,100,40,0.7)",
  },
  silver: {
    body:  ["#f0f0f0","#b0b0b0","#686868","#a0a0a0"],
    rim:   "#d8d8d8",
    shine: "#ffffff",
    glow:  "rgba(160,160,160,0.6)",
  },
  gold: {
    body:  ["#fff4a0","#f0c800","#a07800","#d4a010"],
    rim:   "#fde030",
    shine: "#fffae0",
    glow:  "rgba(220,180,0,0.75)",
  },
  platinum: {
    body:  ["#eeeeff","#a0a0d0","#505090","#8888c0"],
    rim:   "#c8c8f0",
    shine: "#f8f8ff",
    glow:  "rgba(140,140,220,0.65)",
  },
};

const GemBadge = ({ tierKey, size = 56 }) => {
  const c  = GEM_CONFIGS[tierKey] || GEM_CONFIGS.member;
  const id = `gem-${tierKey}`;
  const h  = Math.round(size * 68 / 60);

  return (
    <svg
      width={size} height={h}
      viewBox="0 0 60 68"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: `drop-shadow(0 4px 10px ${c.glow})` }}
    >
      <defs>
        {/* Radial body gradient — 3D light from top-left */}
        <radialGradient id={`${id}-body`} cx="38%" cy="28%" r="72%" fx="38%" fy="28%">
          <stop offset="0%"   stopColor={c.body[0]} />
          <stop offset="35%"  stopColor={c.body[1]} />
          <stop offset="75%"  stopColor={c.body[2]} />
          <stop offset="100%" stopColor={c.body[3]} />
        </radialGradient>

        {/* Rim gradient */}
        <linearGradient id={`${id}-rim`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stopColor={c.rim}                    />
          <stop offset="100%" stopColor={c.body[2]} stopOpacity="0.6" />
        </linearGradient>

        {/* Glossy top shine */}
        <radialGradient id={`${id}-shine`} cx="42%" cy="20%" r="48%">
          <stop offset="0%"   stopColor={c.shine} stopOpacity="0.95" />
          <stop offset="55%"  stopColor={c.shine} stopOpacity="0.3"  />
          <stop offset="100%" stopColor={c.shine} stopOpacity="0"    />
        </radialGradient>

        {/* Bottom inner shadow */}
        <radialGradient id={`${id}-shadow`} cx="50%" cy="85%" r="50%">
          <stop offset="0%"   stopColor="rgba(0,0,0,0.25)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)"    />
        </radialGradient>
      </defs>

      {/* Rim — slightly larger = colored border */}
      <path d={GEM_PATH} fill={`url(#${id}-rim)`}
        transform="scale(1.05) translate(-1.43,-1.6)"
      />

      {/* Main gem body */}
      <path d={GEM_PATH} fill={`url(#${id}-body)`} />

      {/* Bottom depth shadow */}
      <path d={GEM_PATH} fill={`url(#${id}-shadow)`} />

      {/* Top gloss */}
      <path d={GEM_PATH} fill={`url(#${id}-shine)`} />

      {/* 4-pointed sparkle star */}
      <path d={STAR_PATH} fill="white" opacity="0.93"
        style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.9))" }}
      />
    </svg>
  );
};

const TIER_META = {
  member:   { labelKey: "loyalty.tierBronze",   css: styles.tierBronze,   abbr: "Đ",  gemKey: "member"   },
  silver:   { labelKey: "loyalty.tierSilver",   css: styles.tierSilver,   abbr: "B",  gemKey: "silver"   },
  gold:     { labelKey: "loyalty.tierGold",     css: styles.tierGold,     abbr: "V",  gemKey: "gold"     },
  platinum: { labelKey: "loyalty.tierPlatinum", css: styles.tierPlatinum, abbr: "BK", gemKey: "platinum" },
};

const getTierMeta  = (name = "") => TIER_META[name.toLowerCase()] || TIER_META.member;
const getTierThres = (name = "") => TIER_THRESHOLDS[name.toLowerCase()] || TIER_THRESHOLDS.member;

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
        const lang = i18n.language?.slice(0, 2) || "vi";
        const [memRes, rewRes] = await Promise.all([getMembership(lang), getRewards()]);
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
      const memRes = await getMembership(i18n.language?.slice(0, 2) || "vi");
      setMembership(memRes.data?.data || memRes.data);
    } catch (err) {
      alert(err?.response?.data?.error || err?.response?.data?.message || "Đổi thưởng thất bại.");
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) return <div className={styles.loading}>{t("loyalty.loading")}</div>;
  if (error)   return <div className={styles.errorMsg}>{error}</div>;

  const tierName = membership?.tier_name || "member";
  const tier     = getTierMeta(tierName);
  const thres    = getTierThres(tierName);
  const curPts   = membership?.tier_points ?? 0;
  // Dùng next_tier từ API, fallback sang threshold cứng nếu API không trả
  const nextPts  = membership?.next_tier?.required_points ?? thres.nextPts;
  const nextName = membership?.next_tier?.name ?? thres.next;
  const isMax    = !nextPts;
  const progress = nextPts ? Math.min(100, Math.round((curPts / nextPts) * 100)) : 100;

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
  const txLabel = (type) => {
    if (type === "earn")   return t("loyalty.txEarn");
    if (type === "redeem") return t("loyalty.txRedeem");
    return t("loyalty.txRevoke");
  };

  return (
    <div>
      {/* Voucher notification */}
      {voucher && (
        <div className={styles.voucherBox}>
          <div>
            <p className={styles.voucherLabel}>{t("loyalty.voucherLabel")}</p>
            <p className={styles.voucherCode}>{voucher}</p>
          </div>
          <button className={styles.voucherClose} onClick={() => setVoucher(null)}>✕</button>
        </div>
      )}

      {/* Tier banner */}
      <div className={`${styles.tierBanner} ${tier.css}`}>
        <div className={styles.tierTop}>
          <div className={styles.tierBadge}>
            <GemBadge tierKey={tier.gemKey} size={58} />
            <div>
              <p className={styles.tierName}>{t(tier.labelKey)}</p>
              <p className={styles.tierLabel}>{t("loyalty.tierLabel")}</p>
            </div>
          </div>
          <div className={styles.tierPtsBox}>
            <p className={styles.tierPts}>{fmtPts(membership?.current_points)}</p>
            <p className={styles.tierPtsLabel}>{t("loyalty.currentPtsLabel")}</p>
          </div>
        </div>

        <div className={styles.progressRow}>
          <span>{fmtPts(curPts)} {t("loyalty.tierPtsLabel")}</span>
          {!isMax && nextName && (
            <span>{t("loyalty.progressLeft", { amount: fmtPts(nextPts - curPts), tier: nextName })}</span>
          )}
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <p className={styles.progressNote}>
          {isMax
            ? t("loyalty.maxTier")
            : nextName
              ? t("loyalty.progressLeft", { amount: fmtPts(nextPts - curPts), tier: nextName })
              : ""}
        </p>
      </div>

      {/* Benefits */}
      {membership?.benefits?.length > 0 && (
        <div className={styles.benefitsCard}>
          <p className={styles.sectionTitle}>{t("loyalty.benefitsTitle", { tier: t(tier.labelKey) })}</p>
          <ul className={styles.benefitsList}>
            {membership.benefits.map((b, i) => (
              <li key={i} className={styles.benefitItem}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Rewards */}
      <div className={styles.rewardsCard}>
        <p className={styles.sectionTitle}>{t("loyalty.rewardsTitle")}</p>
        {rewards.length === 0 ? (
          <p className={styles.emptyRewards}>{t("loyalty.emptyRewards")}</p>
        ) : (
          <div className={styles.rewardsGrid}>
            {rewards.map((r) => {
              const canRedeem = (membership?.current_points ?? 0) >= r.points_required;
              return (
                <div key={r.id} className={styles.rewardItem}>
                  <p className={styles.rewardPoints}>{fmtPts(r.points_required)}</p>
                  <p className={styles.rewardPtsLabel}>{t("loyalty.pointsUnit")}</p>
                  <p className={styles.rewardName}>{r.name || r.description}</p>
                  {r.discount_amount && (
                    <p className={styles.rewardDesc}>
                      {new Intl.NumberFormat("vi-VN").format(r.discount_amount)} VND
                    </p>
                  )}
                  <button
                    className={styles.redeemBtn}
                    disabled={!canRedeem || redeeming === r.id}
                    onClick={() => handleRedeem(r.id)}
                  >
                    {redeeming === r.id ? t("loyalty.redeemingBtn") : t("loyalty.redeemBtn")}
                  </button>
                  {!canRedeem && (
                    <p className={styles.rewardNoFunds}>
                      {t("loyalty.noFunds", { amount: fmtPts(r.points_required - (membership?.current_points ?? 0)) })}
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
        <p className={styles.sectionTitle}>{t("loyalty.historyTitle")}</p>
        {history.length === 0 ? (
          <p className={styles.emptyHistory}>{t("loyalty.historyEmpty")}</p>
        ) : (
          <>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>{t("loyalty.txType")}</th>
                  <th>{t("loyalty.txDesc")}</th>
                  <th>{t("loyalty.txPoints")}</th>
                  <th>{t("loyalty.txDate")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => (
                  <tr key={tx.id}>
                    <td><span className={txBadge(tx.type)}>{txLabel(tx.type)}</span></td>
                    <td>{tx.description || tx.booking_id || "—"}</td>
                    <td className={txClass(tx.type)}>{txSign(tx.type)}{fmtPts(tx.points)}</td>
                    <td>{fmtDate(tx.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t("loyalty.prevPage")}</button>
                <span className={styles.pageInfo}>{t("loyalty.pageLabel", { page, total: totalPages })}</span>
                <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t("loyalty.nextPage")}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
