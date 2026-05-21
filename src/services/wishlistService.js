import API from "./axiosInstance";

const LS_KEY = "vivudee_wishlist";

// ── LocalStorage helpers ────────────────────────────────
export const getLocalWishlist = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
};

const setLocalWishlist = (items) =>
  localStorage.setItem(LS_KEY, JSON.stringify(items));

const clearLocalWishlist = () => localStorage.removeItem(LS_KEY);

// ── CU-02: Thêm vào wishlist ────────────────────────────
export const addToWishlist = async (flightId, seatClass = "economy", flightSnapshot = null) => {
  try {
    const res = await API.post("/wishlist", { flight_id: flightId, seat_class: seatClass });
    return { source: "server", data: res.data };
  } catch (err) {
    if (err.response?.data?.save_local || err.response?.status === 401) {
      // Guest → lưu localStorage
      const list = getLocalWishlist();
      const exists = list.find(i => i.flight_id === flightId && i.seat_class === seatClass);
      if (!exists) {
        list.push({ flight_id: flightId, seat_class: seatClass, saved_at: new Date().toISOString(), flight: flightSnapshot });
        setLocalWishlist(list);
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
    return { source: "server" };
  } catch (err) {
    if (err.response?.data?.remove_local || err.response?.status === 401) {
      const list = getLocalWishlist().filter(
        i => !(i.flight_id === flightId && i.seat_class === seatClass)
      );
      setLocalWishlist(list);
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
      items: localItems.map(i => ({ flight_id: i.flight_id, seat_class: i.seat_class })),
    });
    clearLocalWishlist();
    console.log(`[Wishlist] Synced ${localItems.length} items to server`);
  } catch (err) {
    console.error("[Wishlist] Sync failed:", err.message);
  }
};
