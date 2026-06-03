import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { getAirlineFlights } from "../../services/flightService";
import API from "../../services/axiosInstance";
import planeIcon from "../../assets/icons/plane.png";
import styles from "./AirlinePage.module.css";
import { LuPlaneTakeoff, LuChevronLeft, LuSearch, LuSlidersHorizontal, LuChevronDown, LuChevronRight } from "react-icons/lu";

const TIME_SLOTS = [
  { label: "00:00 – 06:00", value: "0-6" },
  { label: "06:00 – 12:00", value: "6-12" },
  { label: "12:00 – 18:00", value: "12-18" },
  { label: "18:00 – 24:00", value: "18-24" },
];

const INIT_FILTERS = {
  priceMax: null,
  departureSlots: [],
  arrivalSlots: [],
  sortPrice: null,
};

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

const getHour = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d) ? null : d.getUTCHours();
};

const inSlot = (hour, value) => {
  if (hour === null) return false;
  const [s, e] = value.split("-").map(Number);
  return hour >= s && hour < e;
};

export default function AirlinePage() {
  const { code }    = useParams();
  const navigate    = useNavigate();
  const { t }       = useTranslation();
  const { isDark }  = useTheme();

  const [airline,    setAirline]    = useState(null);
  const [flights,    setFlights]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [seatClass,  setSeatClass]  = useState("economy");
  const [search,     setSearch]     = useState("");
  const [filters,    setFilters]    = useState(INIT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    API.get("/flights/airlines")
      .then(res => {
        const list = res.data?.data || [];
        const found = list.find(a => a.code?.toUpperCase() === code?.toUpperCase());
        setAirline(found || { code, name: code });
      })
      .catch(() => setAirline({ code, name: code }));
  }, [code]);

  useEffect(() => {
    setLoading(true);
    getAirlineFlights(code, seatClass)
      .then(res => setFlights(res.data?.data || []))
      .catch(() => setFlights([]))
      .finally(() => setLoading(false));
  }, [code, seatClass]);

  // Tính min/max giá từ dữ liệu thực
  const allPrices = flights.map(f => f.seat?.total_price || 0).filter(Boolean);
  const minPrice  = allPrices.length ? Math.min(...allPrices) : 0;
  const maxPrice  = allPrices.length ? Math.max(...allPrices) : 10_000_000;
  const currentMax = filters.priceMax ?? maxPrice;

  // Áp dụng search + filter
  const processed = useMemo(() => {
    let result = flights.filter(f => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = [
          f.departure?.code, f.arrival?.code,
          f.departure?.city, f.arrival?.city,
          f.flight_number,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!text.includes(q)) return false;
      }

      // Price
      const price = f.seat?.total_price || 0;
      if (filters.priceMax !== null && price > filters.priceMax) return false;

      // Departure time slots
      if (filters.departureSlots.length > 0) {
        const h = getHour(f.departure?.time);
        if (!filters.departureSlots.some(s => inSlot(h, s))) return false;
      }

      // Arrival time slots
      if (filters.arrivalSlots.length > 0) {
        const h = getHour(f.arrival?.time);
        if (!filters.arrivalSlots.some(s => inSlot(h, s))) return false;
      }

      return true;
    });

    if (filters.sortPrice === "asc")
      result = [...result].sort((a, b) => (a.seat?.total_price || 0) - (b.seat?.total_price || 0));
    else if (filters.sortPrice === "desc")
      result = [...result].sort((a, b) => (b.seat?.total_price || 0) - (a.seat?.total_price || 0));

    return result;
  }, [flights, search, filters]);

  // Nhóm theo tuyến bay
  const grouped = useMemo(() => {
    const map = {};
    processed.forEach(f => {
      const key = `${f.departure?.code}-${f.arrival?.code}`;
      if (!map[key]) map[key] = { dep: f.departure, arr: f.arrival, flights: [] };
      map[key].flights.push(f);
    });
    return map;
  }, [processed]);

  const activeCount =
    filters.departureSlots.length +
    filters.arrivalSlots.length +
    (filters.priceMax !== null ? 1 : 0) +
    (filters.sortPrice ? 1 : 0);

  const handleBook = (f) => {
    const date = f.departure?.time ? String(f.departure.time).slice(0, 10) : new Date().toISOString().slice(0, 10);
    navigate(
      `/flights?from=${f.departure?.code}&to=${f.arrival?.code}&departureDate=${date}&adults=1&children=0&seatClass=${seatClass}&tripType=one-way`,
      { state: { preselectFlight: f } }
    );
  };

  const toggleSlot = (type, val) =>
    setFilters(p => ({
      ...p,
      [type]: p[type].includes(val) ? p[type].filter(v => v !== val) : [...p[type], val],
    }));

  const resetFilters = () => setFilters(INIT_FILTERS);

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

          {/* Search + Class + Filter toggle */}
          <div className={styles.toolBar}>
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
            <button
              className={`${styles.filterBtn} ${filterOpen ? styles.filterBtnActive : ""}`}
              onClick={() => setFilterOpen(p => !p)}
            >
              <LuSlidersHorizontal size={14} />
              Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>
          </div>
        </div>

        <div className={`${styles.body} ${filterOpen ? styles.bodyWithFilter : ""}`}>

          {/* Filter panel */}
          {filterOpen && (
            <aside className={styles.filterPanel}>
              <div className={styles.panelHead}>
                <span className={styles.panelTitle}>Bộ lọc</span>
                {activeCount > 0 && (
                  <button className={styles.resetBtn} onClick={resetFilters}>Đặt lại</button>
                )}
              </div>

              {/* Sort */}
              <div className={styles.group}>
                <p className={styles.groupTitle}>Sắp xếp theo giá</p>
                <button
                  className={`${styles.optBtn} ${filters.sortPrice === "asc" ? styles.optActive : ""}`}
                  onClick={() => setFilters(p => ({ ...p, sortPrice: p.sortPrice === "asc" ? null : "asc" }))}
                >
                  Giá thấp nhất trước
                </button>
                <button
                  className={`${styles.optBtn} ${filters.sortPrice === "desc" ? styles.optActive : ""}`}
                  onClick={() => setFilters(p => ({ ...p, sortPrice: p.sortPrice === "desc" ? null : "desc" }))}
                >
                  Giá cao nhất trước
                </button>
              </div>

              {/* Price */}
              <div className={styles.group}>
                <p className={styles.groupTitle}>Giá vé tối đa</p>
                <div className={styles.rangeRow}>
                  <span>{fmt(minPrice)}</span>
                  <span className={styles.rangeVal}>{fmt(currentMax)}</span>
                </div>
                <input
                  type="range"
                  className={styles.range}
                  min={minPrice} max={maxPrice} step={50_000}
                  value={currentMax}
                  onChange={e => setFilters(p => ({ ...p, priceMax: Number(e.target.value) }))}
                />
              </div>

              {/* Departure time */}
              <div className={styles.group}>
                <p className={styles.groupTitle}>Giờ khởi hành</p>
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot.value}
                    className={`${styles.optBtn} ${filters.departureSlots.includes(slot.value) ? styles.optActive : ""}`}
                    onClick={() => toggleSlot("departureSlots", slot.value)}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>

              {/* Arrival time */}
              <div className={styles.group}>
                <p className={styles.groupTitle}>Giờ đến</p>
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot.value}
                    className={`${styles.optBtn} ${filters.arrivalSlots.includes(slot.value) ? styles.optActive : ""}`}
                    onClick={() => toggleSlot("arrivalSlots", slot.value)}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* Content */}
          <div className={styles.content}>
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
                {Object.values(grouped).map(g => (
                  <div key={`${g.dep?.code}-${g.arr?.code}`} className={styles.routeGroup}>
                    <div className={styles.routeHeader}>
                      <span className={styles.routeCode}>{g.dep?.code}</span>
                      <LuPlaneTakeoff size={14} className={styles.routeArrow} />
                      <span className={styles.routeCode}>{g.arr?.code}</span>
                      <span className={styles.routeCity}>{g.dep?.city} → {g.arr?.city}</span>
                      <span className={styles.routeCount}>{g.flights.length} chuyến</span>
                    </div>
                    <div className={styles.flightList}>
                      {g.flights.map(f => {
                        const isExp = expandedId === f.flight_id;
                        return (
                          <div key={f.flight_id} className={`${styles.flightItem} ${isExp ? styles.flightItemOpen : ""}`}>
                            {/* Row summary — click để toggle */}
                            <div
                              className={styles.flightCard}
                              onClick={() => setExpandedId(isExp ? null : f.flight_id)}
                            >
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
                                <LuChevronDown size={16} className={`${styles.chevron} ${isExp ? styles.chevronOpen : ""}`} />
                              </div>
                            </div>

                            {/* Detail panel */}
                            {isExp && (
                              <div className={styles.flightDetail}>
                                <div className={styles.detailRoute}>
                                  <div className={styles.detailPort}>
                                    <span className={styles.detailTime}>{fmtTime(f.departure?.time)}</span>
                                    <span className={styles.detailCode}>{f.departure?.code}</span>
                                    <span className={styles.detailCity}>{f.departure?.name || f.departure?.city}</span>
                                  </div>
                                  <div className={styles.detailMid}>
                                    <span className={styles.detailDur}>{f.duration_label}</span>
                                    <div className={styles.detailLine}>
                                      <span className={styles.detailDot} />
                                      <span className={styles.detailTrack} />
                                      <LuPlaneTakeoff size={14} className={styles.detailPlane} />
                                      <span className={styles.detailTrack} />
                                      <span className={styles.detailDot} />
                                    </div>
                                    <span className={styles.detailDirect}>Bay thẳng</span>
                                  </div>
                                  <div className={`${styles.detailPort} ${styles.detailPortRight}`}>
                                    <span className={styles.detailTime}>{fmtTime(f.arrival?.time)}</span>
                                    <span className={styles.detailCode}>{f.arrival?.code}</span>
                                    <span className={styles.detailCity}>{f.arrival?.name || f.arrival?.city}</span>
                                  </div>
                                </div>

                                <div className={styles.detailMeta}>
                                  <span className={styles.detailBadge}>Hạng: {f.seat?.class || seatClass}</span>
                                  <span className={styles.detailBadge}>{f.seat?.available_seats ?? "?"} ghế trống</span>
                                  <span className={styles.detailBadge}>23 kg ký gửi · 7 kg xách tay</span>
                                </div>

                                <div className={styles.detailFooter}>
                                  <div className={styles.detailPriceWrap}>
                                    <span className={styles.detailPriceLabel}>Tổng giá</span>
                                    <span className={styles.detailPrice}>{fmt(f.seat?.total_price)}</span>
                                  </div>
                                  <button
                                    className={styles.bookBtn}
                                    onClick={e => { e.stopPropagation(); handleBook(f); }}
                                  >
                                    Chọn chuyến này
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
