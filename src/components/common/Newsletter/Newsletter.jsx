import { useState } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import axios from "axios";
import styles from "./Newsletter.module.css";

const API_BASE = "https://backend-log-function-2.onrender.com/api/public";

export default function Newsletter() {
  const { t } = useTranslation();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!email.trim()) { toast.error(t("newsletter.error")); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Email không hợp lệ");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/newsletter/subscribe`, { email: email.trim() });
      toast.success(t("newsletter.success"));
      setEmail("");
    } catch (err) {
      const msg = err?.response?.data?.error;
      toast.error(msg || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.newsletter}>
      <div className={styles.container}>
        <div className={styles.text}>
          <h2>{t("newsletter.title")}</h2>
          <p>{t("newsletter.desc")}</p>
        </div>
        <div className={styles.form}>
          <input
            type="email"
            placeholder={t("newsletter.placeholder")}
            value={email}
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSubscribe()}
          />
          <button onClick={handleSubscribe} disabled={loading}>
            {loading ? "Đang đăng ký..." : t("newsletter.btn")}
          </button>
        </div>
      </div>
    </div>
  );
}
