import { useState, useRef, useEffect } from "react";
import { getAirports } from "../../../services/airportService";
import styles from "./SearchFlightForm.module.css";
import swapIcon from "../../../assets/icons/swap.png";
import { useNavigate } from "react-router-dom";

export default function SearchFlightForm({ initialData }) {
  /* =========================
     TRIP TYPE
  ========================== */

  const [tripType, setTripType] = useState(initialData?.tripType || "oneway");

  /* =========================
     AIRPORT (API)
  ========================== */

  const [airports, setAirports] = useState([]);
  const [airportResults, setAirportResults] = useState([]);

  const [from, setFrom] = useState(initialData?.from || "Hồ Chí Minh (SGN)");
  const [to, setTo] = useState(initialData?.to || "Bangkok (BKK)");

  const [activeInput, setActiveInput] = useState(null);
  const airportRef = useRef();

  /* =========================
     DATE
  ========================== */

  const [departureDate, setDepartureDate] = useState(initialData?.departureDate || "",);
  const [returnDate, setReturnDate] = useState(initialData?.returnDate || "");

  /* =========================
     PASSENGERS
  ========================== */

  const [passengers, setPassengers] = useState({
    adult: Number(initialData?.adults) || 1,
    child: Number(initialData?.children) || 0,
  });

  const [showPassenger, setShowPassenger] = useState(false);
  const passengerRef = useRef();

  /* =========================
     SEAT CLASS
  ========================== */

  const [seatClass, setSeatClass] = useState(
    initialData?.seatClass || "Economy",
  );

  const [showSeatClass, setShowSeatClass] = useState(false);
  const seatClassRef = useRef();
  const seatOptions = ["Economy", "Business", "First Class"];

  /* =========================
     SYNC initialData
  ========================== */

  useEffect(() => {
    if (initialData) {
      setTripType(initialData.tripType || "oneway");
      setDepartureDate(initialData.departureDate || "");
      setReturnDate(initialData.returnDate || "");

      setPassengers({
        adult: Number(initialData.adults) || 1,
        child: Number(initialData.children) || 0,
      });

      setSeatClass(initialData.seatClass || "Economy");
    }
  }, [initialData]);

  /* =========================
     FETCH AIRPORTS
  ========================== */

  useEffect(() => {
    const fetchAirports = async () => {
      try {
        const res = await getAirports();
        const data = res.data.data || [];

        setAirports(data);
        setAirportResults(data);
      } catch (err) {
        console.log("ERROR airports:", err);
      }
    };

    fetchAirports();
  }, []);

  /* =========================
     MAP CODE -> LABEL
  ========================== */

  const getAirportLabel = (code) => {
    if (!code) return "";

    const airport = airports.find((a) => a.code === code);

    return airport ? `${airport.city} (${airport.code})` : code;
  };

  /* =========================
     PREFILL LABEL SAU API
  ========================== */

  useEffect(() => {
    if (airports.length > 0 && initialData) {
      setFrom(getAirportLabel(initialData.from));
      setTo(getAirportLabel(initialData.to));
    }
  }, [airports, initialData]);

  /* =========================
     CLOSE DROPDOWN
  ========================== */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        passengerRef.current &&
        !passengerRef.current.contains(event.target)
      ) {
        setShowPassenger(false);
      }

      if (airportRef.current && !airportRef.current.contains(event.target)) {
        setActiveInput(null);
      }

      if (
        seatClassRef.current &&
        !seatClassRef.current.contains(event.target)
      ) {
        setShowSeatClass(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* =========================
     PASSENGER COUNTER
  ========================== */

  const increase = (type) => {
    setPassengers((prev) => ({
      ...prev,
      [type]: prev[type] + 1,
    }));
  };

  const decrease = (type) => {
    if (passengers[type] === 0) return;
    if (type === "adult" && passengers.adult === 1) return;

    setPassengers((prev) => ({
      ...prev,
      [type]: prev[type] - 1,
    }));
  };

  /* =========================
     SWAP AIRPORT
  ========================== */

  const swapAirport = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  /* =========================
     SEARCH AIRPORT
  ========================== */

  const searchAirport = (value, type) => {
    const results = airports.filter((airport) =>
      airport.city.toLowerCase().includes(value.toLowerCase()),
    );

    setAirportResults(results);

    if (type === "from") setFrom(value);
    else setTo(value);
  };

  const openAirportList = (type) => {
    setActiveInput(type);
    setAirportResults(airports);
  };

  const selectAirport = (airport, type) => {
    const value = `${airport.city} (${airport.code})`;

    if (type === "from") setFrom(value);
    else setTo(value);

    setActiveInput(null);
  };

  /* =========================
     SEARCH
  ========================== */

  const navigate = useNavigate();

  const getCode = (value) => {
    if (!value) return "";
    if (value.includes("(")) {
      return value.match(/\((.*?)\)/)?.[1];
    }
    return value;
  };

  const handleSearch = () => {
    if (!departureDate) {
      alert("Please select departure date");
      return;
    }

    if (tripType === "roundtrip" && !returnDate) {
      alert("Please select return date");
      return;
    }

    if (from === to) {
      alert("From and To cannot be the same");
      return;
    }

    const searchData = {
      from: getCode(from),
      to: getCode(to),
      departureDate,
      returnDate: tripType === "roundtrip" ? returnDate : "",
      adults: passengers.adult,
      children: passengers.child,
      seatClass,
      tripType,
    };

    console.log("Search flight:", searchData);

    const query = new URLSearchParams(searchData).toString();

    navigate(`/flights?${query}`);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className={styles.formCard}>
      {/* TOP */}
      <div className={styles.topRow}>
        <div className={styles.tripType}>
          <button
            className={tripType === "oneway" ? styles.active : ""}
            onClick={() => setTripType("oneway")}
          >
            One-way
          </button>

          <button
            className={tripType === "roundtrip" ? styles.active : ""}
            onClick={() => setTripType("roundtrip")}
          >
            Round-trip
          </button>
        </div>

        <div className={styles.options}>
          {/* PASSENGER */}
          <div className={styles.dropdown} ref={passengerRef}>
            <div
              className={styles.dropdownBtn}
              onClick={() => setShowPassenger(!showPassenger)}
            >
              {passengers.adult} Adult, {passengers.child} Child
            </div>

            {showPassenger && (
              <div className={styles.passengerBox}>
                <div className={styles.passengerRow}>
                  <span>Adult</span>
                  <div className={styles.counter}>
                    <button onClick={() => decrease("adult")}>-</button>
                    <span>{passengers.adult}</span>
                    <button onClick={() => increase("adult")}>+</button>
                  </div>
                </div>

                <div className={styles.passengerRow}>
                  <span>Child</span>
                  <div className={styles.counter}>
                    <button onClick={() => decrease("child")}>-</button>
                    <span>{passengers.child}</span>
                    <button onClick={() => increase("child")}>+</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SEAT CLASS */}
          <div className={styles.dropdown} ref={seatClassRef}>
            <div
              className={styles.dropdownBtn}
              onClick={() => setShowSeatClass(!showSeatClass)}
            >
              {seatClass} ▾
            </div>

            {showSeatClass && (
              <div className={styles.seatBox}>
                {seatOptions.map((option) => (
                  <div
                    key={option}
                    className={`${styles.seatItem} ${seatClass === option ? styles.seatActive : ""}`}
                    onClick={() => {
                      setSeatClass(option);
                      setShowSeatClass(false);
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className={styles.searchRow} ref={airportRef}>
        {/* FROM */}
        <div className={styles.field}>
          <label>From</label>
          <input
            value={from}
            onClick={() => openAirportList("from")}
            onChange={(e) => searchAirport(e.target.value, "from")}
          />

          {activeInput === "from" && (
            <div className={styles.airportDropdown}>
              {airportResults.map((airport) => (
                <div
                  key={airport.code}
                  className={styles.airportItem}
                  onClick={() => selectAirport(airport, "from")}
                >
                  <strong>{airport.city}</strong> ({airport.code})
                  <p>{airport.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SWAP */}
        <button className={styles.swap} onClick={swapAirport}>
          <img src={swapIcon} alt="swap" />
        </button>

        {/* TO */}
        <div className={styles.field}>
          <label>To</label>
          <input
            value={to}
            onClick={() => openAirportList("to")}
            onChange={(e) => searchAirport(e.target.value, "to")}
          />

          {activeInput === "to" && (
            <div className={styles.airportDropdown}>
              {airportResults.map((airport) => (
                <div
                  key={airport.code}
                  className={styles.airportItem}
                  onClick={() => selectAirport(airport, "to")}
                >
                  <strong>{airport.city}</strong> ({airport.code})
                  <p>{airport.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DEPARTURE */}
        <div className={styles.field}>
          <label>Departure date</label>
          <input
            type="date"
            value={departureDate}
            min={today}
            onChange={(e) => setDepartureDate(e.target.value)}
          />
        </div>

        {/* RETURN */}
        {tripType === "roundtrip" && (
          <div className={styles.field}>
            <label>Return date</label>
            <input
              type="date"
              value={returnDate}
              min={departureDate || today}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </div>
        )}

        <button className={styles.searchBtn} onClick={handleSearch}>
          Search Flights
        </button>
      </div>
    </div>
  );
}
