"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getRoleForEmail } from "@/app/auth-actions";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const href = window.location.href;
      if (hash.includes("type=invite") || hash.includes("type=recovery") || href.includes("type=invite") || href.includes("type=recovery")) {
        setIsRecovery(true);
      }
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        updateUserRoleCookie(session.user.email!).catch(console.error);
      } else {
        Cookies.remove("activeRole");
      }
      setLoading(false);
    }).catch((err) => {
      console.error("Error getting session:", err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
      
      if (session?.user) {
        setUser(session.user);
        updateUserRoleCookie(session.user.email!);
      } else {
        setUser(null);
        Cookies.remove("activeRole");
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      if (user && !isRecovery) {
        inactivityTimer = setTimeout(() => {
          supabase.auth.signOut();
          alert("Tu sesión ha expirado por seguridad (2 horas de inactividad).");
        }, 7200000);
      }
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user, isRecovery]);

  const updateUserRoleCookie = async (email: string) => {
    const { role } = await getRoleForEmail(email);
    Cookies.set("activeRole", role, { expires: 7 });
    router.refresh();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError("");
    setMsg("");
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Correo o contraseña incorrectos");
    setIsLoggingIn(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Por favor ingresa tu correo para recuperar la contraseña");
      return;
    }
    setIsLoggingIn(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setError(error.message);
    } else {
      setMsg("Revisa tu correo para el enlace de recuperación");
    }
    setIsLoggingIn(false);
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setIsLoggingIn(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setError(error.message);
    } else {
      alert("Contraseña establecida con éxito. Ya puedes usar el sistema.");
      setIsRecovery(false);
      setMsg("");
    }
    setIsLoggingIn(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
        <h2 style={{ color: 'var(--teal-color)' }}>Cargando sistema...</h2>
      </div>
    );
  }

  if (isRecovery) {
    return (
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center', margin: 0, padding: 0 }}>
        <div style={{ background: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/logo.png" alt="AUBASA Logo" style={{ width: '100%', maxWidth: '200px', height: 'auto', objectFit: 'contain' }} />
            <h2 style={{ marginTop: '1.5rem', color: 'var(--teal-color)', fontSize: '1.25rem' }}>Establecer Contraseña</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Por favor, ingresa tu nueva contraseña para acceder al sistema.</p>
          </div>
          <form onSubmit={handleSetNewPassword}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Nueva Contraseña</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
              />
            </div>
            {error && <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}
            
            <button type="submit" disabled={isLoggingIn} className="btn btn-primary" style={{ padding: '0.875rem', width: '100%', fontSize: '1rem', fontWeight: 'bold', justifyContent: 'center' }}>
              {isLoggingIn ? "Guardando..." : "Guardar Contraseña"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center', margin: 0, padding: 0 }}>
        <div style={{ background: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/logo.png" alt="AUBASA Logo" style={{ width: '100%', maxWidth: '200px', height: 'auto', objectFit: 'contain' }} />
            <h2 style={{ marginTop: '1.5rem', color: 'var(--teal-color)', fontSize: '1.25rem' }}>Sistema de Gestión de Competencias</h2>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Correo Electrónico</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                placeholder="usuario@aubasa.com.ar"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Contraseña</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
              />
            </div>
            
            {error && <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}
            {msg && <div style={{ backgroundColor: '#dcfce3', color: '#16a34a', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>{msg}</div>}
            
            <button type="submit" disabled={isLoggingIn} className="btn btn-primary" style={{ padding: '0.875rem', width: '100%', fontSize: '1rem', fontWeight: 'bold', justifyContent: 'center' }}>
              {isLoggingIn ? "Ingresando..." : "Ingresar"}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button type="button" onClick={handleResetPassword} disabled={isLoggingIn} style={{ background: "none", border: "none", color: "var(--teal-color)", fontSize: "0.875rem", cursor: "pointer" }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
