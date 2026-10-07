"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./SidebarNav";
import { LogoutButton } from "./LogoutButton";

export function AppShell({
  isSector,
  role,
  children
}: {
  isSector: boolean;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isStandaloneForm =
    pathname?.startsWith("/responder") || pathname?.startsWith("/firma");

  if (isStandaloneForm) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f0f4f8",
          padding: "1.5rem 1rem"
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div
          className="sidebar-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem 1rem",
            borderBottom: "1px solid var(--border-color)",
            background: "#ffffff"
          }}
        >
          <img
            src="/logo.png"
            alt="AUBASA Logo"
            style={{ width: "180px", height: "auto", objectFit: "contain" }}
          />
        </div>
        <SidebarNav isSector={isSector} role={role} />
        <LogoutButton />
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
