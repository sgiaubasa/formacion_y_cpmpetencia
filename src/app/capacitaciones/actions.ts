"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole, getSectorIdFromRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  getTrainingSectorAssignments,
  saveTrainingSectorAssignments,
  canSectorDeleteTopic
} from "@/lib/sectorTrainings";

export async function addTopic(formData: FormData) {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);

  let mySectorName = "";
  if (isSector && sectorRoleId) {
    const mySector = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
    if (mySector) {
      mySectorName = mySector.name;
    }
  }

  // Ahora CUALQUIER usuario de Sector o Administrador puede agregar temas
  const canAddTopic =
    role === "SGI" || role === "RRHH" || role === "ADMIN" || (isSector && Boolean(mySectorName));

  if (!canAddTopic) {
    return { error: "No tienes permisos para agregar temas de capacitación." };
  }

  const title = (formData.get("title") as string)?.trim();
  if (!title) {
    return { error: "El nombre del tema no puede estar vacío." };
  }

  try {
    const created = await prisma.training.create({
      data: { title, isMandatory: false }
    });

    const assignments = await getTrainingSectorAssignments();

    if (isSector) {
      // Si fue agregado por un Sector, se asigna EXCLUSIVAMENTE a su propio sector
      assignments[String(created.id)] = {
        allSectors: false,
        sectors: [mySectorName],
        createdBySector: mySectorName
      };
    } else {
      // Si fue agregado por SGI / RRHH / ADMIN, puede ser para todos o sectores elegidos
      const scope = formData.get("scope") as string;
      const isAllSectors = scope === "all" || formData.get("allSectors") === "true";
      const selectedSectors = formData.getAll("sectors") as string[];

      assignments[String(created.id)] = {
        allSectors: isAllSectors,
        sectors: isAllSectors ? [] : selectedSectors,
        createdBySector: undefined
      };
    }

    await saveTrainingSectorAssignments(assignments);

    revalidatePath("/capacitaciones");
    revalidatePath("/plan-anual");
    revalidatePath("/perfiles");
    revalidatePath("/formularios");

    return { success: true, topicId: created.id };
  } catch (err: any) {
    console.error("Error creating topic:", err);
    return { error: "Ocurrió un error al guardar el tema." };
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
    let updatedRecordsCount = 0;

    if (oldTitle !== newTitle) {
      await prisma.$transaction(async (tx) => {
        // 1. Actualizar el catálogo de temas (Training)
        await tx.training.update({
          where: { id },
          data: { title: newTitle }
        });

        // 2. Actualizar todas las capacitaciones asociadas a ese nombre
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

        // 3. Actualizar Perfiles de Puesto (conocimientosEsp)
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

        // 4. Actualizar Transferencias Pendientes
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
          } catch {}
        }
      });
    }

    // Actualizar asignación de sectores si viene especificada
    const scope = formData.get("scope") as string | null;
    if (scope) {
      const isAll = scope === "all" || formData.get("allSectors") === "true";
      const selectedSectors = formData.getAll("sectors") as string[];

      const assignments = await getTrainingSectorAssignments();
      assignments[String(id)] = {
        allSectors: isAll,
        sectors: isAll ? [] : selectedSectors,
        createdBySector: assignments[String(id)]?.createdBySector
      };
      await saveTrainingSectorAssignments(assignments);
    }

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
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);

  let mySectorName = "";
  if (isSector && sectorRoleId) {
    const mySector = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
    if (mySector) {
      mySectorName = mySector.name;
    }
  }

  const id = parseInt(formData.get("id") as string, 10);
  if (!id) {
    return { error: "ID de tema no válido." };
  }

  try {
    const assignments = await getTrainingSectorAssignments();
    const currentAssign = assignments[String(id)];

    if (isSector) {
      // Validar si el sector tiene permiso para eliminarlo
      const check = await canSectorDeleteTopic(id, mySectorName);
      if (!check.canDelete) {
        return { error: check.reason || "No tienes permiso para eliminar este tema." };
      }

      // Si el tema estaba asignado a más de un sector, removemos solo el sector actual
      if (currentAssign && currentAssign.sectors && currentAssign.sectors.length > 1) {
        currentAssign.sectors = currentAssign.sectors.filter((s) => s !== mySectorName);
        assignments[String(id)] = currentAssign;
        await saveTrainingSectorAssignments(assignments);
      } else {
        // Pertenecía exclusivamente a este sector: intentar borrar de la base
        delete assignments[String(id)];
        await saveTrainingSectorAssignments(assignments);

        try {
          await prisma.requirement.deleteMany({ where: { trainingId: id } });
          await prisma.training.delete({ where: { id } });
        } catch (dbErr) {
          // Si tiene relaciones de asistencia pasadas, aseguramos que quede desvinculado del sector
          assignments[String(id)] = {
            allSectors: false,
            sectors: [],
            createdBySector: mySectorName
          };
          await saveTrainingSectorAssignments(assignments);
        }
      }
    } else if (role === "SGI" || role === "RRHH" || role === "ADMIN") {
      // Administrador puede eliminar directamente
      delete assignments[String(id)];
      await saveTrainingSectorAssignments(assignments);

      try {
        await prisma.requirement.deleteMany({ where: { trainingId: id } });
        await prisma.training.delete({ where: { id } });
      } catch (dbErr) {
        // En caso de historial existente que no permite hard-delete, desvincular de todos los sectores
        assignments[String(id)] = {
          allSectors: false,
          sectors: []
        };
        await saveTrainingSectorAssignments(assignments);
      }
    } else {
      return { error: "No tienes permisos para realizar esta acción." };
    }

    revalidatePath("/capacitaciones");
    revalidatePath("/plan-anual");
    revalidatePath("/perfiles");
    revalidatePath("/formularios");

    return { success: true };
  } catch (e: any) {
    console.error("Error al eliminar tema:", e);
    return { error: "No se pudo eliminar el tema. Puede estar vinculado a registros históricos activos." };
  }
}
