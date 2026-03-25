import axios from "axios";

const API = "https://backend-log-function-2.onrender.com/api/flights";

export const searchFlights = (params) => {
  const baseParams = {
    adults: params.adults || 1,
    children: params.children || 0,
    infants: 0,
    seat_class: params.seatClass || "Economy",
  };

  const outboundRequest = axios.get(`${API}/search`, {
    params: {
      ...baseParams,
      departure_code: params.from,
      arrival_code: params.to,
      departure_date: params.departureDate,
    },
  });

  // Nếu round-trip thì gọi thêm request ngược chiều
  const isRoundTrip =
    params.tripType === "roundtrip" || params.tripType === "round-trip";

  if (isRoundTrip && params.returnDate) {
    const returnRequest = axios.get(`${API}/search`, {
      params: {
        ...baseParams,
        departure_code: params.to, // ✅ đảo chiều
        arrival_code: params.from, // ✅ đảo chiều
        departure_date: params.returnDate,
      },
    });

    return Promise.all([outboundRequest, returnRequest]);
  }

  return outboundRequest;
};
