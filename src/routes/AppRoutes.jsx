import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import PaymentMomoResult  from "../pages/payment/PaymentMomoResult";
import PaymentPayosResult from "../pages/payment/PaymentPayosResult";
import PaymentPaypalResult from "../pages/payment/PaymentPaypalResult";

// Định nghĩa tất cả các đường dẫn (URL) của app và component tương ứng.
// Khi user truy cập URL nào → React render component đó.
function AppRoutes() {
  return (
    // BrowserRouter: bật tính năng điều hướng bằng URL (dùng history API của trình duyệt)
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />                              {/* Trang chủ */}
        <Route path="/login" element={<Login />} />                        {/* Đăng nhập */}
        <Route path="/register" element={<Register />} />                  {/* Đăng ký */}
        <Route path="/auth/callback" element={<AuthCallback />} />         {/* Callback sau OAuth Google/Facebook */}
        <Route path="/reset-password" element={<ResetPassword />} />       {/* Đặt lại mật khẩu */}
        <Route path="/flights" element={<FlightSearch />} />               {/* Kết quả tìm kiếm chuyến bay */}
        <Route path="/booking" element={<Booking />} />                    {/* Điền thông tin hành khách */}
        <Route path="/payment" element={<Payment />} />                    {/* Thanh toán */}
        <Route path="/payment/momo/result"   element={<PaymentMomoResult />} />   {/* Kết quả sau khi thanh toán MoMo */}
        <Route path="/payment/payos/result"  element={<PaymentPayosResult />} />  {/* Kết quả sau khi thanh toán PayOS */}
        <Route path="/payment/paypal/result" element={<PaymentPaypalResult />} /> {/* Kết quả sau khi thanh toán PayPal */}
        <Route path="/bookings" element={<Bookings />} />                  {/* Danh sách booking của tôi */}
        <Route path="/my-booking" element={<Bookings />} />                {/* Alias của /bookings */}
        <Route path="/profile" element={<Profile />} />                    {/* Thông tin cá nhân */}
        <Route path="/transactions" element={<Transactions />} />          {/* Lịch sử giao dịch */}
        <Route path="/coupons" element={<Coupons />} />                    {/* Danh sách mã giảm giá */}
        <Route path="/tours" element={<Tours />} />                        {/* Tours (tính năng tương lai) */}
        <Route path="/contact" element={<Contact />} />                    {/* Liên hệ */}
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
