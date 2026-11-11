"use client";

import React, { useState } from "react";
import { resetOrSetUserPasswordClientAction } from "@/app/auth-actions";

interface Props {
  email: string;
  initialHasPassword: boolean;
}

export default function ResetPasswordButton({ email, initialHasPassword }: Props) {
  const [hasPassword, setHasPassword] = useState<boolean>(initialHasPassword);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualPassword, setManualPassword] = useState<string>("");

  const handleBlanquear = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await resetOrSetUserPasswordClientAction(email);
      if (res.ok) {
        setHasPassword(false);
        setFeedback("✅ ¡Clave blanqueada! Ya puede entrar y elegir una nueva.");
      }
    } catch {
      setFeedback("❌ Error al blanquear la clave.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPassword.trim().length < 4) {
      setFeedback("⚠️ La clave debe tener al menos 4 caracteres.");
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await resetOrSetUserPasswordClientAction(email, manualPassword.trim());
      if (res.ok) {
        setHasPassword(true);
        setShowManualInput(false);
        setManualPassword("");
        setFeedback("✅ ¡Nueva clave asignada y guardada!");
      }
    } catch {
      setFeedback("❌ Error al guardar la clave.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleBlanquear}
          disabled={isLoading}
          className="btn btn-secondary"
          style={{
            padding: "0.4rem 0.65rem",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: hasPassword ? "#0f766e" : "#166534",
            borderColor: hasPassword ? "#99f6e4" : "#86efac",
            background: hasPassword ? "#f0fdfa" : "#dcfce7",
            cursor: isLoading ? "wait" : "pointer"
          }}
          title="Blanquea la contraseña para que el usuario defina una nueva en su próximo ingreso"
        >
          {isLoading
            ? "⏳ Procesando..."
            : hasPassword
              ? "🔑 Blanquear Clave"
              : "✅ Clave Blanqueada"}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowManualInput((prev) => !prev);
            setFeedback(null);
          }}
          className="btn btn-secondary"
          style={{
            padding: "0.4rem 0.55rem",
            fontSize: "0.75rem",
            color: "#1e40af",
            borderColor: "#bfdbfe",
            background: "#eff6ff"
          }}
          title="Asignar una contraseña específica manualmente"
        >
          {showManualInput ? "Cancelar" : "✏️ Fijar Clave"}
        </button>
      </div>

      {showManualInput && (
        <form onSubmit={handleSetManual} style={{ display: "flex", gap: "0.3rem", marginTop: "0.15rem" }}>
          <input
            type="text"
            value={manualPassword}
            onChange={(e) => setManualPassword(e.target.value)}
            placeholder="Nueva clave..."
            className="form-input"
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem", width: "130px" }}
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
          >
            Guardar
          </button>
        </form>
      )}

      {feedback && (
        <div
          style={{
            fontSize: "0.74rem",
            fontWeight: 700,
            color: feedback.startsWith("✅") ? "#15803d" : "#dc2626",
            backgroundColor: feedback.startsWith("✅") ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${feedback.startsWith("✅") ? "#bbf7d0" : "#fecaca"}`,
            padding: "0.25rem 0.5rem",
            borderRadius: "6px"
          }}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}
