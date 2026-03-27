// src/pages/contact/Contact.jsx
import { useState } from "react";
import NavBar from "../../components/common/NavBar/Navbar";
import Footer from "../../components/common/Footer/Footer";
import styles from "./Contact.module.css";

const FAQS = [
  {
    q: "How do I cancel a booking?",
    a: "Go to 'My Bookings', select the booking you want to cancel, then click 'Cancel Booking'. Cancellation fees depend on the airline and how far in advance you cancel.",
  },
  {
    q: "Can I change passenger details after booking?",
    a: "Name changes depend on each airline's policy. Please contact our support team for assistance.",
  },
  {
    q: "How does VietQR payment work?",
    a: "After selecting VietQR, the system generates a QR code with bank account info and a transfer reference. Open your banking app, scan the QR, and complete the payment. The system auto-confirms within 1–2 minutes.",
  },
  {
    q: "How do I apply a coupon?",
    a: "On the payment page, enter your coupon code in the 'Promo Code' field and click Apply. The discount is calculated automatically when the transaction is initialized.",
  },
  {
    q: "Where is my e-ticket sent?",
    a: "After a successful payment, your e-ticket is automatically sent to the email you provided during booking. Check your spam folder if you don't see it.",
  },
  {
    q: "Does Vivudee support international payments?",
    a: "Currently Vivudee supports VietQR (Vietnamese bank transfer). Other methods such as Visa and MoMo are under development.",
  },
];

const Contact = () => {
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

  return (
    <>
      <NavBar />

      {/* Hero */}
      <div className={styles.hero}>
        <h1>Contact Us</h1>
        <p>We're here to help you 24/7</p>
      </div>

      <div className={styles.wrapper}>

        {/* Contact info cards */}
        <div className={styles.infoGrid}>
          {[
            { icon: "📞", title: "Hotline",     value: "1900 6789",           sub: "Mon – Sun: 7:00 – 22:00" },
            { icon: "📧", title: "Email",        value: "nguyentuminhlong@gmail.com", sub: "Response within 24 hours" },
            { icon: "💬", title: "Live Chat",    value: "Chat with us",        sub: "Average response in 5 min" },
            { icon: "📍", title: "Office",       value: "Ho Chi Minh City",    sub: "123 Nguyen Hue, District 1" },
          ].map((item) => (
            <div key={item.title} className={styles.infoCard}>
              <div className={styles.infoIcon}>{item.icon}</div>
              <p className={styles.infoTitle}>{item.title}</p>
              <p className={styles.infoValue}>{item.value}</p>
              <p className={styles.infoSub}>{item.sub}</p>
            </div>
          ))}
        </div>

        <div className={styles.mainGrid}>

          {/* Contact Form */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Send a Message</h2>
            <p className={styles.sectionSub}>Fill in the form and we'll get back to you as soon as possible</p>

            {submitted ? (
              <div className={styles.successBox}>
                <div className={styles.successIcon}>✅</div>
                <h3>Message Sent!</h3>
                <p>We've received your message and will respond within 24 hours.</p>
                <button onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                  Send Another
                </button>
              </div>
            ) : (
              <div className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Full Name *</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="John Doe" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email *</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Subject</label>
                  <select name="subject" value={form.subject} onChange={handleChange}>
                    <option value="">-- Select a subject --</option>
                    <option value="booking">Booking Issue</option>
                    <option value="payment">Payment</option>
                    <option value="cancel">Cancellation / Change</option>
                    <option value="coupon">Coupon / Promo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Message *</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Describe your issue..."
                    rows={6}
                  />
                </div>
                <button
                  className={styles.submitBtn}
                  onClick={handleSubmit}
                  disabled={loading || !form.name || !form.email || !form.message}
                >
                  {loading ? "Sending..." : "Send Message ✉️"}
                </button>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className={styles.faqSection}>
            <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
            <p className={styles.sectionSub}>Find quick answers to common issues</p>
            <div className={styles.faqList}>
              {FAQS.map((faq, i) => (
                <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ""}`}>
                  <button className={styles.faqQuestion} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{faq.q}</span>
                    <span className={styles.faqArrow}>{openFaq === i ? "▲" : "▼"}</span>
                  </button>
                  {openFaq === i && <div className={styles.faqAnswer}>{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Social / links */}
        <div className={styles.socialSection}>
          <p className={styles.socialTitle}>Follow Us</p>
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
