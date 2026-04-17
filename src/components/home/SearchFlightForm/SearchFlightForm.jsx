import { useState, useRef, useEffect } from "react";
import { getAirports } from "../../../services/airportService";
import styles from "./SearchFlightForm.module.css";
import swapIcon from "../../../assets/icons/swap.png";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const getAirportLabel = (airportList, code) => {
  if (!code) return "";
  const airport = airportList.find((item) => item.code === code);
  return airport ? `${airport.city} (${airport.code})` : code;
};

export default function SearchFlightForm({ initialData }) {
  const { t } = useTranslation();
  const [tripType, setTripType] = useState(initialData?.tripType || "oneway");
  const [airports, setAirports] = useState([]);
  const [airportResults, setAirportResults] = useState([]);
  const [from, setFrom] = useState(initialData?.from || "");
  const [to, setTo] = useState(initialData?.to || "");
  const [activeInput, setActiveInput] = useState(null);
  const airportRef = useRef(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const nextWeekStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [departureDate, setDepartureDate] = useState(initialData?.departureDate || todayStr);
  const [returnDate, setReturnDate] = useState(initialData?.returnDate || nextWeekStr);

  const [passengers, setPassengers] = useState({
    adult: Number(initialData?.adults) || 1,
    child: Number(initialData?.children) || 0,
  });

  const [showPassenger, setShowPassenger] = useState(false);
  const passengerRef = useRef(null);
  const departureDateRef = useRef(null);
  const returnDateRef = useRef(null);

  const toDisplayDate = (isoDate) => {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  };

  const [seatClass, setSeatClass] = useState(initialData?.seatClass || "Economy");
  const [showSeatClass, setShowSeatClass] = useState(false);
  const seatClassRef = useRef(null);
  const seatOptions = ["Economy", "Business", "First"];

  const [searchError, setSearchError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAirports = async () => {
      try {
        const res = await getAirports();
        const data = res.data.data || [];
        setAirports(data);
        setAirportResults(data);

        if (initialData) {
          setFrom(getAirportLabel(data, initialData.from));
          setTo(getAirportLabel(data, initialData.to));
        } else {
          const defaultFrom = data.find((a) => a.code === "SGN");
          const defaultTo = data.find((a) => a.code === "BKK");
          if (defaultFrom) setFrom(`${defaultFrom.city} (${defaultFrom.code})`);
          if (defaultTo) setTo(`${defaultTo.city} (${defaultTo.code})`);
        }
      } catch (err) {
        console.log("ERROR airports:", err);
      }
    };

    fetchAirports();
  }, [initialData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (passengerRef.current && !passengerRef.current.contains(event.target)) setShowPassenger(false);
      if (airportRef.current && !airportRef.current.contains(event.target)) setActiveInput(null);
      if (seatClassRef.current && !seatClassRef.current.contains(event.target)) setShowSeatClass(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const increase = (type) => setPassengers((prev) => ({ ...prev, [type]: prev[type] + 1 }));

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

  const getCode = (value) => {
    if (!value) return "";
    if (value.includes("(")) return value.match(/\((.*?)\)/)?.[1] || value;
    return value;
  };

  const handleSearch = () => {
    setSearchError("");
    if (!from.trim()) { setSearchError(t("search.err_from")); return; }
    if (!to.trim()) { setSearchError(t("search.err_to")); return; }
    if (!departureDate) { setSearchError(t("search.err_date")); return; }
    if (tripType === "roundtrip" && !returnDate) { setSearchError(t("search.err_return")); return; }
    const fromCode = getCode(from);
    const toCode = getCode(to);
    if (fromCode && toCode && fromCode.toUpperCase() === toCode.toUpperCase()) {
      setSearchError(t("search.err_same"));
      return;
    }

    navigate(`/flights?${new URLSearchParams({
      from: fromCode,
      to: toCode,
      departureDate,
      returnDate: tripType === "roundtrip" ? returnDate : "",
      adults: passengers.adult,
      children: passengers.child,
      seatClass,
      tripType,
    }).toString()}`);
  };

  const today = new Date().toISOString().split("T")[0];

  const passengerDisplay = (() => {
    const a = passengers.adult;
    const c = passengers.child;
    const adultStr = a > 1 ? `${a} ${t("search.adult")}s` : `${a} ${t("search.adult")}`;
    const childStr = c > 0 ? `, ${c} ${t("search.child")}${c > 1 ? "ren" : ""}` : "";
    return `${adultStr}${childStr} ▾`;
  })();

  return (
    <div className={styles.formCard}>
      <div className={styles.topRow}>
        <div className={styles.tripType}>
          <button className={tripType === "oneway" ? styles.active : ""} onClick={() => setTripType("oneway")}>
            {t("search.oneWay")}
          </button>
          <button className={tripType === "roundtrip" ? styles.active : ""} onClick={() => setTripType("roundtrip")}>
            {t("search.roundTrip")}
          </button>
        </div>

        <div className={styles.options}>
          <div className={styles.dropdown} ref={passengerRef}>
            <div className={styles.dropdownBtn} onClick={() => setShowPassenger(!showPassenger)}>
              {passengerDisplay}
            </div>
            {showPassenger && (
              <div className={styles.passengerBox}>
                <div className={styles.passengerRow}>
                  <div>
                    <span>{t("search.adult")}</span>
                    <span className={styles.passengerSub}>{t("search.adultAge")}</span>
                  </div>
                  <div className={styles.counter}>
                    <button onClick={() => decrease("adult")}>-</button>
                    <span>{passengers.adult}</span>
                    <button onClick={() => increase("adult")}>+</button>
                  </div>
                </div>
                <div className={styles.passengerRow}>
                  <div>
                    <span>{t("search.child")}</span>
                    <span className={styles.passengerSub}>{t("search.childAge")}</span>
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

      <div className={styles.searchRow} ref={airportRef}>
        <div className={styles.field}>
          <label>{t("search.departureCity")}</label>
          <input
            value={from}
            // placeholder={t("search.cityOrAirport")}
            onClick={() => openAirportList("from")}
            onChange={(e) => searchAirport(e.target.value, "from")}
          />
          {activeInput === "from" && airportResults.length > 0 && (
            <div className={styles.airportDropdown}>
              {airportResults.map((airport) => (
                <div key={airport.code} className={styles.airportItem} onClick={() => selectAirport(airport, "from")}>
                  <strong>{airport.city}</strong> ({airport.code})
                  <p>{airport.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className={styles.swap} onClick={swapAirport} type="button">
          <img src={swapIcon} alt="swap" />
        </button>

        <div className={styles.field}>
          <label>{t("search.destinationCity")}</label>
          <input
            value={to}
            // placeholder={t("search.cityOrAirport")}
            onClick={() => openAirportList("to")}
            onChange={(e) => searchAirport(e.target.value, "to")}
          />
          {activeInput === "to" && airportResults.length > 0 && (
            <div className={styles.airportDropdown}>
              {airportResults.map((airport) => (
                <div key={airport.code} className={styles.airportItem} onClick={() => selectAirport(airport, "to")}>
                  <strong>{airport.city}</strong> ({airport.code})
                  <p>{airport.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label>{t("search.departureDate")}</label>
          <div className={styles.dateWrapper}>
            <input
              type="text"
              value={toDisplayDate(departureDate)}
              readOnly
              onClick={() => departureDateRef.current?.showPicker?.()}
              className={styles.dateDisplay}
            />
            <input
              ref={departureDateRef}
              type="date"
              value={departureDate}
              min={today}
              onChange={(e) => { setDepartureDate(e.target.value); setSearchError(""); }}
              className={styles.dateHidden}
            />
          </div>
        </div>

        {tripType === "roundtrip" && (
          <div className={styles.field}>
            <label>{t("search.returnDate")}</label>
            <div className={styles.dateWrapper}>
              <input
                type="text"
                value={toDisplayDate(returnDate)}
                readOnly
                onClick={() => returnDateRef.current?.showPicker?.()}
                className={styles.dateDisplay}
              />
              <input
                ref={returnDateRef}
                type="date"
                value={returnDate}
                min={departureDate || today}
                onChange={(e) => { setReturnDate(e.target.value); setSearchError(""); }}
                className={styles.dateHidden}
              />
            </div>
          </div>
        )}

        <button className={styles.searchBtn} onClick={handleSearch} type="button">
          {t("search.searchFlights")}
        </button>
      </div>

      {searchError && <div className={styles.searchError}>⚠️ {searchError}</div>}
    </div>
  );
}
