import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmTransferForm } from "./ConfirmTransferForm";
import { autoReconcileDuplicateTransferredEmployees } from "@/lib/employeeMerge";

export default async function TransferenciaDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await autoReconcileDuplicateTransferredEmployees();
  const { id } = await params;
  const transferId = parseInt(id);

  const pending = await prisma.pendingTransfer.findUnique({
    where: { id: transferId },
    include: {
      employee: {
        include: {
          sector: true,
          jobProfile: true,
          trainingRecords: {
            select: {
              id: true,
              trainingName: true,
              status: true,
              completedAt: true,
              scheduledDate: true,
              score: true,
              instructorName: true,
              sourceProfile: { select: { title: true, gerencia: true } }
            },
            orderBy: { id: "desc" }
          }
        }
      },
      sourceSector: true,
      targetProfile: true,
      targetSector: true
    }
  });

  if (!pending) {
    redirect("/transferencias");
  }

  const gaps = JSON.parse(pending.gaps) as string[];
  const originSectorName = pending.sourceSector?.name || pending.employee.sector.name;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Revisar Transferencia e Historial Previo</h1>
        <Link href="/transferencias" className="btn btn-secondary">
          Volver
        </Link>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "var(--primary-color)" }}>
          Datos de la Transferencia
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem"
          }}
        >
          <div>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Empleado</span>
            <div style={{ fontWeight: "bold" }}>
              {pending.employee.name} ({pending.employee.legajo})
            </div>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Viene del Sector</span>
            <div style={{ fontWeight: "bold" }}>{originSectorName}</div>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Perfil Anterior</span>
            <div style={{ fontWeight: "bold" }}>{pending.employee.jobProfile?.title || "Sin asignar"}</div>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Nuevo Puesto Propuesto</span>
            <div style={{ fontWeight: "bold", color: "var(--primary-color)" }}>
              {pending.targetProfile.title} ({pending.targetSector.name})
            </div>
          </div>
        </div>
      </div>

      {/* HISTORIAL DE CAPACITACIONES PREVIAS DEL EMPLEADO (EJ. OPERACIONES) */}
      <div className="card" style={{ marginBottom: "1.5rem", borderLeft: "5px solid #0284c7" }}>
        <h2 style={{ fontSize: "1.15rem", marginBottom: "0.35rem", color: "#0369a1" }}>
          🎓 Historial de Capacitaciones Previas del Colaborador ({originSectorName})
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          Estas son todas las capacitaciones que {pending.employee.name} ya realizó o tiene registradas en su sector anterior antes de completar el pase:
        </p>

        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Capacitación</th>
              <th>Estado</th>
              <th>Nota</th>
              <th>Planilla</th>
            </tr>
          </thead>
          <tbody>
            {pending.employee.trainingRecords.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "1rem" }}>
                  No registra capacitaciones previas cargadas.
                </td>
              </tr>
            ) : (
              pending.employee.trainingRecords.map((rec) => {
                const dateVal = rec.completedAt || rec.scheduledDate;
                return (
                  <tr key={rec.id}>
                    <td>{dateVal ? new Date(dateVal).toLocaleDateString("es-AR") : "-"}</td>
                    <td style={{ fontWeight: 600 }}>{rec.trainingName}</td>
                    <td>
                      {rec.status === "COMPLETED" ? (
                        <span className="badge badge-success">✓ Realizada</span>
                      ) : (
                        <span className="badge badge-warning">Programada</span>
                      )}
                    </td>
                    <td>{rec.score ? `${rec.score} / 10` : "-"}</td>
                    <td>
                      {rec.status === "COMPLETED" ? (
                        <Link
                          href={`/plan-anual/planilla/${rec.id}`}
                          target="_blank"
                          className="btn btn-secondary"
                          style={{ padding: "0.2rem 0.55rem", fontSize: "0.75rem" }}
                        >
                          📄 Ver Planilla
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmTransferForm transferId={transferId} gaps={gaps} />
    </div>
  );
}
