import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
import { getOnlineFormsForSector, isOnlineTrainingMatch } from "@/lib/onlineForms";
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

  const [forms, allTrainings, sectors, respSetting] = await Promise.all([
    getOnlineFormsForSector(allowedSectors),
    getTrainingsForSectors(allowedSectors),
    prisma.sector.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.appSetting.findUnique({ where: { id: "online_form_responses_v1" } }).catch(() => null)
  ]);

  // Consultar registros completados seleccionando solo campos livianos (sin firmas base64 pesadas)
  const completedRecords = await prisma.employeeTrainingRecord.findMany({
    where: {
      status: "COMPLETED",
      ...(isSector && allowedSectors && allowedSectors.length > 0
        ? {
            employee: { sector: { name: { in: allowedSectors } } },
            ...buildSectorRecordSourceFilter(allowedSectors)
          }
        : {})
    },
    select: {
      id: true,
      trainingName: true,
      score: true,
      completedAt: true,
      instructorName: true,
      employee: {
        select: {
          name: true,
          legajo: true,
          sector: { select: { name: true } }
        }
      }
    },
    orderBy: { completedAt: "desc" },
    take: 1500
  });

  const auditList: any[] = respSetting?.value ? JSON.parse(respSetting.value) : [];
  const auditMapByRecordId = new Map<number, any>();
  const auditMapByLegajoTopic = new Map<string, any>();
  for (const item of auditList) {
    if (item.id) auditMapByRecordId.set(item.id, item);
    if (item.legajo && item.trainingName) {
      const key = `${item.legajo}_${item.trainingName}`.toLowerCase();
      if (!auditMapByLegajoTopic.has(key)) {
        auditMapByLegajoTopic.set(key, item);
      }
    }
  }

  // Filtrar los registros que coinciden con alguno de los formularios online (usando coincidencia flexible de título)
  const matchedRecords = completedRecords.filter((r) =>
    forms.some((f) => isOnlineTrainingMatch(r.trainingName, f.trainingName))
  );

  const completedResponses = matchedRecords.map((r) => {
    const matchedForm = forms.find((f) => isOnlineTrainingMatch(r.trainingName, f.trainingName));
    const key = `${r.employee.legajo}_${r.trainingName}`.toLowerCase();
    const audit = auditMapByRecordId.get(r.id) || auditMapByLegajoTopic.get(key);
    return {
      id: r.id,
      matchedFormId: matchedForm?.id || null,
      employeeName: r.employee.name,
      legajo: r.employee.legajo,
      sectorName: r.employee.sector.name,
      trainingName: r.trainingName,
      instructorName: r.instructorName || matchedForm?.instructorName || "",
      score: r.score,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      email: audit?.email || null
    };
  });

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", paddingBottom: "3rem" }}>
      <FormulariosClient
        forms={forms}
        allTrainings={allTrainings}
        completedResponses={completedResponses}
        isSector={isSector}
        mySectorName={mySectorName}
        isAdmin={isAdmin}
        sectors={sectors}
      />
    </div>
  );
}
