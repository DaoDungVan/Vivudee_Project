import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuPlaneTakeoff,
  LuPlaneLanding,
  LuSearch,
  LuUser,
  LuCircleCheckBig,
  LuClock,
  LuMapPin,
  LuCalendar,
  LuArmchair,
  LuPrinter,
  LuChevronLeft,
  LuCircleAlert,
  LuTicket,
  LuMail,
} from "react-icons/lu";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { getCheckinStatus, checkinAll, getBoardingPass } from "../../services/checkinService";
import styles from "./CheckIn.module.css";

const fmtDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const fmtTime = (iso) => {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return isNaN(d) ? "--:--" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};
const fmtDateShort = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
};

const STEP_LOOKUP = "lookup";
const STEP_STATUS = "status";
const STEP_BOARDING = "boarding";

export default function CheckIn() {
  const { t } = useTranslation();

  const [step, setStep] = useState(STEP_LOOKUP);
  const [bookingCode, setBookingCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const [statusData, setStatusData] = useState(null);
  const [flightType, setFlightType] = useState("outbound");

  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState("");
  const [emailSentTo, setEmailSentTo] = useState("");

  const [boardingPasses, setBoardingPasses] = useState([]);

  const handleLookup = async (e) => {
    e.preventDefault();
    const code = bookingCode.trim().toUpperCase();
    if (!code) return;
    setLookupLoading(true);
    setLookupError("");
    try {
      const res = await getCheckinStatus(code);
      const data = res.data?.data || res.data;
      setStatusData(data);
      setFlightType("outbound");
      setStep(STEP_STATUS);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Không tìm thấy booking. Vui lòng kiểm tra lại mã đặt chỗ.";
      setLookupError(msg);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCheckin = async () => {
    if (!statusData) return;
    setCheckinLoading(true);
    setCheckinError("");
    try {
      const res = await checkinAll(statusData.booking_code, flightType);
      const data = res.data?.data || res.data;
      const passengers = data?.passengers || [];
      if (data?.contact_email) setEmailSentTo(data.contact_email);

      // Fetch full boarding pass details for each successful passenger
      const passes = [];
      for (const p of passengers) {
        if (p.success && p.boarding_pass_code) {
          try {
            const bpRes = await getBoardingPass(p.boarding_pass_code);
            passes.push(bpRes.data?.data || bpRes.data);
          } catch {
            // Fallback: use data from checkin response
            passes.push({
              passenger_name: p.passenger_name,
              boarding_pass_code: p.boarding_pass_code,
              seat: p.seat_number,
              gate: p.gate,
              boarding_time: p.boarding_time ? fmtTime(p.boarding_time) : null,
              flight_number: p.flight_number,
              departure_city: statusData.flight?.departure_city || "",
              arrival_city: statusData.flight?.arrival_city || "",
              departure_airport: statusData.flight?.departure_airport || "",
              arrival_airport: statusData.flight?.arrival_airport || "",
              departure_time: fmtTime(statusData.flight?.departure_time),
              date: fmtDateShort(statusData.flight?.departure_time),
              booking_code: statusData.booking_code,
            });
          }
        }
      }

      setBoardingPasses(passes);
      setStep(STEP_BOARDING);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Check-in thất bại. Vui lòng thử lại.";
      setCheckinError(msg);
    } finally {
      setCheckinLoading(false);
    }
  };

  const hasReturn = statusData?.passengers?.some(p => p.return_seat);
  const passengers = statusData?.passengers || [];
  const checkedInCount = passengers.filter(p => p.checked_in).length;
  const allCheckedIn = passengers.length > 0 && checkedInCount === passengers.filter(p => p.type !== "infant").length;

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        {/* ── STEP 1: Lookup ── */}
        {step === STEP_LOOKUP && (
          <div className={styles.lookupBox}>
            <div className={styles.lookupIcon}>
              <LuTicket size={42} />
            </div>
            <h1 className={styles.lookupTitle}>Check-in Online</h1>
            <p className={styles.lookupSub}>
              Nhập mã đặt chỗ để làm thủ tục check-in và nhận boarding pass.
              <br />
              Check-in được mở <strong>24 giờ</strong> trước giờ bay và đóng trước <strong>30 phút</strong>.
            </p>
            <form className={styles.lookupForm} onSubmit={handleLookup}>
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Mã đặt chỗ (VD: VVD-A1B2C3)"
                  value={bookingCode}
                  onChange={e => setBookingCode(e.target.value.toUpperCase())}
                  maxLength={16}
                  autoFocus
                />
                <button className={styles.btnSearch} type="submit" disabled={lookupLoading || !bookingCode.trim()}>
                  {lookupLoading ? <span className={styles.spinner} /> : <LuSearch size={18} />}
                  {lookupLoading ? "Đang tìm..." : "Tìm kiếm"}
                </button>
              </div>
              {lookupError && (
                <div className={styles.errorBox}>
                  <LuCircleAlert size={16} />
                  <span>{lookupError}</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ── STEP 2: Status + Check-in ── */}
        {step === STEP_STATUS && statusData && (
          <div className={styles.statusWrap}>
            <button className={styles.backBtn} onClick={() => { setStep(STEP_LOOKUP); setCheckinError(""); }}>
              <LuChevronLeft size={16} /> Nhập mã khác
            </button>

            <div className={styles.sectionTitle}>
              <LuTicket size={20} />
              <span>Booking <strong>{statusData.booking_code}</strong></span>
            </div>

            {/* Flight type tabs (only for round trips) */}
            {hasReturn && (
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${flightType === "outbound" ? styles.tabActive : ""}`}
                  onClick={() => setFlightType("outbound")}
                >
                  <LuPlaneTakeoff size={15} /> Chiều đi
                </button>
                <button
                  className={`${styles.tab} ${flightType === "return" ? styles.tabActive : ""}`}
                  onClick={() => setFlightType("return")}
                >
                  <LuPlaneLanding size={15} /> Chiều về
                </button>
              </div>
            )}

            {/* Flight card */}
            {statusData.flight && (
              <div className={styles.flightCard}>
                <div className={styles.flightRoute}>
                  <div className={styles.airport}>
                    <span className={styles.airportCode}>{statusData.flight.departure_airport || "---"}</span>
                    <span className={styles.airportCity}>{statusData.flight.departure_city || ""}</span>
                  </div>
                  <div className={styles.flightMid}>
                    <LuPlaneTakeoff size={20} className={styles.planeIcon} />
                    <span className={styles.flightNum}>{statusData.flight.flight_number || ""}</span>
                  </div>
                  <div className={`${styles.airport} ${styles.airportRight}`}>
                    <span className={styles.airportCode}>{statusData.flight.arrival_airport || "---"}</span>
                    <span className={styles.airportCity}>{statusData.flight.arrival_city || ""}</span>
                  </div>
                </div>
                <div className={styles.flightMeta}>
                  <span><LuCalendar size={13} /> {fmtDate(statusData.flight.departure_time)}</span>
                  <span><LuClock size={13} /> {fmtTime(statusData.flight.departure_time)}</span>
                  {statusData.gate && <span><LuMapPin size={13} /> Cổng {statusData.gate}</span>}
                </div>
              </div>
            )}

            {/* Passenger list */}
            <h3 className={styles.passengerTitle}>Hành khách</h3>
            <div className={styles.passengerList}>
              {passengers.map(p => (
                <div key={p.id} className={styles.passengerCard}>
                  <div className={styles.passengerLeft}>
                    <LuUser size={16} className={styles.userIcon} />
                    <div>
                      <div className={styles.passengerName}>{p.name}</div>
                      <div className={styles.passengerMeta}>
                        {p.type === "adult" ? "Người lớn" : p.type === "child" ? "Trẻ em" : "Em bé"}
                        {p.seat && <> · Ghế <strong>{p.seat}</strong></>}
                      </div>
                    </div>
                  </div>
                  <div className={styles.passengerRight}>
                    {p.checked_in
                      ? <span className={styles.badgeChecked}><LuCircleCheckBig size={13} /> Đã check-in</span>
                      : p.type === "infant"
                        ? <span className={styles.badgeMuted}>Không áp dụng</span>
                        : !p.seat
                          ? <span className={styles.badgeWarn}>Chưa chọn ghế</span>
                          : <span className={styles.badgePending}>Chưa check-in</span>
                    }
                  </div>
                </div>
              ))}
            </div>

            {checkinError && (
              <div className={styles.errorBox}>
                <LuCircleAlert size={16} />
                <span>{checkinError}</span>
              </div>
            )}

            {allCheckedIn ? (
              <div className={styles.alreadyDone}>
                <LuCircleCheckBig size={18} />
                Tất cả hành khách đã hoàn tất check-in
              </div>
            ) : (
              <button
                className={styles.btnCheckin}
                onClick={handleCheckin}
                disabled={checkinLoading}
              >
                {checkinLoading
                  ? <><span className={styles.spinner} /> Đang xử lý...</>
                  : <><LuCircleCheckBig size={18} /> Check-in ngay</>
                }
              </button>
            )}
          </div>
        )}

        {/* ── STEP 3: Boarding passes ── */}
        {step === STEP_BOARDING && (
          <div className={styles.boardingWrap}>
            <div className={styles.successHeader}>
              <LuCircleCheckBig size={40} className={styles.successIcon} />
              <h2 className={styles.successTitle}>Check-in thành công!</h2>
              <p className={styles.successSub}>Boarding pass của bạn đã sẵn sàng. Quét mã QR tại cổng lên máy bay.</p>
            </div>

            {emailSentTo && (
              <div className={styles.emailBanner}>
                <LuMail size={16} />
                <span>Boarding pass đã được gửi tới <strong>{emailSentTo}</strong></span>
              </div>
            )}

            <div className={styles.boardingList}>
              {boardingPasses.map((bp, i) => (
                <BoardingPassCard key={i} bp={bp} />
              ))}
            </div>

            <div className={styles.boardingActions}>
              <button className={styles.btnPrint} onClick={() => window.print()}>
                <LuPrinter size={16} /> In boarding pass
              </button>
              <button className={styles.btnBack} onClick={() => { setStep(STEP_LOOKUP); setBookingCode(""); setBoardingPasses([]); setStatusData(null); setEmailSentTo(""); }}>
                Check-in chuyến khác
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

function BoardingPassCard({ bp }) {
  const code   = bp?.boarding_pass_code || "";
  const bpUrl  = `${window.location.origin}/checkin/bp/${code}`;
  const qrData = encodeURIComponent(bpUrl);
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}&bgcolor=f8faff&color=0d1f6e&margin=8&format=png`;

  return (
    <div className={styles.bpCard}>
      {/* Blue top bar */}
      <div className={styles.bpTopBar}>
        <span className={styles.bpTopAirline}>VIVUDEE AIR &nbsp;·&nbsp; {bp?.flight_number || ""}</span>
        <span className={styles.bpTopLabel}>BOARDING PASS</span>
      </div>

      <div className={styles.bpBody}>
        {/* Left section */}
        <div className={styles.bpLeft}>
          <div className={styles.bpLabelSm}>Hành khách</div>
          <div className={styles.bpPassenger}>{bp?.passenger_name || "—"}</div>

          <div className={styles.bpRoute}>
            <div className={styles.bpAp}>
              <span className={styles.bpApCode}>{bp?.departure_airport || "---"}</span>
              <span className={styles.bpApCity}>{bp?.departure_city || ""}</span>
              <span className={styles.bpApTime}>{bp?.departure_time || "--:--"}</span>
            </div>
            <LuPlaneTakeoff size={20} className={styles.bpPlane} />
            <div className={`${styles.bpAp} ${styles.bpApRight}`}>
              <span className={styles.bpApCode}>{bp?.arrival_airport || "---"}</span>
              <span className={styles.bpApCity}>{bp?.arrival_city || ""}</span>
            </div>
          </div>

          <div className={styles.bpMeta}>
            <div className={styles.bpMetaItem}>
              <span className={styles.bpMetaLabel}>Ngày bay</span>
              <span className={styles.bpMetaVal}>{bp?.date || "—"}</span>
            </div>
            <div className={styles.bpMetaItem}>
              <span className={styles.bpMetaLabel}>Boarding</span>
              <span className={styles.bpMetaVal}>{bp?.boarding_time || "—"}</span>
            </div>
          </div>
        </div>

        {/* Tear line */}
        <div className={styles.bpTear}>
          <div className={styles.tearLine} />
        </div>

        {/* Right section */}
        <div className={styles.bpRight}>
          <div className={styles.bpBigRow}>
            <div className={styles.bpBigItem}>
              <span className={styles.bpMetaLabel}>Ghế</span>
              <span className={styles.bpBigVal}>{bp?.seat || "—"}</span>
            </div>
            <div className={styles.bpBigItem}>
              <span className={styles.bpMetaLabel}>Cổng</span>
              <span className={`${styles.bpBigVal} ${styles.bpGate}`}>{bp?.gate || "TBA"}</span>
            </div>
          </div>

          <img
            src={qrUrl}
            alt="QR Code"
            className={styles.bpQr}
            width={130}
            height={130}
          />
          <div className={styles.bpCode}>{code}</div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className={styles.bpStrip}>
        {bp?.booking_code} · {bp?.passenger_name} · {bp?.flight_number} · Ghế {bp?.seat || "--"}
      </div>
    </div>
  );
}
