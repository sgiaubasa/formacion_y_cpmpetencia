"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";
import { join } from "path";
import fs from "fs";
import { encryptRecordId } from "@/lib/crypto";
import { syncRecordToPowerAutomate } from "@/lib/powerAutomate";
import crypto from "crypto";
import { saveTrainingMaterialForRecords } from "@/lib/trainingMaterials";
import { buildSvgSignatureDataUri } from "@/app/api/webhooks/microsoft-forms/route";

async function saveEvidenceFile(file: File, recordId: number): Promise<string> {
  const cleanName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64Data = buffer.toString("base64");
  const contentType = file.type || "application/octet-stream";

  // 1. Subir a OneDrive Corporativo vía Webhook de Power Automate si está configurado
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: "onedrive_upload_webhook_url" }
    });
    const oneDriveWebhookUrl =
      setting?.value?.trim() || process.env.POWER_AUTOMATE_ONEDRIVE_WEBHOOK_URL || "";

    if (oneDriveWebhookUrl) {
      const webhookRes = await fetch(oneDriveWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `${recordId}-${Date.now()}-${cleanName}`,
          originalName: file.name,
          contentType,
          category: "evidencia",
          base64: base64Data
        })
      });

      if (webhookRes.ok) {
        const text = await webhookRes.text();
        try {
          const parsed = JSON.parse(text);
          const returnedUrl = parsed.url || parsed.webUrl || parsed.shareUrl || parsed.link;
          if (returnedUrl) return returnedUrl;
        } catch {
          if (text.trim().startsWith("http")) return text.trim();
        }
      }
    }
  } catch (webhookErr) {
    console.warn("OneDrive webhook upload fallback:", webhookErr);
  }

  // 2. Guardar en almacenamiento interno con caché inmutable (0 bytes de Supabase Storage Egress)
  try {
    const fileId = `${recordId}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    await prisma.appSetting.upsert({
      where: { id: `cloud_file_${fileId}` },
      update: {
        value: JSON.stringify({
          name: file.name,
          cleanName,
          contentType,
          category: "evidencia",
          createdAt: new Date().toISOString(),
          base64: base64Data
        })
      },
      create: {
        id: `cloud_file_${fileId}`,
        value: JSON.stringify({
          name: file.name,
          cleanName,
          contentType,
          category: "evidencia",
          createdAt: new Date().toISOString(),
          base64: base64Data
        })
      }
    });
    return `/api/files/${fileId}`;
  } catch (dbErr) {
    console.warn("DB file save fallback:", dbErr);
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const uploadDir = join(process.cwd(), "public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const path = join(uploadDir, filename);
    await writeFile(path, buffer);
    return `/uploads/${filename}`;
  } catch (fsErr) {
    console.warn("Local filesystem write skipped/failed (expected on Vercel):", fsErr);
    return file.name;
  }
}

export async function programarFecha(formData: FormData) {
  const recordId = parseInt(formData.get("recordId") as string);
  const dateStr = formData.get("scheduledDate") as string;
  const materialUrl = (formData.get("materialUrl") as string | null)?.trim() || null;
  const materialName = (formData.get("materialName") as string | null)?.trim() || null;
  const materialType = (formData.get("materialType") as "pdf" | "video" | null) || undefined;
  const instructorName = (formData.get("instructorName") as string | null)?.trim() || null;
  const instructorSignatureMode =
    (formData.get("instructorSignatureMode") as "digital" | "link" | null) || "digital";

  const existing = await prisma.employeeTrainingRecord.findUnique({ where: { id: recordId } });
  const newDate = dateStr ? new Date(dateStr) : null;

  const updateData: any = { status: "IN_PLAN" };

  if (existing?.scheduledDate && newDate && existing.scheduledDate.getTime() !== newDate.getTime()) {
    updateData.rescheduledDate = newDate;
  } else {
    updateData.scheduledDate = newDate;
  }

  if (instructorName) {
    updateData.instructorName = instructorName;
    if (instructorSignatureMode === "digital") {
      const dateFormatted = (newDate || new Date()).toLocaleDateString("es-AR");
      updateData.instructorSignature = buildSvgSignatureDataUri(
        instructorName.replace(/\(Leg\.\s*\d+\)/i, "").trim(),
        "Instructor — Firma Digital Validada",
        `Fecha: ${dateFormatted}`
      );
    }
  }

  await prisma.employeeTrainingRecord.update({
    where: { id: recordId },
    data: updateData
  });

  if (materialUrl) {
    await saveTrainingMaterialForRecords([recordId], {
      url: materialUrl,
      name: materialName || (materialType === "video" ? "Video de Capacitación" : "Material PDF"),
      type: materialType
    });
  }

  await syncRecordToPowerAutomate(recordId).catch(() => {});
  revalidatePath("/plan-anual");
  revalidatePath("/");

  if (instructorSignatureMode === "link") {
    const instructorToken = encryptRecordId(recordId, "instructor");
    return { ok: true, instructorToken };
  }
  return { ok: true };
}

export async function marcarEjecutada(formData: FormData) {
  try {
    const recordId = parseInt(formData.get("recordId") as string);
    const dateStr = formData.get("completedAt") as string;
    const score = formData.get("score") as string | null;
    const mode = formData.get("mode") as string;
    const file = formData.get("evidence") as File | null;
    const evidenceUrl = formData.get("evidenceUrl") as string | null;
    const employeeSignature = formData.get("employeeSignature") as string | null;
    const instructorSignature = formData.get("instructorSignature") as string | null;
    const instructorName = formData.get("instructorName") as string | null;

    let evidencePath: string | null = evidenceUrl || null;
    if (!evidencePath && mode === "upload" && file && file.size > 0) {
      evidencePath = await saveEvidenceFile(file, recordId);
    }

    await prisma.employeeTrainingRecord.update({
      where: { id: recordId },
      data: {
        status: "COMPLETED",
        effectiveness: "PENDING",
        completedAt: dateStr ? new Date(dateStr) : new Date(),
        ...(score ? { score } : {}),
        ...(evidencePath ? { evidencePath } : {}),
        ...(mode === "sign" && employeeSignature ? { employeeSignature } : {}),
        ...(mode === "sign" && instructorSignature ? { instructorSignature } : {}),
        ...(mode === "sign" && instructorName ? { instructorName } : {})
      }
    });

    await syncRecordToPowerAutomate(recordId).catch(() => {});
    revalidatePath("/plan-anual");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("Error in marcarEjecutada:", err);
    return { error: err?.message || "No se pudo guardar el registro." };
  }
}

export async function borrarCapacitacion(formData: FormData) {
  const recordId = parseInt(formData.get("recordId") as string);
  const existing = await prisma.employeeTrainingRecord.findUnique({
    where: { id: recordId }
  });
  await prisma.employeeTrainingRecord.delete({
    where: { id: recordId }
  });
  if (existing) {
    const { syncDeletedRecordToPowerAutomate } = await import("@/lib/powerAutomate");
    await syncDeletedRecordToPowerAutomate({
      id: existing.id,
      employeeId: existing.employeeId,
      trainingName: existing.trainingName
    }).catch(() => {});
  }
  revalidatePath("/plan-anual");
  revalidatePath("/");
}

export async function sgiEditRecord(formData: FormData) {
  try {
    const recordId = parseInt(formData.get("recordId") as string);
    const objectiveStr = formData.get("objective") as string | null;
    const scheduledDateStr = formData.get("scheduledDate") as string;
    const rescheduledDateStr = formData.get("rescheduledDate") as string | null;
    const completedAtStr = formData.get("completedAt") as string;
    const scoreStr = formData.get("score") as string;
    const file = formData.get("evidence") as File | null;
    const evidenceUrl = formData.get("evidenceUrl") as string | null;
    const materialUrl = formData.get("materialUrl") as string | null;
    const materialName = formData.get("materialName") as string | null;

    const updateData: any = {};

    if (objectiveStr !== null) updateData.objective = objectiveStr.trim();
    if (scheduledDateStr) updateData.scheduledDate = new Date(scheduledDateStr);
    if (rescheduledDateStr !== null) {
      updateData.rescheduledDate = rescheduledDateStr ? new Date(rescheduledDateStr) : null;
    }
    if (completedAtStr) updateData.completedAt = new Date(completedAtStr);
    if (scoreStr) updateData.score = scoreStr;

    if (evidenceUrl) {
      updateData.evidencePath = evidenceUrl;
    } else if (file && file.size > 0) {
      updateData.evidencePath = await saveEvidenceFile(file, recordId);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.employeeTrainingRecord.update({
        where: { id: recordId },
        data: updateData
      });
      await syncRecordToPowerAutomate(recordId).catch(() => {});
    }

    if (materialUrl) {
      await saveTrainingMaterialForRecords([recordId], {
        url: materialUrl,
        name: materialName || "Material de Capacitación"
      });
    }

    revalidatePath("/plan-anual");
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("Error in sgiEditRecord:", err);
    return { error: err?.message || "No se pudo actualizar el registro." };
  }
}

export async function generarLinkFirma(recordId: number) {
  const employeeToken = encryptRecordId(recordId, "empleado");
  const instructorToken = encryptRecordId(recordId, "instructor");
  return { employeeToken, instructorToken };
}
