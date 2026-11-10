"use client";

import Cookies from "js-cookie";
import { useEffect, useState } from "react";

export function LogoutButton() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const cookieEmail = Cookies.get("userEmail");
    if (cookieEmail) {
      setEmail(cookieEmail);
      return;
    }
    try {
      const raw = localStorage.getItem("sgc_auth_session_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.email) setEmail(parsed.email);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = () => {
    window.dispatchEvent(new Event("sgc-logout"));
  };

  return (
    <div
      style={{
        padding: "1.5rem 1rem",
        borderTop: "1px solid var(--border-color)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}
    >
      <span
        style={{
          fontSize: "0.875rem",
          fontWeight: "600",
          color: "var(--text-secondary)",
          wordBreak: "break-all"
        }}
      >
        {email}
      </span>
      <button
        onClick={handleLogout}
        className="btn btn-primary"
        style={{
          width: "100%",
          justifyContent: "center",
          backgroundColor: "#dc2626",
          borderColor: "#dc2626"
        }}
      >
        Cerrar Sesión
      </button>
    </div>
  );
}
