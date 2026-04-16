import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import styles from "./Chat.module.css";

function Chat() {
  const { t } = useTranslation();

  useEffect(() => {
    window.dispatchEvent(new Event("open-chat-widget"));
  }, []);

  return (
    <>
      <NavBar />
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>{t("chat.pageEyebrow")}</p>
          <h1>{t("chat.pageTitle")}</h1>
          <p className={styles.description}>{t("chat.pageDesc")}</p>
          <button
            type="button"
            className={styles.button}
            onClick={() => window.dispatchEvent(new Event("open-chat-widget"))}
          >
            {t("chat.pageBtn")}
          </button>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default Chat;
