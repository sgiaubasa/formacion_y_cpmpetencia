import { prisma } from "@/lib/prisma";
import { getCanonicalTrainingName } from "@/lib/canonicalTrainings";

export interface TopicSectorAssignment {
  allSectors: boolean; // Si true, el tema está habilitado para todos los sectores de AUBASA
  sectors: string[];   // Nombres de los sectores específicos habilitados (ej: ["Asistencia Vial", "Operaciones"])
  createdBySector?: string; // Si fue creado directamente por un sector
}

export type TopicAssignmentsMap = Record<string, TopicSectorAssignment>;

export interface SectorTrainingItem {
  id: number;
  title: string;
  objective?: string | null;
  isMandatory?: boolean;
  allSectors: boolean;
  sectors: string[];
  createdBySector?: string;
  canDeleteBySector?: boolean;
}

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
 * Obtiene el mapa de asignaciones explícitas de temas a sectores desde AppSetting
 */
export async function getTrainingSectorAssignments(): Promise<TopicAssignmentsMap> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: "training_sector_assignments" }
    });
    if (!setting?.value) return {};
    return JSON.parse(setting.value) as TopicAssignmentsMap;
  } catch (err) {
    console.error("Error loading training sector assignments:", err);
    return {};
  }
}

/**
 * Guarda o actualiza el mapa de asignaciones de temas en AppSetting
 */
export async function saveTrainingSectorAssignments(map: TopicAssignmentsMap): Promise<void> {
  await prisma.appSetting.upsert({
    where: { id: "training_sector_assignments" },
    update: { value: JSON.stringify(map) },
    create: {
      id: "training_sector_assignments",
      value: JSON.stringify(map),
      description: "Asignación de temas a capacitar por sector o globales (AUBASA)"
    }
  });
}

/**
 * Devuelve los temas de capacitación (`Training`) correspondientes al sector indicado.
 * - Si `allowedSectors` es null o vacío (Admin, SGI, RRHH): devuelve el catálogo completo con sus metadatos.
 * - Si `allowedSectors` contiene sectores: devuelve ÚNICAMENTE los temas que aplican a esos sectores,
 *   incluyendo:
 *   1) Temas asignados a "Todos los sectores" (transversales).
 *   2) Temas asignados explícitamente a ese sector.
 *   3) Temas requeridos por los Perfiles de Puesto del sector (`Requirement` -> `JobProfile`).
 *   4) Temas que ya cuenten con historial (`EmployeeTrainingRecord`) en el sector.
 *   5) Temas creados directamente por el sector.
 */
export async function getTrainingsForSectors(
  allowedSectors?: string[] | null
): Promise<SectorTrainingItem[]> {
  const allTrainings = await prisma.training.findMany({
    orderBy: { title: "asc" }
  });

  const assignments = await getTrainingSectorAssignments();

  // Para usuarios con visión global (SGI, RRHH, Admin)
  if (!allowedSectors || allowedSectors.length === 0) {
    return allTrainings.map((t) => {
      const assign = assignments[String(t.id)];
      return {
        id: t.id,
        title: t.title,
        objective: t.objective,
        isMandatory: t.isMandatory,
        allSectors: assign ? Boolean(assign.allSectors) : true, // Por defecto global si no está mapeado
        sectors: assign?.sectors || [],
        createdBySector: assign?.createdBySector,
        canDeleteBySector: true
      };
    });
  }

  // Para usuarios de Sector: buscamos los temas relevantes a su área
  const [profileRequirements, sectorRecords, legacySetting] = await Promise.all([
    prisma.requirement.findMany({
      where: {
        jobProfile: {
          gerencia: { in: allowedSectors }
        }
      },
      select: { trainingId: true }
    }),
    prisma.employeeTrainingRecord.findMany({
      where: {
        employee: {
          sector: { name: { in: allowedSectors } }
        }
      },
      select: { trainingName: true },
      distinct: ["trainingName"]
    }),
    prisma.appSetting.findUnique({
      where: { id: "sector_created_trainings" }
    }).catch(() => null)
  ]);

  const requiredTrainingIds = new Set(profileRequirements.map((r) => r.trainingId));

  const sectorRecordNames = new Set(
    sectorRecords.map((r) => r.trainingName.trim().toLowerCase())
  );
  const sectorCanonicalNames = new Set(
    sectorRecords.map((r) => getCanonicalTrainingName(r.trainingName).trim().toLowerCase())
  );

  let legacyCreatedMap: Record<string, string> = {};
  if (legacySetting?.value) {
    try {
      legacyCreatedMap = JSON.parse(legacySetting.value);
    } catch {}
  }

  const result: SectorTrainingItem[] = [];

  for (const t of allTrainings) {
    const assign = assignments[String(t.id)];
    const titleClean = t.title.trim().toLowerCase();
    const canonicalClean = getCanonicalTrainingName(t.title).trim().toLowerCase();

    let isIncluded = false;
    let isCreatedByMySector = false;
    let isGlobal = false;

    // 1. Asignación explícita
    if (assign) {
      if (assign.allSectors) {
        isIncluded = true;
        isGlobal = true;
      } else if (assign.sectors && assign.sectors.some((s) => allowedSectors.includes(s))) {
        isIncluded = true;
      }
      if (assign.createdBySector && allowedSectors.includes(assign.createdBySector)) {
        isIncluded = true;
        isCreatedByMySector = true;
      }
    } else {
      // 2. Si no tiene asignación explícita en AppSetting, verificamos fuentes del sector
      if (legacyCreatedMap[String(t.id)] && allowedSectors.includes(legacyCreatedMap[String(t.id)])) {
        isIncluded = true;
        isCreatedByMySector = true;
      } else if (requiredTrainingIds.has(t.id)) {
        isIncluded = true;
      } else if (sectorRecordNames.has(titleClean) || sectorCanonicalNames.has(canonicalClean)) {
        isIncluded = true;
      }
    }

    if (isIncluded) {
      // Un usuario de sector solo puede eliminar un tema si:
      // - NO es global (no aplica a todos los sectores)
      // - Y fue creado por su sector o pertenece exclusivamente a su sector
      const canDelete = !isGlobal && (
        isCreatedByMySector ||
        (assign && !assign.allSectors && assign.sectors?.every((s) => allowedSectors.includes(s))) ||
        Boolean(legacyCreatedMap[String(t.id)] && allowedSectors.includes(legacyCreatedMap[String(t.id)]))
      );

      result.push({
        id: t.id,
        title: t.title,
        objective: t.objective,
        isMandatory: t.isMandatory,
        allSectors: isGlobal,
        sectors: assign?.sectors || (isCreatedByMySector ? allowedSectors : []),
        createdBySector: assign?.createdBySector || legacyCreatedMap[String(t.id)],
        canDeleteBySector: canDelete
      });
    }
  }

  return result;
}

/**
 * Valida si un usuario de sector puede eliminar o desvincular un tema específico
 */
export async function canSectorDeleteTopic(
  topicId: number,
  sectorName: string
): Promise<{ canDelete: boolean; reason?: string }> {
  const assignments = await getTrainingSectorAssignments();
  const assign = assignments[String(topicId)];

  if (assign?.allSectors) {
    return { canDelete: false, reason: "Este tema está asignado a todos los sectores de AUBASA y solo un administrador puede eliminarlo." };
  }

  if (assign) {
    if (assign.createdBySector === sectorName) {
      return { canDelete: true };
    }
    if (assign.sectors && assign.sectors.includes(sectorName)) {
      return { canDelete: true };
    }
    return { canDelete: false, reason: "Este tema no pertenece a tu sector." };
  }

  // Si no hay asignación explícita, verificar si fue creado en el mapa legacy
  const legacySetting = await prisma.appSetting.findUnique({
    where: { id: "sector_created_trainings" }
  }).catch(() => null);

  if (legacySetting?.value) {
    try {
      const map = JSON.parse(legacySetting.value);
      if (map[String(topicId)] === sectorName) {
        return { canDelete: true };
      }
    } catch {}
  }

  // Si es un tema del catálogo base no creado por el sector
  return { canDelete: false, reason: "Los temas generales del sistema solo pueden ser gestionados por SGI o Administradores." };
}
