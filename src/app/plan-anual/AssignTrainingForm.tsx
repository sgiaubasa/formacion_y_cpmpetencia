"use client";

import { useState, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { matchesSectorAndGerencia } from "@/components/SectorAndProfileSelects";

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
  allJobProfiles: { id: number; title: string; gerencia?: string | null }[];
  allSectors: { id: number; name: string }[];
  isSector: boolean;
  sectorRoleId?: number;
  allTrainings: { id: number; title: string }[];
  addAdHocNeed: (formData: FormData) => Promise<void>;
}) {
  const [assignmentType, setAssignmentType] = useState<"empleado" | "puesto" | "sector">("empleado");
  const [filterSectorForAssign, setFilterSectorForAssign] = useState<string>(
    isSector && sectorRoleId ? String(sectorRoleId) : ""
  );
  const [empSearchAssign, setEmpSearchAssign] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const filteredSectors =
    isSector && sectorRoleId ? allSectors.filter((s) => s.id === sectorRoleId) : allSectors;

  // Empleados filtrados por el sector elegido y el texto de búsqueda en el panel de programación
  const filteredEmployees = useMemo(() => {
    const secId =
      isSector && sectorRoleId
        ? sectorRoleId
        : filterSectorForAssign
        ? parseInt(filterSectorForAssign, 10)
        : null;
    const q = empSearchAssign.trim().toLowerCase();

    return allEmployees.filter((e) => {
      if (secId && e.sectorId !== secId) return false;
      if (q && !e.name.toLowerCase().includes(q) && !e.legajo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allEmployees, isSector, sectorRoleId, filterSectorForAssign, empSearchAssign]);

  // Puestos filtrados por el sector elegido
  const filteredJobProfiles = useMemo(() => {
    const secId =
      isSector && sectorRoleId
        ? sectorRoleId
        : filterSectorForAssign
        ? parseInt(filterSectorForAssign, 10)
        : null;
    if (!secId) return allJobProfiles;
    const secObj = allSectors.find((s) => s.id === secId);
    if (!secObj) return allJobProfiles;
    return allJobProfiles.filter((p) => matchesSectorAndGerencia(secObj.name, p.gerencia));
  }, [allJobProfiles, allSectors, isSector, sectorRoleId, filterSectorForAssign]);

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
      setEmpSearchAssign("");
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
      <div style={{ flex: "1 1 170px" }}>
        <label className="form-label">Asignar a:</label>
        <select
          name="assignmentType"
          className="form-input"
          value={assignmentType}
          onChange={(e) => setAssignmentType(e.target.value as "empleado" | "puesto" | "sector")}
          required
          style={{ borderRadius: "10px" }}
        >
          <option value="empleado">Un Empleado</option>
          <option value="puesto">Un Perfil (Puesto)</option>
          <option value="sector">Una Gerencia / Sector</option>
        </select>
      </div>

      {(assignmentType === "empleado" || assignmentType === "puesto") && !isSector && (
        <div style={{ flex: "1 1 170px" }}>
          <label className="form-label">Filtrar por Sector (Opcional)</label>
          <select
            className="form-input"
            value={filterSectorForAssign}
            onChange={(e) => setFilterSectorForAssign(e.target.value)}
            style={{ borderRadius: "10px" }}
          >
            <option value="">Todos los sectores</option>
            {allSectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {assignmentType === "empleado" && (
        <div style={{ flex: "1 1 170px" }}>
          <label className="form-label">Buscar Nombre / Legajo</label>
          <input
            type="text"
            value={empSearchAssign}
            onChange={(e) => setEmpSearchAssign(e.target.value)}
            placeholder="Escribir para filtrar..."
            className="form-input"
            style={{ borderRadius: "10px" }}
          />
        </div>
      )}

      <div style={{ flex: "1.3 1 220px" }}>
        {assignmentType === "empleado" && (
          <>
            <label className="form-label">Empleado a Capacitar ({filteredEmployees.length}) *</label>
            <select name="employeeId" className="form-input" required style={{ borderRadius: "10px" }}>
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
            <label className="form-label">Perfil de Puesto ({filteredJobProfiles.length}) *</label>
            <select name="jobProfileId" className="form-input" required style={{ borderRadius: "10px" }}>
              <option value="">Seleccione un puesto...</option>
              {filteredJobProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </>
        )}
        {assignmentType === "sector" && (
          <>
            <label className="form-label">Gerencia / Sector *</label>
            <select name="targetSectorId" className="form-input" required style={{ borderRadius: "10px" }}>
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

      <div style={{ flex: "1.2 1 200px" }}>
        <label className="form-label">Tema de Capacitación *</label>
        <select name="trainingName" className="form-input" required style={{ borderRadius: "10px" }}>
          <option value="">Seleccione un tema...</option>
          {allTrainings.map((t) => (
            <option key={t.id} value={t.title}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      <div style={{ flex: "1.2 1 200px" }}>
        <label className="form-label">Objetivo *</label>
        <input
          type="text"
          name="objective"
          className="form-input"
          style={{ borderRadius: "10px" }}
          required
          placeholder="Escriba el objetivo..."
        />
      </div>

      <div style={{ flex: "1 1 150px" }}>
        <label className="form-label">Fecha Programada *</label>
        <input type="date" name="scheduledDate" className="form-input" style={{ borderRadius: "10px" }} required />
      </div>

      <div style={{ flex: "1.2 1 230px" }}>
        <label className="form-label">Material (PDF / Video - Opcional)</label>
        <input
          type="file"
          name="materialFile"
          accept=".pdf,video/*"
          className="form-input"
          style={{ borderRadius: "10px", fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
        />
      </div>

      <button
        type="submit"
        disabled={isUploading}
        className="btn btn-primary"
        style={{ padding: "0.5rem 1.5rem", height: "42px", borderRadius: "10px", fontWeight: 700 }}
      >
        {isUploading ? "Guardando..." : "➕ Programar en el Plan"}
      </button>
    </form>
  );
}
