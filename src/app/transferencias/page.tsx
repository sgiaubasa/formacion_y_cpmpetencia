import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentRole, isSectorRole, getSectorIdFromRole } from "@/lib/auth";
import { eliminarTransferenciaAction } from "./actions";
import { autoReconcileDuplicateTransferredEmployees } from "@/lib/employeeMerge";

export default async function TransferenciasPage() {
  await autoReconcileDuplicateTransferredEmployees();
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);
  const canDelete = ["ADMIN", "RRHH", "SGI"].includes(role);

  let pendingWhere: any = { status: "PENDING" };
  let completedWhere: any = { status: "COMPLETED" };

  if (isSector && sectorRoleId) {
    pendingWhere = {
      status: "PENDING",
      OR: [{ targetSectorId: sectorRoleId }, { sourceSectorId: sectorRoleId }]
    };
    completedWhere = {
      status: "COMPLETED",
      OR: [{ targetSectorId: sectorRoleId }, { sourceSectorId: sectorRoleId }]
    };
  }

  const [transferencias, completadas] = await Promise.all([
    prisma.pendingTransfer.findMany({
      where: pendingWhere,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            legajo: true,
            sector: { select: { name: true } },
            _count: { select: { trainingRecords: true } }
          }
        },
        sourceSector: { select: { id: true, name: true } },
        targetProfile: { select: { id: true, title: true } },
        targetSector: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.pendingTransfer.findMany({
      where: completedWhere,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            legajo: true,
            sector: { select: { name: true } },
            _count: { select: { trainingRecords: true } }
          }
        },
        sourceSector: { select: { id: true, name: true } },
        targetProfile: { select: { id: true, title: true } },
        targetSector: { select: { id: true, name: true } }
      },
      orderBy: { completedAt: "desc" },
      take: 50
    })
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transferencias y Cambios de Sector / Puesto</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Desde el momento en que se decide transferir a un colaborador, el sector destino ya puede consultar todo su historial de capacitaciones previas (por ejemplo, de Operaciones).
          </p>
        </div>
      </div>

      {/* 1. PENDIENTES DE APROBACIÓN */}
      <div className="card" style={{ padding: 0, marginBottom: "2rem", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-color)", backgroundColor: "#fffbeb" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#92400e" }}>
            ⏳ Transferencias Pendientes de Confirmación ({transferencias.length})
          </h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha Propuesta</th>
              <th>Empleado</th>
              <th>Sector Origen</th>
              <th>Sector Destino</th>
              <th>Perfil Destino</th>
              <th>Acciones e Historial Previo</th>
            </tr>
          </thead>
          <tbody>
            {transferencias.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.createdAt).toLocaleDateString("es-AR")}</td>
                <td style={{ fontWeight: 600 }}>
                  {t.employee.name}{" "}
                  <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
                    (Leg. {t.employee.legajo})
                  </span>
                </td>
                <td>{t.sourceSector?.name || t.employee.sector.name}</td>
                <td>{t.targetSector.name}</td>
                <td>{t.targetProfile.title}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <Link
                      href={`/transferencias/${t.id}`}
                      className="btn btn-primary"
                      style={{ padding: "0.3rem 0.65rem", fontSize: "0.82rem" }}
                    >
                      ✓ Revisar Historial y Confirmar
                    </Link>
                    <Link
                      href={`/personal/${t.employee.id}/historial`}
                      className="btn btn-secondary"
                      style={{
                        padding: "0.3rem 0.65rem",
                        fontSize: "0.82rem",
                        backgroundColor: "#f0f9ff",
                        color: "#0369a1",
                        borderColor: "#bae6fd",
                        fontWeight: 600
                      }}
                    >
                      📜 Ver Capacitaciones Previas ({t.employee._count.trainingRecords})
                    </Link>
                    {canDelete && (
                      <form action={eliminarTransferenciaAction}>
                        <input type="hidden" name="transferId" value={t.id} />
                        <button
                          type="submit"
                          className="btn btn-secondary"
                          style={{
                            padding: "0.3rem 0.6rem",
                            fontSize: "0.82rem",
                            color: "#dc2626",
                            borderColor: "#fecaca",
                            backgroundColor: "#fef2f2"
                          }}
                        >
                          Eliminar
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {transferencias.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                  No hay transferencias pendientes de confirmación.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 2. HISTORIAL DE TRANSFERENCIAS ACEPTADAS */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-color)", backgroundColor: "#f0fdf4" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#166534" }}>
            ✅ Transferencias Confirmadas e Historial de Capacitaciones ({completadas.length})
          </h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha Confirmación</th>
              <th>Empleado</th>
              <th>Sector Origen</th>
              <th>Sector Destino</th>
              <th>Nuevo Puesto</th>
              <th>Historial de Capacitaciones</th>
            </tr>
          </thead>
          <tbody>
            {completadas.map((t) => (
              <tr key={t.id}>
                <td>
                  {t.completedAt
                    ? new Date(t.completedAt).toLocaleDateString("es-AR")
                    : new Date(t.createdAt).toLocaleDateString("es-AR")}
                </td>
                <td style={{ fontWeight: 600 }}>
                  {t.employee.name}{" "}
                  <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
                    (Leg. {t.employee.legajo})
                  </span>
                </td>
                <td>{t.sourceSector?.name || "-"}</td>
                <td>{t.targetSector.name}</td>
                <td>{t.targetProfile.title}</td>
                <td>
                  <Link
                    href={`/personal/${t.employee.id}/historial`}
                    className="btn btn-secondary"
                    style={{
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.82rem",
                      backgroundColor: "#f0f9ff",
                      color: "#0369a1",
                      borderColor: "#bae6fd",
                      fontWeight: 600
                    }}
                  >
                    📜 Ver Historial Completo ({t.employee._count.trainingRecords} capacitaciones)
                  </Link>
                </td>
              </tr>
            ))}
            {completadas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                  No hay transferencias confirmadas registradas para este sector.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
