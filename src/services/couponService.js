import API from "./axiosInstance";

const featuredCouponsFallback = [
  {
    code: "WELCOME30K",
    description: "Valid for new users only",
    discount_percent: 30,
  },
  {
    code: "WELCOME40K",
    description: "Selected domestic flights",
    discount_percent: 40,
  },
  {
    code: "WELCOME50K",
    description: "Weekend booking promotion",
    discount_percent: 50,
  },
];

const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value || 0));

const extractCouponList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.coupons)) return payload.coupons;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export const normalizeCoupon = (coupon = {}) => {
  const percent =
    coupon.discount_percent ??
    (coupon.discount_type === "percent" ? coupon.discount_value : null);

  const amount =
    coupon.discount_amount ??
    (coupon.discount_type === "amount" ? coupon.discount_value : null);

  const discountLabel = percent
    ? `${percent}% OFF`
    : amount
      ? `${formatMoney(amount)} VND OFF`
      : coupon.discount || "Special offer";

  return {
    ...coupon,
    id: coupon.id || coupon.code || coupon.voucher_code,
    code: coupon.code || coupon.voucher_code || "",
    description: coupon.description || coupon.name || "Flight booking promotion",
    discount_percent: percent ?? null,
    discount_amount: amount ?? null,
    discount: discountLabel,
  };
};

const mapCoupons = (payload) => extractCouponList(payload).map(normalizeCoupon);

const isMissingCouponEndpoint = (error) => {
  const responseText =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "";

  return (
    error?.response?.status === 404 ||
    /Cannot\s+(GET|POST)/i.test(String(responseText))
  );
};


export const getCouponErrorMessage = (error, fallbackMessage) => {
  if (isMissingCouponEndpoint(error)) {
    return "Coupon API is not available on the backend yet.";
  }

  if (error?.response?.status === 401) {
    return "Please log in to view available coupons.";
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    fallbackMessage
  );
};

export const getHomeCoupons = async () => {
  try {
    const res = await API.get("/coupons");
    const coupons = mapCoupons(res.data);
    return coupons.length > 0
      ? coupons
      : featuredCouponsFallback.map(normalizeCoupon);
  } catch {
    return featuredCouponsFallback.map(normalizeCoupon);
  }
};

export const getAvailableCoupons = async () => {
  try {
    const res = await API.get("/coupons/available");
    const list = mapCoupons(res.data);
    if (list.length > 0) return list;
    // fallback if available endpoint returns empty
    const fallback = await API.get("/coupons");
    return mapCoupons(fallback.data);
  } catch (err) {
    if (isMissingCouponEndpoint(err)) {
      const fallback = await API.get("/coupons");
      return mapCoupons(fallback.data);
    }
    throw err;
  }
};

export const validateCoupon = async (code) => {
  const res = await API.post("/coupons/validate", {
    code: code.trim().toUpperCase(),
  });

  const coupon = res.data?.coupon || res.data?.data || res.data;
  return normalizeCoupon(coupon);
};
