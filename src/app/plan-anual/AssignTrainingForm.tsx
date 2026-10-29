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
  addAdHocNeed: (formData: FormData) => Promise<{ instructorToken?: string } | void>;
}) {
  const [assignmentType, setAssignmentType] = useState<"empleado" | "puesto" | "sector">("empleado");
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    setGeneratedInstructorLink(null);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("instructorName", instructorName.trim());
      formData.set("instructorSignatureMode", instructorSignatureMode);

      const materialFile = formData.get("materialFile") as File | null;

      if (materialChoice !== "none" && materialFile && materialFile.size > 0) {
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
            formData.set("materialType", materialChoice);
            formData.delete("materialFile");
          } else {
            console.warn("Direct material upload fallback:", uploadError);
          }
        } catch (uploadEx) {
          console.warn("Client material upload exception:", uploadEx);
        }
      } else if (materialChoice !== "none" && materialLinkInput.trim()) {
        formData.set("materialUrl", materialLinkInput.trim());
        formData.set(
          "materialName",
          materialChoice === "video" ? "Video de Capacitación" : "Documento PDF de Capacitación"
        );
        formData.set("materialType", materialChoice);
        formData.delete("materialFile");
      } else {
        formData.delete("materialFile");
      }

      const res = await addAdHocNeed(formData);
      if (res && typeof res === "object" && "instructorToken" in res && res.instructorToken) {
        setGeneratedInstructorLink(`${window.location.origin}/firma/${res.instructorToken}`);
      }
      formRef.current?.reset();
      setEmpSearchAssign("");
      setMaterialLinkInput("");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#92400e" }}>
              {materialChoice === "pdf"
                ? "📄 Archivo PDF o Enlace para lectura interactiva:"
                : "🎬 Archivo de Video (.mp4) o Link (YouTube / Drive):"}
            </label>
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
                  ? "O pegá aquí el link directo al PDF..."
                  : "O pegá aquí el link de YouTube / Drive / MP4..."
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
  );
}
