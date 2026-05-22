// Xử lý OAuth redirect từ Supabase
// Hỗ trợ cả 2 flow:
//   - Implicit: /auth/callback#access_token=xxx
//   - PKCE:     /auth/callback?code=xxx  (Supabase mới mặc định dùng)

import { useEffect, useState } from "react";
import { useNavigate }         from "react-router-dom";
import API, { markJustLoggedIn } from "../../services/axiosInstance";
import styles                  from "./AuthCallback.module.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || "https://sautvlazbocyvirdzuvl.supabase.co";

// Đọc token từ hash (#access_token=...) hoặc query (?code=...)
const parseCallback = () => {
  // 1. Implicit flow — token trong hash
  const hash   = window.location.hash.substring(1);
  const hParams = new URLSearchParams(hash);
  if (hParams.get("access_token")) {
    return {
      type: "implicit",
      accessToken: hParams.get("access_token"),
      error:       hParams.get("error"),
      errorDesc:   hParams.get("error_description"),
    };
  }

  // 2. PKCE flow — code trong query string
  const qParams = new URLSearchParams(window.location.search);
  if (qParams.get("code")) {
    return { type: "pkce", code: qParams.get("code"), error: qParams.get("error") };
  }

  return { type: "none", error: "no_token" };
};

// Đổi PKCE code → access_token qua Supabase REST
const exchangeCode = async (code) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "" },
    body:    JSON.stringify({ auth_code: code }),
  });
  if (!res.ok) throw new Error("PKCE exchange thất bại");
  const data = await res.json();
  return data.access_token;
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Đang xác thực...");

  useEffect(() => {
    const handle = async () => {
      const parsed = parseCallback();

      // Xoá params khỏi URL
      window.history.replaceState(null, "", window.location.pathname);

      if (parsed.error || parsed.type === "none") {
        setStatus("Xác thực thất bại. Vui lòng thử lại.");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      try {
        let accessToken = parsed.accessToken;

        // PKCE: đổi code → token
        if (parsed.type === "pkce") {
          accessToken = await exchangeCode(parsed.code);
        }

        if (!accessToken) throw new Error("Không nhận được token từ Supabase");

        // Gửi Supabase token lên backend → nhận JWT hệ thống
        const res = await API.get("/auth/social/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const { token, user } = res.data;
        if (!token) throw new Error("Backend không trả về token");

        markJustLoggedIn();
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        sessionStorage.setItem("session_active", "1");
        window.dispatchEvent(new Event("storage"));

        setStatus("Thành công! Đang chuyển hướng...");
        navigate("/");
      } catch (err) {
        console.error("[AuthCallback]", err);
        setStatus("Đăng nhập thất bại. Vui lòng thử lại.");
        setTimeout(() => navigate("/login"), 2000);
      }
    };

    handle();
  }, [navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.spinner} />
      <p className={styles.status}>{status}</p>
    </div>
  );
}
