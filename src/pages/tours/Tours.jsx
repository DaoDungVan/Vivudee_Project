// src/pages/tours/Tours.jsx
import { useState } from "react";
import { toast } from "react-toastify";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { useTranslation } from "react-i18next";
import styles from "./Tours.module.css";

const SAMPLE_TOURS = [
  {
    id: 1,
    name: "Da Nang – Hoi An Explorer",
    duration: "3 days 2 nights",
    price: 3990000,
    originalPrice: 4990000,
    rating: 4.8,
    reviews: 124,
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80",
    departure: "Hanoi / Ho Chi Minh City",
    highlights: ["Son Tra Peninsula", "Hoi An Ancient Town", "Ba Na Hills", "Golden Bridge"],
    tag: "Best Seller",
  },
  {
    id: 2,
    name: "Phu Quoc Beach Retreat",
    duration: "4 days 3 nights",
    price: 5490000,
    originalPrice: 6900000,
    rating: 4.9,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
    departure: "Ho Chi Minh City",
    highlights: ["Phu Quoc National Park", "Coral Reef Diving", "Sunset Sanato", "Seafood Dining"],
    tag: "Hot",
  },
  {
    id: 3,
    name: "Hanoi – Ha Long Bay 2D1N",
    duration: "2 days 1 night",
    price: 2990000,
    originalPrice: null,
    rating: 4.7,
    reviews: 213,
    image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80",
    departure: "Hanoi",
    highlights: ["Ha Long Bay", "Surprising Cave", "Kayaking", "Fresh Seafood"],
    tag: null,
  },
  {
    id: 4,
    name: "Sa Pa Summer Adventure",
    duration: "3 days 2 nights",
    price: 4200000,
    originalPrice: 5100000,
    rating: 4.6,
    reviews: 67,
    image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80",
    departure: "Hanoi",
    highlights: ["Fansipan Peak", "Cat Cat Village", "Rice Terraces", "Sa Pa Market"],
    tag: "New",
  },
  {
    id: 5,
    name: "Nha Trang Beach Getaway",
    duration: "3 days 2 nights",
    price: 3500000,
    originalPrice: 4200000,
    rating: 4.5,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=400&q=80",
    departure: "Ho Chi Minh City",
    highlights: ["4-Island Tour", "Vinpearl Land", "Po Nagar Towers", "Fishing Village"],
    tag: "Deal",
  },
  {
    id: 6,
    name: "Mui Ne – Phan Thiet Weekend",
    duration: "2 days 1 night",
    price: 1890000,
    originalPrice: null,
    rating: 4.4,
    reviews: 98,
    image: "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?w=400&q=80",
    departure: "Ho Chi Minh City",
    highlights: ["Flying Sand Dunes", "Mui Ne Fishing Village", "Fairy Stream", "Seafood"],
    tag: null,
  },
];

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n);

const Tours = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("popular");

  const filtered = SAMPLE_TOURS
    .filter((tour) => tour.name.toLowerCase().includes(search.toLowerCase()) || tour.departure.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "price_asc")  return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "rating")     return b.rating - a.rating;
      return b.reviews - a.reviews;
    });

  return (
    <>
      <NavBar />
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>{t("tours.heroTitle")}</h1>
          <p>{t("tours.heroSubtitle")}</p>
          <div className={styles.heroSearch}>
            <input
              type="text"
              placeholder={t("tours.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
      </div>

      <div className={styles.wrapper}>
        <div className={styles.topBar}>
          <p className={styles.resultCount}>{filtered.length} {filtered.length !== 1 ? t("tours.heroTitle").toLowerCase() : t("tours.heroTitle").toLowerCase()} found</p>
          <select className={styles.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="popular">{t("tours.mostPopular")}</option>
            <option value="rating">{t("tours.highestRated")}</option>
            <option value="price_asc">{t("tours.sortPriceAsc")}</option>
            <option value="price_desc">{t("tours.sortPriceDesc")}</option>
          </select>
        </div>

        <div className={styles.grid}>
          {filtered.map((tour) => (
            <div key={tour.id} className={styles.card}>
              <div className={styles.cardImg}>
                <img src={tour.image} alt={tour.name} loading="lazy" />
                {tour.tag && <span className={styles.tag}>{tour.tag}</span>}
                {tour.originalPrice && (
                  <span className={styles.discountBadge}>
                    -{Math.round((1 - tour.price / tour.originalPrice) * 100)}%
                  </span>
                )}
              </div>
              <div className={styles.cardBody}>
                <p className={styles.duration}>⏱ {tour.duration} · ✈️ {t("tours.from", { departure: tour.departure })}</p>
                <h3 className={styles.tourName}>{tour.name}</h3>
                <div className={styles.highlights}>
                  {tour.highlights.slice(0, 3).map((h, i) => (
                    <span key={i} className={styles.highlight}>✓ {h}</span>
                  ))}
                </div>
                <div className={styles.cardFooter}>
                  <div className={styles.pricing}>
                    {tour.originalPrice && (
                      <span className={styles.originalPrice}>{fmt(tour.originalPrice)}VND</span>
                    )}
                    <span className={styles.price}>{fmt(tour.price)}VND</span>
                    <span className={styles.priceNote}>{t("tours.perPerson")}</span>
                  </div>
                  <div className={styles.rating}>
                    ⭐ {tour.rating} <span className={styles.reviews}>({tour.reviews})</span>
                  </div>
                </div>
                <button className={styles.bookBtn} onClick={() => toast.info(t("tours.bookingComingSoon"))}>
                  {t("tours.bookNow")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className={styles.noResult}>
            <p>{t("tours.noResult", { search })}</p>
            <button onClick={() => setSearch("")}>{t("tours.clearSearch")}</button>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Tours;
