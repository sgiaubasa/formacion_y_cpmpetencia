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

export default async function PlanAnualPage({ searchParams }: { searchParams: Promise<{ tab?: string, q?: string, employeeId?: string, sectorId?: string, jobProfileId?: string, statusFilter?: string }> }) {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);

  const sp = await searchParams;
  const q = sp.q || '';
  
  const rawSectorId = sp.sectorId ? parseInt(sp.sectorId) : undefined;
  const sectorId = isSector ? sectorRoleId : rawSectorId;
  const employeeId = sp.employeeId ? parseInt(sp.employeeId) : undefined;
  const jobProfileId = sp.jobProfileId ? parseInt(sp.jobProfileId) : undefined;
  const statusFilter = sp.statusFilter || undefined;

  const globalFilters = {
    ...(employeeId && { employeeId: employeeId }),
    ...(sectorId && { employee: { sectorId: sectorId } }),
    ...(jobProfileId && { employee: { jobProfileId: jobProfileId } }),
    ...(statusFilter && { status: statusFilter })
  };

  const records = await prisma.employeeTrainingRecord.findMany({
    where: {
      trainingName: { contains: q, mode: 'insensitive' },
      ...globalFilters
    },
    include: { employee: { include: { sector: true } } },
    orderBy: { id: 'desc' },
    take: 300
  });

  // Server Action para Agregar Ad-Hoc masivamente
  async function addAdHocNeed(formData: FormData) {
    "use server"
    const assignmentType = formData.get("assignmentType") as string;
    const trainingName = formData.get("trainingName") as string;
    const objective = formData.get("objective") as string;
    const scheduledDate = formData.get("scheduledDate") as string;
    const dateObj = scheduledDate ? new Date(scheduledDate) : null;
    const status = dateObj ? 'IN_PLAN' : 'GAP';

    if (assignmentType === "empleado") {
      const empId = parseInt(formData.get("employeeId") as string);
      if (empId) {
        await prisma.employeeTrainingRecord.create({
          data: { employeeId: empId, trainingName, objective, status, scheduledDate: dateObj }
        });
      }
    } else if (assignmentType === "puesto") {
      const profileId = parseInt(formData.get("jobProfileId") as string);
      if (profileId) {
        const emps = await prisma.employee.findMany({ where: { jobProfileId: profileId, isActive: true } });
        for (const e of emps) {
          await prisma.employeeTrainingRecord.create({
            data: { employeeId: e.id, trainingName, objective, status, scheduledDate: dateObj }
          });
        }
      }
    } else if (assignmentType === "sector") {
      const sectorIdVal = parseInt(formData.get("targetSectorId") as string);
      if (sectorIdVal) {
        const emps = await prisma.employee.findMany({ where: { sectorId: sectorIdVal, isActive: true } });
        for (const e of emps) {
          await prisma.employeeTrainingRecord.create({
            data: { employeeId: e.id, trainingName, objective, status, scheduledDate: dateObj }
          });
        }
      }
    }
    revalidatePath('/plan-anual');
  }

  // Server Action para programar fecha a una brecha existente
  async function programarFecha(formData: FormData) {
    "use server"
    const recordId = parseInt(formData.get("recordId") as string);
    const dateStr = formData.get("scheduledDate") as string;
    
    const existing = await prisma.employeeTrainingRecord.findUnique({ where: { id: recordId } });
    const newDate = dateStr ? new Date(dateStr) : null;
    
    let updateData: any = { status: 'IN_PLAN' };
    
    // Si ya tenía fecha programada y se cambia, cuenta como reprogramación
    if (existing?.scheduledDate && newDate && existing.scheduledDate.getTime() !== newDate.getTime()) {
      updateData.rescheduledDate = newDate;
    } else {
      updateData.scheduledDate = newDate;
    }

    await prisma.employeeTrainingRecord.update({
      where: { id: recordId },
      data: updateData
    });
    revalidatePath('/plan-anual');
  }

  // Server Action para marcar como ejecutada
  async function marcarEjecutada(formData: FormData) {
    "use server"
    const recordId = parseInt(formData.get("recordId") as string);
    const dateStr = formData.get("completedAt") as string;
    const scoreStr = formData.get("score") as string;
    const file = formData.get("evidence") as File | null;
    
    let evidencePath = null;
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      const uploadDir = join(process.cwd(), 'public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const path = join(uploadDir, filename);
      await writeFile(path, buffer);
      evidencePath = `/uploads/${filename}`;
    }

    // Update the record
    await prisma.employeeTrainingRecord.update({
      where: { id: recordId },
      data: {
        status: 'COMPLETED',
        effectiveness: 'PENDING',
        completedAt: dateStr ? new Date(dateStr) : new Date(),
        ...(evidencePath ? { evidencePath } : {}),
        ...(scoreStr ? { score: scoreStr } : {})
      }
    });

    // Validar si liberó el puesto
    const record = await prisma.employeeTrainingRecord.findUnique({
      where: { id: recordId },
      include: { employee: true }
    });
    
    if (record) {
      const pendingTransfers = await prisma.pendingTransfer.findMany({
        where: { employeeId: record.employeeId },
        include: { targetProfile: true }
      });

      if (pendingTransfers.length > 0) {
        // Obtenemos todas las capacitaciones completadas del empleado
        const allCompleted = await prisma.employeeTrainingRecord.findMany({
          where: { employeeId: record.employeeId, status: 'COMPLETED' }
        });
        const completedNames = new Set(allCompleted.map(r => r.trainingName.trim()));

        for (const transfer of pendingTransfers) {
          try {
            const gaps: string[] = JSON.parse(transfer.gaps);
            const allGapsCompleted = gaps.every(gap => completedNames.has(gap.trim()));
            
            if (allGapsCompleted) {
              // Trigger email
              const { sendMail } = await import('@/lib/mailer');
              const rrhhUsers = await prisma.appUser.findMany({ where: { role: 'RRHH' } });
              const rrhhEmails = rrhhUsers.map(u => u.email);
              
              await sendMail({
                to: rrhhEmails.length > 0 ? rrhhEmails : 'rrhh@aubasa.com.ar',
                subject: `Puesto Liberado: ${record.employee.name}`,
                html: `
                  <h2>El empleado ha completado todas sus brechas</h2>
                  <p><strong>Empleado:</strong> ${record.employee.name} (Legajo: ${record.employee.legajo})</p>
                  <p><strong>Puesto Destino:</strong> ${transfer.targetProfile.title}</p>
                  <p>Ya se han registrado como completadas todas las capacitaciones que requerían para este cambio de puesto.</p>
                `
              });
              
              // Opcional: Podríamos borrar el PendingTransfer, pero por ahora solo avisamos.
            }
          } catch(e) {}
        }
      }
    }

    revalidatePath('/plan-anual');
  }

  // Helper de fórmula de estados con iconos SVG
  function getStateBadge(record: any) {
    const isCompleted = record.completedAt || record.status === 'COMPLETED';
    const isRescheduled = record.rescheduledDate;
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: color, fontWeight: '700', fontSize: '0.75rem' }}>
        <SvgIcon />
        <span>{text}</span>
      </div>
    );
  }

  const allEmployees = await prisma.employee.findMany({ orderBy: { name: 'asc' } });
  const allSectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  let allowedSectors: string[] | null = null;
  if (isSector && sectorRoleId) {
    const mySector = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
    if (mySector) {
      allowedSectors = await getAllowedSectorNames(role, mySector.name);
    }
  }

  // Used for filtering dropdowns (if they want to filter by profile across their permitted sectors)
  const allJobProfiles = await getUniqueActiveProfiles(allowedSectors);
  const allTrainings = await prisma.training.findMany({ orderBy: { title: 'asc' } });

  const totalProgramadas = records.filter(r => r.status === 'IN_PLAN').length;
  const totalCompletadas = records.filter(r => r.status === 'COMPLETED').length;
  const totalPendientes = records.filter(r => r.status === 'GAP').length;
  const totalGeneral = totalProgramadas + totalCompletadas + totalPendientes;

  return (
    <div>
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ color: 'var(--teal-color)' }}>Plan Anual de Capacitación</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestión, programación y ejecución de necesidades de capacitación</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Asignar Plan de Capacitación</h3>
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

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <form method="get" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          
          {!isSector && (
            <div style={{ flex: '1 1 150px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Sector</label>
              <select name="sectorId" className="form-input" defaultValue={sectorId || ''} style={{ borderRadius: '20px' }}>
                <option value="">Todos los sectores</option>
                {allSectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ flex: '1 1 150px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Perfil de Puesto</label>
            <select name="jobProfileId" className="form-input" defaultValue={sp.jobProfileId || ''} style={{ borderRadius: '20px' }}>
              <option value="">Todos los puestos</option>
              {allJobProfiles.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Empleado</label>
            <select name="employeeId" className="form-input" defaultValue={sp.employeeId || ''} style={{ borderRadius: '20px' }}>
              <option value="">Todos los empleados</option>
              {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Estado</label>
            <select name="statusFilter" className="form-input" defaultValue={sp.statusFilter || ''} style={{ borderRadius: '20px' }}>
              <option value="">Todos los estados</option>
              <option value="GAP">Brecha (Pendiente)</option>
              <option value="IN_PLAN">Programada / Reprogramada</option>
              <option value="COMPLETED">Realizada</option>
            </select>
          </div>

          <div style={{ flex: '2 1 200px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Tema de Capacitación</label>
            <select name="q" className="form-input" defaultValue={q} style={{ borderRadius: '20px' }}>
              <option value="">Todos los temas</option>
              {allTrainings.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
            </select>
          </div>

          <button type="submit" className="btn btn-dark" style={{ padding: '0.5rem 1.5rem', borderRadius: '20px', height: '38px' }}>Filtrar</button>
          
          {(sp.sectorId || sp.jobProfileId || sp.employeeId || sp.statusFilter || q) && (
            <Link href={`?`} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', borderRadius: '20px', height: '38px' }}>
              Limpiar
            </Link>
          )}
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
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
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.employee.name}</td>
                  <td>{r.employee.sector.name}</td>
                  <td style={{ maxWidth: '250px' }}>{r.trainingName}</td>
                  <td>{getStateBadge(r)}</td>
                  <td>
                    {r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString('es-AR') : '-'}
                  </td>
                  <td>
                    {!isCompleted ? (
                      <RowActions 
                        recordId={r.id} 
                        currentDate={r.scheduledDate ? r.scheduledDate.toISOString().split('T')[0] : ''} 
                        status={r.status} 
                        isSgi={role === 'SGI'}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.875rem' }}>Realizada el: <strong>{r.completedAt ? new Date(r.completedAt).toLocaleDateString('es-AR') : '-'}</strong></div>
                        {r.score && <div style={{ fontSize: '0.875rem' }}>Nota: <strong>{r.score}</strong>/10</div>}
                        {r.evidencePath && (
                          <a href={r.evidencePath} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'fit-content' }}>
                            Ver Evidencia
                          </a>
                        )}
                        {!r.evidencePath && r.employeeSignature && (
                          <a href={`/plan-anual/planilla/${r.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'fit-content' }}>
                            Ver Planilla Firmada
                          </a>
                        )}
                        {r.effectiveness === 'PENDING' && (
                          <Link href={`/brechas/${r.employeeId}/evaluar`} className="btn btn-warning" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'fit-content' }}>
                            Evaluar Eficacia
                          </Link>
                        )}
                        {r.effectiveness === 'EFFECTIVE' && <span className="badge badge-success" style={{ width: 'fit-content' }}>Eficaz</span>}
                        {r.effectiveness === 'INEFFECTIVE' && <span className="badge badge-secondary" style={{ backgroundColor: '#ef4444', width: 'fit-content' }}>No Eficaz</span>}
                        
                        {role === 'SGI' && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <RowActions 
                              recordId={r.id} 
                              currentDate={r.scheduledDate ? r.scheduledDate.toISOString().split('T')[0] : ''} 
                              status={r.status}
                              isSgi={true}
                              isCompleted={true}
                              currentCompletedDate={r.completedAt ? r.completedAt.toISOString().split('T')[0] : ''}
                              currentScore={r.score || ""}
                            />
                          </div>
                        )}
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
