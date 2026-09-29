"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { syncRecordToPowerAutomate } from "@/lib/powerAutomate";

export async function saveRemoteSignature(formData: FormData) {
  try {
    const recordId = parseInt(formData.get("recordId") as string);
    const employeeSignature = formData.get("employeeSignature") as string;
    
    if (!recordId || !employeeSignature) {
      return { success: false, error: "Faltan datos obligatorios." };
    }

    const record = await prisma.employeeTrainingRecord.findUnique({
      where: { id: recordId }
    });

    if (!record) {
      return { success: false, error: "Registro no encontrado." };
    }

    if (record.status === 'COMPLETED') {
      return { success: false, error: "La capacitación ya fue completada previamente." };
    }

    await prisma.employeeTrainingRecord.update({
      where: { id: recordId },
      data: {
        status: 'COMPLETED',
        effectiveness: 'PENDING',
        completedAt: new Date(),
        employeeSignature: employeeSignature
        // We leave instructorSignature null as it's a remote signing by the employee
      }
    });

    // Sincronizar en segundo plano con Power Automate (Excel Online)
    syncRecordToPowerAutomate(recordId).catch(() => {});
    
    // Revalidate paths that might display this data
    revalidatePath('/plan-anual');
    revalidatePath('/brechas');
    revalidatePath('/transferencias');
    
    return { success: true };
  } catch (error) {
    console.error("Error in saveRemoteSignature:", error);
    return { success: false, error: "Error interno del servidor." };
  }
}
