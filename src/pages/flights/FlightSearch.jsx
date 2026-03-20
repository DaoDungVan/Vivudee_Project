import NavBar from "../../components/common/NavBar/NavBar";
import Footer from "../../components/common/Footer/Footer";
import FlightCard from "../../components/flight/FlightCard/FlightCard";
import flights from "../../data/flights";

const FlightSearch = () => {
  return (
    <>
      <NavBar />

      <div>
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
