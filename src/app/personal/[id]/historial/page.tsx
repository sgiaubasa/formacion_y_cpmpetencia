import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { autoReconcileDuplicateTransferredEmployees } from "@/lib/employeeMerge";

export default async function HistorialEmpleadoPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await autoReconcileDuplicateTransferredEmployees();
  const { id } = await params;
  const empId = parseInt(id);

  const empleado = await prisma.employee.findUnique({
    where: { id: empId },
    include: {
      sector: { select: { id: true, name: true } },
      jobProfile: { select: { id: true, title: true } },
      trainingRecords: {
        select: {
          id: true,
          trainingName: true,
          objective: true,
          status: true,
          scheduledDate: true,
          rescheduledDate: true,
          completedAt: true,
          score: true,
          instructorName: true,
          effectiveness: true,
          sourceProfile: {
            select: {
              id: true,
              title: true,
              gerencia: true
            }
          }
        },
        orderBy: { id: "desc" }
      },
      pendingTransfers: {
        orderBy: { createdAt: "desc" },
        include: {
          sourceSector: { select: { id: true, name: true } },
          sourceProfile: { select: { id: true, title: true, revision: true } },
          targetSector: { select: { id: true, name: true } },
          targetProfile: { select: { id: true, title: true, revision: true } }
        }
      }
    }
  });

  if (!empleado) {
    return <div style={{ padding: "2rem" }}>Empleado no encontrado</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Historial Completo y Capacitaciones: {empleado.name} (Leg. {empleado.legajo})
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Sector Actual: <strong>{empleado.sector.name}</strong> &bull; Puesto Actual:{" "}
            <strong>{empleado.jobProfile?.title || "Sin asignar"}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/personal" className="btn btn-secondary">
            ← Volver a Personal
          </Link>
          <Link href="/transferencias" className="btn btn-secondary">
            Ir a Transferencias
          </Link>
        </div>
      </div>

      {/* SECCIÓN 1: HISTORIAL COMPLETO DE CAPACITACIONES (TODOS LOS SECTORES) */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.35rem", color: "var(--teal-color)" }}>
          🎓 Historial de Capacitaciones Realizadas y Programadas (Todos los Sectores)
        </h2>
        <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          Incluye todas las capacitaciones que la persona realizó en su sector de origen anterior (por ejemplo Operaciones) así como las de su sector actual o destino.
        </p>

        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tema de Capacitación</th>
              <th>Sector / Puesto de Origen</th>
              <th>Estado</th>
              <th>Calificación</th>
              <th>Instructor</th>
              <th>Planilla</th>
            </tr>
          </thead>
          <tbody>
            {empleado.trainingRecords.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "1.5rem" }}>
                  No se registran capacitaciones cargadas para este colaborador.
                </td>
              </tr>
            ) : (
              empleado.trainingRecords.map((rec) => {
                const dateToShow = rec.completedAt || rec.rescheduledDate || rec.scheduledDate;
                const isDone = rec.status === "COMPLETED";
                return (
                  <tr key={rec.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {dateToShow ? new Date(dateToShow).toLocaleDateString("es-AR") : "-"}
                    </td>
                    <td style={{ fontWeight: 600, color: "#1e293b" }}>{rec.trainingName}</td>
                    <td>
                      {rec.sourceProfile ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#0369a1" }}>
                            {rec.sourceProfile.gerencia || empleado.sector.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {rec.sourceProfile.title}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                          {empleado.sector.name}
                        </span>
                      )}
                    </td>
                    <td>
                      {isDone ? (
                        <span className="badge badge-success">✓ Realizada</span>
                      ) : (
                        <span className="badge badge-warning">Programada</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{rec.score ? `${rec.score} / 10` : "-"}</td>
                    <td style={{ fontSize: "0.82rem" }}>{rec.instructorName || "-"}</td>
                    <td>
                      {isDone ? (
                        <Link
                          href={`/plan-anual/planilla/${rec.id}`}
                          target="_blank"
                          className="btn btn-secondary"
                          style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}
                        >
                          📄 Ver Planilla
                        </Link>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Pendiente</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* SECCIÓN 2: AUDITORÍA DE CAMBIOS DE PUESTO / TRANSFERENCIAS */}
      <div className="card">
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "var(--primary-color)" }}>
          🔄 Auditoría de Transferencias y Cambios de Puesto
        </h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Sector Origen</th>
              <th>Perfil Origen</th>
              <th>Sector Destino</th>
              <th>Perfil Destino (Nuevo Puesto)</th>
              <th>Brechas Detectadas al Mudar</th>
            </tr>
          </thead>
          <tbody>
            {empleado.pendingTransfers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                  No hay historial de cambios de puesto registrados.
                </td>
              </tr>
            ) : (
              empleado.pendingTransfers.map((pt) => (
                <tr key={pt.id}>
                  <td>
                    {pt.completedAt
                      ? pt.completedAt.toLocaleDateString("es-AR")
                      : pt.createdAt.toLocaleDateString("es-AR")}
                  </td>
                  <td>
                    {pt.status === "COMPLETED" ? (
                      <span className="badge badge-success">Completada</span>
                    ) : (
                      <span className="badge badge-warning">En Proceso</span>
                    )}
                  </td>
                  <td>{pt.sourceSector?.name || "-"}</td>
                  <td>
                    {pt.sourceProfileId ? (
                      <Link
                        href={`/perfiles/${pt.sourceProfileId}`}
                        target="_blank"
                        style={{ color: "var(--primary-color)", textDecoration: "underline" }}
                      >
                        {pt.sourceProfile?.title || `Rev: ${pt.sourceProfile?.revision || "01"}`}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{pt.targetSector.name}</td>
                  <td>
                    <Link
                      href={`/perfiles/${pt.targetProfileId}`}
                      target="_blank"
                      style={{ color: "var(--primary-color)", textDecoration: "underline" }}
                    >
                      {pt.targetProfile?.title || `Rev: ${pt.targetProfile.revision || "01"}`}
                    </Link>
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>
                    {(() => {
                      try {
                        const gaps = JSON.parse(pt.gaps);
                        if (gaps.length === 0) {
                          return (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0.25rem 0.65rem",
                                borderRadius: "6px",
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                color: "#15803d",
                                fontWeight: 600
                              }}
                            >
                              ✓ Sin Brechas (100% apto)
                            </span>
                          );
                        }
                        return (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                            {gaps.map((g: string, i: number) => (
                              <span
                                key={i}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                  padding: "0.25rem 0.6rem",
                                  borderRadius: "6px",
                                  background: "#f8fafc",
                                  border: "1px solid #cbd5e1",
                                  color: "#334155",
                                  fontWeight: 500,
                                  fontSize: "0.76rem"
                                }}
                              >
                                <span style={{ color: "#0284c7", fontWeight: 700 }}>•</span>
                                {g}
                              </span>
                            ))}
                          </div>
                        );
                      } catch {
                        return "-";
                      }
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
