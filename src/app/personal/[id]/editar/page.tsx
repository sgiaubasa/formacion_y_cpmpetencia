import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUniqueActiveProfiles } from "@/lib/profileUtils";
import { getCurrentRole } from "@/lib/auth";
import { DeleteEmployeeButton } from "./DeleteEmployeeButton";

export default async function EditarPersonalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const empId = parseInt(id);
  const role = await getCurrentRole();

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
  const perfiles = await getUniqueActiveProfiles();

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
              {sectores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
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

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Historial de Cambios de Puesto (Auditoría)</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha del Cambio</th>
              <th>Sector Origen</th>
              <th>Perfil Origen</th>
              <th>Sector Destino</th>
              <th>Perfil Destino (Nuevo Puesto)</th>
              <th>Brechas Detectadas al Mudar</th>
            </tr>
          </thead>
          <tbody>
            {empleado.pendingTransfers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay historial de cambios de puesto registrados.</td></tr>
            ) : (
              empleado.pendingTransfers.map(pt => (
                <tr key={pt.id}>
                  <td>{pt.completedAt ? pt.completedAt.toLocaleDateString('es-AR') : pt.createdAt.toLocaleDateString('es-AR')}</td>
                  <td>{pt.sourceSector?.name || '-'}</td>
                  <td>
                    {pt.sourceProfileId ? (
                      <Link href={`/perfiles/${pt.sourceProfileId}`} target="_blank" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
                        Ver Rev: {pt.sourceProfile?.revision || '01'}
                      </Link>
                    ) : '-'}
                  </td>
                  <td>{pt.targetSector.name}</td>
                  <td>
                    <Link href={`/perfiles/${pt.targetProfileId}`} target="_blank" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
                      Ver Rev: {pt.targetProfile.revision || '01'}
                    </Link>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {(() => {
                      try {
                        const gaps = JSON.parse(pt.gaps);
                        if (gaps.length === 0) return 'Sin Brechas (100% apto)';
                        return <ul style={{ margin: 0, paddingLeft: '1rem' }}>{gaps.map((g: string, i: number) => <li key={i}>{g}</li>)}</ul>;
                      } catch {
                        return '-';
                      }
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
