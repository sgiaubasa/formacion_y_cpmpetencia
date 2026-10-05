"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface SectorOption {
  id: number;
  name: string;
}

interface ProfileOption {
  id: number;
  title: string;
  gerencia: string | null;
}

interface EmployeeOption {
  id: number;
  name: string;
  legajo: string;
  targetSectorId: number;
  targetProfileId: number;
}

interface Props {
  sectors: SectorOption[];
  profiles: ProfileOption[];
  employees: EmployeeOption[];
  initialEmpQuery: string;
  initialSectorId?: number;
  initialProfileId?: number;
  initialEmployeeId?: number;
  initialStatusFilter: string;
  initialTrainingQuery: string;
  totalResults: number;
}

export function AuditoriaFilters({
  sectors,
  profiles,
  employees,
  initialEmpQuery,
  initialSectorId,
  initialProfileId,
  initialEmployeeId,
  initialStatusFilter,
  initialTrainingQuery,
  totalResults
}: Props) {
  const router = useRouter();

  const [empQuery, setEmpQuery] = useState(initialEmpQuery || "");
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    initialSectorId ? String(initialSectorId) : ""
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    initialProfileId ? String(initialProfileId) : ""
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    initialEmployeeId ? String(initialEmployeeId) : ""
  );
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || "");
  const [trainingQuery, setTrainingQuery] = useState<string>(initialTrainingQuery || "");

  const selectedSectorName = useMemo(() => {
    if (!selectedSectorId) return null;
    const found = sectors.find((s) => String(s.id) === selectedSectorId);
    return found ? found.name : null;
  }, [selectedSectorId, sectors]);

  // Perfiles relacionados al sector seleccionado
  const filteredProfiles = useMemo(() => {
    if (!selectedSectorId) return profiles;
    const profileIdsInSector = new Set(
      employees
        .filter((e) => String(e.targetSectorId) === selectedSectorId)
        .map((e) => e.targetProfileId)
    );
    return profiles.filter(
      (p) =>
        (selectedSectorName && p.gerencia === selectedSectorName) ||
        profileIdsInSector.has(p.id)
    );
  }, [selectedSectorId, selectedSectorName, profiles, employees]);

  // Empleados relacionados al sector y puesto seleccionados
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (selectedSectorId && String(e.targetSectorId) !== selectedSectorId) return false;
      if (selectedProfileId && String(e.targetProfileId) !== selectedProfileId) return false;
      if (empQuery.trim()) {
        const norm = empQuery
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const eName = e.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const eLeg = (e.legajo || "").toLowerCase();
        if (!eName.includes(norm) && !eLeg.includes(norm)) return false;
      }
      return true;
    });
  }, [employees, selectedSectorId, selectedProfileId, empQuery]);

  const handleSectorChange = (newSectorId: string) => {
    setSelectedSectorId(newSectorId);
    setSelectedProfileId("");
    setSelectedEmployeeId("");
  };

  const handleProfileChange = (newProfileId: string) => {
    setSelectedProfileId(newProfileId);
    setSelectedEmployeeId("");
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (empQuery.trim()) params.set("empName", empQuery.trim());
    if (selectedSectorId) params.set("sectorId", selectedSectorId);
    if (selectedProfileId) params.set("profileId", selectedProfileId);
    if (selectedEmployeeId) params.set("employeeId", selectedEmployeeId);
    if (statusFilter) params.set("statusFilter", statusFilter);
    if (trainingQuery.trim()) params.set("q", trainingQuery.trim());

    const qs = params.toString();
    router.push(qs ? `/auditoria?${qs}` : "/auditoria");
  };

  const clearFilters = () => {
    setEmpQuery("");
    setSelectedSectorId("");
    setSelectedProfileId("");
    setSelectedEmployeeId("");
    setStatusFilter("");
    setTrainingQuery("");
    router.push("/auditoria");
  };

  const hasActiveFilters = Boolean(
    empQuery.trim() ||
      selectedSectorId ||
      selectedProfileId ||
      selectedEmployeeId ||
      statusFilter ||
      trainingQuery.trim()
  );

  return (
    <div
      className="card"
      style={{
        marginBottom: "1.5rem",
        padding: "1.25rem 1.5rem",
        borderLeft: "6px solid #4f46e5",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderLeftWidth: "6px",
        borderLeftColor: "#4f46e5"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid #e2e8f0"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <span
            style={{
              background: "#4f46e5",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.72rem",
              padding: "0.25rem 0.65rem",
              borderRadius: "999px",
              letterSpacing: "0.04em",
              textTransform: "uppercase"
            }}
          >
            🔎 Filtros de Búsqueda
          </span>
          <h3 style={{ margin: 0, fontSize: "1rem", color: "#1e293b", fontWeight: 700 }}>
            Filtrar Historial de Evaluación Inicial
          </h3>
        </div>
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#475569",
            background: "#e2e8f0",
            padding: "0.25rem 0.7rem",
            borderRadius: "999px"
          }}
        >
          Mostrando {totalResults} registro{totalResults === 1 ? "" : "s"}
        </span>
      </div>

      <form onSubmit={applyFilters}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.85rem",
            alignItems: "end"
          }}
        >
          {/* 1. Sector Destino */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "0.3rem"
              }}
            >
              1. Sector Destino
            </label>
            <select
              value={selectedSectorId}
              onChange={(e) => handleSectorChange(e.target.value)}
              className="form-input"
              style={{ margin: 0, backgroundColor: "#ffffff" }}
            >
              <option value="">Todos los Sectores</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Puesto Destino (en cascada con Sector) */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "0.3rem"
              }}
            >
              2. Nuevo Puesto {selectedSectorName ? `(${selectedSectorName})` : ""}
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="form-input"
              style={{ margin: 0, backgroundColor: "#ffffff" }}
            >
              <option value="">Todos los Puestos ({filteredProfiles.length})</option>
              {filteredProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Buscar Empleado por texto */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "0.3rem"
              }}
            >
              3. Escribir Nombre o Legajo
            </label>
            <input
              type="text"
              value={empQuery}
              onChange={(e) => setEmpQuery(e.target.value)}
              placeholder="Ej: González, Aguirre, 12807..."
              className="form-input"
              style={{ margin: 0, backgroundColor: "#ffffff" }}
            />
          </div>

          {/* 4. Seleccionar Empleado (en cascada) */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "0.3rem"
              }}
            >
              4. Seleccionar Persona ({filteredEmployees.length})
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="form-input"
              style={{ margin: 0, backgroundColor: "#ffffff" }}
            >
              <option value="">Todas las personas filtradas</option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.legajo})
                </option>
              ))}
            </select>
          </div>

          {/* 5. Buscar Tema de Capacitación */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "0.3rem"
              }}
            >
              5. Tema de Capacitación
            </label>
            <input
              type="text"
              value={trainingQuery}
              onChange={(e) => setTrainingQuery(e.target.value)}
              placeholder="Ej: Reglamento, ITAU, SGI..."
              className="form-input"
              style={{ margin: 0, backgroundColor: "#ffffff" }}
            />
          </div>

          {/* 6. Estado del Plazo / Avance */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "0.3rem"
              }}
            >
              6. Estado de Evaluación
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ margin: 0, backgroundColor: "#ffffff" }}
            >
              <option value="">Todos los Estados</option>
              <option value="COMPLETED">✅ Completado (100% Realizado)</option>
              <option value="PENDING">⏳ En Curso (Con brechas pendientes)</option>
              <option value="OVERDUE">⚠️ Vencido (&gt; 90 días con pendientes)</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            marginTop: "1rem"
          }}
        >
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="btn btn-secondary"
              style={{ padding: "0.5rem 1.1rem" }}
            >
              Limpiar Filtros
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              background: "#4f46e5",
              borderColor: "#4f46e5",
              padding: "0.5rem 1.35rem",
              fontWeight: 600
            }}
          >
            🔎 Aplicar Filtros
          </button>
        </div>
      </form>
    </div>
  );
}
