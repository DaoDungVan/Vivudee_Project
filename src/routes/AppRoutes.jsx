import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import ChatWidget from "../components/chat/ChatWidget";

const HIDE_CHAT = ["/auth/callback", "/auth/", "/payment/momo", "/payment/payos", "/payment/paypal", "/booking"];

function ChatWidgetConditional() {
  const { pathname } = useLocation();
  return HIDE_CHAT.some(p => pathname.startsWith(p)) ? null : <ChatWidget />;
}
import Home from "../pages/home/Home";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import AuthCallback from "../pages/auth/AuthCallback";
import ResetPassword from "../pages/auth/ResetPassword";
import FlightSearch from "../pages/flights/FlightSearch";
import Booking from "../pages/booking/Booking";
import Payment from "../pages/payment/Payment";
import Bookings from "../pages/bookings/Bookings";
import Profile from "../pages/profile/Profile";
import Transactions from "../pages/transactions/Transactions";
import Coupons from "../pages/coupons/Coupons";
import Tours from "../pages/tours/Tours";
import Contact from "../pages/contact/Contact";
import Chat from "../pages/chat/Chat";
import PaymentMomoResult from "../pages/payment/PaymentMomoResult";
import PaymentPayosResult from "../pages/payment/PaymentPayosResult";
import PaymentPaypalResult from "../pages/payment/PaymentPaypalResult";
import FlightTracker from "../pages/flightTracker/FlightTracker";
import Refunds from "../pages/refunds/Refunds";
import Wishlist from "../pages/wishlist/Wishlist";
import SeatMapPage from "../pages/seatmap/SeatMapPage";

// Định nghĩa tất cả các đường dẫn (URL) của app và component tương ứng.
// Khi user truy cập URL nào → React render component đó.
function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/flights" element={<FlightSearch />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/payment/momo/result" element={<PaymentMomoResult />} />
        <Route path="/payment/payos/result" element={<PaymentPayosResult />} />
        <Route path="/payment/paypal/result" element={<PaymentPaypalResult />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/my-booking" element={<Bookings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/tours" element={<Tours />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/tracker/:flightId" element={<FlightTracker />} />
        <Route path="/refunds" element={<Refunds />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/seat-map" element={<SeatMapPage />} />
      </Routes>
      <ChatWidgetConditional />
    </BrowserRouter>
  );
}

export default AppRoutes;
