import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentRole } from "@/lib/auth";
import { AuditoriaFilters } from "./AuditoriaFilters";

function normalizeStr(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default async function AuditoriaGlobalPage({
  searchParams
}: {
  searchParams: Promise<{
    empName?: string;
    sectorId?: string;
    profileId?: string;
    employeeId?: string;
    statusFilter?: string;
    q?: string;
  }>;
}) {
  const role = await getCurrentRole();

  if (!["ADMIN", "SGI", "RRHH"].includes(role)) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center", marginTop: "2rem" }}>
        <h1 style={{ color: "var(--text-secondary)" }}>Acceso Denegado</h1>
        <p>El Historial de Evaluación Inicial es confidencial.</p>
      </div>
    );
  }

  const sp = await searchParams;
  const empNameQuery = sp.empName?.trim() || "";
  const sectorFilter = sp.sectorId ? parseInt(sp.sectorId) : undefined;
  const profileFilter = sp.profileId ? parseInt(sp.profileId) : undefined;
  const employeeFilter = sp.employeeId ? parseInt(sp.employeeId) : undefined;
  const statusFilter = sp.statusFilter || "";
  const trainingQuery = sp.q?.trim() || "";

  // Traemos TODOS los cambios de puesto históricos
  const transferenciasHistoricas = await prisma.pendingTransfer.findMany({
    where: { status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    include: {
      employee: {
        include: { trainingRecords: true }
      },
      sourceSector: true,
      sourceProfile: true,
      targetSector: true,
      targetProfile: true
    }
  });

  // Construimos opciones únicas de Sectores, Perfiles y Empleados presentes en el historial
  const sectorMap = new Map<number, { id: number; name: string }>();
  const profileMap = new Map<number, { id: number; title: string; gerencia: string | null }>();
  const employeeMap = new Map<
    number,
    { id: number; name: string; legajo: string; targetSectorId: number; targetProfileId: number }
  >();

  for (const pt of transferenciasHistoricas) {
    if (pt.targetSector) {
      sectorMap.set(pt.targetSector.id, { id: pt.targetSector.id, name: pt.targetSector.name });
    }
    if (pt.targetProfile) {
      profileMap.set(pt.targetProfile.id, {
        id: pt.targetProfile.id,
        title: pt.targetProfile.title,
        gerencia: pt.targetProfile.gerencia
      });
    }
    if (pt.employee && !employeeMap.has(pt.employee.id)) {
      employeeMap.set(pt.employee.id, {
        id: pt.employee.id,
        name: pt.employee.name,
        legajo: pt.employee.legajo,
        targetSectorId: pt.targetSectorId,
        targetProfileId: pt.targetProfileId
      });
    }
  }

  const filterSectors = Array.from(sectorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const filterProfiles = Array.from(profileMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  const filterEmployees = Array.from(employeeMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Pre-procesamos cada transferencia con su estado de avance y vencimiento
  const now = new Date();
  const enrichedList = transferenciasHistoricas.map((pt) => {
    let gapsList: string[] = [];
    try {
      gapsList = JSON.parse(pt.gaps);
    } catch {}

    const resolvedItems = gapsList.map((gap) => {
      const record =
        pt.employee.trainingRecords.find(
          (r) => r.trainingName === gap && r.sourceProfileId === pt.targetProfileId
        ) || pt.employee.trainingRecords.find((r) => r.trainingName === gap);
      return { gap, record };
    });

    const completedCount = resolvedItems.filter((item) => item.record?.status === "COMPLETED").length;
    const totalCount = resolvedItems.length;
    const hasPendingGaps = completedCount < totalCount;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    let dueDate: Date | null = null;
    let isOverdue = false;
    if (pt.completedAt) {
      dueDate = new Date(pt.completedAt);
      dueDate.setDate(dueDate.getDate() + 90);
      if (hasPendingGaps && now > dueDate) {
        isOverdue = true;
      }
    }

    const evaluationStatus = !hasPendingGaps
      ? "COMPLETED"
      : isOverdue
      ? "OVERDUE"
      : "PENDING";

    return {
      pt,
      resolvedItems,
      completedCount,
      totalCount,
      hasPendingGaps,
      progressPct,
      dueDate,
      isOverdue,
      evaluationStatus
    };
  });

  // Aplicamos los filtros seleccionados
  const filteredList = enrichedList.filter((item) => {
    const { pt, resolvedItems, evaluationStatus } = item;

    if (sectorFilter && pt.targetSectorId !== sectorFilter) return false;
    if (profileFilter && pt.targetProfileId !== profileFilter) return false;
    if (employeeFilter && pt.employeeId !== employeeFilter) return false;
    if (statusFilter && evaluationStatus !== statusFilter) return false;

    if (empNameQuery) {
      const normQ = normalizeStr(empNameQuery);
      const normName = normalizeStr(pt.employee.name);
      const normLeg = normalizeStr(pt.employee.legajo);
      if (!normName.includes(normQ) && !normLeg.includes(normQ)) return false;
    }

    if (trainingQuery) {
      const normT = normalizeStr(trainingQuery);
      const matchesTopic = resolvedItems.some((r) => normalizeStr(r.gap).includes(normT));
      if (!matchesTopic) return false;
    }

    return true;
  });

  const kpiTotal = filteredList.length;
  const kpiCompleted = filteredList.filter((i) => i.evaluationStatus === "COMPLETED").length;
  const kpiPending = filteredList.filter((i) => i.evaluationStatus === "PENDING").length;
  const kpiOverdue = filteredList.filter((i) => i.evaluationStatus === "OVERDUE").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial de Evaluación Inicial</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Auditoría global de cambios de puesto y seguimiento de capacitaciones requeridas (Brechas).
          </p>
        </div>
      </div>

      {/* KPIs Resumen */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem"
        }}
      >
        <div className="card" style={{ padding: "1rem 1.25rem", borderLeft: "4px solid #4f46e5" }}>
          <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>TOTAL EVALUACIONES</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1e293b", marginTop: "0.2rem" }}>
            {kpiTotal}
          </div>
        </div>
        <div className="card" style={{ padding: "1rem 1.25rem", borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: "0.78rem", color: "#15803d", fontWeight: 600 }}>COMPLETADAS (100% APTO)</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#15803d", marginTop: "0.2rem" }}>
            {kpiCompleted}
          </div>
        </div>
        <div className="card" style={{ padding: "1rem 1.25rem", borderLeft: "4px solid #0284c7" }}>
          <div style={{ fontSize: "0.78rem", color: "#0369a1", fontWeight: 600 }}>EN CURSO (DENTRO DE PLAZO)</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0369a1", marginTop: "0.2rem" }}>
            {kpiPending}
          </div>
        </div>
        <div className="card" style={{ padding: "1rem 1.25rem", borderLeft: "4px solid #e11d48" }}>
          <div style={{ fontSize: "0.78rem", color: "#be123c", fontWeight: 600 }}>PLAZO VENCIDO (&gt; 90 DÍAS)</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#be123c", marginTop: "0.2rem" }}>
            {kpiOverdue}
          </div>
        </div>
      </div>

      {/* Barra de Filtros Relacionados */}
      <AuditoriaFilters
        sectors={filterSectors}
        profiles={filterProfiles}
        employees={filterEmployees}
        initialEmpQuery={empNameQuery}
        initialSectorId={sectorFilter}
        initialProfileId={profileFilter}
        initialEmployeeId={employeeFilter}
        initialStatusFilter={statusFilter}
        initialTrainingQuery={trainingQuery}
        totalResults={filteredList.length}
      />

      <div
        className="card"
        style={{
          overflowX: "auto",
          padding: 0,
          borderRadius: "12px",
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)"
        }}
      >
        <table
          className="data-table"
          style={{ fontSize: "0.875rem", borderCollapse: "separate", borderSpacing: 0 }}
        >
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ width: "110px" }}>Fecha Aprobación</th>
              <th style={{ width: "145px" }}>Plazo (90 Días)</th>
              <th style={{ width: "190px" }}>Empleado</th>
              <th style={{ width: "220px" }}>Destino (Nuevo Puesto)</th>
              <th>Capacitaciones del Puesto y Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2.5rem" }}>
                  No se encontraron registros con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredList.map(({ pt, resolvedItems, completedCount, totalCount, hasPendingGaps, progressPct, dueDate }) => {
                let dueDateStr = "-";
                let alertBadge = null;
                if (dueDate) {
                  dueDateStr = dueDate.toLocaleDateString("es-AR");

                  const diffTime = Math.abs(dueDate.getTime() - now.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  if (hasPendingGaps) {
                    if (now > dueDate) {
                      alertBadge = (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            marginTop: "0.35rem",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "999px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            background: "#ffe4e6",
                            color: "#be123c",
                            border: "1px solid #fecdd3"
                          }}
                        >
                          ⚠ Vencido hace {diffDays} d
                        </span>
                      );
                    } else if (diffDays <= 30) {
                      alertBadge = (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            marginTop: "0.35rem",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "999px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            background: "#fef3c7",
                            color: "#b45309",
                            border: "1px solid #fde68a"
                          }}
                        >
                          ⏳ Vence en {diffDays} días
                        </span>
                      );
                    } else {
                      alertBadge = (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            marginTop: "0.35rem",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "999px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            background: "#e0f2fe",
                            color: "#0369a1",
                            border: "1px solid #bae6fd"
                          }}
                        >
                          🕒 Vence en {diffDays} días
                        </span>
                      );
                    }
                  } else {
                    alertBadge = (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          marginTop: "0.35rem",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          background: "#dcfce7",
                          color: "#15803d",
                          border: "1px solid #bbf7d0"
                        }}
                      >
                        ✓ Completado
                      </span>
                    );
                  }
                }

                return (
                  <tr key={pt.id} style={{ verticalAlign: "top" }}>
                    <td style={{ whiteSpace: "nowrap", paddingTop: "1rem", color: "#475569", fontWeight: 500 }}>
                      {pt.completedAt ? pt.completedAt.toLocaleDateString("es-AR") : "-"}
                    </td>
                    <td style={{ whiteSpace: "nowrap", paddingTop: "1rem" }}>
                      <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.85rem" }}>{dueDateStr}</div>
                      {alertBadge}
                    </td>
                    <td style={{ paddingTop: "1rem" }}>
                      <Link
                        href={`/personal/${pt.employeeId}/editar`}
                        style={{
                          fontWeight: 700,
                          color: "var(--primary-color)",
                          fontSize: "0.9rem",
                          textDecoration: "none",
                          display: "inline-block",
                          marginBottom: "0.2rem"
                        }}
                      >
                        {pt.employee.name}
                      </Link>
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            color: "#64748b",
                            background: "#f1f5f9",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px"
                          }}
                        >
                          Legajo: {pt.employee.legajo}
                        </span>
                      </div>
                    </td>
                    <td style={{ paddingTop: "1rem" }}>
                      <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.85rem", marginBottom: "0.2rem" }}>
                        {pt.targetSector.name}
                      </div>
                      <Link
                        href={`/perfiles/${pt.targetProfileId}`}
                        target="_blank"
                        style={{
                          display: "inline-block",
                          fontSize: "0.78rem",
                          color: "#0284c7",
                          background: "#f0f9ff",
                          border: "1px solid #bae6fd",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "6px",
                          textDecoration: "none",
                          fontWeight: 600
                        }}
                      >
                        {pt.targetProfile.title} (Rev. {pt.targetProfile.revision || "01"})
                      </Link>
                      {pt.sourceSector && (
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.35rem" }}>
                          Origen: {pt.sourceSector.name}
                        </div>
                      )}
                    </td>
                    <td style={{ paddingTop: "0.85rem", paddingBottom: "0.85rem" }}>
                      {totalCount === 0 ? (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.4rem 0.85rem",
                            borderRadius: "8px",
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            color: "#15803d",
                            fontWeight: 700,
                            fontSize: "0.82rem"
                          }}
                        >
                          <span>✓</span>
                          <span>Sin brechas pendientes (100% Apto)</span>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                          {/* Barra de progreso compacta */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "0.75rem",
                              background: "#f8fafc",
                              padding: "0.35rem 0.65rem",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0"
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                color: "#334155"
                              }}
                            >
                              <span>Avance de Capacitaciones:</span>
                              <span
                                style={{
                                  padding: "0.1rem 0.45rem",
                                  borderRadius: "999px",
                                  background: progressPct === 100 ? "#dcfce7" : "#e0f2fe",
                                  color: progressPct === 100 ? "#166534" : "#0369a1"
                                }}
                              >
                                {completedCount} de {totalCount} realizadas ({progressPct}%)
                              </span>
                            </div>
                            <div
                              style={{
                                flex: "1",
                                maxWidth: "160px",
                                height: "7px",
                                background: "#e2e8f0",
                                borderRadius: "999px",
                                overflow: "hidden"
                              }}
                            >
                              <div
                                style={{
                                  width: `${progressPct}%`,
                                  height: "100%",
                                  background: progressPct === 100 ? "#10b981" : "#0ea5e9",
                                  borderRadius: "999px"
                                }}
                              />
                            </div>
                          </div>

                          {/* Grilla de tarjetas de capacitación */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                              gap: "0.5rem"
                            }}
                          >
                            {resolvedItems.map(({ gap, record }, i) => {
                              const isCompleted = record?.status === "COMPLETED";
                              const isProgrammed = record && record.status !== "COMPLETED";

                              const cardBg = isCompleted ? "#f0fdf4" : isProgrammed ? "#fffbeb" : "#fef2f2";
                              const cardBorder = isCompleted ? "#bbf7d0" : isProgrammed ? "#fde68a" : "#fecaca";
                              const iconBg = isCompleted ? "#16a34a" : isProgrammed ? "#d97706" : "#dc2626";

                              return (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    gap: "0.4rem",
                                    padding: "0.55rem 0.7rem",
                                    borderRadius: "8px",
                                    background: cardBg,
                                    border: `1px solid ${cardBorder}`,
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem" }}>
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "18px",
                                        height: "18px",
                                        borderRadius: "50%",
                                        background: iconBg,
                                        color: "#ffffff",
                                        fontSize: "0.68rem",
                                        fontWeight: 800,
                                        flexShrink: 0,
                                        marginTop: "1px"
                                      }}
                                    >
                                      {isCompleted ? "✓" : isProgrammed ? "⏳" : "!"}
                                    </span>
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        fontSize: "0.78rem",
                                        color: "#1e293b",
                                        lineHeight: 1.3
                                      }}
                                    >
                                      {gap}
                                    </span>
                                  </div>

                                  {record ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        alignItems: "center",
                                        gap: "0.35rem",
                                        paddingLeft: "1.4rem"
                                      }}
                                    >
                                      {isCompleted ? (
                                        <>
                                          <span
                                            style={{
                                              fontSize: "0.7rem",
                                              fontWeight: 600,
                                              color: "#166534",
                                              background: "#dcfce7",
                                              padding: "0.1rem 0.4rem",
                                              borderRadius: "4px"
                                            }}
                                          >
                                            Realizada: {record.completedAt?.toLocaleDateString("es-AR") || "-"}
                                          </span>
                                          {record.score && (
                                            <span
                                              style={{
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                color: "#0f766e",
                                                background: "#ccfbf1",
                                                padding: "0.1rem 0.4rem",
                                                borderRadius: "4px"
                                              }}
                                            >
                                              Nota: {record.score}/10
                                            </span>
                                          )}
                                          <span
                                            style={{
                                              fontSize: "0.7rem",
                                              fontWeight: 600,
                                              color: record.effectiveness === "EFFECTIVE" ? "#15803d" : "#9a3412",
                                              background: record.effectiveness === "EFFECTIVE" ? "#bbf7d0" : "#ffedd5",
                                              padding: "0.1rem 0.4rem",
                                              borderRadius: "4px"
                                            }}
                                          >
                                            {record.effectiveness === "EFFECTIVE" ? "Eficaz" : "Eval. Pendiente"}
                                          </span>
                                        </>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: "0.7rem",
                                            fontWeight: 600,
                                            color: "#92400e",
                                            background: "#fef3c7",
                                            padding: "0.1rem 0.45rem",
                                            borderRadius: "4px"
                                          }}
                                        >
                                          Programada: {record.scheduledDate?.toLocaleDateString("es-AR") || "Sin fecha"}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        paddingLeft: "1.4rem",
                                        fontSize: "0.7rem",
                                        color: "#b91c1c",
                                        fontWeight: 600
                                      }}
                                    >
                                      Pendiente de programar
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
