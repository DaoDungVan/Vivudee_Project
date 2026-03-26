import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../pages/home/Home";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import FlightSearch from "../pages/flights/FlightSearch";
import Booking from "../pages/booking/Booking";
import Payment from "../pages/payment/Payment";
import Bookings from "../pages/bookings/Bookings";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>}/>
        <Route path="/flights" element={<FlightSearch />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/payment"   element={<Payment />} />
        <Route path="/bookings"  element={<Bookings />} />
        <Route path="/my-booking" element={<Bookings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;