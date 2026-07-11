import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmTransferForm } from "./ConfirmTransferForm";

export default async function TransferenciaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transferId = parseInt(id);

  const pending = await prisma.pendingTransfer.findUnique({
    where: { id: transferId },
    include: {
      employee: { include: { sector: true, jobProfile: true } },
      targetProfile: true,
      targetSector: true
    }
  });

  if (!pending) {
    redirect('/transferencias');
  }

  const gaps = JSON.parse(pending.gaps) as string[];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Revisar Transferencia</h1>
        <Link href="/transferencias" className="btn btn-secondary">Volver</Link>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Datos de la Transferencia</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Empleado</span>
            <div style={{ fontWeight: 'bold' }}>{pending.employee.name} ({pending.employee.legajo})</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Viene del Sector</span>
            <div style={{ fontWeight: 'bold' }}>{pending.employee.sector.name}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Perfil Actual</span>
            <div style={{ fontWeight: 'bold' }}>{pending.employee.jobProfile?.title || 'Sin asignar'}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nuevo Puesto Propuesto</span>
            <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{pending.targetProfile.title}</div>
          </div>
        </div>
      </div>

      <ConfirmTransferForm transferId={transferId} gaps={gaps} />
    </div>
  );
}
