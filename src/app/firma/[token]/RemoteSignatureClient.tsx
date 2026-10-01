"use client";

import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { saveRemoteSignature } from "./actions";
import { MaterialViewerButton, MaterialInfo } from "@/components/MaterialViewerButton";

export default function RemoteSignatureClient({
  recordId,
  trainingName,
  objective,
  employeeName,
  legajo,
  initialRole = "empleado",
  hasEmployeeSignature,
  hasInstructorSignature,
  existingInstructorName,
  existingScore,
  existingCompletedDate,
  material
}: {
  recordId: number;
  trainingName: string;
  objective?: string;
  employeeName: string;
  legajo: string;
  initialRole?: "empleado" | "instructor" | "ambos";
  hasEmployeeSignature: boolean;
  hasInstructorSignature: boolean;
  existingInstructorName?: string;
  existingScore?: string;
  existingCompletedDate?: string;
  material?: MaterialInfo | null;
}) {
  const [role, setRole] = useState<"empleado" | "instructor" | "ambos">(initialRole);
  const employeeSigRef = useRef<any>(null);
  const instructorSigRef = useRef<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("recordId", recordId.toString());
    formData.set("roleMode", role);

    if (role === "empleado" || role === "ambos") {
      if (employeeSigRef.current?.isEmpty()) {
        setError("Por favor, ingresá la firma del empleado antes de enviar.");
        return;
      }
      const empSigDataUrl = employeeSigRef.current.getTrimmedCanvas().toDataURL("image/png");
      formData.set("employeeSignature", empSigDataUrl);
    }

    if (role === "instructor" || role === "ambos") {
      const instName = (formData.get("instructorName") as string)?.trim();
      const compDate = (formData.get("completedAt") as string)?.trim();
      if (!instName) {
        setError("Por favor, ingresá el nombre y apellido del instructor.");
        return;
      }
      if (!compDate) {
        setError("Por favor, seleccioná la fecha de realización.");
        return;
      }
      if (instructorSigRef.current?.isEmpty()) {
        setError("Por favor, ingresá la firma del instructor antes de enviar.");
        return;
      }
      const instSigDataUrl = instructorSigRef.current.getTrimmedCanvas().toDataURL("image/png");
      formData.set("instructorSignature", instSigDataUrl);
    }

    setIsSubmitting(true);

    try {
      const result = await saveRemoteSignature(formData);
      if (result.success) {
        setIsSuccess(true);
      } else {
        setError(result.error || "Ocurrió un error al guardar los datos.");
      }
    } catch (err) {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={{ padding: "2rem 1rem", textAlign: "center", fontFamily: "sans-serif", maxWidth: "520px", margin: "2rem auto", background: "white", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        <img src="/logo.png" alt="AUBASA" style={{ maxWidth: "160px", marginBottom: "1rem" }} />
        <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>✅</div>
        <h2 style={{ color: "#10b981", marginBottom: "0.75rem" }}>
          {role === "instructor"
            ? "¡Evaluación y Firma de Instructor Registradas!"
            : role === "ambos"
            ? "¡Capacitación y Firmas Registradas!"
            : "¡Firma de Asistencia Registrada!"}
        </h2>
        <p style={{ color: "#4b5563", lineHeight: 1.5 }}>
          Los datos de la capacitación <strong>{trainingName}</strong> para <strong>{employeeName}</strong> fueron guardados exitosamente en el sistema.
        </p>
        <p style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "#9ca3af" }}>
          Ya podés cerrar esta ventana.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif", maxWidth: "560px", margin: "0 auto" }}>
      <div style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <img src="/logo.png" alt="AUBASA" style={{ maxWidth: "150px", marginBottom: "0.75rem" }} />
          <h1 style={{ fontSize: "1.35rem", color: "#0f172a", marginBottom: "0.25rem" }}>
            Confirmación de Capacitación
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
            Acceso externo sin necesidad de usuario en el sistema
          </p>
        </div>

        {/* Estado actual de firmas */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <div
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: hasEmployeeSignature ? "#dcfce7" : "#fef3c7",
              color: hasEmployeeSignature ? "#166534" : "#92400e",
              border: `1px solid ${hasEmployeeSignature ? "#bbf7d0" : "#fde68a"}`
            }}
          >
            👤 Firma Empleado: {hasEmployeeSignature ? "✅ Registrada" : "⏳ Pendiente"}
          </div>
          <div
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: hasInstructorSignature ? "#dcfce7" : "#fef3c7",
              color: hasInstructorSignature ? "#166534" : "#92400e",
              border: `1px solid ${hasInstructorSignature ? "#bbf7d0" : "#fde68a"}`
            }}
          >
            👨‍🏫 Firma Instructor: {hasInstructorSignature ? "✅ Registrada" : "⏳ Pendiente"}
          </div>
        </div>

        {/* Datos de la Capacitación */}
        <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1.25rem", border: "1px solid #e2e8f0" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
              Capacitación
            </span>
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "1rem" }}>{trainingName}</div>
          </div>
          {objective && (
            <div style={{ marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Objetivo
              </span>
              <div style={{ color: "#334155", fontSize: "0.875rem" }}>{objective}</div>
            </div>
          )}
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
              Empleado Capacitado
            </span>
            <div style={{ fontWeight: 600, color: "#334155", fontSize: "0.92rem" }}>
              {employeeName} (Legajo: {legajo})
            </div>
          </div>

          {material?.url && (
            <div style={{ marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: "1px solid #e2e8f0" }}>
              <MaterialViewerButton material={material} trainingName={trainingName} fullWidth />
            </div>
          )}
        </div>

        {/* Selector de Rol */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.4rem" }}>
            Seleccioná tu perfil para completar:
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setRole("empleado")}
              style={{
                flex: 1,
                padding: "0.6rem 0.5rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                border: role === "empleado" ? "2px solid #0d9488" : "1px solid #cbd5e1",
                background: role === "empleado" ? "#f0fdfa" : "white",
                color: role === "empleado" ? "#0f766e" : "#475569"
              }}
            >
              👤 Empleado
            </button>
            <button
              type="button"
              onClick={() => setRole("instructor")}
              style={{
                flex: 1,
                padding: "0.6rem 0.5rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                border: role === "instructor" ? "2px solid #0d9488" : "1px solid #cbd5e1",
                background: role === "instructor" ? "#f0fdfa" : "white",
                color: role === "instructor" ? "#0f766e" : "#475569"
              }}
            >
              👨‍🏫 Instructor
            </button>
            <button
              type="button"
              onClick={() => setRole("ambos")}
              style={{
                flex: 1,
                padding: "0.6rem 0.5rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                border: role === "ambos" ? "2px solid #0d9488" : "1px solid #cbd5e1",
                background: role === "ambos" ? "#f0fdfa" : "white",
                color: role === "ambos" ? "#0f766e" : "#475569"
              }}
            >
              👥 Ambos
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {(role === "instructor" || role === "ambos") && (
            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#0f766e" }}>
                📋 Datos de Realización y Evaluación (Instructor)
              </h3>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                  Nombre y Apellido del Instructor *
                </label>
                <input
                  type="text"
                  name="instructorName"
                  defaultValue={existingInstructorName}
                  required
                  placeholder="Ej. Juan Pérez"
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 180px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Fecha de Realización *
                  </label>
                  <input
                    type="date"
                    name="completedAt"
                    defaultValue={existingCompletedDate}
                    required
                    style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
                  />
                </div>

                <div style={{ flex: "1 1 150px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Nota (0 a 10, Opcional)
                  </label>
                  <input
                    type="number"
                    name="score"
                    min="0"
                    max="10"
                    step="0.1"
                    defaultValue={existingScore}
                    placeholder="Ej. 9"
                    style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                  Firma del Instructor *
                </label>
                <div style={{ border: "2px dashed #94a3b8", borderRadius: "8px", background: "white", touchAction: "none" }}>
                  <SignatureCanvas
                    ref={instructorSigRef}
                    canvasProps={{
                      style: { width: "100%", height: "170px", borderRadius: "8px" },
                      className: "sigCanvas"
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                  <button
                    type="button"
                    onClick={() => instructorSigRef.current?.clear()}
                    style={{ fontSize: "0.8rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}
                  >
                    Borrar firma del instructor
                  </button>
                </div>
              </div>
            </div>
          )}

          {(role === "empleado" || role === "ambos") && (
            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                ✍️ Firma del Empleado ({employeeName}) *
              </label>
              <div style={{ border: "2px dashed #94a3b8", borderRadius: "8px", background: "white", touchAction: "none" }}>
                <SignatureCanvas
                  ref={employeeSigRef}
                  canvasProps={{
                    style: { width: "100%", height: "180px", borderRadius: "8px" },
                    className: "sigCanvas"
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                <button
                  type="button"
                  onClick={() => employeeSigRef.current?.clear()}
                  style={{ fontSize: "0.8rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}
                >
                  Borrar firma del empleado
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: "0.75rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "6px", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: "#0d9488",
              color: "white",
              border: "none",
              padding: "0.95rem",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting
              ? "Guardando..."
              : role === "instructor"
              ? "Confirmar Evaluación y Firma del Instructor"
              : role === "ambos"
              ? "Confirmar Ambas Firmas y Evaluación"
              : "Confirmar Asistencia del Empleado"}
          </button>
        </form>
      </div>
    </div>
  );
}
