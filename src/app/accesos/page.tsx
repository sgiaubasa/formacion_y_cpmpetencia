import { prisma } from "@/lib/prisma";
import { getCurrentRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { addAccess, removeAccess } from "./actions";

export default async function AccesosPage() {
  try {
    const currentRole = await getCurrentRole();
    if (currentRole !== "SGI") {
      redirect("/"); // Solo SGI puede ver esta página
    }

    const users = await prisma.appUser.findMany({
      include: { sector: true },
      orderBy: { email: 'asc' }
    });

    const sectores = await prisma.sector.findMany({
      orderBy: { name: 'asc' }
    });


  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestión de Accesos (Solo Administradores SGI)</h1>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Asignar Nuevo Acceso</h2>
        <form action={addAccess} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Correo Electrónico (Aubasa)</label>
            <input type="email" name="email" required placeholder="nombre.apellido@aubasa.com.ar" className="form-input" />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Rol</label>
            <select name="role" required className="form-input" id="role-select">
              <option value="SECTOR">Sector (Restringido)</option>
              <option value="RRHH">Administrador RRHH</option>
              <option value="SGI">Administrador SGI (Total)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Sector (Solo si el rol es Sector)</label>
            <select name="sectorId" className="form-input">
              <option value="">-- Seleccionar Sector --</option>
              {sectores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">¿Es Gerente del Sector?</label>
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <input type="checkbox" name="isManager" style={{ width: '20px', height: '20px' }} />
              <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}>Puede firmar perfiles</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', height: 'fit-content' }}>
            + Agregar Acceso
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Correo Electrónico</th>
              <th>Rol Asignado</th>
              <th>Sector Limitado A</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.email}</td>
                <td>
                  {u.role === "SGI" && <span className="badge badge-primary">Admin SGI</span>}
                  {u.role === "RRHH" && <span className="badge badge-primary" style={{ background: '#0284c7' }}>Admin RRHH</span>}
                  {u.role === "SECTOR" && <span className="badge badge-secondary">Sector</span>}
                  {u.isManager && <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>Gerente</span>}
                </td>
                <td>{u.role === "SECTOR" ? u.sector?.name || "-" : "Todo el Sistema"}</td>
                <td>
                  <form action={removeAccess}>
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}>
                      Quitar Acceso
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT') {
      throw error; // Let Next.js handle the redirect
    }
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h1>Error Interno (Debug)</h1>
        <pre>{error.message}</pre>
        <pre>{error.stack}</pre>
      </div>
    );
  }
}
