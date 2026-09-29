import { prisma } from "./prisma";

const DEFAULT_WEBHOOK_URL = "https://default9444ead097714ed8a608802faff70d.4f.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/21/workflows/c0fb845ad3294f5b9e1b767e3ad73a0f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=M40CRgRv1BUe1CgwHpPwBJE6qxXquHtEgfoIUgio4QI";

export async function syncRecordToPowerAutomate(recordId: number) {
  try {
    const url = process.env.POWER_AUTOMATE_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
    if (!url) return;

    const record = await prisma.employeeTrainingRecord.findUnique({
      where: { id: recordId }
    });

    if (!record) return;

    // Excel cell character limit is 32767 chars. Truncate long Base64 strings to avoid errors.
    const sanitizeSig = (sig: string | null) => {
      if (!sig) return "";
      if (sig.length > 500) return "SÍ (Firma Digital)";
      return sig;
    };

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
      score: String(record.score ?? ""),
      scheduledDate: record.scheduledDate ? record.scheduledDate.toISOString() : "",
      rescheduledDate: record.rescheduledDate ? record.rescheduledDate.toISOString() : ""
    };

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).catch(err => {
      console.error("Error sending webhook to Power Automate:", err);
    });
  } catch (error) {
    console.error("Error in syncRecordToPowerAutomate:", error);
  }
}
