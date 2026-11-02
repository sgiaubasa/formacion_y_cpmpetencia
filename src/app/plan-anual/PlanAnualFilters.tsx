"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BASES_OPERATIVAS } from "@/lib/constants";
import { getUniqueCanonicalTopics } from "@/lib/canonicalTrainings";

interface EmployeeItem {
  id: number;
  name: string;
  legajo: string;
  sectorId: number;
  jobProfileId: number | null;
  baseOperativa?: string | null;
}

interface JobProfileItem {
  id: number;
  title: string;
  gerencia?: string | null;
}

interface SectorItem {
  id: number;
  name: string;
}

export function PlanAnualFilters({
  allSectors,
  allJobProfiles,
  allEmployees,
  allTrainings,
  isSector,
  initialSectorId,
  initialBaseOperativa,
  initialJobProfileId,
  initialEmployeeId,
  initialEmpSearch,
  initialStatusFilter,
  initialTopicQuery
}: {
  allSectors: SectorItem[];
  allJobProfiles: JobProfileItem[];
  allEmployees: EmployeeItem[];
  allTrainings: { id: number; title: string }[];
  isSector: boolean;
  initialSectorId?: string;
  initialBaseOperativa?: string;
  initialJobProfileId?: string;
  initialEmployeeId?: string;
  initialEmpSearch?: string;
  initialStatusFilter?: string;
  initialTopicQuery?: string;
}) {
  const router = useRouter();

  const [selectedSectorId, setSelectedSectorId] = useState(initialSectorId || "");
  const [selectedBase, setSelectedBase] = useState(initialBaseOperativa || "");
  const [selectedJobProfileId, setSelectedJobProfileId] = useState(initialJobProfileId || "");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployeeId || "");
  const [empSearch, setEmpSearch] = useState(initialEmpSearch || "");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || "");
  const [topicQuery, setTopicQuery] = useState(initialTopicQuery || "");

  // 1. Bases operativas dinámicas según el sector elegido
  const availableBases = useMemo(() => {
    if (!selectedSectorId) return BASES_OPERATIVAS;
    const secIdNum = parseInt(selectedSectorId, 10);
    const basesInSector = new Set<string>();
    allEmployees.forEach((e) => {
      if (e.sectorId === secIdNum && e.baseOperativa) {
        basesInSector.add(e.baseOperativa);
      }
    });
    if (basesInSector.size > 0) {
      return Array.from(basesInSector).sort((a, b) => a.localeCompare(b, "es"));
    }
    return BASES_OPERATIVAS;
  }, [selectedSectorId, allEmployees]);

  // 2. Filtrar puestos según el sector elegido y la base operativa
  const filteredJobProfiles = useMemo(() => {
    let pool = allEmployees;
    if (selectedSectorId) {
      const secIdNum = parseInt(selectedSectorId, 10);
      pool = pool.filter((e) => e.sectorId === secIdNum);
    }
    if (selectedBase) {
      pool = pool.filter((e) => e.baseOperativa === selectedBase);
    }

    const profileIds = new Set(pool.filter((e) => e.jobProfileId).map((e) => e.jobProfileId as number));

    if (selectedSectorId) {
      const secIdNum = parseInt(selectedSectorId, 10);
      const selectedSectorObj = allSectors.find((s) => s.id === secIdNum);
      return allJobProfiles.filter(
        (jp) =>
          profileIds.has(jp.id) ||
          (selectedSectorObj &&
            !selectedBase &&
            jp.gerencia &&
            jp.gerencia.toLowerCase().trim() === selectedSectorObj.name.toLowerCase().trim())
      );
    }

    if (selectedBase) {
      return allJobProfiles.filter((jp) => profileIds.has(jp.id));
    }

    return allJobProfiles;
  }, [selectedSectorId, selectedBase, allJobProfiles, allEmployees, allSectors]);

  // 3. Filtrar empleados según el sector elegido, base, puesto elegido y texto escrito
  const filteredEmployees = useMemo(() => {
    const secIdNum = selectedSectorId ? parseInt(selectedSectorId, 10) : null;
    const profIdNum = selectedJobProfileId ? parseInt(selectedJobProfileId, 10) : null;
    const searchLower = empSearch.trim().toLowerCase();

    return allEmployees.filter((e) => {
      if (secIdNum && e.sectorId !== secIdNum) return false;
      if (selectedBase && e.baseOperativa !== selectedBase) return false;
      if (profIdNum && e.jobProfileId !== profIdNum) return false;
      if (
        searchLower &&
        !e.name.toLowerCase().includes(searchLower) &&
        !e.legajo.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
      return true;
    });
  }, [selectedSectorId, selectedBase, selectedJobProfileId, empSearch, allEmployees]);

  // 4. Lista de temas de capacitación unificados (canónicos, sin repetidos)
  const canonicalTrainings = useMemo(() => {
    const rawTitles = allTrainings.map((t) => t.title);
    return getUniqueCanonicalTopics(rawTitles);
  }, [allTrainings]);

  const handleSectorChange = (newSectorId: string) => {
    setSelectedSectorId(newSectorId);
    setSelectedBase("");
    setSelectedJobProfileId("");
    setSelectedEmployeeId("");
  };

  const handleBaseChange = (newBase: string) => {
    setSelectedBase(newBase);
    setSelectedJobProfileId("");
    setSelectedEmployeeId("");
  };

  const handleJobProfileChange = (newProfileId: string) => {
    setSelectedJobProfileId(newProfileId);
    setSelectedEmployeeId("");
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedSectorId && !isSector) params.set("sectorId", selectedSectorId);
    if (selectedBase) params.set("baseOperativa", selectedBase);
    if (selectedJobProfileId) params.set("jobProfileId", selectedJobProfileId);
    if (selectedEmployeeId) params.set("employeeId", selectedEmployeeId);
    if (empSearch.trim()) params.set("empName", empSearch.trim());
    if (statusFilter) params.set("statusFilter", statusFilter);
    if (topicQuery) params.set("q", topicQuery);

    router.push(`/plan-anual?${params.toString()}`);
  };

  const handleClearFilters = () => {
    if (!isSector) setSelectedSectorId("");
    setSelectedBase("");
    setSelectedJobProfileId("");
    setSelectedEmployeeId("");
    setEmpSearch("");
    setStatusFilter("");
    setTopicQuery("");
    router.push("/plan-anual");
  };

  const hasAnyFilter = Boolean(
    (!isSector && selectedSectorId) ||
      selectedBase ||
      selectedJobProfileId ||
      selectedEmployeeId ||
      empSearch.trim() ||
      statusFilter ||
      topicQuery
  );

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #cbd5e1",
        borderBottom: "none",
        borderTopLeftRadius: "12px",
        borderTopRightRadius: "12px",
        padding: "1rem 1.25rem"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.85rem",
          flexWrap: "wrap",
          gap: "0.5rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              background: "#1e293b",
              color: "white",
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "0.25rem 0.6rem",
              borderRadius: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.04em"
            }}
          >
            🔍 Filtros de la Tabla
          </span>
          <span style={{ fontSize: "0.85rem", color: "#475569", fontWeight: 500 }}>
            Buscá y filtrá las capacitaciones cargadas en el listado inferior (dinámicos según sector y sitio)
          </span>
        </div>
      </div>

      <form
        onSubmit={handleApplyFilters}
        style={{ display: "flex", gap: "0.85rem", alignItems: "flex-end", flexWrap: "wrap" }}
      >
        {!isSector && (
          <div style={{ flex: "1 1 160px" }}>
            <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
              1. Sector / Gerencia
            </label>
            <select
              name="sectorId"
              className="form-input"
              value={selectedSectorId}
              onChange={(e) => handleSectorChange(e.target.value)}
              style={{ borderRadius: "8px", backgroundColor: "white", fontSize: "0.85rem" }}
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

        {/* Sitio / Base Operativa (Dock Sud, Berazategui, Quilmes, Hudson, etc.) */}
        <div style={{ flex: "1 1 150px" }}>
          <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
            2. Sitio / Base {selectedSectorId ? `(${availableBases.length})` : ""}
          </label>
          <select
            name="baseOperativa"
            className="form-input"
            value={selectedBase}
            onChange={(e) => handleBaseChange(e.target.value)}
            style={{ borderRadius: "8px", backgroundColor: "white", fontSize: "0.85rem" }}
          >
            <option value="">Todos los sitios</option>
            {availableBases.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "1 1 170px" }}>
          <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
            3. Perfil de Puesto {selectedSectorId || selectedBase ? `(${filteredJobProfiles.length})` : ""}
          </label>
          <select
            name="jobProfileId"
            className="form-input"
            value={selectedJobProfileId}
            onChange={(e) => handleJobProfileChange(e.target.value)}
            style={{ borderRadius: "8px", backgroundColor: "white", fontSize: "0.85rem" }}
          >
            <option value="">Todos los puestos</option>
            {filteredJobProfiles.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "1 1 170px" }}>
          <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
            4. Escribir Nombre / Legajo
          </label>
          <input
            type="text"
            name="empName"
            value={empSearch}
            onChange={(e) => {
              setEmpSearch(e.target.value);
              setSelectedEmployeeId("");
            }}
            placeholder="Ej. Montes, Sassone..."
            className="form-input"
            style={{ borderRadius: "8px", backgroundColor: "white", fontSize: "0.85rem" }}
          />
        </div>

        <div style={{ flex: "1 1 180px" }}>
          <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
            5. Empleado ({filteredEmployees.length})
          </label>
          <select
            name="employeeId"
            className="form-input"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            style={{ borderRadius: "8px", backgroundColor: "white", fontSize: "0.85rem" }}
          >
            <option value="">
              {selectedSectorId || selectedBase || selectedJobProfileId || empSearch
                ? `Todos los filtrados (${filteredEmployees.length})`
                : "Todos los empleados"}
            </option>
            {filteredEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.legajo})
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "1 1 140px" }}>
          <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
            6. Estado
          </label>
          <select
            name="statusFilter"
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ borderRadius: "8px", backgroundColor: "white", fontSize: "0.85rem" }}
          >
            <option value="">Todos los estados</option>
            <option value="GAP">Brecha (Pendiente)</option>
            <option value="IN_PLAN">Programada</option>
            <option value="REPROGRAMADA">Reprogramada</option>
            <option value="COMPLETED">Realizada</option>
          </select>
        </div>

        <div style={{ flex: "1.5 1 190px" }}>
          <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
            7. Tema de Capacitación ({canonicalTrainings.length})
          </label>
          <select
            name="q"
            className="form-input"
            value={topicQuery}
            onChange={(e) => setTopicQuery(e.target.value)}
            style={{ borderRadius: "8px", backgroundColor: "white", fontSize: "0.85rem" }}
          >
            <option value="">Todos los temas</option>
            {canonicalTrainings.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="submit"
            className="btn btn-dark"
            style={{ padding: "0.5rem 1.25rem", borderRadius: "8px", height: "38px", fontWeight: 600 }}
          >
            🔍 Filtrar
          </button>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-secondary"
              style={{
                padding: "0.5rem 0.9rem",
                borderRadius: "8px",
                height: "38px",
                backgroundColor: "white"
              }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
