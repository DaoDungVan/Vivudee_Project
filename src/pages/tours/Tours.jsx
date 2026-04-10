// src/pages/tours/Tours.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import styles from "./Tours.module.css";

const SAMPLE_TOURS = [
  {
    id: 1,
    nameKey: "tour1Name",
    durationKey: "tour1Duration",
    price: 3990000,
    originalPrice: 4990000,
    rating: 4.8,
    reviews: 124,
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80",
    departureKey: "tour1Departure",
    highlightKeys: ["tour1h1","tour1h2","tour1h3","tour1h4"],
    tagKey: "tagBestSeller",
  },
  {
    id: 2,
    nameKey: "tour2Name",
    durationKey: "tour2Duration",
    price: 5490000,
    originalPrice: 6900000,
    rating: 4.9,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
    departureKey: "tour2Departure",
    highlightKeys: ["tour2h1","tour2h2","tour2h3","tour2h4"],
    tagKey: "tagHot",
  },
  {
    id: 3,
    nameKey: "tour3Name",
    durationKey: "tour3Duration",
    price: 2990000,
    originalPrice: null,
    rating: 4.7,
    reviews: 213,
    image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80",
    departureKey: "tour3Departure",
    highlightKeys: ["tour3h1","tour3h2","tour3h3","tour3h4"],
    tagKey: null,
  },
  {
    id: 4,
    nameKey: "tour4Name",
    durationKey: "tour4Duration",
    price: 4200000,
    originalPrice: 5100000,
    rating: 4.6,
    reviews: 67,
    image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80",
    departureKey: "tour4Departure",
    highlightKeys: ["tour4h1","tour4h2","tour4h3","tour4h4"],
    tagKey: "tagNew",
  },
  {
    id: 5,
    nameKey: "tour5Name",
    durationKey: "tour5Duration",
    price: 3500000,
    originalPrice: 4200000,
    rating: 4.5,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=400&q=80",
    departureKey: "tour5Departure",
    highlightKeys: ["tour5h1","tour5h2","tour5h3","tour5h4"],
    tagKey: "tagDeal",
  },
  {
    id: 6,
    nameKey: "tour6Name",
    durationKey: "tour6Duration",
    price: 1890000,
    originalPrice: null,
    rating: 4.4,
    reviews: 98,
    image: "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?w=400&q=80",
    departureKey: "tour6Departure",
    highlightKeys: ["tour6h1","tour6h2","tour6h3","tour6h4"],
    tagKey: null,
  },
];

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n);

const Tours = () => {
  const navigate  = useNavigate();
  const { t }     = useTranslation();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("popular");

  const filtered = SAMPLE_TOURS
    .filter((tour) => {
      const name       = t(`tours.${tour.nameKey}`, "").toLowerCase();
      const departure  = t(`tours.${tour.departureKey}`, "").toLowerCase();
      const q          = search.toLowerCase();
      return name.includes(q) || departure.includes(q);
    })
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
          <p className={styles.resultCount}>
            {t("tours.resultCount", { count: filtered.length })}
          </p>
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
                <img src={tour.image} alt={t(`tours.${tour.nameKey}`)} loading="lazy" />
                {tour.tagKey && <span className={styles.tag}>{t(`tours.${tour.tagKey}`)}</span>}
                {tour.originalPrice && (
                  <span className={styles.discountBadge}>
                    -{Math.round((1 - tour.price / tour.originalPrice) * 100)}%
                  </span>
                )}
              </div>
              <div className={styles.cardBody}>
                <p className={styles.duration}>
                  ⏱ {t(`tours.${tour.durationKey}`)} · ✈️ {t("tours.from", { departure: t(`tours.${tour.departureKey}`) })}
                </p>
                <h3 className={styles.tourName}>{t(`tours.${tour.nameKey}`)}</h3>
                <div className={styles.highlights}>
                  {tour.highlightKeys.slice(0, 3).map((key, i) => (
                    <span key={i} className={styles.highlight}>✓ {t(`tours.${key}`)}</span>
                  ))}
                </div>
                <div className={styles.cardFooter}>
                  <div className={styles.pricing}>
                    {tour.originalPrice && (
                      <span className={styles.originalPrice}>{fmt(tour.originalPrice)}₫</span>
                    )}
                    <span className={styles.price}>{fmt(tour.price)}₫</span>
                    <span className={styles.priceNote}>{t("tours.perPerson")}</span>
                  </div>
                  <div className={styles.rating}>
                    ⭐ {tour.rating} <span className={styles.reviews}>({tour.reviews})</span>
                  </div>
                </div>
                <button className={styles.bookBtn} onClick={() => alert(t("tours.bookingComingSoon"))}>
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
