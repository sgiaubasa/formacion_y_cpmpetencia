"use client";

import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { marcarEjecutada, generarLinkFirma } from "./actions";
import { supabase } from "@/lib/supabase";

export function ConfirmExecutionModal({
  recordId,
  initialMode = "upload",
  onClose
}: {
  recordId: number;
  initialMode?: "upload" | "sign" | "link";
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"upload" | "sign" | "link">(initialMode);
  const employeeSigRef = useRef<any>(null);
  const instructorSigRef = useRef<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [employeeLink, setEmployeeLink] = useState("");
  const [instructorLink, setInstructorLink] = useState("");
  const [copiedType, setCopiedType] = useState<"" | "empleado" | "instructor">("");

  const handleGenerateLink = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const { employeeToken, instructorToken } = await generarLinkFirma(recordId);
      setEmployeeLink(`${window.location.origin}/firma/${employeeToken}`);
      setInstructorLink(`${window.location.origin}/firma/${instructorToken}`);
    } catch (err) {
      setError("Error al generar el enlace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (initialMode === "link" && !employeeLink) {
      handleGenerateLink();
    }
  }, [initialMode]);

  const copyToClipboard = (url: string, type: "empleado" | "instructor") => {
    navigator.clipboard.writeText(url);
    setCopiedType(type);
    setTimeout(() => setCopiedType(""), 2500);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === "link") return;

    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    if (mode === "sign") {
      if (employeeSigRef.current?.isEmpty() || instructorSigRef.current?.isEmpty()) {
        setError("Ambas firmas son requeridas en modo presencial.");
        setIsSubmitting(false);
        return;
      }
      formData.set("employeeSignature", employeeSigRef.current.getTrimmedCanvas().toDataURL("image/png"));
      formData.set("instructorSignature", instructorSigRef.current.getTrimmedCanvas().toDataURL("image/png"));
    }

    if (mode === "upload") {
      const file = formData.get("evidence") as File | null;
      if (file && file.size > 0) {
        try {
          const cleanName = file.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9.-]/g, "_");
          const filename = `${recordId}-${Date.now()}-${cleanName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("evidencias")
            .upload(filename, file, {
              contentType: file.type || "application/octet-stream",
              upsert: true
            });

          if (!uploadError && uploadData) {
            const { data: publicData } = supabase.storage
              .from("evidencias")
              .getPublicUrl(filename);
            formData.set("evidenceUrl", publicData.publicUrl);
            formData.delete("evidence");
          } else {
            console.warn("Direct client storage upload fallback:", uploadError);
          }
        } catch (uploadEx) {
          console.warn("Client upload exception, falling back to server action:", uploadEx);
        }
      }
    }

    try {
      const result = await marcarEjecutada(formData);
      if (result && typeof result === "object" && "error" in result && result.error) {
        setError(result.error as string);
        return;
      }
      onClose();
    } catch (err: any) {
      console.error("Error al guardar ejecución:", err);
      setError(err?.message || "Error al guardar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "10px", maxWidth: "540px", width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        <h2 style={{ marginBottom: "1rem", color: "var(--teal-color)" }}>Confirmar Ejecución</h2>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={mode === "upload" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.88rem" }}
          >
            Subir Archivo
          </button>
          <button
            type="button"
            onClick={() => setMode("sign")}
            className={mode === "sign" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.88rem" }}
          >
            Firma App
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("link");
              if (!employeeLink) handleGenerateLink();
            }}
            className={mode === "link" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.88rem" }}
          >
            Firma a Distancia
          </button>
        </div>

        {mode === "link" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.85rem", color: "#0f766e", lineHeight: 1.4 }}>
              <strong>🔓 Enlaces independientes y sin necesidad de usuario:</strong> El enlace del empleado solo permite firmar asistencia, y el enlace del instructor es exclusivo para cargar la nota, fecha de realización y firma del instructor.
            </div>

            {!employeeLink ? (
              <button type="button" onClick={handleGenerateLink} className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Generando enlaces..." : "Generar Enlaces Seguros"}
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Enlace para el Empleado */}
                <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                    👤 1. Enlace para el Empleado (Capacitado)
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Permite ver el material de capacitación (si fue cargado) y firmar su asistencia.
                  </div>
                  <input type="text" readOnly value={employeeLink} className="form-input" style={{ fontSize: "0.78rem", background: "white" }} />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(employeeLink, "empleado")}
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: "0.82rem" }}
                    >
                      {copiedType === "empleado" ? "✓ ¡Copiado!" : "📋 Copiar Enlace Empleado"}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent("Hola! Por favor confirmá y firmá tu asistencia a la capacitación ingresando a este enlace (no requiere usuario): " + employeeLink)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: "0.82rem", textAlign: "center", textDecoration: "none" }}
                    >
                      📱 Enviar por WhatsApp
                    </a>
                  </div>
                </div>

                {/* Enlace para el Instructor */}
                <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                    👨‍🏫 2. Enlace para el Instructor
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Permite al instructor cargar la <strong>Fecha de Realización</strong>, la <strong>Nota (0-10)</strong>, su nombre y su <strong>Firma Digital</strong> sin ingresar al sistema.
                  </div>
                  <input type="text" readOnly value={instructorLink} className="form-input" style={{ fontSize: "0.78rem", background: "white" }} />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(instructorLink, "instructor")}
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: "0.82rem" }}
                    >
                      {copiedType === "instructor" ? "✓ ¡Copiado!" : "📋 Copiar Enlace Instructor"}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent("Hola! Por favor registrá la fecha de realización, nota y firma de instructor de la capacitación en este enlace (no requiere usuario): " + instructorLink)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: "0.82rem", textAlign: "center", textDecoration: "none" }}
                    >
                      📱 Enviar por WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            )}

            {error && <div style={{ color: "var(--danger-color)", fontSize: "0.875rem" }}>{error}</div>}

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ width: "100%" }}>
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input type="hidden" name="recordId" value={recordId} />
            <input type="hidden" name="mode" value={mode} />

            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Fecha de Realización</label>
                <input type="date" name="completedAt" className="form-input" defaultValue={new Date().toISOString().split("T")[0]} required />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Nota (Opcional, 0 a 10)</label>
                <input type="number" name="score" min="0" max="10" step="0.1" className="form-input" placeholder="Ej. 8" />
              </div>
            </div>

            {mode === "upload" ? (
              <div>
                <label className="form-label">Evidencia (Planilla Firmada)</label>
                <input type="file" name="evidence" className="form-input" accept=".pdf,image/*" required />
              </div>
            ) : (
              <>
                <div>
                  <label className="form-label">Firma del Capacitado</label>
                  <div style={{ border: "1px solid #ccc", borderRadius: "4px", background: "#f9fafb" }}>
                    <SignatureCanvas ref={employeeSigRef} canvasProps={{ width: 430, height: 150, className: "sigCanvas" }} />
                  </div>
                  <button type="button" onClick={() => employeeSigRef.current?.clear()} style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--danger-color)", background: "none", border: "none", cursor: "pointer" }}>
                    Borrar Firma
                  </button>
                </div>

                <div>
                  <label className="form-label">Nombre del Instructor</label>
                  <input type="text" name="instructorName" className="form-input" placeholder="Ej. Juan Pérez" required={mode === "sign"} />
                </div>

                <div>
                  <label className="form-label">Firma del Instructor</label>
                  <div style={{ border: "1px solid #ccc", borderRadius: "4px", background: "#f9fafb" }}>
                    <SignatureCanvas ref={instructorSigRef} canvasProps={{ width: 430, height: 150, className: "sigCanvas" }} />
                  </div>
                  <button type="button" onClick={() => instructorSigRef.current?.clear()} style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--danger-color)", background: "none", border: "none", cursor: "pointer" }}>
                    Borrar Firma
                  </button>
                </div>
              </>
            )}

            {error && <div style={{ color: "var(--danger-color)", fontSize: "0.875rem" }}>{error}</div>}

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Confirmar"}
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }} disabled={isSubmitting}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
