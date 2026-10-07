import { prisma } from "@/lib/prisma";

/**
 * Devuelve la condición Prisma para filtrar registros de capacitación (`EmployeeTrainingRecord`)
 * de modo que un sector solo vea las capacitaciones pertenecientes a su sector (excluyendo
 * capacitaciones históricas que el empleado haya realizado en otro sector previo antes de un traslado),
 * mientras que RRHH, SGI y ADMIN ven absolutamente todo.
 */
export function buildSectorRecordSourceFilter(allowedSectors: string[] | null) {
  if (!allowedSectors || allowedSectors.length === 0) {
    return {};
  }
  return {
    OR: [
      { sourceProfileId: null },
      { sourceProfile: { gerencia: { in: allowedSectors } } }
    ]
  };
}

/**
 * Devuelve el catálogo completo de temas a capacitar (`Training`) para todos los sectores
 * (tanto en la visualización de Temas a Capacitar como en el desplegable de programación del Plan Anual).
 * Los permisos por rol se aplican únicamente para agregar o editar temas nuevos.
 */
export async function getTrainingsForSectors(_allowedSectors?: string[] | null) {
  return prisma.training.findMany({
    orderBy: { title: "asc" }
  });
}
