"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export function LogoutButton() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEmail(user.email || "");
    });
  }, []);

  return (
    <div style={{ padding: "1.5rem 1rem", borderTop: "1px solid var(--border-color)", textAlign: "center", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)", wordBreak: "break-all" }}>
        {email}
      </span>
      <button 
        onClick={() => supabase.auth.signOut()} 
        className="btn btn-primary" 
        style={{ width: "100%", justifyContent: "center", backgroundColor: "#dc2626", borderColor: "#dc2626" }}
      >
        Cerrar Sesión
      </button>
    </div>
  );
}
