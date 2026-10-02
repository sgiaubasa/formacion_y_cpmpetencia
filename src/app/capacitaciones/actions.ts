"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function addTopic(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  if (title) {
    await prisma.training.create({
      data: { title, isMandatory: false }
    });
    revalidatePath("/capacitaciones");
    revalidatePath("/plan-anual");
    revalidatePath("/perfiles");
  }
}

export async function updateTopicSgi(formData: FormData) {
  const role = await getCurrentRole();
  if (role !== "SGI") {
    return { error: "Solo el rol SGI tiene permisos para modificar temas de capacitación." };
  }

  const id = parseInt(formData.get("id") as string, 10);
  const newTitle = (formData.get("title") as string)?.trim();

  if (!id || !newTitle) {
    return { error: "El nombre del tema no puede estar vacío." };
  }

  try {
    const existing = await prisma.training.findUnique({ where: { id } });
    if (!existing) {
      return { error: "Tema no encontrado." };
    }

    const oldTitle = existing.title.trim();
    if (oldTitle === newTitle) {
      return { success: true, updatedRecords: 0 };
    }

    let updatedRecordsCount = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar el catálogo de temas (Training)
      await tx.training.update({
        where: { id },
        data: { title: newTitle }
      });

      // 2. Actualizar todas las capacitaciones (Realizadas, Programadas y Brechas) asociadas a ese nombre
      const updateResult = await tx.employeeTrainingRecord.updateMany({
        where: {
          trainingName: {
            equals: oldTitle,
            mode: "insensitive"
          }
        },
        data: {
          trainingName: newTitle
        }
      });
      updatedRecordsCount = updateResult.count;

      // 3. Actualizar Perfiles de Puesto (conocimientosEsp) que contengan ese tema en sus líneas
      const profilesWithTopic = await tx.jobProfile.findMany({
        where: {
          conocimientosEsp: {
            contains: oldTitle,
            mode: "insensitive"
          }
        }
      });

      for (const profile of profilesWithTopic) {
        if (!profile.conocimientosEsp) continue;
        const lines = profile.conocimientosEsp.split("\n");
        let changed = false;
        const updatedLines = lines.map((line) => {
          if (line.trim().toLowerCase() === oldTitle.toLowerCase()) {
            changed = true;
            return newTitle;
          }
          return line;
        });

        if (changed) {
          await tx.jobProfile.update({
            where: { id: profile.id },
            data: { conocimientosEsp: updatedLines.join("\n") }
          });
        }
      }

      // 4. Actualizar Transferencias Pendientes / Completadas cuyos gaps mencionen este tema
      const transfers = await tx.pendingTransfer.findMany({
        where: {
          gaps: {
            contains: oldTitle,
            mode: "insensitive"
          }
        }
      });

      for (const tr of transfers) {
        try {
          const parsedGaps: string[] = JSON.parse(tr.gaps);
          if (Array.isArray(parsedGaps)) {
            let changedGap = false;
            const newGaps = parsedGaps.map((g) => {
              if (typeof g === "string" && g.trim().toLowerCase() === oldTitle.toLowerCase()) {
                changedGap = true;
                return newTitle;
              }
              return g;
            });
            if (changedGap) {
              await tx.pendingTransfer.update({
                where: { id: tr.id },
                data: { gaps: JSON.stringify(newGaps) }
              });
            }
          }
        } catch {
          // Ignorar si gaps no es JSON válido
        }
      }
    });

    revalidatePath("/capacitaciones");
    revalidatePath("/plan-anual");
    revalidatePath("/brechas");
    revalidatePath("/perfiles");
    revalidatePath("/transferencias");
    revalidatePath("/personal");

    return { success: true, updatedRecords: updatedRecordsCount };
  } catch (err: any) {
    console.error("Error updating topic in SGI:", err);
    return { error: "Ocurrió un error al actualizar el tema y sus capacitaciones asociadas." };
  }
}

export async function deleteTopic(formData: FormData) {
  try {
    const id = parseInt(formData.get("id") as string, 10);
    await prisma.training.delete({ where: { id } });
    revalidatePath("/capacitaciones");
    revalidatePath("/plan-anual");
  } catch (e) {
    console.error("No se puede borrar porque está en uso", e);
  }
}
