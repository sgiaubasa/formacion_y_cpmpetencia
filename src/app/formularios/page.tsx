import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
import { getOnlineFormsForSector } from "@/lib/onlineForms";
import { getTrainingsForSectors, buildSectorRecordSourceFilter } from "@/lib/sectorTrainings";
import { FormulariosClient } from "./FormulariosClient";

export default async function FormulariosPage() {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);
  const isAdmin = ["SGI", "RRHH", "ADMIN"].includes(role);

  let allowedSectors: string[] | null = null;
  let mySectorName = "";

  if (isSector && sectorRoleId) {
    const mySector = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
    if (mySector) {
      mySectorName = mySector.name;
      allowedSectors = await getAllowedSectorNames(role, mySector.name);
    }
  }

  const [forms, allTrainings] = await Promise.all([
    getOnlineFormsForSector(allowedSectors),
    getTrainingsForSectors(allowedSectors)
  ]);

  const formTrainingTitles = forms.map((f) => f.trainingName);

  const completedRecords = await prisma.employeeTrainingRecord.findMany({
    where: {
      status: "COMPLETED",
      trainingName: { in: formTrainingTitles },
      ...(isSector && allowedSectors && allowedSectors.length > 0
        ? {
            employee: { sector: { name: { in: allowedSectors } } },
            ...buildSectorRecordSourceFilter(allowedSectors)
          }
        : {})
    },
    include: {
      employee: { include: { sector: true } }
    },
    orderBy: { completedAt: "desc" },
    take: 400
  });

  const completedResponses = completedRecords.map((r) => ({
    id: r.id,
    employeeName: r.employee.name,
    legajo: r.employee.legajo,
    sectorName: r.employee.sector.name,
    trainingName: r.trainingName,
    score: r.score,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null
  }));

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", paddingBottom: "3rem" }}>
      <FormulariosClient
        forms={forms}
        allTrainings={allTrainings}
        completedResponses={completedResponses}
        isSector={isSector}
        mySectorName={mySectorName}
        isAdmin={isAdmin}
      />
    </div>
  );
}
