// src/components/home/Airlines/Airlines.jsx
// FIX: ẩn bớt airlines (chỉ show 4), thêm nút Show All/Show Less
// tránh load nhiều ảnh gây chậm trang

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Airlines.module.css";
import API from "../../../services/axiosInstance";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "react-i18next";

const INITIAL_VISIBLE = 6; // Hiện 6 card đầu

export default function Airlines() {
  const [airlines, setAirlines] = useState([]);
  const [showAll,  setShowAll]  = useState(false);
  const { isDark }  = useTheme();
  const { t }       = useTranslation();
  const navigate    = useNavigate();

  useEffect(() => {
    API.get("/flights/airlines")
      .then((res) => setAirlines(res.data?.data || []))
      .catch(() => setAirlines([]));
  }, []);

  if (airlines.length === 0) return null;

  const visible = showAll ? airlines : airlines.slice(0, INITIAL_VISIBLE);

  return (
    <section className={styles.airlinesSection}>
      <div className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.title}>{t("popularAirlines.title")}</h2>
          {airlines.length > INITIAL_VISIBLE && (
            <button
              className={styles.toggleBtn}
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? `${t("popularAirlines.showLess")} ▲` : `${t("popularAirlines.showAll")} (${airlines.length}) ▼`}
            </button>
          )}
        </div>

        <div className={styles.grid}>
          {visible.map((airline) => (
            <div key={airline.id} className={styles.card} onClick={() => navigate(`/airlines/${airline.code}`)} style={{ cursor: "pointer" }}>
              {(airline.logo_url || airline.logo_dark) ? (
                <img
                  src={(isDark && airline.logo_dark) ? airline.logo_dark : airline.logo_url}
                  alt={airline.name}
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <span
                className={styles.fallbackName}
                style={{ display: (airline.logo_url || airline.logo_dark) ? "none" : "flex" }}
              >
                {airline.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
