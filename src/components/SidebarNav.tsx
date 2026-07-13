"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav({ isSector, role }: { isSector: boolean; role: string }) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard", icon: "📊" },
    { href: "/personal", label: "Personal (Legajos)", icon: "👤" },
    { href: "/perfiles", label: "Perfiles de Puesto", icon: "💼" },
    ...(!isSector ? [{ href: "/brechas", label: "Evaluación y Brechas", icon: "📝" }] : []),
    { href: "/plan-anual", label: "Plan Anual", icon: "📅" },
    ...(!isSector ? [{ href: "/capacitaciones", label: "Temas a Capacitar", icon: "🎓" }] : []),
    { href: "/transferencias", label: "Transferencias", icon: "⇄" },
    ...(role === 'SGI' ? [{ href: "/accesos", label: "Accesos", icon: "🔐" }] : [])
  ];

  return (
    <nav className="sidebar-nav">
      {links.map(link => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link 
            key={link.href} 
            href={link.href} 
            className={`nav-link ${isActive ? "active" : ""}`}
          >
            <span style={{ fontSize: '1.25rem' }}>{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
