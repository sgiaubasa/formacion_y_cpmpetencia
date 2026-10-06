import { prisma } from "@/lib/prisma";

function normalizeStr(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
 * Devuelve el catálogo de temas (`Training`) filtrado por sector si corresponde.
 * - RRHH, SGI y ADMIN (`!allowedSectors || allowedSectors.length === 0`) ven todos los temas.
 * - Usuarios de Sector ven únicamente los temas vinculados a perfiles o capacitaciones de su sector.
 */
export async function getTrainingsForSectors(allowedSectors: string[] | null) {
  const allTrainings = await prisma.training.findMany({
    orderBy: { title: "asc" }
  });

  if (!allowedSectors || allowedSectors.length === 0) {
    return allTrainings;
  }

  const [sectorProfiles, sectorRecords, sectorCreatedSetting] = await Promise.all([
    prisma.jobProfile.findMany({
      where: {
        isActive: true,
        gerencia: { in: allowedSectors }
      },
      include: {
        requirements: {
          include: { training: true }
        }
      }
    }),
    prisma.employeeTrainingRecord.findMany({
      where: {
        employee: {
          sector: { name: { in: allowedSectors } }
        },
        OR: [
          { sourceProfileId: null },
          { sourceProfile: { gerencia: { in: allowedSectors } } }
        ]
      },
      select: { trainingName: true },
      distinct: ["trainingName"]
    }),
    prisma.appSetting.findUnique({
      where: { id: "sector_created_trainings" }
    })
  ]);

  let sectorCreatedMap: Record<string, string> = {};
  if (sectorCreatedSetting?.value) {
    try {
      sectorCreatedMap = JSON.parse(sectorCreatedSetting.value);
    } catch {
      sectorCreatedMap = {};
    }
  }

  const allowedNormNames = new Set<string>();

  for (const r of sectorRecords) {
    if (r.trainingName) {
      allowedNormNames.add(normalizeStr(r.trainingName));
    }
  }

  for (const p of sectorProfiles) {
    for (const req of p.requirements) {
      if (req.training?.title) {
        allowedNormNames.add(normalizeStr(req.training.title));
      }
    }
    if (p.conocimientosEsp) {
      const lines = p.conocimientosEsp
        .split(/\r?\n/)
        .map((l) => l.replace(/^[\*\-\•\s]+/, "").replace(/\.$/, "").trim())
        .filter(Boolean);
      for (const l of lines) {
        allowedNormNames.add(normalizeStr(l));
      }
    }
  }

  return allTrainings.filter((t) => {
    if (t.isMandatory) return true;
    const creatorSector = sectorCreatedMap[String(t.id)];
    if (creatorSector && allowedSectors.includes(creatorSector)) return true;
    const normTitle = normalizeStr(t.title);
    if (allowedNormNames.has(normTitle)) return true;
    return false;
  });
}
