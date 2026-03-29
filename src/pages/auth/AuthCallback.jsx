// Xử lý OAuth redirect từ Supabase — không cần SDK
// Supabase gửi access_token trong URL hash: /auth/callback#access_token=xxx

import { useEffect, useState } from "react";
import { useNavigate }         from "react-router-dom";
import { parseTokenFromHash }  from "../../lib/supabase";
import API                     from "../../services/axiosInstance";

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
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "100vh", gap: 16,
      background: "#f0f6ff", fontFamily: "Roboto, sans-serif",
    }}>
      <div style={{
        width: 48, height: 48,
        border: "4px solid #e0e8f0",
        borderTop: "4px solid #0e81cd",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: "#555", fontSize: 16 }}>{status}</p>
    </div>
  );
}