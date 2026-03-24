import styles from "./FilterPanel.module.css";

const FilterPanel = ({ filters, setFilters, flights = [] }) => {
  // 🔥 LẤY DANH SÁCH AIRLINE THEO CODE (CHUẨN)
  const airlines = [
    ...new Map(
      flights.map((f) => {
        const code = f?.airline?.code || f?.airline_code;
        const name = f?.airline?.name || f?.airline_name;

        return [code, { code, name }];
      })
    ).values(),
  ].filter((a) => a.code); // loại null

  // 🔥 TOGGLE
  const toggleFilter = (type, value) => {
    setFilters((prev) => {
      const exists = prev[type].includes(value);

      return {
        ...prev,
        [type]: exists
          ? prev[type].filter((v) => v !== value)
          : [...prev[type], value],
      };
    });
  };

  return (
    <div className={styles.panel}>
      <h3>Filters</h3>

      <div className={styles.group}>
        <p>Airlines</p>

        {airlines.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#999" }}>
            No airlines
          </p>
        ) : (
          airlines.map((airline) => (
            <label key={airline.code}>
              <input
                type="checkbox"
                checked={filters.airlines.includes(airline.code)}
                onChange={() =>
                  toggleFilter("airlines", airline.code)
                }
              />
              {airline.name}
            </label>
          ))
        )}
      </div>
    </div>
  );
};

export default FilterPanel;