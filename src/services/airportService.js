import axios from "axios";

const API = "https://backend-log-function-2.onrender.com/api/flights/airports";

export const getAirports = () => {
  return axios.get(API);
};