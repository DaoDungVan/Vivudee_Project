import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import FlightCard from "../../components/flight/FlightCard/FlightCard";
import RecommendationBar from "../../components/flight/RecommendationBar/RecommendationBar";
import PriceCalendar from "../../components/flight/PriceCalendar/PriceCalendar";
import AlternativeFlights from "../../components/flight/AlternativeFlights/AlternativeFlights";
import BrowseByAirline from "../../components/flight/BrowseByAirline/BrowseByAirline";
import HeatCalendar from "../../components/flight/HeatCalendar/HeatCalendar";
import { LuCalendarDays, LuPlaneTakeoff, LuPlaneLanding } from "react-icons/lu";
import styles from "./FlightSearch.module.css";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { searchFlights, getMixedFlights } from "../../services/flightService";

import SearchFlightForm from "../../components/home/SearchFlightForm/SearchFlightForm";
import FilterPanel from "../../components/flight/FilterPanel/FilterPanel";
import PassengerForm from "../../components/booking/PassengerForm/PassengerForm";

const getHour = (isoTime) => {
  if (!isoTime) return null;
  const d = new Date(isoTime);
  if (isNaN(d)) return null;
  return d.getHours();
};

const getDurationMinutes = (label) => {
  if (!label) return 0;
  const match = label.match(/(\d+)h\s*(\d+)?m?/);
  if (!match) return 0;
  return parseInt(match[1] || 0) * 60 + parseInt(match[2] || 0);
};

const inSlot = (hour, slotValue) => {
  if (hour === null) return false;
  const [start, end] = slotValue.split("-").map(Number);
  return hour >= start && hour < end;
};

const applyFilters = (flights, filters) => {
  let result = flights.filter((flight) => {
    const code = flight?.airline?.code || flight?.airline_code;
    const price = flight?.seat?.total_price || 0;
    const depHour = getHour(flight?.departure?.time);
    const arrHour = getHour(flight?.arrival?.time);
    const duration = getDurationMinutes(flight?.duration_label);

    if (filters.airlines.length > 0 && !filters.airlines.includes(code)) return false;
    if (filters.priceMax !== null && price > filters.priceMax) return false;
    if (filters.departureSlots.length > 0) {
      if (!filters.departureSlots.some((slot) => inSlot(depHour, slot))) return false;
    }
    if (filters.arrivalSlots.length > 0) {
      if (!filters.arrivalSlots.some((slot) => inSlot(arrHour, slot))) return false;
    }
    if (filters.durationMax !== null && duration > filters.durationMax) return false;
    return true;
  });

  if (filters.sortPrice === "asc") {
    result = [...result].sort((a, b) => (a?.seat?.total_price || 0) - (b?.seat?.total_price || 0));
  } else if (filters.sortPrice === "desc") {
    result = [...result].sort((a, b) => (b?.seat?.total_price || 0) - (a?.seat?.total_price || 0));
  }

  return result;
};

const FlightSearch = () => {
  const { t } = useTranslation();
  const [outboundFlights, setOutboundFlights] = useState([]);
  const [returnFlights, setReturnFlights] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedOutbound, setSelectedOutbound] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const [step, setStep] = useState("outbound");
  const [showBooking, setShowBooking] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    airlines: [],
    priceMax: null,
    departureSlots: [],
    arrivalSlots: [],
    durationMax: null,
    sortPrice: null,
  });

  const location = useLocation();
  const query = new URLSearchParams(location.search);

  // Preselect flight khi navigate từ BrowseByAirline / AirlinePage / RecommendationBar
  const didPreselect = useRef(false);
  useEffect(() => {
    if (didPreselect.current) return;
    const pre = location.state?.preselectFlight;
    if (pre) {
      didPreselect.current = true;
      setSelectedOutbound(pre);
      setShowBooking(true);
    }
  }); // chạy sau mỗi render cho tới khi preselect

  const from = query.get("from");
  const to = query.get("to");
  const departureDate = query.get("departureDate");
  const returnDate = query.get("returnDate");
  const tripType = query.get("tripType");
  const adults = query.get("adults");
  const children = query.get("children");
  const seatClass = query.get("seatClass");

  const isRoundTrip = tripType === "round-trip" || tripType === "roundtrip";

  const initialData = { from, to, departureDate, returnDate, tripType, adults, children, seatClass };

  const hasSearchParams = !!(from && to && departureDate);

  useEffect(() => {
    const fetchFlights = async () => {
      if (!hasSearchParams) { setLoading(false); return; }
      setLoading(true);
      try {
        const res = await searchFlights({ from, to, departureDate, returnDate, tripType, adults, children, seatClass });

        if (Array.isArray(res)) {
          const outboundData = res[0].data?.data;
          const returnData = res[1].data?.data;
          setOutboundFlights(Array.isArray(outboundData) ? outboundData : outboundData?.outbound_flights || []);
          setReturnFlights(Array.isArray(returnData) ? returnData : returnData?.outbound_flights || []);
        } else {
          const data = res.data?.data;
          setOutboundFlights(Array.isArray(data) ? data : data?.outbound_flights || []);
          setReturnFlights([]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFlights();

    // AS-113: Fetch mixed-airline combos song song
    if (hasSearchParams) {
      setComboLoading(true);
      setComboResults(null);
      getMixedFlights({
        from, to,
        outbound_date: departureDate,
        return_date: returnDate || undefined,
        adults: adults || 1,
        children: children || 0,
        seat_class: seatClass || 'economy',
        max_stops: 2,
        limit: 15,
        sort_by: 'recommended',
      })
        .then(res => setComboResults(res.data))
        .catch(() => setComboResults(null))
        .finally(() => setComboLoading(false));
    }
  }, [from, to, departureDate, returnDate, tripType, adults, children, seatClass, hasSearchParams]);

  const handleSelectOutbound = (flight) => {
    if (selectedOutbound?.flight_id === flight.flight_id) { setShowBooking(true); return; }
    setSelectedOutbound(flight);
    setSelectedReturn(null);
    if (isRoundTrip) setStep("return");
  };

  const handleSelectReturn = (flight) => {
    if (selectedReturn?.flight_id === flight.flight_id) { setShowBooking(true); return; }
    setSelectedReturn(flight);
  };

  useEffect(() => {
    if (!isRoundTrip && selectedOutbound) setShowBooking(true);
    else if (isRoundTrip && selectedOutbound && selectedReturn) setShowBooking(true);
  }, [selectedOutbound, selectedReturn, isRoundTrip]);

  const [cheapestCalPrice, setCheapestCalPrice] = useState(null);
  const [showHeatCal, setShowHeatCal]           = useState(false);
  const [comboResults, setComboResults]         = useState(null);
  const [comboLoading, setComboLoading]         = useState(false);
  const [showCombo, setShowCombo]               = useState(false);

  const filteredOutbound = applyFilters(outboundFlights, filters);
  const filteredReturn = applyFilters(returnFlights, filters);
  const activeFilterCount =
    filters.airlines.length +
    filters.departureSlots.length +
    filters.arrivalSlots.length +
    (filters.priceMax !== null ? 1 : 0) +
    (filters.durationMax !== null ? 1 : 0) +
    (filters.sortPrice ? 1 : 0);

  return (
    <>
      <NavBar />

      <div className={styles.wrapper}>
        <div className={`${styles.mainLayout} ${!hasSearchParams ? styles.mainLayoutFull : ""}`}>
          {hasSearchParams && (
            <div className={`${styles.filterColumn} ${filtersOpen ? styles.filterColumnOpen : ""}`}>
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                outboundFlights={outboundFlights}
                returnFlights={returnFlights}
              />
            </div>
          )}

          <div className={styles.content}>
            <div className={styles.topSticky}>
              <SearchFlightForm initialData={initialData} />

              {hasSearchParams && (
                <>
                  <div className={styles.filterToggleRow}>
                    <button
                      className={styles.filterToggleBtn}
                      type="button"
                      onClick={() => setFiltersOpen((prev) => !prev)}
                    >
                      {filtersOpen ? t("flightSearch.hideFilters") : t("flightSearch.showFilters")}
                      {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                    </button>
                  </div>

                  <div className={styles.titleRow}>
                    <h2 className={styles.title}>
                      {t("flightSearch.flights")} <strong>{from}</strong> → <strong>{to}</strong>
                    </h2>

                    <div className={styles.tabs}>
                      {isRoundTrip && (<>
                        <button className={`${styles.tabBtn} ${step === "outbound" && !showCombo ? styles.activeTab : ""}`} onClick={() => { setStep("outbound"); setShowCombo(false); }}>
                          {t("flightSearch.outboundShort")}
                        </button>
                        <button className={`${styles.tabBtn} ${step === "return" && !showCombo ? styles.activeTab : ""}`} onClick={() => { setStep("return"); setShowCombo(false); }} disabled={!selectedOutbound}>
                          {t("flightSearch.returnShort")}
                        </button>
                      </>)}
                      {/* AS-113: Tab đa hãng */}
                      {(comboResults || comboLoading) && (
                        <button
                          className={`${styles.tabBtn} ${showCombo ? styles.activeTab : ""} ${styles.comboTab}`}
                          onClick={() => setShowCombo(p => !p)}
                        >
                          ✈ Đa hãng
                          {comboLoading && " ..."}
                          {!comboLoading && comboResults && (() => {
                            const n = isRoundTrip
                              ? (comboResults.roundtrip_combinations?.length || 0)
                              : (comboResults.one_way_options?.filter(o => o.legs?.length > 1).length || 0);
                            return n > 0 ? ` (${n})` : "";
                          })()}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Heat Calendar toggle */}
            {hasSearchParams && from && to && (
              <div style={{ marginBottom: 8 }}>
                <button
                  className={styles.heatCalBtn}
                  onClick={() => setShowHeatCal(p => !p)}
                >
                  <LuCalendarDays size={15} />
                  {showHeatCal ? t("heatCalendar.toggleHide") : t("heatCalendar.toggleShow")}
                </button>
                {showHeatCal && (
                  <HeatCalendar
                    from={from}
                    to={to}
                    selectedDate={departureDate}
                    seatClass={seatClass || "economy"}
                    adults={Number(adults || 1)}
                  />
                )}
              </div>
            )}

            {/* Price Calendar (5-day strip) */}
            {!loading && from && to && departureDate && (
              <PriceCalendar
                from={from}
                to={to}
                selectedDate={departureDate}
                seatClass={seatClass || "economy"}
                adults={Number(adults || 1)}
                onCalendarLoad={(calMap) => {
                  // Chỉ lấy min của các ngày KHÁC ngày đang chọn
                  // để badge "Đổi ngày tiết kiệm X" so đúng với ngày rẻ hơn
                  const otherPrices = Object.entries(calMap)
                    .filter(([date]) => date !== departureDate)
                    .map(([, price]) => price)
                    .filter(Boolean);
                  if (otherPrices.length) setCheapestCalPrice(Math.min(...otherPrices));
                  else setCheapestCalPrice(null);
                }}
              />
            )}

            <div className={styles.results}>
              {!hasSearchParams ? (
                <BrowseByAirline />
              ) : loading ? (
                <p className={styles.loading}>{t("flightSearch.loadingFlights")}</p>
              ) : showCombo ? (
                /* AS-113: Mixed airline combo results */
                <div className={styles.comboWrapper}>
                  {comboLoading ? (
                    <p className={styles.loading}>Đang tìm hành trình đa hãng...</p>
                  ) : (() => {
                    const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " VND";
                    const fmtT = (iso) => { if (!iso) return "--:--"; const d = new Date(iso); return isNaN(d) ? "--:--" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }); };
                    const combos = isRoundTrip
                      ? (comboResults?.roundtrip_combinations || [])
                      : (comboResults?.one_way_options?.filter(o => (o.legs?.length || 0) > 1) || []);

                    if (!combos.length) return <p className={styles.note}>Không tìm thấy hành trình đa hãng phù hợp</p>;

                    return combos.map((combo, idx) => {
                      const isRT = !!combo.outbound;
                      const legs = isRT ? null : combo.legs;
                      return (
                        <div key={idx} className={styles.comboCard}>
                          {isRT ? (
                            <>
                              {/* Round-trip combo */}
                              {[{ label: "Chiều đi", data: combo.outbound }, { label: "Chiều về", data: combo.return }].map(({ label, data }) => (
                                <div key={label} className={styles.comboLeg}>
                                  <span className={styles.comboLegLabel}>{label}</span>
                                  {(data.legs || [data]).map((leg, li) => (
                                    <div key={li} className={styles.comboLegRow}>
                                      <span className={styles.comboAirline}>{leg.airline?.name || leg.airline?.code}</span>
                                      <span className={styles.comboRoute}>{leg.departure?.code} → {leg.arrival?.code}</span>
                                      <span className={styles.comboTime}>{fmtT(leg.departure?.time)} – {fmtT(leg.arrival?.time)}</span>
                                      <span className={styles.comboPrice}>{fmt(leg.seat?.total_price)}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </>
                          ) : (
                            /* One-way multi-leg */
                            legs.map((leg, li) => (
                              <div key={li} className={styles.comboLeg}>
                                <span className={styles.comboLegLabel}>Chặng {li + 1}</span>
                                <div className={styles.comboLegRow}>
                                  <span className={styles.comboAirline}>{leg.airline?.name || leg.airline?.code}</span>
                                  <span className={styles.comboRoute}>{leg.departure?.code} → {leg.arrival?.code}</span>
                                  <span className={styles.comboTime}>{fmtT(leg.departure?.time)} – {fmtT(leg.arrival?.time)}</span>
                                  <span className={styles.comboPrice}>{fmt(leg.seat?.total_price)}</span>
                                </div>
                              </div>
                            ))
                          )}
                          <div className={styles.comboFooter}>
                            <div>
                              <span className={styles.comboAirlines}>{(combo.airlines || []).join(" + ")}</span>
                              {combo.stops_outbound !== undefined && <span className={styles.comboStops}>{combo.stops_outbound + (combo.stops_return || 0)} điểm dừng</span>}
                            </div>
                            <div className={styles.comboFooterRight}>
                              <span className={styles.comboTotal}>{fmt(combo.total_price)}</span>
                              <button
                                className={styles.comboSelectBtn}
                                onClick={() => {
                                  if (isRT) {
                                    const obFlight = combo.outbound.legs?.[0] || combo.outbound;
                                    const rtFlight = combo.return.legs?.[0] || combo.return;
                                    setSelectedOutbound(obFlight);
                                    setSelectedReturn(rtFlight);
                                    setShowBooking(true);
                                  } else {
                                    setSelectedOutbound(legs[0]);
                                    setShowBooking(true);
                                  }
                                  setShowCombo(false);
                                }}
                              >Chọn combo này</button>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className={styles.sliderWrapper}>
                  <div className={`${styles.slider} ${step === "return" ? styles.slideLeft : ""}`}>
                    <div className={styles.page}>
                      <h3><LuPlaneTakeoff size={17} />{t("flightSearch.outboundShort")} ({filteredOutbound.length})</h3>
                      {filteredOutbound.map((flight) => (
                        <FlightCard
                          key={flight.flight_id}
                          flight={flight}
                          onSelect={() => handleSelectOutbound(flight)}
                          isSelected={selectedOutbound?.flight_id === flight.flight_id}
                          cheapestCalPrice={cheapestCalPrice}
                        />
                      ))}
                    </div>

                    <div className={styles.page}>
                      {!isRoundTrip ? null : !selectedOutbound ? (
                        <p className={styles.note}>{t("flightSearch.selectOutboundFirst")}</p>
                      ) : (
                        <>
                          <h3><LuPlaneLanding size={17} />{t("flightSearch.returnShort")} ({filteredReturn.length})</h3>
                          {filteredReturn.map((flight) => (
                            <FlightCard
                              key={flight.flight_id}
                              flight={flight}
                              onSelect={() => handleSelectReturn(flight)}
                              isSelected={selectedReturn?.flight_id === flight.flight_id}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Gợi ý chuyến bay khác */}
                  <RecommendationBar from={from} to={to} />
                </div>
              )}

              {/* Alternative Flights — ngoài overflow:hidden */}
              {hasSearchParams && !loading && selectedOutbound && (
                <AlternativeFlights
                  selectedFlight={selectedOutbound}
                  seatClass={seatClass || "economy"}
                  adults={Number(adults || 1)}
                  onSelect={(f) => handleSelectOutbound(f)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {showBooking && (
        <PassengerForm
          selectedFlights={{ outbound: selectedOutbound, return: selectedReturn }}
          passengers={{ adults: Number(adults || 1), children: Number(children || 0) }}
          onClose={() => setShowBooking(false)}
        />
      )}

      <Footer />
    </>
  );
};

export default FlightSearch;
