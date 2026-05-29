import { useState } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import styles from "./Newsletter.module.css";

export default function Newsletter() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");

  const handleSubscribe = () => {
    if (!email) { toast.error(t("newsletter.error")); return; }
    toast.success(t("newsletter.success"));
    setEmail("");
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
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
          />
          <button onClick={handleSubscribe}>{t("newsletter.btn")}</button>
        </div>
      </div>
    </div>
  );
}
