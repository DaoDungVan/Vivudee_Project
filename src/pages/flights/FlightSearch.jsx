import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import FlightCard from "../../components/flight/FlightCard/FlightCard";
import styles from "./FlightSearch.module.css";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { searchFlights } from "../../services/flightService";

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

  useEffect(() => {
    const fetchFlights = async () => {
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
  }, [from, to, departureDate, returnDate, tripType, adults, children, seatClass]);

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
        <div className={styles.mainLayout}>
          <div className={`${styles.filterColumn} ${filtersOpen ? styles.filterColumnOpen : ""}`}>
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              outboundFlights={outboundFlights}
              returnFlights={returnFlights}
            />
          </div>

          <div className={styles.content}>
            <div className={styles.topSticky}>
              <SearchFlightForm initialData={initialData} />

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

                {isRoundTrip && (
                  <div className={styles.tabs}>
                    <button
                      className={`${styles.tabBtn} ${step === "outbound" ? styles.activeTab : ""}`}
                      onClick={() => setStep("outbound")}
                    >
                      {t("flightSearch.outboundShort")}
                    </button>
                    <button
                      className={`${styles.tabBtn} ${step === "return" ? styles.activeTab : ""}`}
                      onClick={() => setStep("return")}
                      disabled={!selectedOutbound}
                    >
                      {t("flightSearch.returnShort")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.results}>
              {loading ? (
                <p className={styles.loading}>{t("flightSearch.loadingFlights")}</p>
              ) : (
                <div className={styles.sliderWrapper}>
                  <div className={`${styles.slider} ${step === "return" ? styles.slideLeft : ""}`}>
                    <div className={styles.page}>
                      <h3>✈️ {t("flightSearch.outboundShort")} ({filteredOutbound.length})</h3>
                      {filteredOutbound.map((flight) => (
                        <FlightCard
                          key={flight.flight_id}
                          flight={flight}
                          onSelect={() => handleSelectOutbound(flight)}
                          isSelected={selectedOutbound?.flight_id === flight.flight_id}
                        />
                      ))}
                    </div>

                    <div className={styles.page}>
                      {!isRoundTrip ? null : !selectedOutbound ? (
                        <p className={styles.note}>{t("flightSearch.selectOutboundFirst")}</p>
                      ) : (
                        <>
                          <h3>🔁 {t("flightSearch.returnShort")} ({filteredReturn.length})</h3>
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
                </div>
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
