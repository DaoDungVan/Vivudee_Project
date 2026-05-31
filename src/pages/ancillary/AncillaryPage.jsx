import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { getAncillaryOptions } from "../../services/ancillaryService";
import styles from "./AncillaryPage.module.css";
import { LuUtensils, LuShieldCheck, LuSofa, LuWifi, LuPlane, LuLock, LuChevronLeft, LuChevronRight, LuInfo } from "react-icons/lu";
import { IoMdArrowDropdown } from "react-icons/io";
import imgMealStandard  from "../../assets/images/ancillary/meal-standard.jpg";
import imgMealVegetarian from "../../assets/images/ancillary/meal-vegetarian.jpg";
import imgMealHalal     from "../../assets/images/ancillary/meal-halal.jpg";
import imgMealChildren  from "../../assets/images/ancillary/meal-children.jpg";
import imgLounge        from "../../assets/images/ancillary/lounge.jpg";

/* ── Translate option names vi → en ── */
const OPT_NAME_EN = {
  "suất ăn trẻ em":    "Children's Meal",
  "suất ăn tiêu chuẩn": "Standard Meal",
  "suất ăn chay":      "Vegetarian Meal",
  "suất ăn halal":     "Halal Meal",
  "bảo hiểm cơ bản":  "Basic Insurance",
  "bảo hiểm toàn diện": "Comprehensive Insurance",
  "phòng chờ sân bay": "Airport Lounge",
  "wifi cơ bản":       "Basic Wi-Fi",
  "wifi nâng cao":     "Premium Wi-Fi",
  "wifi không giới hạn": "Unlimited Wi-Fi",
};

const getOptName = (name = "", lang = "vi") => {
  if (lang !== "en") return name;
  return OPT_NAME_EN[name.toLowerCase()] || name;
};

/* ── Map option name keywords → image ── */
const getOptImage = (type, name = "") => {
  const n = name.toLowerCase();
  if (type === "lounge") return imgLounge;
  if (type === "meal") {
    if (n.includes("trẻ em") || n.includes("child")) return imgMealChildren;
    if (n.includes("chay") || n.includes("vegetar"))  return imgMealVegetarian;
    if (n.includes("halal"))                           return imgMealHalal;
    return imgMealStandard;
  }
  return null;
};

/* ── Rich detail bullets per service ── */
const getOptDetails = (type, name = "", lang = "vi") => {
  const n = name.toLowerCase();
  const en = lang === "en";

  if (type === "meal") {
    if (n.includes("trẻ em") || n.includes("child")) return en ? [
      "Small portions suitable for children aged 2–12",
      "Includes milk, fruit juice and dessert",
      "Free from common allergens (peanuts, seafood)",
      "Comes with a small gift for kids",
    ] : [
      "Khẩu phần nhỏ phù hợp trẻ từ 2–12 tuổi",
      "Bao gồm sữa, nước hoa quả và món tráng miệng",
      "Không chứa các chất gây dị ứng phổ biến (đậu phộng, hải sản)",
      "Kèm quà nhỏ cho bé",
    ];
    if (n.includes("chay") || n.includes("vegetar")) return en ? [
      "100% plant-based — no meat, fish or eggs",
      "Rich in fiber, vitamins and minerals",
      "Suitable for vegetarian and vegan passengers",
      "Includes plant protein (beans, mushrooms, tofu)",
    ] : [
      "100% từ thực vật, không thịt, không cá, không trứng",
      "Giàu chất xơ, vitamin và khoáng chất",
      "Phù hợp người ăn chay và thuần chay (vegan)",
      "Bao gồm protein thực vật (đậu, nấm, đậu phụ)",
    ];
    if (n.includes("halal")) return en ? [
      "Internationally Halal-certified",
      "No pork, no alcohol",
      "Meat processed in accordance with Halal standards",
      "All flavourings and spices Halal-verified",
    ] : [
      "Được chứng nhận tiêu chuẩn Halal quốc tế",
      "Không có thịt heo, không có cồn",
      "Thịt được xử lý theo đúng quy trình Halal",
      "Hương liệu và gia vị được kiểm định Halal",
    ];
    return en ? [
      "Full meal: rice/noodles, meat/fish, vegetables and dessert",
      "Menu varies by flight",
      "Includes beverages (water, tea, coffee)",
      "Served hot on board",
    ] : [
      "Bữa ăn đầy đủ: cơm/mì, thịt/cá, rau và tráng miệng",
      "Thực đơn thay đổi theo chuyến bay",
      "Kèm đồ uống (nước, trà, cà phê)",
      "Phục vụ nóng ngay trên chuyến bay",
    ];
  }

  if (type === "insurance") {
    // Thứ tự cả hai gói: y tế → hành lý → tai nạn → hỗ trợ 24/7 → hủy chuyến → trễ chuyến → hồi hương
    if (n.includes("toàn diện") || n.includes("cao cấp") || n.includes("premium")) return en ? [
      "Emergency medical cover: up to 50,000,000 VND",
      "Lost or damaged baggage: up to 2,000,000 VND",
      "Personal accident insurance throughout your journey",
      "24/7 global emergency medical assistance",
      "Unavoidable trip cancellation: up to 5,000,000 VND",
      "Flight delay over 4 hours: 500,000 VND compensation",
      "Repatriation costs in emergency situations",
    ] : [
      "Bảo hiểm y tế khẩn cấp: đến 50.000.000 VND",
      "Hành lý thất lạc hoặc hư hỏng: đến 2.000.000 VND",
      "Bảo hiểm tai nạn cá nhân trong suốt hành trình",
      "Hỗ trợ y tế khẩn cấp 24/7 toàn cầu",
      "Hoàn/hủy chuyến không thể tránh: đến 5.000.000 VND",
      "Chuyến bay trễ trên 4 tiếng: bồi thường 500.000 VND",
      "Chi phí hồi hương trong trường hợp khẩn cấp",
    ];
    return en ? [
      "Emergency medical expenses: up to 5,000,000 VND",
      "Lost/delayed baggage: up to 500,000 VND",
      "Personal accident insurance throughout your journey",
      "24/7 emergency helpline",
      "Excludes: voluntary trip cancellation",
      "Excludes: flight delay compensation",
    ] : [
      "Chi phí y tế khẩn cấp: đến 5.000.000 VND",
      "Hành lý thất lạc/chậm trễ: đến 500.000 VND",
      "Bảo hiểm tai nạn cá nhân trong suốt hành trình",
      "Đường dây hỗ trợ khẩn cấp 24/7",
      "Không bao gồm: hoàn/hủy chuyến tự nguyện",
      "Không bao gồm: bồi thường khi trễ chuyến",
    ];
  }

  if (type === "wifi") {
    // Thứ tự cả ba gói: tốc độ → phù hợp → streaming → thiết bị → dung lượng → SSL
    if (n.includes("không giới hạn") || n.includes("unlimited")) return en ? [
      "Maximum speed: up to 20 Mbps",
      "Suitable for: work, online meetings and entertainment",
      "Supports HD streaming and high-quality video calls",
      "Unlimited device connections",
      "Unlimited data — valid for the entire flight",
      "SSL-secured connection",
    ] : [
      "Tốc độ cao nhất: lên đến 20 Mbps",
      "Phù hợp: làm việc, họp trực tuyến, giải trí trực tuyến",
      "Hỗ trợ streaming HD, video call chất lượng cao",
      "Kết nối không giới hạn số thiết bị",
      "Dung lượng không giới hạn — dùng trọn hành trình",
      "Kết nối bảo mật SSL",
    ];
    if (n.includes("nâng cao") || n.includes("cao cấp") || n.includes("1gb")) return en ? [
      "Average speed: 5–10 Mbps",
      "Suitable for: email, social media and comfortable browsing",
      "Supports SD streaming and basic video calls",
      "Up to 2 devices connected simultaneously",
      "Data allowance: 1 GB (sufficient for the whole flight)",
      "SSL-secured connection",
    ] : [
      "Tốc độ trung bình: 5–10 Mbps",
      "Phù hợp: email, mạng xã hội, duyệt web thoải mái",
      "Hỗ trợ streaming SD, video call cơ bản",
      "Kết nối tối đa 2 thiết bị cùng lúc",
      "Dung lượng: 1 GB (đủ dùng cho cả chuyến bay)",
      "Kết nối bảo mật SSL",
    ];
    return en ? [
      "Basic speed: 1–3 Mbps",
      "Suitable for: chat, email and light browsing",
      "Not recommended for: video streaming or video calls",
      "Single device connection",
      "Data allowance: 200 MB (auto-disconnects when used up)",
      "SSL-secured connection",
    ] : [
      "Tốc độ cơ bản: 1–3 Mbps",
      "Phù hợp: chat, email, duyệt web nhẹ",
      "Không khuyến khích: streaming video, video call",
      "Kết nối 1 thiết bị",
      "Dung lượng: 200 MB (tự động ngắt khi hết)",
      "Kết nối bảo mật SSL",
    ];
  }

  if (type === "lounge") return en ? [
    "Complimentary snacks and drinks (beer, soft drinks, coffee, tea)",
    "Free high-speed WiFi",
    "Quiet space with comfortable seating",
    "Private showers and restrooms",
    "Newspapers, magazines and TV screens",
    "Power outlets and USB ports at every seat",
    "Access from check-in — no waiting required",
  ] : [
    "Đồ ăn nhẹ và đồ uống miễn phí (rượu bia, nước ngọt, cà phê, trà)",
    "WiFi tốc độ cao miễn phí",
    "Không gian yên tĩnh, ghế ngồi thoải mái",
    "Phòng tắm và phòng vệ sinh riêng biệt",
    "Báo, tạp chí và màn hình TV",
    "Ổ cắm điện và cổng USB tại mỗi chỗ ngồi",
    "Vào cửa ngay khi check-in, không cần chờ",
  ];

  return [];
};

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
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0];

  const { selectedFlights, passengers, baggage, totalPrice } = state || {};

  const adultCount = Number(passengers?.adults || 1);
  const childCount = Number(passengers?.children || 0);
  const paxCount = adultCount + childCount;

  const [grouped, setGrouped] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [selections, setSelections] = useState({});
  const [paxMeals, setPaxMeals] = useState({});
  const [expandedCards, setExpandedCards] = useState(new Set());

  const toggleCard = (cardKey, e) => {
    e.stopPropagation();
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(cardKey) ? next.delete(cardKey) : next.add(cardKey);
      return next;
    });
  };

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

                    {/* Wifi disclaimer */}
                    {type === "wifi" && (
                      <div className={styles.wifiNote}>
                        <LuInfo size={15} style={{ flexShrink: 0 }}/>
                        <span>{t("ancillary.wifiDisclaimer")}</span>
                      </div>
                    )}

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
                                const cardKey = `pax${paxIdx}-${opt.id}`;
                                const expanded = expandedCards.has(cardKey);
                                const selected = paxMeals[paxIdx] === opt.id;
                                const img = getOptImage(type, opt.name);
                                return (
                                  <button
                                    key={opt.id}
                                    className={`${styles.optionCard} ${selected ? styles.optionSelected : ""}`}
                                    onClick={() => togglePaxMeal(paxIdx, opt.id)}
                                  >
                                    {selected && <span className={styles.checkBadge}>✓</span>}
                                    <span className={styles.optName}>{getOptName(opt.name, lang)}</span>
                                    <span className={styles.optPrice}>{fmt(opt.price)}</span>
                                    <span className={styles.optUnit}>{t("ancillary.perPerson")}</span>
                                    {expanded && img && <img src={img} alt={opt.name} className={styles.optImage}/>}
                                    {expanded && (
                                      <ul className={styles.optDetailList}>
                                        {getOptDetails(type, opt.name, lang).map((d, i) => <li key={i}>{d}</li>)}
                                      </ul>
                                    )}
                                    <span className={styles.expandBtn} onClick={(e) => toggleCard(cardKey, e)}>
                                      <IoMdArrowDropdown size={22} className={expanded ? styles.expandOpen : ""}/>
                                    </span>
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
                          const cardKey = `${type}-${opt.id}`;
                          const expanded = expandedCards.has(cardKey);
                          const selected = selections[type] === opt.id;
                          const img = getOptImage(type, opt.name);
                          return (
                            <button
                              key={opt.id}
                              className={`${styles.optionCard} ${selected ? styles.optionSelected : ""}`}
                              onClick={() => toggleOption(type, opt.id)}
                            >
                              {selected && <span className={styles.checkBadge}>✓</span>}
                              <span className={styles.optName}>{getOptName(opt.name, lang)}</span>
                              <span className={styles.optPrice}>{fmt(opt.price)}</span>
                              <span className={styles.optUnit}>
                                {t("ancillary.perPersonTotal", {
                                  n: paxCount,
                                  total: fmt(Number(opt.price) * paxCount),
                                })}
                              </span>
                              {expanded && img && <img src={img} alt={opt.name} className={styles.optImage}/>}
                              {expanded && (
                                <ul className={styles.optDetailList}>
                                  {getOptDetails(type, opt.name, lang).map((d, i) => <li key={i}>{d}</li>)}
                                </ul>
                              )}
                              <span className={styles.expandBtn} onClick={(e) => toggleCard(cardKey, e)}>
                                <IoMdArrowDropdown size={22} className={expanded ? styles.expandOpen : ""}/>
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
                        {getOptName(item.name, lang)}
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
