import { prisma } from "@/lib/prisma";

export interface EvaluatorConfig {
  canEvaluate: boolean;
  fullName: string;
}

export interface EfficacyTraceInfo {
  evaluatorName: string;
  evaluatorEmail: string;
  evaluatedAt: string;
}

const EVALUATORS_SETTING_KEY = "efficacy_evaluators";
const TRACE_SETTING_KEY = "efficacy_evaluations_trace";

export function formatNameFromEmail(email: string): string {
  if (!email || !email.includes("@")) return email || "Usuario";
  const local = email.split("@")[0];
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export async function getEfficacyEvaluatorsMap(): Promise<Record<string, EvaluatorConfig>> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: EVALUATORS_SETTING_KEY }
    });
    if (!setting?.value) return {};
    const parsed = JSON.parse(setting.value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.error("Error reading efficacy_evaluators setting:", err);
    return {};
  }
}

export async function setEfficacyEvaluatorConfig(
  email: string,
  config: { canEvaluate: boolean; fullName?: string }
): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return;
  try {
    const map = await getEfficacyEvaluatorsMap();
    const existing = map[cleanEmail];
    map[cleanEmail] = {
      canEvaluate: config.canEvaluate,
      fullName:
        config.fullName?.trim() ||
        existing?.fullName ||
        formatNameFromEmail(cleanEmail)
    };
    await prisma.appSetting.upsert({
      where: { id: EVALUATORS_SETTING_KEY },
      update: { value: JSON.stringify(map) },
      create: { id: EVALUATORS_SETTING_KEY, value: JSON.stringify(map) }
    });
  } catch (err) {
    console.error("Error saving efficacy_evaluators setting:", err);
  }
}

export async function getEfficacyTraceMap(): Promise<Record<string, EfficacyTraceInfo>> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: TRACE_SETTING_KEY }
    });
    if (!setting?.value) return {};
    const parsed = JSON.parse(setting.value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.error("Error reading efficacy_evaluations_trace setting:", err);
    return {};
  }
}

export async function saveEfficacyTraceForRecord(
  recordId: number,
  evaluatorName: string,
  evaluatorEmail: string
): Promise<void> {
  if (!recordId) return;
  try {
    const map = await getEfficacyTraceMap();
    map[`record_${recordId}`] = {
      evaluatorName: evaluatorName.trim(),
      evaluatorEmail: evaluatorEmail.toLowerCase().trim(),
      evaluatedAt: new Date().toISOString()
    };
    await prisma.appSetting.upsert({
      where: { id: TRACE_SETTING_KEY },
      update: { value: JSON.stringify(map) },
      create: { id: TRACE_SETTING_KEY, value: JSON.stringify(map) }
    });
  } catch (err) {
    console.error("Error saving efficacy_evaluations_trace setting:", err);
  }
}
