import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentRole } from "@/lib/auth";

export default async function AuditoriaGlobalPage() {
  const role = await getCurrentRole();

  if (!["ADMIN", "SGI", "RRHH"].includes(role)) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center", marginTop: "2rem" }}>
        <h1 style={{ color: "var(--text-secondary)" }}>Acceso Denegado</h1>
        <p>El Historial de Evaluación Inicial es confidencial.</p>
      </div>
    );
  }

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

      <div className="card" style={{ overflowX: "auto", padding: 0, borderRadius: "12px", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)" }}>
        <table className="data-table" style={{ fontSize: "0.875rem", borderCollapse: "separate", borderSpacing: 0 }}>
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
            {transferenciasHistoricas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2.5rem" }}>
                  No hay historial registrado en el sistema.
                </td>
              </tr>
            ) : (
              transferenciasHistoricas.map((pt) => {
                let gapsList: string[] = [];
                try {
                  gapsList = JSON.parse(pt.gaps);
                } catch {}

                const resolvedItems = gapsList.map((gap) => {
                  const record =
                    pt.employee.trainingRecords.find(
                      (r) => r.trainingName === gap && r.sourceProfileId === pt.targetProfileId
                    ) ||
                    pt.employee.trainingRecords.find((r) => r.trainingName === gap);
                  return { gap, record };
                });

                const completedCount = resolvedItems.filter((item) => item.record?.status === "COMPLETED").length;
                const totalCount = resolvedItems.length;
                const hasPendingGaps = completedCount < totalCount;
                const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

                let dueDateStr = "-";
                let alertBadge = null;
                if (pt.completedAt) {
                  const dueDate = new Date(pt.completedAt);
                  dueDate.setDate(dueDate.getDate() + 90);
                  dueDateStr = dueDate.toLocaleDateString("es-AR");

                  const now = new Date();
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
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.76rem", fontWeight: 700, color: "#334155" }}>
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
                                    <div style={{ paddingLeft: "1.4rem", fontSize: "0.7rem", color: "#b91c1c", fontWeight: 600 }}>
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
