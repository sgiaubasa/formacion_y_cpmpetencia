"use client";

import { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { useRouter, usePathname } from "next/navigation";
import {
  authenticateUserAction,
  changeUserPasswordAction,
  getRoleForEmail,
  logoutUserAction
} from "@/app/auth-actions";

const SESSION_STORAGE_KEY = "sgc_auth_session_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ email: string; role?: string; sectorName?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const router = useRouter();
  const pathname = usePathname();
  const isPublicFirmaRoute =
    pathname?.startsWith("/firma") ||
    pathname?.startsWith("/responder") ||
    pathname?.startsWith("/plan-anual/planilla");

  const performSignOut = useCallback(async () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    Cookies.remove("activeRole", { path: "/" });
    Cookies.remove("userEmail", { path: "/" });
    await logoutUserAction().catch(() => {});
    setUser(null);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/firma") ||
        window.location.pathname.startsWith("/responder") ||
        window.location.pathname.startsWith("/plan-anual/planilla"))
    ) {
      setLoading(false);
      return;
    }

    const handleLogoutEvent = () => {
      performSignOut();
    };
    window.addEventListener("sgc-logout", handleLogoutEvent);

    // Restaurar sesión desde localStorage o cookie userEmail
    let savedEmail = "";
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.email) {
          savedEmail = String(parsed.email).toLowerCase().trim();
        }
      }
    } catch {
      // ignore
    }
    if (!savedEmail) {
      savedEmail = (Cookies.get("userEmail") || "").toLowerCase().trim();
    }

    if (savedEmail) {
      setUser({ email: savedEmail });
      setLoading(false);
      getRoleForEmail(savedEmail)
        .then(({ role, sectorName }) => {
          if (role === "VIEWER") {
            performSignOut();
            alert("Tu acceso ha sido revocado o no tenés permisos para ingresar al sistema.");
            return;
          }
          Cookies.set("activeRole", role, { path: "/" });
          Cookies.set("userEmail", savedEmail, { path: "/" });
          try {
            localStorage.setItem(
              SESSION_STORAGE_KEY,
              JSON.stringify({ email: savedEmail, role, sectorName })
            );
          } catch {
            // ignore
          }
        })
        .catch((err) => {
          console.error("Error verificando rol de sesión:", err);
        });
    } else {
      Cookies.remove("activeRole", { path: "/" });
      Cookies.remove("userEmail", { path: "/" });
      setLoading(false);
    }

    return () => {
      window.removeEventListener("sgc-logout", handleLogoutEvent);
    };
  }, [performSignOut]);

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      if (user) {
        inactivityTimer = setTimeout(() => {
          performSignOut();
          alert("Tu sesión ha expirado por seguridad (2 horas de inactividad).");
        }, 7200000);
      }
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => document.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [user, performSignOut]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError("");
    setMsg("");

    try {
      const res = await authenticateUserAction(email, password);
      if (!res.ok || !res.user) {
        setError(res.error || "Correo o contraseña incorrectos");
      } else {
        Cookies.set("activeRole", res.user.role, { path: "/" });
        Cookies.set("userEmail", res.user.email, { path: "/" });
        try {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(res.user));
        } catch {
          // ignore
        }
        setUser(res.user);
        router.refresh();
      }
    } catch (err) {
      console.error("Error en login:", err);
      setError("No se pudo conectar con el servidor. Intentá nuevamente.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError("");
    setMsg("");

    try {
      const res = await changeUserPasswordAction(email, currentPassword, newPassword);
      if (!res.ok) {
        setError(res.error || "No se pudo actualizar la contraseña.");
      } else {
        setMsg(res.message || "Contraseña actualizada con éxito.");
        setPassword(newPassword);
        setShowChangePassword(false);
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch {
      setError("Error al actualizar la contraseña.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isPublicFirmaRoute) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f0f2f5"
        }}
      >
        <h2 style={{ color: "var(--teal-color)" }}>Cargando sistema...</h2>
      </div>
    );
  }

  if (showChangePassword) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          backgroundColor: "#f0f2f5",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "1rem"
        }}
      >
        <div
          style={{
            background: "white",
            padding: "2.5rem",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            width: "100%",
            maxWidth: "420px"
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <img
              src="/logo.png"
              alt="AUBASA Logo"
              style={{ width: "100%", maxWidth: "190px", height: "auto", objectFit: "contain" }}
            />
            <h2 style={{ marginTop: "1.25rem", color: "var(--teal-color)", fontSize: "1.2rem" }}>
              Cambiar o Establecer Contraseña
            </h2>
            <p style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.4rem" }}>
              Si te blanquearon la clave desde SGI/RRHH, dejá en blanco la contraseña actual e ingresá directamente tu nueva clave.
            </p>
          </div>

          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="usuario@aubasa.com.ar"
                style={{ width: "100%", padding: "0.7rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>
                Contraseña Actual (opcional si fue blanqueada)
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", padding: "0.7rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
              />
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>
                Nueva Contraseña (mínimo 6 caracteres)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: "100%", padding: "0.7rem", border: "1px solid #d1d5db", borderRadius: "6px" }}
              />
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  textAlign: "center"
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn btn-primary"
              style={{ padding: "0.85rem", width: "100%", fontSize: "0.95rem", fontWeight: "bold", justifyContent: "center" }}
            >
              {isLoggingIn ? "Guardando..." : "Guardar Nueva Contraseña"}
            </button>

            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => {
                  setShowChangePassword(false);
                  setError("");
                }}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.85rem", cursor: "pointer" }}
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          backgroundColor: "#f0f2f5",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 0
        }}
      >
        <div
          style={{
            background: "white",
            padding: "3rem",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            width: "100%",
            maxWidth: "400px"
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <img
              src="/logo.png"
              alt="AUBASA Logo"
              style={{ width: "100%", maxWidth: "200px", height: "auto", objectFit: "contain" }}
            />
            <h2 style={{ marginTop: "1.5rem", color: "var(--teal-color)", fontSize: "1.25rem" }}>
              Sistema de Gestión de Competencias
            </h2>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600 }}>
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="usuario@aubasa.com.ar"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem"
                }}
              />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem"
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  marginBottom: "1rem",
                  fontSize: "0.875rem",
                  textAlign: "center"
                }}
              >
                {error}
              </div>
            )}
            {msg && (
              <div
                style={{
                  backgroundColor: "#dcfce3",
                  color: "#16a34a",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  marginBottom: "1rem",
                  fontSize: "0.875rem",
                  textAlign: "center"
                }}
              >
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn btn-primary"
              style={{
                padding: "0.875rem",
                width: "100%",
                fontSize: "1rem",
                fontWeight: "bold",
                justifyContent: "center"
              }}
            >
              {isLoggingIn ? "Ingresando..." : "Ingresar"}
            </button>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMsg("");
                  setShowChangePassword(true);
                }}
                disabled={isLoggingIn}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--teal-color)",
                  fontSize: "0.875rem",
                  cursor: "pointer"
                }}
              >
                ¿Olvidaste o querés cambiar tu contraseña?
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
