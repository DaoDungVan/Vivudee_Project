import styles from "./NavBar.module.css";
import logo from "../../../assets/images/LogoNav.svg";
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
} from "react-icons/fa";

function NavBar() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ Chuyển sang state để React re-render khi thay đổi
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // ✅ avatarUrl tính từ state user (luôn đồng bộ)
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user?.full_name || user?.email || "User",
  )}&background=0e81cd&color=fff`;

  const menuRef = useRef(null);

  // ✅ Lắng nghe storage event (từ Login/Logout dispatch)
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

  // ✅ Click outside đóng dropdown
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

    // ✅ Cập nhật state ngay lập tức → UI re-render không cần reload
    setUser(null);
    setToken(null);
    setShowMenu(false);

    // ✅ Báo cho các component khác biết (nếu có)
    window.dispatchEvent(new Event("storage"));

    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <img src={logo} alt="Vivudee Logo" onClick={() => navigate("/")} />
        </div>

        {/* Desktop nav */}
        <div className={styles.rightSection}>
          <div className={styles.menu}>
            <span onClick={() => navigate("/flights")}>Flights</span>
            <span onClick={() => navigate("/tours")}>Tour</span>
            <span onClick={() => navigate("/bookings")}>Bookings</span>
            <span onClick={() => navigate("/contact")}>Contact Us</span>
          </div>

          <div className={styles.auth}>
            {token ? (
              <div ref={menuRef} className={styles.userWrapper}>
                <div
                  className={styles.userBox}
                  onClick={() => setShowMenu((prev) => !prev)}
                >
                  <img
                    src={avatarUrl}
                    alt="User avatar"
                    className={styles.avatar}
                  />
                  <span className={styles.hiUser}>Hi, {user?.full_name || "User"}</span>
                </div>

                {showMenu && (
                  <div className={styles.dropdown}>
                    <p className={styles.icons} onClick={() => { navigate("/profile"); setShowMenu(false); }}>
                      <FaUser /> Profile
                    </p>
                    <p className={styles.icons} onClick={() => { navigate("/my-booking"); setShowMenu(false); }}>
                      <FaPlane /> My Booking
                    </p>
                    <p className={styles.icons} onClick={() => { navigate("/transactions"); setShowMenu(false); }}>
                      <FaCreditCard /> Transactions
                    </p>
                    <p className={styles.icons} onClick={() => { navigate("/coupons"); setShowMenu(false); }}>
                      <FaTicketAlt /> Coupons
                    </p>
                    <hr className={styles.dividerLine} />
                    <p className={styles.logout} onClick={handleLogout}>
                      <FaSignOutAlt /> Logout
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button className={styles.login} onClick={() => navigate("/login")}>Login</button>
                <button className={styles.register} onClick={() => navigate("/register")}>Register</button>
              </>
            )}
          </div>
        </div>

        {/* Hamburger button (mobile only) */}
        <button className={styles.hamburger} onClick={() => setMobileOpen((p) => !p)} aria-label="Toggle menu">
          {mobileOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          <span onClick={() => { navigate("/flights"); closeMobile(); }}>Flights</span>
          <span onClick={() => { navigate("/tours"); closeMobile(); }}>Tour</span>
          <span onClick={() => { navigate("/bookings"); closeMobile(); }}>Bookings</span>
          <span onClick={() => { navigate("/contact"); closeMobile(); }}>Contact Us</span>
          <hr className={styles.mobileDivider} />
          {token ? (
            <>
              <span onClick={() => { navigate("/profile"); closeMobile(); }}><FaUser /> Profile</span>
              <span onClick={() => { navigate("/my-booking"); closeMobile(); }}><FaPlane /> My Booking</span>
              <span onClick={() => { navigate("/transactions"); closeMobile(); }}><FaCreditCard /> Transactions</span>
              <span onClick={() => { navigate("/coupons"); closeMobile(); }}><FaTicketAlt /> Coupons</span>
              <span className={styles.mobileLogout} onClick={() => { handleLogout(); closeMobile(); }}><FaSignOutAlt /> Logout</span>
            </>
          ) : (
            <div className={styles.mobileAuth}>
              <button className={styles.login} onClick={() => { navigate("/login"); closeMobile(); }}>Login</button>
              <button className={styles.register} onClick={() => { navigate("/register"); closeMobile(); }}>Register</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default NavBar;