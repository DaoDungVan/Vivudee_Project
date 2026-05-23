import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { getAncillaryOptions } from "../../services/ancillaryService";
import styles from "./AncillaryPage.module.css";
import { LuUtensils, LuShieldCheck, LuSofa, LuWifi, LuPlane, LuLock, LuChevronLeft, LuChevronRight } from "react-icons/lu";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + " VND";

const TYPE_ICONS = {
  meal:      <LuUtensils size={20} />,
  insurance: <LuShieldCheck size={20} />,
  lounge:    <LuSofa size={20} />,
  wifi:      <LuWifi size={20} />,
};

// Types rendered per-passenger (each person picks independently)
const PER_PAX_TYPES = new Set(["meal"]);

// baggage is handled in PassengerForm already
const TYPE_ORDER = ["meal", "insurance", "lounge", "wifi"];

export default function AncillaryPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { selectedFlights, passengers, baggage, totalPrice } = state || {};

  const adultCount = Number(passengers?.adults || 1);
  const childCount = Number(passengers?.children || 0);
  const paxCount = adultCount + childCount;

  const [grouped, setGrouped] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [selections, setSelections] = useState({});
  const [paxMeals, setPaxMeals] = useState({});

  useEffect(() => {
    getAncillaryOptions()
      .then((res) => {
        const opts = res.data?.data?.options || {};
        setGrouped(opts);
      })
      .catch(() => setGrouped({}))
      .finally(() => setLoadingOptions(false));
  }, []);

  if (!selectedFlights) {
    navigate("/flights");
    return null;
  }

  const allOptions = Object.values(grouped).flat();

  const toggleOption = (type, optId) => {
    setSelections((prev) => ({ ...prev, [type]: prev[type] === optId ? null : optId }));
  };

  const togglePaxMeal = (paxIdx, optId) => {
    setPaxMeals((prev) => ({ ...prev, [paxIdx]: prev[paxIdx] === optId ? null : optId }));
  };

  const calcAncillaryTotal = () => {
    let total = 0;
    Object.entries(selections).forEach(([, optId]) => {
      if (!optId) return;
      const opt = allOptions.find((o) => o.id === optId);
      if (opt) total += Number(opt.price) * paxCount;
    });
    Object.values(paxMeals).forEach((optId) => {
      if (!optId) return;
      const opt = allOptions.find((o) => o.id === optId);
      if (opt) total += Number(opt.price);
    });
    return total;
  };

  const buildAncillaryList = () => {
    const list = [];
    Object.entries(selections).forEach(([, optId]) => {
      if (!optId) return;
      const opt = allOptions.find((o) => o.id === optId);
      if (opt) list.push({ ...opt, quantity: paxCount, subtotal: Number(opt.price) * paxCount });
    });
    Array.from({ length: paxCount }).forEach((_, paxIdx) => {
      const optId = paxMeals[paxIdx];
      if (!optId) return;
      const opt = allOptions.find((o) => o.id === optId);
      if (!opt) return;
      const isChild = paxIdx >= adultCount;
      const label = isChild
        ? t("ancillary.child", { n: paxIdx - adultCount + 1 })
        : t("ancillary.adult", { n: paxIdx + 1 });
      list.push({ ...opt, forPassenger: label, quantity: 1, subtotal: Number(opt.price) });
    });
    return list;
  };

  const ancillaryTotal = calcAncillaryTotal();
  const newTotal = (Number(totalPrice) || 0) + ancillaryTotal;
  const ancillaryList = buildAncillaryList();
  const selectedCount = Object.values(selections).filter(Boolean).length +
    Object.values(paxMeals).filter(Boolean).length;

  const typeLabel = (type) => {
    const key = `ancillary.type${type.charAt(0).toUpperCase() + type.slice(1)}`;
    return t(key, type);
  };

  const handleContinue = () => {
    navigate("/booking", {
      state: {
        ...state,
        ancillarySelections: ancillaryList,
        ancillaryTotal,
        totalPrice: newTotal,
      },
    });
  };

  const orderedTypes = TYPE_ORDER.filter((type) => grouped[type]?.length > 0);

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.steps}>
          <span className={styles.stepActive}>{t("ancillary.step1")}</span>
          <span className={styles.stepSep}>›</span>
          <span className={styles.stepPending}>{t("ancillary.step2")}</span>
          <span className={styles.stepSep}>›</span>
          <span className={styles.stepPending}>{t("ancillary.step3")}</span>
          <span className={styles.stepSep}>›</span>
          <span className={styles.stepPending}>{t("ancillary.step4")}</span>
        </div>

        <div className={styles.layout}>
          <div className={styles.left}>
            <div className={styles.pageTitleRow}>
              <button className={styles.backBtn} onClick={() => navigate(-1)}>
                <LuChevronLeft size={16}/> {t("ancillary.back")}
              </button>
              <h2 className={styles.pageTitle}>{t("ancillary.title")}</h2>
            </div>
            <p className={styles.pageDesc}>{t("ancillary.desc")}</p>

            {loadingOptions ? (
              <div className={styles.loading}>{t("ancillary.loading")}</div>
            ) : orderedTypes.length === 0 ? (
              <div className={styles.empty}>{t("ancillary.empty")}</div>
            ) : (
              orderedTypes.map((type) => {
                const opts = grouped[type];
                return (
                  <div key={type} className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionIcon}>{TYPE_ICONS[type] || <LuPlane size={20}/>}</span>
                      <h3 className={styles.sectionTitle}>{typeLabel(type)}</h3>
                    </div>

                    {PER_PAX_TYPES.has(type) ? (
                      Array.from({ length: paxCount }).map((_, paxIdx) => {
                        const isChild = paxIdx >= adultCount;
                        const label = isChild
                          ? t("ancillary.child", { n: paxIdx - adultCount + 1 })
                          : t("ancillary.adult", { n: paxIdx + 1 });
                        return (
                          <div key={paxIdx} className={styles.paxMealBlock}>
                            <p className={styles.paxName}>{label}</p>
                            <div className={styles.optionGrid}>
                              {opts.map((opt) => {
                                const selected = paxMeals[paxIdx] === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    className={`${styles.optionCard} ${selected ? styles.optionSelected : ""}`}
                                    onClick={() => togglePaxMeal(paxIdx, opt.id)}
                                  >
                                    {selected && <span className={styles.checkBadge}>✓</span>}
                                    <span className={styles.optName}>{opt.name}</span>
                                    <span className={styles.optDesc}>{opt.description}</span>
                                    <span className={styles.optPrice}>{fmt(opt.price)}</span>
                                    <span className={styles.optUnit}>{t("ancillary.perPerson")}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className={styles.optionGrid}>
                        {opts.map((opt) => {
                          const selected = selections[type] === opt.id;
                          return (
                            <button
                              key={opt.id}
                              className={`${styles.optionCard} ${selected ? styles.optionSelected : ""}`}
                              onClick={() => toggleOption(type, opt.id)}
                            >
                              {selected && <span className={styles.checkBadge}>✓</span>}
                              <span className={styles.optName}>{opt.name}</span>
                              <span className={styles.optDesc}>{opt.description}</span>
                              <span className={styles.optPrice}>{fmt(opt.price)}</span>
                              <span className={styles.optUnit}>
                                {t("ancillary.perPersonTotal", {
                                  n: paxCount,
                                  total: fmt(Number(opt.price) * paxCount),
                                })}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.right}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>{t("ancillary.summaryTitle")}</h3>

              <div className={styles.summaryRow}>
                <span>{t("ancillary.summaryFlight", { n: paxCount })}</span>
                <span>{fmt(totalPrice)}</span>
              </div>

              {ancillaryList.length > 0 && (
                <>
                  <div className={styles.summaryDivider} />
                  <p className={styles.summarySubhead}>
                    {t("ancillary.summaryServices", { count: selectedCount })}
                  </p>
                  {ancillaryList.map((item, i) => (
                    <div key={i} className={styles.summaryRow}>
                      <span className={styles.summaryItem}>
                        {item.name}
                        {item.forPassenger && (
                          <span className={styles.summaryPax}> — {item.forPassenger}</span>
                        )}
                      </span>
                      <span>+{fmt(item.subtotal)}</span>
                    </div>
                  ))}
                </>
              )}

              <div className={styles.summaryDivider} />
              <div className={styles.summaryTotalRow}>
                <span>{t("ancillary.summaryTotal")}</span>
                <span className={styles.summaryTotal}>{fmt(newTotal)}</span>
              </div>

              <button className={styles.continueBtn} onClick={handleContinue}>
                {t("ancillary.continueBtn")} <LuChevronRight size={16}/>
              </button>
              <p className={styles.secureNote}><LuLock size={13}/> {t("ancillary.secure")}</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
