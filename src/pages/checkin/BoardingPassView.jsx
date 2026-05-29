import { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { useParams } from "react-router-dom";
import { LuPlaneTakeoff, LuShare2, LuPrinter, LuCircleAlert } from "react-icons/lu";
import { getBoardingPass } from "../../services/checkinService";
import styles from "./BoardingPassView.module.css";

export default function BoardingPassView() {
  const { code } = useParams();
  const [bp, setBp]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (!code) return;
    getBoardingPass(code.toUpperCase())
      .then(res => setBp(res.data?.data || res.data))
      .catch(err => setError(err?.response?.data?.error || "Không tìm thấy boarding pass."))
      .finally(() => setLoading(false));
  }, [code]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "Boarding Pass", text: `Boarding pass: ${code}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Đã copy link boarding pass!");
    }
  };

  if (loading) return (
    <div className={styles.fullscreen}>
      <div className={styles.spinner} />
      <p className={styles.loadingText}>Đang tải boarding pass...</p>
    </div>
  );

  if (error) return (
    <div className={styles.fullscreen}>
      <LuCircleAlert size={44} className={styles.errorIcon} />
      <p className={styles.errorText}>{error}</p>
      <a href="/checkin" className={styles.backLink}>← Quay lại check-in</a>
    </div>
  );

  if (!bp) return null;

  const seat  = bp.seat  || "--";
  const gate  = bp.gate  || "TBA";

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <a href="/checkin" className={styles.topBack}>← Checkin</a>
        <span className={styles.topTitle}>Boarding Pass</span>
        <div className={styles.topActions}>
          <button className={styles.iconBtn} onClick={handleShare} title="Chia sẻ">
            <LuShare2 size={18} />
          </button>
          <button className={styles.iconBtn} onClick={() => window.print()} title="In">
            <LuPrinter size={18} />
          </button>
        </div>
      </div>

      {/* Card */}
      <div className={styles.card}>

        {/* Airline header */}
        <div className={styles.cardHeader}>
          <div className={styles.headerLeft}>
            {(bp.airline_logo_dark || bp.airline_logo)
              ? <img src={bp.airline_logo_dark || bp.airline_logo} alt={bp.airline || "airline"} className={styles.airlineLogo} />
              : <span className={styles.airline}>{bp.airline || "VIVUDEE AIR"}</span>
            }
            <span className={styles.flightNum}>{bp.flight_number || ""}</span>
          </div>
          <span className={styles.bpLabel}>BOARDING PASS</span>
        </div>

        {/* Passenger */}
        <div className={styles.passenger}>
          <div className={styles.passengerLabel}>Hành khách</div>
          <div className={styles.passengerName}>{bp.passenger_name || "—"}</div>
        </div>

        {/* Route */}
        <div className={styles.route}>
          <div className={styles.airport}>
            <span className={styles.apCode}>{bp.departure_airport || "---"}</span>
            <span className={styles.apCity}>{bp.departure_city || ""}</span>
            <span className={styles.apTime}>{bp.departure_time || "--:--"}</span>
          </div>
          <div className={styles.routeMid}>
            <LuPlaneTakeoff size={22} className={styles.planeIcon} />
            <div className={styles.routeLine} />
          </div>
          <div className={`${styles.airport} ${styles.airportRight}`}>
            <span className={styles.apCode}>{bp.arrival_airport || "---"}</span>
            <span className={styles.apCity}>{bp.arrival_city || ""}</span>
            <span className={styles.apTime}>{bp.arrival_time || "--:--"}</span>
          </div>
        </div>

        {/* Date row */}
        <div className={styles.dateRow}>
          <div className={styles.dateItem}>
            <span className={styles.metaLabel}>Ngày bay</span>
            <span className={styles.metaVal}>{bp.date || "—"}</span>
          </div>
          <div className={styles.dateItem}>
            <span className={styles.metaLabel}>Giờ boarding</span>
            <span className={styles.metaVal}>{bp.boarding_time || "—"}</span>
          </div>
          <div className={styles.dateItem}>
            <span className={styles.metaLabel}>Booking</span>
            <span className={styles.metaValCode}>{bp.booking_code || "—"}</span>
          </div>
        </div>

        {/* Tear line */}
        <div className={styles.tearRow}>
          <div className={styles.tearCircleLeft} />
          <div className={styles.tearDash} />
          <div className={styles.tearCircleRight} />
        </div>

        {/* Seat + Gate */}
        <div className={styles.bigRow}>
          <div className={styles.bigItem}>
            <span className={styles.bigLabel}>Ghế</span>
            <span className={styles.bigVal}>{seat}</span>
          </div>
          <div className={styles.bigDivider} />
          <div className={styles.bigItem}>
            <span className={styles.bigLabel}>Cổng</span>
            <span className={`${styles.bigVal} ${styles.bigValBlue}`}>{gate}</span>
          </div>
        </div>

        {/* Barcode strip */}
        <div className={styles.barcodeWrap}>
          <Barcode value={bp.boarding_pass_code || code} />
          <div className={styles.barcodeCode}>{bp.boarding_pass_code || code}</div>
        </div>

      </div>

      {/* Footer hint */}
      <p className={styles.hint}>
        Xuất trình màn hình này cùng giấy tờ tùy thân tại cổng lên máy bay
      </p>
    </div>
  );
}

function Barcode({ value = "" }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    JsBarcode(svgRef.current, value, {
      format:       "CODE128",
      width:        2,
      height:       60,
      margin:       0,
      displayValue: false,
      background:   "transparent",
      lineColor:    "#000",
    });
  }, [value]);

  return (
    <div className={styles.barcodeInner}>
      <svg ref={svgRef} />
    </div>
  );
}
