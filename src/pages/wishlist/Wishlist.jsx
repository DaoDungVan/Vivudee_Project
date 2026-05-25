import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { LuHeart, LuPlaneTakeoff, LuTrash2, LuTicket } from "react-icons/lu";
import { getWishlist, removeFromWishlist } from "../../services/wishlistService";
import planeIcon from "../../assets/icons/plane.png";
import styles from "./Wishlist.module.css";

const fmt = (n) => n != null ? new Intl.NumberFormat("vi-VN").format(n) + " ₫" : "—";
const fmtTime = (iso) => {
  if (!iso) return "--:--";
  const m = String(iso).match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); }
  catch { return "--:--"; }
};

export default function Wishlist() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const handleBook = (item) => {
    const flight     = item.flight || item;
    const from       = flight?.departure?.code || item.dep_code || "";
    const to         = flight?.arrival?.code   || item.arr_code || "";
    const seatClass  = item.seat_class || "economy";
    const depTime    = flight?.departure_time;
    const dateStr    = depTime
      ? new Date(depTime).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const params = new URLSearchParams({ from, to, departureDate: dateStr, seatClass, adults: "1" });
    navigate(`/flights?${params.toString()}`);
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
              const logoUrl   = flight?.airline?.logo_url;

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
