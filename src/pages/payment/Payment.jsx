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
import {
  getAvailableCoupons,
  getCouponErrorMessage,
} from "../../services/couponService";
import styles from "./Payment.module.css";

import visaImg   from "../../assets/images/payments/visa.png";
import masterImg from "../../assets/images/payments/mastercard.svg";
import momoImg   from "../../assets/images/payments/momo.png";
import vietqrImg from "../../assets/images/payments/vietqr.png";
import paypalImg from "../../assets/images/payments/paypal.png";

// Định dạng tiền VND. Ví dụ: 500000 → "500.000 VND"
const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + " VND";

// Lấy HH:MM từ chuỗi ISO — dùng regex để tránh lệch múi giờ.
const formatTime = (iso) => {
  if (!iso) return "--:--";
  const match = String(iso).match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "--:--";
};

// Format ngày theo kiểu "DD/MM/YYYY". Ví dụ: "2025-06-15" → "15/06/2025"
const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Tính thời gian còn lại cho đến expiresAt, trả về "MM:SS".
// Dùng để hiển thị đồng hồ đếm ngược hết hạn QR.
const formatCountdown = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return "00:00";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// Danh sách phương thức thanh toán.
// disabled: true = tính năng sắp ra mắt (hiển thị nhãn "Soon").
const PAYMENT_METHODS = [
  { id: "BANK_QR", label: "VietQR / Bank Transfer", img: vietqrImg },
  { id: "MOMO",    label: "MoMo",                   img: momoImg   },
  { id: "VISA",    label: "Visa / Credit Card",      img: visaImg,   disabled: true },
  { id: "MASTER",  label: "Mastercard",               img: masterImg, disabled: true },
  { id: "PAYPAL",  label: "PayPal",                   img: paypalImg, disabled: true },
];

// Tính số tiền giảm giá từ coupon.
// Hỗ trợ 2 loại: theo % (discount_percent) hoặc số tiền cố định (discount_amount).
const computeDiscount = (coupon, price) => {
  if (!coupon) return 0;
  if (coupon.discount_percent) return Math.round(price * coupon.discount_percent / 100);
  if (coupon.discount_amount)  return Number(coupon.discount_amount);
  return 0;
};

const Payment = () => {
  const navigate  = useNavigate();
  const { state } = useLocation(); // Nhận data từ trang Booking

  // Phương thức thanh toán đang chọn (mặc định VietQR)
  const [selectedMethod, setSelectedMethod] = useState("BANK_QR");

  // State coupon
  const [couponCode,     setCouponCode]     = useState("");
  const [couponError,    setCouponError]    = useState("");
  const [couponApplied,  setCouponApplied]  = useState(null);  // Coupon đã áp dụng
  const [applyingCoupon] = useState(false);
  const [availCoupons,   setAvailCoupons]   = useState([]);    // Danh sách coupon có thể dùng
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponApiError, setCouponApiError] = useState("");

  // State thanh toán
  const [paymentData, setPaymentData] = useState(null);   // Dữ liệu sau khi init payment (QR, payment_code...)
  const [initLoading, setInitLoading] = useState(false);  // Đang gọi API init payment
  const [initError,   setInitError]   = useState("");

  // Overlay "Đang kết nối MoMo" — hiện ngay khi click Pay với MoMo
  // vì Render cold start có thể mất 10–20 giây
  const [momoRedirecting, setMomoRedirecting] = useState(false);

  // Đồng hồ đếm ngược ghế đang được giữ (held_until từ backend)
  const [countdown, setCountdown] = useState(null);
  const [expired,   setExpired]   = useState(false); // Ghế đã hết hạn giữ

  // Trạng thái QR
  const [paid,      setPaid]      = useState(false);    // Đã thanh toán thành công
  const [qrLoading, setQrLoading] = useState(false);    // Ảnh QR đang tải
  const [qrError,   setQrError]   = useState(false);    // Ảnh QR lỗi (hiện thông tin thủ công)

  // Guard: nếu vào trang này trực tiếp không có data → về trang chủ
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
  const heldUntil   = bookingData?.held_until; // Thời hạn giữ ghế
  // Số tiền cuối cùng: ưu tiên từ payment data (chính xác nhất), sau đó coupon preview, cuối là giá gốc
  const finalAmount = paymentData?.payment?.final_amount ?? couponApplied?.final_amount ?? totalPrice;

  // Tải danh sách coupon có thể dùng ngay khi vào trang Payment.
  // Chỉ tải nếu đã đăng nhập (có token).
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setCouponsLoading(true);
    getAvailableCoupons()
      .then((list) => {
        setAvailCoupons(list);
        setCouponApiError("");
      })
      .catch((err) => {
        setAvailCoupons([]);
        setCouponApiError(
          getCouponErrorMessage(err, "Unable to load available coupons."),
        );
      })
      .finally(() => setCouponsLoading(false));
  }, []);

  // Đếm ngược thời gian giữ ghế — cập nhật mỗi giây.
  // Khi hết → đặt expired = true, hiện banner cảnh báo.
  useEffect(() => {
    if (!heldUntil) return;
    const iv = setInterval(() => {
      const t = formatCountdown(heldUntil);
      setCountdown(t);
      if (t === "00:00") setExpired(true);
    }, 1000);
    return () => clearInterval(iv);
  }, [heldUntil]);

  // Polling kiểm tra trạng thái thanh toán mỗi 4 giây (chỉ cho BANK_QR).
  // Tại sao polling? Vì user chuyển khoản qua app ngân hàng,
  // backend nhận webhook và cập nhật status → frontend cần hỏi lại định kỳ.
  useEffect(() => {
    if (!paymentData?.payment?.payment_code || paid) return;
    let active = true;
    const poll = async () => {
      try {
        const res    = await getPaymentByCode(paymentData.payment.payment_code);
        const status = res?.payment?.status?.toUpperCase();
        if (["PAID", "SUCCESS", "COMPLETED", "CONFIRMED"].includes(status)) {
          if (active) setPaid(true); // Chỉ cập nhật nếu component còn mount
        }
      } catch (_) {} // Im lặng nếu lỗi — sẽ thử lại sau 4s
    };
    const iv = setInterval(poll, 4000);
    return () => { active = false; clearInterval(iv); }; // Dọn dẹp khi unmount
  }, [paymentData, paid]);

  // Áp dụng coupon được nhập tay.
  // So sánh với danh sách availCoupons để tính trước discount preview.
  const handleApplyCoupon = () => {
    if (!couponCode.trim()) { setCouponError("Please enter a coupon code"); return; }
    if (totalPrice < 300000) { setCouponError("Minimum order value of 300,000 VND required"); return; }
    setCouponError("");
    const matched = availCoupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase());
    const discount = matched ? computeDiscount(matched, totalPrice) : 0;
    setCouponApplied({
      code: couponCode.trim().toUpperCase(),
      voucher_code: couponCode.trim().toUpperCase(),
      discount_amount: discount,
      final_amount: discount > 0 ? totalPrice - discount : null,
      ...(matched || {}),
    });
  };

  // Gỡ bỏ coupon đã áp dụng
  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
    setCouponError("");
  };

  // Khởi tạo giao dịch thanh toán — gọi API để tạo payment record.
  // Với MoMo: nhận redirect URL → chuyển hướng user sang trang MoMo.
  // Với BANK_QR: nhận thông tin QR → hiện QR code để user quét.
  const handleInitPayment = async () => {
    if (!bookingId) { setInitError("Missing booking ID."); return; }
    setInitLoading(true);
    setInitError("");
    setQrLoading(true);
    setQrError(false);

    // Hiện overlay MoMo ngay lập tức vì API Render cold start chậm
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
        voucher_code:   couponApplied?.voucher_code || null, // Gửi mã coupon lên để backend tính giảm giá chính xác
      };
      const res = await initPayment(payload);

      if (selectedMethod === "MOMO") {
        const payUrl = res?.payment?.instruction?.pay_url;
        if (payUrl) {
          window.location.href = payUrl; // Redirect sang trang thanh toán MoMo
          return;
        } else {
          // MoMo không trả về URL → tự động chuyển sang VietQR
          setMomoRedirecting(false);
          setSelectedMethod("BANK_QR");
          setInitError("Could not connect to MoMo. Switched to VietQR — please use bank transfer to complete your payment.");
          return;
        }
      }

      // BANK_QR: lưu payment data để render QR
      setPaymentData(res);
    } catch (err) {
      setMomoRedirecting(false);
      const raw = err?.response?.data?.message || err?.response?.data?.error || err?.message || "";
      const isPendingExists = raw.toLowerCase().includes("pending payment");
      const isMomoError = selectedMethod === "MOMO";
      if (isPendingExists) {
        // Đã có giao dịch đang chờ → không tạo thêm, dùng VietQR để hoàn tất
        setInitError("A payment for this booking already exists. Please use VietQR / Bank Transfer to complete it.");
        setSelectedMethod("BANK_QR");
      } else if (isMomoError) {
        setSelectedMethod("BANK_QR");
        setInitError("MoMo is currently unavailable. Switched to VietQR — please use bank transfer to complete your payment.");
      } else {
        setInitError(raw || "Payment initialization failed. Please try again.");
      }
    } finally {
      setInitLoading(false);
    }
  };

  // Huỷ thanh toán: gọi API huỷ (nếu đã init) rồi về trang chủ.
  const handleCancel = async () => {
    if (paymentData?.payment?.payment_code) {
      try { await cancelPayment(paymentData.payment.payment_code); } catch (_) {}
    }
    navigate("/");
  };

  // MÀN HÌNH THÀNH CÔNG — hiện sau khi polling phát hiện status = PAID
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

  // Trích xuất thông tin chuyển khoản từ paymentData (sau khi init BANK_QR)
  const instruction     = paymentData?.payment?.instruction || {};
  const bankName        = instruction.bank_name || "VietinBank";
  const bankAccount     = instruction.bank_account || "";
  const accountName     = instruction.account_name || "";
  const transferContent = instruction.transfer_content || paymentData?.payment?.payment_code || "";
  const paymentCode     = paymentData?.payment?.payment_code || "";
  const expiresAt       = paymentData?.payment?.expires_at || null;

  // Lấy URL ảnh QR: ưu tiên QR từ backend, nếu không có thì tự tạo bằng VietQR.io
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

      {/* Overlay MoMo: hiện trong lúc chờ API response để user không thấy màn hình đứng yên */}
      {momoRedirecting && (
        <div className={styles.momoOverlay}>
          <div className={styles.momoOverlayCard}>
            <img src={momoImg} alt="MoMo" className={styles.momoOverlayLogo} />
            <div className={styles.momoOverlaySpinner} />
            <p className={styles.momoOverlayTitle}>Connecting to MoMo...</p>
            <p className={styles.momoOverlayNote}>
              Please wait, you will be redirected to the MoMo payment page
            </p>
          </div>
        </div>
      )}

      <div className={styles.wrapper}>
        <div className={styles.layout}>

          {/* ── CỘT TRÁI: Thông tin đơn hàng + coupon + phương thức thanh toán ── */}
          <div className={styles.left}>
            <h2 className={styles.pageTitle}>Payment</h2>

            {/* Mã đặt chỗ + đồng hồ đếm ngược thời gian giữ ghế */}
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

            {/* Banner cảnh báo khi ghế hết hạn giữ */}
            {expired && (
              <div className={styles.expiredBanner}>
                ⚠️ Seat hold has expired. Please search again.
                <button className={styles.expiredBackBtn} onClick={() => navigate("/flights")}>
                  Search Again
                </button>
              </div>
            )}

            {/* Chi tiết đơn hàng: danh sách chuyến bay + hành khách + giảm giá + tổng tiền */}
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

              {/* Hành lý thêm (nếu có) */}
              {bookingData?.baggage?.extra_baggage_total > 0 && (
                <div className={styles.invoiceRowSmall}>
                  <span>Extra Baggage</span>
                  <span>{fmt(bookingData.baggage.extra_baggage_total)}</span>
                </div>
              )}

              {/* Hiển thị dòng giảm giá nếu đã áp dụng coupon */}
              {couponApplied && (
                <div className={`${styles.invoiceRowSmall} ${styles.discountRow}`}>
                  <span>🎟 Discount ({couponApplied.code})</span>
                  <span>
                    {paymentData?.payment?.discount_amount > 0
                      ? `− ${fmt(paymentData.payment.discount_amount)}`
                      : couponApplied.discount_amount > 0
                        ? `− ${fmt(couponApplied.discount_amount)}`
                        : "Applied at checkout"}
                  </span>
                </div>
              )}

              <div className={styles.invoiceTotal}>
                <span>Total</span>
                <span className={styles.invoiceTotalPrice}>{fmt(finalAmount)}</span>
              </div>
            </div>

            {/* Section coupon — chỉ hiện TRƯỚC khi init payment (sau đó không cho sửa nữa) */}
            {!paymentData && (
              <div className={styles.couponCard}>
                <div className={styles.couponCardHeader}>
                  <h3 className={styles.couponTitle}>🎟 Promo Code</h3>
                  {couponsLoading && (
                    <span className={styles.couponsLoadingText}>Loading...</span>
                  )}
                </div>

                {couponApiError && (
                  <p className={styles.couponApiError}>{couponApiError}</p>
                )}

                {/* Danh sách coupon có sẵn để user click Apply nhanh */}
                {!couponsLoading && availCoupons.length > 0 && (
                  <div className={styles.couponListBox}>
                    {availCoupons.map((c, i) => {
                      const eligible = !c.min_order_amount || totalPrice >= c.min_order_amount;
                      return (
                        <div
                          key={c.id || i}
                          className={`${styles.couponListItem} ${!eligible ? styles.couponListItemDisabled : ""}`}
                        >
                          <div className={styles.couponListLeft}>
                            <span className={styles.couponListCode}>{c.code}</span>
                            <span className={styles.couponListDesc}>
                              {c.name || c.description ||
                                (c.discount_percent
                                  ? `${c.discount_percent}% off`
                                  : `${fmt(c.discount_amount || 0)} off`)}
                            </span>
                            {c.min_order_amount > 0 && (
                              <span className={`${styles.couponListMin} ${!eligible ? styles.couponListMinNotMet : ""}`}>
                                {eligible ? `Min. ${fmt(c.min_order_amount)}` : `Requires min. ${fmt(c.min_order_amount)}`}
                              </span>
                            )}
                          </div>
                          <button
                            className={`${styles.couponListUseBtn} ${!eligible ? styles.couponListUseBtnDisabled : ""}`}
                            disabled={!eligible}
                            onClick={() => {
                              if (!eligible) return;
                              const discount = computeDiscount(c, totalPrice);
                              setCouponCode(c.code);
                              setCouponApplied({
                                ...c,
                                code: c.code,
                                voucher_code: c.code,
                                discount_amount: discount,
                                final_amount: discount > 0 ? totalPrice - discount : null,
                              });
                              setCouponError("");
                            }}
                          >
                            Apply
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Nếu đã áp dụng coupon → hiện trạng thái + nút Remove */}
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
                    {/* Input nhập mã coupon thủ công */}
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

            {/* Chọn phương thức thanh toán — chỉ hiện trước khi init */}
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

                {/* Ghi chú đặc biệt khi chọn MoMo trên PC */}
                {selectedMethod === "MOMO" && (
                  <div className={styles.momoMethodNote}>
                    <span>📱</span>
                    <span>
                      You will be redirected to MoMo. On desktop, scan the QR or log in to your MoMo account.
                      The <em>"Failed to launch intent"</em> error on PC is normal — select <strong>Pay with MoMo Wallet</strong> on the MoMo page.
                    </span>
                  </div>
                )}
              </div>
            )}

            {initError && <div className={styles.errorBanner}>{initError}</div>}

            {/* Nút hành động:
                - Trước init: "← Back" và "Pay [số tiền]"
                - Sau init: "Cancel" và "New Transaction" */}
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

          {/* ── CỘT PHẢI: QR code / preview phương thức thanh toán ── */}
          <div className={styles.right}>
            {paymentData ? (
              <>
                {/* Panel QR chuyển khoản BANK_QR */}
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

                  {/* Hiện ảnh QR hoặc thông báo không có QR */}
                  {qrImageUrl && !qrError ? (
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
                        onError={() => { setQrLoading(false); setQrError(true); }} // QR lỗi → hiện thông tin thủ công
                      />
                    </div>
                  ) : (
                    <div className={styles.qrUnavailable}>
                      <span className={styles.qrUnavailableIcon}>🏦</span>
                      <p className={styles.qrUnavailableText}>QR unavailable</p>
                      <p className={styles.qrUnavailableSub}>Please transfer manually using the bank details below</p>
                    </div>
                  )}

                  {/* Thông tin chuyển khoản thủ công */}
                  <div className={styles.bankInfo}>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>Bank:</span>
                      <span className={styles.bankValue}>{bankName}</span>
                    </div>
                    {bankAccount && (
                      <div className={styles.bankRow}>
                        <span className={styles.bankLabel}>Account:</span>
                        <span className={styles.bankValue}>{bankAccount}</span>
                      </div>
                    )}
                    {accountName && (
                      <div className={styles.bankRow}>
                        <span className={styles.bankLabel}>Name:</span>
                        <span className={styles.bankValue}>{accountName}</span>
                      </div>
                    )}
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>Amount:</span>
                      <span className={`${styles.bankValue} ${styles.bankAmount}`}>
                        {fmt(paymentData.payment?.final_amount || finalAmount)}
                      </span>
                    </div>
                    <div className={styles.bankRow}>
                      <span className={styles.bankLabel}>Ref:</span>
                      {/* Nội dung chuyển khoản phải CHÍNH XÁC để hệ thống tự xác nhận */}
                      <span className={`${styles.bankValue} ${styles.bankContent}`}>{transferContent}</span>
                    </div>
                  </div>

                  <div className={styles.qrNote}>
                    <p>📱 Open banking app → scan QR or transfer manually</p>
                    <p className={styles.qrNoteImportant}>
                      ⚠️ Use exact reference for auto confirmation
                    </p>
                  </div>

                  {/* Indicator cho biết đang polling kiểm tra thanh toán */}
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
              /* Trước khi init: preview phương thức đang chọn */
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
                      ? "You will be redirected to MoMo to complete payment"
                      : "Your VietQR code will appear here after clicking Pay"
                    }
                  </p>
                  <p className={styles.qrPreviewSub}>
                    {selectedMethod === "MOMO"
                      ? "After payment, MoMo will display the transaction result"
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
