import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { createBooking } from "../../services/bookingService";
import styles from "./Booking.module.css";

// Định dạng tiền VND. Ví dụ: 1500000 → "1.500.000 VND"
const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + " VND";

// Lấy giờ phút từ chuỗi ISO hoặc "HH:MM:SS".
// Dùng regex thay vì new Date() để tránh lệch múi giờ (UTC vs local).
const formatTime = (iso) => {
  if (!iso) return "--:--";
  const match = String(iso).match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "--:--";
};

// Tính tuổi từ ngày sinh.
// Dùng để validate: adult ≥ 14 tuổi, child < 14 tuổi.
const calcAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

// Tạo object hành khách rỗng — dùng khởi tạo mảng hành khách.
const emptyPassenger = () => ({
  fullName: "", dob: "", gender: "", idNumber: "",
});

const Booking = () => {
  const navigate = useNavigate();
  const { state } = useLocation(); // Nhận data từ trang FlightSearch (navigate với state)

  // Nếu vào trang này trực tiếp mà không có dữ liệu chuyến bay → hiện thông báo lỗi
  if (!state?.selectedFlights) {
    return (
      <div className={styles.empty}>
        <p>No booking data found.</p>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  const { selectedFlights, passengers, baggage, totalPrice } = state;
  const adultCount = Number(passengers?.adults || 1);
  const childCount = Number(passengers?.children || 0);
  const paxCount   = adultCount + childCount; // Tổng số hành khách

  // Khởi tạo mảng hành khách: mỗi người là 1 form rỗng
  const [paxList,  setPaxList]  = useState(Array.from({ length: paxCount }, emptyPassenger));

  // Lấy email/phone từ localStorage nếu đã đăng nhập → điền sẵn vào form liên hệ
  const [contact,  setContact]  = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      return { email: user?.email || "", phone: user?.phone || "" };
    } catch { return { email: "", phone: "" }; }
  });
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState("");

  // Cập nhật một field cụ thể của hành khách thứ `idx`.
  // Ví dụ: updatePax(0, "fullName", "Nguyen Van A")
  const updatePax = (idx, field, value) => {
    setPaxList((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // Validate toàn bộ form trước khi submit.
  // Kiểm tra: tên, ngày sinh (+ tuổi đúng loại), giới tính, số CMND/hộ chiếu, email, phone.
  const validate = () => {
    const errs = {};
    paxList.forEach((p, i) => {
      const isChild = i >= adultCount; // Index từ adultCount trở đi là trẻ em
      if (!p.fullName.trim()) errs[`${i}_fullName`] = "Required";
      if (!p.dob) {
        errs[`${i}_dob`] = "Required";
      } else {
        const age = calcAge(p.dob);
        if (!isChild && age < 14) errs[`${i}_dob`] = "Adult must be at least 14 years old";
        if (isChild && age >= 14) errs[`${i}_dob`] = "Child must be under 14 years old";
      }
      if (!p.gender) errs[`${i}_gender`] = "Required";
      if (!p.idNumber.trim()) {
        errs[`${i}_idNumber`] = "Required";
      } else {
        const id = p.idNumber.trim().replace(/\s/g, "");
        const isPassport = /[a-zA-Z]/.test(id); // Có chữ cái → là hộ chiếu
        if (isPassport && id.length < 6) errs[`${i}_idNumber`] = "Passport must be at least 6 characters";
        else if (!isPassport && id.length !== 9 && id.length !== 12) errs[`${i}_idNumber`] = "ID card must be 9 or 12 digits";
      }
    });
    if (!contact.email.trim())  errs["email"] = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errs["email"] = "Invalid email";
    if (!contact.phone.trim())  errs["phone"] = "Required";
    else if (!/^[0-9]{9,11}$/.test(contact.phone.trim().replace(/\s/g, ""))) errs["phone"] = "Phone must be 9–11 digits";
    return errs;
  };

  // Submit form → tạo booking trên backend → chuyển sang trang Payment.
  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Cuộn đến field lỗi đầu tiên để user thấy
      const firstKey = Object.keys(errs)[0];
      document.getElementById(firstKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const isRoundTrip = !!selectedFlights.return;

      // Xây dựng mảng hành khách theo định dạng backend yêu cầu.
      // Mỗi hành khách sẽ có 2 record nếu khứ hồi: 1 outbound + 1 return.
      const passengerRecords = [];
      paxList.forEach((p, idx) => {
        const type = idx < adultCount ? "adult" : "child";
        const base = {
          passenger_type:  type,
          full_name:        p.fullName,
          date_of_birth:    p.dob || null,
          gender:           p.gender?.toLowerCase() || null,
          passport_number:  p.idNumber || null,
          extra_baggage_kg: baggage?.outbound || 0,
        };
        passengerRecords.push({ ...base, flight_type: "outbound" });
        if (isRoundTrip) {
          passengerRecords.push({ ...base, flight_type: "return", extra_baggage_kg: baggage?.return || 0 });
        }
      });

      // Payload gửi lên API POST /bookings
      const payload = {
        outbound_flight_id:  selectedFlights.outbound.flight_id,
        outbound_seat_class: selectedFlights.outbound.seat?.class || "economy",
        return_flight_id:    isRoundTrip ? selectedFlights.return.flight_id : undefined,
        return_seat_class:   isRoundTrip ? selectedFlights.return.seat?.class : undefined,
        trip_type:           isRoundTrip ? "round_trip" : "one_way",
        adults:              adultCount,
        children:            childCount,
        infants:             0,
        contact_name:        paxList[0].fullName,
        contact_email:       contact.email,
        contact_phone:       contact.phone,
        passengers:          passengerRecords,
        total_price:         totalPrice,
      };

      const res = await createBooking(payload);
      const bookingData = res.data?.data; // Chứa booking_code, held_until...

      // Chuyển sang trang Payment, truyền toàn bộ data cần thiết qua state
      navigate("/payment", {
        state: {
          bookingData,
          selectedFlights,
          passengers: paxList,
          contact,
          totalPrice,
        },
      });
    } catch (err) {
      setApiError(err.response?.data?.error || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Component mini hiển thị tóm tắt chuyến bay trong sidebar phải.
  const FlightSummaryCard = ({ flight, label, baggageKg }) => (
    <div className={styles.summaryFlight}>
      <p className={styles.summaryLabel}>{label}</p>
      <div className={styles.summaryRow}>
        <img
          src={flight.airline?.logo_url || "https://cdn-icons-png.flaticon.com/512/34/34627.png"}
          alt={flight.airline?.name}
          className={styles.summaryLogo}
          onError={(e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/34/34627.png"; }} // Fallback nếu ảnh lỗi
        />
        <div className={styles.summaryInfo}>
          <p className={styles.summaryAirline}>{flight.airline?.name}</p>
          <p className={styles.summaryCode}>{flight.flight_number} · {flight.seat?.class}</p>
        </div>
        <div className={styles.summaryTimes}>
          <span>{formatTime(flight.departure?.time)}</span>
          <span className={styles.summaryArrow}>→</span>
          <span>{formatTime(flight.arrival?.time)}</span>
        </div>
      </div>
      <div className={styles.summaryMeta}>
        <span>{flight.departure?.code} → {flight.arrival?.code}</span>
        <span>{flight.duration_label}</span>
        {baggageKg > 0 && <span>+{baggageKg}kg extra</span>}
      </div>
      <p className={styles.summaryPrice}>{fmt(flight.seat?.total_price || 0)} all pax</p>
    </div>
  );

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.layout}>

          {/* CỘT TRÁI: Form điền thông tin hành khách */}
          <div className={styles.left}>
            <h2 className={styles.pageTitle}>Passenger Information</h2>

            {apiError && <div className={styles.apiError}>{apiError}</div>}

            {/* Form liên hệ — nhận email xác nhận và phone */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Contact Details</h3>
              <p className={styles.cardDesc}>Booking confirmation will be sent here</p>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Email</label>
                  <input id="email" type="email" placeholder="email@example.com"
                    className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                    value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                  {errors.email && <span className={styles.errMsg}>{errors.email}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Phone</label>
                  <input id="phone" type="tel" placeholder="0901 234 567"
                    className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
                    value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                  {errors.phone && <span className={styles.errMsg}>{errors.phone}</span>}
                </div>
              </div>
            </div>

            {/* Render form cho từng hành khách động theo số lượng đã chọn */}
            {paxList.map((pax, idx) => {
              const isChild  = idx >= adultCount;
              const paxLabel = isChild ? `Child ${idx - adultCount + 1}` : `Adult ${idx + 1}`;
              return (
                <div key={idx} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{paxLabel}</h3>
                    <span className={`${styles.paxBadge} ${isChild ? styles.childBadge : styles.adultBadge}`}>
                      {isChild ? "Child" : "Adult"}
                    </span>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Full Name <span className={styles.required}>*</span></label>
                    <input id={`${idx}_fullName`} type="text" placeholder="As shown on ID / Passport"
                      className={`${styles.input} ${errors[`${idx}_fullName`] ? styles.inputError : ""}`}
                      value={pax.fullName} onChange={(e) => updatePax(idx, "fullName", e.target.value)} />
                    {errors[`${idx}_fullName`] && <span className={styles.errMsg}>{errors[`${idx}_fullName`]}</span>}
                  </div>

                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Date of Birth <span className={styles.required}>*</span></label>
                      <input id={`${idx}_dob`} type="date"
                        className={`${styles.input} ${errors[`${idx}_dob`] ? styles.inputError : ""}`}
                        value={pax.dob} onChange={(e) => updatePax(idx, "dob", e.target.value)} />
                      {errors[`${idx}_dob`] && <span className={styles.errMsg}>{errors[`${idx}_dob`]}</span>}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Gender <span className={styles.required}>*</span></label>
                      <div id={`${idx}_gender`} className={styles.genderGroup}>
                        {["Male", "Female", "Other"].map((g) => (
                          <button key={g} type="button"
                            className={`${styles.genderBtn} ${pax.gender === g ? styles.genderActive : ""}`}
                            onClick={() => updatePax(idx, "gender", g)}>{g}</button>
                        ))}
                      </div>
                      {errors[`${idx}_gender`] && <span className={styles.errMsg}>{errors[`${idx}_gender`]}</span>}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>ID / Passport Number <span className={styles.required}>*</span></label>
                    <input id={`${idx}_idNumber`} type="text" placeholder="ID card or passport number"
                      className={`${styles.input} ${errors[`${idx}_idNumber`] ? styles.inputError : ""}`}
                      value={pax.idNumber} onChange={(e) => updatePax(idx, "idNumber", e.target.value)} />
                    {errors[`${idx}_idNumber`] && <span className={styles.errMsg}>{errors[`${idx}_idNumber`]}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CỘT PHẢI: Tóm tắt đơn hàng (sticky sidebar) */}
          <div className={styles.right}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>Booking Summary</h3>
              {selectedFlights.outbound && (
                <FlightSummaryCard flight={selectedFlights.outbound} label="Outbound" baggageKg={baggage?.outbound || 0} />
              )}
              {selectedFlights.return && (
                <FlightSummaryCard flight={selectedFlights.return} label="Return" baggageKg={baggage?.return || 0} />
              )}
              <div className={styles.summaryDivider} />
              <div className={styles.summaryPaxRow}>
                <span>Passengers</span>
                <span>{paxCount} person{paxCount > 1 ? "s" : ""}</span>
              </div>
              <div className={styles.summaryTotalRow}>
                <span>Total</span>
                <span className={styles.summaryTotal}>{fmt(totalPrice)}</span>
              </div>
              <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
                {loading ? "Processing..." : "Continue to Payment →"}
              </button>
              <p className={styles.secureNote}>🔒 Your information is securely encrypted</p>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
};

export default Booking;
