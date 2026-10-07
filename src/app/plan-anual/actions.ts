"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";
import { join } from "path";
import fs from "fs";
import { encryptRecordId } from "@/lib/crypto";
import { syncRecordToPowerAutomate } from "@/lib/powerAutomate";
import { createClient } from "@supabase/supabase-js";
import { saveTrainingMaterialForRecords } from "@/lib/trainingMaterials";

async function saveEvidenceFile(file: File, recordId: number): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
      const cleanName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${recordId}-${Date.now()}-${cleanName}`;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const { data, error } = await supabaseAdmin.storage
        .from('evidencias')
        .upload(filename, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: true
        });

      if (!error && data) {
        const { data: publicData } = supabaseAdmin.storage
          .from('evidencias')
          .getPublicUrl(filename);
        return publicData.publicUrl;
      } else {
        console.error("Supabase storage upload error:", error);
      }
    } catch (storageErr) {
      console.error("Storage upload exception:", storageErr);
    }
  }

  // Fallback for local development or if storage is unreachable
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const uploadDir = join(process.cwd(), 'public/uploads');
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
  const materialUrl = formData.get("materialUrl") as string | null;
  const materialName = formData.get("materialName") as string | null;
  
  const existing = await prisma.employeeTrainingRecord.findUnique({ where: { id: recordId } });
  const newDate = dateStr ? new Date(dateStr) : null;
  
  let updateData: any = { status: 'IN_PLAN' };
  
  // Si ya tenía fecha programada y se cambia, cuenta como reprogramación
  if (existing?.scheduledDate && newDate && existing.scheduledDate.getTime() !== newDate.getTime()) {
    updateData.rescheduledDate = newDate;
  } else {
    updateData.scheduledDate = newDate;
  }

  await prisma.employeeTrainingRecord.update({
    where: { id: recordId },
    data: updateData
  });

  if (materialUrl) {
    await saveTrainingMaterialForRecords([recordId], {
      url: materialUrl,
      name: materialName || "Material de Capacitación"
    });
  }

  await syncRecordToPowerAutomate(recordId).catch(() => {});
  revalidatePath('/plan-anual');
  revalidatePath('/');
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

    // Update the record
    await prisma.employeeTrainingRecord.update({
      where: { id: recordId },
      data: {
        status: 'COMPLETED',
        effectiveness: 'PENDING',
        completedAt: dateStr ? new Date(dateStr) : new Date(),
        ...(score ? { score } : {}),
        ...(evidencePath ? { evidencePath } : {}),
        ...(mode === "sign" && employeeSignature ? { employeeSignature } : {}),
        ...(mode === "sign" && instructorSignature ? { instructorSignature } : {}),
        ...(mode === "sign" && instructorName ? { instructorName } : {})
      }
    });

    await syncRecordToPowerAutomate(recordId).catch(() => {});
    revalidatePath('/plan-anual');
    revalidatePath('/');
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
  revalidatePath('/plan-anual');
  revalidatePath('/');
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

    let updateData: any = {};

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
    
    revalidatePath('/plan-anual');
    revalidatePath('/');
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