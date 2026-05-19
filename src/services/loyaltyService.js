import API from "./axiosInstance";

export const getMembership  = (lang = "vi") => API.get("/loyalty/membership", { params: { lang } });
export const getRewards     = ()            => API.get("/loyalty/rewards");
// Backend dùng page 0-based nên truyền page - 1
export const getLoyaltyHistory = (page = 1, limit = 10) =>
  API.get("/loyalty/history", { params: { page: page - 1, limit } });
export const redeemReward   = (rewardId)    => API.post("/loyalty/redeem", { rewardId });
