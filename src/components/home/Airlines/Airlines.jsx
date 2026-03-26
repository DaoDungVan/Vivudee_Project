import { useEffect, useState } from "react";
import styles from "./Airlines.module.css";
import API from "../../../services/axiosInstance";

export default function Airlines() {
  const [airlines, setAirlines] = useState([]);

  useEffect(() => {
    API.get("/flights/airlines")
      .then((res) => setAirlines(res.data?.data || []))
      .catch(() => setAirlines([]));
  }, []);

  if (airlines.length === 0) return null;

  return (
    <section className={styles.airlinesSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Popular Airlines</h2>
        <div className={styles.grid}>
          {airlines.map((airline) => (
            <div key={airline.id} className={styles.card}>
              {airline.logo_url ? (
                <img src={airline.logo_url} alt={airline.name}
                  onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }} />
              ) : null}
              <span style={{ display: airline.logo_url ? "none" : "block" }}>{airline.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}