import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function CapacitacionesPage() {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);

  if (isSector) {
    redirect("/");
  }

  const capacitaciones = await prisma.training.findMany({ orderBy: { title: 'asc' } });

  async function addTopic(formData: FormData) {
    "use server";
    const title = formData.get('title') as string;
    if (title && title.trim()) {
      await prisma.training.create({
        data: { title: title.trim(), isMandatory: false }
      });
      revalidatePath('/capacitaciones');
      revalidatePath('/plan-anual');
    }
  }

  async function deleteTopic(formData: FormData) {
    "use server";
    try {
      const id = parseInt(formData.get('id') as string);
      await prisma.training.delete({ where: { id } });
      revalidatePath('/capacitaciones');
      revalidatePath('/plan-anual');
    } catch(e) {
      console.error("No se puede borrar porque está en uso", e);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Temas a Capacitar</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Administra el catálogo de capacitaciones disponibles en el sistema.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Nuevo Tema</h3>
        <form action={addTopic} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <label className="form-label">Nombre del Tema</label>
            <input type="text" name="title" className="form-input" placeholder="Ej: Seguridad Industrial" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', height: '38px' }}>
            Agregar Tema
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tema de Capacitación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {capacitaciones.map(c => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td style={{ fontWeight: 'bold' }}>{c.title}</td>
                <td>
                  <form action={deleteTopic}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="btn" style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                      Eliminar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {capacitaciones.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center' }}>No hay temas cargados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
