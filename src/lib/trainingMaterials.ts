import { prisma } from "@/lib/prisma";

export interface TrainingMaterial {
  url: string;
  name?: string;
  type?: "pdf" | "video" | "other";
  updatedAt?: string;
}

const SETTING_KEY = "training_materials";

export function detectMaterialType(urlOrName: string): "pdf" | "video" | "other" {
  const lower = urlOrName.toLowerCase().split("?")[0];
  if (lower.endsWith(".pdf")) return "pdf";
  if (
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".ogg") ||
    lower.endsWith(".m4v") ||
    lower.endsWith(".avi")
  ) {
    return "video";
  }
  return "other";
}

export async function getTrainingMaterialsMap(): Promise<Record<string, TrainingMaterial>> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: SETTING_KEY }
    });
    if (!setting?.value) return {};
    const parsed = JSON.parse(setting.value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.error("Error reading training_materials setting:", err);
    return {};
  }
}

export async function getTrainingMaterialForRecord(recordId: number): Promise<TrainingMaterial | null> {
  const map = await getTrainingMaterialsMap();
  return map[`record_${recordId}`] || null;
}

export async function saveTrainingMaterialForRecords(
  recordIds: number[],
  material: TrainingMaterial
): Promise<void> {
  if (!recordIds.length || !material?.url) return;
  try {
    const map = await getTrainingMaterialsMap();
    const detectedType = material.type || detectMaterialType(material.name || material.url);
    const entry: TrainingMaterial = {
      url: material.url,
      name: material.name || "Material de Capacitación",
      type: detectedType,
      updatedAt: new Date().toISOString()
    };

    for (const id of recordIds) {
      map[`record_${id}`] = entry;
    }

    await prisma.appSetting.upsert({
      where: { id: SETTING_KEY },
      update: { value: JSON.stringify(map) },
      create: { id: SETTING_KEY, value: JSON.stringify(map) }
    });
  } catch (err) {
    console.error("Error saving training_materials setting:", err);
  }
}
