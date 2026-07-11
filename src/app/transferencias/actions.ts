"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function confirmarTransferenciaAction(formData: FormData) {
  const transferId = parseInt(formData.get("transferId") as string);
  
  const pending = await prisma.pendingTransfer.findUnique({
    where: { id: transferId }
  });

  if (!pending) throw new Error("Transferencia no encontrada");

  const gaps = JSON.parse(pending.gaps) as string[];

  // 1. Actualizar al empleado
  await prisma.employee.update({
    where: { id: pending.employeeId },
    data: {
      sectorId: pending.targetSectorId,
      jobProfileId: pending.targetProfileId
    }
  });

  // 2. Crear las capacitaciones con las fechas provistas
  for (const gap of gaps) {
    const scheduledDateStr = formData.get(`date_${gap}`) as string;
    if (scheduledDateStr) {
      await prisma.employeeTrainingRecord.create({
        data: {
          employeeId: pending.employeeId,
          trainingName: gap,
          status: 'IN_PLAN',
          scheduledDate: new Date(scheduledDateStr)
        }
      });
    }
  }

  // 3. Eliminar la transferencia pendiente
  await prisma.pendingTransfer.delete({
    where: { id: transferId }
  });

  revalidatePath('/transferencias');
  revalidatePath('/personal');
  revalidatePath('/brechas');
  return { success: true };
}
