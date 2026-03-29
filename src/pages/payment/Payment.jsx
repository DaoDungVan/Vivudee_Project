import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import {
  initPayment,
  getPaymentByCode,
  cancelPayment,
  buildVietQRUrl,
} from "../../services/paymentService";
import API from "../../services/axiosInstance";
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
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatCountdown = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return "00:00";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const PAYMENT_METHODS = [
  { id: "BANK_QR", label: "VietQR / Bank Transfer", img: vietqrImg },
  { id: "MOMO",    label: "MoMo",                   img: momoImg   },
  { id: "VISA",    label: "Visa / Credit Card",      img: visaImg,   disabled: true },
  { id: "MASTER",  label: "Mastercard",               img: masterImg, disabled: true },
  { id: "PAYPAL",  label: "PayPal",                   img: paypalImg, disabled: true },
];

const Payment = () => {
  const navigate  = useNavigate();
  const { state } = useLocation();

  const [selectedMethod, setSelectedMethod] = useState("BANK_QR");
  const [couponCode,     setCouponCode]     = useState("");
  const [couponError,    setCouponError]    = useState("");
  const [couponApplied,  setCouponApplied]  = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availCoupons,   setAvailCoupons]   = useState([]);
  const [showCouponList, setShowCouponList] = useState(false);
  const [couponsLoading, setCouponsLoading] = useState(false);

  const [paymentData, setPaymentData] = useState(null);
  const [initLoading, setInitLoading] = useState(false);
  const [initError,   setInitError]   = useState("");

  // FIX: state riêng cho MoMo đang xử lý — hiện overlay "Đang kết nối MoMo"
  const [momoRedirecting, setMomoRedirecting] = useState(false);

  const [countdown, setCountdown] = useState(null);
  const [expired,   setExpired]   = useState(false);
  const [paid,      setPaid]      = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  if (!state?.bookingData) {
    return (
      <div className={styles.empty}>
        <p>Booking information not found.</p>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  const { bookingData, selectedFlights, passengers, contact, totalPrice } = state;
  const bookingId   = bookingData?.booking_id || bookingData?.id;
  const bookingCode = bookingData?.booking_code;
  const heldUntil   = bookingData?.held_until;
  const finalAmount = paymentData?.payment?.final_amount ?? couponApplied?.final_amount ?? totalPrice;

  // FIX: Fetch coupon — có loading state + không crash nếu lỗi
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return; // chưa login → không fetch
    setCouponsLoading(true);
    API.get("/coupons/available")
      .then((res) => {
        const list = res.data?.coupons || res.data?.data || [];
        setAvailCoupons(list);
      })
      .catch(() => setAvailCoupons([]))
      .finally(() => setCouponsLoading(false));
  }, []);

  // Held seat countdown
  useEffect(() => {
    if (!heldUntil) return;
    const iv = setInterval(() => {
      const t = formatCountdown(heldUntil);
      setCountdown(t);
      if (t === "00:00") setExpired(true);
    }, 1000);
    return () => clearInterval(iv);
  }, [heldUntil]);

  // Poll payment status — chỉ cho BANK_QR
  useEffect(() => {
    if (!paymentData?.payment?.payment_code || paid) return;
    let active = true;
    const poll = async () => {
      try {
        const res    = await getPaymentByCode(paymentData.payment.payment_code);
        const status = res?.payment?.status?.toUpperCase();
        if (["PAID", "SUCCESS", "COMPLETED", "CONFIRMED"].includes(status)) {
          if (active) setPaid(true);
        }
      } catch (_) {}
    };
    const iv = setInterval(poll, 4000);
    return () => { active = false; clearInterval(iv); };
  }, [paymentData, paid]);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) { setCouponError("Please enter a coupon code"); return; }
    if (totalPrice < 300000) { setCouponError("Minimum order value of 300,000 ₫ required"); return; }
    setCouponError("");
    setCouponApplied({ code: couponCode.trim(), voucher_code: couponCode.trim() });
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
    setCouponError("");
  };

  const handleInitPayment = async () => {
    if (!bookingId) { setInitError("Missing booking ID."); return; }
    setInitLoading(true);
    setInitError("");
    setQrLoading(true);

    // FIX: Với MoMo hiện overlay ngay lập tức để user biết đang xử lý
    // vì Render cold start có thể mất 10-20s
    if (selectedMethod === "MOMO") {
      setMomoRedirecting(true);
    }

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

      if (selectedMethod === "MOMO") {
        const payUrl = res?.payment?.instruction?.pay_url;
        if (payUrl) {
          // Điều hướng cùng tab — MoMo xử lý xong redirect về backend
          window.location.href = payUrl;
          return;
        } else {
          setMomoRedirecting(false);
          setInitError("Không lấy được link thanh toán MoMo. Vui lòng thử lại.");
          return;
        }
      }

      // BANK_QR
      setPaymentData(res);
    } catch (err) {
      setMomoRedirecting(false);
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Payment initialization failed";
      setInitError(msg);
    } finally {
      setInitLoading(false);
    }
  };

  const handleCancel = async () => {
    if (paymentData?.payment?.payment_code) {
      try { await cancelPayment(paymentData.payment.payment_code); } catch (_) {}
    }
    navigate("/");
  };

  // Paid screen (BANK_QR)
  if (paid) {
    const pCode = paymentData?.payment?.payment_code || bookingCode;
    return (
      <>
        <NavBar />
        <div className={styles.successWrapper}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <circle cx="36" cy="36" r="36" fill="#22c55e" opacity="0.12" />
                <circle cx="36" cy="36" r="26" fill="#22c55e" />
                <path d="M24 36l8 8 16-16" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>Payment Successful!</h2>
            <p>Your booking has been confirmed.</p>
            <div className={styles.successCode}>{pCode}</div>
            <p className={styles.successNote}>
              Your e-ticket has been sent to <strong>{contact?.email}</strong>
            </p>
            <div className={styles.successBtns}>
              <button onClick={() => navigate(`/bookings?code=${bookingCode}`)} className={styles.btnPrimary}>
                View Booking
              </button>
              <button onClick={() => navigate("/")} className={styles.btnSecondary}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Extract BANK_QR info
  const instruction     = paymentData?.payment?.instruction || {};
  const bankName        = instruction.bank_name || "VietinBank";
  const bankAccount     = instruction.bank_account || "";
  const accountName     = instruction.account_name || "";
  const transferContent = instruction.transfer_content || paymentData?.payment?.payment_code || "";
  const paymentCode     = paymentData?.payment?.payment_code || "";
  const expiresAt       = paymentData?.payment?.expires_at || null;

  const qrImageUrl = instruction.qr_payload ||
    (bankAccount
      ? buildVietQRUrl({
          bankCode:        instruction.bank_code || "ICB",
          accountNumber:   bankAccount,
          accountName,
          amount:          paymentData?.payment?.final_amount || finalAmount,
          transferContent,
        })
      : null);

  return (
    <>
      <NavBar />

      {/* FIX: MoMo redirecting overlay — hiện ngay khi click Pay MoMo
          vì API call Render mất 10-20s, không để user thấy màn hình đứng yên */}
      {momoRedirecting && (
        <div className={styles.momoOverlay}>
          <div className={styles.momoOverlayCard}>
            <img src={momoImg} alt="MoMo" className={styles.momoOverlayLogo} />
            <div className={styles.momoOverlaySpinner} />
            <p className={styles.momoOverlayTitle}>Đang kết nối MoMo...</p>
            <p className={styles.momoOverlayNote}>
              Vui lòng chờ, bạn sẽ được chuyển đến trang thanh toán MoMo
            </p>
          </div>
        </div>
      )}

      <div className={styles.wrapper}>
        <div className={styles.layout}>

          {/* ── LEFT ─────────────────────────────────── */}
          <div className={styles.left}>
            <h2 className={styles.pageTitle}>Payment</h2>

            {/* Booking code + timer */}
            <div className={styles.bookingCodeCard}>
              <div>
                <p className={styles.codeLabel}>Booking Code</p>
                <p className={styles.codeValue}>{bookingCode}</p>
              </div>
              {heldUntil && (
                <div className={styles.heldTimer}>
                  <span className={styles.timerLabel}>⏱ Seat held for</span>
                  <span className={`${styles.timerValue} ${expired ? styles.timerExpired : ""}`}>
                    {countdown ?? formatCountdown(heldUntil) ?? "--:--"}
                  </span>
                </div>
              )}
            </div>

            {expired && (
              <div className={styles.expiredBanner}>
                ⚠️ Seat hold has expired. Please search again.
                <button className={styles.expiredBackBtn} onClick={() => navigate("/flights")}>
                  Search Again
                </button>
              </div>
            )}

            {/* Invoice */}
            <div className={styles.invoiceCard}>
              <h3 className={styles.invoiceTitle}>Order Details</h3>

              {selectedFlights?.outbound && (
                <div className={styles.invoiceRow}>
                  <div className={styles.invoiceLeft}>
                    <p className={styles.invoiceFlightLabel}>✈️ Outbound</p>
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
                    <p className={styles.invoiceFlightLabel}>🔁 Return</p>
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
              <p className={styles.invoiceSectionLabel}>Passengers</p>
              {passengers?.map((p, i) => (
                <div key={i} className={styles.invoicePaxRow}>
                  <span>{p.fullName}</span>
                  <span className={styles.invoicePaxType}>
                    {i < (state.passengers?.adults || 1) ? "Adult" : "Child"}
                  </span>
                </div>
              ))}
              <div className={styles.invoiceDivider} />

              {bookingData?.baggage?.extra_baggage_total > 0 && (
                <div className={styles.invoiceRowSmall}>
                  <span>Extra Baggage</span>
                  <span>{fmt(bookingData.baggage.extra_baggage_total)}</span>
                </div>
              )}

              {couponApplied && (
                <div className={`${styles.invoiceRowSmall} ${styles.discountRow}`}>
                  <span>🎟 Discount ({couponApplied.code})</span>
                  <span>
                    {paymentData?.payment?.discount_amount > 0
                      ? `− ${fmt(paymentData.payment.discount_amount)}`
                      : "Applied at checkout"}
                  </span>
                </div>
              )}

              <div className={styles.invoiceTotal}>
                <span>Total</span>
                <span className={styles.invoiceTotalPrice}>{fmt(finalAmount)}</span>
              </div>
            </div>

            {/* FIX: Coupon section với loading + fallback message */}
            {!paymentData && (
              <div className={styles.couponCard}>
                <div className={styles.couponCardHeader}>
                  <h3 className={styles.couponTitle}>🎟 Promo Code</h3>
                  {/* Chỉ hiện nút My Coupons nếu đã login và có coupon */}
                  {!couponsLoading && availCoupons.length > 0 && (
                    <button
                      className={styles.showCouponsBtn}
                      onClick={() => setShowCouponList((v) => !v)}
                    >
                      {showCouponList ? "Hide" : `My Coupons (${availCoupons.length})`}
                    </button>
                  )}
                  {couponsLoading && (
                    <span className={styles.couponsLoadingText}>Loading...</span>
                  )}
                </div>

                {/* Danh sách coupon */}
                {showCouponList && availCoupons.length > 0 && (
                  <div className={styles.couponListBox}>
                    {availCoupons.map((c, i) => (
                      <div key={c.id || i} className={styles.couponListItem}>
                        <div className={styles.couponListLeft}>
                          <span className={styles.couponListCode}>{c.code}</span>
                          <span className={styles.couponListDesc}>
                            {c.name || c.description ||
                              (c.discount_percent
                                ? `${c.discount_percent}% off`
                                : `${fmt(c.discount_amount || 0)} off`)}
                          </span>
                          {c.min_order_amount > 0 && (
                            <span className={styles.couponListMin}>
                              Min. {fmt(c.min_order_amount)}
                            </span>
                          )}
                        </div>
                        <button
                          className={styles.couponListUseBtn}
                          onClick={() => {
                            setCouponCode(c.code);
                            setCouponApplied({ code: c.code, voucher_code: c.code });
                            setShowCouponList(false);
                            setCouponError("");
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {couponApplied ? (
                  <div className={styles.couponApplied}>
                    <div className={styles.couponAppliedInfo}>
                      <span className={styles.couponTag}>✓ {couponApplied.code}</span>
                      <span className={styles.couponDiscount}>Applied</span>
                    </div>
                    <button className={styles.couponRemoveBtn} onClick={handleRemoveCoupon}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={styles.couponInputRow}>
                      <input
                        type="text"
                        className={`${styles.couponInput} ${couponError ? styles.couponInputError : ""}`}
                        placeholder="Enter coupon code..."
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      />
                      <button
                        className={styles.couponApplyBtn}
                        onClick={handleApplyCoupon}
                        disabled={applyingCoupon}
                      >
                        {applyingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                    {couponError && <p className={styles.couponErrorMsg}>{couponError}</p>}
                    <p className={styles.couponHint}>
                      Discount is applied after payment initialization.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Payment method */}
            {!paymentData && (
              <div className={styles.methodCard}>
                <h3 className={styles.methodTitle}>Payment Method</h3>
                <div className={styles.methodGrid}>
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      className={`${styles.methodBtn} ${selectedMethod === m.id ? styles.methodActive : ""} ${m.disabled ? styles.methodDisabled : ""}`}
                      onClick={() => !m.disabled && setSelectedMethod(m.id)}
                      disabled={m.disabled}
                      title={m.disabled ? "Coming soon" : ""}
                    >
                      <img src={m.img} alt={m.label} />
                      <span>{m.label}</span>
                      {m.disabled && <span className={styles.comingSoon}>Soon</span>}
                    </button>
                  ))}
                </div>

                {/* FIX: Ghi chú cho MoMo trên PC */}
                {selectedMethod === "MOMO" && (
                  <div className={styles.momoMethodNote}>
                    <span>📱</span>
                    <span>
                      Bạn sẽ được chuyển sang trang MoMo. Trên máy tính, dùng QR hoặc đăng nhập tài khoản MoMo tại đó.
                      Lỗi <em>"Failed to launch intent"</em> trên PC là bình thường — chọn <strong>Thanh toán bằng Ví MoMo</strong> trên trang MoMo.
                    </span>
                  </div>
                )}
              </div>
            )}

            {initError && <div className={styles.errorBanner}>{initError}</div>}

            {/* Action buttons */}
            {!paymentData ? (
              <div className={styles.actionRow}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>
                <button
                  className={styles.payBtn}
                  onClick={handleInitPayment}
                  disabled={initLoading || expired}
                >
                  {initLoading
                    ? <span className={styles.spinner}>⏳ Processing...</span>
                    : `Pay ${fmt(finalAmount)}`}
                </button>
              </div>
            ) : (
              <div className={styles.actionRow}>
                <button className={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
                <button
                  className={styles.payBtn}
                  onClick={handleInitPayment}
                  disabled={initLoading}
                >
                  New Transaction
                </button>
              </div>
            )}
          </div>

          {/* ── RIGHT ───────────────────────────────────── */}
          <div className={styles.right}>
            {paymentData ? (
              <>
                {/* BANK QR Panel */}
                <div className={styles.qrCard}>
                  <div className={styles.qrHeader}>
                    <img src={vietqrImg} alt="VietQR" className={styles.vietqrLogo} />
                  </div>

                  <p className={styles.qrInstruction}>
                    Complete payment within <strong>15 minutes</strong>
                  </p>

                  {expiresAt && (
                    <p className={styles.qrExpires}>
                      Expires: <strong>{formatTime(expiresAt)} {formatDate(expiresAt)}</strong>
                    </p>
                  )}

                  {qrImageUrl ? (
                    <div className={styles.qrImageWrapper}>
                      {qrLoading && (
                        <div className={styles.qrSkeleton}><span>Generating QR...</span></div>
                      )}
                      <img
                        src={qrImageUrl}
                        alt="VietQR Code"
                        className={styles.qrImage}
                        style={{ display: qrLoading ? "none" : "block" }}
                        onLoad={() => setQrLoading(false)}
                        onError={(e) => { setQrLoading(false); e.target.style.display = "none"; }}
                      />
                    </div>
                  ) : (
                    <div className={styles.qrPlaceholder}><p>Loading QR...</p></div>
                  )}

                  <div className={styles.bankInfo}>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>Bank:</span>
                      <span className={styles.bankValue}>{bankName}</span>
                    </div>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>Account:</span>
                      <span className={styles.bankValue}>{bankAccount}</span>
                    </div>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>Name:</span>
                      <span className={styles.bankValue}>{accountName}</span>
                    </div>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>Amount:</span>
                      <span className={`${styles.bankValue} ${styles.bankAmount}`}>
                        {fmt(paymentData.payment?.final_amount || finalAmount)}
                      </span>
                    </div>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>Ref:</span>
                      <span className={`${styles.bankValue} ${styles.bankContent}`}>{transferContent}</span>
                    </div>
                  </div>

                  <div className={styles.qrNote}>
                    <p>📱 Open banking app → scan QR or transfer manually</p>
                    <p className={styles.qrNoteImportant}>
                      ⚠️ Use exact reference for auto confirmation
                    </p>
                  </div>

                  <div className={styles.pollingIndicator}>
                    <span className={styles.pollingDot} />
                    Waiting for payment confirmation...
                  </div>
                </div>

                <div className={styles.payCodeCard}>
                  <p className={styles.payCodeLabel}>Payment Code</p>
                  <p className={styles.payCodeValue}>{paymentCode}</p>
                  <p className={styles.payCodeNote}>
                    Check <strong>{contact?.email}</strong> for instructions
                  </p>
                </div>
              </>
            ) : (
              /* Before init — preview */
              <div className={styles.qrCard}>
                <div className={styles.qrHeader}>
                  {selectedMethod === "MOMO"
                    ? <img src={momoImg} alt="MoMo" className={styles.momoLogoPreview} />
                    : <img src={vietqrImg} alt="VietQR" className={styles.vietqrLogo} />
                  }
                </div>
                <div className={styles.qrPreview}>
                  <div className={styles.qrPreviewIcon}>
                    {selectedMethod === "MOMO" ? "📲" : "📱"}
                  </div>
                  <p>
                    {selectedMethod === "MOMO"
                      ? "Bạn sẽ được chuyển sang trang MoMo để thanh toán"
                      : "Your VietQR code will appear here after clicking Pay"
                    }
                  </p>
                  <p className={styles.qrPreviewSub}>
                    {selectedMethod === "MOMO"
                      ? "Sau khi thanh toán xong, MoMo sẽ hiển thị kết quả giao dịch"
                      : "Supports all Vietnamese banks via VietQR"
                    }
                  </p>
                </div>
                <div className={styles.contactCard}>
                  <p className={styles.contactTitle}>Confirmation sent to</p>
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