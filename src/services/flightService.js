import axios from "axios";

const API = "https://backend-log-function-2.onrender.com/api/flights";

export const searchFlights = (params) => {
  return axios.get(`${API}/search`, {
    params: {
      departure_code: params.from,
      arrival_code: params.to,
      departure_date: params.departureDate,

      return_date: params.returnDate || undefined, // 🔥 chỉ gửi khi có

      adults: params.adults || 1,
      children: params.children || 0,
      infants: 0, // tạm thời

      seat_class: params.seatClass?.toLowerCase() || "economy", // 🔥 FIX
    },
  });
};