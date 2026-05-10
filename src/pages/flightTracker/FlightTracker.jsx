import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { getFlightPosition } from "../../services/flightService";
import { createSocketConnection } from "../../services/socketService";
import styles from "./FlightTracker.module.css";

// ── Math helpers ────────────────────────────────────────────────────────────
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const gcPoints = (lat1, lng1, lat2, lng2, n = 80) => {
  const φ1 = lat1 * D2R, λ1 = lng1 * D2R;
  const φ2 = lat2 * D2R, λ2 = lng2 * D2R;
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
  ));
  if (d < 0.0001) return [[lat1, lng1], [lat2, lng2]];
  return Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    return [Math.atan2(z, Math.sqrt(x * x + y * y)) * R2D, Math.atan2(y, x) * R2D];
  });
};

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const dφ = (lat2 - lat1) * D2R, dλ = (lng2 - lng1) * D2R;
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dλ / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// ── Format helpers ───────────────────────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, "0");

const formatCountdown = (ms) => {
  if (ms <= 0) return { h: "00", m: "00", s: "00" };
  const total = Math.floor(ms / 1000);
  return { h: pad2(Math.floor(total / 3600)), m: pad2(Math.floor((total % 3600) / 60)), s: pad2(total % 60) };
};

const formatTime = (iso) => {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

const formatDate = (iso, lang) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const getInitials = (name) =>
  (name || "?").trim().split(/\s+/).slice(-2).map((n) => n[0]).join("").toUpperCase();

const AVATAR_COLORS = ["#0e81cd", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ── Leaflet icon factory ────────────────────────────────────────────────────
const makeAirportIcon = (code, color = "#0e81cd") =>
  L.divIcon({
    html: `<div style="background:${color};color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);font-family:monospace;letter-spacing:0">${code}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const makePlaneIcon = (heading = 0) =>
  L.divIcon({
    html: `<div style="transform:rotate(${heading - 45}deg);font-size:22px;line-height:1;filter:drop-shadow(0 2px 5px rgba(0,0,0,.5));color:#0e81cd">✈</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

// ── Component ────────────────────────────────────────────────────────────────
const FlightTracker = () => {
  const { flightId }  = useParams();
  const location      = useLocation();
  const navigate      = useNavigate();
  const { t, i18n }   = useTranslation();
  const token         = localStorage.getItem("token");
  const bookingData   = location.state?.booking || null;

  const [trackerData, setTrackerData] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [countdown,   setCountdown]   = useState({ h: "00", m: "00", s: "00" });
  const [isDark,      setIsDark]      = useState(
    document.documentElement.getAttribute("data-theme") === "dark"
  );

  const socketRef        = useRef(null);
  const countdownRef     = useRef(null);
  const timeRemainingRef = useRef(0);

  // Sync dark theme with MutationObserver
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark")
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const startCountdown = useCallback((ms) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    timeRemainingRef.current = ms;
    setCountdown(formatCountdown(ms));
    countdownRef.current = setInterval(() => {
      timeRemainingRef.current = Math.max(0, timeRemainingRef.current - 1000);
      setCountdown(formatCountdown(timeRemainingRef.current));
      if (timeRemainingRef.current <= 0) clearInterval(countdownRef.current);
    }, 1000);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res  = await getFlightPosition(flightId);
        const data = res.data?.data;
        setTrackerData(data);
        startCountdown(data.timeRemaining);
      } catch (err) {
        setError(err.response?.data?.error || t("tracker.errorMsg"));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [flightId, startCountdown, t]);

  useEffect(() => {
    if (!flightId) return;
    const socket = createSocketConnection(token);
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("flight:join", { flightId: Number(flightId) }));
    socket.on("flight:updated", (data) => { setTrackerData(data); startCountdown(data.timeRemaining); });
    socket.on("flight:error",   (err)  => console.error("[FlightTracker]", err.message));
    return () => {
      socket.emit("flight:leave", { flightId: Number(flightId) });
      socket.disconnect();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [flightId, token, startCountdown]);

  // ── Derived booking helpers ─────────────────────────────────────────────
  const airlineName   = bookingData?.flight?.airline?.name || bookingData?.outbound_flight?.airline?.name || "";
  const bookingCode   = bookingData?.booking_code || "";
  const seatClass     = bookingData?.flight?.seat_class || bookingData?.outbound_flight?.seat_class || "";
  const passengerList = bookingData?.passengers?.list || null;
  const lang          = i18n.language;

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={styles.page}>
      <NavBar />
      <div className={styles.centerBody}>
        <div className={styles.spinner} />
        <p>{t("tracker.loadingMsg")}</p>
      </div>
      <Footer />
    </div>
  );

  // ── Error ───────────────────────────────────────────────────────────────
  if (error) return (
    <div className={styles.page}>
      <NavBar />
      <div className={styles.centerBody}>
        <p className={styles.errorText}>❌ {error}</p>
        <button className={styles.backBtnLarge} onClick={() => navigate("/bookings")}>
          ← {t("tracker.myBookings")}
        </button>
      </div>
      <Footer />
    </div>
  );

  if (!trackerData) return null;

  const { position, departure, arrival, progress, status, flightNumber } = trackerData;
  const isAirborne = status === "airborne";
  const isLanded   = status === "landed";

  // ── Computed values ─────────────────────────────────────────────────────
  const hasCoords  = departure?.lat && arrival?.lat;
  const arcPoints  = hasCoords ? gcPoints(departure.lat, departure.lng, arrival.lat, arrival.lng, 80) : null;
  const splitIdx   = arcPoints ? Math.round(progress * (arcPoints.length - 1)) : 0;
  const flownPath  = arcPoints?.slice(0, splitIdx + 1) || [];
  const remainPath = arcPoints?.slice(splitIdx) || [];
  const planePos   = arcPoints ? arcPoints[Math.min(splitIdx, arcPoints.length - 1)] : null;

  const totalKm = hasCoords ? haversineKm(departure.lat, departure.lng, arrival.lat, arrival.lng) : null;
  const flownKm = totalKm ? Math.round(totalKm * progress) : null;

  const durationMs = departure?.time && arrival?.time
    ? new Date(arrival.time) - new Date(departure.time) : null;
  const dh = durationMs ? Math.floor(durationMs / 3600000) : 0;
  const dm = durationMs ? Math.floor((durationMs % 3600000) / 60000) : 0;

  const mapBounds = hasCoords
    ? [[departure.lat - 2, departure.lng - 2], [arrival.lat + 2, arrival.lng + 2]]
    : null;

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const statusKey = isAirborne ? "live" : isLanded ? "landed" : "scheduled";
  const depIcon   = makeAirportIcon(departure?.code || "", "#0e81cd");
  const arrIcon   = makeAirportIcon(arrival?.code   || "", isLanded ? "#16a34a" : "#64748b");
  const planeIcon = makePlaneIcon(position?.heading || 0);

  return (
    <div className={styles.page}>
      <NavBar />

      <div className={styles.container}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate("/bookings")}>
            ← {t("tracker.myBookings")}
          </button>

          <div className={styles.headerCenter}>
            <div className={styles.headerBadges}>
              <span className={styles.flightBadge}>✈ {flightNumber}</span>
              {airlineName && <span className={styles.airlineBadge}>{airlineName}</span>}
            </div>
            <div className={styles.routeRow}>
              <span className={styles.iata}>{departure?.code}</span>
              <div className={styles.routeTrack}>
                <div className={styles.routeLine} />
                <span className={styles.routePlaneIcon}>✈</span>
                <div className={styles.routeLine} />
              </div>
              <span className={styles.iata}>{arrival?.code}</span>
            </div>
            <p className={styles.routeSub}>
              {departure?.city} → {arrival?.city}
              {seatClass && (
                <span className={styles.classTag}>
                  {seatClass.charAt(0).toUpperCase() + seatClass.slice(1)}
                </span>
              )}
              {departure?.time && <span> · {formatDate(departure.time, lang)}</span>}
              {bookingCode && <span className={styles.codeTag}> · {bookingCode}</span>}
            </p>
          </div>

          <div className={`${styles.statusChip} ${isAirborne ? styles.chipAirborne : isLanded ? styles.chipLanded : styles.chipScheduled}`}>
            <span className={styles.chipDot} />
            {t(`tracker.${statusKey}`)}
          </div>
        </div>

        {/* ── Content ── */}
        <div className={styles.content}>

          {/* Map */}
          <div className={styles.mapWrap}>
            {mapBounds ? (
              <MapContainer
                bounds={mapBounds}
                boundsOptions={{ padding: [40, 40] }}
                style={{ width: "100%", height: "100%" }}
                zoomControl
                scrollWheelZoom
                key={isDark ? "dark" : "light"}
              >
                <TileLayer
                  url={tileUrl}
                  attribution='© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>'
                />

                {remainPath.length > 1 && (
                  <Polyline
                    positions={remainPath}
                    pathOptions={{ color: "#94a3b8", weight: 2, opacity: 0.45, dashArray: "8 6" }}
                  />
                )}
                {flownPath.length > 1 && (
                  <Polyline
                    positions={flownPath}
                    pathOptions={{ color: "#0e81cd", weight: 3, opacity: 0.9 }}
                  />
                )}
                {departure?.lat && <Marker position={[departure.lat, departure.lng]} icon={depIcon} />}
                {arrival?.lat   && <Marker position={[arrival.lat,   arrival.lng]}   icon={arrIcon} />}
                {!isLanded && planePos && <Marker position={planePos} icon={planeIcon} />}
              </MapContainer>
            ) : (
              <div className={styles.mapPlaceholder}>🗺 {t("tracker.loadingMsg")}</div>
            )}

            {/* Live badge */}
            <div className={`${styles.liveBadge} ${isAirborne ? styles.liveBadgeActive : ""}`}>
              <span className={styles.liveDot} />
              {t(`tracker.${statusKey}`)}
            </div>

            {/* Progress bar */}
            <div className={styles.progressPanel}>
              <div className={styles.progressTop}>
                <span>{departure?.code} · {departure?.city}</span>
                <span className={styles.progressPct}>{Math.round(progress * 100)}%</span>
                <span>{arrival?.code} · {arrival?.city}</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
              </div>
              <div className={styles.progressTimes}>
                <span>{formatTime(departure?.time)}</span>
                <span>{formatTime(arrival?.time)}</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>

            {/* ETA Countdown */}
            {isAirborne && (
              <div className={styles.etaCard}>
                <p className={styles.etaLabel}>{t("tracker.etaLabel")}</p>
                <div className={styles.countdownRow}>
                  <div className={styles.countBlock}>
                    <span className={styles.countNum}>{countdown.h}</span>
                    <span className={styles.countUnit}>{t("tracker.hour")}</span>
                  </div>
                  <span className={styles.countSep}>:</span>
                  <div className={styles.countBlock}>
                    <span className={styles.countNum}>{countdown.m}</span>
                    <span className={styles.countUnit}>{t("tracker.min")}</span>
                  </div>
                  <span className={styles.countSep}>:</span>
                  <div className={styles.countBlock}>
                    <span className={styles.countNum}>{countdown.s}</span>
                    <span className={styles.countUnit}>{t("tracker.sec")}</span>
                  </div>
                </div>
                <p className={styles.etaSub}>{t("tracker.etaSub", { time: formatTime(arrival?.time) })}</p>
              </div>
            )}

            {/* Landed */}
            {isLanded && (
              <div className={styles.landedCard}>
                <span className={styles.landedIcon}>🛬</span>
                <p className={styles.landedTitle}>{t("tracker.landedMsg")}</p>
                <p className={styles.landedSub}>{t("tracker.thankYou")}</p>
              </div>
            )}

            {/* Scheduled notice */}
            {!isAirborne && !isLanded && (
              <div className={styles.scheduledCard}>
                <span className={styles.scheduledIcon}>⏳</span>
                <p className={styles.scheduledText}>{t("tracker.scheduled")}</p>
                <p className={styles.scheduledSub}>{t("tracker.updateEvery")}</p>
              </div>
            )}

            {/* Info Grid */}
            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <p className={styles.infoLabel}>✈ {t("tracker.departed")}</p>
                <p className={styles.infoTime}>{formatTime(departure?.time)}</p>
                <p className={styles.infoCity}>{departure?.city}</p>
                <p className={styles.infoCode}>{departure?.code}</p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoLabel}>🛬 {t("tracker.arrival")}</p>
                <p className={styles.infoTime}>{formatTime(arrival?.time)}</p>
                <p className={styles.infoCity}>{arrival?.city}</p>
                <p className={styles.infoCode}>{arrival?.code}</p>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoLabel}>⏱ {t("tracker.journey")}</p>
                <p className={styles.infoTime}>{dh}h {dm}m</p>
                {totalKm && <p className={styles.infoCode}>{totalKm.toLocaleString()} km</p>}
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoLabel}>📍 {t("tracker.progress")}</p>
                <p className={styles.infoTime}>{Math.round(progress * 100)}%</p>
                {flownKm != null && <p className={styles.infoCode}>~{flownKm.toLocaleString()} km</p>}
              </div>
            </div>

            {/* Passengers */}
            {passengerList?.filter((p) => p.flight_type === "outbound").length > 0 && (
              <div className={styles.passSection}>
                <p className={styles.passSectionTitle}>{t("tracker.passengers")}</p>
                {passengerList
                  .filter((p) => p.flight_type === "outbound")
                  .map((p, i) => (
                    <div key={i} className={styles.passRow}>
                      <div className={styles.passAvatar} style={{ background: avatarColor(p.full_name) }}>
                        {getInitials(p.full_name)}
                      </div>
                      <div className={styles.passInfo}>
                        <p className={styles.passName}>{p.full_name}</p>
                        {p.seat_number && (
                          <p className={styles.passSeat}>{t("tracker.seat", { number: p.seat_number })}</p>
                        )}
                      </div>
                      {p.seat_number && (
                        <span className={styles.seatBadge}>{p.seat_number}</span>
                      )}
                    </div>
                  ))}
              </div>
            )}

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FlightTracker;
