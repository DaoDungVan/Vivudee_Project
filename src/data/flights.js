import vietnam from "../assets/images/airlines/vietnam.png";
import vietjet from "../assets/images/airlines/vietjet.png";
import bamboo from "../assets/images/airlines/bamboo.png";

// NOTE: fake data chuyến bay
const flights = [
  {
    id: 1,
    airline: "Vietnam Airlines",
    logo: vietnam,
    departure: "08:00",
    arrival: "10:00",
    duration: "2h",
    price: 1200000,
  },
  {
    id: 2,
    airline: "VietJet Air",
    logo: vietjet,
    departure: "09:00",
    arrival: "11:30",
    duration: "2h 30m",
    price: 900000,
  },
  {
    id: 3,
    airline: "Bamboo Airways",
    logo: bamboo,
    departure: "13:00",
    arrival: "15:00",
    duration: "2h",
    price: 1100000,
  },
];

export default flights;