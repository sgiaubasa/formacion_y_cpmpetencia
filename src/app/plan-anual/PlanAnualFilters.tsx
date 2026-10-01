"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface EmployeeItem {
  id: number;
  name: string;
  legajo: string;
  sectorId: number;
  jobProfileId: number | null;
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
  initialJobProfileId?: string;
  initialEmployeeId?: string;
  initialEmpSearch?: string;
  initialStatusFilter?: string;
  initialTopicQuery?: string;
}) {
  const router = useRouter();

  const [selectedSectorId, setSelectedSectorId] = useState(initialSectorId || "");
  const [selectedJobProfileId, setSelectedJobProfileId] = useState(initialJobProfileId || "");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployeeId || "");
  const [empSearch, setEmpSearch] = useState(initialEmpSearch || "");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || "");
  const [topicQuery, setTopicQuery] = useState(initialTopicQuery || "");

  // 1. Filtrar puestos según el sector elegido
  const filteredJobProfiles = useMemo(() => {
    if (!selectedSectorId) return allJobProfiles;
    const secIdNum = parseInt(selectedSectorId, 10);
    const selectedSectorObj = allSectors.find((s) => s.id === secIdNum);
    const profileIdsInSector = new Set(
      allEmployees
        .filter((e) => e.sectorId === secIdNum && e.jobProfileId)
        .map((e) => e.jobProfileId as number)
    );

    return allJobProfiles.filter(
      (jp) =>
        profileIdsInSector.has(jp.id) ||
        (selectedSectorObj &&
          jp.gerencia &&
          jp.gerencia.toLowerCase().trim() === selectedSectorObj.name.toLowerCase().trim())
    );
  }, [selectedSectorId, allJobProfiles, allEmployees, allSectors]);

  // 2. Filtrar empleados según el sector elegido, puesto elegido y texto escrito
  const filteredEmployees = useMemo(() => {
    const secIdNum = selectedSectorId ? parseInt(selectedSectorId, 10) : null;
    const profIdNum = selectedJobProfileId ? parseInt(selectedJobProfileId, 10) : null;
    const searchLower = empSearch.trim().toLowerCase();

    return allEmployees.filter((e) => {
      if (secIdNum && e.sectorId !== secIdNum) return false;
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
  }, [selectedSectorId, selectedJobProfileId, empSearch, allEmployees]);

  const handleSectorChange = (newSectorId: string) => {
    setSelectedSectorId(newSectorId);
    // Resetear puesto y empleado al cambiar de sector para mantener coherencia
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
    if (selectedJobProfileId) params.set("jobProfileId", selectedJobProfileId);
    if (selectedEmployeeId) params.set("employeeId", selectedEmployeeId);
    if (empSearch.trim()) params.set("empName", empSearch.trim());
    if (statusFilter) params.set("statusFilter", statusFilter);
    if (topicQuery) params.set("q", topicQuery);

    router.push(`/plan-anual?${params.toString()}`);
  };

  const handleClearFilters = () => {
    if (!isSector) setSelectedSectorId("");
    setSelectedJobProfileId("");
    setSelectedEmployeeId("");
    setEmpSearch("");
    setStatusFilter("");
    setTopicQuery("");
    router.push("/plan-anual");
  };

  const hasAnyFilter = Boolean(
    (!isSector && selectedSectorId) ||
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
            Buscá y filtrá las capacitaciones cargadas en el listado inferior (los filtros se relacionan entre sí)
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
              1. Sector
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

        <div style={{ flex: "1 1 170px" }}>
          <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
            2. Perfil de Puesto {selectedSectorId ? `(${filteredJobProfiles.length})` : ""}
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

        <div style={{ flex: "1 1 190px" }}>
          <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
            3. Escribir Nombre o Legajo
          </label>
          <input
            type="text"
            name="empName"
            value={empSearch}
            onChange={(e) => {
              setEmpSearch(e.target.value);
              setSelectedEmployeeId("");
            }}
            placeholder="Ej. Montes, Lettieri..."
            className="form-input"
            style={{ borderRadius: "8px", backgroundColor: "white", fontSize: "0.85rem" }}
          />
        </div>

        <div style={{ flex: "1 1 190px" }}>
          <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
            4. Empleado ({filteredEmployees.length})
          </label>
          <select
            name="employeeId"
            className="form-input"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            style={{ borderRadius: "8px", backgroundColor: "white", fontSize: "0.85rem" }}
          >
            <option value="">
              {selectedSectorId || selectedJobProfileId || empSearch
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

        <div style={{ flex: "1 1 150px" }}>
          <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
            5. Estado
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
            <option value="IN_PLAN">Programada / Reprogramada</option>
            <option value="COMPLETED">Realizada</option>
          </select>
        </div>

        <div style={{ flex: "1.5 1 190px" }}>
          <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem", color: "#334155" }}>
            6. Tema de Capacitación
          </label>
          <select
            name="q"
            className="form-input"
            value={topicQuery}
            onChange={(e) => setTopicQuery(e.target.value)}
            style={{ borderRadius: "8px", backgroundColor: "white", fontSize: "0.85rem" }}
          >
            <option value="">Todos los temas</option>
            {allTrainings.map((t) => (
              <option key={t.id} value={t.title}>
                {t.title}
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
