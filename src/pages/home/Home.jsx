import Footer from "../../components/common/Footer/Footer";
import NavBar from "../../components/common/NavBar/Navbar";
import Airlines from "../../components/home/Airlines/Airlines";
import Coupon from "../../components/home/Coupon/Coupon";
import HeroBanner from "../../components/home/HeroBanner/HeroBanner";
import Payments from "../../components/home/Payments/Payments";
import WhyChooseUs from "../../components/home/WhyChooseUs/WhyChooseUs";

function Home() {
  return (
    <div>
      <NavBar />
      <HeroBanner/>
      <Coupon />
      <Airlines/>
      <Payments/>
      <WhyChooseUs/>
      <Footer/>
    </div>
  );
}

export default Home;
