import { useLocation, useNavigate } from "react-router-dom";
import SeatMap from "../../components/booking/SeatMap/SeatMap";
import { createBooking } from "../../services/bookingService";
import { useState } from "react";
import NavBar from "../../components/common/NavBar/Navbar";

export default function SeatMapPage() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  if (!state?.bookingPayload) {
    navigate("/flights");
    return null;
  }

  const { bookingPayload, selectedFlights, paxList, contact, totalPrice, adultCount } = state;

  const handleConfirm = async (seats) => {
    setLoading(true);
    setError("");
    try {
      // Gán seat_number vào từng passenger
      const passengerRecords = bookingPayload.passengers.map((p, i) => {
        const paxIdx = i < adultCount ? i : i - adultCount;
        const realIdx = i % (bookingPayload.passengers.length / (bookingPayload.return_flight_id ? 2 : 1)) | 0;
        return { ...p, seat_number: seats[realIdx] || null };
      });

      const res = await createBooking({ ...bookingPayload, passengers: passengerRecords });
      const bookingData = res.data?.data;
      navigate("/payment", { state: { bookingData, selectedFlights, passengers: paxList, contact, totalPrice } });
    } catch (err) {
      setError(err.response?.data?.error || "Đặt chỗ thất bại");
      setLoading(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <NavBar />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <SeatMap
          flightId={selectedFlights?.outbound?.flight_id}
          seatClass={selectedFlights?.outbound?.seat?.class || "economy"}
          passengers={paxList.map((p, i) => ({ id: i, fullName: p.fullName || `Hành khách ${i+1}` }))}
          onConfirm={handleConfirm}
          onBack={() => navigate(-1)}
        />
      </div>
      {error && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 16px", fontSize: 13 }}>
          {error}
        </div>
      )}
      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "var(--card-bg)", borderRadius: 12, padding: "24px 32px", textAlign: "center" }}>
            <div style={{ width: 32, height: 32, border: "3px solid var(--divider)", borderTopColor: "var(--primary-color)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>Đang đặt chỗ...</p>
          </div>
        </div>
      )}
    </div>
  );
}
