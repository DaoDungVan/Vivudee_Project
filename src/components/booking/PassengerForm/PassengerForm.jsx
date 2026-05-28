import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./PassengerForm.module.css";
import planeIcon from "../../../assets/icons/plane.png";
import { LuLuggage, LuBackpack, LuUser, LuArmchair, LuMapPin } from "react-icons/lu";
import { getSeatPricing } from "../../../services/flightService";
import SeatMap from "../SeatMap/SeatMap";

const kgToDisplay = (kg, lang) =>
  lang === "en" ? `${Math.round(kg * 2.20462)} lbs` : `${kg} kg`;

const SEAT_POS_ORDER = ["window", "aisle", "middle", "extra_legroom"];

const SEAT_POS_LABELS = {
  window:        { vi: "Cửa sổ",    en: "Window" },
  aisle:         { vi: "Lối đi",    en: "Aisle" },
  middle:        { vi: "Giữa",      en: "Middle" },
  extra_legroom: { vi: "Chỗ rộng",  en: "Extra Legroom" },
};

const buildBaggageOptions = (flight, t, lang) => {
  const fixedKgs = [0, 5, 10, 20];
  const providedOptions = Array.isArray(flight?.seat?.extra_baggage_options)
    ? flight.seat.extra_baggage_options
    : [];

  if (providedOptions.length > 0) {
    const optionMap = new Map(
      providedOptions.map((option) => [Number(option?.kg || 0), Number(option?.price_per_person || 0)])
    );
    return fixedKgs.map((kg) => ({
      kg,
      label: kg > 0 ? `+${kgToDisplay(kg, lang)}` : t("passengerForm.noExtra"),
      price: optionMap.get(kg) || 0,
    }));
  }

  return fixedKgs.map((kg) => ({
    kg,
    label: kg > 0 ? `+${kgToDisplay(kg, lang)}` : t("passengerForm.noExtra"),
    price: 0,
  }));
};

const getPickPrice = (pricing) => {
  if (!pricing) return 0;
  const vals = Object.values(pricing).filter(v => typeof v === "number" && v > 0);
  return vals.length ? Math.max(...vals) + 50000 : 200000;
};

const FlightSummary = ({
  flight,
  label,
  baggageKg,
  onBaggageChange,
  baggageOptions,
  seatPricing,
  seatType,
  onSeatTypeChange,
  paxCount,
  formatTime,
  fmt,
  t,
  lang,
  onOpenSeatMap,
  pickedSeats,
}) => (
  <div className={styles.flightBox}>
    <p className={styles.boxLabel}>{label}</p>

    <div className={styles.flightRow}>
      <div className={styles.airlineInfo}>
        <img
          src={flight.airline?.logo_url || planeIcon}
          alt={flight.airline?.name}
          className={styles.airlineLogo}
          onError={(e) => { e.target.src = planeIcon; }}
        />
        <div>
          <p className={styles.airlineName}>{flight.airline?.name}</p>
          <p className={styles.flightCode}>{flight.flight_number} · {flight.seat?.class}</p>
        </div>
      </div>
      <div className={styles.priceBlock}>
        <span className={styles.price}>{fmt(flight.seat?.total_price || 0)}</span>
        <span className={styles.perPax}>{t("passengerForm.allPax")}</span>
      </div>
    </div>

    <div className={styles.timeline}>
      <div className={styles.timeBlock}>
        <span className={styles.time}>{formatTime(flight.departure?.time)}</span>
        <span className={styles.code}>{flight.departure?.code}</span>
      </div>
      <div className={styles.timelineLine}>
        <span className={styles.duration}>{flight.duration_label}</span>
        <div className={styles.line} />
        <span className={styles.direct}>{t("passengerForm.direct")}</span>
      </div>
      <div className={styles.timeBlock}>
        <span className={styles.time}>{formatTime(flight.arrival?.time)}</span>
        <span className={styles.code}>{flight.arrival?.code}</span>
      </div>
    </div>

    <div className={styles.includedBaggage}>
      <LuLuggage size={13} style={{marginRight:4,verticalAlign:"middle"}}/>
      {lang === "en"
        ? t("passengerForm.checkedBagLbs", { lbs: Math.round((flight.seat?.baggage_included_kg || 0) * 2.20462) })
        : t("passengerForm.checkedBag", { kg: flight.seat?.baggage_included_kg || 0 })}
      &nbsp;·&nbsp;
      <LuBackpack size={13} style={{marginRight:4,verticalAlign:"middle"}}/>
      {lang === "en"
        ? t("passengerForm.cabinBagLbs", { lbs: Math.round((flight.seat?.carry_on_kg || 7) * 2.20462) })
        : t("passengerForm.cabinBag", { kg: flight.seat?.carry_on_kg || 7 })}
    </div>

    {/* Extra baggage */}
    <div className={styles.baggageSection}>
      <p className={styles.baggageTitle}>{t("passengerForm.extraBaggage")}</p>
      <div className={styles.baggageCards}>
        {baggageOptions.map((opt) => (
          <button
            key={opt.kg}
            className={`${styles.baggageCard} ${baggageKg === opt.kg ? styles.baggageActive : ""}`}
            onClick={() => onBaggageChange(opt.kg)}
          >
            <span className={styles.baggageKg}>{opt.label}</span>
            <span className={styles.baggagePrice}>
              {opt.price === 0 ? t("passengerForm.free") : fmt(opt.price)}
            </span>
          </button>
        ))}
      </div>
    </div>

    {/* Seat type selection — always show, pricing from API or default 0 */}
    <div className={styles.seatSection}>
      <p className={styles.seatTitle}>
        <LuArmchair size={13} style={{marginRight:4,verticalAlign:"middle"}}/>
        {lang === "en" ? "Seat Position" : "Vị trí ghế"}
      </p>
      <div className={styles.seatCards}>
        {/* Random / no preference */}
        <button
          className={`${styles.seatCard} ${seatType === null ? styles.seatActive : ""}`}
          onClick={() => onSeatTypeChange(null)}
        >
          <span className={styles.seatPos}>{lang === "en" ? "Random" : "Ngẫu nhiên"}</span>
          <span className={styles.seatPrice}>{t("passengerForm.free")}</span>
        </button>

        {/* window / aisle / middle — always visible */}
        {["window", "aisle", "middle"].map((pos) => {
          const price = seatPricing?.[pos] ?? 0;
          const posLabel = SEAT_POS_LABELS[pos]?.[lang] || SEAT_POS_LABELS[pos]?.vi || pos;
          return (
            <button
              key={pos}
              className={`${styles.seatCard} ${seatType === pos ? styles.seatActive : ""}`}
              onClick={() => onSeatTypeChange(pos)}
            >
              <span className={styles.seatPos}>{posLabel}</span>
              <span className={styles.seatPrice}>
                {price === 0 ? t("passengerForm.free") : `+${fmt(price * paxCount)}`}
              </span>
            </button>
          );
        })}

        {/* extra_legroom — chỉ hiện khi API trả về */}
        {seatPricing?.extra_legroom !== undefined && (() => {
          const price = seatPricing.extra_legroom;
          return (
            <button
              className={`${styles.seatCard} ${seatType === "extra_legroom" ? styles.seatActive : ""} ${styles.seatExitRow}`}
              onClick={() => onSeatTypeChange("extra_legroom")}
            >
              <span className={styles.seatPos}>{SEAT_POS_LABELS.extra_legroom?.[lang] || "Chỗ rộng"}</span>
              <span className={styles.seatPrice}>
                {price === 0 ? t("passengerForm.free") : `+${fmt(price * paxCount)}`}
              </span>
              <span className={styles.seatExitNote}>
                {lang === "en" ? "Exit row only" : "Hàng lối thoát"}
              </span>
            </button>
          );
        })()}

        {/* Tự chọn ghế — luôn hiện, giá cao nhất */}
        {(() => {
          const pickPrice = getPickPrice(seatPricing);
          return (
            <button
              className={`${styles.seatCard} ${styles.seatPickCard} ${seatType === "pick" ? styles.seatActive : ""}`}
              onClick={() => { onSeatTypeChange("pick"); onOpenSeatMap(); }}
            >
              <LuMapPin size={13} className={styles.seatPickIcon} />
              <span className={styles.seatPos}>{lang === "en" ? "Pick seat" : "Tự chọn ghế"}</span>
              <span className={styles.seatPrice}>+{fmt(pickPrice * paxCount)}</span>
              {pickedSeats?.length > 0 && (
                <span className={styles.seatPickedBadge}>{pickedSeats.join(", ")}</span>
              )}
            </button>
          );
        })()}
        </div>

        {/* Seat layout diagram */}
        <div className={styles.seatDiagram}>
          <div className={styles.seatDiagramRow}>
            {[
              { letter: "A", pos: "window" },
              { letter: "B", pos: "middle" },
              { letter: "C", pos: "aisle" },
            ].map(({ letter, pos }) => (
              <div key={letter} className={`${styles.seatDiagramCell} ${seatType === pos ? styles.seatDiagramActive : ""}`}>
                <span className={styles.seatDiagramLetter}>{letter}</span>
                <span className={styles.seatDiagramLabel}>
                  {SEAT_POS_LABELS[pos]?.[lang] || SEAT_POS_LABELS[pos]?.vi}
                </span>
              </div>
            ))}
            <div className={styles.seatDiagramAisle} />
            {[
              { letter: "D", pos: "aisle" },
              { letter: "E", pos: "middle" },
              { letter: "F", pos: "window" },
            ].map(({ letter, pos }) => (
              <div key={letter} className={`${styles.seatDiagramCell} ${seatType === pos ? styles.seatDiagramActive : ""}`}>
                <span className={styles.seatDiagramLetter}>{letter}</span>
                <span className={styles.seatDiagramLabel}>
                  {SEAT_POS_LABELS[pos]?.[lang] || SEAT_POS_LABELS[pos]?.vi}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
  </div>
);

const PassengerForm = ({ selectedFlights, passengers, onClose }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0];

  const [baggageOutbound, setBaggageOutbound] = useState(0);
  const [baggageReturn,   setBaggageReturn]   = useState(0);

  const [seatPricingOut, setSeatPricingOut] = useState(null);
  const [seatPricingRet, setSeatPricingRet] = useState(null);
  const [seatTypeOut,    setSeatTypeOut]    = useState(null);
  const [seatTypeRet,    setSeatTypeRet]    = useState(null);
  const [pickedSeatsOut, setPickedSeatsOut] = useState([]);
  const [pickedSeatsRet, setPickedSeatsRet] = useState([]);
  const [seatMapOpen,    setSeatMapOpen]    = useState(null); // null | "outbound" | "return"

  const paxCount = Math.max(1, Number(passengers?.adults || 0) + Number(passengers?.children || 0));

  const fmt = (n) => `${new Intl.NumberFormat("vi-VN").format(n)} VND`;

  const formatTime = (iso) => {
    if (!iso) return "--:--";
    const d = new Date(iso);
    if (isNaN(d)) return "--:--";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  useEffect(() => {
    const fetchPricing = async (flight, setter) => {
      if (!flight) return;
      const fid = flight.flight_id || flight.id;
      const cls = (flight.seat?.class || "economy").toLowerCase();
      if (!fid) return;
      try {
        const res = await getSeatPricing(fid, cls);
        setter(res.data?.data?.pricing_rules || null);
      } catch { setter(null); }
    };
    fetchPricing(selectedFlights.outbound, setSeatPricingOut);
    fetchPricing(selectedFlights.return,   setSeatPricingRet);
  }, []); // eslint-disable-line

  const outboundBaggageOptions = buildBaggageOptions(selectedFlights.outbound, t, lang);
  const returnBaggageOptions   = buildBaggageOptions(selectedFlights.return,   t, lang);

  const extraBagOut = outboundBaggageOptions.find((o) => o.kg === baggageOutbound)?.price || 0;
  const extraBagRet = returnBaggageOptions.find((o)   => o.kg === baggageReturn)?.price   || 0;

  const seatFeeOut = seatTypeOut === "pick"
    ? getPickPrice(seatPricingOut) * paxCount
    : (seatTypeOut && seatPricingOut ? (seatPricingOut[seatTypeOut] || 0) * paxCount : 0);
  const seatFeeRet = seatTypeRet === "pick"
    ? getPickPrice(seatPricingRet) * paxCount
    : (seatTypeRet && seatPricingRet ? (seatPricingRet[seatTypeRet] || 0) * paxCount : 0);

  const totalPrice =
    (selectedFlights.outbound?.seat?.total_price || 0) + extraBagOut * paxCount + seatFeeOut +
    (selectedFlights.return?.seat?.total_price  || 0) + extraBagRet * paxCount + seatFeeRet;

  const tempPassengers = Array.from({ length: paxCount }, (_, i) => ({ id: i, name: `Hành khách ${i + 1}` }));

  const handleSeatMapConfirm = (selections) => {
    const seats = Object.values(selections).filter(Boolean);
    if (seatMapOpen === "outbound") { setPickedSeatsOut(seats); setSeatTypeOut("pick"); }
    if (seatMapOpen === "return")   { setPickedSeatsRet(seats); setSeatTypeRet("pick"); }
    setSeatMapOpen(null);
  };

  const handleContinue = () => {
    navigate("/ancillary", {
      state: {
        selectedFlights,
        passengers,
        baggage:        { outbound: baggageOutbound, return: baggageReturn },
        seatPreference: { outbound: seatTypeOut,     return: seatTypeRet  },
        prePickedSeats: { outbound: pickedSeatsOut,  return: pickedSeatsRet },
        totalPrice,
      },
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.headerTitle}>{t("passengerForm.reviewTrip")}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.paxBadge}>
            <LuUser size={13} style={{marginRight:4,verticalAlign:"middle"}}/>{passengers?.adults || 1} {t("passengerForm.adult")}{(passengers?.adults || 1) > 1 ? "s" : ""}
            {passengers?.children > 0 && ` · ${passengers.children} ${t("passengerForm.child")}${passengers.children > 1 ? "ren" : ""}`}
          </div>

          {selectedFlights.outbound && (
            <FlightSummary
              flight={selectedFlights.outbound}
              label={t("passengerForm.outboundFlight")}
              baggageKg={baggageOutbound}
              onBaggageChange={setBaggageOutbound}
              baggageOptions={outboundBaggageOptions}
              seatPricing={seatPricingOut}
              seatType={seatTypeOut}
              onSeatTypeChange={setSeatTypeOut}
              paxCount={paxCount}
              formatTime={formatTime}
              fmt={fmt}
              t={t}
              lang={lang}
              onOpenSeatMap={() => setSeatMapOpen("outbound")}
              pickedSeats={pickedSeatsOut}
            />
          )}

          {selectedFlights.return && (
            <FlightSummary
              flight={selectedFlights.return}
              label={t("passengerForm.returnFlight")}
              baggageKg={baggageReturn}
              onBaggageChange={setBaggageReturn}
              baggageOptions={returnBaggageOptions}
              seatPricing={seatPricingRet}
              seatType={seatTypeRet}
              onSeatTypeChange={setSeatTypeRet}
              paxCount={paxCount}
              formatTime={formatTime}
              fmt={fmt}
              t={t}
              lang={lang}
              onOpenSeatMap={() => setSeatMapOpen("return")}
              pickedSeats={pickedSeatsRet}
            />
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.totalBlock}>
            <span className={styles.totalLabel}>{t("passengerForm.total")}</span>
            <span className={styles.totalPrice}>{fmt(totalPrice)}</span>
          </div>
          <button className={styles.continueBtn} onClick={handleContinue}>
            {t("passengerForm.continue")}
          </button>
        </div>
      </div>

      {/* SeatMap overlay */}
      {seatMapOpen && (() => {
        const flight = seatMapOpen === "outbound" ? selectedFlights.outbound : selectedFlights.return;
        const flightId = flight?.flight_id || flight?.id;
        const seatClass = (flight?.seat?.class || "economy").toLowerCase();
        const initialSels = {};
        const existing = seatMapOpen === "outbound" ? pickedSeatsOut : pickedSeatsRet;
        existing.forEach((s, i) => { initialSels[i] = s; });
        return (
          <div className={styles.seatMapOverlay}>
            <SeatMap
              flightId={flightId}
              seatClass={seatClass}
              passengers={tempPassengers}
              onConfirm={handleSeatMapConfirm}
              onBack={() => setSeatMapOpen(null)}
              seatPreference="pick"
              initialSelections={initialSels}
            />
          </div>
        );
      })()}
    </div>
  );
};

export default PassengerForm;
