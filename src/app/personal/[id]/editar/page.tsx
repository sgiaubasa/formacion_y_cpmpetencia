import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUniqueActiveProfiles } from "@/lib/profileUtils";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
import { DeleteEmployeeButton } from "./DeleteEmployeeButton";

export default async function EditarPersonalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const empId = parseInt(id);
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const mySectorId = await getSectorIdFromRole(role);

  let allowedSectors: string[] | null = null;
  if (isSector && mySectorId) {
    const mySector = await prisma.sector.findUnique({ where: { id: mySectorId } });
    if (mySector) {
      allowedSectors = await getAllowedSectorNames(role, mySector.name);
    }
  }

  const empleado = await prisma.employee.findUnique({
    where: { id: empId },
    include: { 
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

  const sectores = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  const perfiles = await getUniqueActiveProfiles(allowedSectors);

  async function updateEmpleado(formData: FormData) {
    "use server"
    const name = formData.get("name") as string;
    const legajo = formData.get("legajo") as string;
    const sectorId = parseInt(formData.get("sectorId") as string);
    const jobProfileId = formData.get("jobProfileId") ? parseInt(formData.get("jobProfileId") as string) : null;

    await prisma.employee.update({
      where: { id: empId },
      data: {
        name,
        legajo,
        sectorId,
        jobProfileId
      }
    });

    redirect('/personal');
  }

  async function deleteEmpleado() {
    "use server"
    try {
      // Intentamos borrar todas las capacitaciones y transferencias pendientes primero para evitar errores de llave foránea
      await prisma.employeeTrainingRecord.deleteMany({ where: { employeeId: empId } });
      await prisma.pendingTransfer.deleteMany({ where: { employeeId: empId } });
      
      // Borramos al empleado definitivamente
      await prisma.employee.delete({
        where: { id: empId }
      });
    } catch (e) {
      console.error("Error al eliminar empleado:", e);
      // No podemos mostrar error fácilmente sin estado de cliente, pero se eliminará si es posible.
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

          <div className="form-group">
            <label className="form-label">Sector / Gerencia</label>
            <select name="sectorId" className="form-input" defaultValue={empleado.sectorId} required>
              {sectores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}</select>
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
              {['ADMIN', 'SGI', 'RRHH'].includes(role) && (
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
