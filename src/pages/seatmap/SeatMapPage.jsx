import { useLocation, useNavigate } from "react-router-dom";
import SeatMap from "../../components/booking/SeatMap/SeatMap";
import { createBooking } from "../../services/bookingService";
import { getSeatMap } from "../../services/flightService";
import { useState, useEffect } from "react";
import NavBar from "../../components/common/NavBar/Navbar";
import styles from "./SeatMapPage.module.css";
import { useTranslation } from "react-i18next";
import { LuPlane, LuArmchair, LuCircleDollarSign, LuCheck, LuShuffle } from "react-icons/lu";

const CLASS_ORDER = ["economy", "business", "first"];

const fmt = (n) =>
  n ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(n)) + " VND" : "—";

export default function SeatMapPage() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const { t } = useTranslation();
  const CLASS_LABEL = {
    economy: t("seatMap.economy"),
    business: t("seatMap.business"),
    first: t("seatMap.first"),
  };

  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [allClassPrices, setAllClassPrices]       = useState({});
  const [allClassRowCounts, setAllClassRowCounts] = useState({});
  const [panelOpen, setPanelOpen]     = useState(false);

  if (!state?.bookingPayload) { navigate("/flights"); return null; }

  const { bookingPayload, selectedFlights, paxList, contact, totalPrice, adultCount, ancillarySelections, ancillaryTotal, seatPreference } = state;
  const flight = selectedFlights?.outbound;
  const initClass = flight?.seat?.class?.toLowerCase() || "economy";

  const [activeClass, setActiveClass] = useState(initClass);
  const paxCount = paxList?.length || 1;

  // Fetch all class prices once
  useEffect(() => {
    if (!flight?.flight_id) return;
    const prices = {};
    const rowCounts = {};
    Promise.allSettled(
      CLASS_ORDER.map(cls =>
        getSeatMap(flight.flight_id, cls).then(res => {
          const map = res.data?.data?.seat_map?.find(m => m.class === cls);
          if (map?.base_price) prices[cls] = Number(map.base_price);
          if (map?.rows?.length) rowCounts[cls] = map.rows.length;
        })
      )
    ).then(() => {
      setAllClassPrices(prices);
      setAllClassRowCounts(rowCounts);
    });
  }, [flight?.flight_id]);

  const rowOffset = CLASS_ORDER
    .slice(0, CLASS_ORDER.indexOf(activeClass))
    .reduce((sum, cls) => sum + (allClassRowCounts[cls] || 0), 0);

  const basePrice      = allClassPrices[initClass]
    || (flight?.seat?.base_price ? Number(flight.seat.base_price) : 0)
    || (flight?.seat?.total_price && paxCount ? Number(flight.seat.total_price) / paxCount : 0);
  const activePricePerPax = allClassPrices[activeClass] || 0;
  const baseTotalForClass  = basePrice * paxCount;
  const activeTotalForClass = activePricePerPax * paxCount;
  const priceDiff = activeTotalForClass - baseTotalForClass;
  const newTotal  = (Number(totalPrice) || 0) + priceDiff;

  const handleConfirm = async (seats) => {
    setLoading(true);
    setError("");
    try {
      const passengerRecords = bookingPayload.passengers.map((p, i) => {
        const realIdx = i % (bookingPayload.passengers.length / (bookingPayload.return_flight_id ? 2 : 1)) | 0;
        return { ...p, seat_number: seats[realIdx] || null };
      });

      const payload = {
        ...bookingPayload,
        passengers: passengerRecords,
        outbound_seat_class: activeClass,
        total_price: newTotal,
        ancillary_options: (ancillarySelections || []).map((a) => ({
          ancillary_option_id: a.id,
          quantity: a.quantity,
          unit_price: Number(a.price),
        })),
      };

      const res = await createBooking(payload);
      const bookingData = { ...res.data?.data, ancillary_items: ancillarySelections || [] };
      navigate("/payment", { state: { bookingData, selectedFlights, passengers: paxList, contact, totalPrice: newTotal } });
    } catch (err) {
      setError(err.response?.data?.error || "Đặt chỗ thất bại");
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <NavBar />

      <div className={styles.body}>
        {/* ── Seat map (left) ── */}
        <div className={styles.mapCol}>
          {seatPreference?.outbound === null ? (
            /* Ngẫu nhiên — không cần chọn ghế */
            <div className={styles.randomWrap}>
              <LuShuffle size={48} className={styles.randomIcon} />
              <h2 className={styles.randomTitle}>{t("seatMap.randomTitle", "Ghế ngẫu nhiên")}</h2>
              <p className={styles.randomDesc}>
                {t("seatMap.randomDesc", "Bạn đã chọn ghế ngẫu nhiên. Hãng bay sẽ tự động phân bổ ghế khi làm thủ tục check-in.")}
              </p>
              <div className={styles.randomActions}>
                <button className={styles.randomBack} onClick={() => navigate(-1)}>
                  ← {t("seatMap.back", "Quay lại")}
                </button>
                <button
                  className={styles.randomConfirm}
                  onClick={() => handleConfirm({})}
                  disabled={loading}
                >
                  {loading ? t("seatMap.booking", "Đang đặt chỗ...") : t("seatMap.confirmRandom", "Xác nhận & Đặt chỗ")}
                </button>
              </div>
              {error && <p className={styles.randomError}>{error}</p>}
            </div>
          ) : (
            <SeatMap
              flightId={flight?.flight_id}
              seatClass={activeClass}
              passengers={paxList.map((p, i) => ({ id: i, fullName: p.fullName || `Hành khách ${i + 1}` }))}
              onConfirm={handleConfirm}
              onBack={() => navigate(-1)}
              rowOffset={rowOffset}
              seatPreference={seatPreference?.outbound || null}
            />
          )}
        </div>

        {/* ── Info panel (right / mobile bottom drawer) ── */}
        <aside className={`${styles.panel} ${panelOpen ? styles.panelOpen : ""}`}>
          {/* Handle bar — chỉ hiện trên mobile */}
          <div className={styles.panelHandle} onClick={() => setPanelOpen(o => !o)}>
            <span className={styles.handleBar} />
            <span className={styles.handleLabel}>
              {CLASS_LABEL[activeClass]} · {fmt(activePricePerPax > 0 ? newTotal : (Number(totalPrice) || 0))}
            </span>
            <span className={styles.handleArrow}>{panelOpen ? "▼" : "▲"}</span>
          </div>
          {/* Flight summary */}
          <div className={styles.card}>
            <div className={styles.cardTitle}><LuPlane size={15}/> {t("seatMap.flightInfo")}</div>
            <div className={styles.infoRow}><span>{t("seatMap.flight")}</span><b>{flight?.flight_number || "—"}</b></div>
            <div className={styles.infoRow}>
              <span>{t("seatMap.route")}</span>
              <b>{flight?.departure?.code || flight?.from_code || "?"} → {flight?.arrival?.code || flight?.to_code || "?"}</b>
            </div>
            <div className={styles.infoRow}>
              <span>Khởi hành</span>
              <b>{(flight?.departure?.time || flight?.departure_time)
                ? new Date(flight.departure?.time || flight.departure_time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
                : "—"}</b>
            </div>
            <div className={styles.infoRow}><span>{t("seatMap.passengers")}</span><b>{t("seatMap.paxCount", { n: paxCount })}</b></div>
          </div>

          {/* Upgrade class */}
          <div className={styles.card}>
            <div className={styles.cardTitle}><LuArmchair size={15}/> {t("seatMap.seatClass")}</div>
            {CLASS_ORDER.map(cls => {
              const pricePerPax = allClassPrices[cls];
              const total = pricePerPax ? pricePerPax * paxCount : null;
              const diff  = (pricePerPax && basePrice) ? (pricePerPax - basePrice) * paxCount : null;
              const isActive = cls === activeClass;
              const isInit   = cls === initClass;
              return (
                <button
                  key={cls}
                  className={`${styles.classBtn} ${isActive ? styles.classBtnActive : ""}`}
                  onClick={() => setActiveClass(cls)}
                >
                  <div className={styles.classBtnTop}>
                    <span className={styles.classBtnLabel}>{CLASS_LABEL[cls]}</span>
                    {isActive && <span className={styles.classBtnCheck}><LuCheck size={13}/></span>}
                  </div>
                  {total != null ? (
                    <div className={styles.classBtnPrice}>
                      <span>{fmt(total)}</span>
                      {!isInit && diff != null && diff !== 0 && (
                        <span className={diff > 0 ? styles.diffUp : styles.diffDown}>
                          {diff > 0
                            ? t("seatMap.surcharge", { amount: fmt(diff) })
                            : t("seatMap.saving", { amount: fmt(Math.abs(diff)) })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className={styles.classBtnPrice} style={{ color: "var(--text-muted)" }}>Đang tải...</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Price summary */}
          <div className={styles.card}>
            <div className={styles.cardTitle}><LuCircleDollarSign size={15}/> {t("seatMap.totalPrice")}</div>
            <div className={styles.infoRow}>
              <span>{t("seatMap.ticketPrice", { n: paxCount })}</span>
              <b>{fmt(activeTotalForClass || (Number(totalPrice) || 0))}</b>
            </div>
            {priceDiff !== 0 && activePricePerPax > 0 && (
              <div className={styles.infoRow} style={{ color: priceDiff > 0 ? "#dc2626" : "#16a34a" }}>
                <span>{priceDiff > 0 ? t("seatMap.surcharge", { amount: "" }).replace(" ", "") : t("seatMap.saving", { amount: "" }).replace(" ", "")}</span>
                <b>{priceDiff > 0 ? "+" : ""}{fmt(priceDiff)}</b>
              </div>
            )}
            <div className={`${styles.infoRow} ${styles.totalRow}`}>
              <span>{t("seatMap.grandTotal")}</span>
              <b>{fmt(activePricePerPax > 0 ? newTotal : (Number(totalPrice) || 0))}</b>
            </div>
          </div>

          <p className={styles.hint}>{t("seatMap.hint")}</p>
        </aside>
      </div>

      {error && <div className={styles.errBar}>{error}</div>}

      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingBox}>
            <div className={styles.spinner} />
            <p>Đang đặt chỗ...</p>
          </div>
        </div>
      )}
    </div>
  );
}
