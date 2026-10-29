"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { syncRecordToPowerAutomate } from "@/lib/powerAutomate";
import {
  isOnlineTrainingMatch,
  saveTrainingInstructorSignatureForTopic
} from "@/lib/onlineForms";

export async function saveRemoteSignature(formData: FormData) {
  try {
    const recordId = parseInt(formData.get("recordId") as string);
    const roleMode = (formData.get("roleMode") as string) || "empleado";
    const employeeSignature = formData.get("employeeSignature") as string | null;
    const instructorSignature = formData.get("instructorSignature") as string | null;
    const instructorName = (formData.get("instructorName") as string | null)?.trim();
    const completedAtStr = (formData.get("completedAt") as string | null)?.trim();
    const scoreStr = (formData.get("score") as string | null)?.trim();

    if (!recordId) {
      return { success: false, error: "ID de registro inválido." };
    }

    const record = await prisma.employeeTrainingRecord.findUnique({
      where: { id: recordId },
      include: { employee: true }
    });

    if (!record) {
      return { success: false, error: "Registro no encontrado." };
    }

    const updateData: any = {
      status: "COMPLETED",
      effectiveness:
        record.effectiveness && record.effectiveness !== "NONE"
          ? record.effectiveness
          : "PENDING"
    };

    if ((roleMode === "empleado" || roleMode === "ambos") && employeeSignature) {
      updateData.employeeSignature = employeeSignature;
      if (!record.completedAt && !completedAtStr) {
        updateData.completedAt = new Date();
      }
    }

    if (roleMode === "instructor" || roleMode === "ambos") {
      if (instructorSignature) {
        updateData.instructorSignature = instructorSignature;
      }
      if (instructorName) {
        updateData.instructorName = instructorName;
      }
      if (completedAtStr) {
        updateData.completedAt = new Date(completedAtStr + "T12:00:00");
      } else if (!record.completedAt) {
        updateData.completedAt = new Date();
      }
      if (scoreStr !== undefined && scoreStr !== "") {
        updateData.score = scoreStr;
      }
    }

    await prisma.employeeTrainingRecord.update({
      where: { id: recordId },
      data: updateData
    });

    // Si firmó el instructor, propagar su firma a todas las planillas de esta misma capacitación
    if ((roleMode === "instructor" || roleMode === "ambos") && instructorSignature && instructorName) {
      await saveTrainingInstructorSignatureForTopic(record.trainingName, {
        instructorName,
        instructorSignature,
        mode: "link",
        updatedAt: new Date().toISOString()
      });

      const allSameTraining = await prisma.employeeTrainingRecord.findMany({
        select: { id: true, trainingName: true }
      });
      const targetIds = allSameTraining
        .filter((r) => isOnlineTrainingMatch(r.trainingName, record.trainingName))
        .map((r) => r.id);

      if (targetIds.length > 0) {
        await prisma.employeeTrainingRecord.updateMany({
          where: { id: { in: targetIds } },
          data: {
            instructorName,
            instructorSignature
          }
        });
      }
    }

    await syncRecordToPowerAutomate(recordId).catch(() => {});

    revalidatePath("/plan-anual");
    revalidatePath(`/plan-anual/planilla/${recordId}`);
    revalidatePath("/brechas");
    revalidatePath("/transferencias");
    revalidatePath("/formularios");

    return { success: true };
  } catch (error) {
    console.error("Error in saveRemoteSignature:", error);
    return { success: false, error: "Error interno del servidor." };
  }
}
