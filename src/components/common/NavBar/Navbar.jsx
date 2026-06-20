import styles from "./NavBar.module.css";
import { logoutUser } from "../../../services/authService";
import logo from "../../../assets/images/LogoNav.svg";
import logoDark from "../../../assets/images/LogoNav_Dark.svg";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  LuUser,
  LuPlaneTakeoff,
  LuCreditCard,
  LuTicket,
  LuMessageSquare,
  LuLogOut,
  LuMenu,
  LuX,
  LuUndo2,
  LuSun,
  LuMoon,
  LuHeart,
} from "react-icons/lu";
import { getLocalWishlist, isCachedInWishlist, initWishlistCache } from "../../../services/wishlistService";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "react-i18next";

function NavBar() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);

  const { isDark, toggle } = useTheme();
  const { t, i18n } = useTranslation();
  const isVI = i18n.language === "vi";

  const toggleLang = () => {
    const next = isVI ? "en" : "vi";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  };

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.full_name || user?.email || "User",
  )}&background=0e81cd&color=fff`;
  const avatarUrl = user?.avatar_url || fallbackAvatarUrl;

  const menuRef = useRef(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return;

    const clearAuth = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("last_active_time");
      sessionStorage.removeItem("session_active");
      setUser(null);
      setToken(null);
    };

    // Cập nhật last_active_time mỗi phút khi user còn đang dùng
    localStorage.setItem("last_active_time", String(Date.now()));
    const ticker = setInterval(() => {
      if (localStorage.getItem("token")) {
        localStorage.setItem("last_active_time", String(Date.now()));
      }
    }, 60_000);

    // Đóng trình duyệt mà không logout → sessionStorage bị xóa
    if (!sessionStorage.getItem("session_active")) {
      const lastActive = Number(localStorage.getItem("last_active_time") || 0);
      const elapsed = Date.now() - lastActive;
      const GRACE_MS = 15 * 60 * 1000; // 15 phút

      if (elapsed > GRACE_MS) {
        logoutUser().catch(() => {}).finally(() => {
          clearAuth();
          navigate("/login");
        });
        return;
      }
      // Còn trong 15 phút → khôi phục session
      sessionStorage.setItem("session_active", "1");
    }

    // Token hết hạn
    try {
      const payload = JSON.parse(atob(storedToken.split(".")[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        clearInterval(ticker);
        clearAuth();
        navigate("/login");
      }
    } catch {
      clearInterval(ticker);
      clearAuth();
    }

    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    const updateWishlistCount = () => {
      const token = localStorage.getItem("token");
      if (token) {
        try { setWishlistCount(JSON.parse(localStorage.getItem("vivudee_wishlist_cache") || "[]").length); }
        catch { setWishlistCount(0); }
      } else {
        setWishlistCount(getLocalWishlist().length);
      }
    };

    updateWishlistCount();

    // Refresh cache từ server khi mount để tránh badge đếm sai do cache cũ
    if (localStorage.getItem("token")) {
      initWishlistCache().then(updateWishlistCount).catch(() => {});
    }

    const handleStorageChange = () => {
      try {
        setUser(JSON.parse(localStorage.getItem("user") || "null"));
      } catch {
        setUser(null);
      }
      setToken(localStorage.getItem("token"));
      updateWishlistCount();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try { await logoutUser(); } catch { /* backend lỗi vẫn clear client */ }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("session_active");
    setUser(null);
    setToken(null);
    setShowMenu(false);
    window.dispatchEvent(new Event("storage"));
    navigate("/login");
  };

  const closeMobile = () => setMobileOpen(false);
  const openChatWidget = () => {
    window.dispatchEvent(new Event("open-chat-widget"));
    setShowMenu(false);
    closeMobile();
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <img src={isDark ? logoDark : logo} alt="Vivudee Logo" onClick={() => navigate("/")} />
        </div>

        <div className={styles.rightSection}>
          <div className={styles.menu}>
            <span onClick={() => navigate("/flights")}>{t("nav.flights")}</span>
            <span onClick={() => navigate("/tours")}>{t("nav.tour")}</span>
            <span onClick={() => navigate("/bookings")}>{t("nav.bookings")}</span>
            <span onClick={() => navigate("/contact")}>{t("nav.contactUs")}</span>
          </div>

          <div className={styles.auth}>
            <button
              className={styles.langToggle}
              onClick={toggleLang}
              title={isVI ? "Switch to English" : "Chuyển sang Tiếng Việt"}
              aria-label="Toggle language"
            >
              {isVI ? "EN" : "VI"}
            </button>

            <button
              className={styles.themeToggle}
              onClick={toggle}
              title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
              aria-label="Toggle theme"
            >
              {isDark ? <LuSun className={styles.sunIcon} /> : <LuMoon className={styles.moonIcon} />}
            </button>

            <button
              style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}
              onClick={() => navigate("/wishlist")}
              title="Wishlist"
            >
              <LuHeart size={20} />
              {wishlistCount > 0 && (
                <span style={{ position: "absolute", top: 0, right: 0, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {wishlistCount}
                </span>
              )}
            </button>

            {token ? (
              <div ref={menuRef} className={styles.userWrapper}>
                <div className={styles.userBox} onClick={() => setShowMenu((prev) => !prev)}>
                  <img src={avatarUrl} alt="User avatar" className={styles.avatar} />
                  <span className={styles.hiUser}>
                    {t("nav.hi", { name: user?.full_name || "User" })}
                  </span>
                </div>

                {showMenu && (
                  <div className={styles.dropdown}>
                    <p className={styles.icons} onClick={() => { navigate("/profile"); setShowMenu(false); }}>
                      <LuUser /> {t("nav.profile")}
                    </p>
                    <p className={styles.icons} onClick={() => { navigate("/my-booking"); setShowMenu(false); }}>
                      <LuPlaneTakeoff /> {t("nav.myBooking")}
                    </p>
                    <p className={styles.icons} onClick={() => { navigate("/transactions"); setShowMenu(false); }}>
                      <LuCreditCard /> {t("nav.transactions")}
                    </p>
                    <p className={styles.icons} onClick={() => { navigate("/coupons"); setShowMenu(false); }}>
                      <LuTicket /> {t("nav.coupons")}
                    </p>
                    <p className={styles.icons} onClick={() => { navigate("/refunds"); setShowMenu(false); }}>
                      <LuUndo2 /> {t("nav.myRefunds")}
                    </p>
                    <p className={styles.icons} onClick={openChatWidget}>
                      <LuMessageSquare /> Chat
                    </p>
                    <hr className={styles.dividerLine} />
                    <p className={styles.logout} onClick={handleLogout}>
                      <LuLogOut /> {t("nav.logout")}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button className={styles.login} onClick={() => navigate("/login")}>{t("nav.login")}</button>
                <button className={styles.register} onClick={() => navigate("/register")}>{t("nav.register")}</button>
              </>
            )}
          </div>
        </div>

        <div className={styles.mobileRight}>
          <button className={styles.langToggle} onClick={toggleLang} aria-label="Toggle language">
            {isVI ? "EN" : "VI"}
          </button>
          <button
            className={styles.themeToggle}
            onClick={toggle}
            aria-label="Toggle theme"
          >
            {isDark ? <LuSun className={styles.sunIcon} /> : <LuMoon className={styles.moonIcon} />}
          </button>
          <button
            style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}
            onClick={() => navigate("/wishlist")}
            title="Wishlist"
            aria-label="Wishlist"
          >
            <LuHeart size={20} />
            {wishlistCount > 0 && (
              <span style={{ position: "absolute", top: 0, right: 0, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {wishlistCount}
              </span>
            )}
          </button>
          <button className={styles.hamburger} onClick={() => setMobileOpen((p) => !p)} aria-label="Toggle menu">
            {mobileOpen ? <LuX /> : <LuMenu />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className={styles.mobileMenu}>
          <span onClick={() => { navigate("/flights"); closeMobile(); }}>{t("nav.flights")}</span>
          <span onClick={() => { navigate("/tours"); closeMobile(); }}>{t("nav.tour")}</span>
          <span onClick={() => { navigate("/bookings"); closeMobile(); }}>{t("nav.bookings")}</span>
          <span onClick={() => { navigate("/wishlist"); closeMobile(); }}><LuHeart /> Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ""}</span>
          <span onClick={() => { navigate("/contact"); closeMobile(); }}>{t("nav.contactUs")}</span>
          <hr className={styles.mobileDivider} />
          {token ? (
            <>
              <span onClick={() => { navigate("/profile"); closeMobile(); }}><LuUser /> {t("nav.profile")}</span>
              <span onClick={() => { navigate("/my-booking"); closeMobile(); }}><LuPlaneTakeoff /> {t("nav.myBooking")}</span>
              <span onClick={() => { navigate("/transactions"); closeMobile(); }}><LuCreditCard /> {t("nav.transactions")}</span>
              <span onClick={() => { navigate("/coupons"); closeMobile(); }}><LuTicket /> {t("nav.coupons")}</span>
              <span onClick={() => { navigate("/refunds"); closeMobile(); }}><LuUndo2 /> {t("nav.myRefunds")}</span>
              <span onClick={openChatWidget}><LuMessageSquare /> Chat</span>
              <span className={styles.mobileLogout} onClick={() => { handleLogout(); closeMobile(); }}><LuLogOut /> {t("nav.logout")}</span>
            </>
          ) : (
            <div className={styles.mobileAuth}>
              <button className={styles.login} onClick={() => { navigate("/login"); closeMobile(); }}>{t("nav.login")}</button>
              <button className={styles.register} onClick={() => { navigate("/register"); closeMobile(); }}>{t("nav.register")}</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default NavBar;
