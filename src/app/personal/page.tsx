import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { BajaButton } from "@/components/BajaButton";
import { getUniqueActiveProfiles } from "@/lib/profileUtils";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
import { BASES_OPERATIVAS } from "@/lib/constants";

export default async function PersonalPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ q?: string, sectorId?: string, jobProfileId?: string, baseOperativa?: string }> 
}) {
  const sp = await searchParams;
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const mySectorId = await getSectorIdFromRole(role);

  let mySectorName = '';
  if (isSector && mySectorId) {
    const mySector = await prisma.sector.findUnique({ where: { id: mySectorId } });
    mySectorName = mySector?.name || '';
  }
  const isComercialSector = isSector && mySectorName.toLowerCase().includes('comercial');
  const isAdminOrRRHH = ['ADMIN', 'SGI', 'RRHH'].includes(role);

  // Permiso para dar de alta nuevo personal: Administradores/RRHH o referente de Comercial
  const canAddEmployee = isAdminOrRRHH || isComercialSector;

  const q = sp.q || '';
  const jobFilter = sp.jobProfileId ? parseInt(sp.jobProfileId) : undefined;
  const baseFilter = sp.baseOperativa || undefined;
  let userSelectedSectorFilter = sp.sectorId ? parseInt(sp.sectorId) : undefined;
  
  let allowedSectorIds: number[] | undefined = undefined;
  let allowedSectors: string[] | null = null;

  if (isSector && mySectorId) {
    const mySector = await prisma.sector.findUnique({ where: { id: mySectorId } });
    if (mySector) {
      allowedSectors = await getAllowedSectorNames(role, mySector.name);
      const allowedObjs = await prisma.sector.findMany({ where: { name: { in: allowedSectors } } });
      allowedSectorIds = allowedObjs.map(s => s.id);
    } else {
      allowedSectorIds = [mySectorId];
    }
  }

  const whereClause: any = { isActive: true };
  if (q) {
    whereClause.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { legajo: { contains: q, mode: 'insensitive' } },
      { dni: { contains: q, mode: 'insensitive' } }
    ];
  }
  if (jobFilter) {
    whereClause.jobProfileId = jobFilter;
  }
  if (baseFilter) {
    whereClause.baseOperativa = baseFilter;
  }
  if (allowedSectorIds) {
    whereClause.sectorId = { in: allowedSectorIds };
  } else if (userSelectedSectorFilter) {
    whereClause.sectorId = userSelectedSectorFilter;
  }

  const empleados = await prisma.employee.findMany({
    where: whereClause,
    include: {
      sector: true,
      jobProfile: true
    },
    orderBy: { name: 'asc' }
  });

  const sectores = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  const perfiles = await getUniqueActiveProfiles(allowedSectors);

  // Comprobar si se está visualizando Comercial para mostrar la columna DNI
  const comercialSector = await prisma.sector.findFirst({ where: { name: { contains: 'Comercial', mode: 'insensitive' } } });
  const isComercialView = isComercialSector || (userSelectedSectorFilter && comercialSector && userSelectedSectorFilter === comercialSector.id);

  async function darDeBaja(formData: FormData) {
    "use server"
    const id = parseInt(formData.get("id") as string);
    const empToBaja = await prisma.employee.findUnique({ 
      where: { id },
      include: { sector: true }
    });
    if (!empToBaja) return;

    const currentRole = await getCurrentRole();
    const isSectorRoleActive = await isSectorRole(currentRole);
    const currentSectorId = await getSectorIdFromRole(currentRole);

    // Si es usuario sectorial de Comercial, solo puede dar de baja a empleados de Comercial
    if (isSectorRoleActive) {
      if (!empToBaja.sector.name.toLowerCase().includes('comercial') || empToBaja.sectorId !== currentSectorId) {
        return;
      }
    }

    await prisma.employee.update({
      where: { id },
      data: { isActive: false }
    });
    revalidatePath('/personal');
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Personal y Legajos</h1>
        {canAddEmployee && (
          <Link href="/personal/nuevo" className="btn btn-primary">
            + Nuevo Empleado
          </Link>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <form method="get" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          
          {!isSector && (
            <div style={{ flex: '1 1 180px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Sector</label>
              <select name="sectorId" className="form-input" defaultValue={sp.sectorId || ''}>
                <option value="">Todos los sectores</option>
                {sectores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Base Operativa</label>
            <select name="baseOperativa" className="form-input" defaultValue={sp.baseOperativa || ''}>
              <option value="">Todas las bases</option>
              {BASES_OPERATIVAS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Perfil de Puesto</label>
            <select name="jobProfileId" className="form-input" defaultValue={sp.jobProfileId || ''}>
              <option value="">Todos los puestos</option>
              {perfiles.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>

          <div style={{ flex: '2 1 250px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Buscador (Nombre/Legajo/DNI)</label>
            <input type="text" name="q" className="form-input" placeholder="Buscar empleado..." defaultValue={q} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Filtrar</button>
          
          {(sp.sectorId || sp.jobProfileId || sp.baseOperativa || q) && (
            <Link href={`/personal`} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Limpiar
            </Link>
          )}
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Legajo</th>
              <th>Nombre</th>
              {isComercialView && <th>DNI</th>}
              <th>Sector</th>
              <th>Base Operativa</th>
              <th>Puesto / Perfil</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleados.length === 0 ? (
              <tr>
                <td colSpan={isComercialView ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No hay personal activo que coincida con la búsqueda.
                </td>
              </tr>
            ) : (
              empleados.map(emp => {
                const isEmpComercial = emp.sector.name.toLowerCase().includes('comercial');
                const canModifyThisEmp = isAdminOrRRHH || (isComercialSector && isEmpComercial);

                return (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 600 }}>{emp.legajo}</td>
                    <td>{emp.name}</td>
                    {isComercialView && (
                      <td style={{ fontWeight: 500, color: '#0369a1' }}>
                        {emp.dni || <span style={{ color: 'var(--text-secondary)' }}>-</span>}
                      </td>
                    )}
                    <td>{emp.sector.name}</td>
                    <td>
                      {emp.baseOperativa ? (
                        <span style={{ fontWeight: 500, color: '#334155' }}>📍 {emp.baseOperativa}</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                    <td>
                      {emp.jobProfile?.title ? (
                        <span className="badge badge-success">{emp.jobProfile.title}</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Sin asignar</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {isAdminOrRRHH && (
                          <Link href={`/personal/${emp.id}/historial`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} title="Ver Historial de Puestos">
                            📜 Historial
                          </Link>
                        )}
                        {canModifyThisEmp && (
                          <>
                            <Link href={`/personal/${emp.id}/editar`} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px', background: '#0d8383', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} title="Modificar Empleado">
                              ✏️ Modificar
                            </Link>
                            <form action={darDeBaja}>
                              <input type="hidden" name="id" value={emp.id} />
                              <BajaButton />
                            </form>
                          </>
                        )}
                      </div>
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
