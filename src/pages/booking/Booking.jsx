import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import { createBooking } from "../../services/bookingService";
import API from "../../services/axiosInstance";
import styles from "./Booking.module.css";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import planeIcon from "../../assets/icons/plane.png";
import SeatMap from "../../components/booking/SeatMap/SeatMap";
import DateDropdownPicker from "../../components/common/DateDropdownPicker/DateDropdownPicker";

const fmt = (n) => `${new Intl.NumberFormat("vi-VN").format(n)} VND`;

const formatTime = (iso) => {
  if (!iso) return "--:--";
  const match = String(iso).match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "--:--";
};

const calcAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const emptyPassenger = () => ({ fullName: "", dob: "", gender: "", idNumber: "" });

const Booking = () => {
  const navigate   = useNavigate();
  const { state }  = useLocation();
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();

  const selectedFlights = state?.selectedFlights || null;
  const passengers = state?.passengers || {};
  const baggage = state?.baggage || {};
  const totalPrice = state?.totalPrice || 0;
  const ancillarySelections = state?.ancillarySelections || [];
  const ancillaryTotal = state?.ancillaryTotal || 0;
  const seatPreference = state?.seatPreference || {};
  const seatExtraFee   = Number(state?.seatExtraFee || 0);
  const adultCount = Number(passengers?.adults || 1);
  const childCount = Number(passengers?.children || 0);
  const paxCount = adultCount + childCount;

  const [paxList, setPaxList] = useState(Array.from({ length: paxCount }, emptyPassenger));
  const [contact, setContact] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      return { email: user?.email || "", phone: user?.phone || "" };
    } catch {
      return { email: "", phone: "" };
    }
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [contactWarning, setContactWarning] = useState({ email: "" });
  const isLoggedIn = !!localStorage.getItem("token");
  const isPhoneLocked = isLoggedIn && !!contact.phone.trim();

  const checkEmailContact = useCallback(async (value) => {
    if (!value?.trim() || isLoggedIn) return;
    try {
      const res = await API.post("/check-contact", { email: value.trim() });
      setContactWarning(prev => ({
        ...prev,
        email: res.data?.email_taken
          ? "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác."
          : ""
      }));
    } catch { /* ignore */ }
  }, [isLoggedIn]);

  const [step, setStep] = useState("form"); // "form" | "seatmap"
  const [seatSelections, setSeatSelections] = useState({});

  if (!selectedFlights) {
    return (
      <div className={styles.empty}>
        <p>{t("booking.noData")}</p>
        <button onClick={() => navigate("/")}>{t("booking.backHome")}</button>
      </div>
    );
  }

  const updatePax = (idx, field, value) => {
    setPaxList((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const validate = () => {
    const errs = {};
    paxList.forEach((p, i) => {
      const isChild = i >= adultCount;
      if (!p.fullName.trim()) errs[`${i}_fullName`] = t("booking.required");
      if (!p.dob) {
        errs[`${i}_dob`] = t("booking.required");
      } else {
        const age = calcAge(p.dob);
        if (!isChild && age < 14) errs[`${i}_dob`] = t("booking.adultAgeErr");
        if (isChild && age >= 14) errs[`${i}_dob`] = t("booking.childAgeErr");
        if (isChild && age < 2) errs[`${i}_dob`] = "Trẻ em phải từ 2 tuổi trở lên. Trẻ dưới 2 tuổi là trẻ sơ sinh (infant), vui lòng liên hệ hãng bay.";
      }
      if (!p.gender) errs[`${i}_gender`] = t("booking.required");
      if (!p.idNumber.trim()) {
        errs[`${i}_idNumber`] = t("booking.required");
      } else {
        const id = p.idNumber.trim().replace(/\s/g, "");
        const isPassport = /[a-zA-Z]/.test(id);
        if (isPassport && id.length < 6) errs[`${i}_idNumber`] = t("booking.passportErr");
        else if (!isPassport && id.length !== 9 && id.length !== 12) errs[`${i}_idNumber`] = t("booking.idCardErr");
      }
    });
    if (!contact.email.trim()) errs.email = t("booking.required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errs.email = t("booking.emailInvalid");
    else if (!isLoggedIn && contactWarning.email) errs.email = contactWarning.email;
    if (!contact.phone.trim()) errs.phone = t("booking.required");
    else if (!/^[0-9]{9,11}$/.test(contact.phone.trim().replace(/\s/g, ""))) errs.phone = t("booking.phoneErr");
    return errs;
  };

  // Bước 1: validate → navigate sang trang seat map
  const handleGoToSeatMap = async () => {
    if (loading) return; // chặn double-click
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      document.getElementById(firstKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!isLoggedIn) {
      setLoading(true);
      let blocked = false;
      try {
        const r = await API.post("/check-contact", { email: contact.email.trim() });
        if (r.data?.email_taken) {
          blocked = true;
          const msg = "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.";
          setErrors((prev) => ({ ...prev, email: msg }));
          setContactWarning((prev) => ({ ...prev, email: msg }));
          document.getElementById("email")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } catch {
        blocked = true;
        setErrors((prev) => ({ ...prev, email: "Không thể kiểm tra thông tin liên hệ. Vui lòng thử lại." }));
        document.getElementById("email")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } finally {
        setLoading(false);
      }
      if (blocked) return;
    }
    // Build payload sẵn để SeatMapPage dùng
    const isRoundTrip = !!selectedFlights.return;
    const passengerRecords = [];
    paxList.forEach((p, idx) => {
      const type = idx < adultCount ? "adult" : "child";
      const base = { passenger_type: type, full_name: p.fullName, date_of_birth: p.dob || null, gender: p.gender?.toLowerCase() || null, passport_number: p.idNumber || null, extra_baggage_kg: baggage?.outbound || 0 };
      passengerRecords.push({ ...base, flight_type: "outbound" });
      if (isRoundTrip) passengerRecords.push({ ...base, flight_type: "return", extra_baggage_kg: baggage?.return || 0 });
    });
    navigate("/seat-map", {
      state: {
        selectedFlights, paxList, contact, totalPrice, adultCount,
        ancillarySelections, ancillaryTotal, seatPreference,
        bookingPayload: {
          outbound_flight_id: selectedFlights.outbound.flight_id,
          outbound_seat_class: selectedFlights.outbound.seat?.class || "economy",
          return_flight_id: isRoundTrip ? selectedFlights.return.flight_id : undefined,
          return_seat_class: isRoundTrip ? selectedFlights.return.seat?.class : undefined,
          trip_type: isRoundTrip ? "round_trip" : "one_way",
          adults: adultCount, children: childCount, infants: 0,
          contact_name: paxList[0].fullName, contact_email: contact.email, contact_phone: contact.phone,
          passengers: passengerRecords, total_price: totalPrice,
          seat_extra_fee: seatExtraFee,
          ancillary_options: ancillarySelections.map((a) => ({
            ancillary_option_id: a.id,
            quantity: a.quantity,
            unit_price: Number(a.price),
          })),
        },
      },
    });
  };

  // Bước 2: sau khi chọn ghế → tạo booking
  const handleSubmit = async (seats = {}) => {
    setSeatSelections(seats);
    setLoading(true);
    setApiError("");

    try {
      const isRoundTrip = !!selectedFlights.return;
      const passengerRecords = [];
      paxList.forEach((p, idx) => {
        const type = idx < adultCount ? "adult" : "child";
        const paxId = idx;
        const base = {
          passenger_type: type,
          full_name: p.fullName,
          date_of_birth: p.dob || null,
          gender: p.gender?.toLowerCase() || null,
          passport_number: p.idNumber || null,
          extra_baggage_kg: baggage?.outbound || 0,
          seat_number: seats[paxId] || null,
        };
        passengerRecords.push({ ...base, flight_type: "outbound" });
        if (isRoundTrip) {
          passengerRecords.push({ ...base, flight_type: "return", extra_baggage_kg: baggage?.return || 0 });
        }
      });

      const payload = {
        outbound_flight_id: selectedFlights.outbound.flight_id,
        outbound_seat_class: selectedFlights.outbound.seat?.class || "economy",
        return_flight_id: isRoundTrip ? selectedFlights.return.flight_id : undefined,
        return_seat_class: isRoundTrip ? selectedFlights.return.seat?.class : undefined,
        trip_type: isRoundTrip ? "round_trip" : "one_way",
        adults: adultCount,
        children: childCount,
        infants: 0,
        contact_name: paxList[0].fullName,
        contact_email: contact.email,
        contact_phone: contact.phone,
        passengers: passengerRecords,
        total_price: totalPrice,
      };

      const res = await createBooking(payload);
      const bookingData = { ...res.data?.data, ancillary_items: ancillarySelections || [] };

      navigate("/payment", {
        state: { bookingData, selectedFlights, passengers: paxList, contact, totalPrice },
      });
    } catch (err) {
      setApiError(err.response?.data?.error || t("booking.bookingFailed"));
    } finally {
      setLoading(false);
    }
  };

  const FlightSummaryCard = ({ flight, label, baggageKg }) => (
    <div className={styles.summaryFlight}>
      <p className={styles.summaryLabel}>{label}</p>
      <div className={styles.summaryRow}>
        <img
          src={(isDark && flight.airline?.logo_dark) ? flight.airline.logo_dark : (flight.airline?.logo_url || planeIcon)}
          alt={flight.airline?.name}
          className={styles.summaryLogo}
          onError={(e) => { e.target.src = planeIcon; }}
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
        {baggageKg > 0 && <span>{t("booking.extraBaggageKg", { kg: baggageKg })}</span>}
      </div>
      <p className={styles.summaryPrice}>{fmt(flight.seat?.total_price || 0)} {t("booking.allPax")}</p>
    </div>
  );

  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.layout}>
          <div className={styles.left}>
            <div className={styles.pageTitleRow}>
              <button className={styles.backBtn} onClick={() => navigate(-1)}><LuChevronLeft size={16}/> {t("booking.back", "Quay lại")}</button>
              <h2 className={styles.pageTitle}>{t("booking.title")}</h2>
            </div>

            {apiError && <div className={styles.apiError}>{apiError}</div>}

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>{t("booking.contactDetails")}</h3>
              <p className={styles.cardDesc}>{t("booking.contactDesc")}</p>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>{t("booking.email")}</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    className={`${styles.input} ${errors.email ? styles.inputError : ""} ${isLoggedIn ? styles.inputLocked : ""}`}
                    value={contact.email}
                    readOnly={isLoggedIn}
                    onChange={isLoggedIn ? undefined : (e) => { setContact({ ...contact, email: e.target.value }); setContactWarning(w => ({...w, email: ""})); }}
                    onBlur={isLoggedIn ? undefined : (e) => checkEmailContact(e.target.value)}
                  />
                  {isLoggedIn && <span className={styles.lockedHint}>Email được lấy từ tài khoản của bạn</span>}
                  {errors.email && <span className={styles.errMsg}>{errors.email}</span>}
                  {!isLoggedIn && !errors.email && contactWarning.email && <span className={styles.errMsg}>{contactWarning.email}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{t("booking.phone")}</label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="0901 234 567"
                    className={`${styles.input} ${errors.phone ? styles.inputError : ""} ${isPhoneLocked ? styles.inputLocked : ""}`}
                    value={contact.phone}
                    readOnly={isPhoneLocked}
                    onChange={isPhoneLocked ? undefined : (e) => setContact({ ...contact, phone: e.target.value })}
                  />
                  {isPhoneLocked && <span className={styles.lockedHint}>Số điện thoại được lấy từ tài khoản của bạn</span>}
                  {errors.phone && <span className={styles.errMsg}>{errors.phone}</span>}
                </div>
              </div>
            </div>

            {paxList.map((pax, idx) => {
              const isChild = idx >= adultCount;
              const paxLabel = isChild
                ? t("booking.childN", { n: idx - adultCount + 1 })
                : t("booking.adultN", { n: idx + 1 });

              return (
                <div key={idx} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{paxLabel}</h3>
                    <span className={`${styles.paxBadge} ${isChild ? styles.childBadge : styles.adultBadge}`}>
                      {isChild ? t("booking.child") : t("booking.adult")}
                    </span>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>{t("booking.fullName")} <span className={styles.required}>*</span></label>
                    <input
                      id={`${idx}_fullName`}
                      type="text"
                      placeholder={t("booking.fullNamePlaceholder")}
                      className={`${styles.input} ${errors[`${idx}_fullName`] ? styles.inputError : ""}`}
                      value={pax.fullName}
                      onChange={(e) => updatePax(idx, "fullName", e.target.value)}
                    />
                    {errors[`${idx}_fullName`] && <span className={styles.errMsg}>{errors[`${idx}_fullName`]}</span>}
                  </div>

                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label className={styles.label}>
                        {t("booking.dob")} <span className={styles.required}>*</span>
                      </label>
                      <DateDropdownPicker
                        value={pax.dob}
                        onChange={(dateStr) => updatePax(idx, "dob", dateStr)}
                        hasError={!!errors[`${idx}_dob`]}
                        lang={i18n.language === "vi" ? "vi" : "en"}
                        maxYear={new Date().getFullYear()}
                        minYear={new Date().getFullYear() - 120}
                      />
                      {errors[`${idx}_dob`] && <span className={styles.errMsg}>{errors[`${idx}_dob`]}</span>}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>{t("booking.gender")} <span className={styles.required}>*</span></label>
                      <div id={`${idx}_gender`} className={styles.genderGroup}>
                        {[
                          { key: "Male",   label: t("booking.male")   },
                          { key: "Female", label: t("booking.female") },
                          { key: "Other",  label: t("booking.other")  },
                        ].map((g) => (
                          <button
                            key={g.key}
                            type="button"
                            className={`${styles.genderBtn} ${pax.gender === g.key ? styles.genderActive : ""}`}
                            onClick={() => updatePax(idx, "gender", g.key)}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                      {errors[`${idx}_gender`] && <span className={styles.errMsg}>{errors[`${idx}_gender`]}</span>}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>{t("booking.idPassport")} <span className={styles.required}>*</span></label>
                    <input
                      id={`${idx}_idNumber`}
                      type="text"
                      placeholder={t("booking.idPassportPlaceholder")}
                      className={`${styles.input} ${errors[`${idx}_idNumber`] ? styles.inputError : ""}`}
                      value={pax.idNumber}
                      onChange={(e) => updatePax(idx, "idNumber", e.target.value)}
                    />
                    {errors[`${idx}_idNumber`] && <span className={styles.errMsg}>{errors[`${idx}_idNumber`]}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.right}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>{t("booking.bookingSummary")}</h3>
              {selectedFlights.outbound && (
                <FlightSummaryCard flight={selectedFlights.outbound} label={t("booking.outbound")} baggageKg={baggage?.outbound || 0} />
              )}
              {selectedFlights.return && (
                <FlightSummaryCard flight={selectedFlights.return} label={t("booking.return")} baggageKg={baggage?.return || 0} />
              )}
              <div className={styles.summaryDivider} />
              <div className={styles.summaryPaxRow}>
                <span>{t("booking.passengers")}</span>
                <span>{paxCount > 1 ? t("booking.personsCount", { count: paxCount }) : t("booking.personCount", { count: paxCount })}</span>
              </div>
              <div className={styles.summaryTotalRow}>
                <span>{t("booking.total")}</span>
                <span className={styles.summaryTotal}>{fmt(totalPrice)}</span>
              </div>
              <button className={styles.submitBtn} onClick={handleGoToSeatMap} disabled={loading}>
                {t("booking.continue") || "Tiếp tục"} <LuChevronRight size={16}/>
              </button>
              <p className={styles.secureNote}>{t("booking.secure")}</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />

    </>
  );
};

export default Booking;
