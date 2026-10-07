import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole } from "@/lib/auth";
import { AuthProvider } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";

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

  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <AppShell isSector={isSector} role={role}>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
