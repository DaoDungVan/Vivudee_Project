import styles from "./NavBar.module.css"
import logo from "../../../assets/images/LogoNav.svg"
import { useNavigate } from "react-router-dom";

function NavBar() {
  const navigate = useNavigate();
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>

        <div className={styles.logo} >
          <img src={logo} alt="Vivudee Logo" onClick={() => navigate("/")}/>
        </div>

        <div className={styles.rightSection}>

          <div className={styles.menu}>
            <span>Flights</span>
            <span>Tour</span>
            <span>Bookings</span>
            <span>Contact Us</span>
          </div>

          <div className={styles.auth}>
            <button className={styles.login} onClick={() => navigate("/login")}>Login</button>
            <button className={styles.register} onClick={() => navigate("/register")}>Register</button>
          </div>

        </div>

      </div>
    </nav>
  );
}

export default NavBar;