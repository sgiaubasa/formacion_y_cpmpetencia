"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";
import { join } from "path";
import fs from "fs";

export async function programarFecha(formData: FormData) {
  const recordId = parseInt(formData.get("recordId") as string);
  const dateStr = formData.get("scheduledDate") as string;
  
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
  revalidatePath('/plan-anual');
}

export async function marcarEjecutada(formData: FormData) {
  const recordId = parseInt(formData.get("recordId") as string);
  const dateStr = formData.get("completedAt") as string;
  const mode = formData.get("mode") as string;
  const file = formData.get("evidence") as File | null;
  const employeeSignature = formData.get("employeeSignature") as string | null;
  const instructorSignature = formData.get("instructorSignature") as string | null;
  const instructorName = formData.get("instructorName") as string | null;
  
  let evidencePath = null;
  if (mode === "upload" && file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const uploadDir = join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const path = join(uploadDir, filename);
    await writeFile(path, buffer);
    evidencePath = `/uploads/${filename}`;
  }

  // Update the record
  await prisma.employeeTrainingRecord.update({
    where: { id: recordId },
    data: {
      status: 'COMPLETED',
      effectiveness: 'PENDING',
      completedAt: dateStr ? new Date(dateStr) : new Date(),
      ...(evidencePath ? { evidencePath } : {}),
      ...(mode === "sign" && employeeSignature ? { employeeSignature } : {}),
      ...(mode === "sign" && instructorSignature ? { instructorSignature } : {}),
      ...(mode === "sign" && instructorName ? { instructorName } : {})
    }
  });
  revalidatePath('/plan-anual');
}

export async function borrarCapacitacion(formData: FormData) {
  const recordId = parseInt(formData.get("recordId") as string);
  await prisma.employeeTrainingRecord.delete({
    where: { id: recordId }
  });
  revalidatePath('/plan-anual');
}
