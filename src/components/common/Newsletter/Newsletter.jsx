import { useState } from "react";
import { toast } from "react-toastify";
import styles from "./Newsletter.module.css";

export default function Newsletter() {

  const [email, setEmail] = useState("");

  const handleSubscribe = () => {

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    toast.success("Subscribed successfully!");

    // TODO:
    // connect newsletter API later

    setEmail("");

  };

  return (

    <div className={styles.newsletter}>

      <div className={styles.container}>

        <div className={styles.text}>

          <h2>
            Get Travel Deals
          </h2>

          <p>
            Subscribe to receive our latest flight promotions and updates.
          </p>

        </div>

        <div className={styles.form}>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button onClick={handleSubscribe}>
            Subscribe
          </button>

        </div>

      </div>

    </div>

  );

}