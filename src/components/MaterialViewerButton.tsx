"use client";

import { useState } from "react";

export interface MaterialInfo {
  url: string;
  name?: string;
  type?: "pdf" | "video" | "other";
}

export function MaterialViewerButton({
  material,
  trainingName,
  fullWidth = false
}: {
  material?: MaterialInfo | null;
  trainingName: string;
  fullWidth?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!material?.url) return null;

  const lower = (material.name || material.url).toLowerCase().split("?")[0];
  const isVideo =
    material.type === "video" ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".ogg");
  const isPdf = material.type === "pdf" || lower.endsWith(".pdf");

  const label = isVideo
    ? "🎬 Ver Material (Video)"
    : isPdf
    ? "📄 Ver Material (PDF)"
    : "📚 Ver Material";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary"
        style={{
          padding: fullWidth ? "0.6rem 1rem" : "0.25rem 0.6rem",
          fontSize: fullWidth ? "0.9rem" : "0.75rem",
          width: fullWidth ? "100%" : "fit-content",
          backgroundColor: "#eff6ff",
          color: "#1d4ed8",
          border: "1px solid #bfdbfe",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.35rem",
          borderRadius: "6px",
          cursor: "pointer"
        }}
        title={material.name || "Ver material de capacitación"}
      >
        {label}
      </button>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "1rem"
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              maxWidth: "900px",
              width: "100%",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.25)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
                backgroundColor: "#f8fafc"
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                  Material de Capacitación
                </div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>{trainingName}</h3>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <a
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.8rem",
                    textDecoration: "none",
                    backgroundColor: "white"
                  }}
                >
                  ↗️ Abrir en pestaña nueva
                </a>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.8rem",
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    border: "1px solid #fecaca"
                  }}
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            <div style={{ padding: "1rem", overflowY: "auto", flex: 1, backgroundColor: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {isVideo ? (
                <video
                  src={material.url}
                  controls
                  autoPlay
                  style={{ width: "100%", maxHeight: "75vh", borderRadius: "8px", backgroundColor: "#000" }}
                >
                  Tu navegador no soporta la reproducción de video.
                </video>
              ) : (
                <iframe
                  src={material.url}
                  title={trainingName}
                  style={{ width: "100%", height: "75vh", border: "none", borderRadius: "8px", backgroundColor: "white" }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
