import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentRole, getUserEmail } from "@/lib/auth";
import { getTrainingMaterialsMap } from "@/lib/trainingMaterials";
import { MaterialViewerButton } from "@/components/MaterialViewerButton";
import {
  getEfficacyEvaluatorsMap,
  getEfficacyTraceMap,
  saveEfficacyTraceForRecord,
  formatNameFromEmail
} from "@/lib/efficacyTraceability";

export default async function EvaluacionEficaciaPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  const currentRole = await getCurrentRole();
  const currentEmail = (await getUserEmail()).toLowerCase().trim();

  const [emp, materialsMap, evaluatorsMap, traceMap, currentUserDb] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
      include: {
        sector: true,
        trainingRecords: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          include: { sourceProfile: true }
        }
      }
    }),
    getTrainingMaterialsMap(),
    getEfficacyEvaluatorsMap(),
    getEfficacyTraceMap(),
    currentEmail && currentEmail !== "usuario@desconocido.com"
      ? prisma.appUser.findUnique({ where: { email: currentEmail } })
      : Promise.resolve(null)
  ]);

  if (!emp) return notFound();

  const evaluatorConfig = currentEmail ? evaluatorsMap[currentEmail] : undefined;
  const canEvaluate = evaluatorConfig
    ? evaluatorConfig.canEvaluate
    : currentRole === "SGI";

  const defaultEvaluatorName =
    evaluatorConfig?.fullName ||
    (currentEmail && currentEmail !== "usuario@desconocido.com"
      ? formatNameFromEmail(currentEmail)
      : "");

  async function evaluarEficacia(formData: FormData) {
    "use server";
    const recordId = parseInt(formData.get("recordId") as string);
    const score = formData.get("score") as string;
    const justification = (formData.get("justification") as string)?.trim() || "";
    const evaluatorName = (formData.get("evaluatorName") as string)?.trim() || "Supervisor";
    const userMail = (await getUserEmail()).toLowerCase().trim();

    await prisma.employeeTrainingRecord.update({
      where: { id: recordId },
      data: {
        effectiveness: score,
        effectivenessJustification: justification,
        evaluatedAt: new Date()
      }
    });

    await saveEfficacyTraceForRecord(recordId, evaluatorName, userMail);

    const { syncRecordToPowerAutomate } = await import("@/lib/powerAutomate");
    await syncRecordToPowerAutomate(recordId).catch(() => {});

    revalidatePath(`/brechas/${emp!.id}/evaluar`);
    revalidatePath("/plan-anual");
  }

  async function sendReminderEmail() {
    "use server";
    const { sendMail } = await import("@/lib/mailer");

    const targetSectorRole = `SECTOR_${emp?.sectorId}`;

    const targetUsers = await prisma.appUser.findMany({
      where: {
        OR: [{ role: "RRHH" }, { role: targetSectorRole }, { role: "ADMIN" }]
      }
    });

    const sectorEmails = targetUsers
      .filter((u) => u.role === targetSectorRole)
      .map((u) => u.email)
      .filter((e) => e);
    const rrhhEmails = targetUsers
      .filter((u) => u.role === "RRHH" || u.role === "ADMIN")
      .map((u) => u.email)
      .filter((e) => e);

    await sendMail({
      to: sectorEmails.length > 0 ? sectorEmails : rrhhEmails.length > 0 ? rrhhEmails : "rrhh@aubasa.com.ar",
      cc: rrhhEmails.length > 0 ? rrhhEmails : undefined,
      subject: `Recordatorio: Evaluación de Eficacia Pendiente (${emp?.name})`,
      html: `
        <h2>Recordatorio de Evaluación de Eficacia</h2>
        <p>Se solicita a los integrantes habilitados del sector <strong>${emp?.sector.name}</strong> que ingresen al sistema para evaluar la eficacia de las capacitaciones recientes del empleado <strong>${emp?.name}</strong>.</p>
        <p>Por favor, revise el listado de brechas del empleado en el sistema y complete la evaluación correspondiente.</p>
      `
    });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Evaluación de Eficacia (2 Meses)</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Empleado: {emp.name} | Sector: {emp.sector.name}
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/plan-anual" className="btn btn-secondary">
            Volver al Plan Anual
          </Link>
          <Link href={`/brechas/${emp.id}`} className="btn btn-secondary">
            Volver al GAP
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3 style={{ marginBottom: "0.5rem", color: "var(--primary-color)" }}>Notificar al Sector</h3>
        <p style={{ marginBottom: "1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Envía un recordatorio automático por correo electrónico a los responsables del sector para que ingresen y evalúen la eficacia de las capacitaciones recientes de este empleado.
        </p>
        <form action={sendReminderEmail}>
          <button type="submit" className="btn btn-primary">
            📧 Enviar Correo de Recordatorio al Sector
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Capacitación Realizada</th>
              <th>Perfil Origen</th>
              <th>Fecha de Realización</th>
              <th>Vencimiento Plazo (2 meses)</th>
              <th>Estado y Trazabilidad</th>
              <th>Evaluación del Supervisor</th>
            </tr>
          </thead>
          <tbody>
            {emp.trainingRecords.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center" }}>
                  No hay capacitaciones completadas para evaluar.
                </td>
              </tr>
            ) : (
              emp.trainingRecords.map((record) => {
                const completedDate = record.completedAt ? new Date(record.completedAt) : new Date();
                const deadlineDate = new Date(completedDate);
                deadlineDate.setMonth(deadlineDate.getMonth() + 2);

                const isOverdue = record.effectiveness === "PENDING" && new Date() > deadlineDate;
                const trace = traceMap[`record_${record.id}`];

                return (
                  <tr key={record.id}>
                    <td style={{ fontWeight: 500 }}>
                      {record.trainingName}
                      {record.objective && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                            marginTop: "0.25rem",
                            padding: "0.25rem",
                            background: "#f8fafc",
                            borderRadius: "4px"
                          }}
                        >
                          <strong>Objetivo:</strong> {record.objective}
                        </div>
                      )}
                      {materialsMap[`record_${record.id}`] && (
                        <div style={{ marginTop: "0.35rem" }}>
                          <MaterialViewerButton
                            material={materialsMap[`record_${record.id}`]}
                            trainingName={record.trainingName}
                          />
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: "0.875rem" }}>
                      {record.sourceProfileId ? (
                        <Link
                          href={`/perfiles/${record.sourceProfileId}`}
                          target="_blank"
                          style={{ color: "var(--primary-color)", textDecoration: "underline" }}
                        >
                          Ver Perfil (Rev: {record.sourceProfile?.revision || "01"})
                        </Link>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>-</span>
                      )}
                    </td>
                    <td>{completedDate.toLocaleDateString("es-AR")}</td>
                    <td style={{ color: isOverdue ? "red" : "inherit", fontWeight: isOverdue ? "bold" : "normal" }}>
                      {deadlineDate.toLocaleDateString("es-AR")} {isOverdue && " (¡Vencido!)"}
                    </td>
                    <td>
                      {record.effectiveness === "PENDING" && <span className="badge badge-warning">Pendiente</span>}
                      {record.effectiveness === "EFFECTIVE" && <span className="badge badge-success">Eficaz</span>}
                      {record.effectiveness === "INEFFECTIVE" && (
                        <span className="badge badge-secondary" style={{ backgroundColor: "#ef4444" }}>
                          No Eficaz
                        </span>
                      )}
                      {record.effectivenessJustification && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            marginTop: "0.4rem",
                            color: "var(--text-secondary)",
                            fontStyle: "italic"
                          }}
                        >
                          &ldquo;{record.effectivenessJustification}&rdquo;
                        </div>
                      )}
                      {trace?.evaluatorName && (
                        <div
                          style={{
                            fontSize: "0.78rem",
                            marginTop: "0.4rem",
                            padding: "0.3rem 0.5rem",
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: "6px",
                            color: "#166534",
                            fontWeight: 600
                          }}
                        >
                          👤 Evaluado por: {trace.evaluatorName}
                          {record.evaluatedAt && (
                            <span style={{ fontWeight: 400, marginLeft: "0.35rem", fontSize: "0.72rem" }}>
                              ({new Date(record.evaluatedAt).toLocaleDateString("es-AR")})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {record.effectiveness === "PENDING" ? (
                        canEvaluate ? (
                          <form action={evaluarEficacia} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <input type="hidden" name="recordId" value={record.id} />
                            <div
                              style={{
                                fontSize: "0.82rem",
                                color: "var(--text-secondary)",
                                background: "#f0f9ff",
                                padding: "0.5rem",
                                borderRadius: "4px",
                                border: "1px solid #bae6fd"
                              }}
                            >
                              <strong>¿Cumplió con el objetivo?</strong>
                              <br />
                              {record.objective || "El empleado debe haber adquirido las competencias propuestas."}
                            </div>

                            <div>
                              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#334155", marginBottom: "0.2rem" }}>
                                Evaluado por (Nombre y Apellido) *
                              </label>
                              <input
                                type="text"
                                name="evaluatorName"
                                defaultValue={defaultEvaluatorName}
                                required
                                placeholder="Nombre y Apellido del Evaluador"
                                className="form-input"
                                style={{ padding: "0.35rem 0.5rem", fontSize: "0.82rem" }}
                              />
                            </div>

                            <textarea
                              name="justification"
                              required
                              placeholder="Describa aquí el porqué de su evaluación..."
                              className="form-input"
                              style={{ minHeight: "60px", fontSize: "0.85rem" }}
                            />
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                type="submit"
                                name="score"
                                value="EFFECTIVE"
                                className="btn btn-secondary"
                                style={{
                                  padding: "0.3rem 0.5rem",
                                  fontSize: "0.85rem",
                                  borderColor: "#10b981",
                                  color: "#10b981",
                                  flex: 1
                                }}
                              >
                                ✓ Sí, fue Eficaz
                              </button>
                              <button
                                type="submit"
                                name="score"
                                value="INEFFECTIVE"
                                className="btn btn-secondary"
                                style={{
                                  padding: "0.3rem 0.5rem",
                                  fontSize: "0.85rem",
                                  borderColor: "#ef4444",
                                  color: "#ef4444",
                                  flex: 1
                                }}
                              >
                                ✕ No fue Eficaz
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div
                            style={{
                              padding: "0.75rem",
                              background: "#f8fafc",
                              border: "1px solid #cbd5e1",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              color: "#64748b"
                            }}
                          >
                            🔒 Tu usuario no está marcado como <strong>Apto para Medir Eficacia</strong> en este sector. Solicitá habilitación a SGI desde Accesos.
                          </div>
                        )
                      ) : (
                        <div style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600 }}>
                          ✓ Evaluación completada
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
