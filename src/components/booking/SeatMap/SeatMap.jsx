import { useState, useEffect, useRef } from "react";
import { getSeatMap } from "../../../services/flightService";
import styles from "./SeatMap.module.css";
import { useTranslation } from "react-i18next";

const AISLE_AFTER = { economy: 2, business: 1, first: 1 };

/* ── Seat coordinate system (same as seatmaps.com source) ─────────────────
   Wrapper: 880px wide, scaled down. Seats positioned with left:50% (=440px)
   + margin-left from center. Row y = 1440 + (rowNum-1) × 172 px.

   Column offsets derived from source:
     totalW = N_cols × 86 + (N_cols-1) × 20 + 124 (aisle)
     x_start = -(totalW / 2)
   Verified: 6-col economy → A=-370 B=-264 C=-158 [aisle] D=52 E=158 F=264  ✓
*/
const SEAT_W   = 86;
const SEAT_H   = 140;
const COL_GAP  = 20;
const AISLE_W  = 124;
const ROW_Y0   = 1440;
const ROW_DY   = 172;

function buildColOffsets(cols, aisleIdx) {
  const total = cols.length * SEAT_W + (cols.length - 1) * COL_GAP + AISLE_W;
  let x = -(total / 2);
  const map = {};
  cols.forEach((col, i) => {
    map[col] = x;
    x += SEAT_W + COL_GAP;
    if (i === aisleIdx) x += AISLE_W - COL_GAP;
  });
  return map;
}

/* ── Adjacency helpers ─────────────────────────────────────────────────── */
const colsAdjacent = (c1, c2, cols) => Math.abs(cols.indexOf(c1) - cols.indexOf(c2)) === 1;

const isAdjacentToAny = (seatNum, chosen, cols) => {
  if (!chosen.length) return true;
  const row = seatNum.match(/\d+/)?.[0];
  const col = seatNum.replace(/\d+/, "");
  return chosen.some(s => {
    const sRow = s.match(/\d+/)?.[0];
    const sCol = s.replace(/\d+/, "");
    return row === sRow && colsAdjacent(col, sCol, cols);
  });
};

/* ══════════════════════════════════════════════════════════════════════════
   Component
══════════════════════════════════════════════════════════════════════════ */
export default function SeatMap({ flightId, seatClass = "economy", passengers = [], onConfirm, onBack }) {
  const { t } = useTranslation();
  const [loading, setLoading]       = useState(true);
  const [seatData, setSeatData]     = useState(null);
  const [error, setError]           = useState("");
  const [selections, setSelections] = useState({});
  const [activePassenger, setActivePassenger] = useState(passengers[0]?.id ?? 0);
  const [hoverInfo, setHoverInfo]   = useState(null); // { seat, x, y }
  const hoverTimer = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!flightId) return;
    setLoading(true);
    getSeatMap(flightId, seatClass)
      .then(res => {
        const map = res.data?.data?.seat_map?.find(m => m.class === seatClass)
          || res.data?.data?.seat_map?.[0];
        setSeatData(map);
      })
      .catch(() => setError("Không tải được sơ đồ ghế"))
      .finally(() => setLoading(false));
  }, [flightId, seatClass]);

  const cols     = seatData?.columns || ["A","B","C","D","E","F"];
  const aisleIdx = AISLE_AFTER[seatClass] ?? 2;
  const colOff   = buildColOffsets(cols, aisleIdx);

  const getSeatStatus = (seatNum, occupied) => {
    if (occupied) return "occupied";
    const owner = Object.entries(selections).find(([, s]) => s === seatNum);
    if (owner) return String(owner[0]) === String(activePassenger) ? "mine" : "other";
    if (passengers.length > 1 && !selections[activePassenger]) {
      const chosen = Object.values(selections);
      if (chosen.length > 0 && !isAdjacentToAny(seatNum, chosen, cols)) return "blocked";
    }
    return "free";
  };

  const handleSeatClick = (seat) => {
    if (seat.status === "occupied") return;
    const status = getSeatStatus(seat.seat_number, false);
    if (status === "blocked") return;
    const takenBy = Object.entries(selections).find(([, s]) => s === seat.seat_number);
    if (takenBy && String(takenBy[0]) !== String(activePassenger)) return;

    setSelections(prev => {
      const next = { ...prev };
      if (next[activePassenger] === seat.seat_number) {
        delete next[activePassenger];
      } else {
        next[activePassenger] = seat.seat_number;
        const unselected = passengers.find(p => !next[p.id] && p.id !== activePassenger);
        if (unselected) setActivePassenger(unselected.id);
      }
      return next;
    });
  };

  const PAGE_SIZE = 27;
  const [page, setPage] = useState(0);

  const allRows   = seatData?.rows || [];
  const totalPages = Math.ceil(allRows.length / PAGE_SIZE);
  const needsPaging = allRows.length > PAGE_SIZE;
  const pageRows  = needsPaging
    ? allRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : allRows;

  // Reset to page 0 when seatData changes
  useEffect(() => { setPage(0); }, [seatData]);

  // Hàng ghế thoát hiểm: hàng sát cửa thoát hiểm (đầu, giữa, cuối máy bay)
  const exitRowNums = new Set([1, 13, 14, 27]);

  const allSelected = passengers.every(p => selections[p.id]);

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner}/>
      <p>{t("seatMap.loading")}</p>
    </div>
  );
  if (error || !seatData) return (
    <div className={styles.loadingWrap}>
      <p>{error || "Không có dữ liệu ghế"}</p>
      <button className={styles.btnBack} onClick={onBack}>← Quay lại</button>
    </div>
  );

  return (
    <div className={styles.wrap}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <button className={styles.btnBack} onClick={onBack}>←</button>
        <h3 className={styles.title}>{t("seatMap.title")}</h3>
        <span className={styles.classTag}>{seatClass}</span>
      </div>

      {/* ── Passenger tabs ── */}
      <div className={styles.paxTabs}>
        {passengers.map((p, i) => (
          <button key={p.id}
            className={`${styles.paxTab} ${String(activePassenger)===String(p.id)?styles.paxActive:""} ${selections[p.id]?styles.paxDone:""}`}
            onClick={e => { e.stopPropagation(); setActivePassenger(p.id); }}>
            <span className={styles.paxIdx}>{i+1}</span>
            {p.fullName || `Hành khách ${i+1}`}
            {selections[p.id] && <span className={styles.paxSeat}>{selections[p.id]}</span>}
          </button>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className={styles.legend}>
        <span><i className={`${styles.dot} ${styles.dFree}`}/>{t("seatMap.free")}</span>
        <span><i className={`${styles.dot} ${styles.dOcc}`}/>{t("seatMap.occupied")}</span>
        <span><i className={`${styles.dot} ${styles.dMine}`}/>{t("seatMap.mine")}</span>
        {passengers.length > 1 && <span className={styles.legendHint}>· {t("seatMap.adjacent")}</span>}
      </div>

      {/* ── Scrollable plane ── */}
      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.plane}>
          <div className={`${styles.planeWrap} ${styles[`cls_${seatClass}`]}`}>

            {/* ════════════════════════════════════════════════════════════
                FULL AIRPLANE SVG
                viewBox "0 0 732 6503.65" — same coordinate space as source.
                Rendered 880px wide inside planeWrap → height 7814px.
                overflow="visible" lets wings show outside the SVG bounds.
            ════════════════════════════════════════════════════════════ */}
            <svg className={styles.planeSvg} viewBox="0 0 732 6503.65"
                 xmlns="http://www.w3.org/2000/svg" overflow="visible">

              {/* ── Cabin floor / carpet ── */}
              <polygon className={styles.svgFloor} points="
                594 564 653 806.25 669.53 822.9 684.09 921.94 672.95 927
                703.45 1530.21 694.48 2874.29 710.37 2899.57 710.37 2999.68
                691 3024.44 710.37 3065.47 710.37 3165.58 693.5 3179.94
                688.37 4974.96 666.7 5219.77 681.95 5244.27 665.73 5340.64
                647.15 5339.86 570 5626 174 5638 86.67 5335.24 66.28 5340.64
                50.05 5244.27 65 5216.41 43.63 4959.39 38.5 3169.11
                21.63 3165.58 21.63 3065.47 42 3023.61 21.63 2999.68
                21.63 2899.56 36.75 2878.44 28.67 1533.67 51.86 970.22
                42.46 966.38 55.15 869.26 74.75 849.87 159.62 560 594 564"/>

              {/* ── Upper-shell fuselage (full path from source) ── */}
              <path className={styles.svgFuselage} d="M665.73,5340.64c-6.84,46.28-31.58,207-57.77,309.13-91.37,358.44-181.38,749.44-242,749.44s-150.58-391-242-749.44c-26.19-102.09-50.93-262.85-57.77-309.13,6.46-7.33,14.64-12.93,23.81-16.3,54.65,175,204.46,205.09,204.46,205.09,10.2,49,71.47,46,71.47,46,0,0,57.4,5.93,71.47-47,0,0,141.26-19.1,204.58-204.09,9.15,3.38,17.31,8.98,23.75,16.3ZM46.63,1346c-.09-80.48,9.13-285,21.25-389.79-9.13,1.46-17.82,4.95-25.42,10.21-14.11,122.39-21,247.09-20.83,379.6v1553.54c5.29-4,13.44-8.07,25.41-9.56-.2-667.44-.41-1544-.41-1544ZM47.07,2985.51c-9.51,2.6-18.24,7.48-25.44,14.21v65.8c5.29-4,13.47-8.08,25.46-9.57,0-23.25-.01-46.74-.02-70.49v.05ZM74.39,5230.74c-30.68-330.22-27.08-1776.35-27.08-1776.35,0-103.39-.12-52-.2-303-9.53,2.59-18.28,7.47-25.49,14.22v289.63s-2.97,1459.24,28.38,1789.03c4.67-4.78,12.3-10.27,24.39-13.53ZM365.72,598c160.56,0,238.28,107,276.94,217.34,13,.17,21.67,4.09,26.87,7.56-29.16-178.37-74.2-356.39-135.95-551.46C449.39,5.52,366,0,366,0c0,0-78.37,7.16-167.58,271.44-66.08,195.79-113.57,400.91-143.27,597.82,5.08-3.46,13.66-7.45,26.47-7.75,16.23-124.39,120.61-265.51,284.1-263.51ZM684.72,3454.39s3.61,1446.12-27.07,1776.34c12.09,3.26,19.71,8.75,24.34,13.54,31.4-329.79,28.42-1789.05,28.42-1789.05v-289.64c-7.21-6.75-15.96-11.63-25.49-14.22-.12,251.01-.19,199.64-.23,303.03h.03ZM684.95,3055.9c12,1.48,20.17,5.6,25.46,9.57v-65.79c-7.2-6.73-15.93-11.61-25.44-14.21-.03,23.72-.05,47.2-.06,70.43h.04ZM685.41,1345.9s-.21,876.6-.41,1544.05c12,1.49,20.13,5.6,25.41,9.56v-1553.51c.16-148.58-8.48-287.34-26.28-424-7.84-5.76-16.92-9.61-26.51-11.25,15.14,74.4,27.85,340.74,27.75,435.25l.04-.1Z"/>

              {/* ── Fuselage cut detail ── */}
              <path className={styles.svgCut} d="M78.6,861.66c15.13-112.58,103.25-266.66,287.16-266.66,193.24,0,257.58,155.69,280.12,220.46-2-.13-4.13-.15-6.4-.08-50.19-142.25-142.28-214.38-273.76-214.38-155.48-1.89-264,130-281.08,260.52-2.12-.05-4.13,0-6.04.14ZM682.37,1346c0,12.26-.21,881.65-.41,1543.72l2.1.21c1.35.15,2.64.34,3.89.55.2-662.23.41-1532.23.41-1544.49.1-98.05-12.7-360.25-27.83-434.71-2.08-.46-4.19-.79-6.31-1,15.12,73.36,28.26,337.58,28.15,435.72ZM681.91,3055.62l2.15.22c1.33.15,2.6.34,3.84.55,0-23.07,0-46.41,0-70-1.97-.64-3.97-1.16-6-1.56.01,23.81.02,47.4,0,70.75v.04ZM50.09,3055.62v-70.79c-2.03.4-4.03.92-6,1.56v70c1.24-.21,2.51-.4,3.84-.55l2.16-.22ZM50,2889.68c-.2-662.07-.41-1531.47-.41-1543.73-.09-83.57,9.19-286.52,21.29-390.16-2.06.19-4.11.5-6.13.93-12,104.58-21.24,306-21.16,389.23,0,12.26.21,882.26.41,1544.49,1.26-.21,2.54-.4,3.89-.55l2.11-.21ZM681.69,3454.4c0,13.38,3.24,1448-27,1775.59l1.94.47c1.37.35,2.67.73,3.94,1.13,30.39-326.31,27.18-1763.81,27.14-1777.2,0-102.76.12-51.16.2-302.16-1.97-.64-3.97-1.16-6-1.55-.11,251.7-.18,200.75-.22,303.72Z"/>

              {/* ── Cockpit windows (exact path from source) ── */}
              <path className={styles.svgCockpit} d="M356.9,348.37c0,5.5-4,12.07-8.87,14.61l-107.54,55.84c-4.88,2.54-9.92.23-11.2-5.12l-9.08-37.94c-1.12-5.69,1.5-11.47,6.53-14.36l121.26-63.46c4.87-2.55,8.86-.14,8.86,5.36l.04,45.07ZM290.63,422.93c0-5.5-4-8-8.92-5.47l-34.71,17.61c-4.97,2.64-7.21,8.56-5.25,13.83l4.78,12.1c1.7,4.58,6.79,6.92,11.37,5.22.4-.15.79-.33,1.17-.53l22.67-11.79c4.88-2.54,8.87-9.11,8.87-14.61l.02-16.36ZM212.52,498.14c-1.94,5.15-.62,12.09,2.94,15.42,3.56,3.33,8.41,2,10.79-3l10.75-22.34c2.38-5,2.61-13.18.52-18.26l-3.7-9c-2.09-5.09-5.39-5-7.33.11l-13.97,37.07ZM173.13,452.52c-2.5,4.9-1.78,12.46,1.61,16.79l19.22,24.64c3.38,4.34,7.54,3.61,9.24-1.63l14-43.21c1.76-6.28,2.15-12.87,1.15-19.32l-7.43-37.79c-1.06-5.4-4-5.8-6.48-.9l-31.31,61.42ZM140.63,601.14c-1.06,4.23,1.5,8.51,5.72,9.58.74.19,1.51.27,2.28.23h9.91c5.87-.25,11.01-4.02,13-9.55l22.37-72.23c1.63-5.25,0-13-3.52-17.17l-19.39-22.76c-3.56-4.19-7.36-3.2-8.44,2.19l-21.93,109.71ZM375.1,348.37c0,5.5,4,12.07,8.87,14.61l107.53,55.85c4.88,2.54,9.92.23,11.2-5.12l9.08-37.94c1.12-5.69-1.5-11.46-6.53-14.36l-121.25-63.47c-4.87-2.55-8.86-.14-8.86,5.36l-.04,45.07ZM441.38,439.3c0,5.5,4,12.08,8.87,14.61l22.67,11.79c4.29,2.35,9.67.77,12.01-3.52.21-.38.39-.78.54-1.18l4.78-12.11c1.96-5.27-.29-11.18-5.25-13.82l-34.71-17.62c-4.9-2.49-8.92,0-8.92,5.47v16.38ZM505.53,461.08c-1.94-5.15-5.24-5.2-7.33-.11l-3.7,9c-2.09,5.09-1.86,13.3.52,18.26l10.74,22.38c2.38,5,7.24,6.29,10.79,3s4.88-10.27,2.94-15.42l-13.96-37.11ZM527.53,391.08c-2.5-4.9-5.41-4.49-6.48.9l-7.45,37.77c-1,6.45-.61,13.04,1.15,19.32l14,43.21c1.7,5.23,5.86,6,9.24,1.63l19.22-24.64c3.38-4.34,4.11-11.89,1.61-16.79l-31.29-61.4ZM569.4,491.39c-1.08-5.39-4.88-6.38-8.44-2.19l-19.34,22.8c-3.56,4.19-5.15,11.91-3.52,17.17l22.37,72.23c1.99,5.53,7.13,9.3,13,9.55h9.91c4.35.19,8.04-3.18,8.23-7.53.03-.77-.04-1.53-.23-2.28l-21.98-109.75Z"/>

              {/* ── Tail bulk ── */}
              <g transform="translate(108,5864.89) scale(1,-1)">
                <path className={styles.svgFuselage} d="M0,495.65c70.43,23.3,159.93,37.24,257.34,37.24s187.08-14,257.54-37.3L257.34,0,0,495.65Z"/>
              </g>

              {/* ── Tail horizontal stabilizers ── */}
              <g transform="translate(-117.21,5763.53)">
                <polygon className={styles.svgStabilizer} points="0 724.3 453.91 605.97 286.34 6.96 0 207.35 0 724.3"/>
                <path className={styles.svgSeparator} d="M403.74,430.2C315.21,462.12,2.31,568.78,2.31,568.78"/>
              </g>
              <g transform="translate(849.34,5763.01) rotate(-180) scale(1,-1)">
                <polygon className={styles.svgStabilizer} points="0 724.3 453.91 605.97 286.34 6.96 0 207.35 0 724.3"/>
                <path className={styles.svgSeparator} d="M403.74,430.2C315.21,462.12,2.31,568.78,2.31,568.78"/>
              </g>
              {/* ── Tail vertical stabilizer (fin) ── */}
              <path className={styles.svgFuselage} d="M295.53,5529.58c.73,25.71,32,46.45,70.46,46.45s69.68-20.71,70.36-46.45c-1.15,66.49-3.87,168-8.57,253.57-38.72,704.22-61.84,718.91-61.84,718.91,0,0-23.12-14.69-61.84-718.91-4.71-85.53-7.43-187.08-8.57-253.57Z"/>
            </svg>

            {/* ── Wings (CSS divs) ── */}
            <div className={styles.wingLeft} />
            <div className={styles.wingRight} />

            {/* ── Exit row banner (HTML div — after wings in DOM → renders on top) ── */}
            <div className={styles.exitRowBannerTopLeft}>
              <span className={styles.exitRowLabel}>EXIT</span>
              <span></span>
            </div>
            <div className={styles.exitRowBannerTopRight}>
              <span></span>
              <span className={styles.exitRowLabel}>EXIT</span>
            </div>
            <div className={styles.exitRowBannerMidTop}>
              <span className={styles.exitRowLabel}>EXIT</span>
              <span className={styles.exitRowLabel}>EXIT</span>
            </div>
            <div className={styles.exitRowBannerMidBottom}>
              <span className={styles.exitRowLabel}>EXIT</span>
              <span className={styles.exitRowLabel}>EXIT</span>
            </div>
            <div className={styles.exitRowBannerBottom}>
              <span className={styles.exitRowLabel}>EXIT</span>
              <span className={styles.exitRowLabel}>EXIT</span>
            </div>

            {/* ── Column headers (just above first seat row) ── */}
            {cols.map(col => (
              <span key={`col-${col}`} className={styles.colLabel}
                style={{ marginLeft: `${colOff[col]}px` }}>
                {col}
              </span>
            ))}

            {/* ── Seat rows ── */}
            {pageRows.map((row, idx) => {
              const rowY = ROW_Y0 + idx * ROW_DY;
              return (
                <div key={row.row}>
                  <span className={styles.rowNumL} style={{ top: rowY }}>{row.row}</span>
                  <span className={styles.rowNumR} style={{ top: rowY }}>{row.row}</span>

                  {cols.map(col => {
                    const seat    = row.seats.find(s => s.column === col);
                    if (!seat) return null;
                    const status  = getSeatStatus(seat.seat_number, seat.status === "occupied");
                    const colIdx  = cols.indexOf(col);
                    const side    = colIdx % 2 === 0 ? styles.seatR : styles.seatL;
                    return (
                      <button key={seat.seat_number}
                        className={`${styles.seatBtn} ${styles[`s_${status}`]} ${side}`}
                        style={{ top: rowY, marginLeft: `${colOff[col]}px` }}
                        data-seat={seat.seat_number}
                        onClick={e => { e.stopPropagation(); handleSeatClick(seat); }}
                        disabled={status === "occupied" || status === "blocked"}
                        onMouseEnter={e => {
                          clearTimeout(hoverTimer.current);
                          const r = e.currentTarget.getBoundingClientRect();
                          setHoverInfo({ seat, status, x: r.left + r.width / 2, y: r.top });
                        }}
                        onMouseLeave={() => {
                          hoverTimer.current = setTimeout(() => setHoverInfo(null), 120);
                        }}
                      >
                        <span className={styles.seatNum}>{seat.seat_number}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}

          </div>{/* planeWrap */}
        </div>{/* plane */}
      </div>{/* scroll */}

      {/* ── Footer ── */}
      <div className={styles.footer}>
        {needsPaging && (
          <div className={styles.pagination}>
            <button className={styles.pgBtn} disabled={page === 0}
              onClick={() => { setPage(p => p - 1); scrollRef.current?.scrollTo(0, 0); }}>
              {t("seatMap.prevPage")}
            </button>
            <span className={styles.pgInfo}>
              {t("seatMap.pageInfo", {
                page: page + 1, total: totalPages,
                from: page * PAGE_SIZE + 1,
                to: Math.min((page + 1) * PAGE_SIZE, allRows.length)
              })}
            </span>
            <button className={styles.pgBtn} disabled={page >= totalPages - 1}
              onClick={() => { setPage(p => p + 1); scrollRef.current?.scrollTo(0, 0); }}>
              {t("seatMap.nextPage")}
            </button>
          </div>
        )}
        <div className={styles.summary}>
          {passengers.map(p => (
            <span key={p.id} className={styles.sumItem}>
              {p.fullName || "HK"}: <b>{selections[p.id] || "—"}</b>
            </span>
          ))}
        </div>
        <button className={styles.confirmBtn} disabled={!allSelected}
          onClick={() => onConfirm(selections)}>
          {allSelected
            ? t("seatMap.confirm")
            : t("seatMap.remaining", { n: passengers.filter(p => !selections[p.id]).length })}
        </button>
      </div>

      {/* ── Seat hover popup ── */}
      {hoverInfo && (
        <div
          className={styles.hoverCard}
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
          onMouseEnter={() => clearTimeout(hoverTimer.current)}
          onMouseLeave={() => setHoverInfo(null)}
        >
          <div className={styles.hoverTitle}>
            {hoverInfo.seat.seat_number} · {seatClass.charAt(0).toUpperCase() + seatClass.slice(1)}
          </div>
          <div className={styles.hoverStatus}>
            {hoverInfo.status === "occupied"
              ? <span className={styles.hoverOcc}>✕ {t("seatMap.hoverOcc")}</span>
              : hoverInfo.status === "mine"
              ? <span className={styles.hoverMine}>✓ {t("seatMap.hoverMine")}</span>
              : <span className={styles.hoverFree}>✓ {t("seatMap.hoverFree")}</span>}
          </div>
          {exitRowNums.has(parseInt(hoverInfo.seat.seat_number)) && (
            <div className={styles.hoverExitWarn}>
              <span className={styles.hoverExitIcon}>⚠</span>
              <span><b>{t("seatMap.exitRowTitle")}</b> — {t("seatMap.exitRowWarn")}</span>
            </div>
          )}
          {hoverInfo.seat.features?.length > 0 && (
            <ul className={styles.hoverFeatures}>
              {hoverInfo.seat.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          )}
          {(hoverInfo.seat.pitch || hoverInfo.seat.width || hoverInfo.seat.recline) && (
            <div className={styles.hoverSpecs}>
              {hoverInfo.seat.pitch   && <span>Pitch: {hoverInfo.seat.pitch}</span>}
              {hoverInfo.seat.width   && <span>Width: {hoverInfo.seat.width}</span>}
              {hoverInfo.seat.recline && <span>Recline: {hoverInfo.seat.recline}</span>}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
