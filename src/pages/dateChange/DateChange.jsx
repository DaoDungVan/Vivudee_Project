import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import API from "../../services/axiosInstance";
import { requestDateChange, confirmDateChangeOTP } from "../../services/dateChangeService";
import DateRangePicker from "../../components/common/DateRangePicker/DateRangePicker";
import styles from "./DateChange.module.css";
import { LuPlane, LuCalendar, LuChevronRight, LuChevronLeft, LuCheck } from "react-icons/lu";

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

export default function DateChange() {
  const { state } = useLocation();
  const navigate  = useNavigate();

  const booking     = state?.booking;
  const bookingCode = booking?.booking_code || state?.bookingCode;

  const [step, setStep] = useState(1); // 1: chọn chuyến | 2: nhập OTP | 3: kết quả

  // Calendar
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPos,  setCalendarPos]  = useState({ top: 0, left: 0 });
  const dateFieldRef  = useRef(null);
  const calendarRef   = useRef(null);

  // Step 1 — tìm chuyến
  const [searchDate,   setSearchDate]   = useState("");
  const [seatClass,    setSeatClass]    = useState("economy");
  const [flights,      setFlights]      = useState([]);
  const [searching,    setSearching]    = useState(false);
  const [searchErr,    setSearchErr]    = useState("");
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [reason,       setReason]       = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitErr,    setSubmitErr]    = useState("");

  // Step 2 — OTP
  const [requestCode, setRequestCode]  = useState("");
  const [contactEmail, setContactEmail] = useState(booking?.contact?.email || "");
  const [otpDigits,   setOtpDigits]    = useState(["", "", "", "", "", ""]);
  const [otpLoading,  setOtpLoading]   = useState(false);
  const [otpErr,      setOtpErr]       = useState("");

  // Step 3 — kết quả
  const [result, setResult] = useState(null);

  // Route từ booking hiện tại
  const depCode = booking?.outbound_flight?.departure?.code || booking?.dep_code || "";
  const arrCode = booking?.outbound_flight?.arrival?.code   || booking?.arr_code || "";
  const oldSeatClass = booking?.outbound_flight?.seat_class || "economy";

  useEffect(() => {
    if (!bookingCode) navigate("/bookings");
  }, [bookingCode, navigate]);

  useEffect(() => {
    const handler = (e) => {
      const inField    = dateFieldRef.current?.contains(e.target);
      const inCalendar = calendarRef.current?.contains(e.target);
      if (!inField && !inCalendar) setShowCalendar(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openCalendar = () => {
    if (dateFieldRef.current) {
      const r = dateFieldRef.current.getBoundingClientRect();
      setCalendarPos({
        top:  r.bottom + window.scrollY + 8,
        left: Math.min(r.left + window.scrollX, window.innerWidth - 644),
      });
    }
    setShowCalendar(true);
  };

  const toDisplayDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const handleSearch = async () => {
    if (!searchDate) { setSearchErr("Vui lòng chọn ngày bay mới"); return; }
    if (!depCode || !arrCode) { setSearchErr("Không xác định được route chuyến bay. Vui lòng quay lại."); return; }
    setSearching(true); setSearchErr(""); setFlights([]); setSelectedFlight(null);
    try {
      const res = await API.get("/flights/search", {
        params: {
          departure_code: depCode,
          arrival_code: arrCode,
          departure_date: searchDate,
          adults: 1,
          children: 0,
          infants: 0,
          seat_class: seatClass,
        },
      });
      const data = res.data?.data;
      const list = Array.isArray(data)
        ? data
        : (data?.outbound_flights || data?.outbound || []);
      if (list.length === 0) setSearchErr("Không tìm thấy chuyến bay nào cho ngày này");
      setFlights(list);
    } catch {
      setSearchErr("Không thể tìm chuyến bay. Vui lòng thử lại.");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedFlight) { setSubmitErr("Vui lòng chọn chuyến bay mới"); return; }
    if (reason.trim().length < 10) { setSubmitErr("Lý do phải có ít nhất 10 ký tự"); return; }
    setSubmitLoading(true); setSubmitErr("");
    try {
      const res = await requestDateChange(bookingCode, {
        new_flight_id: selectedFlight.flight_id || selectedFlight.id,
        new_seat_class: seatClass,
        reason: reason.trim(),
      });
      const d = res.data?.data || res.data;
      setRequestCode(d?.request_code || "");
      setStep(2);
    } catch (err) {
      setSubmitErr(err?.response?.data?.error || "Không thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOtpDigit = (val, idx) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otpDigits];
    next[idx] = val;
    setOtpDigits(next);
    setOtpErr("");
    if (val && idx < 5) document.getElementById(`dc-otp-${idx + 1}`)?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0)
      document.getElementById(`dc-otp-${idx - 1}`)?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otpDigits];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setOtpDigits(next);
    document.getElementById(`dc-otp-${Math.min(pasted.length, 5)}`)?.focus();
  };

  const handleConfirmOTP = async () => {
    const otp = otpDigits.join("");
    if (otp.length !== 6) { setOtpErr("Vui lòng nhập đủ 6 chữ số"); return; }
    setOtpLoading(true); setOtpErr("");
    try {
      const res = await confirmDateChangeOTP(contactEmail.trim(), otp, requestCode);
      setResult(res.data);
      setStep(3);
    } catch (err) {
      setOtpErr(err?.response?.data?.error || "Mã OTP không đúng hoặc đã hết hạn");
    } finally {
      setOtpLoading(false);
    }
  };

  if (!bookingCode) return null;

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>

        {/* Header + steps */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => step === 1 ? navigate(-1) : setStep(s => s - 1)}>
            <LuChevronLeft size={16} /> Quay lại
          </button>
          <h1 className={styles.title}>Đổi ngày bay</h1>
          <p className={styles.sub}>Mã đặt chỗ: <strong>{bookingCode}</strong></p>
        </div>

        <div className={styles.steps}>
          {["Chọn chuyến mới", "Xác nhận OTP", "Hoàn tất"].map((label, i) => (
            <div key={i} className={`${styles.stepItem} ${step === i + 1 ? styles.stepActive : step > i + 1 ? styles.stepDone : ""}`}>
              <div className={styles.stepCircle}>
                {step > i + 1 ? <LuCheck size={14} /> : i + 1}
              </div>
              <span className={styles.stepLabel}>{label}</span>
              {i < 2 && <div className={styles.stepLine} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Chọn chuyến ── */}
        {step === 1 && (
          <div className={styles.body}>
            {/* Thông tin booking hiện tại */}
            <div className={styles.currentFlight}>
              <p className={styles.sectionLabel}>Chuyến bay hiện tại</p>
              <div className={styles.flightRow}>
                <span className={styles.route}>{depCode} → {arrCode}</span>
                <span className={styles.oldDate}>{fmtDate(booking?.outbound_flight?.departure?.time || booking?.departure_time)}</span>
                <span className={styles.oldClass}>{oldSeatClass}</span>
              </div>
            </div>

            {/* Tìm chuyến mới */}
            <div className={styles.searchBox}>
              <p className={styles.sectionLabel}>Chọn ngày và hạng ghế mới</p>
              <div className={styles.searchRow}>
                <div className={styles.fieldWrap}>
                  <label className={styles.fieldLabel}><LuCalendar size={13} /> Ngày bay mới</label>
                  <div
                    ref={dateFieldRef}
                    className={`${styles.input} ${styles.dateTrigger}`}
                    onClick={openCalendar}
                  >
                    <LuCalendar size={14} className={styles.dateIcon} />
                    <span className={searchDate ? "" : styles.datePlaceholder}>
                      {toDisplayDate(searchDate) || "Chọn ngày"}
                    </span>
                  </div>
                  {showCalendar && (
                    <div
                      ref={calendarRef}
                      className={styles.calendarPopup}
                      style={{ top: calendarPos.top, left: calendarPos.left }}
                    >
                      <DateRangePicker
                        startDate={searchDate || null}
                        endDate={null}
                        tripType="oneway"
                        minDate={new Date().toISOString().split("T")[0]}
                        lang="vi"
                        onChange={(start) => { setSearchDate(start); setSearchErr(""); }}
                        onClose={() => setShowCalendar(false)}
                      />
                    </div>
                  )}
                </div>
                <div className={styles.fieldWrap}>
                  <label className={styles.fieldLabel}>Hạng ghế</label>
                  <select className={styles.input} value={seatClass} onChange={(e) => setSeatClass(e.target.value)}>
                    <option value="economy">Economy</option>
                    <option value="business">Business</option>
                    <option value="first">First</option>
                  </select>
                </div>
                <button className={styles.searchBtn} onClick={handleSearch} disabled={searching}>
                  {searching ? "Đang tìm..." : "Tìm chuyến"}
                </button>
              </div>
              {searchErr && <p className={styles.errMsg}>{searchErr}</p>}
            </div>

            {/* Danh sách chuyến */}
            {flights.length > 0 && (
              <div className={styles.flightList}>
                <p className={styles.sectionLabel}>Chọn chuyến bay ({flights.length} kết quả)</p>
                {flights.map((f) => {
                  const fid = f.flight_id || f.id;
                  const selected = selectedFlight && (selectedFlight.flight_id || selectedFlight.id) === fid;
                  return (
                    <button
                      key={fid}
                      className={`${styles.flightCard} ${selected ? styles.flightCardSelected : ""}`}
                      onClick={() => setSelectedFlight(f)}
                    >
                      {selected && <LuCheck className={styles.checkIcon} size={16} />}
                      <div className={styles.flightCardLeft}>
                        <span className={styles.airline}>{f.airline?.name || f.airline_name}</span>
                        <span className={styles.flightNum}>{f.flight_number}</span>
                      </div>
                      <div className={styles.flightTimes}>
                        <span>{fmtTime(f.departure?.time || f.departure_time)}</span>
                        <span className={styles.arrow}>→</span>
                        <span>{fmtTime(f.arrival?.time || f.arrival_time)}</span>
                      </div>
                      <div className={styles.flightRight}>
                        <span className={styles.flightPrice}>{fmt(f.seat?.total_price || f.base_price || 0)}</span>
                        <span className={styles.flightSeats}>{f.available_seats ?? f.seat?.available_seats ?? "?"} ghế</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Lý do + Submit */}
            {selectedFlight && (
              <div className={styles.reasonBox}>
                <label className={styles.fieldLabel}>Lý do đổi ngày <span className={styles.required}>*</span></label>
                <textarea
                  className={styles.textarea}
                  placeholder="Nhập lý do đổi ngày bay (tối thiểu 10 ký tự)..."
                  rows={3}
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setSubmitErr(""); }}
                />
                {submitErr && <p className={styles.errMsg}>{submitErr}</p>}
                <button
                  className={styles.submitBtn}
                  onClick={handleSubmitRequest}
                  disabled={submitLoading}
                >
                  {submitLoading ? "Đang gửi..." : "Gửi yêu cầu"} <LuChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Nhập OTP ── */}
        {step === 2 && (
          <div className={styles.otpBox}>
            <div className={styles.otpIcon}>
              <LuPlane size={36} />
            </div>
            <h2 className={styles.otpTitle}>Xác nhận yêu cầu</h2>
            <p className={styles.otpDesc}>
              Mã OTP gồm 6 chữ số đã được gửi đến email đặt vé của bạn.
              Vui lòng kiểm tra hòm thư và nhập mã bên dưới.
            </p>
            <p className={styles.otpCode}>Mã yêu cầu: <strong>{requestCode}</strong></p>

            <div className={styles.otpInputs}>
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  id={`dc-otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={styles.otpDigit}
                  value={d}
                  onChange={(e) => handleOtpDigit(e.target.value, i)}
                  onKeyDown={(e) => handleOtpKeyDown(e, i)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {otpErr && <p className={styles.errMsg}>{otpErr}</p>}

            <button
              className={styles.submitBtn}
              onClick={handleConfirmOTP}
              disabled={otpLoading || otpDigits.join("").length !== 6}
            >
              {otpLoading ? "Đang xác nhận..." : "Xác nhận OTP"}
            </button>

            <p className={styles.otpNote}>
              Không nhận được mã? Kiểm tra thư mục spam hoặc{" "}
              <button className={styles.retryLink} onClick={() => setStep(1)}>
                gửi lại yêu cầu
              </button>
            </p>
          </div>
        )}

        {/* ── STEP 3: Kết quả ── */}
        {step === 3 && (
          <div className={styles.resultBox}>
            {result?.auto_approved ? (
              <>
                <div className={styles.resultIconSuccess}>✓</div>
                <h2 className={styles.resultTitle}>Đổi ngày bay thành công!</h2>
                <p className={styles.resultDesc}>
                  Yêu cầu <strong>{requestCode}</strong> đã được duyệt tự động.
                  Chuyến bay của bạn đã được cập nhật.
                </p>
              </>
            ) : (
              <>
                <div className={styles.resultIconPending}>⏳</div>
                <h2 className={styles.resultTitle}>Yêu cầu đã được gửi</h2>
                <p className={styles.resultDesc}>
                  Yêu cầu <strong>{requestCode}</strong> đang chờ admin xét duyệt.
                  Bạn sẽ nhận được thông báo qua email khi có kết quả.
                </p>
              </>
            )}
            <button className={styles.submitBtn} onClick={() => navigate("/bookings")}>
              Về trang đặt chỗ
            </button>
          </div>
        )}

      </div>
      <Footer />
    </>
  );
}
