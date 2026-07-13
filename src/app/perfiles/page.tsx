import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BorrarPerfilButton } from "@/components/BorrarPerfilButton";
import { enviarARevision, aprobarPerfil, borrarPerfil, devolverAAdmin } from "./actions";

import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";

export default async function PerfilesPage({ searchParams }: { searchParams: Promise<{ gerencia?: string }> }) {
  const sp = await searchParams;
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const mySectorId = await getSectorIdFromRole(role);

  let gerenciaFilter = sp.gerencia || "";
  let allowedSectors: string[] | null = null;

  if (isSector && mySectorId) {
    const mySector = await prisma.sector.findUnique({ where: { id: mySectorId } });
    if (mySector) {
      allowedSectors = await getAllowedSectorNames(role, mySector.name);
    }
  }

  const whereClause: any = { isActive: true };
  if (allowedSectors) {
    whereClause.gerencia = { in: allowedSectors };
  } else if (gerenciaFilter) {
    whereClause.gerencia = gerenciaFilter;
  }

  const perfiles = await prisma.jobProfile.findMany({
    where: whereClause,
    include: {
      requirements: {
        include: { training: true }
      }
    }
  });

  const uniqueGerencias = await prisma.jobProfile.findMany({
    select: { gerencia: true },
    distinct: ['gerencia'],
    where: { gerencia: { not: null } }
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Perfiles de Puesto</h1>
        {!isSector && (
          <Link href="/perfiles/nuevo" className="btn btn-primary">
            + Nuevo Perfil
          </Link>
        )}
      </div>

      {!isSector && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <form method="get" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>Filtrar por Sector:</label>
            <select name="gerencia" className="form-input" defaultValue={gerenciaFilter} style={{ maxWidth: '300px' }}>
              <option value="">Todos los Sectores</option>
              {uniqueGerencias.map(g => g.gerencia ? <option key={g.gerencia} value={g.gerencia}>{g.gerencia}</option> : null)}
            </select>
            <button type="submit" className="btn btn-primary">Aplicar Filtro</button>
            {gerenciaFilter && <Link href="/perfiles" className="btn btn-secondary">Limpiar</Link>}
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Título del Puesto</th>
              <th>Sector / Gerencia</th>
              <th>Estado</th>
              <th>Requisitos Mínimos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {perfiles.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No hay perfiles configurados. Haz clic en "Nuevo Perfil" para comenzar.
                </td>
              </tr>
            ) : (
              perfiles.map(perfil => (
                <tr key={perfil.id}>
                  <td>#{perfil.id}</td>
                  <td style={{ fontWeight: 500, color: 'var(--primary-color)' }}>{perfil.title}</td>
                  <td>{perfil.gerencia || '-'}</td>
                  <td>
                    {perfil.status === 'VIGENTE' && <span className="badge badge-success">Vigente</span>}
                    {perfil.status === 'PENDIENTE_SECTOR' && <span className="badge badge-warning" style={{ background: '#fef08a', color: '#854d0e' }}>Revisión Sector</span>}
                    {perfil.status === 'DEVUELTO_A_ADMIN' && <span className="badge badge-warning" style={{ background: '#fbcfe8', color: '#be185d' }}>Revisión Admin</span>}
                    {perfil.status === 'BORRADOR' && <span className="badge badge-secondary" style={{ background: '#e2e8f0', color: '#475569' }}>Borrador</span>}
                  </td>
                  <td>
                    <span className="badge badge-success">
                      {perfil.conocimientosEsp ? perfil.conocimientosEsp.split('\n').filter((item: string) => item.trim() !== '').length : 0} capacitaciones base
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Link href={`/perfiles/${perfil.id}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        📄 Ver PDF
                      </Link>
                      
                      {/* SGI/RRHH siempre puede editar. */}
                      {!isSector && (
                        <>
                          <Link href={`/perfiles/${perfil.id}/editar`} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px', background: '#0d8383', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            ✏️ Editar
                          </Link>
                          {perfil.status === 'BORRADOR' && (
                            <>
                              <form action={enviarARevision}>
                                <input type="hidden" name="id" value={perfil.id} />
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px', background: '#3b82f6', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' }} title="Mandar al sector para revisión opcional">
                                  📤 Enviar a Sector
                                </button>
                              </form>
                              <form action={aprobarPerfil}>
                                <input type="hidden" name="id" value={perfil.id} />
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px', background: '#10b981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' }} title="Aprobar directamente sin pasar por el sector">
                                  ✅ Aprobar Directo
                                </button>
                              </form>
                            </>
                          )}
                          {perfil.status === 'DEVUELTO_A_ADMIN' && (
                            <form action={aprobarPerfil}>
                              <input type="hidden" name="id" value={perfil.id} />
                              <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px', background: '#10b981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                                ✅ Cerrar y Aprobar
                              </button>
                            </form>
                          )}
                          <form action={borrarPerfil}>
                            <input type="hidden" name="id" value={perfil.id} />
                            <BorrarPerfilButton />
                          </form>
                        </>
                      )}
                      
                      {/* Sector puede editar si está PENDIENTE_SECTOR */}
                      {isSector && perfil.status === 'PENDIENTE_SECTOR' && (
                        <>
                          <Link href={`/perfiles/${perfil.id}/editar`} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            📝 Editar
                          </Link>
                          <form action={devolverAAdmin}>
                            <input type="hidden" name="id" value={perfil.id} />
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px', background: '#6366f1', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                              📤 Devolver a SGI/RRHH
                            </button>
                          </form>
                        </>
                      )}
                    </div>
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
