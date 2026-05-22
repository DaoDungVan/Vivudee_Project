import API from "./axiosInstance";

export const getAncillaryOptions = () => API.get("/ancillaries");
