import { prisma } from "./prisma";

const DEFAULT_WEBHOOK_URL =
  "https://default9444ead097714ed8a608802faff70d.4f.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/21/workflows/c0fb845ad3294f5b9e1b767e3ad73a0f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=M40CRgRv1BUe1CgwHpPwBJE6qxXquHtEgfoIUgio4QI";

const DEFAULT_BRECHAS_WEBHOOK_URL =
  "https://default9444ead097714ed8a608802faff70d.4f.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/04/workflows/205c4b3974b14191abc58412df67f365/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=P6fTBgX19ruWSAKW_38J1po2glAnAw1kFyxBeCJmDSw";

function formatEffectiveness(eff: string | null): string {
  if (eff === "EFFECTIVE") return "Eficaz";
  if (eff === "INEFFECTIVE") return "No Eficaz";
  return "Pendiente";
}

function formatStatus(status: string | null): string {
  if (status === "COMPLETED") return "Completado";
  if (status === "IN_PLAN") return "Programado";
  return status || "Pendiente";
}

export async function syncRecordToPowerAutomate(recordId: number) {
  try {
    const url = process.env.POWER_AUTOMATE_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

    const record = await prisma.employeeTrainingRecord.findUnique({
      where: { id: recordId },
      include: {
        employee: {
          include: {
            sector: true,
            jobProfile: true,
            pendingTransfers: {
              where: { status: "COMPLETED" },
              orderBy: { completedAt: "desc" },
              include: {
                targetSector: true,
                targetProfile: true,
              },
            },
          },
        },
        sourceProfile: true,
      },
    });

    if (!record) return;

    // Excel cell character limit is 32767 chars. Truncate long Base64 strings to avoid errors.
    const sanitizeSig = (sig: string | null) => {
      if (!sig) return "";
      if (sig.length > 500) return "SÍ (Firma Digital)";
      return sig;
    };

    if (url) {
      const payload = {
        id: String(record.id ?? ""),
        employeeId: String(record.employeeId ?? ""),
        trainingName: String(record.trainingName ?? ""),
        objective: String(record.objective ?? ""),
        status: String(record.status ?? ""),
        completedAt: record.completedAt ? record.completedAt.toISOString() : "",
        evidencePath: String(record.evidencePath ?? ""),
        employeeSignature: sanitizeSig(record.employeeSignature),
        instructorName: String(record.instructorName ?? ""),
        instructorSignature: sanitizeSig(record.instructorSignature),
        effectiveness: String(record.effectiveness ?? ""),
        evaluatedAt: record.evaluatedAt ? record.evaluatedAt.toISOString() : "",
        effectivenessJustification: String(record.effectivenessJustification ?? ""),
        score: String(record.score ?? ""),
        sourceProfileId: String(record.sourceProfileId ?? ""),
        scheduledDate: record.scheduledDate ? record.scheduledDate.toISOString() : "",
        rescheduledDate: record.rescheduledDate ? record.rescheduledDate.toISOString() : "",
      };

      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(err => {
        console.error("Error sending webhook to Power Automate:", err);
      });
    }

    // Si el registro proviene de una Brecha de Cambio de Puesto (sourceProfileId), enviarlo también al flujo de Brechas
    const brechasUrl =
      process.env.POWER_AUTOMATE_BRECHAS_WEBHOOK_URL || DEFAULT_BRECHAS_WEBHOOK_URL;

    if (brechasUrl && record.sourceProfileId) {
      const matchingTransfer =
        record.employee.pendingTransfers.find(
          pt => pt.targetProfileId === record.sourceProfileId
        ) || record.employee.pendingTransfers[0];

      const approvalDate = matchingTransfer?.completedAt
        ? new Date(matchingTransfer.completedAt)
        : new Date();
      const dueDate = new Date(approvalDate);
      dueDate.setDate(dueDate.getDate() + 90);

      const brechaPayload = {
        id: String(record.id),
        fechaAprobacion: approvalDate.toLocaleDateString("es-AR"),
        vencimiento90Dias: dueDate.toLocaleDateString("es-AR"),
        legajo: String(record.employee.legajo ?? ""),
        empleado: String(record.employee.name ?? ""),
        sectorDestino: String(
          matchingTransfer?.targetSector?.name ||
            record.employee.sector?.name ||
            ""
        ),
        nuevoPuesto: String(
          matchingTransfer?.targetProfile?.title ||
            record.sourceProfile?.title ||
            record.employee.jobProfile?.title ||
            ""
        ),
        brecha: String(record.trainingName ?? ""),
        estadoBrecha: formatStatus(record.status),
        nota: String(record.score ?? "-"),
        eficacia: formatEffectiveness(record.effectiveness),
      };

      fetch(brechasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brechaPayload),
      }).catch(err => {
        console.error("Error sending brecha webhook to Power Automate:", err);
      });
    }
  } catch (error) {
    console.error("Error in syncRecordToPowerAutomate:", error);
  }
}

export async function syncNoGapTransferToPowerAutomate(transferId: number) {
  try {
    const brechasUrl =
      process.env.POWER_AUTOMATE_BRECHAS_WEBHOOK_URL || DEFAULT_BRECHAS_WEBHOOK_URL;
    if (!brechasUrl) return;

    const pt = await prisma.pendingTransfer.findUnique({
      where: { id: transferId },
      include: {
        employee: true,
        targetSector: true,
        targetProfile: true,
      },
    });
    if (!pt) return;

    const approvalDate = pt.completedAt ? new Date(pt.completedAt) : new Date();
    const dueDate = new Date(approvalDate);
    dueDate.setDate(dueDate.getDate() + 90);

    const payload = {
      id: `PT-${pt.id}`,
      fechaAprobacion: approvalDate.toLocaleDateString("es-AR"),
      vencimiento90Dias: dueDate.toLocaleDateString("es-AR"),
      legajo: String(pt.employee.legajo ?? ""),
      empleado: String(pt.employee.name ?? ""),
      sectorDestino: String(pt.targetSector?.name ?? ""),
      nuevoPuesto: String(pt.targetProfile?.title ?? ""),
      brecha: "Sin brechas (100% Apto)",
      estadoBrecha: "Completado",
      nota: "-",
      eficacia: "Apto Inicial",
    };

    await fetch(brechasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Error in syncNoGapTransferToPowerAutomate:", error);
  }
}
