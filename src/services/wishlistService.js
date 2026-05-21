import API from "./axiosInstance";

const LS_KEY       = "vivudee_wishlist";       // guest local items
const LS_CACHE_KEY = "vivudee_wishlist_cache"; // logged-in IDs cache

// ── LocalStorage helpers ────────────────────────────────
export const getLocalWishlist = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
};

const setLocalWishlist = (items) =>
  localStorage.setItem(LS_KEY, JSON.stringify(items));

const clearLocalWishlist = () => localStorage.removeItem(LS_KEY);

// ── Cache wishlist IDs cho logged-in user ────────────────
const getCachedIds = () => {
  try { return JSON.parse(localStorage.getItem(LS_CACHE_KEY) || "[]"); }
  catch { return []; }
};

const addToCache = (flightId, seatClass) => {
  const ids = getCachedIds();
  const key = `${flightId}_${seatClass}`;
  if (!ids.includes(key)) { ids.push(key); localStorage.setItem(LS_CACHE_KEY, JSON.stringify(ids)); }
};

const removeFromCache = (flightId, seatClass) => {
  const ids = getCachedIds().filter(k => k !== `${flightId}_${seatClass}`);
  localStorage.setItem(LS_CACHE_KEY, JSON.stringify(ids));
};

export const clearWishlistCache = () => localStorage.removeItem(LS_CACHE_KEY);

// Kiểm tra nhanh không cần API call
export const isCachedInWishlist = (flightId, seatClass = "economy") => {
  if (!localStorage.getItem("token")) {
    return getLocalWishlist().some(i => String(i.flight_id) === String(flightId) && i.seat_class === seatClass);
  }
  return getCachedIds().includes(`${flightId}_${seatClass}`);
};

// Khởi tạo cache từ server sau khi login
export const initWishlistCache = async () => {
  try {
    const res = await API.get("/wishlist");
    const items = res.data?.data || res.data?.wishlist || [];
    const ids = items.map(i => `${i.flight_id}_${i.seat_class || "economy"}`);
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
};

// ── CU-02: Thêm vào wishlist ────────────────────────────
export const addToWishlist = async (flightId, seatClass = "economy", flightSnapshot = null) => {
  const normalizedClass = (seatClass || "economy").toLowerCase();
  try {
    const res = await API.post("/wishlist", { flight_id: flightId, seat_class: normalizedClass });
    addToCache(flightId, normalizedClass);
    return { source: "server", data: res.data };
  } catch (err) {
    // 409 = đã tồn tại trên server — cập nhật cache và coi như success
    if (err.response?.status === 409) {
      addToCache(flightId, normalizedClass);
      return { source: "server", alreadyExists: true };
    }
    if (err.response?.data?.save_local || err.response?.status === 401) {
      const list = getLocalWishlist();
      const exists = list.find(i => String(i.flight_id) === String(flightId) && i.seat_class === normalizedClass);
      if (!exists) {
        list.push({ flight_id: flightId, seat_class: normalizedClass, saved_at: new Date().toISOString(), flight: flightSnapshot });
        setLocalWishlist(list);
        // Defer để tránh setState-during-render
        setTimeout(() => window.dispatchEvent(new Event("storage")), 0);
      }
      return { source: "local" };
    }
    throw err;
  }
};

// ── Xóa khỏi wishlist ───────────────────────────────────
export const removeFromWishlist = async (flightId, seatClass = "economy") => {
  try {
    await API.delete("/wishlist", { data: { flight_id: flightId, seat_class: seatClass } });
    removeFromCache(flightId, seatClass);
    return { source: "server" };
  } catch (err) {
    if (err.response?.data?.remove_local || err.response?.status === 401) {
      const list = getLocalWishlist().filter(
        i => !(String(i.flight_id) === String(flightId) && i.seat_class === seatClass)
      );
      setLocalWishlist(list);
      setTimeout(() => window.dispatchEvent(new Event("storage")), 0);
      return { source: "local" };
    }
    throw err;
  }
};

// ── Kiểm tra đã lưu chưa (dùng cho UI) ─────────────────
export const isInWishlist = async (flightId, seatClass = "economy") => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const res = await API.get("/wishlist");
      const items = res.data?.data || res.data?.wishlist || [];
      return items.some(i => i.flight_id === flightId && i.seat_class === seatClass);
    } catch { /* fallback to local */ }
  }
  return getLocalWishlist().some(i => i.flight_id === flightId && i.seat_class === seatClass);
};

// ── CU-04: Lấy toàn bộ wishlist ─────────────────────────
export const getWishlist = async () => {
  try {
    const res = await API.get("/wishlist");
    return { source: "server", items: res.data?.data || res.data?.wishlist || [] };
  } catch (err) {
    if (err.response?.data?.read_local || err.response?.status === 401) {
      return { source: "local", items: getLocalWishlist() };
    }
    throw err;
  }
};

// ── CU-03: Sync sau khi đăng nhập ───────────────────────
export const syncWishlistAfterLogin = async () => {
  const localItems = getLocalWishlist();
  if (!localItems.length) return;
  try {
    await API.post("/wishlist/sync", {
      items: localItems.map(i => ({ flight_id: i.flight_id, seat_class: i.seat_class || "economy" })),
    });
    clearLocalWishlist();
    console.log(`[Wishlist] Synced ${localItems.length} items to server`);
  } catch (err) {
    // 409 = items đã tồn tại, vẫn clear local vì server đã có rồi
    if (err.response?.status === 409 || err.response?.status === 200) {
      clearLocalWishlist();
    } else {
      console.error("[Wishlist] Sync failed:", err.message);
    }
  }
};
