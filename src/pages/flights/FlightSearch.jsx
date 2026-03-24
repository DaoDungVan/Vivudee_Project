import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import FlightCard from "../../components/flight/FlightCard/FlightCard";
import styles from "./FlightSearch.module.css";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { searchFlights } from "../../services/flightService";

import SearchFlightForm from "../../components/home/SearchFlightForm/SearchFlightForm";
import FilterPanel from "../../components/flight/FilterPanel/FilterPanel";

const FlightSearch = () => {
  const [outboundFlights, setOutboundFlights] = useState([]);
  const [returnFlights, setReturnFlights] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedOutbound, setSelectedOutbound] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const [filters, setFilters] = useState({
    airlines: [],
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

  const initialData = {
    from,
    to,
    departureDate,
    returnDate,
    adults,
    children,
    seatClass,
    tripType,
  };

  useEffect(() => {
    const fetchFlights = async () => {
      setLoading(true);

      try {
        const res = await searchFlights({
          from,
          to,
          departureDate,
          returnDate,
          adults,
          children,
          seatClass,
        });

        const data = res.data?.data || {};

        setOutboundFlights(data.outbound_flights || []);
        setReturnFlights(data.return_flights || []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
  }, [from, to, departureDate, returnDate, adults, children, seatClass]);

  // SELECT
  const handleSelectOutbound = (flight) => {
    setSelectedOutbound(flight);
    setSelectedReturn(null);

    setTimeout(() => {
      const el = document.getElementById("return-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSelectReturn = (flight) => {
    setSelectedReturn(flight);
  };

  // FILTER
  const filteredOutbound = outboundFlights.filter((flight) => {
    const code = flight?.airline?.code || flight?.airline_code;

    if (filters.airlines.length > 0 && !filters.airlines.includes(code)) {
      return false;
    }

    return true;
  });

  return (
    <>
      <NavBar />

      <div className={styles.wrapper}>
        <div className={styles.mainLayout}>
          {/* LEFT FILTER */}
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            flights={outboundFlights}
          />

          {/* RIGHT */}
          <div className={styles.content}>
            <SearchFlightForm initialData={initialData} />

            <h2 className={styles.title}>
              Flights: <strong>{from}</strong> → <strong>{to}</strong>
            </h2>

            <div className={styles.results}>
              {loading ? (
                <p className={styles.loading}>Loading flights...</p>
              ) : (
                <>
                  {/* OUTBOUND */}
                  <div className={styles.section}>
                    <h3>✈️ Outbound ({filteredOutbound.length})</h3>

                    {filteredOutbound.length === 0 ? (
                      <p className={styles.empty}>No outbound flights found</p>
                    ) : (
                      filteredOutbound.map((flight) => (
                        <FlightCard
                          key={flight.flight_id} // 🔥 FIX Ở ĐÂY
                          flight={flight}
                          onSelect={() => handleSelectOutbound(flight)}
                          isSelected={
                            selectedOutbound?.flight_id === flight.flight_id
                          }
                        />
                      ))
                    )}
                  </div>

                  {/* MESSAGE */}
                  {isRoundTrip && !selectedOutbound && (
                    <p className={styles.note}>
                      👉 Please select outbound first
                    </p>
                  )}

                  {/* RETURN */}
                  {isRoundTrip && selectedOutbound && (
                    <div id="return-section" className={styles.section}>
                      <h3>🔁 Return ({returnFlights.length})</h3>

                      {returnFlights.length === 0 ? (
                        <p className={styles.empty}>No return flights</p>
                      ) : (
                        returnFlights.map((flight) => (
                          <FlightCard
                            key={flight.flight_id}
                            flight={flight}
                            onSelect={() => handleSelectReturn(flight)}
                            isSelected={
                              selectedReturn?.flight_id === flight.flight_id
                            }
                          />
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default FlightSearch;
