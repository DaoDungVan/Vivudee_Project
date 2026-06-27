import { useState, useEffect } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { LuHeart, LuPlaneTakeoff, LuTrash2, LuTicket, LuCalendarDays } from "react-icons/lu";
import { getWishlist, removeFromWishlist } from "../../services/wishlistService";
import planeIcon from "../../assets/icons/plane.png";
import styles from "./Wishlist.module.css";

const fmt = (n) => n != null ? new Intl.NumberFormat("vi-VN").format(n) + " ₫" : "—";
// Lấy ngày hôm nay theo local time — KHÔNG dùng toISOString (quy đổi UTC sẽ lùi 1 ngày
// trong khoảng 00:00-06:59 giờ VN vì lệch UTC+7)
const todayLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtTime = (iso) => {
  if (!iso) return "--:--";
  const m = String(iso).match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); }
  catch { return "--:--"; }
};
// Ngày bay — lấy thẳng từ chuỗi gốc (KHÔNG qua Date/toISOString) để tránh lệch
// múi giờ, giống cách dùng ở handleBook
const fmtDate = (iso) => {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
};

export default function Wishlist() {
  const { t }      = useTranslation();
  const navigate   = useNavigate();
  const { isDark } = useTheme();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource]   = useState("server");
  const [removing, setRemoving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getWishlist();
      setItems(res.items || []);
      setSource(res.source);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (flightId, seatClass) => {
    setRemoving(`${flightId}_${seatClass}`);
    try {
      await removeFromWishlist(flightId, seatClass);
      // item.flight.id là flight ID từ backend formatItem
      setItems(prev => prev.filter(i => {
        const fid = i.flight?.id || i.flight_id;
        return !(String(fid) === String(flightId) && i.seat_class === seatClass);
      }));
    } catch { /* ignore */ }
    finally { setRemoving(null); }
  };

  // Dùng thẳng dữ liệu đã lưu trong wishlist để build preselectFlight — không
  // search lại theo ngày, vì departure_time có thể là UTC và lệch ngày so với
  // giờ VN, làm sai departureDate và không tìm khớp được flight_id.
  const handleBook = (item) => {
    const flight    = item.flight || item;
    const flightId  = flight?.id || item.flight_id;
    const seatClass = item.seat_class || "economy";
    const depCode   = flight?.departure?.code || item.dep_code || "";
    const arrCode   = flight?.arrival?.code   || item.arr_code || "";
    const depCity   = flight?.departure?.city || depCode;
    const arrCity   = flight?.arrival?.city   || arrCode;
    const depTime   = flight?.departure_time || flight?.departure?.time;
    const arrTime   = flight?.arrival_time   || flight?.arrival?.time;
    const price     = flight?.base_price || flight?.seat?.total_price || 0;

    let durationLabel = "--";
    if (depTime && arrTime) {
      const diffMin = Math.round((new Date(arrTime) - new Date(depTime)) / 60000);
      if (diffMin > 0) {
        const h = Math.floor(diffMin / 60), m = diffMin % 60;
        durationLabel = m > 0 ? `${h}h ${m}m` : `${h}h`;
      }
    }

    const preselectFlight = {
      flight_id: flightId,
      flight_number: flight?.flight_number,
      duration_label: durationLabel,
      departure: { code: depCode, city: depCity, time: depTime },
      arrival:   { code: arrCode, city: arrCity, time: arrTime },
      airline: flight?.airline,
      seat: {
        class: seatClass,
        total_price: price,
        baggage_included_kg: flight?.seat?.baggage_included_kg,
        carry_on_kg: flight?.seat?.carry_on_kg,
        extra_baggage_price: flight?.seat?.extra_baggage_price,
        extra_baggage_options: flight?.seat?.extra_baggage_options,
      },
    };

    const dateStr = depTime ? String(depTime).slice(0, 10) : todayLocal();
    const params = new URLSearchParams({
      from: depCode, to: arrCode, departureDate: dateStr, seatClass, adults: "1", children: "0", tripType: "one-way",
    });

    navigate(`/flights?${params.toString()}`, { state: { preselectFlight } });
  };

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <LuHeart size={22} style={{ marginRight: 10, verticalAlign: "middle", color: "#ef4444" }} />
            {t("wishlist.title")}
          </h1>
          <p className={styles.sub}>
            {source === "local" ? t("wishlist.guestNote") : t("wishlist.subtitle")}
          </p>
        </div>

        {loading ? (
          <div className={styles.loading}>{t("wishlist.loading")}</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <LuHeart size={52} style={{ color: "#cbd5e1", marginBottom: 16 }} />
            <p className={styles.emptyTitle}>{t("wishlist.empty")}</p>
            <p className={styles.emptySub}>{t("wishlist.emptySub")}</p>
            <button className={styles.browseBtn} onClick={() => navigate("/flights")}>
              <LuPlaneTakeoff size={16} style={{ marginRight: 6 }} />
              {t("wishlist.browse")}
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map((item) => {
              const flight = item.flight || item;
              // Backend trả flight_id trong flight.id (từ formatItem)
              // Backend formatItem: { id, seat_class, flight: { id, departure_time, arrival_time, base_price, departure:{code,city}, arrival:{code,city}, airline:{name,logo_url} } }
              const flightId  = flight?.id || item.flight_id;
              const seatClass = item.seat_class || "economy";
              const key = `${flightId}_${seatClass}`;

              const depCode   = flight?.departure?.code  || "—";
              const arrCode   = flight?.arrival?.code    || "—";
              const depCity   = flight?.departure?.city  || depCode;
              const arrCity   = flight?.arrival?.city    || arrCode;
              const depTime   = flight?.departure_time   || flight?.departure?.time;
              const arrTime   = flight?.arrival_time     || flight?.arrival?.time;
              const price     = flight?.base_price       || flight?.seat?.total_price;
              const airline   = flight?.airline?.name    || "—";
              const logoUrl   = (isDark && flight?.airline?.logo_dark) ? flight.airline.logo_dark : flight?.airline?.logo_url;

              return (
                <div key={key} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div className={styles.airlineRow}>
                      <img
                        src={logoUrl || planeIcon}
                        alt={airline}
                        className={styles.logo}
                        onError={(e) => { e.target.src = planeIcon; }}
                      />
                      <div>
                        <p className={styles.airlineName}>{airline}</p>
                        <p className={styles.seatClass}>{seatClass}</p>
                      </div>
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleRemove(flightId, seatClass)}
                      disabled={removing === key}
                      title={t("wishlist.remove")}
                    >
                      <LuTrash2 size={15} />
                    </button>
                  </div>

                  {fmtDate(depTime) && (
                    <p className={styles.flightDate}>
                      <LuCalendarDays size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      {fmtDate(depTime)}
                    </p>
                  )}

                  <div className={styles.route}>
                    <div className={styles.routePoint}>
                      <span className={styles.iata}>{depCode}</span>
                      <span className={styles.city}>{depCity}</span>
                      <span className={styles.time}>{fmtTime(depTime)}</span>
                    </div>
                    <div className={styles.routeLine}>
                      <LuPlaneTakeoff size={14} style={{ color: "var(--primary-color)" }} />
                    </div>
                    <div className={styles.routePoint} style={{ textAlign: "right" }}>
                      <span className={styles.iata}>{arrCode}</span>
                      <span className={styles.city}>{arrCity}</span>
                      <span className={styles.time}>{fmtTime(arrTime)}</span>
                    </div>
                  </div>

                  <div className={styles.cardBottom}>
                    <span className={styles.price}>{fmt(price)}</span>
                    <button className={styles.bookBtn} onClick={() => handleBook(item)}>
                      <LuTicket size={14} style={{ marginRight: 5 }} />
                      {t("wishlist.book")}
                    </button>
                  </div>

                  {item.saved_at && (
                    <p className={styles.savedAt}>
                      {t("wishlist.savedAt")} {new Date(item.saved_at).toLocaleDateString("vi-VN")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
