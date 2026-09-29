import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUniqueActiveProfiles } from "@/lib/profileUtils";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
import { BASES_OPERATIVAS, formatEmployeeName } from "@/lib/constants";

export default async function NuevoPersonalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params.error;

  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const mySectorId = await getSectorIdFromRole(role);

  let mySector = null;
  if (isSector && mySectorId) {
    mySector = await prisma.sector.findUnique({ where: { id: mySectorId } });
  }

  const isComercialSector = isSector && mySector?.name.toLowerCase().includes('comercial');
  const isAdminOrRRHH = ['ADMIN', 'SGI', 'RRHH'].includes(role);

  // Si es rol sectorial y no es Comercial, no tiene permiso de crear empleados
  if (isSector && !isComercialSector) {
    redirect('/personal');
  }

  let allowedSectors: string[] | null = null;
  if (isSector && mySector) {
    allowedSectors = await getAllowedSectorNames(role, mySector.name);
  }

  const sectores = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  const perfiles = await getUniqueActiveProfiles(allowedSectors);

  async function createEmployee(formData: FormData) {
    "use server"
    
    try {
      const legajo = (formData.get("legajo") as string)?.trim();
      const rawName = (formData.get("name") as string)?.trim();
      const name = formatEmployeeName(rawName);
      const rawSectorId = formData.get("sectorId") as string;
      const sectorId = isComercialSector && mySectorId ? mySectorId : parseInt(rawSectorId);
      const jobProfileId = formData.get("jobProfileId") ? parseInt(formData.get("jobProfileId") as string) : null;
      const baseOperativa = (formData.get("baseOperativa") as string) || null;
      const dni = (formData.get("dni") as string)?.trim() || null;

      const existingEmployee = await prisma.employee.findUnique({
        where: { legajo }
      });

      if (existingEmployee) {
        if (existingEmployee.isActive) {
          redirect(`/personal/nuevo?error=${encodeURIComponent("Ya existe un empleado activo con este número de legajo.")}`);
        } else {
          // Si existe pero está inactivo, lo reactivamos y actualizamos sus datos
          await prisma.employee.update({
            where: { id: existingEmployee.id },
            data: {
              name,
              sectorId,
              jobProfileId,
              baseOperativa,
              dni,
              isActive: true
            }
          });
        }
      } else {
        // Si no existe, lo creamos nuevo
        await prisma.employee.create({
          data: {
            legajo,
            name,
            sectorId,
            jobProfileId,
            baseOperativa,
            dni
          }
        });
      }
    } catch (e: any) {
      if (e?.message === "NEXT_REDIRECT" || (e?.digest && e.digest.startsWith("NEXT_REDIRECT"))) {
        throw e;
      }
      redirect(`/personal/nuevo?error=${encodeURIComponent("Error al guardar el empleado.")}`);
    }
    
    redirect("/personal");
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Vincular Nuevo Personal</h1>
        <Link href="/personal" className="btn btn-secondary">Volver</Link>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #ef4444', color: '#b91c1c', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', fontWeight: 'bold' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ maxWidth: '600px' }}>
        <form action={createEmployee}>
          <div className="form-group">
            <label className="form-label">Número de Legajo</label>
            <input type="text" name="legajo" required className="form-input" placeholder="Ej: 12345" />
          </div>

          <div className="form-group">
            <label className="form-label">Nombre Completo</label>
            <input type="text" name="name" required className="form-input" placeholder="Ej: Juan Pérez" />
          </div>

          {isComercialSector && (
            <div className="form-group">
              <label className="form-label">DNI</label>
              <input type="text" name="dni" className="form-input" placeholder="Ej: 35123456" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Base Operativa</label>
            <select name="baseOperativa" className="form-input">
              <option value="">Seleccione una base operativa...</option>
              {BASES_OPERATIVAS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Sector a la que pertenece</label>
            {isComercialSector ? (
              <>
                <input type="text" className="form-input" value={mySector?.name || 'Gerencia Comercial'} disabled />
                <input type="hidden" name="sectorId" value={mySectorId!} />
                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  Fijado a tu gerencia (Comercial).
                </small>
              </>
            ) : (
              <>
                <select name="sectorId" required className="form-input">
                  <option value="">Seleccione un sector...</option>
                  {sectores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  Los sectores disponibles provienen de tu histórico migrado.
                </small>
              </>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Perfil de Puesto (Norma ISO)</label>
            <select name="jobProfileId" className="form-input">
              <option value="">Sin asignar por ahora (En inducción)</option>
              {perfiles.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Vincular a un puesto activará automáticamente el Análisis de Brechas.
            </small>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
            Guardar y Vincular Legajo
          </button>
        </form>
      </div>
    </div>
  );
}
