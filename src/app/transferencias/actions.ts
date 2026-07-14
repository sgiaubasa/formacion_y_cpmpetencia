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
  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: pending.employeeId },
      data: {
        sectorId: pending.targetSectorId,
        jobProfileId: pending.targetProfileId
      }
    });

    // 2. Crear registros de capacitación para cada brecha con la fecha programada
    const trainingRecordsToCreate = gaps.map((gap: string) => {
      const scheduledDateStr = formData.get(`date_${gap}`) as string;
      const scheduledDate = scheduledDateStr ? new Date(scheduledDateStr) : undefined;
      
      return {
        employeeId: pending.employeeId,
        trainingName: gap,
        status: 'IN_PLAN',
        scheduledDate,
        sourceProfileId: pending.targetProfileId
      };
    });

    if (trainingRecordsToCreate.length > 0) {
      await tx.employeeTrainingRecord.createMany({
        data: trainingRecordsToCreate
      });
    }

    // 3. Eliminar la transferencia pendiente
    await tx.pendingTransfer.delete({
      where: { id: transferId }
    });
  });

  revalidatePath('/transferencias');
  revalidatePath('/personal');
  revalidatePath('/brechas');
  return { success: true };
}
