// src/pages/contact/Contact.jsx
import { useState } from "react";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import { useTranslation } from "react-i18next";
import styles from "./Contact.module.css";

const FAQS = [
  {
    qKey: "faq1q", aKey: "faq1a",
    q: "How do I cancel a booking?",
    a: "Go to 'My Bookings', select the booking you want to cancel, then click 'Cancel Booking'. Cancellation fees depend on the airline and how far in advance you cancel.",
  },
  {
    qKey: "faq2q", aKey: "faq2a",
    q: "Can I change passenger details after booking?",
    a: "Name changes depend on each airline's policy. Please contact our support team for assistance.",
  },
  {
    qKey: "faq3q", aKey: "faq3a",
    q: "How does VietQR payment work?",
    a: "After selecting VietQR, the system generates a QR code with bank account info and a transfer reference. Open your banking app, scan the QR, and complete the payment. The system auto-confirms within 1–2 minutes.",
  },
  {
    qKey: "faq4q", aKey: "faq4a",
    q: "How do I apply a coupon?",
    a: "On the payment page, enter your coupon code in the 'Promo Code' field and click Apply. The discount is calculated automatically when the transaction is initialized.",
  },
  {
    qKey: "faq5q", aKey: "faq5a",
    q: "Where is my e-ticket sent?",
    a: "After a successful payment, your e-ticket is automatically sent to the email you provided during booking. Check your spam folder if you don't see it.",
  },
  {
    qKey: "faq6q", aKey: "faq6a",
    q: "Does Vivudee support international payments?",
    a: "Currently Vivudee supports VietQR (Vietnamese bank transfer). Other methods such as Visa and MoMo are under development.",
  },
];

const Contact = () => {
  const { t } = useTranslation();
  const [form, setForm]           = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [openFaq, setOpenFaq]     = useState(null);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  const INFO_CARDS = [
    { icon: "📞", titleKey: "phone",    value: "1900 6789",                    sub: "Mon – Sun: 7:00 – 22:00" },
    { icon: "📧", titleKey: "email",    value: "nguyentuminhlong@gmail.com",    sub: "Response within 24 hours" },
    { icon: "💬", titleKey: "liveChat", value: "Chat with us",                 sub: "Average response in 5 min" },
    { icon: "📍", titleKey: "office",   value: "Ho Chi Minh City",             sub: "123 Nguyen Hue, District 1" },
  ];

  return (
    <>
      <NavBar />

      <div className={styles.hero}>
        <h1>{t("contact.heroTitle")}</h1>
        <p>{t("contact.heroSubtitle")}</p>
      </div>

      <div className={styles.wrapper}>
        <div className={styles.infoGrid}>
          {INFO_CARDS.map((item) => (
            <div key={item.titleKey} className={styles.infoCard}>
              <div className={styles.infoIcon}>{item.icon}</div>
              <p className={styles.infoTitle}>{t(`contact.${item.titleKey}`)}</p>
              <p className={styles.infoValue}>{item.value}</p>
              <p className={styles.infoSub}>{item.sub}</p>
            </div>
          ))}
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>{t("contact.sendMessage")}</h2>
            <p className={styles.sectionSub}>{t("contact.sendDesc")}</p>

            {submitted ? (
              <div className={styles.successBox}>
                <div className={styles.successIcon}>✅</div>
                <h3>{t("contact.messageSentTitle")}</h3>
                <p>{t("contact.messageSentDesc")}</p>
                <button onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                  {t("contact.sendAnotherBtn")}
                </button>
              </div>
            ) : (
              <div className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>{t("contact.fullNameLabel")}</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="John Doe" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>{t("contact.emailLabel")}</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>{t("contact.subjectLabel")}</label>
                  <select name="subject" value={form.subject} onChange={handleChange}>
                    <option value="">{t("contact.subjectSelect")}</option>
                    <option value="booking">{t("contact.subjectBooking")}</option>
                    <option value="payment">{t("contact.subjectPayment")}</option>
                    <option value="cancel">{t("contact.subjectCancel")}</option>
                    <option value="coupon">{t("contact.subjectCoupon")}</option>
                    <option value="other">{t("contact.subjectOther")}</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t("contact.messageLabel")}</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder={t("contact.messagePlaceholder")}
                    rows={6}
                  />
                </div>
                <button
                  className={styles.submitBtn}
                  onClick={handleSubmit}
                  disabled={loading || !form.name || !form.email || !form.message}
                >
                  {loading ? t("contact.sendingBtn") : t("contact.sendBtn")}
                </button>
              </div>
            )}
          </div>

          <div className={styles.faqSection}>
            <h2 className={styles.sectionTitle}>{t("contact.faqTitle")}</h2>
            <p className={styles.sectionSub}>{t("contact.faqSubtitle")}</p>
            <div className={styles.faqList}>
              {FAQS.map((faq, i) => (
                <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ""}`}>
                  <button className={styles.faqQuestion} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{t(`contact.${faq.qKey}`)}</span>
                    <span className={styles.faqArrow}>{openFaq === i ? "▲" : "▼"}</span>
                  </button>
                  {openFaq === i && <div className={styles.faqAnswer}>{t(`contact.${faq.aKey}`)}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.socialSection}>
          <p className={styles.socialTitle}>{t("contact.followUs")}</p>
          <div className={styles.socialLinks}>
            {[
              { label: "Facebook",  icon: "📘", url: "#" },
              { label: "Zalo",      icon: "💬", url: "#" },
              { label: "Instagram", icon: "📸", url: "#" },
              { label: "YouTube",   icon: "▶️",  url: "#" },
            ].map((s) => (
              <a key={s.label} href={s.url} className={styles.socialLink} target="_blank" rel="noreferrer">
                <span>{s.icon}</span> {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Contact;
