// Xử lý OAuth redirect từ Supabase — không cần SDK
// Supabase gửi access_token trong URL hash: /auth/callback#access_token=xxx

import { useEffect, useState } from "react";
import { useNavigate }         from "react-router-dom";
import { parseTokenFromHash }  from "../../lib/supabase";
import API                     from "../../services/axiosInstance";
import styles                  from "./AuthCallback.module.css";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Đang xác thực...");

  useEffect(() => {
    const handle = async () => {
      const { accessToken, error, errorDesc } = parseTokenFromHash();

      if (error || !accessToken) {
        setStatus(`Xác thực thất bại: ${errorDesc || error || "Không tìm thấy token"}`);
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      // Xoá hash khỏi URL để không lộ token
      window.history.replaceState(null, "", window.location.pathname);

      try {
        // Gửi Supabase token lên backend → nhận JWT hệ thống
        const res = await API.get("/auth/social/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const { token, user } = res.data;
        if (!token) throw new Error("Không nhận được token");

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        window.dispatchEvent(new Event("storage"));

        setStatus("Thành công! Đang chuyển hướng...");
        navigate("/");
      } catch (err) {
        console.error("OAuth callback error:", err);
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