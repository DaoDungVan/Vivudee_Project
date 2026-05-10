import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { getFlightPosition } from "../../services/flightService";
import { createSocketConnection } from "../../services/socketService";
import styles from "./FlightTracker.module.css";

// ── Helper: format countdown ms → { h, m, s } ──────────
const formatCountdown = (ms) => {
  if (ms <= 0) return { h: "00", m: "00", s: "00" };
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return { h, m, s };
};

// ── Helper: format giờ từ ISO string ───────────────────
const formatTime = (iso) => {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// ── Component chính ─────────────────────────────────────
const FlightTracker = () => {
  const { flightId } = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();
  const token        = localStorage.getItem("token");

  // Nhận booking data từ Bookings.jsx truyền qua navigate state
  const bookingData = location.state?.booking || null;

  const [trackerData, setTrackerData] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [countdown, setCountdown]     = useState({ h: "00", m: "00", s: "00" });

  // Dùng ref để giữ giá trị countdown giữa các render
  // Không dùng state vì setInterval sẽ bị stale closure
  const socketRef        = useRef(null);
  const countdownRef     = useRef(null);
  const timeRemainingRef = useRef(0);

  // ── Bắt đầu đếm ngược ────────────────────────────────
  // Nhận timeRemaining (ms) → đếm ngược mỗi giây
  const startCountdown = useCallback((ms) => {
    // Xóa interval cũ nếu có
    if (countdownRef.current) clearInterval(countdownRef.current);

    timeRemainingRef.current = ms;
    setCountdown(formatCountdown(ms));

    countdownRef.current = setInterval(() => {
      timeRemainingRef.current = Math.max(0, timeRemainingRef.current - 1000);
      setCountdown(formatCountdown(timeRemainingRef.current));

      // Dừng khi hết giờ
      if (timeRemainingRef.current <= 0) {
        clearInterval(countdownRef.current);
      }
    }, 1000);
  }, []);

  // ── Fetch vị trí ban đầu khi trang load ──────────────
  useEffect(() => {
    const fetchPosition = async () => {
      try {
        setLoading(true);
        const res  = await getFlightPosition(flightId);
        const data = res.data?.data;
        setTrackerData(data);
        startCountdown(data.timeRemaining);
      } catch (err) {
        setError(
          err.response?.data?.error || "Không thể tải thông tin chuyến bay"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPosition();
  }, [flightId, startCountdown]);

  // ── Kết nối Socket.IO ─────────────────────────────────
  useEffect(() => {
    if (!flightId) return;

    // Tạo kết nối socket dùng token hiện tại
    const socket = createSocketConnection(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      // Gửi event join vào room flight:{flightId}
      socket.emit("flight:join", { flightId: Number(flightId) });
    });

    // Nhận vị trí mới từ server mỗi 30 giây
    socket.on("flight:updated", (data) => {
      setTrackerData(data);
      startCountdown(data.timeRemaining);
    });

    socket.on("flight:error", (err) => {
      console.error("[FlightTracker Socket]", err.message);
    });

    // Cleanup khi rời trang: leave room + disconnect socket + clear interval
    return () => {
      socket.emit("flight:leave", { flightId: Number(flightId) });
      socket.disconnect();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [flightId, token, startCountdown]);

  // ── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <NavBar />
        <div className={styles.loadingBody}>
          <div className={styles.spinner}></div>
          <p>Đang tải thông tin chuyến bay...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────
  if (error) {
    return (
      <div className={styles.page}>
        <NavBar />
        <div className={styles.errorBody}>
          <p>❌ {error}</p>
          <button onClick={() => navigate("/bookings")}>
            ← Quay lại đặt chỗ
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!trackerData) return null;

  const { position, departure, arrival, progress, status, flightNumber } =
    trackerData;

  const isLanded   = status === "landed";
  const isAirborne = status === "airborne";

  // Tính vị trí icon máy bay trên SVG
  // SVG viewBox: 0 0 700 400
  // Máy bay bay theo đường cong từ trái sang phải
  const planeX = 80 + progress * 540;
  const planeY = 280 - Math.sin(progress * Math.PI) * 160;

  return (
    <div className={styles.page}>
      <NavBar />

      <div className={styles.container}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={() => navigate("/bookings")}
          >
            ← Đặt chỗ của tôi
          </button>

          <div className={styles.headerRight}>
            <span className={styles.flightBadge}>✈ {flightNumber}</span>
            <div className={styles.routeRow}>
              <span className={styles.routeCity}>{departure.code}</span>
              <div className={styles.routeLine}>
                <span className={styles.routePlane}>✈</span>
              </div>
              <span className={styles.routeCity}>{arrival.code}</span>
            </div>
            <p className={styles.routeSub}>
              {departure.city} → {arrival.city}
              {bookingData && ` · ${bookingData.booking_code}`}
            </p>
          </div>
        </div>

        {/* ── Main layout: Map + Sidebar ── */}
        <div className={styles.mainLayout}>

          {/* ── Map ── */}
          <div className={styles.mapArea}>

            {/* Live badge */}
            <div className={styles.liveBadge}>
              <span className={styles.liveDot}></span>
              {isAirborne ? "LIVE · Đang bay" : isLanded ? "Đã hạ cánh" : "Chưa cất cánh"}
            </div>

            {/* Map zoom controls */}
            <div className={styles.mapControls}>
              <button className={styles.mapBtn}>+</button>
              <button className={styles.mapBtn}>−</button>
            </div>

            {/* SVG Map */}
            <svg
              viewBox="0 0 700 400"
              className={styles.mapSvg}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Sky gradient từ đêm → xanh */}
                <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#0a1628" />
                  <stop offset="60%"  stopColor="#1a3f6e" />
                  <stop offset="100%" stopColor="#4a9fce" />
                </linearGradient>

                {/* Đường bay: phần đã bay sáng, phần còn lại mờ */}
                <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"                   stopColor="#4aaee8" stopOpacity="0.9" />
                  <stop offset={`${progress * 100}%`} stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset={`${progress * 100}%`} stopColor="#ffffff" stopOpacity="0.2" />
                  <stop offset="100%"                 stopColor="#ffffff" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Sky */}
              <rect width="700" height="400" fill="url(#skyGrad)" />

              {/* Grid lines mờ giống bản đồ */}
              {[...Array(8)].map((_, i) => (
                <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="400"
                  stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}
              {[...Array(5)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 100} x2="700" y2={i * 100}
                  stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}

              {/* Ocean */}
              <path
                d="M 0 300 Q 100 275 200 290 Q 350 265 500 280 Q 600 260 700 270 L 700 400 L 0 400 Z"
                fill="#1e5a8c" opacity="0.75"
              />

              {/* Land trái */}
              <path
                d="M 0 250 Q 40 230 80 245 Q 120 225 160 240 L 160 400 L 0 400 Z"
                fill="#3a6028" opacity="0.9"
              />

              {/* Land phải */}
              <path
                d="M 560 230 Q 610 210 660 225 Q 690 215 700 220 L 700 400 L 540 400 Z"
                fill="#3a6028" opacity="0.9"
              />

              {/* Đường bay nét đứt (toàn bộ) */}
              <path
                d="M 80 280 Q 390 60 620 240"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="2"
                strokeDasharray="8 6"
                fill="none"
              />

              {/* Đường bay đã đi (gradient sáng) */}
              <path
                d="M 80 280 Q 390 60 620 240"
                stroke="url(#pathGrad)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />

              {/* Sân bay đi */}
              <circle cx="80" cy="280" r="7" fill="white" stroke="#0e81cd" strokeWidth="3" />
              <circle cx="80" cy="280" r="14" fill="none" stroke="rgba(14,129,205,0.3)" strokeWidth="2">
                <animate attributeName="r" from="7" to="20" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              <rect x="50" y="293" width="60" height="20" rx="4" fill="rgba(255,255,255,0.95)" />
              <text x="80" y="307" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1a1a2e">
                {departure.code}
              </text>

              {/* Sân bay đến */}
              <circle cx="620" cy="240" r="7" fill="white" stroke="#aaa" strokeWidth="3" />
              <rect x="590" y="253" width="60" height="20" rx="4" fill="rgba(255,255,255,0.95)" />
              <text x="620" y="267" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1a1a2e">
                {arrival.code}
              </text>

              {/* Icon máy bay — di chuyển theo progress */}
              {!isLanded && (
                <g transform={`translate(${planeX}, ${planeY})`}>
                  <circle r="18" fill="rgba(255,255,255,0.12)" />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="22"
                    style={{ transform: `rotate(${position.heading}deg)` }}
                  >
                    ✈
                  </text>
                </g>
              )}

              {/* Text "Đã hạ cánh" */}
              {isLanded && (
                <text x="350" y="200" textAnchor="middle" fontSize="22"
                  fontWeight="700" fill="#4ade80">
                  🛬 Đã hạ cánh
                </text>
              )}
            </svg>

            {/* Progress bar dưới map */}
            <div className={styles.progressPanel}>
              <div className={styles.progressTop}>
                <span>{departure.code} · {departure.city}</span>
                <span className={styles.progressPct}>
                  {Math.round(progress * 100)}% đã bay
                </span>
                <span>{arrival.code} · {arrival.city}</span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className={styles.progressTimes}>
                <span>{formatTime(departure.time)}</span>
                <span>{formatTime(arrival.time)}</span>
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className={styles.sidebar}>

            {/* Status */}
            <div className={`${styles.statusPill} ${isLanded ? styles.statusLanded : styles.statusAirborne}`}>
              <span className={styles.statusDot}></span>
              <span>
                {isLanded ? "Đã hạ cánh" : isAirborne ? "Đang bay" : "Chưa cất cánh"}
              </span>
              <span className={styles.statusUpdate}>Cập nhật mỗi 30s</span>
            </div>

            {/* Countdown — chỉ hiện khi đang bay */}
            {isAirborne && (
              <div className={styles.countdown}>
                <p className={styles.countdownLabel}>
                  Thời gian hạ cánh dự kiến
                </p>
                <div className={styles.countdownDigits}>
                  <span className={styles.countdownNum}>{countdown.h}</span>
                  <span className={styles.countdownSep}>:</span>
                  <span className={styles.countdownNum}>{countdown.m}</span>
                  <span className={styles.countdownSep}>:</span>
                  <span className={styles.countdownNum}>{countdown.s}</span>
                </div>
                <div className={styles.countdownUnits}>
                  <span>Giờ</span>
                  <span>Phút</span>
                  <span>Giây</span>
                </div>
                <p className={styles.countdownEta}>
                  Dự kiến hạ cánh lúc {formatTime(arrival.time)}
                </p>
              </div>
            )}

            {/* Landed block */}
            {isLanded && (
              <div className={styles.landedBlock}>
                <span>🛬</span>
                <p>Chuyến bay đã hạ cánh</p>
                <small>Cảm ơn bạn đã bay cùng Vivudee</small>
              </div>
            )}

            {/* Info tiles */}
            <div className={styles.infoGrid}>
              <div className={styles.infoTile}>
                <p className={styles.infoLabel}>✈ Cất cánh</p>
                <p className={styles.infoVal}>{formatTime(departure.time)}</p>
                <p className={styles.infoSub}>{departure.city}</p>
              </div>
              <div className={styles.infoTile}>
                <p className={styles.infoLabel}>🛬 Hạ cánh</p>
                <p className={styles.infoVal}>{formatTime(arrival.time)}</p>
                <p className={styles.infoSub}>{arrival.city}</p>
              </div>
              <div className={styles.infoTile}>
                <p className={styles.infoLabel}>📍 Tiến trình</p>
                <p className={styles.infoVal}>{Math.round(progress * 100)}%</p>
                <p className={styles.infoSub}>đã hoàn thành</p>
              </div>
              <div className={styles.infoTile}>
                <p className={styles.infoLabel}>🧭 Heading</p>
                <p className={styles.infoVal}>{position.heading}°</p>
                <p className={styles.infoSub}>góc hướng bay</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FlightTracker;