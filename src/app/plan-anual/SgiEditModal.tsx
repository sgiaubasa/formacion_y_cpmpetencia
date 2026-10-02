"use client";

import { useState } from "react";
import { sgiEditRecord } from "./actions";
import { supabase } from "@/lib/supabase";

export function SgiEditModal({
  recordId,
  currentScheduledDate,
  currentCompletedDate,
  currentScore,
  currentObjective = "",
  onClose
}: {
  recordId: number;
  currentScheduledDate?: string;
  currentCompletedDate?: string;
  currentScore?: string;
  currentObjective?: string;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
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
        }
      } catch (uploadEx) {
        console.warn("Client upload exception in SGI edit:", uploadEx);
      }
    }

    const materialFile = formData.get("materialFile") as File | null;
    if (materialFile && materialFile.size > 0) {
      try {
        const cleanName = materialFile.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `material-${recordId}-${Date.now()}-${cleanName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("evidencias")
          .upload(filename, materialFile, {
            contentType: materialFile.type || "application/octet-stream",
            upsert: true
          });

        if (!uploadError && uploadData) {
          const { data: publicData } = supabase.storage
            .from("evidencias")
            .getPublicUrl(filename);
          formData.set("materialUrl", publicData.publicUrl);
          formData.set("materialName", materialFile.name);
          formData.delete("materialFile");
        }
      } catch (uploadEx) {
        console.warn("Client material upload exception in SGI edit:", uploadEx);
      }
    } else {
      formData.delete("materialFile");
    }

    try {
      const result = await sgiEditRecord(formData);
      if (result && typeof result === "object" && "error" in result && result.error) {
        setError(result.error as string);
        return;
      }
      onClose();
    } catch (err) {
      setError("Error al guardar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "8px", maxWidth: "520px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ marginBottom: "0.75rem", color: "var(--teal-color)" }}>SGI: Modificar Registro</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem", fontSize: "0.875rem" }}>
          Puede modificar el objetivo, las fechas, la nota, adjuntar material de capacitación (PDF/Video) o re-subir la evidencia.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input type="hidden" name="recordId" value={recordId} />

          <div>
            <label className="form-label">Objetivo de la Capacitación</label>
            <input
              type="text"
              name="objective"
              className="form-input"
              defaultValue={currentObjective}
              placeholder="Escriba o modifique el objetivo..."
            />
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Fecha Programada</label>
              <input type="date" name="scheduledDate" className="form-input" defaultValue={currentScheduledDate} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Fecha de Realización</label>
              <input type="date" name="completedAt" className="form-input" defaultValue={currentCompletedDate} />
            </div>
          </div>

          <div>
            <label className="form-label">Nota (Opcional, 0 a 10)</label>
            <input type="number" name="score" min="0" max="10" step="0.1" className="form-input" placeholder="Ej. 8" defaultValue={currentScore} />
          </div>

          <div>
            <label className="form-label">Material de Capacitación (Opcional - PDF o Video)</label>
            <input type="file" name="materialFile" className="form-input" accept=".pdf,video/*" />
            <small style={{ color: "var(--text-secondary)" }}>Opcional: permite adjuntar o actualizar el PDF o video del curso.</small>
          </div>

          <div>
            <label className="form-label">Evidencia / Planilla Firmada (Reemplazar)</label>
            <input type="file" name="evidence" className="form-input" accept=".pdf,image/*" />
            <small style={{ color: "var(--text-secondary)" }}>Si no selecciona un archivo, se mantendrá la evidencia anterior.</small>
          </div>

          {error && <div style={{ color: "var(--error-color)", fontSize: "0.875rem" }}>{error}</div>}

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios (SGI)"}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
