import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { getAirlineFlights } from "../../services/flightService";
import API from "../../services/axiosInstance";
import planeIcon from "../../assets/icons/plane.png";
import styles from "./AirlinePage.module.css";
import { LuPlaneTakeoff, LuChevronLeft, LuSearch } from "react-icons/lu";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0) + " VND";
const fmtTime = (iso) => {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return isNaN(d) ? "--:--" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
};
const fmtDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
};

export default function AirlinePage() {
  const { code }    = useParams();
  const navigate    = useNavigate();
  const { t }       = useTranslation();
  const { isDark }  = useTheme();

  // Scroll to top khi vào trang
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [code]);

  const [airline,  setAirline]  = useState(null);
  const [flights,  setFlights]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [seatClass, setSeatClass] = useState("economy");
  const [search,   setSearch]   = useState("");

  // Fetch airline info
  useEffect(() => {
    API.get("/flights/airlines")
      .then(res => {
        const list = res.data?.data || [];
        const found = list.find(a => a.code?.toUpperCase() === code?.toUpperCase());
        setAirline(found || { code, name: code });
      })
      .catch(() => setAirline({ code, name: code }));
  }, [code]);

  // Fetch flights
  useEffect(() => {
    setLoading(true);
    getAirlineFlights(code, seatClass)
      .then(res => setFlights(res.data?.data || []))
      .catch(() => setFlights([]))
      .finally(() => setLoading(false));
  }, [code, seatClass]);

  // Group flights by route
  const filteredFlights = search.trim()
    ? flights.filter(f =>
        f.departure?.code?.toLowerCase().includes(search.toLowerCase()) ||
        f.arrival?.code?.toLowerCase().includes(search.toLowerCase()) ||
        f.departure?.city?.toLowerCase().includes(search.toLowerCase()) ||
        f.arrival?.city?.toLowerCase().includes(search.toLowerCase()) ||
        f.flight_number?.toLowerCase().includes(search.toLowerCase())
      )
    : flights;

  const grouped = filteredFlights.reduce((acc, f) => {
    const key = `${f.departure?.code}-${f.arrival?.code}`;
    if (!acc[key]) acc[key] = { dep: f.departure, arr: f.arrival, flights: [] };
    acc[key].flights.push(f);
    return acc;
  }, {});

  const handleBook = (f) => {
    const date = f.departure?.time ? String(f.departure.time).slice(0, 10) : new Date().toISOString().slice(0, 10);
    navigate(
      `/flights?from=${f.departure?.code}&to=${f.arrival?.code}&departureDate=${date}&adults=1&children=0&seatClass=${seatClass}&tripType=one-way`,
      { state: { preselectFlight: f } }
    );
  };

  const logoSrc = isDark && airline?.logo_dark ? airline.logo_dark : (airline?.logo_url || planeIcon);

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>

        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <LuChevronLeft size={16} /> Quay lại
          </button>
          <div className={styles.airlineInfo}>
            <div className={styles.logoWrap}>
              <img
                src={logoSrc}
                alt={airline?.name}
                className={styles.logo}
                onError={e => { e.target.src = planeIcon; }}
              />
            </div>
            <div>
              <h1 className={styles.airlineName}>{airline?.name}</h1>
              <p className={styles.airlineCode}>{airline?.code} · {flights.length} chuyến bay khả dụng</p>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <LuSearch size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Tìm tuyến bay, mã chuyến..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <select
              className={styles.classSelect}
              value={seatClass}
              onChange={e => setSeatClass(e.target.value)}
            >
              <option value="economy">Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Đang tải chuyến bay...</p>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className={styles.empty}>
            <LuPlaneTakeoff size={48} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>Không có chuyến bay nào</p>
            <p className={styles.emptySub}>Thử đổi hạng ghế hoặc từ khoá tìm kiếm khác</p>
          </div>
        ) : (
          <div className={styles.groups}>
            {Object.values(grouped).map((g) => (
              <div key={`${g.dep?.code}-${g.arr?.code}`} className={styles.routeGroup}>
                <div className={styles.routeHeader}>
                  <span className={styles.routeCode}>{g.dep?.code}</span>
                  <LuPlaneTakeoff size={14} className={styles.routeArrow} />
                  <span className={styles.routeCode}>{g.arr?.code}</span>
                  <span className={styles.routeCity}>{g.dep?.city} → {g.arr?.city}</span>
                  <span className={styles.routeCount}>{g.flights.length} chuyến</span>
                </div>
                <div className={styles.flightList}>
                  {g.flights.map(f => (
                    <div key={f.flight_id} className={styles.flightCard} onClick={() => handleBook(f)}>
                      <div className={styles.flightLeft}>
                        <span className={styles.flightNum}>{f.flight_number}</span>
                        <span className={styles.flightTime}>
                          {fmtTime(f.departure?.time)} → {fmtTime(f.arrival?.time)}
                        </span>
                        <span className={styles.flightDate}>{fmtDate(f.departure?.time)}</span>
                      </div>
                      <div className={styles.flightRight}>
                        <span className={styles.flightDuration}>{f.duration_label}</span>
                        <span className={styles.flightSeats}>{f.seat?.available_seats ?? "?"} ghế</span>
                        <span className={styles.flightPrice}>{fmt(f.seat?.total_price)}</span>
                        <button className={styles.bookBtn}>Chọn</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
