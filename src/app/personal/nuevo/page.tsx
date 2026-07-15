import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUniqueActiveProfiles } from "@/lib/profileUtils";

export default async function NuevoPersonalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params.error;

  const sectores = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  const perfiles = await getUniqueActiveProfiles();

  async function createEmployee(formData: FormData) {
    "use server"
    
    try {
      const legajo = formData.get("legajo") as string;
      const name = formData.get("name") as string;
      const sectorId = parseInt(formData.get("sectorId") as string);
      const jobProfileId = formData.get("jobProfileId") ? parseInt(formData.get("jobProfileId") as string) : null;

      await prisma.employee.create({
        data: {
          legajo,
          name,
          sectorId,
          jobProfileId
        }
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        redirect(`/personal/nuevo?error=${encodeURIComponent("Ya existe un empleado registrado con este número de legajo.")}`);
      }
      redirect(`/personal/nuevo?error=${encodeURIComponent("Error al crear el empleado.")}`);
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

          <div className="form-group">
            <label className="form-label">Sector a la que pertenece</label>
            <select name="sectorId" required className="form-input">
              <option value="">Seleccione un sector...</option>
              {sectores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Los sectores disponibles provienen de tu histórico migrado.
            </small>
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
