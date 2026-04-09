import styles from "./NavBar.module.css";
import logo from "../../../assets/images/LogoNav.svg";
import logoDark from "../../../assets/images/LogoNav_Dark.svg";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  FaUser,
  FaPlane,
  FaCreditCard,
  FaTicketAlt,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaSun,
  FaMoon,
} from "react-icons/fa";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "react-i18next";

function NavBar() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.full_name || user?.email || "User",
  )}&background=0e81cd&color=fff`;

  const menuRef = useRef(null);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        setUser(JSON.parse(localStorage.getItem("user") || "null"));
      } catch {
        setUser(null);
      }
      setToken(localStorage.getItem("token"));
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    setShowMenu(false);
    window.dispatchEvent(new Event("storage"));
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <img src={isDark ? logoDark : logo} alt="Vivudee Logo" onClick={() => navigate("/")} />
        </div>

        {/* Desktop nav */}
        <div className={styles.rightSection}>
          <div className={styles.menu}>
            <span onClick={() => navigate("/flights")}>{t("nav.flights")}</span>
            <span onClick={() => navigate("/tours")}>{t("nav.tour")}</span>
            <span onClick={() => navigate("/bookings")}>{t("nav.bookings")}</span>
            <span onClick={() => navigate("/contact")}>{t("nav.contactUs")}</span>
          </div>

          <div className={styles.auth}>
            {/* Nút đổi ngôn ngữ */}
            <button
              className={styles.langToggle}
              onClick={toggleLang}
              title={isVI ? "Switch to English" : "Chuyển sang Tiếng Việt"}
              aria-label="Toggle language"
            >
              {isVI ? "EN" : "VI"}
            </button>

            {/* Nút chuyển Dark / Light */}
            <button
              className={styles.themeToggle}
              onClick={toggle}
              title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
              aria-label="Toggle theme"
            >
              {isDark ? <FaSun className={styles.sunIcon} /> : <FaMoon className={styles.moonIcon} />}
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
                      <FaUser /> {t("nav.profile")}
                    </p>
                    <p className={styles.icons} onClick={() => { navigate("/my-booking"); setShowMenu(false); }}>
                      <FaPlane /> {t("nav.myBooking")}
                    </p>
                    <p className={styles.icons} onClick={() => { navigate("/transactions"); setShowMenu(false); }}>
                      <FaCreditCard /> {t("nav.transactions")}
                    </p>
                    <p className={styles.icons} onClick={() => { navigate("/coupons"); setShowMenu(false); }}>
                      <FaTicketAlt /> {t("nav.coupons")}
                    </p>
                    <hr className={styles.dividerLine} />
                    <p className={styles.logout} onClick={handleLogout}>
                      <FaSignOutAlt /> {t("nav.logout")}
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

        {/* Mobile right: lang + theme + hamburger */}
        <div className={styles.mobileRight}>
          <button className={styles.langToggle} onClick={toggleLang} aria-label="Toggle language">
            {isVI ? "EN" : "VI"}
          </button>
          <button
            className={styles.themeToggle}
            onClick={toggle}
            aria-label="Toggle theme"
          >
            {isDark ? <FaSun className={styles.sunIcon} /> : <FaMoon className={styles.moonIcon} />}
          </button>
          <button className={styles.hamburger} onClick={() => setMobileOpen((p) => !p)} aria-label="Toggle menu">
            {mobileOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          <span onClick={() => { navigate("/flights"); closeMobile(); }}>{t("nav.flights")}</span>
          <span onClick={() => { navigate("/tours"); closeMobile(); }}>{t("nav.tour")}</span>
          <span onClick={() => { navigate("/bookings"); closeMobile(); }}>{t("nav.bookings")}</span>
          <span onClick={() => { navigate("/contact"); closeMobile(); }}>{t("nav.contactUs")}</span>
          <hr className={styles.mobileDivider} />
          {token ? (
            <>
              <span onClick={() => { navigate("/profile"); closeMobile(); }}><FaUser /> {t("nav.profile")}</span>
              <span onClick={() => { navigate("/my-booking"); closeMobile(); }}><FaPlane /> {t("nav.myBooking")}</span>
              <span onClick={() => { navigate("/transactions"); closeMobile(); }}><FaCreditCard /> {t("nav.transactions")}</span>
              <span onClick={() => { navigate("/coupons"); closeMobile(); }}><FaTicketAlt /> {t("nav.coupons")}</span>
              <span className={styles.mobileLogout} onClick={() => { handleLogout(); closeMobile(); }}><FaSignOutAlt /> {t("nav.logout")}</span>
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
