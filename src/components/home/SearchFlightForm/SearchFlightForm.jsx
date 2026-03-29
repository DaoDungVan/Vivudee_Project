// src/components/home/SearchFlightForm/SearchFlightForm.jsx
// FIX: thay toàn bộ alert() bằng inline error message
// FIX: placeholder "From / To" hiển thị đúng chữ

import { useState, useRef, useEffect } from "react";
import { getAirports } from "../../../services/airportService";
import styles from "./SearchFlightForm.module.css";
import swapIcon from "../../../assets/icons/swap.png";
import { useNavigate } from "react-router-dom";

export default function SearchFlightForm({ initialData }) {
  const [tripType,    setTripType]    = useState(initialData?.tripType || "oneway");
  const [airports,     setAirports]     = useState([]);
  const [airportResults, setAirportResults] = useState([]);
  const [from,        setFrom]        = useState(initialData?.from || "");
  const [to,          setTo]          = useState(initialData?.to   || "");
  const [activeInput, setActiveInput] = useState(null);
  const airportRef    = useRef();

  const [departureDate, setDepartureDate] = useState(initialData?.departureDate || "");
  const [returnDate,    setReturnDate]    = useState(initialData?.returnDate    || "");

  const [passengers, setPassengers] = useState({
    adult: Number(initialData?.adults)    || 1,
    child: Number(initialData?.children) || 0,
  });

  const [showPassenger, setShowPassenger] = useState(false);
  const passengerRef = useRef();

  const [seatClass,     setSeatClass]    = useState(initialData?.seatClass || "Economy");
  const [showSeatClass, setShowSeatClass] = useState(false);
  const seatClassRef = useRef();
  const seatOptions  = ["Economy", "Business", "First"];

  // FIX: state lỗi inline thay vì alert()
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (initialData) {
      setTripType(initialData.tripType || "oneway");
      setDepartureDate(initialData.departureDate || "");
      setReturnDate(initialData.returnDate || "");
      setPassengers({
        adult: Number(initialData.adults)    || 1,
        child: Number(initialData.children) || 0,
      });
      setSeatClass(initialData.seatClass || "Economy");
    }
  }, [initialData]);

  useEffect(() => {
    const fetchAirports = async () => {
      try {
        const res  = await getAirports();
        const data = res.data.data || [];
        setAirports(data);
        setAirportResults(data);
      } catch (err) {
        console.log("ERROR airports:", err);
      }
    };
    fetchAirports();
  }, []);

  const getAirportLabel = (code) => {
    if (!code) return "";
    const airport = airports.find((a) => a.code === code);
    return airport ? `${airport.city} (${airport.code})` : code;
  };

  useEffect(() => {
    if (airports.length > 0 && initialData) {
      setFrom(getAirportLabel(initialData.from));
      setTo(getAirportLabel(initialData.to));
    }
  }, [airports, initialData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (passengerRef.current && !passengerRef.current.contains(event.target))
        setShowPassenger(false);
      if (airportRef.current && !airportRef.current.contains(event.target))
        setActiveInput(null);
      if (seatClassRef.current && !seatClassRef.current.contains(event.target))
        setShowSeatClass(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const increase = (type) =>
    setPassengers((prev) => ({ ...prev, [type]: prev[type] + 1 }));

  const decrease = (type) => {
    if (passengers[type] === 0) return;
    if (type === "adult" && passengers.adult === 1) return;
    setPassengers((prev) => ({ ...prev, [type]: prev[type] - 1 }));
  };

  const swapAirport = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const searchAirport = (value, type) => {
    const results = airports.filter((airport) =>
      airport.city.toLowerCase().includes(value.toLowerCase()) ||
      airport.code.toLowerCase().includes(value.toLowerCase()) ||
      airport.name.toLowerCase().includes(value.toLowerCase()),
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
    setSearchError("");
  };

  const navigate = useNavigate();

  const getCode = (value) => {
    if (!value) return "";
    if (value.includes("(")) return value.match(/\((.*?)\)/)?.[1] || value;
    return value;
  };

  const handleSearch = () => {
    setSearchError("");

    // FIX: validation với thông báo cụ thể, không dùng alert()
    if (!from.trim()) {
      setSearchError("Please select a departure city");
      return;
    }
    if (!to.trim()) {
      setSearchError("Please select a destination city");
      return;
    }
    if (!departureDate) {
      setSearchError("Please select a departure date");
      return;
    }
    if (tripType === "roundtrip" && !returnDate) {
      setSearchError("Please select a return date for round-trip");
      return;
    }
    const fromCode = getCode(from);
    const toCode   = getCode(to);
    if (fromCode && toCode && fromCode.toUpperCase() === toCode.toUpperCase()) {
      setSearchError("Departure and destination cannot be the same airport");
      return;
    }

    const searchData = {
      from: fromCode,
      to:   toCode,
      departureDate,
      returnDate: tripType === "roundtrip" ? returnDate : "",
      adults:   passengers.adult,
      children: passengers.child,
      seatClass,
      tripType,
    };

    navigate(`/flights?${new URLSearchParams(searchData).toString()}`);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className={styles.formCard}>
      {/* TOP ROW */}
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
            <div className={styles.dropdownBtn} onClick={() => setShowPassenger(!showPassenger)}>
              {passengers.adult} Adult{passengers.adult > 1 ? "s" : ""}
              {passengers.child > 0 ? `, ${passengers.child} Child${passengers.child > 1 ? "ren" : ""}` : ""} ▾
            </div>
            {showPassenger && (
              <div className={styles.passengerBox}>
                <div className={styles.passengerRow}>
                  <div>
                    <span>Adult</span>
                    <span className={styles.passengerSub}>12+ years</span>
                  </div>
                  <div className={styles.counter}>
                    <button onClick={() => decrease("adult")}>-</button>
                    <span>{passengers.adult}</span>
                    <button onClick={() => increase("adult")}>+</button>
                  </div>
                </div>
                <div className={styles.passengerRow}>
                  <div>
                    <span>Child</span>
                    <span className={styles.passengerSub}>2–11 years</span>
                  </div>
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
            <div className={styles.dropdownBtn} onClick={() => setShowSeatClass(!showSeatClass)}>
              {seatClass} ▾
            </div>
            {showSeatClass && (
              <div className={styles.seatBox}>
                {seatOptions.map((option) => (
                  <div
                    key={option}
                    className={`${styles.seatItem} ${seatClass === option ? styles.seatActive : ""}`}
                    onClick={() => { setSeatClass(option); setShowSeatClass(false); }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH ROW */}
      <div className={styles.searchRow} ref={airportRef}>
        {/* FROM */}
        <div className={styles.field}>
          <label>Departure city</label>
          <input
            value={from}
            placeholder="City or airport"
            onClick={() => openAirportList("from")}
            onChange={(e) => searchAirport(e.target.value, "from")}
          />
          {activeInput === "from" && airportResults.length > 0 && (
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
        <button className={styles.swap} onClick={swapAirport} type="button">
          <img src={swapIcon} alt="swap" />
        </button>

        {/* TO */}
        <div className={styles.field}>
          <label>Destination city</label>
          <input
            value={to}
            placeholder="City or airport"
            onClick={() => openAirportList("to")}
            onChange={(e) => searchAirport(e.target.value, "to")}
          />
          {activeInput === "to" && airportResults.length > 0 && (
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

        {/* DEPARTURE DATE */}
        <div className={styles.field}>
          <label>Departure date</label>
          <input
            type="date"
            value={departureDate}
            min={today}
            onChange={(e) => { setDepartureDate(e.target.value); setSearchError(""); }}
          />
        </div>

        {/* RETURN DATE */}
        {tripType === "roundtrip" && (
          <div className={styles.field}>
            <label>Return date</label>
            <input
              type="date"
              value={returnDate}
              min={departureDate || today}
              onChange={(e) => { setReturnDate(e.target.value); setSearchError(""); }}
            />
          </div>
        )}

        <button className={styles.searchBtn} onClick={handleSearch} type="button">
          🔍 Search Flights
        </button>
      </div>

      {/* FIX: inline error thay vì alert() */}
      {searchError && (
        <div className={styles.searchError}>
          ⚠️ {searchError}
        </div>
      )}
    </div>
  );
}
