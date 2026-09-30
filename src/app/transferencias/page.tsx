import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentRole, isSectorRole, getSectorIdFromRole } from "@/lib/auth";
import { eliminarTransferenciaAction } from "./actions";

export default async function TransferenciasPage() {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);
  const canDelete = ['ADMIN', 'RRHH', 'SGI'].includes(role);

  let whereClause: any = { status: 'PENDING' };
  if (isSector && sectorRoleId) {
    whereClause = { ...whereClause, targetSectorId: sectorRoleId };
  }

  const transferencias = await prisma.pendingTransfer.findMany({
    where: whereClause,
    include: {
      employee: { include: { sector: true } },
      targetProfile: true,
      targetSector: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Transferencias Pendientes de Aprobación</h1>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha Propuesta</th>
              <th>Empleado</th>
              <th>Sector Origen</th>
              <th>Sector Destino</th>
              <th>Perfil Destino</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {transferencias.map(t => (
              <tr key={t.id}>
                <td>{new Date(t.createdAt).toLocaleDateString('es-AR')}</td>
                <td style={{ fontWeight: 500 }}>{t.employee.name}</td>
                <td>{t.employee.sector.name}</td>
                <td>{t.targetSector.name}</td>
                <td>{t.targetProfile.title}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Link href={`/transferencias/${t.id}`} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                      Revisar y Confirmar
                    </Link>
                    {canDelete && (
                      <form action={eliminarTransferenciaAction}>
                        <input type="hidden" name="transferId" value={t.id} />
                        <button
                          type="submit"
                          className="btn btn-secondary"
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.875rem',
                            color: '#dc2626',
                            borderColor: '#fecaca',
                            backgroundColor: '#fef2f2'
                          }}
                        >
                          Eliminar
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {transferencias.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No hay transferencias pendientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
