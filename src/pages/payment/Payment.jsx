// src/pages/payment/Payment.jsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { initPayment, getPaymentByCode, cancelPayment, buildVietQRUrl } from "../../services/paymentService";
import styles from "./Payment.module.css";

import visaImg   from "../../assets/images/payments/visa.png";
import masterImg from "../../assets/images/payments/mastercard.svg";
import momoImg   from "../../assets/images/payments/momo.png";
import vietqrImg from "../../assets/images/payments/vietqr.png";
import paypalImg from "../../assets/images/payments/paypal.png";

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";

const formatTime = (iso) => {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return isNaN(d) ? "--:--" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatCountdown = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return "00:00";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const Payment = () => {
  const navigate  = useNavigate();
  const { state } = useLocation();
  const { t }     = useTranslation();

  const PAYMENT_METHODS = [
    { id: "BANK_QR", label: "VietQR / Bank Transfer", img: vietqrImg },
    { id: "MOMO",    label: "MoMo",                   img: momoImg,   disabled: true },
    { id: "VISA",    label: "Visa / Credit Card",      img: visaImg,   disabled: true },
    { id: "MASTER",  label: "Mastercard",              img: masterImg, disabled: true },
    { id: "PAYPAL",  label: "PayPal",                  img: paypalImg, disabled: true },
  ];

  // ── State ────────────────────────────────────────────────
  const [selectedMethod, setSelectedMethod] = useState("BANK_QR");
  const [couponCode, setCouponCode]         = useState("");
  const [couponError, setCouponError]       = useState("");
  const [couponApplied, setCouponApplied]   = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [paymentData, setPaymentData]       = useState(null);
  const [initLoading, setInitLoading]       = useState(false);
  const [initError, setInitError]           = useState("");

  const [countdown, setCountdown]           = useState(null);
  const [expired, setExpired]               = useState(false);
  const [paid, setPaid]                     = useState(false);

  // ── Guard ────────────────────────────────────────────────
  if (!state?.bookingData) {
    return (
      <div className={styles.empty}>
        <p>{t("payment.notFound")}</p>
        <button onClick={() => navigate("/")}>{t("payment.backHome")}</button>
      </div>
    );
  }

  const { bookingData, selectedFlights, passengers, contact, totalPrice } = state;
  const bookingId   = bookingData?.booking_id || bookingData?.id;
  const bookingCode = bookingData?.booking_code;
  const heldUntil   = bookingData?.held_until;

  const finalAmount = couponApplied?.final_amount ?? totalPrice;

  // ── Held seat countdown ──────────────────────────────────
  useEffect(() => {
    if (!heldUntil) return;
    const iv = setInterval(() => {
      const tick = formatCountdown(heldUntil);
      setCountdown(tick);
      if (tick === "00:00") setExpired(true);
    }, 1000);
    return () => clearInterval(iv);
  }, [heldUntil]);

  // ── Poll payment status ──────────────────────────────────
  useEffect(() => {
    if (!paymentData?.payment?.payment_code || paid) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await getPaymentByCode(paymentData.payment.payment_code);
        const status = res?.payment?.status?.toUpperCase();
        if (["PAID","SUCCESS","COMPLETED","CONFIRMED"].includes(status)) {
          if (active) setPaid(true);
        }
      } catch (_) {}
    };
    const iv = setInterval(poll, 5000);
    return () => { active = false; clearInterval(iv); };
  }, [paymentData, paid]);

  // ── Apply coupon ─────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError(t("payment.enterCouponError"));
      return;
    }
    setApplyingCoupon(true);
    setCouponError("");
    setTimeout(() => {
      setCouponApplied({ code: couponCode.trim(), voucher_code: couponCode.trim() });
      setApplyingCoupon(false);
    }, 600);
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
    setCouponError("");
  };

  // ── Init Payment ─────────────────────────────────────────
  const handleInitPayment = async () => {
    if (!bookingId) {
      setInitError(t("payment.missingBookingId"));
      return;
    }
    setInitLoading(true);
    setInitError("");
    try {
      const payload = {
        booking_id:     bookingId,
        email:          contact?.email,
        phone:          contact?.phone,
        name:           contact?.name || passengers?.[0]?.fullName || "",
        payment_method: selectedMethod,
        voucher_code:   couponApplied?.voucher_code || null,
      };
      const res = await initPayment(payload);
      setPaymentData(res);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || t("payment.initFailed");
      setInitError(msg);
    } finally {
      setInitLoading(false);
    }
  };

  // ── Cancel ───────────────────────────────────────────────
  const handleCancel = async () => {
    if (paymentData?.payment?.payment_code) {
      try { await cancelPayment(paymentData.payment.payment_code); } catch (_) {}
    }
    navigate("/");
  };

  // ── Paid screen ──────────────────────────────────────────
  if (paid) {
    const pCode = paymentData?.payment?.payment_code || bookingCode;
    return (
      <>
        <NavBar />
        <div className={styles.successWrapper}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <circle cx="36" cy="36" r="36" fill="#22c55e" opacity="0.12"/>
                <circle cx="36" cy="36" r="26" fill="#22c55e"/>
                <path d="M24 36l8 8 16-16" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>{t("payment.successTitle")}</h2>
            <p>{t("payment.successDesc")}</p>
            <div className={styles.successCode}>{pCode}</div>
            <p className={styles.successNote}>
              {t("payment.ticketSent", { email: contact?.email })}
            </p>
            <div className={styles.successBtns}>
              <button onClick={() => navigate(`/bookings?code=${bookingCode}`)} className={styles.btnPrimary}>
                {t("payment.viewBooking")}
              </button>
              <button onClick={() => navigate("/")} className={styles.btnSecondary}>
                {t("payment.backToHome")}
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ── Extract QR info from payment response ─────────────────
  const instruction     = paymentData?.payment?.instruction || {};
  const bankName        = instruction.bank_name || "VietinBank";
  const bankAccount     = instruction.bank_account || "";
  const accountName     = instruction.account_name || "";
  const transferContent = instruction.transfer_content || paymentData?.payment?.payment_code || "";
  const paymentCode     = paymentData?.payment?.payment_code || "";
  const expiresAt       = paymentData?.payment?.expires_at || null;

  // Build QR image URL: prefer backend-provided URL, fall back to VietQR generator
  const qrImageUrl =
    instruction.qr_url ||
    instruction.qr_payload ||
    (bankAccount
      ? buildVietQRUrl({
          bankCode:        instruction.bank_code || "ICB",
          accountNumber:   bankAccount,
          accountName:     accountName,
          amount:          paymentData?.payment?.final_amount || finalAmount,
          transferContent: transferContent,
        })
      : null);

  // ── Main render ───────────────────────────────────────────
  return (
    <>
      <NavBar />
      <div className={styles.wrapper}>
        <div className={styles.layout}>

          {/* ─── LEFT ─────────────────────────────── */}
          <div className={styles.left}>
            <h2 className={styles.pageTitle}>{t("payment.title")}</h2>

            {/* Booking code + timer */}
            <div className={styles.bookingCodeCard}>
              <div>
                <p className={styles.codeLabel}>{t("payment.bookingCode")}</p>
                <p className={styles.codeValue}>{bookingCode}</p>
              </div>
              {heldUntil && (
                <div className={styles.heldTimer}>
                  <span className={styles.timerLabel}>{t("payment.seatHeld")}</span>
                  <span className={`${styles.timerValue} ${expired ? styles.timerExpired : ""}`}>
                    {countdown ?? formatCountdown(heldUntil) ?? "--:--"}
                  </span>
                </div>
              )}
            </div>

            {expired && (
              <div className={styles.expiredBanner}>
                {t("payment.expiredBanner")}
              </div>
            )}

            {/* Invoice */}
            <div className={styles.invoiceCard}>
              <h3 className={styles.invoiceTitle}>{t("payment.orderDetails")}</h3>

              {selectedFlights?.outbound && (
                <div className={styles.invoiceRow}>
                  <div className={styles.invoiceLeft}>
                    <p className={styles.invoiceFlightLabel}>{t("payment.outbound")}</p>
                    <p className={styles.invoiceFlightName}>
                      {selectedFlights.outbound.airline?.name} · {selectedFlights.outbound.flight_number}
                    </p>
                    <p className={styles.invoiceFlightRoute}>
                      {selectedFlights.outbound.departure?.code} → {selectedFlights.outbound.arrival?.code}
                      &nbsp;·&nbsp;
                      {formatTime(selectedFlights.outbound.departure?.time)} – {formatTime(selectedFlights.outbound.arrival?.time)}
                    </p>
                  </div>
                  <p className={styles.invoicePrice}>{fmt(selectedFlights.outbound.seat?.total_price || 0)}</p>
                </div>
              )}

              {selectedFlights?.return && (
                <div className={styles.invoiceRow}>
                  <div className={styles.invoiceLeft}>
                    <p className={styles.invoiceFlightLabel}>{t("payment.return")}</p>
                    <p className={styles.invoiceFlightName}>
                      {selectedFlights.return.airline?.name} · {selectedFlights.return.flight_number}
                    </p>
                    <p className={styles.invoiceFlightRoute}>
                      {selectedFlights.return.departure?.code} → {selectedFlights.return.arrival?.code}
                      &nbsp;·&nbsp;
                      {formatTime(selectedFlights.return.departure?.time)} – {formatTime(selectedFlights.return.arrival?.time)}
                    </p>
                  </div>
                  <p className={styles.invoicePrice}>{fmt(selectedFlights.return.seat?.total_price || 0)}</p>
                </div>
              )}

              <div className={styles.invoiceDivider} />
              <p className={styles.invoiceSectionLabel}>{t("payment.passengers")}</p>
              {passengers?.map((p, i) => (
                <div key={i} className={styles.invoicePaxRow}>
                  <span>{p.fullName}</span>
                  <span className={styles.invoicePaxType}>
                    {i < (state.passengers?.adults || 1) ? t("payment.adult") : t("payment.child")}
                  </span>
                </div>
              ))}
              <div className={styles.invoiceDivider} />

              {bookingData?.baggage?.extra_baggage_total > 0 && (
                <div className={styles.invoiceRowSmall}>
                  <span>{t("payment.extraBaggage")}</span>
                  <span>{fmt(bookingData.baggage.extra_baggage_total)}</span>
                </div>
              )}

              {couponApplied && paymentData?.payment?.discount_amount > 0 && (
                <div className={`${styles.invoiceRowSmall} ${styles.discountRow}`}>
                  <span>{t("payment.discountCode", { code: couponApplied.code })}</span>
                  <span>- {fmt(paymentData.payment.discount_amount)}</span>
                </div>
              )}

              <div className={styles.invoiceTotal}>
                <span>{t("payment.total")}</span>
                <span className={styles.invoiceTotalPrice}>{fmt(finalAmount)}</span>
              </div>
            </div>

            {/* Coupon */}
            {!paymentData && (
              <div className={styles.couponCard}>
                <h3 className={styles.couponTitle}>{t("payment.promoCode")}</h3>
                {couponApplied ? (
                  <div className={styles.couponApplied}>
                    <div className={styles.couponAppliedInfo}>
                      <span className={styles.couponTag}>✓ {couponApplied.code}</span>
                      <span className={styles.couponDiscount}>{t("payment.applied")}</span>
                    </div>
                    <button className={styles.couponRemoveBtn} onClick={handleRemoveCoupon}>
                      {t("payment.remove")}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={styles.couponInputRow}>
                      <input
                        type="text"
                        className={`${styles.couponInput} ${couponError ? styles.couponInputError : ""}`}
                        placeholder={t("payment.enterCoupon")}
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      />
                      <button
                        className={styles.couponApplyBtn}
                        onClick={handleApplyCoupon}
                        disabled={applyingCoupon}
                      >
                        {applyingCoupon ? "..." : t("payment.apply")}
                      </button>
                    </div>
                    {couponError && <p className={styles.couponErrorMsg}>{couponError}</p>}
                    <p className={styles.couponHint}>{t("payment.couponHint")}</p>
                  </>
                )}
              </div>
            )}

            {/* Payment method */}
            {!paymentData && (
              <div className={styles.methodCard}>
                <h3 className={styles.methodTitle}>{t("payment.methodTitle")}</h3>
                <div className={styles.methodGrid}>
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      className={`${styles.methodBtn} ${selectedMethod === m.id ? styles.methodActive : ""} ${m.disabled ? styles.methodDisabled : ""}`}
                      onClick={() => !m.disabled && setSelectedMethod(m.id)}
                      disabled={m.disabled}
                      title={m.disabled ? t("payment.comingSoon") : ""}
                    >
                      <img src={m.img} alt={m.label} />
                      <span>{m.label}</span>
                      {m.disabled && <span className={styles.comingSoon}>{t("payment.comingSoon")}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {initError && <div className={styles.errorBanner}>{initError}</div>}

            {/* Action buttons */}
            {!paymentData ? (
              <div className={styles.actionRow}>
                <button className={styles.cancelBtn} onClick={handleCancel}>
                  {t("payment.cancel")}
                </button>
                <button
                  className={styles.payBtn}
                  onClick={handleInitPayment}
                  disabled={initLoading || expired}
                >
                  {initLoading
                    ? <span className={styles.spinner}>{t("payment.processingPayment")}</span>
                    : t("payment.payAmount", { amount: fmt(finalAmount) })
                  }
                </button>
              </div>
            ) : (
              <div className={styles.actionRow}>
                <button className={styles.cancelBtn} onClick={handleCancel}>
                  {t("payment.cancelTransaction")}
                </button>
                <button
                  className={styles.payBtn}
                  onClick={handleInitPayment}
                  disabled={initLoading}
                >
                  {t("payment.newTransaction")}
                </button>
              </div>
            )}
          </div>

          {/* ─── RIGHT — QR Code ────────────────────── */}
          <div className={styles.right}>

            {paymentData ? (
              <>
                {/* QR Card */}
                <div className={styles.qrCard}>
                  <div className={styles.qrHeader}>
                    <img src={vietqrImg} alt="VietQR" className={styles.vietqrLogo} />
                  </div>

                  <p className={styles.qrInstruction}>{t("payment.qrInstruction")}</p>

                  {expiresAt && (
                    <p className={styles.qrExpires}>
                      {t("payment.expires")} <strong>{formatTime(expiresAt)} {formatDate(expiresAt)}</strong>
                    </p>
                  )}

                  {qrImageUrl ? (
                    <div className={styles.qrImageWrapper}>
                      <img
                        src={qrImageUrl}
                        alt="VietQR Code"
                        className={styles.qrImage}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    </div>
                  ) : (
                    <div className={styles.qrPlaceholder}>
                      <p>{t("payment.qrLoading")}</p>
                    </div>
                  )}

                  {/* Bank info block */}
                  <div className={styles.bankInfo}>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>{t("payment.bankLabel")}</span>
                      <span className={styles.bankValue}>{bankName}</span>
                    </div>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>{t("payment.accountNoLabel")}</span>
                      <span className={styles.bankValue}>{bankAccount}</span>
                    </div>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>{t("payment.accountNameLabel")}</span>
                      <span className={styles.bankValue}>{accountName}</span>
                    </div>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>{t("payment.amountLabel")}</span>
                      <span className={`${styles.bankValue} ${styles.bankAmount}`}>{fmt(paymentData.payment?.final_amount || finalAmount)}</span>
                    </div>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>{t("payment.referenceLabel")}</span>
                      <span className={`${styles.bankValue} ${styles.bankContent}`}>{transferContent}</span>
                    </div>
                  </div>

                  <div className={styles.qrNote}>
                    <p>{t("payment.qrScanInstruction")}</p>
                    <p className={styles.qrNoteImportant}>{t("payment.qrReferenceWarning")}</p>
                  </div>

                  <div className={styles.pollingIndicator}>
                    <span className={styles.pollingDot} />
                    {t("payment.waitingConfirmation")}
                  </div>
                </div>

                {/* Payment code */}
                <div className={styles.payCodeCard}>
                  <p className={styles.payCodeLabel}>{t("payment.paymentCode")}</p>
                  <p className={styles.payCodeValue}>{paymentCode}</p>
                  <p className={styles.payCodeNote}>
                    {t("payment.checkEmailNote", { email: contact?.email })}
                  </p>
                </div>
              </>
            ) : (
              /* Before init — show preview */
              <div className={styles.qrCard}>
                <div className={styles.qrHeader}>
                  <img src={vietqrImg} alt="VietQR" className={styles.vietqrLogo} />
                </div>
                <div className={styles.qrPreview}>
                  <div className={styles.qrPreviewIcon}>📱</div>
                  <p>{t("payment.qrPreviewText")}</p>
                  <p className={styles.qrPreviewSub}>{t("payment.qrPreviewSub")}</p>
                </div>

                <div className={styles.contactCard}>
                  <p className={styles.contactTitle}>{t("payment.confirmationSentTo")}</p>
                  <p className={styles.contactEmail}>{contact?.email}</p>
                  <p className={styles.contactPhone}>{contact?.phone}</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
};

export default Payment;
