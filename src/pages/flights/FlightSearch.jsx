import NavBar from "../../components/common/NavBar/NavBar";
import Footer from "../../components/common/Footer/Footer";
import FlightCard from "../../components/flight/FlightCard/FlightCard";
import flights from "../../data/flights";
import styles from "./FlightSearch.module.css";

const FlightSearch = () => {
  return (
    <>
      <NavBar />

      <div className={styles.wrapper}>
        <h2>Flight Search Result</h2>
        {/* NOTE: test FlightCard */}
        {flights.map((flight) => (
          <FlightCard key={flight.id} flight={flight} />
        ))} 
      </div>

      <Footer />
    </>
  );
};

export default FlightSearch;
