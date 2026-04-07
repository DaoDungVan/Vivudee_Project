import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { getPaymentByCode } from "../../services/paymentService";
import styles from "./Payment.module.css";

const PAID_STATUSES = ["PAID", "SUCCESS", "COMPLETED", "CONFIRMED"];
const CANCELLED_STATUSES = ["CANCELLED", "FAILED", "VOID", "EXPIRED"];

const PaymentPayosResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialStatus = searchParams.get("status") || "pending";
  const paymentCode = searchParams.get("paymentCode");
  const bookingCode = searchParams.get("bookingCode");
  const orderCode = searchParams.get("orderCode");
  const message = searchParams.get("message");

  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [currentMessage, setCurrentMessage] = useState(message || "");

  useEffect(() => {
    if (!paymentCode || currentStatus === "success" || currentStatus === "cancel") return;

    let active = true;
    let attempts = 0;

    const pollPayment = async () => {
      try {
        const res = await getPaymentByCode(paymentCode);
        const status = String(res?.payment?.status || "").toUpperCase();

        if (!active) return;
        if (PAID_STATUSES.includes(status)) {
          setCurrentStatus("success");
          setCurrentMessage("Success");
        } else if (CANCELLED_STATUSES.includes(status)) {
          setCurrentStatus(status === "CANCELLED" ? "cancel" : "error");
          setCurrentMessage(`Payment status: ${status}`);
        }
      } catch (error) {
        if (active) {
          setCurrentMessage(error?.response?.data?.message || error?.message || "Waiting for payment confirmation");
        }
      }
    };

    pollPayment();
    const intervalId = window.setInterval(() => {
      attempts += 1;
      if (attempts >= 10) {
        window.clearInterval(intervalId);
        return;
      }
      pollPayment();
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [paymentCode, currentStatus]);

  const isSuccess = currentStatus === "success";
  const isCancelled = currentStatus === "cancel";
  const isPending = currentStatus === "pending";

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
            <p>Your PayOS payment has been confirmed.</p>

            <div className={styles.successCode}>
              {bookingCode || paymentCode || orderCode}
            </div>

            <p className={styles.successNote}>
              Your e-ticket will be sent to your registered email.
            </p>

            <div className={styles.successBtns}>
              <button
                className={styles.btnPrimary}
                onClick={() => navigate(bookingCode ? `/bookings?code=${bookingCode}` : "/bookings")}
              >
                {bookingCode ? "View Booking" : "My Bookings"}
              </button>
              <button className={styles.btnSecondary} onClick={() => navigate("/")}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className={styles.successWrapper}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <circle
                cx="36" cy="36" r="36"
                fill={isPending ? "#f59e0b" : isCancelled ? "#f59e0b" : "#ef4444"}
                opacity="0.12"
              />
              <circle
                cx="36" cy="36" r="26"
                fill={isPending ? "#f59e0b" : isCancelled ? "#f59e0b" : "#ef4444"}
              />
              {isPending || isCancelled ? (
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

          <h2>{isPending ? "Payment Pending" : isCancelled ? "Payment Cancelled" : "Payment Failed"}</h2>
          <p>
            {isPending
              ? "We are waiting for PayOS to confirm your payment."
              : isCancelled
                ? "You cancelled the PayOS payment. Your booking is still held if it has not expired."
                : currentMessage || "Something went wrong with your PayOS payment. Please try again."}
          </p>

          <div className={styles.successBtns}>
            <button className={styles.btnPrimary} onClick={() => navigate("/bookings")}>
              My Bookings
            </button>
            <button className={styles.btnSecondary} onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PaymentPayosResult;
