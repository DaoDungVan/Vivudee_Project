import API from "./axiosInstance";

export const getMembership  = ()            => API.get("/loyalty/membership");
export const getRewards     = ()            => API.get("/loyalty/rewards");
export const getLoyaltyHistory = (page = 1, limit = 10) =>
  API.get("/loyalty/history", { params: { page, limit } });
export const redeemReward   = (rewardId)    => API.post("/loyalty/redeem", { rewardId });
