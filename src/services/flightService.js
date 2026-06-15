import axios from "axios";
import axiosInstance from "./axiosInstance";
import { getGuestSessionId } from "./chatSession";

const API = "https://backend-log-function-2.onrender.com/api/flights";

// Ngôn ngữ hiện tại của site, để backend trả về season/price-alert text đúng locale
const getLang = () => localStorage.getItem("lang") || "en";

// Header định danh guest session — backend dùng để lưu/đọc search history
// và cá nhân hoá recommendations cho cả user chưa đăng nhập.
// Nếu user đã đăng nhập, gắn thêm Authorization để backend nhận được req.user.id
// → mới dùng được lịch sử booking (preferredRoutes/preferredHours...) khi gợi ý.
const sessionHeaders = () => {
  const headers = { "x-session-id": getGuestSessionId() };
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// Chuẩn hoá 1 flight về cùng 1 shape dù lấy từ /recommendations (id, departure_time
// ở top-level) hay /browse, /search (flight_id, departure.time, arrival.time)
export const normalizeFlight = (f) => ({
  ...f,
  flight_id: f.flight_id ?? f.id,
  departure: { ...f.departure, time: f.departure?.time ?? f.departure_time },
  arrival:   { ...f.arrival,   time: f.arrival?.time   ?? f.arrival_time },
});

// Tìm kiếm chuyến bay theo điều kiện người dùng nhập.
// params gồm: from, to, departureDate, returnDate, adults, children, seatClass, tripType
export const searchFlights = (params) => {
  // Các tham số mặc định nếu user không truyền vào
  const baseParams = {
    adults: params.adults || 1,
    children: params.children || 0,
    infants: 0,
    seat_class: params.seatClass || "Economy",
    lang: getLang(),
  };

  // Request chiều đi: từ `from` → `to` vào ngày `departureDate`
  const outboundRequest = axios.get(`${API}/search`, {
    params: {
      ...baseParams,
      departure_code: params.from,
      arrival_code: params.to,
      departure_date: params.departureDate,
    },
    headers: sessionHeaders(),
  });

  // Kiểm tra xem có phải vé khứ hồi không
  const isRoundTrip =
    params.tripType === "roundtrip" || params.tripType === "round-trip";

  if (isRoundTrip && params.returnDate) {
    // Request chiều về: đảo ngược from/to và dùng ngày returnDate
    // Ví dụ: HAN → SGN đi, SGN → HAN về
    const returnRequest = axios.get(`${API}/search`, {
      params: {
        ...baseParams,
        departure_code: params.to,   // đảo chiều
        arrival_code: params.from,   // đảo chiều
        departure_date: params.returnDate,
      },
      headers: sessionHeaders(),
    });

    // Gọi cả hai request cùng lúc (song song), trả về mảng [outbound, return]
    return Promise.all([outboundRequest, returnRequest]);
  }

  // Nếu là một chiều thì chỉ trả về request duy nhất
  return outboundRequest;
};

export const getFlightPosition   = (flightId)                     => axiosInstance.get(`/flights/${flightId}/position`);
export const getRecommendations  = (from, to, limit = 6)           => axios.get(`${API}/recommendations`, { params: { from, to, limit, lang: getLang() }, headers: sessionHeaders() });
// Gợi ý kết hợp hãng tối ưu cho khứ hồi (vd: bay đi 1 hãng, bay về hãng khác để tiết kiệm)
export const getBrandCombinations = (params) => axios.get(`${API}/brand-combinations`, { params });
export const getBrowseFlights    = (limit = 40)                     => axios.get(`${API}/browse`, { params: { limit, lang: getLang() } });
export const getAirlineFlights   = (airlineCode, seatClass = 'economy') => axios.get(`${API}/by-airline/${airlineCode}`, { params: { seat_class: seatClass, lang: getLang() } });
export const getMixedFlights     = (params) => axios.get(`${API}/mixed-search`, { params: { ...params, lang: getLang() } });
export const getAlternatives     = (flight_id, seat_class = "economy", adults = 1) =>
  axios.get(`${API}/alternatives`, { params: { flight_id, seat_class, adults, lang: getLang() } });
export const getPriceCalendar    = (from, to, month, seat_class = "economy", adults = 1) =>
  axios.get(`${API}/price-calendar`, { params: { from, to, month, seat_class, adults } });
export const getSeatMap          = (flightId, seat_class = "economy") =>
  axios.get(`${API}/${flightId}/seat-map`, { params: { seat_class } });

export const getSeatPricing      = (flightId, seat_class = "economy") =>
  axios.get(`${API}/${flightId}/seats/pricing`, { params: { seat_class } });

// Phân tích giá chi tiết (mùa cao điểm, hệ số ngày trong tuần/đặt sớm/nhu cầu, khuyến nghị)
export const getFlightPriceAnalysis = (flightId) =>
  axios.get(`${API}/${flightId}/price-analysis`, { params: { lang: getLang() } });
