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

// ÃƒÆ’Ã¢â‚¬Å¾Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹nh dÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¡ng tiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Ân VND. VÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ dÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â¥: 500000 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ "500.000 VND"
const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + " VND";

// Lay HH:MM tu chuoi ISO bang regex de tranh lech mui gio.
const formatTime = (iso) => {
  if (!iso) return "--:--";
  const match = String(iso).match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "--:--";
};

// Format ngay theo kieu DD/MM/YYYY.
const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Tinh thoi gian con lai den expiresAt, tra ve MM:SS.
// Dung de hien thi dong ho dem nguoc het han QR.
const formatCountdown = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return "00:00";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const normalizeHeldUntil = (heldUntil, bookingStatus) => {
  if (!heldUntil) return heldUntil;

  const parsed = new Date(heldUntil);
  if (Number.isNaN(parsed.getTime())) return heldUntil;

  const isPendingBooking = String(bookingStatus || "").toLowerCase() === "pending";
  const looksExpired = parsed.getTime() <= Date.now();
  if (!isPendingBooking || !looksExpired) return heldUntil;

  const vietnamOffsetFix = new Date(parsed.getTime() + 7 * 60 * 60 * 1000);
  return vietnamOffsetFix.getTime() > Date.now() ? vietnamOffsetFix.toISOString() : heldUntil;
};

// Danh sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ch phÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â¡ng thÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â©c thanh toÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡n.
// disabled: true = tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­nh nÃƒÆ’Ã¢â‚¬Å¾Ãƒâ€ Ã¢â‚¬â„¢ng sÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¯p ra mÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¯t (hiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢n thÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹ nhÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£n "Soon").
const PAYMENT_METHODS = [
  { id: "BANK_QR", label: "PayOS / Bank Transfer", img: vietqrImg },
  { id: "MOMO",    label: "MoMo",                  img: momoImg   },
  { id: "PAYPAL",  label: "PayPal",                 img: paypalImg },
  { id: "VISA",    label: "Visa / Credit Card",     img: visaImg,   disabled: true },
  { id: "MASTER",  label: "Mastercard",              img: masterImg, disabled: true },
];

// TÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­nh sÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ tiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Ân giÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â£m giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ tÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â« coupon.
// HÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â trÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â£ 2 loÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¡i: theo % (discount_percent) hoÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â·c sÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ tiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Ân cÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹nh (discount_amount).
const computeDiscount = (coupon, price) => {
  if (!coupon) return 0;
  if (coupon.discount_percent) return Math.round(price * coupon.discount_percent / 100);
  if (coupon.discount_amount)  return Number(coupon.discount_amount);
  return 0;
};

const Payment = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const bookingState = state || {};
  const bookingData = bookingState.bookingData || null;
  const selectedFlights = bookingState.selectedFlights || null;
  const passengers = bookingState.passengers || [];
  const contact = bookingState.contact || {};
  const totalPrice = bookingState.totalPrice || 0;
  const bookingId = bookingData?.booking_id || bookingData?.id || null;
  const bookingCode = bookingData?.booking_code || "";
  const heldUntil = normalizeHeldUntil(bookingData?.held_until, bookingData?.status);

  // Phuong thuc thanh toan dang chon (mac dinh VietQR)
  const [selectedMethod, setSelectedMethod] = useState("BANK_QR");

  // State coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponApplied, setCouponApplied] = useState(null);
  const [applyingCoupon] = useState(false);
  const [availCoupons, setAvailCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponApiError, setCouponApiError] = useState("");

  // State thanh toan
  const [paymentData, setPaymentData] = useState(null);
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState("");

  // Overlay redirect checkout
  const [momoRedirecting, setMomoRedirecting] = useState(false);
  const [payosRedirecting, setPayosRedirecting] = useState(false);
  const [paypalRedirecting, setPaypalRedirecting] = useState(false);

  // Dong ho dem nguoc ghe dang duoc giu
  const [countdown, setCountdown] = useState(null);
  const [expired, setExpired] = useState(false);

  // Trang thai QR
  const [paid, setPaid] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(false);

  // So tien cuoi cung: uu tien payment data, sau do coupon preview, cuoi la gia goc
  const finalAmount = paymentData?.payment?.final_amount ?? couponApplied?.final_amount ?? totalPrice;

  // Tai danh sach coupon co the dung ngay khi vao trang Payment.
  // Chi tai neu da dang nhap (co token).
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

  // Dem nguoc thoi gian giu ghe - cap nhat moi giay.
  useEffect(() => {
    if (!heldUntil) return;
    const iv = setInterval(() => {
      const t = formatCountdown(heldUntil);
      setCountdown(t);
      if (t === "00:00") setExpired(true);
    }, 1000);
    return () => clearInterval(iv);
  }, [heldUntil]);

  // Polling kiem tra trang thai thanh toan moi 4 giay (chi cho BANK_QR).
  useEffect(() => {
    if (!paymentData?.payment?.payment_code || paid) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await getPaymentByCode(paymentData.payment.payment_code);
        const status = res?.payment?.status?.toUpperCase();
        if (["PAID", "SUCCESS", "COMPLETED", "CONFIRMED"].includes(status) && active) {
          setPaid(true);
        }
      } catch {
        // Ignore transient polling errors and retry on the next interval.
      }
    };
    const iv = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [paymentData, paid]);

  // Guard: neu vao trang nay truc tiep khong co data -> ve trang chu
  if (!bookingData) {
    return (
      <div className={styles.empty}>
        <p>Booking information not found.</p>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  // Ap dung coupon duoc nhap tay.
  // So sanh voi danh sach availCoupons de tinh truoc discount preview.
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

  // GÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â¡ bÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â coupon ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡p dÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â¥ng
  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
    setCouponError("");
  };

  // KhÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€¦Ã‚Â¸i tÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¡o giao dÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹ch thanh toÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡n ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â gÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Âi API ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢ tÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¡o payment record.
  // VÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âºi MoMo: nhÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â­n redirect URL ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ chuyÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢n hÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âºng user sang trang MoMo.
  // VÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âºi BANK_QR: nhÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â­n thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´ng tin QR ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ hiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡n QR code ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢ user quÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©t.
  const handleInitPayment = async () => {
    if (!bookingId) { setInitError("Missing booking ID."); return; }
    setInitLoading(true);
    setInitError("");
    setQrLoading(true);
    setQrError(false);

    // HiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡n overlay ngay lÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â­p tÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â©c vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¬ API Render cold start chÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â­m
    if (selectedMethod === "MOMO")   setMomoRedirecting(true);
    if (selectedMethod === "BANK_QR") setPayosRedirecting(true);
    if (selectedMethod === "PAYPAL")  setPaypalRedirecting(true);

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
          window.location.href = payUrl;
          return;
        }
        setMomoRedirecting(false);
        setSelectedMethod("BANK_QR");
        setInitError("Could not connect to MoMo. Switched to PayOS ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â please complete your payment there.");
        return;
      }

      if (selectedMethod === "BANK_QR") {
        const instrType = res?.payment?.instruction?.type;
        if (instrType === "PAYOS_CHECKOUT") {
          const checkoutUrl = res?.payment?.instruction?.checkout_url || res?.payment?.instruction?.redirect_url;
          if (checkoutUrl) {
            window.location.href = checkoutUrl;
            return;
          }
          setPayosRedirecting(false);
          setInitError("Could not create PayOS payment link. Please try again.");
          return;
        }
        // Fallback: BANK_TRANSFER (VietQR ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â khi PayOS chÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â°a cÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¥u hÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¬nh)
        setPayosRedirecting(false);
        setPaymentData(res);
        return;
      }

      if (selectedMethod === "PAYPAL") {
        const approveUrl = res?.payment?.instruction?.approve_url || res?.payment?.instruction?.redirect_url;
        if (approveUrl) {
          window.location.href = approveUrl;
          return;
        }
        setPaypalRedirecting(false);
        setInitError("Could not create PayPal payment. Please try again.");
        return;
      }

      setPaymentData(res);
    } catch (err) {
      setMomoRedirecting(false);
      setPayosRedirecting(false);
      setPaypalRedirecting(false);
      const raw = err?.response?.data?.message || err?.response?.data?.error || err?.message || "";
      const isPendingExists = raw.toLowerCase().includes("pending payment");
      const isExpiredPayment =
        raw.toLowerCase().includes("expired") ||
        raw.toLowerCase().includes("booking not found") ||
        raw.includes("HTTP 404");
      if (isPendingExists) {
        setInitError("A payment for this booking already exists. Please use PayOS / Bank Transfer to complete it.");
        setSelectedMethod("BANK_QR");
      } else if (isExpiredPayment) {
        setInitError("This booking or payment session has expired. Please search again and create a new booking.");
      } else if (selectedMethod === "MOMO") {
        setSelectedMethod("BANK_QR");
        setInitError(raw
          ? `MoMo error: ${raw}. Switched to PayOS.`
          : "MoMo is currently unavailable. Switched to PayOS ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â please use bank transfer to complete your payment."
        );
      } else if (selectedMethod === "PAYPAL") {
        setInitError(raw
          ? `PayPal error: ${raw}. Please try again.`
          : "PayPal is currently unavailable. Please try again or use another payment method."
        );
      } else {
        setInitError(raw || "Payment initialization failed. Please try again.");
      }
    } finally {
      setInitLoading(false);
    }
  };

  // Huy thanh toan: goi API huy (neu da init) roi ve trang chu.
  // Huy thanh toan: goi API huy (neu da init) roi ve trang chu.
  const handleCancel = async () => {
    if (paymentData?.payment?.payment_code) {
      try {
        await cancelPayment(paymentData.payment.payment_code);
      } catch {
        // Ignore cleanup errors when the user leaves the payment flow.
      }
    }
    navigate("/");
  };

  // Payment success screen shown after polling detects a paid status.
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

  // TrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ch xuÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¥t thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´ng tin chuyÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢n khoÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â£n tÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â« paymentData (sau khi init BANK_QR)
  const instruction     = paymentData?.payment?.instruction || {};
  const bankName        = instruction.bank_name || "VietinBank";
  const bankAccount     = instruction.bank_account || "";
  const accountName     = instruction.account_name || "";
  const transferContent = instruction.transfer_content || paymentData?.payment?.payment_code || "";
  const paymentCode     = paymentData?.payment?.payment_code || "";
  const expiresAt       = paymentData?.payment?.expires_at || null;

  // LÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¥y URL ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â£nh QR: ÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â°u tiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âªn QR tÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â« backend, nÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¿u khÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´ng cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¬ tÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â± tÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¡o bÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â±ng VietQR.io
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

      {/* Overlay MoMo */}
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

      {/* Overlay PayOS */}
      {payosRedirecting && (
        <div className={styles.momoOverlay}>
          <div className={styles.momoOverlayCard}>
            <img src={vietqrImg} alt="PayOS" className={styles.momoOverlayLogo} />
            <div className={styles.momoOverlaySpinner} />
            <p className={styles.momoOverlayTitle}>Connecting to PayOS...</p>
            <p className={styles.momoOverlayNote}>
              Please wait, you will be redirected to the PayOS checkout page
            </p>
          </div>
        </div>
      )}

      {/* Overlay PayPal */}
      {paypalRedirecting && (
        <div className={styles.momoOverlay}>
          <div className={styles.momoOverlayCard}>
            <img src={paypalImg} alt="PayPal" className={styles.momoOverlayLogo} />
            <div className={styles.momoOverlaySpinner} />
            <p className={styles.momoOverlayTitle}>Connecting to PayPal...</p>
            <p className={styles.momoOverlayNote}>
              Please wait, you will be redirected to the PayPal checkout page
            </p>
          </div>
        </div>
      )}

      <div className={styles.wrapper}>
        <div className={styles.layout}>

          {/* Left column: order info, coupon, and payment method */}
          <div className={styles.left}>
            <h2 className={styles.pageTitle}>Payment</h2>

            {/* MÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£ ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â·t chÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â + ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œng hÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¿m ngÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â£c thÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Âi gian giÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â¯ ghÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¿ */}
            <div className={styles.bookingCodeCard}>
              <div>
                <p className={styles.codeLabel}>Booking Code</p>
                <p className={styles.codeValue}>{bookingCode}</p>
              </div>
              {heldUntil && (
                <div className={styles.heldTimer}>
                  <span className={styles.timerLabel}>ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â± Seat held for</span>
                  <span className={`${styles.timerValue} ${expired ? styles.timerExpired : ""}`}>
                    {countdown ?? formatCountdown(heldUntil) ?? "--:--"}
                  </span>
                </div>
              )}
            </div>

            {/* Banner cÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â£nh bÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡o khi ghÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¿ hÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¿t hÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¡n giÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â¯ */}
            {expired && (
              <div className={styles.expiredBanner}>
                Seat hold has expired. Please search again.
                <button className={styles.expiredBackBtn} onClick={() => navigate("/flights")}>
                  Search Again
                </button>
              </div>
            )}

            {/* Order details: flights, passengers, discounts, and totals */}
            <div className={styles.invoiceCard}>
              <h3 className={styles.invoiceTitle}>Order Details</h3>

              {selectedFlights?.outbound && (
                <div className={styles.invoiceRow}>
                  <div className={styles.invoiceLeft}>
                    <p className={styles.invoiceFlightLabel}>ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“Ãƒâ€¹Ã¢â‚¬Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Outbound</p>
                    <p className={styles.invoiceFlightName}>
                      {selectedFlights.outbound.airline?.name} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {selectedFlights.outbound.flight_number}
                    </p>
                    <p className={styles.invoiceFlightRoute}>
                      {selectedFlights.outbound.departure?.code} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ {selectedFlights.outbound.arrival?.code}
                      &nbsp;ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·&nbsp;
                      {formatTime(selectedFlights.outbound.departure?.time)} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ {formatTime(selectedFlights.outbound.arrival?.time)}
                    </p>
                  </div>
                  <p className={styles.invoicePrice}>{fmt(selectedFlights.outbound.seat?.total_price || 0)}</p>
                </div>
              )}

              {selectedFlights?.return && (
                <div className={styles.invoiceRow}>
                  <div className={styles.invoiceLeft}>
                    <p className={styles.invoiceFlightLabel}>ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â Return</p>
                    <p className={styles.invoiceFlightName}>
                      {selectedFlights.return.airline?.name} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {selectedFlights.return.flight_number}
                    </p>
                    <p className={styles.invoiceFlightRoute}>
                      {selectedFlights.return.departure?.code} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ {selectedFlights.return.arrival?.code}
                      &nbsp;ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·&nbsp;
                      {formatTime(selectedFlights.return.departure?.time)} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ {formatTime(selectedFlights.return.arrival?.time)}
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

              {/* Extra baggage if present */}
              {bookingData?.baggage?.extra_baggage_total > 0 && (
                <div className={styles.invoiceRowSmall}>
                  <span>Extra Baggage</span>
                  <span>{fmt(bookingData.baggage.extra_baggage_total)}</span>
                </div>
              )}

              {/* HiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢n thÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹ dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â²ng giÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â£m giÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ nÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¿u ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡p dÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â¥ng coupon */}
              {couponApplied && (
                <div className={`${styles.invoiceRowSmall} ${styles.discountRow}`}>
                  <span>ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â½Ãƒâ€¦Ã‚Â¸ Discount ({couponApplied.code})</span>
                  <span>
                    {paymentData?.payment?.discount_amount > 0
                      ? `ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ ${fmt(paymentData.payment.discount_amount)}`
                      : couponApplied.discount_amount > 0
                        ? `ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ ${fmt(couponApplied.discount_amount)}`
                        : "Applied at checkout"}
                  </span>
                </div>
              )}

              <div className={styles.invoiceTotal}>
                <span>Total</span>
                <span className={styles.invoiceTotalPrice}>{fmt(finalAmount)}</span>
              </div>
            </div>

            {/* Section coupon ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â chÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â° hiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡n TRÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€¦Ã‚Â¡C khi init payment (sau ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ khÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´ng cho sÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â­a nÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â¯a) */}
            {!paymentData && (
              <div className={styles.couponCard}>
                <div className={styles.couponCardHeader}>
                  <h3 className={styles.couponTitle}>ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â½Ãƒâ€¦Ã‚Â¸ Promo Code</h3>
                  {couponsLoading && (
                    <span className={styles.couponsLoadingText}>Loading...</span>
                  )}
                </div>

                {couponApiError && (
                  <p className={styles.couponApiError}>{couponApiError}</p>
                )}

                {/* Danh sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ch coupon cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ sÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Âµn ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢ user click Apply nhanh */}
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

                {/* NÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¿u ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡p dÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â¥ng coupon ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ hiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡n trÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¡ng thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡i + nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºt Remove */}
                {couponApplied ? (
                  <div className={styles.couponApplied}>
                    <div className={styles.couponAppliedInfo}>
                      <span className={styles.couponTag}>ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ {couponApplied.code}</span>
                      <span className={styles.couponDiscount}>Applied</span>
                    </div>
                    <button className={styles.couponRemoveBtn} onClick={handleRemoveCoupon}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Input nhÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â­p mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£ coupon thÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â§ cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´ng */}
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

            {/* ChÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Ân phÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â¡ng thÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â©c thanh toÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡n ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â chÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â° hiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡n trÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âºc khi init */}
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

                {/* Ghi chÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âº ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â·c biÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡t khi chÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Ân MoMo trÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âªn PC */}
                {selectedMethod === "MOMO" && (
                  <div className={styles.momoMethodNote}>
                    <span>ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â±</span>
                    <span>
                      You will be redirected to MoMo. On desktop, scan the QR or log in to your MoMo account.
                      The <em>"Failed to launch intent"</em> error on PC is normal ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â select <strong>Pay with MoMo Wallet</strong> on the MoMo page.
                    </span>
                  </div>
                )}
                {selectedMethod === "PAYPAL" && (
                  <div className={styles.momoMethodNote}>
                    <span>ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Â³</span>
                    <span>
                      You will be redirected to PayPal. Log in to your PayPal account or pay as guest with a card.
                      After payment, you will be redirected back to confirm your booking.
                    </span>
                  </div>
                )}
              </div>
            )}

            {initError && <div className={styles.errorBanner}>{initError}</div>}

            {/* Action buttons:
                Before init: Back and Pay [amount]
                After init: Cancel and New Transaction */}
            {!paymentData ? (
              <div className={styles.actionRow}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>Back</button>
                <button
                  className={styles.payBtn}
                  onClick={handleInitPayment}
                  disabled={initLoading || expired}
                >
                  {initLoading
                    ? <span className={styles.spinner}>ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â³ Processing...</span>
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

          {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ CÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€¹Ã…â€œT PHÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¢I: QR code / preview phÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â¡ng thÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â©c thanh toÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡n ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
          <div className={styles.right}>
            {paymentData ? (
              <>
                {/* Panel QR chuyÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢n khoÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â£n BANK_QR */}
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

                  {/* HiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡n ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â£nh QR hoÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â·c thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´ng bÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡o khÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´ng cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ QR */}
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
                        onError={() => { setQrLoading(false); setQrError(true); }} // QR lÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âi ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ hiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡n thÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´ng tin thÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â§ cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´ng
                      />
                    </div>
                  ) : (
                    <div className={styles.qrUnavailable}>
                      <span className={styles.qrUnavailableIcon}>ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â¦</span>
                      <p className={styles.qrUnavailableText}>QR unavailable</p>
                      <p className={styles.qrUnavailableSub}>Please transfer manually using the bank details below</p>
                    </div>
                  )}

                  {/* ThÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´ng tin chuyÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢n khoÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â£n thÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â§ cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´ng */}
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
                      {/* NÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢i dung chuyÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢n khoÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â£n phÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â£i CHÃƒÆ’Ã†â€™Ãƒâ€šÃ‚ÂNH XÃƒÆ’Ã†â€™Ãƒâ€šÃ‚ÂC ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢ hÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ thÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ng tÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â± xÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡c nhÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â­n */}
                      <span className={`${styles.bankValue} ${styles.bankContent}`}>{transferContent}</span>
                    </div>
                  </div>

                  <div className={styles.qrNote}>
                    <p>Open your banking app and scan the QR or transfer manually</p>
                    <p className={styles.qrNoteImportant}>
                      Use the exact reference for auto confirmation
                    </p>
                  </div>

                  {/* Indicator cho biÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â¿t ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ang polling kiÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€ Ã¢â‚¬â„¢m tra thanh toÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡n */}
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
              /* TrÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â°ÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âºc khi init: preview phÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â Ãƒâ€šÃ‚Â¡ng thÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Â©c ÃƒÆ’Ã¢â‚¬Å¾ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ang chÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚Â»Ãƒâ€šÃ‚Ân */
              <div className={styles.qrCard}>
                <div className={styles.qrHeader}>
                  {selectedMethod === "MOMO"   && <img src={momoImg}   alt="MoMo"   className={styles.momoLogoPreview} />}
                  {selectedMethod === "PAYPAL" && <img src={paypalImg} alt="PayPal" className={styles.momoLogoPreview} />}
                  {selectedMethod === "BANK_QR" && <img src={vietqrImg} alt="PayOS"  className={styles.vietqrLogo} />}
                </div>
                <div className={styles.qrPreview}>
                  <div className={styles.qrPreviewIcon}>
                    {selectedMethod === "MOMO" ? "ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â²" : selectedMethod === "PAYPAL" ? "ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Â³" : "ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â±"}
                  </div>
                  <p>
                    {selectedMethod === "MOMO"
                      ? "You will be redirected to MoMo to complete payment"
                      : selectedMethod === "PAYPAL"
                        ? "You will be redirected to PayPal to complete payment"
                        : "You will be redirected to PayOS checkout to complete payment"
                    }
                  </p>
                  <p className={styles.qrPreviewSub}>
                    {selectedMethod === "MOMO"
                      ? "After payment, MoMo will display the transaction result"
                      : selectedMethod === "PAYPAL"
                        ? "After payment, PayPal will redirect you back to confirm"
                        : "Supports all Vietnamese banks via QR transfer"
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
