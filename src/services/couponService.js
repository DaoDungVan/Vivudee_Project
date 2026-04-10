import API from "./axiosInstance";

// Dữ liệu mẫu dùng làm fallback khi API coupon chưa có hoặc bị lỗi.
// Tại sao cần fallback? Vì backend có thể chưa triển khai endpoint coupon,
// nhưng trang Home vẫn cần hiển thị được section khuyến mãi.
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

const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const firstFiniteNumber = (...values) => {
  for (const value of values) {
    const number = toFiniteNumber(value);
    if (number !== null) {
      return number;
    }
  }

  return null;
};

// Format số tiền theo định dạng Việt Nam. Ví dụ: 50000 → "50.000"
const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN").format(toFiniteNumber(value) ?? 0);

// Backend có thể trả về coupon trong nhiều cấu trúc khác nhau:
// [array], { coupons: [] }, { data: [] }, { items: [] }
// Hàm này đồng nhất tất cả về dạng mảng đơn giản.
const extractCouponList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.coupons)) return payload.coupons;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

// Chuẩn hóa một coupon về định dạng thống nhất cho toàn app.
// Tại sao cần? Vì backend có thể gửi "discount_percent" hoặc "discount_value" tuỳ endpoint.
// Hàm này đảm bảo component luôn nhận được cùng một cấu trúc.
export const normalizeCoupon = (coupon = {}) => {
  const type = String(coupon.discount_type || coupon.type || "").toLowerCase();
  const value = toFiniteNumber(coupon.discount_value ?? coupon.value);

  // Lấy % giảm giá: ưu tiên discount_percent, nếu không có thì kiểm tra discount_type
  const percent = firstFiniteNumber(
    coupon.discount_percent,
    type === "percent" ? value : null
  );

  // Lấy số tiền giảm cố định
  const amount = firstFiniteNumber(
    coupon.discount_amount,
    type === "amount" || type === "fixed" ? value : null
  );

  // Tạo nhãn hiển thị: "30% OFF" hoặc "50.000 VND OFF"
  const discountLabel = percent !== null
    ? `${percent}% OFF`
    : amount !== null
      ? `${formatMoney(amount)} VND OFF`
      : coupon.discount || "Special offer";

  return {
    ...coupon,
    id: coupon.id || coupon.code || coupon.voucher_code,
    code: coupon.code || coupon.voucher_code || "",
    description: coupon.description || coupon.name || "Flight booking promotion",
    discount_type: type || coupon.discount_type || coupon.type || "",
    discount_percent: percent ?? null,
    discount_amount: amount ?? null,
    discount_value: value ?? null,
    min_order_amount: firstFiniteNumber(coupon.min_order_amount, coupon.min_order),
    expires_at: coupon.expires_at || coupon.expiry_at || null,
    discount: discountLabel,
  };
};

// Lấy danh sách coupon từ payload rồi chuẩn hóa toàn bộ
const mapCoupons = (payload) => extractCouponList(payload).map(normalizeCoupon);

// Kiểm tra xem lỗi có phải do endpoint coupon chưa tồn tại trên backend không.
// Ví dụ: backend trả về 404 hoặc "Cannot GET /coupons"
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

// Trả về thông báo lỗi phù hợp để hiển thị cho user.
// Ưu tiên theo thứ tự: endpoint chưa có → chưa login → lỗi từ backend → fallback message
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

// Lấy coupon để hiển thị ở trang Home (section khuyến mãi).
// Nếu API lỗi hoặc trả về rỗng → dùng danh sách fallback hardcode.
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

// Lấy danh sách coupon user có thể dùng (trang Payment).
// Thử /coupons/available trước; nếu rỗng hoặc lỗi → thử /coupons.
// Hai endpoint vì một số backend chỉ có /coupons, không có /coupons/available.
export const getAvailableCoupons = async () => {
  try {
    const res = await API.get("/coupons/available");
    const list = mapCoupons(res.data);
    if (list.length > 0) return list;
    // /coupons/available trả về rỗng → fallback sang /coupons
    const fallback = await API.get("/coupons");
    return mapCoupons(fallback.data);
  } catch {
    // /coupons/available chưa có hoặc lỗi → thử /coupons
    const fallback = await API.get("/coupons");
    return mapCoupons(fallback.data);
  }
};

// Kiểm tra mã coupon user nhập vào có hợp lệ không.
// Gửi { code } lên backend → backend xác nhận và trả về thông tin coupon.
// .trim().toUpperCase() để xử lý lỗi nhập thừa space hoặc chữ thường.
export const validateCoupon = async (code) => {
  const res = await API.post("/coupons/validate", {
    code: code.trim().toUpperCase(),
  });

  // Backend có thể trả về coupon trong res.data.coupon, res.data.data hoặc res.data
  const coupon = res.data?.coupon || res.data?.data || res.data;
  return normalizeCoupon(coupon);
};
