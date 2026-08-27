import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentRole } from "@/lib/auth";

export default async function AuditoriaGlobalPage() {
  const role = await getCurrentRole();

  if (!['ADMIN', 'SGI', 'RRHH'].includes(role)) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <h1 style={{ color: 'var(--text-secondary)' }}>Acceso Denegado</h1>
        <p>El Historial de Evaluación Inicial es confidencial.</p>
      </div>
    );
  }

  // Traemos TODOS los cambios de puesto históricos
  const transferenciasHistoricas = await prisma.pendingTransfer.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    include: {
      employee: {
        include: { trainingRecords: true }
      },
      sourceSector: true,
      sourceProfile: true,
      targetSector: true,
      targetProfile: true
    }
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Historial de Evaluación Inicial</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Auditoría global de cambios de puesto y evaluación de la eficacia de capacitaciones (Brechas).</p>
      </div>

      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table className="data-table" style={{ fontSize: '0.875rem' }}>
          <thead>
            <tr>
              <th>Fecha Aprobación</th>
              <th>Vencimiento (90 Días)</th>
              <th>Empleado</th>
              <th>Destino (Nuevo Puesto)</th>
              <th style={{ width: '40%' }}>Detalle de Brechas y Eficacia</th>
            </tr>
          </thead>
          <tbody>
            {transferenciasHistoricas.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No hay historial registrado en el sistema.</td></tr>
            ) : (
              transferenciasHistoricas.map(pt => {
                let gapsList: string[] = [];
                try {
                  gapsList = JSON.parse(pt.gaps);
                } catch {}

                const hasPendingGaps = gapsList.some(gap => {
                  const record = pt.employee.trainingRecords.find(r => 
                    r.trainingName === gap && r.sourceProfileId === pt.targetProfileId
                  );
                  return !record || record.status !== 'COMPLETED';
                });

                let dueDateStr = '-';
                let alertBadge = null;
                if (pt.completedAt) {
                  const dueDate = new Date(pt.completedAt);
                  dueDate.setDate(dueDate.getDate() + 90);
                  dueDateStr = dueDate.toLocaleDateString('es-AR');

                  const now = new Date();
                  const diffTime = Math.abs(dueDate.getTime() - now.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                  if (hasPendingGaps) {
                    if (now > dueDate) {
                      alertBadge = <span className="badge badge-error" style={{ background: '#fecdd3', color: '#e11d48', display: 'block', marginTop: '0.25rem' }}>Vencido hace {diffDays} días</span>;
                    } else if (diffDays <= 30) {
                      alertBadge = <span className="badge badge-warning" style={{ background: '#fef08a', color: '#b45309', display: 'block', marginTop: '0.25rem' }}>Vence en {diffDays} días</span>;
                    } else {
                      alertBadge = <span className="badge badge-success" style={{ background: '#dcfce7', color: '#166534', display: 'block', marginTop: '0.25rem' }}>Vence en {diffDays} días</span>;
                    }
                  } else {
                    alertBadge = <span className="badge badge-success" style={{ background: '#dcfce7', color: '#166534', display: 'block', marginTop: '0.25rem' }}>Completado</span>;
                  }
                }

                return (
                  <tr key={pt.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {pt.completedAt ? pt.completedAt.toLocaleDateString('es-AR') : '-'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                      {dueDateStr}
                      {alertBadge}
                    </td>
                    <td>
                      <Link href={`/personal/${pt.employeeId}/editar`} style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        {pt.employee.name}
                      </Link>
                      <br/>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Leg: {pt.employee.legajo}</span>
                    </td>
                    <td>
                      <div>{pt.targetSector.name}</div>
                      <div style={{ fontSize: '0.8rem' }}>
                        <Link href={`/perfiles/${pt.targetProfileId}`} target="_blank" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
                          {pt.targetProfile.title} (Rev: {pt.targetProfile.revision || '01'})
                        </Link>
                      </div>
                    </td>
                    <td>
                      {gapsList.length === 0 ? (
                        <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>✓ Sin brechas (100% Apto)</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {gapsList.map((gap, i) => {
                            const record = pt.employee.trainingRecords.find(r => 
                              r.trainingName === gap && r.sourceProfileId === pt.targetProfileId
                            );

                            return (
                              <div key={i} style={{ borderLeft: '3px solid #e2e8f0', paddingLeft: '0.5rem' }}>
                                <div style={{ fontWeight: 500, color: '#334155' }}>• {gap}</div>
                                {record ? (
                                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#64748b' }}>
                                    {record.status === 'COMPLETED' ? (
                                      <>
                                        <span style={{ color: 'var(--success-color)' }}>✓ Completado</span> el {record.completedAt?.toLocaleDateString('es-AR')}
                                        <br/>
                                        Eficacia: {record.effectiveness === 'EFFECTIVE' || record.score ? <b>{record.score ? record.score + '/10' : 'Eficaz'}</b> : <i>Pendiente de evaluar</i>}
                                      </>
                                    ) : (
                                      <>
                                        <span style={{ color: '#eab308' }}>⏳ Programado</span> para el {record.scheduledDate?.toLocaleDateString('es-AR') || 'Sin fecha'}
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--error-color)' }}>
                                    No se encontró registro de la capacitación.
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
