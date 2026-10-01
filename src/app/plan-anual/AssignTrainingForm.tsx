"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function AssignTrainingForm({
  allEmployees,
  allJobProfiles,
  allSectors,
  isSector,
  sectorRoleId,
  allTrainings = [],
  addAdHocNeed
}: {
  allEmployees: { id: number; name: string; legajo: string; sectorId: number }[];
  allJobProfiles: { id: number; title: string }[];
  allSectors: { id: number; name: string }[];
  isSector: boolean;
  sectorRoleId?: number;
  allTrainings: { id: number; title: string }[];
  addAdHocNeed: (formData: FormData) => Promise<void>;
}) {
  const [assignmentType, setAssignmentType] = useState<"empleado" | "puesto" | "sector">("empleado");
  const [isUploading, setIsUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Filtrar si es un usuario de sector
  const filteredEmployees =
    isSector && sectorRoleId ? allEmployees.filter((e) => e.sectorId === sectorRoleId) : allEmployees;
  const filteredSectors =
    isSector && sectorRoleId ? allSectors.filter((s) => s.id === sectorRoleId) : allSectors;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const materialFile = formData.get("materialFile") as File | null;

      if (materialFile && materialFile.size > 0) {
        try {
          const cleanName = materialFile.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9.-]/g, "_");
          const filename = `material-${Date.now()}-${cleanName}`;

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
          } else {
            console.warn("Direct material upload fallback:", uploadError);
          }
        } catch (uploadEx) {
          console.warn("Client material upload exception:", uploadEx);
        }
      } else {
        formData.delete("materialFile");
      }

      await addAdHocNeed(formData);
      formRef.current?.reset();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}
    >
      <div style={{ flex: "1 1 180px" }}>
        <label className="form-label">Asignar a:</label>
        <select
          name="assignmentType"
          className="form-input"
          value={assignmentType}
          onChange={(e) => setAssignmentType(e.target.value as "empleado" | "puesto" | "sector")}
          required
          style={{ borderRadius: "20px" }}
        >
          <option value="empleado">Un Empleado</option>
          <option value="puesto">Un Perfil (Puesto)</option>
          <option value="sector">Una Gerencia / Sector</option>
        </select>
      </div>

      <div style={{ flex: "1 1 200px" }}>
        {assignmentType === "empleado" && (
          <>
            <label className="form-label">Empleado</label>
            <select name="employeeId" className="form-input" required style={{ borderRadius: "20px" }}>
              <option value="">Seleccione un empleado...</option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.legajo})
                </option>
              ))}
            </select>
          </>
        )}
        {assignmentType === "puesto" && (
          <>
            <label className="form-label">Perfil de Puesto</label>
            <select name="jobProfileId" className="form-input" required style={{ borderRadius: "20px" }}>
              <option value="">Seleccione un puesto...</option>
              {allJobProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </>
        )}
        {assignmentType === "sector" && (
          <>
            <label className="form-label">Gerencia / Sector</label>
            <select name="targetSectorId" className="form-input" required style={{ borderRadius: "20px" }}>
              <option value="">Seleccione un sector...</option>
              {filteredSectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div style={{ flex: "1 1 200px" }}>
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          Tema de Capacitación
          <span
            title="Seleccione la capacitación que se dictará"
            style={{
              cursor: "help",
              color: "var(--text-secondary)",
              background: "#e2e8f0",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.65rem",
              fontWeight: "bold"
            }}
          >
            ?
          </span>
        </label>
        <select name="trainingName" className="form-input" required style={{ borderRadius: "20px" }}>
          <option value="">Seleccione un tema...</option>
          {allTrainings.map((t) => (
            <option key={t.id} value={t.title}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      <div style={{ flex: "1 1 200px" }}>
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          Objetivo
          <span
            title="Objetivo de la capacitación"
            style={{
              cursor: "help",
              color: "var(--text-secondary)",
              background: "#e2e8f0",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.65rem",
              fontWeight: "bold"
            }}
          >
            ?
          </span>
        </label>
        <input
          type="text"
          name="objective"
          className="form-input"
          style={{ borderRadius: "20px" }}
          required
          placeholder="Escriba el objetivo..."
        />
      </div>

      <div style={{ flex: "1 1 160px" }}>
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          Fecha Programada
          <span
            title="Día planificado para realizarla"
            style={{
              cursor: "help",
              color: "var(--text-secondary)",
              background: "#e2e8f0",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.65rem",
              fontWeight: "bold"
            }}
          >
            ?
          </span>
        </label>
        <input type="date" name="scheduledDate" className="form-input" style={{ borderRadius: "20px" }} required />
      </div>

      <div style={{ flex: "1 1 230px" }}>
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          Material (PDF / Video - Opcional)
          <span
            title="Opcional: suba un PDF o video de capacitación para que quede guardado y disponible para ver en la app"
            style={{
              cursor: "help",
              color: "var(--text-secondary)",
              background: "#e2e8f0",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.65rem",
              fontWeight: "bold"
            }}
          >
            ?
          </span>
        </label>
        <input
          type="file"
          name="materialFile"
          accept=".pdf,video/*"
          className="form-input"
          style={{ borderRadius: "20px", fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
        />
      </div>

      <button
        type="submit"
        disabled={isUploading}
        className="btn btn-primary"
        style={{ padding: "0.5rem 1.5rem", height: "42px", borderRadius: "20px" }}
      >
        {isUploading ? "Guardando..." : "Asignar al Plan"}
      </button>
    </form>
  );
}
