import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";

const API = "https://backend-log-function-2.onrender.com/api/public";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setStatus("error"); return; }
    axios.get(`${API}/newsletter/unsubscribe?token=${token}`)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main, #0d1117)", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "var(--card-bg, #161b22)", border: "1px solid var(--card-border, #30363d)", borderRadius: 16, padding: "48px 40px", maxWidth: 420, textAlign: "center" }}>
        {status === "loading" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <p style={{ color: "var(--text-secondary, #8b949e)" }}>Đang xử lý...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: "var(--text-dark, #f0f6fc)", margin: "0 0 12px" }}>Hủy đăng ký thành công</h2>
            <p style={{ color: "var(--text-secondary, #8b949e)", marginBottom: 24 }}>Bạn sẽ không nhận được email khuyến mãi từ Vivudee nữa.</p>
            <Link to="/" style={{ display: "inline-block", background: "#1a56db", color: "#fff", padding: "10px 24px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
              Về trang chủ
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: "var(--text-dark, #f0f6fc)", margin: "0 0 12px" }}>Liên kết không hợp lệ</h2>
            <p style={{ color: "var(--text-secondary, #8b949e)", marginBottom: 24 }}>Link hủy đăng ký đã hết hạn hoặc không tồn tại.</p>
            <Link to="/" style={{ display: "inline-block", background: "#1a56db", color: "#fff", padding: "10px 24px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
              Về trang chủ
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
