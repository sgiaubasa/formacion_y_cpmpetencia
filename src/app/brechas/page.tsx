import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentRole } from "@/lib/auth";

export default async function BrechasPage({ searchParams }: { searchParams: Promise<{ sectorId?: string }> }) {
  const role = await getCurrentRole();
  if (role !== "ADMIN" && role !== "RRHH") {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <h1 style={{ color: 'var(--text-secondary)' }}>Acceso Denegado</h1>
        <p>La Evaluación Inicial y el Simulador de Brechas están restringidos a los roles de ADMIN y RRHH.</p>
        <p>Por favor, dirígete a la pestaña <b>Plan Anual</b> para planificar las capacitaciones de tu sector.</p>
      </div>
    );
  }

  const sp = await searchParams;
  const sectorFilter = sp.sectorId ? parseInt(sp.sectorId) : undefined;

  const whereClause = sectorFilter ? { sectorId: sectorFilter } : {};

  const empleados = await prisma.employee.findMany({
    where: { isActive: true, ...whereClause },
    include: {
      sector: true,
      jobProfile: true,
      trainingRecords: true
    },
    orderBy: { name: 'asc' }
  });

  const sectores = await prisma.sector.findMany({ orderBy: { name: 'asc' } });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Simulador de Cambio de Puesto</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Seleccione un empleado para evaluar su brecha contra un nuevo puesto o sector.</p>
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <form method="get" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>Filtrar por Sector:</label>
          <select name="sectorId" className="form-input" defaultValue={sectorFilter || ""} style={{ maxWidth: '300px' }}>
            <option value="">Todos los Sectores</option>
            {sectores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Aplicar Filtro</button>
          {sectorFilter && <Link href="/brechas" className="btn btn-secondary">Limpiar</Link>}
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Legajo</th>
              <th>Nombre</th>
              <th>Sector Actual</th>
              <th>Perfil de Puesto Actual</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map(emp => {
              const reqs = emp.jobProfile?.conocimientosEsp 
                ? emp.jobProfile.conocimientosEsp.split('\n').filter(i => i.trim() !== '')
                : [];
              
              // Solo contamos como completadas aquellas que son parte del perfil actual
              const completadas = emp.trainingRecords.filter(r => 
                r.status === 'COMPLETED' && reqs.includes(r.trainingName)
              ).length;
              
              const total = reqs.length;
              const hasProfile = !!emp.jobProfile;

              return (
                <tr key={emp.id}>
                  <td>{emp.legajo}</td>
                  <td style={{ fontWeight: 500, color: 'var(--primary-color)' }}>{emp.name}</td>
                  <td>{emp.sector.name}</td>
                  <td>
                    {hasProfile ? (
                      <span className="badge badge-success">{emp.jobProfile?.title}</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Sin perfil asignado</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/brechas/${emp.id}`} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                      Simular Cambio de Puesto
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
