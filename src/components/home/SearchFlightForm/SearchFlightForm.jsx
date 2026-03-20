import { useState, useRef, useEffect } from "react";
import styles from "./SearchFlightForm.module.css";
import swapIcon from "../../../assets/icons/swap.png";
import { airports } from "../../../data/airports";

export default function SearchFlightForm() {

  /* =========================
     TRIP TYPE
  ========================== */

  const [tripType, setTripType] = useState("oneway");


  /* =========================
     AIRPORT
     TODO: sau này thay bằng airport autocomplete API
  ========================== */

  const [from, setFrom] = useState("Ho Chi Minh City (SGN)");
  const [to, setTo] = useState("Bangkok (BKK)");

  const [airportResults, setAirportResults] = useState(airports);

  const [activeInput, setActiveInput] = useState(null);

  const airportRef = useRef();


  /* =========================
     DATE
  ========================== */

  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");


  /* =========================
     PASSENGERS
     TODO: backend sẽ dùng để tính giá và kiểm tra ghế
  ========================== */

  const [passengers, setPassengers] = useState({
    adult: 1,
    child: 0,
  });

  const [showPassenger, setShowPassenger] = useState(false);

  const passengerRef = useRef();


  /* =========================
     SEAT CLASS
     TODO: sau này lấy từ DB
  ========================== */

  const [seatClass, setSeatClass] = useState("Economy");


  /* =========================
     CLOSE DROPDOWN WHEN CLICK OUTSIDE
  ========================== */

  useEffect(() => {

    const handleClickOutside = (event) => {

      if (passengerRef.current && !passengerRef.current.contains(event.target)) {
        setShowPassenger(false);
      }

      if (airportRef.current && !airportRef.current.contains(event.target)) {
        setActiveInput(null);
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
      airport.city.toLowerCase().includes(value.toLowerCase())
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
     TODO: call flight API
  ========================== */

  const handleSearch = () => {

    const searchData = {
      from,
      to,
      departureDate,
      returnDate,
      passengers,
      seatClass,
      tripType,
    };

    console.log("Search flight:", searchData);

    // TODO:
    // flightService.searchFlights(searchData)

  };


  return (
    <div className={styles.formCard}>

      {/* ======================
          TOP BAR
      ======================= */}

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
                    <button type="button" onClick={() => decrease("adult")}>-</button>
                    <span>{passengers.adult}</span>
                    <button type="button" onClick={() => increase("adult")}>+</button>
                  </div>

                </div>

                <div className={styles.passengerRow}>
                  <span>Child</span>

                  <div className={styles.counter}>
                    <button type="button" onClick={() => decrease("child")}>-</button>
                    <span>{passengers.child}</span>
                    <button type="button" onClick={() => increase("child")}>+</button>
                  </div>

                </div>

              </div>

            )}

          </div>

          {/* SEAT CLASS */}

          <select
            value={seatClass}
            onChange={(e) => setSeatClass(e.target.value)}
          >
            {/* TODO: lấy từ database */}
            <option>Economy</option>
            <option>Premium Economy</option>
            <option>Business</option>
            <option>First Class</option>
          </select>

        </div>

      </div>


      {/* ======================
          SEARCH AREA
      ======================= */}

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


        {/* SWAP BUTTON */}

        <button
          type="button"
          className={styles.swap}
          onClick={swapAirport}
        >
          <img src={swapIcon} alt="swap"/>
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


        {/* DEPARTURE DATE */}

        <div className={styles.field}>
          <label>Departure date</label>

          <div className={styles.dateBox}>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </div>
        </div>


        {/* RETURN DATE */}

        {tripType === "roundtrip" && (

          <div className={styles.field}>
            <label>Return date</label>

            <div className={styles.dateBox}>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>

          </div>

        )}


        {/* SEARCH BUTTON */}

        <button
          className={styles.searchBtn}
          onClick={handleSearch}
        >
          Search Flights
        </button>

      </div>

    </div>
  );
}