import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole } from "@/lib/auth";
import { AuthProvider } from "@/components/AuthProvider";
import { LogoutButton } from "@/components/LogoutButton";
import { SidebarNav } from "@/components/SidebarNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SGC & SV - AUBASA",
  description: "Sistema de Gestión de Competencias",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectores = await prisma.sector.findMany({ orderBy: { name: 'asc' } });

  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <div className="app-container">
            <aside className="sidebar">
              <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', borderBottom: '1px solid var(--border-color)', background: '#ffffff' }}>
                <img src="/logo.png" alt="AUBASA Logo" style={{ width: '180px', height: 'auto', objectFit: 'contain' }} />
              </div>
              <SidebarNav isSector={isSector} role={role} />
              <LogoutButton />
            </aside>
            <main className="main-content">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
