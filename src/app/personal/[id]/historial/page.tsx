import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentRole } from "@/lib/auth";

export default async function HistorialEmpleadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const empId = parseInt(id);
  const role = await getCurrentRole();

  if (!['ADMIN', 'SGI', 'RRHH'].includes(role)) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <h1 style={{ color: 'var(--text-secondary)' }}>Acceso Denegado</h1>
        <p>El historial de auditoría es confidencial.</p>
      </div>
    );
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Historial de Puestos: {empleado.name}</h1>
        <Link href="/personal" className="btn btn-secondary">
          Volver a la Nómina
        </Link>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Auditoría de Cambios de Puesto</h2>
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
                        if (gaps.length === 0) {
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '6px',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#15803d',
                                fontWeight: 600
                              }}
                            >
                              ✓ Sin Brechas (100% apto)
                            </span>
                          );
                        }
                        return (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {gaps.map((g: string, i: number) => (
                              <span
                                key={i}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '6px',
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  color: '#334155',
                                  fontWeight: 500,
                                  fontSize: '0.76rem'
                                }}
                              >
                                <span style={{ color: '#0284c7', fontWeight: 700 }}>•</span>
                                {g}
                              </span>
                            ))}
                          </div>
                        );
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
