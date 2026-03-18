import styles from "./NavBar.module.css"
import logo from "../../../assets/images/LogoNav.svg"

function NavBar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>

        <div className={styles.logo}>
          <img src={logo} alt="Vivudee Logo" />
        </div>

        <div className={styles.rightSection}>

          <div className={styles.menu}>
            <span>Flights</span>
            <span>Tour</span>
            <span>Bookings</span>
            <span>Contact Us</span>
          </div>

          <div className={styles.auth}>
            <button className={styles.login}>Login</button>
            <button className={styles.register}>Register</button>
          </div>

        </div>

      </div>
    </nav>
  );
}

export default NavBar;