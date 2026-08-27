import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
import { ConfirmGapForm } from "../ConfirmGapForm";
import { getUniqueActiveProfiles } from "@/lib/profileUtils";

export default async function SimuladorCambioPuestoPage({ params, searchParams }: { params: Promise<{ employeeId: string }>, searchParams: Promise<{ targetProfileId?: string }> }) {
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

  if (role !== "ADMIN" && role !== "RRHH" && role !== "SGI" && !isSector) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <h1 style={{ color: 'var(--text-secondary)' }}>Acceso Denegado</h1>
        <p>Solo RRHH, Administradores, SGI o responsables de sector pueden realizar simulaciones de cambio de puesto.</p>
      </div>
    );
  }

  const { employeeId } = await params;
  const sp = await searchParams;
  const empId = parseInt(employeeId);
  const targetProfileId = sp.targetProfileId ? parseInt(sp.targetProfileId) : undefined;

  const empleado = await prisma.employee.findUnique({
    where: { id: empId },
    include: {
      sector: true,
      jobProfile: true,
      trainingRecords: {
        where: { status: 'COMPLETED' }
      }
    }
  });

  if (!empleado) {
    return <div>Empleado no encontrado</div>;
  }

  const allProfiles = await getUniqueActiveProfiles(allowedSectors);
  const allSectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  
  let targetProfile = null;
  let requirements: string[] = [];
  let gapResults: { requirement: string, hasTraining: boolean }[] = [];

  if (targetProfileId) {
    targetProfile = await prisma.jobProfile.findUnique({ where: { id: targetProfileId } });
    if (targetProfile && targetProfile.conocimientosEsp) {
      requirements = targetProfile.conocimientosEsp.split('\n').filter(i => i.trim() !== '');
      const historySet = new Set(empleado.trainingRecords.map(r => r.trainingName.trim()));
      gapResults = requirements.map(req => {
        const hasTraining = historySet.has(req.trim());
        return { requirement: req, hasTraining };
      });
    }
  }

  // Fetch RRHH and SGI users for the sender dropdown
  const rrhhUsers = await prisma.appUser.findMany({
    where: { role: { in: ['RRHH', 'SGI'] } },
    orderBy: { email: 'asc' }
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Simulador de Cambio de Puesto</h1>
        <Link href="/brechas" className="btn btn-secondary">Volver al Buscador</Link>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Datos del Empleado</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nombre Completo</span>
                <div style={{ fontWeight: 'bold' }}>{empleado.name}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Legajo</span>
                <div style={{ fontWeight: 'bold' }}>{empleado.legajo}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Sector Actual</span>
                <div style={{ fontWeight: 'bold' }}>{empleado.sector.name}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Perfil Actual</span>
                <div style={{ fontWeight: 'bold' }}>{empleado.jobProfile?.title || 'Sin asignar'}</div>
              </div>
            </div>
          </div>
          <Link href={`/personal/${empId}/editar`} className="btn btn-secondary">
            Editar Datos del Personal
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>1. Seleccionar Puesto Destino</h2>
        <form method="get" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <label className="form-label">Perfil de Puesto Destino</label>
            <select name="targetProfileId" className="form-input" defaultValue={targetProfileId || ''} required>
              <option value="" disabled>Seleccione un puesto a evaluar...</option>
              {allProfiles.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Evaluar Brecha</button>
        </form>
      </div>

      {targetProfile && gapResults && (
        <ConfirmGapForm 
          employeeName={empleado.name}
          targetProfileTitle={targetProfile.title}
          empId={empId}
          targetProfileId={targetProfile.id}
          allSectors={allSectors}
          rrhhUsers={rrhhUsers}
          defaultTargetSectorId={(() => {
            if (targetProfile.gerencia) {
              const matching = allSectors.find(s => s.name.toLowerCase() === targetProfile.gerencia!.toLowerCase());
              if (matching) return matching.id;
            }
            return empleado.sector.id;
          })()}
          gapResults={gapResults}
          completedTrainings={empleado.trainingRecords.map(r => r.trainingName)}
        />
      )}
    </div>
  );
}
