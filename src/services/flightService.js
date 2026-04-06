import axios from "axios";

const API = "https://backend-log-function-2.onrender.com/api/flights";

// Tìm kiếm chuyến bay theo điều kiện người dùng nhập.
// params gồm: from, to, departureDate, returnDate, adults, children, seatClass, tripType
export const searchFlights = (params) => {
  // Các tham số mặc định nếu user không truyền vào
  const baseParams = {
    adults: params.adults || 1,
    children: params.children || 0,
    infants: 0,
    seat_class: params.seatClass || "Economy",
  };

  // Request chiều đi: từ `from` → `to` vào ngày `departureDate`
  const outboundRequest = axios.get(`${API}/search`, {
    params: {
      ...baseParams,
      departure_code: params.from,
      arrival_code: params.to,
      departure_date: params.departureDate,
    },
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
    });

    // Gọi cả hai request cùng lúc (song song), trả về mảng [outbound, return]
    return Promise.all([outboundRequest, returnRequest]);
  }

  // Nếu là một chiều thì chỉ trả về request duy nhất
  return outboundRequest;
};
