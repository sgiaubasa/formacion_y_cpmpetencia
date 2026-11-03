"use client";

import { useState } from "react";
import { addTopic } from "./actions";

export function NewTopicCard({
  allSectors,
  isSector,
  mySectorName
}: {
  allSectors: { id: number; name: string }[];
  isSector: boolean;
  mySectorName: string;
}) {
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<"all" | "custom">("all");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleToggleSector = (secName: string) => {
    if (selectedSectors.includes(secName)) {
      setSelectedSectors(selectedSectors.filter((s) => s !== secName));
    } else {
      setSelectedSectors([...selectedSectors, secName]);
    }
  };

  const handleSelectAll = () => {
    setSelectedSectors(allSectors.map((s) => s.name));
  };

  const handleClearAll = () => {
    setSelectedSectors([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (!isSector && scope === "custom" && selectedSectors.length === 0) {
      setMessage({
        text: "Debes seleccionar al menos un sector específico o marcar 'Todos los sectores'.",
        isError: true
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const fd = new FormData();
      fd.set("title", title.trim());

      if (isSector) {
        fd.set("scope", "custom");
        fd.set("allSectors", "false");
        fd.set("sectors", mySectorName);
      } else {
        fd.set("scope", scope);
        if (scope === "all") {
          fd.set("allSectors", "true");
        } else {
          fd.set("allSectors", "false");
          selectedSectors.forEach((s) => fd.append("sectors", s));
        }
      }

      const res = await addTopic(fd);
      if (res?.error) {
        setMessage({ text: res.error, isError: true });
      } else {
        setMessage({ text: `✓ Tema "${title}" agregado con éxito.` });
        setTitle("");
        setSelectedSectors([]);
        setScope("all");
      }
    } catch {
      setMessage({ text: "Ocurrió un error al agregar el tema.", isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: "2rem", borderTop: "4px solid var(--primary-color)" }}>
      <h3 style={{ marginBottom: "0.5rem", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span>➕</span>
        {isSector ? `Nuevo Tema de Capacitación para ${mySectorName}` : "Nuevo Tema de Capacitación"}
      </h3>
      <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
        {isSector
          ? `Podrás programar este tema en el Plan Anual de ${mySectorName}. Quedará visible exclusivamente para tu sector.`
          : "Define si el tema aplica a todos los sectores de AUBASA (como inducciones generales o normas ISO) o elige los sectores específicos."}
      </p>

      {message && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 600,
            backgroundColor: message.isError ? "#fee2e2" : "#dcfce7",
            color: message.isError ? "#b91c1c" : "#166534",
            border: `1px solid ${message.isError ? "#fecaca" : "#bbf7d0"}`
          }}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 320px" }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Nombre del Tema *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              placeholder="Ej: Manejo Seguro de Vehículos Livianos"
              required
              style={{ borderRadius: "8px" }}
            />
          </div>

          {isSector && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ padding: "0.5rem 1.75rem", height: "42px", borderRadius: "8px", fontWeight: 600 }}
            >
              {isSubmitting ? "Guardando..." : "Agregar a mi Sector"}
            </button>
          )}
        </div>

        {/* SELECTOR DE ALCANCE SOLO PARA ADMINISTRADORES */}
        {!isSector && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "1rem 1.25rem"
            }}
          >
            <label className="form-label" style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
              ¿A qué sectores aplica este tema?
            </label>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: "pointer",
                  fontWeight: scope === "all" ? 600 : 400,
                  color: scope === "all" ? "var(--primary-color)" : "inherit"
                }}
              >
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                />
                🌐 Todos los sectores (General / Transversal)
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: "pointer",
                  fontWeight: scope === "custom" ? 600 : 400,
                  color: scope === "custom" ? "var(--primary-color)" : "inherit"
                }}
              >
                <input
                  type="radio"
                  name="scope"
                  value="custom"
                  checked={scope === "custom"}
                  onChange={() => setScope("custom")}
                />
                🎯 Seleccionar sectores específicos
              </label>
            </div>

            {scope === "custom" && (
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    Tilda las gerencias o sectores que verán y podrán capacitar en este tema:
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--primary-color)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        fontWeight: 600,
                        textDecoration: "underline"
                      }}
                    >
                      Marcar Todos
                    </button>
                    <span style={{ color: "#cbd5e1" }}>|</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        fontWeight: 600,
                        textDecoration: "underline"
                      }}
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "0.5rem",
                    background: "white",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    maxHeight: "180px",
                    overflowY: "auto"
                  }}
                >
                  {allSectors.map((s) => {
                    const isChecked = selectedSectors.includes(s.name);
                    return (
                      <label
                        key={s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.3rem 0.5rem",
                          borderRadius: "6px",
                          backgroundColor: isChecked ? "#eff6ff" : "transparent",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          fontWeight: isChecked ? 600 : 400
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSector(s.name)}
                        />
                        <span>{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ padding: "0.55rem 2rem", borderRadius: "8px", fontWeight: 600 }}
              >
                {isSubmitting ? "Guardando..." : "Guardar Nuevo Tema"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
