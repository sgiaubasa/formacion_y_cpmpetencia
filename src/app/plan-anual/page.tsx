import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { AssignTrainingForm } from "./AssignTrainingForm";
import { writeFile } from "fs/promises";
import { join } from "path";
import fs from "fs";
import { RowActions } from "./RowActions";
import { getUniqueActiveProfiles } from "@/lib/profileUtils";
import { getTrainingMaterialsMap, saveTrainingMaterialForRecords } from "@/lib/trainingMaterials";
import { MaterialViewerButton } from "@/components/MaterialViewerButton";
import { getEfficacyTraceMap } from "@/lib/efficacyTraceability";
import { PlanAnualFilters } from "./PlanAnualFilters";
import { buildSectorRecordSourceFilter, getTrainingsForSectors } from "@/lib/sectorTrainings";
import { MicrosoftFormsImportCard } from "./MicrosoftFormsImportCard";
import { getDefaultInstructorForSector } from "@/lib/instructorDefaults";
import { encryptRecordId } from "@/lib/crypto";
import { buildSvgSignatureDataUri } from "@/app/api/webhooks/microsoft-forms/route";
import { getCanonicalTrainingName } from "@/lib/canonicalTrainings";
import { autoReconcileDuplicateTransferredEmployees, stripAccents } from "@/lib/employeeMerge";

export default async function PlanAnualPage({ searchParams }: { searchParams: Promise<{ tab?: string, q?: string, employeeId?: string, empName?: string, sectorId?: string, baseOperativa?: string, jobProfileId?: string, statusFilter?: string }> }) {
  await autoReconcileDuplicateTransferredEmployees();
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);

  let allowedSectors: string[] | null = null;
  let allowedSectorIds: number[] | null = null;
  if (isSector && sectorRoleId) {
    const mySector = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
    if (mySector) {
      allowedSectors = await getAllowedSectorNames(role, mySector.name);
      const secObjs = await prisma.sector.findMany({
        where: { name: { in: allowedSectors } },
        select: { id: true }
      });
      allowedSectorIds = secObjs.map((s) => s.id);
    } else {
      allowedSectorIds = [sectorRoleId];
    }
  }

  const sp = await searchParams;
  const q = sp.q || '';
  const empName = sp.empName?.trim() || '';
  const baseOperativa = sp.baseOperativa || '';
  
  const rawSectorId = sp.sectorId ? parseInt(sp.sectorId) : undefined;
  const sectorId = isSector ? sectorRoleId : rawSectorId;
  const employeeId = sp.employeeId ? parseInt(sp.employeeId) : undefined;
  const jobProfileId = sp.jobProfileId ? parseInt(sp.jobProfileId) : undefined;
  const statusFilter = sp.statusFilter || undefined;

  const employeeAndConditions: any[] = [];
  if (isSector && sectorId) {
    const targetIds = allowedSectorIds && allowedSectorIds.length > 0 ? allowedSectorIds : [sectorId];
    // El sector ve tanto a sus empleados actuales como a los empleados que están en proceso de transferencia hacia su sector
    employeeAndConditions.push({
      OR: [
        { sectorId: { in: targetIds } },
        {
          pendingTransfers: {
            some: {
              targetSectorId: { in: targetIds }
            }
          }
        }
      ]
    });
  } else if (sectorId) {
    employeeAndConditions.push({ sectorId });
  }
  if (jobProfileId) employeeAndConditions.push({ jobProfileId });
  if (baseOperativa) employeeAndConditions.push({ baseOperativa });
  if (empName) {
    // Búsqueda insensible a tildes/acentos (ej. "gutierrez" encuentra tanto "Gutierrez" como "Gutiérrez")
    const allForSearch = await prisma.employee.findMany({
      select: { id: true, name: true, legajo: true, dni: true }
    });
    const searchTokens = stripAccents(empName).split(/\s+/).filter(Boolean);
    const matchedIds = allForSearch
      .filter((e) => {
        const haystack = `${stripAccents(e.name)} ${stripAccents(e.legajo)} ${stripAccents(e.dni || "")}`;
        return searchTokens.every((tok) => haystack.includes(tok));
      })
      .map((e) => e.id);

    employeeAndConditions.push({
      id: { in: matchedIds.length > 0 ? matchedIds : [-1] }
    });
  }
  const employeeFilters: any =
    employeeAndConditions.length > 0 ? { AND: employeeAndConditions } : {};

  let statusWhere: any = {};
  if (statusFilter === 'REPROGRAMADA') {
    statusWhere = { status: 'IN_PLAN', rescheduledDate: { not: null } };
  } else if (statusFilter === 'IN_PLAN' || statusFilter === 'PROGRAMADA_ONLY') {
    statusWhere = { status: 'IN_PLAN', rescheduledDate: null };
  } else if (statusFilter) {
    statusWhere = { status: statusFilter };
  }

  // Si el usuario seleccionó un tema canónico, buscamos por subcadenas clave para abarcar variantes históricas sin perder nada
  let trainingFilterWhere: any = {};
  if (q.trim()) {
    const qClean = q.trim();
    // Búsqueda inteligente por palabras clave principales si es un título largo
    if (qClean.toLowerCase().includes("identificaci") && qClean.toLowerCase().includes("peligro")) {
      trainingFilterWhere = {
        trainingName: { contains: "identificaci", mode: "insensitive" }
      };
    } else if (qClean.toLowerCase().includes("autoprotecci") || qClean.toLowerCase().includes("focos")) {
      trainingFilterWhere = {
        trainingName: { contains: "autoprotecci", mode: "insensitive" }
      };
    } else if (qClean.toLowerCase().includes("eléctrico") || qClean.toLowerCase().includes("electrico")) {
      if (qClean.toLowerCase().includes("oficina")) {
        trainingFilterWhere = {
          OR: [
            { trainingName: { contains: "oficina", mode: "insensitive" } },
            { trainingName: { contains: "eléctrico en oficinas", mode: "insensitive" } },
            { trainingName: { contains: "eléctricos oficina", mode: "insensitive" } }
          ]
        };
      } else {
        trainingFilterWhere = {
          trainingName: { contains: "eléctric", mode: "insensitive" }
        };
      }
    } else if (qClean.toLowerCase().includes("carga") || qClean.toLowerCase().includes("ergonom")) {
      trainingFilterWhere = {
        trainingName: { contains: "ergonom", mode: "insensitive" }
      };
    } else if (qClean.toLowerCase().includes("itinere")) {
      trainingFilterWhere = {
        trainingName: { contains: "itinere", mode: "insensitive" }
      };
    } else {
      trainingFilterWhere = {
        trainingName: { contains: qClean, mode: "insensitive" }
      };
    }
  }

  const globalFilters = {
    ...(employeeId && { employeeId: employeeId }),
    ...(Object.keys(employeeFilters).length > 0 && { employee: employeeFilters }),
    ...statusWhere,
    ...trainingFilterWhere,
    ...(isSector ? buildSectorRecordSourceFilter(allowedSectors) : {})
  };

  const [records, materialsMap, traceMap] = await Promise.all([
    prisma.employeeTrainingRecord.findMany({
      where: globalFilters,
      select: {
        id: true,
        employeeId: true,
        trainingName: true,
        objective: true,
        status: true,
        scheduledDate: true,
        rescheduledDate: true,
        completedAt: true,
        score: true,
        instructorName: true,
        evidencePath: true,
        effectiveness: true,
        sourceProfile: {
          select: {
            id: true,
            title: true,
            gerencia: true
          }
        },
        employee: {
          select: {
            id: true,
            name: true,
            legajo: true,
            baseOperativa: true,
            sector: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { id: 'desc' },
      take: 300
    }),
    getTrainingMaterialsMap(),
    getEfficacyTraceMap()
  ]);

  // Server Action para Agregar Ad-Hoc masivamente
  async function addAdHocNeed(formData: FormData) {
    "use server";
    const assignmentType = formData.get("assignmentType") as string;
    const trainingName = formData.get("trainingName") as string;
    const objective = formData.get("objective") as string;
    const scheduledDate = formData.get("scheduledDate") as string;
    const materialUrl = (formData.get("materialUrl") as string | null)?.trim() || null;
    const materialName = (formData.get("materialName") as string | null)?.trim() || null;
    const materialType = (formData.get("materialType") as "pdf" | "video" | null) || undefined;
    const instructorName = (formData.get("instructorName") as string | null)?.trim() || null;
    const instructorSignatureMode =
      (formData.get("instructorSignatureMode") as "digital" | "link" | null) || "digital";

    const dateObj = scheduledDate ? new Date(scheduledDate) : null;
    const status = dateObj ? "IN_PLAN" : "GAP";

    let digitalInstSig: string | null = null;
    if (instructorName && instructorSignatureMode === "digital") {
      const dFormatted = (dateObj || new Date()).toLocaleDateString("es-AR");
      digitalInstSig = buildSvgSignatureDataUri(
        instructorName.replace(/\(Leg\.\s*\d+\)/i, "").trim(),
        "Instructor — Firma Digital Validada",
        `Fecha: ${dFormatted}`
      );
    }

    const createdIds: number[] = [];

    if (assignmentType === "empleado") {
      const rawEmpIds = formData
        .getAll("employeeIds")
        .map((v) => parseInt(v as string, 10))
        .filter(Boolean);

      const singleEmpId = parseInt(formData.get("employeeId") as string, 10);
      if (singleEmpId && !rawEmpIds.includes(singleEmpId)) {
        rawEmpIds.push(singleEmpId);
      }

      for (const empId of rawEmpIds) {
        const empObj = await prisma.employee.findUnique({ where: { id: empId }, select: { jobProfileId: true } });
        const created = await prisma.employeeTrainingRecord.create({
          data: {
            employeeId: empId,
            trainingName,
            objective,
            status,
            scheduledDate: dateObj,
            instructorName: instructorName || undefined,
            instructorSignature: digitalInstSig || undefined,
            sourceProfileId: empObj?.jobProfileId ?? null
          }
        });
        createdIds.push(created.id);
      }
    } else if (assignmentType === "puesto") {
      const profileId = parseInt(formData.get("jobProfileId") as string);
      if (profileId) {
        const emps = await prisma.employee.findMany({ where: { jobProfileId: profileId, isActive: true } });
        for (const e of emps) {
          const created = await prisma.employeeTrainingRecord.create({
            data: {
              employeeId: e.id,
              trainingName,
              objective,
              status,
              scheduledDate: dateObj,
              instructorName: instructorName || undefined,
              instructorSignature: digitalInstSig || undefined,
              sourceProfileId: profileId
            }
          });
          createdIds.push(created.id);
        }
      }
    } else if (assignmentType === "sector") {
      const sectorIdVal = parseInt(formData.get("targetSectorId") as string);
      if (sectorIdVal) {
        const emps = await prisma.employee.findMany({ where: { sectorId: sectorIdVal, isActive: true } });
        for (const e of emps) {
          const created = await prisma.employeeTrainingRecord.create({
            data: {
              employeeId: e.id,
              trainingName,
              objective,
              status,
              scheduledDate: dateObj,
              instructorName: instructorName || undefined,
              instructorSignature: digitalInstSig || undefined,
              sourceProfileId: e.jobProfileId ?? null
            }
          });
          createdIds.push(created.id);
        }
      }
    }

    if (materialUrl && createdIds.length > 0) {
      await saveTrainingMaterialForRecords(createdIds, {
        url: materialUrl,
        name: materialName || (materialType === "video" ? "Video de Capacitación" : "Material PDF"),
        type: materialType
      });
    }

    if (createdIds.length > 0) {
      const { syncRecordToPowerAutomate } = await import("@/lib/powerAutomate");
      for (const id of createdIds) {
        await syncRecordToPowerAutomate(id).catch(() => {});
      }
    }

    revalidatePath("/plan-anual");

    if (instructorSignatureMode === "link" && createdIds.length > 0) {
      return { instructorToken: encryptRecordId(createdIds[0], "instructor") };
    }
  }

  // Helper de fórmula de estados con iconos SVG
  function getStateBadge(record: any) {
    const isCompleted = record.completedAt || record.status === 'COMPLETED';
    const isRescheduled = Boolean(record.rescheduledDate);
    const isProgrammed = record.scheduledDate || record.status === 'IN_PLAN';
    
    let color = '#ef4444';
    let text = 'BRECHA PENDIENTE';
    let SvgIcon = () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M12 2a10 10 0 1 0 10 10" />
      </svg>
    );

    if (isCompleted) {
      color = '#10b981';
      text = 'CAPACITACIÓN REALIZADA';
      SvgIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12l3 3 5-5" />
        </svg>
      );
    } else if (isRescheduled) {
      color = '#f97316';
      text = 'REPROGRAMADA';
      SvgIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
        </svg>
      );
    } else if (isProgrammed) {
      color = '#3b82f6';
      text = 'PROGRAMADA';
      SvgIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: color, fontWeight: '700', fontSize: '0.75rem' }}>
          <SvgIcon />
          <span>{text}</span>
        </div>
        {isCompleted && isRescheduled && (
          <span style={{ fontSize: '0.68rem', color: '#ea580c', fontWeight: 600, marginLeft: '1.9rem' }}>
            🔄 Tuvo reprogramación ({new Date(record.rescheduledDate).toLocaleDateString('es-AR')})
          </span>
        )}
      </div>
    );
  }

  const rawEmployees = await prisma.employee.findMany({ 
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      legajo: true,
      baseOperativa: true,
      sectorId: true,
      jobProfileId: true,
      pendingTransfers: {
        where: { status: 'PENDING' },
        select: { targetSectorId: true }
      }
    },
    orderBy: { name: 'asc' } 
  });
  const allEmployees = rawEmployees.map((emp) => {
    const isBeingTransferredToMySector =
      isSector &&
      sectorRoleId &&
      emp.sectorId !== sectorRoleId &&
      emp.pendingTransfers.some((pt) => pt.targetSectorId === sectorRoleId);
    return {
      id: emp.id,
      name: isBeingTransferredToMySector ? `${emp.name} (En Transferencia)` : emp.name,
      legajo: emp.legajo,
      baseOperativa: emp.baseOperativa,
      sectorId: isBeingTransferredToMySector ? sectorRoleId! : emp.sectorId,
      jobProfileId: emp.jobProfileId
    };
  });
  const allSectors = await prisma.sector.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  const allJobProfiles = await getUniqueActiveProfiles(allowedSectors);
  const allTrainings = await getTrainingsForSectors(allowedSectors);

  return (
    <div>
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ color: 'var(--teal-color)' }}>Plan Anual de Capacitación</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Hacé clic en el título de cada sección para desplegar u ocultar <strong>Programación</strong>, <strong>Importación de Formularios</strong> o <strong>Seguimiento del Plan</strong>.
          </p>
        </div>
      </div>

      {/* PANEL 1: DESPLEGABLE DE PROGRAMAR / ASIGNAR NUEVA CAPACITACIÓN */}
      <AssignTrainingForm 
        allEmployees={allEmployees}
        allJobProfiles={allJobProfiles}
        allSectors={allSectors}
        isSector={isSector}
        sectorRoleId={sectorRoleId ?? undefined}
        allTrainings={allTrainings}
        addAdHocNeed={addAdHocNeed}
      />

      {/* PANEL 1.B: DESPLEGABLE DE IMPORTAR RESPUESTAS DE MICROSOFT FORMS */}
      <MicrosoftFormsImportCard allTrainings={allTrainings} />

      {/* PANEL 2: DESPLEGABLE DE SEGUIMIENTO Y FILTROS DE LA TABLA */}
      <details open style={{ marginBottom: '2rem' }}>
        <summary
          className="card"
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            listStyle: 'none',
            marginBottom: '0.75rem',
            padding: '1rem 1.5rem',
            borderLeft: '6px solid #0f766e',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: '#0f766e',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              📊 Seguimiento del Plan Anual
            </span>
            <h3 style={{ margin: 0, color: '#1b365d', fontSize: '1.1rem' }}>
              Filtros y Listado de Capacitaciones ({records.length} registros en vista)
            </h3>
          </div>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#0f766e',
              backgroundColor: '#f0fdfa',
              border: '1px solid #99f6e4',
              padding: '0.35rem 0.8rem',
              borderRadius: '8px'
            }}
          >
            ⇅ Clic para Desplegar / Ocultar Seguimiento
          </span>
        </summary>

        <PlanAnualFilters
          allSectors={allSectors}
          allJobProfiles={allJobProfiles}
          allEmployees={allEmployees}
          allTrainings={allTrainings}
          isSector={isSector}
          initialSectorId={sectorId ? String(sectorId) : ''}
          initialBaseOperativa={baseOperativa}
          initialJobProfileId={sp.jobProfileId || ''}
          initialEmployeeId={sp.employeeId || ''}
          initialEmpSearch={empName}
          initialStatusFilter={sp.statusFilter || ''}
          initialTopicQuery={q}
        />

        <div className="card" style={{ padding: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>EMPLEADO</th>
                <th>SECTOR</th>
                <th>SITIO / BASE</th>
                <th>CAPACITACIÓN</th>
                <th>ESTADO</th>
                <th>FECHA PROGRAMADA</th>
                <th>GESTIÓN ...</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const isCompleted = r.status === 'COMPLETED';
                const material = materialsMap[`record_${r.id}`] || null;
                const activeDateObj = r.rescheduledDate || r.scheduledDate;
                const displayTopic = getCanonicalTrainingName(r.trainingName);
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div>{r.employee.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Leg. {r.employee.legajo}</div>
                    </td>
                    <td>
                      <div>{r.employee.sector.name}</div>
                      {r.sourceProfile?.gerencia &&
                        r.sourceProfile.gerencia.toLowerCase().trim() !== r.employee.sector.name.toLowerCase().trim() && (
                          <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 600, marginTop: '0.15rem' }}>
                            (Historial: {r.sourceProfile.gerencia})
                          </div>
                        )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#475569' }}>{r.employee.baseOperativa || '-'}</td>
                    <td style={{ maxWidth: '250px' }}>
                      <div title={r.trainingName}>{displayTopic}</div>
                      {material && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <MaterialViewerButton material={material} trainingName={displayTopic} />
                        </div>
                      )}
                    </td>
                    <td>{getStateBadge(r)}</td>
                    <td>
                      {r.rescheduledDate ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontWeight: 700, color: '#ea580c', fontSize: '0.88rem' }} title="Nueva Fecha Reprogramada">
                            🔄 Nueva: {new Date(r.rescheduledDate).toLocaleDateString('es-AR')}
                          </span>
                          {r.scheduledDate && (
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }} title="Fecha Programada Original">
                              Orig.: <span style={{ textDecoration: 'line-through' }}>{new Date(r.scheduledDate).toLocaleDateString('es-AR')}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString('es-AR') : '-'
                      )}
                    </td>
                    <td>
                      {!isCompleted ? (
                        <RowActions 
                          recordId={r.id} 
                          currentDate={activeDateObj ? activeDateObj.toISOString().split('T')[0] : ''} 
                          currentScheduledDate={r.scheduledDate ? r.scheduledDate.toISOString().split('T')[0] : ''}
                          currentRescheduledDate={r.rescheduledDate ? r.rescheduledDate.toISOString().split('T')[0] : ''}
                          hasScheduledDate={Boolean(r.scheduledDate)}
                          status={r.status} 
                          isSgi={role === 'SGI'}
                          currentObjective={r.objective || ""}
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ fontSize: '0.875rem' }}>Realizada el: <strong>{r.completedAt ? new Date(r.completedAt).toLocaleDateString('es-AR') : '-'}</strong></div>
                          {r.score && <div style={{ fontSize: '0.875rem' }}>Nota: <strong>{r.score}</strong>/10</div>}
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Instructor: <strong>{r.instructorName || getDefaultInstructorForSector(r.employee.sector?.name).name}</strong></div>
                          {material && (
                            <MaterialViewerButton material={material} trainingName={displayTopic} />
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.2rem' }}>
                            <a 
                              href={`/plan-anual/planilla/${r.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="btn btn-secondary" 
                              style={{ 
                                padding: '0.3rem 0.65rem', 
                                fontSize: '0.78rem', 
                                width: 'fit-content',
                                backgroundColor: '#0d8383',
                                color: '#ffffff',
                                fontWeight: 700,
                                textDecoration: 'none',
                                borderRadius: '4px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                              }}
                            >
                              📄 Ver Planilla Firmada
                            </a>
                            {r.evidencePath && (
                              <a 
                                href={r.evidencePath} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn btn-secondary" 
                                style={{ padding: '0.22rem 0.55rem', fontSize: '0.74rem', width: 'fit-content' }}
                              >
                                📎 Ver Evidencia Adjunta
                              </a>
                            )}
                            <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                              Firma Participante: ✅ | Instructor: ✅
                            </div>
                          </div>
                          {r.effectiveness === 'PENDING' && (
                            <Link href={`/brechas/${r.employeeId}/evaluar`} className="btn btn-warning" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'fit-content' }}>
                              Evaluar Eficacia
                            </Link>
                          )}
                          {r.effectiveness === 'EFFECTIVE' && <span className="badge badge-success" style={{ width: 'fit-content' }}>Eficaz</span>}
                          {r.effectiveness === 'INEFFECTIVE' && <span className="badge badge-secondary" style={{ backgroundColor: '#ef4444', width: 'fit-content' }}>No Eficaz</span>}
                          {traceMap[`record_${r.id}`]?.evaluatorName && (r.effectiveness === 'EFFECTIVE' || r.effectiveness === 'INEFFECTIVE') && (
                            <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                              👤 Evaluó eficacia: {traceMap[`record_${r.id}`].evaluatorName}
                            </div>
                          )}
                          
                          <div style={{ marginTop: '0.25rem' }}>
                            <RowActions 
                              recordId={r.id} 
                              currentDate={activeDateObj ? activeDateObj.toISOString().split('T')[0] : ''} 
                              currentScheduledDate={r.scheduledDate ? r.scheduledDate.toISOString().split('T')[0] : ''}
                              currentRescheduledDate={r.rescheduledDate ? r.rescheduledDate.toISOString().split('T')[0] : ''}
                              hasScheduledDate={Boolean(r.scheduledDate)}
                              status={r.status}
                              isSgi={role === 'SGI'}
                              isCompleted={true}
                              currentCompletedDate={r.completedAt ? r.completedAt.toISOString().split('T')[0] : ''}
                              currentScore={r.score || ""}
                              currentObjective={r.objective || ""}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>No se encontraron registros.</td></tr>
              )}
            </tbody>
          </table>
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Mostrando los últimos 300 resultados. Usa los filtros para buscar capacitaciones específicas.
          </div>
        </div>
      </details>
    </div>
  );
}
