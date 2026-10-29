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

export default async function PlanAnualPage({ searchParams }: { searchParams: Promise<{ tab?: string, q?: string, employeeId?: string, empName?: string, sectorId?: string, jobProfileId?: string, statusFilter?: string }> }) {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);

  let allowedSectors: string[] | null = null;
  if (isSector && sectorRoleId) {
    const mySector = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
    if (mySector) {
      allowedSectors = await getAllowedSectorNames(role, mySector.name);
    }
  }

  const sp = await searchParams;
  const q = sp.q || '';
  const empName = sp.empName?.trim() || '';
  
  const rawSectorId = sp.sectorId ? parseInt(sp.sectorId) : undefined;
  const sectorId = isSector ? sectorRoleId : rawSectorId;
  const employeeId = sp.employeeId ? parseInt(sp.employeeId) : undefined;
  const jobProfileId = sp.jobProfileId ? parseInt(sp.jobProfileId) : undefined;
  const statusFilter = sp.statusFilter || undefined;

  const employeeFilters: any = {};
  if (sectorId) employeeFilters.sectorId = sectorId;
  if (jobProfileId) employeeFilters.jobProfileId = jobProfileId;
  if (empName) {
    employeeFilters.OR = [
      { name: { contains: empName, mode: 'insensitive' } },
      { legajo: { contains: empName, mode: 'insensitive' } }
    ];
  }

  let statusWhere: any = {};
  if (statusFilter === 'REPROGRAMADA') {
    statusWhere = { status: 'IN_PLAN', rescheduledDate: { not: null } };
  } else if (statusFilter === 'IN_PLAN' || statusFilter === 'PROGRAMADA_ONLY') {
    statusWhere = { status: 'IN_PLAN', rescheduledDate: null };
  } else if (statusFilter) {
    statusWhere = { status: statusFilter };
  }

  const globalFilters = {
    ...(employeeId && { employeeId: employeeId }),
    ...(Object.keys(employeeFilters).length > 0 && { employee: employeeFilters }),
    ...statusWhere,
    ...(isSector ? buildSectorRecordSourceFilter(allowedSectors) : {})
  };

  const [records, materialsMap, traceMap] = await Promise.all([
    prisma.employeeTrainingRecord.findMany({
      where: {
        trainingName: { contains: q, mode: 'insensitive' },
        ...globalFilters
      },
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
        employee: {
          select: {
            id: true,
            name: true,
            legajo: true,
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
      const empId = parseInt(formData.get("employeeId") as string);
      if (empId) {
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

  const allEmployees = await prisma.employee.findMany({ 
    where: { isActive: true },
    select: { id: true, name: true, legajo: true, sectorId: true, jobProfileId: true },
    orderBy: { name: 'asc' } 
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
          <p style={{ color: 'var(--text-secondary)' }}>Gestión, programación y ejecución de necesidades de capacitación</p>
        </div>
      </div>

      {/* PANEL 1: PROGRAMAR / ASIGNAR NUEVA CAPACITACIÓN */}
      <div
        className="card"
        style={{
          marginBottom: '2.25rem',
          borderLeft: '6px solid var(--teal-color)',
          background: 'linear-gradient(to right, #f0fdfa, #ffffff 35%)',
          boxShadow: '0 4px 12px rgba(13, 148, 136, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
          <span
            style={{
              background: 'var(--teal-color)',
              color: 'white',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.25rem 0.6rem',
              borderRadius: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            ➕ Cargar Nueva Capacitación
          </span>
          <h3 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.15rem' }}>
            Programar y Asignar Capacitación al Plan
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
          Completá este formulario para programar una nueva capacitación a un empleado, puesto o sector, definir el Instructor (con firma digital o vía link para todas las planillas) y adjuntar el material interactivo en PDF o Video.
        </p>
        <AssignTrainingForm 
          allEmployees={allEmployees}
          allJobProfiles={allJobProfiles}
          allSectors={allSectors}
          isSector={isSector}
          sectorRoleId={sectorRoleId ?? undefined}
          allTrainings={allTrainings}
          addAdHocNeed={addAdHocNeed}
        />
      </div>

      {/* PANEL 1.B: IMPORTAR RESPUESTAS DE MICROSOFT FORMS (SIN ARMAR FLUJO) */}
      <MicrosoftFormsImportCard allTrainings={allTrainings} />

      {/* PANEL 2: FILTROS INTERACTIVOS + TABLA DEL PLAN ANUAL */}
      <PlanAnualFilters
        allSectors={allSectors}
        allJobProfiles={allJobProfiles}
        allEmployees={allEmployees}
        allTrainings={allTrainings}
        isSector={isSector}
        initialSectorId={sectorId ? String(sectorId) : ''}
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
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.employee.name}</td>
                  <td>{r.employee.sector.name}</td>
                  <td style={{ maxWidth: '250px' }}>
                    <div>{r.trainingName}</div>
                    {material && (
                      <div style={{ marginTop: '0.35rem' }}>
                        <MaterialViewerButton material={material} trainingName={r.trainingName} />
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
                          <MaterialViewerButton material={material} trainingName={r.trainingName} />
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
              <tr><td colSpan={6} style={{ textAlign: 'center' }}>No se encontraron registros.</td></tr>
            )}
          </tbody>
        </table>
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Mostrando los últimos 300 resultados. Usa los filtros para buscar capacitaciones específicas.
        </div>
      </div>
    </div>
  );
}
