import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUniqueActiveProfiles } from "@/lib/profileUtils";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
import { DeleteEmployeeButton } from "./DeleteEmployeeButton";
import { BASES_OPERATIVAS } from "@/lib/constants";

export default async function EditarPersonalPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>, 
  searchParams: Promise<{ error?: string }> 
}) {
  const { id } = await params;
  const sp = await searchParams;
  const empId = parseInt(id);
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const mySectorId = await getSectorIdFromRole(role);

  let mySector = null;
  if (isSector && mySectorId) {
    mySector = await prisma.sector.findUnique({ where: { id: mySectorId } });
  }

  const isComercialSector = isSector && mySector?.name.toLowerCase().includes('comercial');
  const isAdminOrRRHH = ['ADMIN', 'SGI', 'RRHH'].includes(role);

  const empleado = await prisma.employee.findUnique({
    where: { id: empId },
    include: { 
      sector: true,
      jobProfile: true,
      pendingTransfers: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        include: {
          sourceSector: true,
          sourceProfile: true,
          targetSector: true,
          targetProfile: true
        }
      }
    }
  });

  if (!empleado) {
    return <div>Empleado no encontrado</div>;
  }

  // Restricción de permisos: si es usuario sectorial, SOLO puede modificar si es Comercial y el empleado es de Comercial
  if (isSector) {
    if (!isComercialSector || !empleado.sector.name.toLowerCase().includes('comercial') || empleado.sectorId !== mySectorId) {
      redirect('/personal');
    }
  }

  let allowedSectors: string[] | null = null;
  if (isSector && mySector) {
    allowedSectors = await getAllowedSectorNames(role, mySector.name);
  }

  const sectores = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  const perfiles = await getUniqueActiveProfiles(allowedSectors);

  const isEmpComercial = empleado.sector.name.toLowerCase().includes('comercial');

  async function updateEmpleado(formData: FormData) {
    "use server"
    const name = (formData.get("name") as string)?.trim();
    const legajo = (formData.get("legajo") as string)?.trim();
    const rawSectorId = formData.get("sectorId") as string;
    const sectorId = isComercialSector ? empleado!.sectorId : parseInt(rawSectorId);
    const jobProfileId = formData.get("jobProfileId") ? parseInt(formData.get("jobProfileId") as string) : null;
    const baseOperativa = (formData.get("baseOperativa") as string) || null;
    const dni = (formData.get("dni") as string)?.trim() || null;

    let isDuplicate = false;
    try {
      await prisma.employee.update({
        where: { id: empId },
        data: {
          name,
          legajo,
          sectorId,
          jobProfileId,
          baseOperativa,
          dni
        }
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Verificar si el legajo pertenece a un empleado inactivo
        const existing = await prisma.employee.findUnique({ where: { legajo } });
        if (existing && !existing.isActive && existing.id !== empId) {
          // Liberar el legajo del empleado inactivo
          await prisma.employee.update({
            where: { id: existing.id },
            data: { legajo: `${legajo}_inactivo_${existing.id}` }
          });
          // Reintentar la actualización
          await prisma.employee.update({
            where: { id: empId },
            data: {
              name,
              legajo,
              sectorId,
              jobProfileId,
              baseOperativa,
              dni
            }
          });
        } else {
          isDuplicate = true;
        }
      } else {
        throw e;
      }
    }

    if (isDuplicate) {
      redirect(`/personal/${empId}/editar?error=legajo_exists`);
    }

    redirect('/personal');
  }

  async function deleteEmpleado() {
    "use server"
    try {
      // Solo administradores/RRHH pueden borrar definitivamente
      const currentRole = await getCurrentRole();
      if (!['ADMIN', 'SGI', 'RRHH'].includes(currentRole)) return;

      await prisma.employeeTrainingRecord.deleteMany({ where: { employeeId: empId } });
      await prisma.pendingTransfer.deleteMany({ where: { employeeId: empId } });
      await prisma.employee.delete({
        where: { id: empId }
      });
    } catch (e) {
      console.error("Error al eliminar empleado:", e);
    }
    
    redirect('/personal');
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Modificar Empleado</h1>
        <Link href="/personal" className="btn btn-secondary">
          Volver a la Nómina
        </Link>
      </div>

      {sp.error === 'legajo_exists' && (
        <div style={{ color: 'red', marginBottom: '1rem', padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '4px', border: '1px solid #fca5a5' }}>
          <strong>Error:</strong> El legajo ingresado ya está asignado a otro empleado.
        </div>
      )}

      <div className="card" style={{ maxWidth: '600px' }}>
        <form action={updateEmpleado} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="form-group">
            <label className="form-label">Nombre Completo</label>
            <input type="text" name="name" className="form-input" defaultValue={empleado.name} required />
          </div>

          <div className="form-group">
            <label className="form-label">Legajo</label>
            <input type="text" name="legajo" className="form-input" defaultValue={empleado.legajo} required />
          </div>

          {(isEmpComercial || isComercialSector || isAdminOrRRHH) && (
            <div className="form-group">
              <label className="form-label">DNI (Solo Comercial)</label>
              <input 
                type="text" 
                name="dni" 
                className="form-input" 
                defaultValue={empleado.dni || ''} 
                placeholder="Ej: 35123456" 
              />
              <small style={{ color: 'var(--text-secondary)' }}>
                Documento Nacional de Identidad del colaborador.
              </small>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Base Operativa</label>
            <select name="baseOperativa" className="form-input" defaultValue={empleado.baseOperativa || ''}>
              <option value="">-- Sin base asignada --</option>
              {BASES_OPERATIVAS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Sector / Gerencia</label>
            {isComercialSector ? (
              <>
                <input type="text" className="form-input" value={empleado.sector.name} disabled />
                <input type="hidden" name="sectorId" value={empleado.sectorId} />
                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  Como referente de Comercial, solo podés gestionar personal de tu gerencia.
                </small>
              </>
            ) : (
              <select name="sectorId" className="form-input" defaultValue={empleado.sectorId} required>
                {sectores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group" style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <label className="form-label" style={{ color: 'var(--primary-color)' }}>Asignar Perfil de Puesto</label>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Si cambias el perfil de puesto, podrás ir a la pestaña "Evaluación y Brechas" para ver qué capacitaciones le faltan de su nuevo perfil.
            </p>
            <select name="jobProfileId" className="form-input" defaultValue={empleado.jobProfileId || ''}>
              <option value="">-- Sin perfil asignado --</option>
              {perfiles.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            {empleado.jobProfileId && (
              <div style={{ marginTop: '0.5rem' }}>
                <Link href={`/perfiles/${empleado.jobProfileId}`} target="_blank" style={{ color: 'var(--primary-color)', textDecoration: 'underline', fontSize: '0.875rem' }}>
                  Ver Perfil Asignado
                </Link>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <div>
              {isAdminOrRRHH && (
                <DeleteEmployeeButton deleteAction={deleteEmpleado} />
              )}
            </div>
            <button type="submit" className="btn btn-primary">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
