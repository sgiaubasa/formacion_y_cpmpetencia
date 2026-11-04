"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

interface SectorItem {
  id: number;
  name: string;
}

interface ProfileItem {
  id: number;
  title: string;
  gerencia?: string | null;
}

function normalizeStr(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function cleanGerenciaName(s: string): string {
  return normalizeStr(s)
    .replace(/^(gerencia\s+de\s+|subgerencia\s+de\s+|sector\s+de\s+|gerencia\s+|subgerencia\s+|sector\s+)/g, "")
    .trim();
}

export function matchesSectorAndGerencia(sectorName: string, profileGerencia?: string | null): boolean {
  if (!sectorName || !profileGerencia) return false;
  const sNorm = cleanGerenciaName(sectorName);
  const gNorm = cleanGerenciaName(profileGerencia);
  if (sNorm === gNorm) return true;
  if (sNorm.includes(gNorm) || gNorm.includes(sNorm)) return true;

  // Agrupación de Prevención y Seguridad Integral con sus subsectores (Asistencia Vial, CCM, SVIA, etc.)
  const isPrevSector = /prevencion|seguridad|asistencia|svia|monitoreo|ccm/i.test(sectorName);
  const isPrevGerencia = /prevencion|seguridad|asistencia|svia|monitoreo|ccm/i.test(profileGerencia);
  if (isPrevSector && isPrevGerencia) return true;

  // Agrupación de Operaciones (Operaciones, SVIA Operaciones, etc.)
  const isOpSector = /operacion/i.test(sectorName);
  const isOpGerencia = /operacion/i.test(profileGerencia);
  if (isOpSector && isOpGerencia) return true;

  return false;
}

export function SectorAndProfileSelects({
  sectores,
  perfiles,
  defaultSectorId,
  defaultJobProfileId,
  lockedSector,
  mode = "create"
}: {
  sectores: SectorItem[];
  perfiles: ProfileItem[];
  defaultSectorId?: number | string;
  defaultJobProfileId?: number | string | null;
  lockedSector?: { id: number; name: string } | null;
  mode?: "create" | "edit";
}) {
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    lockedSector
      ? String(lockedSector.id)
      : defaultSectorId
      ? String(defaultSectorId)
      : ""
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    defaultJobProfileId ? String(defaultJobProfileId) : ""
  );

  const selectedSector = useMemo(() => {
    if (lockedSector) return lockedSector;
    if (!selectedSectorId) return null;
    return sectores.find((s) => String(s.id) === String(selectedSectorId)) || null;
  }, [lockedSector, selectedSectorId, sectores]);

  const filteredProfiles = useMemo(() => {
    if (!selectedSector) return [];
    const matched = perfiles.filter((p) => matchesSectorAndGerencia(selectedSector.name, p.gerencia));

    // Si estamos editando y el empleado ya tiene un perfil asignado,
    // garantizar que SIEMPRE aparezca en la lista para que el navegador jamás lo deseleccione al guardar otro campo (como Base Operativa).
    if (defaultJobProfileId) {
      const currentProf = perfiles.find((p) => String(p.id) === String(defaultJobProfileId));
      if (currentProf && !matched.some((p) => String(p.id) === String(defaultJobProfileId))) {
        return [currentProf, ...matched];
      }
    }
    return matched;
  }, [perfiles, selectedSector, defaultJobProfileId]);

  const handleSectorChange = (newSectorId: string) => {
    setSelectedSectorId(newSectorId);
    const nextSec = sectores.find((s) => String(s.id) === String(newSectorId));
    if (nextSec && selectedProfileId) {
      const currentProf = perfiles.find((p) => String(p.id) === String(selectedProfileId));
      if (!currentProf || !matchesSectorAndGerencia(nextSec.name, currentProf.gerencia)) {
        setSelectedProfileId("");
      }
    } else {
      setSelectedProfileId("");
    }
  };

  return (
    <>
      <div className="form-group">
        <label className="form-label">
          {mode === "create" ? "Sector a la que pertenece" : "Sector / Gerencia"}
        </label>
        {lockedSector ? (
          <>
            <input type="text" className="form-input" value={lockedSector.name} disabled />
            <input type="hidden" name="sectorId" value={lockedSector.id} />
            <small style={{ color: "var(--text-secondary)", display: "block", marginTop: "0.25rem" }}>
              Fijado a tu gerencia ({lockedSector.name}).
            </small>
          </>
        ) : (
          <>
            <select
              name="sectorId"
              required
              className="form-input"
              value={selectedSectorId}
              onChange={(e) => handleSectorChange(e.target.value)}
            >
              <option value="">Seleccione un sector...</option>
              {sectores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {mode === "create" && (
              <small style={{ color: "var(--text-secondary)", display: "block", marginTop: "0.25rem" }}>
                Los sectores disponibles provienen de tu histórico migrado.
              </small>
            )}
          </>
        )}
      </div>

      <div
        className="form-group"
        style={
          mode === "edit"
            ? {
                padding: "1rem",
                backgroundColor: "#f8fafc",
                borderRadius: "4px",
                border: "1px solid #e2e8f0"
              }
            : undefined
        }
      >
        <label
          className="form-label"
          style={mode === "edit" ? { color: "var(--primary-color)" } : undefined}
        >
          {mode === "create"
            ? `Perfil de Puesto (Norma ISO)${selectedSector ? ` — ${selectedSector.name}` : ""}`
            : `Asignar Perfil de Puesto${selectedSector ? ` — ${selectedSector.name}` : ""}`}
        </label>
        {mode === "edit" && (
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Si cambias el perfil de puesto, podrás ir a la pestaña &ldquo;Evaluación y Brechas&rdquo; para ver qué capacitaciones le faltan de su nuevo perfil.
          </p>
        )}
        <select
          name="jobProfileId"
          className="form-input"
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          disabled={!selectedSector}
        >
          <option value="">
            {!selectedSector
              ? "Seleccione primero un sector..."
              : mode === "create"
              ? "Sin asignar por ahora (En inducción)"
              : "-- Sin perfil asignado --"}
          </option>
          {filteredProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        {mode === "create" ? (
          <small style={{ color: "var(--text-secondary)", display: "block", marginTop: "0.25rem" }}>
            {selectedSector
              ? `Mostrando únicamente los ${filteredProfiles.length} puestos pertenecientes a ${selectedSector.name}.`
              : "Vincular a un puesto activará automáticamente el Análisis de Brechas."}
          </small>
        ) : (
          selectedProfileId && (
            <div style={{ marginTop: "0.5rem" }}>
              <Link
                href={`/perfiles/${selectedProfileId}`}
                target="_blank"
                style={{
                  color: "var(--primary-color)",
                  textDecoration: "underline",
                  fontSize: "0.875rem"
                }}
              >
                Ver Perfil Asignado
              </Link>
            </div>
          )
        )}
      </div>
    </>
  );
}
