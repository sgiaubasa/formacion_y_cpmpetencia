"use client";

import { useState, useRef, useMemo } from "react";
import { uploadFileZeroEgress, DEFAULT_ONEDRIVE_FOLDER_URL } from "@/lib/cloudStorage";
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
  allTrainings: { id: number; title: string; allSectors?: boolean; sectors?: string[] }[];
  addAdHocNeed: (formData: FormData) => Promise<{ instructorToken?: string } | void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState<"empleado" | "puesto" | "sector">("empleado");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [filterSectorForAssign, setFilterSectorForAssign] = useState<string>(
    isSector && sectorRoleId ? String(sectorRoleId) : ""
  );
  const [empSearchAssign, setEmpSearchAssign] = useState("");
  const [materialChoice, setMaterialChoice] = useState<"none" | "pdf" | "video">("none");
  const [materialLinkInput, setMaterialLinkInput] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [instructorSignatureMode, setInstructorSignatureMode] = useState<"digital" | "link">(
    "digital"
  );
  const [generatedInstructorLink, setGeneratedInstructorLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleToggleEmployee = (id: number) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredEmployees.map((e) => e.id);
    setSelectedEmployeeIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleClearSelectedEmployees = () => {
    setSelectedEmployeeIds([]);
  };

  const filteredSectors =
    isSector && sectorRoleId ? allSectors.filter((s) => s.id === sectorRoleId) : allSectors;

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

  const availableTrainingsForForm = useMemo(() => {
    if (isSector) return allTrainings;

    // Si el admin eligió filtrar por un sector en el formulario
    const activeSectorId = filterSectorForAssign;
    if (!activeSectorId) return allTrainings;

    const chosenSector = allSectors.find((s) => String(s.id) === activeSectorId);
    if (!chosenSector) return allTrainings;

    return allTrainings.filter(
      (t) => t.allSectors || !t.sectors || t.sectors.length === 0 || t.sectors.includes(chosenSector.name)
    );
  }, [allTrainings, isSector, filterSectorForAssign, allSectors]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (assignmentType === "empleado" && selectedEmployeeIds.length === 0) {
      alert("Por favor seleccioná al menos un empleado para programar la capacitación.");
      return;
    }

    setIsUploading(true);
    setGeneratedInstructorLink(null);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("instructorName", instructorName.trim());
      formData.set("instructorSignatureMode", instructorSignatureMode);

      if (assignmentType === "empleado") {
        selectedEmployeeIds.forEach((id) => {
          formData.append("employeeIds", String(id));
        });
        if (selectedEmployeeIds.length === 1) {
          formData.set("employeeId", String(selectedEmployeeIds[0]));
        }
      }

      const materialFile = formData.get("materialFile") as File | null;

      if (materialChoice !== "none" && materialLinkInput.trim()) {
        formData.set("materialUrl", materialLinkInput.trim());
        formData.set(
          "materialName",
          materialChoice === "video" ? "Video de Capacitación" : "Documento PDF de Capacitación"
        );
        formData.set("materialType", materialChoice);
        formData.delete("materialFile");
      } else if (materialChoice !== "none" && materialFile && materialFile.size > 0) {
        const uploaded = await uploadFileZeroEgress(
          materialFile,
          materialChoice === "video" ? "video" : "material"
        );
        if (uploaded.ok && uploaded.url) {
          formData.set("materialUrl", uploaded.url);
          formData.set("materialName", materialFile.name);
          formData.set("materialType", materialChoice);
          formData.delete("materialFile");
        } else {
          alert(
            uploaded.error ||
              "Para archivos pesados, subilo a tu OneDrive Corporativo AUBASA y pegá el link compartido."
          );
          setIsUploading(false);
          return;
        }
      } else {
        formData.delete("materialFile");
      }

      const res = await addAdHocNeed(formData);
      if (res && typeof res === "object" && "instructorToken" in res && res.instructorToken) {
        setGeneratedInstructorLink(`${window.location.origin}/firma/${res.instructorToken}`);
      }
      formRef.current?.reset();
      setSelectedEmployeeIds([]);
      setEmpSearchAssign("");
      setMaterialLinkInput("");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        marginBottom: "1.1rem",
        borderLeft: "6px solid var(--teal-color)",
        background: "linear-gradient(to right, #f0fdfa, #ffffff 35%)",
        boxShadow: "0 4px 12px rgba(13, 148, 136, 0.08)",
        padding: "1.1rem 1.5rem"
      }}
    >
      {/* CABECERA DESPLEGABLE CLICKEABLE */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          cursor: "pointer",
          userSelect: "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap" }}>
          <span
            style={{
              background: "var(--teal-color)",
              color: "white",
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "0.25rem 0.65rem",
              borderRadius: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.04em"
            }}
          >
            ➕ Cargar Nueva Capacitación
          </span>
          <h3 style={{ margin: 0, color: "var(--primary-color)", fontSize: "1.1rem" }}>
            Programar y Asignar Capacitación al Plan
          </h3>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="btn"
          style={{
            backgroundColor: isOpen ? "#f1f5f9" : "#0d8383",
            color: isOpen ? "#1e293b" : "#ffffff",
            fontWeight: 700,
            fontSize: "0.84rem",
            padding: "0.45rem 1rem",
            borderRadius: "8px",
            border: isOpen ? "1px solid #cbd5e1" : "none"
          }}
        >
          {isOpen ? "▲ Ocultar Panel de Programación" : "▼ Desplegar para Programar Capacitación"}
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            marginTop: "1rem",
            paddingTop: "1rem",
            borderTop: "1px solid #cbd5e1",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "#475569", margin: 0 }}>
            Completá este formulario para programar una nueva capacitación a un empleado, puesto o sector, definir el Instructor (con firma digital o vía link para todas las planillas) y adjuntar el material interactivo en PDF o Video.
          </p>

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
                <option value="empleado">Uno o Varios Empleados (A elección)</option>
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
              <div style={{ flex: "1 1 220px" }}>
                <label className="form-label">Buscar Nombre / Legajo</label>
                <input
                  type="text"
                  value={empSearchAssign}
                  onChange={(e) => setEmpSearchAssign(e.target.value)}
                  placeholder="Escribir para filtrar lista..."
                  className="form-input"
                  style={{ borderRadius: "10px" }}
                />
              </div>
            )}

            {/* SELECCIÓN MÚLTIPLE DE EMPLEADOS A ELECCIÓN */}
            {assignmentType === "empleado" && (
              <div
                style={{
                  flex: "1 1 100%",
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                  margin: "0.25rem 0"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginBottom: "0.5rem"
                  }}
                >
                  <label className="form-label" style={{ fontWeight: 700, margin: 0, color: "#1b365d" }}>
                    👥 Empleados a Capacitar: {selectedEmployeeIds.length} seleccionados (de {filteredEmployees.length} encontrados) *
                  </label>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--teal-color)",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        fontWeight: 700,
                        textDecoration: "underline"
                      }}
                    >
                      ☑️ Seleccionar Todos los Filtrados ({filteredEmployees.length})
                    </button>
                    <span style={{ color: "#cbd5e1" }}>|</span>
                    <button
                      type="button"
                      onClick={handleClearSelectedEmployees}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        fontWeight: 700,
                        textDecoration: "underline"
                      }}
                    >
                      ✕ Desmarcar Todos
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "0.4rem",
                    maxHeight: "180px",
                    overflowY: "auto",
                    background: "#ffffff",
                    padding: "0.5rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1"
                  }}
                >
                  {filteredEmployees.map((e) => {
                    const isChecked = selectedEmployeeIds.includes(e.id);
                    return (
                      <label
                        key={e.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.35rem 0.55rem",
                          borderRadius: "6px",
                          backgroundColor: isChecked ? "#f0fdfa" : "transparent",
                          border: isChecked ? "1px solid #99f6e4" : "1px solid transparent",
                          cursor: "pointer",
                          fontSize: "0.84rem",
                          fontWeight: isChecked ? 700 : 400,
                          color: isChecked ? "#0f766e" : "#334155",
                          userSelect: "none"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEmployee(e.id)}
                        />
                        <span>
                          {e.name} <strong style={{ color: "#64748b" }}>({e.legajo})</strong>
                        </span>
                      </label>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                      No se encontraron empleados con los filtros aplicados.
                    </div>
                  )}
                </div>

                {selectedEmployeeIds.length > 0 && (
                  <div style={{ marginTop: "0.6rem", display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginRight: "0.25rem" }}>
                      Seleccionados:
                    </span>
                    {selectedEmployeeIds.slice(0, 10).map((id) => {
                      const emp = allEmployees.find((e) => e.id === id);
                      if (!emp) return null;
                      return (
                        <span
                          key={id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            backgroundColor: "#ccfbf1",
                            color: "#0f766e",
                            border: "1px solid #99f6e4",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "6px",
                            fontSize: "0.76rem",
                            fontWeight: 600
                          }}
                        >
                          {emp.name} ({emp.legajo})
                          <button
                            type="button"
                            onClick={() => handleToggleEmployee(id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#0f766e",
                              cursor: "pointer",
                              padding: 0,
                              fontWeight: 700,
                              marginLeft: "0.2rem"
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                    {selectedEmployeeIds.length > 10 && (
                      <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                        + {selectedEmployeeIds.length - 10} más
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {assignmentType !== "empleado" && (
              <div style={{ flex: "1.3 1 220px" }}>
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
            )}

            <div style={{ flex: "1.2 1 200px" }}>
              <label className="form-label">Tema de Capacitación *</label>
              <select name="trainingName" className="form-input" required style={{ borderRadius: "10px" }}>
                <option value="">Seleccione un tema...</option>
                {availableTrainingsForForm.map((t) => (
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

            {/* INSTRUCTOR Y MODALIDAD DE FIRMA */}
            <div style={{ flex: "1.2 1 210px" }}>
              <label className="form-label">Instructor (Opcional)</label>
              <input
                type="text"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                placeholder="Ej: David Ceballos / Horacio San Martin"
                className="form-input"
                style={{ borderRadius: "10px" }}
              />
            </div>

            <div style={{ flex: "1.3 1 230px" }}>
              <label className="form-label">Firma del Instructor en Planillas</label>
              <select
                value={instructorSignatureMode}
                onChange={(e) => setInstructorSignatureMode(e.target.value as "digital" | "link")}
                className="form-input"
                style={{ borderRadius: "10px" }}
              >
                <option value="digital">🖥️ Firma Digital Automática</option>
                <option value="link">✍️ Generar Link para Firma del Instructor</option>
              </select>
            </div>

            {/* MATERIAL INTERACTIVO: ELEGIR PDF O VIDEO */}
            <div style={{ flex: "1.2 1 200px" }}>
              <label className="form-label">Tipo de Material Interactivo</label>
              <select
                value={materialChoice}
                onChange={(e) => setMaterialChoice(e.target.value as "none" | "pdf" | "video")}
                className="form-input"
                style={{ borderRadius: "10px" }}
              >
                <option value="none">Sin material adjunto</option>
                <option value="pdf">📄 Subir / Vincular Documento PDF</option>
                <option value="video">🎬 Subir / Vincular Video</option>
              </select>
            </div>

            {materialChoice !== "none" && (
              <div
                style={{
                  flex: "2 1 320px",
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fcd34d",
                  borderRadius: "10px",
                  padding: "0.65rem 0.85rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#92400e" }}>
                    {materialChoice === "pdf"
                      ? "📄 Subí el PDF desde tu PC (se genera la URL sola y se ve en la App):"
                      : "🎬 Subí el Video (.mp4) desde tu PC (se genera la URL sola y se ve en la App):"}
                  </label>
                </div>
                <input
                  type="file"
                  name="materialFile"
                  accept={materialChoice === "pdf" ? ".pdf,application/pdf" : "video/*"}
                  className="form-input"
                  style={{ borderRadius: "8px", fontSize: "0.78rem", padding: "0.3rem", backgroundColor: "#ffffff" }}
                />
                <input
                  type="url"
                  value={materialLinkInput}
                  onChange={(e) => setMaterialLinkInput(e.target.value)}
                  placeholder={
                    materialChoice === "pdf"
                      ? "Opcional: o pegá un link externo si ya lo tenías en la web..."
                      : "Opcional: o pegá un link de YouTube / Drive / OneDrive..."
                  }
                  className="form-input"
                  style={{ borderRadius: "8px", fontSize: "0.78rem", padding: "0.35rem 0.6rem", backgroundColor: "#ffffff" }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading}
              className="btn btn-primary"
              style={{ padding: "0.65rem 1.75rem", height: "42px", borderRadius: "10px", fontWeight: 600 }}
            >
              {isUploading ? "Subiendo y Programando..." : "Programar"}
            </button>
          </form>

          {generatedInstructorLink && (
            <div
              style={{
                backgroundColor: "#f0fdfa",
                border: "2px solid #0d8383",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem"
              }}
            >
              <div style={{ fontWeight: 700, color: "#1b365d", fontSize: "0.95rem" }}>
                ✍️ Enlace de Firma del Instructor generado para todas las planillas de esta capacitación:
              </div>
              <div style={{ fontSize: "0.84rem", color: "#334155" }}>
                Compartile este enlace al Instructor. Cuando firme una sola vez, su firma aparecerá automáticamente en todas las planillas de asistencia de este tema:
              </div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  readOnly
                  value={generatedInstructorLink}
                  className="form-input"
                  style={{ flex: "1 1 300px", backgroundColor: "#ffffff", fontSize: "0.85rem" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedInstructorLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className="btn btn-secondary"
                  style={{ fontWeight: 700, fontSize: "0.84rem" }}
                >
                  {copiedLink ? "✓ ¡Copiado!" : "📋 Copiar Link Instructor"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    "Hola! Por favor registrá tu firma de instructor para las planillas de la capacitación en este enlace: " +
                      generatedInstructorLink
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ textDecoration: "none", fontSize: "0.84rem", backgroundColor: "#0d8383" }}
                >
                  📱 Enviar por WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
