import { prisma } from "./prisma";

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

async function getWebhookUrls(): Promise<{
  planUrl: string;
  brechasUrl: string;
}> {
  let planUrl = process.env.POWER_AUTOMATE_WEBHOOK_URL || "";
  let brechasUrl = process.env.POWER_AUTOMATE_BRECHAS_WEBHOOK_URL || "";

  try {
    const settings = await prisma.appSetting.findMany({
      where: {
        id: {
          in: ["power_automate_webhook_url", "power_automate_brechas_webhook_url"],
        },
      },
    });
    for (const s of settings) {
      if (s.id === "power_automate_webhook_url" && s.value) {
        planUrl = s.value.trim();
      }
      if (s.id === "power_automate_brechas_webhook_url" && s.value) {
        brechasUrl = s.value.trim();
      }
    }
  } catch {
    // Continuar con variables de entorno si falla lectura
  }

  return { planUrl, brechasUrl };
}

export async function syncRecordToPowerAutomate(recordId: number) {
  try {
    const { planUrl: url, brechasUrl } = await getWebhookUrls();

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

    const requests: Promise<any>[] = [];

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

      requests.push(
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(err => {
          console.error("Error sending webhook to Power Automate:", err);
        })
      );
    }

    // Si el registro proviene de una Brecha de Cambio de Puesto (sourceProfileId), enviarlo también al flujo de Brechas
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

      requests.push(
        fetch(brechasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(brechaPayload),
        }).catch(err => {
          console.error("Error sending brecha webhook to Power Automate:", err);
        })
      );
    }

    if (requests.length > 0) {
      await Promise.allSettled(requests);
    }
  } catch (error) {
    console.error("Error in syncRecordToPowerAutomate:", error);
  }
}

export async function syncNoGapTransferToPowerAutomate(transferId: number) {
  try {
    const { brechasUrl } = await getWebhookUrls();
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
