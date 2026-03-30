import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../pages/home/Home";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import AuthCallback from "../pages/auth/AuthCallback";
import FlightSearch from "../pages/flights/FlightSearch";
import Booking from "../pages/booking/Booking";
import Payment from "../pages/payment/Payment";
import Bookings from "../pages/bookings/Bookings";
import Profile from "../pages/profile/Profile";
import Transactions from "../pages/transactions/Transactions";
import Coupons from "../pages/coupons/Coupons";
import Tours from "../pages/tours/Tours";
import Contact from "../pages/contact/Contact";
import PaymentMomoResult from "../pages/payment/PaymentMomoResult";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/flights" element={<FlightSearch />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/payment/momo/result" element={<PaymentMomoResult />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/my-booking" element={<Bookings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/tours" element={<Tours />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
