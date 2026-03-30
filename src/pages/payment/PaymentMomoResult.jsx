import { useSearchParams, useNavigate } from "react-router-dom";
import NavBar  from "../../components/common/NavBar/Navbar";
import Footer  from "../../components/common/Footer/Footer";
import styles  from "./Payment.module.css";


const PaymentMomoResult = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const status      = searchParams.get("status");       // "success" | "cancel" | "error"
  const resultCode  = searchParams.get("resultCode");
  const bookingCode = searchParams.get("bookingCode");
  const orderId     = searchParams.get("orderId");
  const message     = searchParams.get("message");

  const isSuccess = status === "success" || resultCode === "0";

  // ── Success — giống hệt màn hình paid của VietQR ─────────────────────────
  if (isSuccess) {
    return (
      <>
        <NavBar />
        <div className={styles.successWrapper}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <circle cx="36" cy="36" r="36" fill="#22c55e" opacity="0.12" />
                <circle cx="36" cy="36" r="26" fill="#22c55e" />
                <path
                  d="M24 36l8 8 16-16"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2>Payment Successful!</h2>
            <p>Your MoMo payment has been confirmed.</p>

            <div className={styles.successCode}>
              {bookingCode || orderId}
            </div>

            <p className={styles.successNote}>
              Your e-ticket will be sent to your registered email.
            </p>

            <div className={styles.successBtns}>
              {bookingCode ? (
                <button
                  className={styles.btnPrimary}
                  onClick={() => navigate(`/bookings?code=${bookingCode}`)}
                >
                  View Booking
                </button>
              ) : (
                <button
                  className={styles.btnPrimary}
                  onClick={() => navigate("/bookings")}
                >
                  My Bookings
                </button>
              )}
              <button
                className={styles.btnSecondary}
                onClick={() => navigate("/")}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ── Cancel / Error — đơn giản, có nút thử lại ────────────────────────────
  const isCancelled = status === "cancel" || resultCode === "1006";

  return (
    <>
      <NavBar />
      <div className={styles.successWrapper}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <circle
                cx="36" cy="36" r="36"
                fill={isCancelled ? "#f59e0b" : "#ef4444"}
                opacity="0.12"
              />
              <circle
                cx="36" cy="36" r="26"
                fill={isCancelled ? "#f59e0b" : "#ef4444"}
              />
              {isCancelled ? (
                <path
                  d="M36 24v14M36 42v4"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M27 27l18 18M45 27L27 45"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </div>

          <h2>{isCancelled ? "Payment Cancelled" : "Payment Failed"}</h2>
          <p>
            {isCancelled
              ? "You cancelled the MoMo payment. Your booking is still held — you can try again."
              : (message ? decodeURIComponent(message) : "Something went wrong. Please try again.")}
          </p>

          <div className={styles.successBtns}>
            <button
              className={styles.btnPrimary}
              onClick={() => navigate(-2)} // quay về trang /payment
            >
              Try Again
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => navigate("/")}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PaymentMomoResult;