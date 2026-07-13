import { prisma } from "@/lib/prisma";
import { redirect, isRedirectError } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function NuevoPerfilPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params.error;

  async function createProfile(formData: FormData) {
    "use server"
    
    try {
      const title = formData.get("title") as string;
      const gerencia = formData.get("gerencia") as string;
      const reporta = formData.get("reporta") as string;
      const supervisa = formData.get("supervisa") as string;
      const objetivo = formData.get("objetivo") as string;
      const educacion = formData.getAll("educacion").join(", ");
      const orientacionTecnica = formData.get("orientacionTecnica") as string;
      const idiomasRequiere = formData.get("idiomasRequiere") === "on";
      const idiomasAclaracion = formData.get("idiomasAclaracion") as string;
      
      const tecBasicas = formData.get("tecBasicas") ? "Basicas" : "";
      const tecEspeciales = formData.get("tecEspeciales") ? "Especiales" : "";
      const tecnologias = [tecBasicas, tecEspeciales].filter(Boolean).join(",");
      
      const conocimientosEsp = formData.get("conocimientosEsp") as string;
      const turnos = formData.get("turnos") === "on";
      const experienciaReq = formData.get("experienciaReq") === "on";
      const experienciaAnios = formData.get("experienciaAnios") as string;
      const adminPersonal = formData.get("adminPersonal") as string;
      const aspectos = formData.getAll("aspectos").join(", ");
      
      const vigencia = formData.get("vigencia") as string;
      const controlCambios = formData.get("controlCambios") as string;
      const otrosConocimientos = formData.get("otrosConocimientos") as string;

      const newProfile = await prisma.jobProfile.create({
        data: {
          title, gerencia, reporta, supervisa, objetivo, educacion, orientacionTecnica,
          idiomasRequiere, idiomasAclaracion, tecnologias, conocimientosEsp, turnos,
          experienciaReq, experienciaAnios, adminPersonal, aspectos,
          vigencia, controlCambios, otrosConocimientos,
          status: 'BORRADOR'
        }
      });
      revalidatePath('/perfiles');
      redirect(`/perfiles/${newProfile.id}`);
    } catch (error: any) {
      if (isRedirectError(error)) {
        throw error;
      }
      console.error(error);
      redirect(`/perfiles/nuevo?error=${encodeURIComponent(error.message || "Error desconocido al guardar en base de datos")}`);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Nuevo Perfil de Puesto (PAU/03 - Anexo 2)</h1>
        <Link href="/perfiles" className="btn btn-secondary">Volver</Link>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #f87171' }}>
          <strong>Error al guardar:</strong> {error}
        </div>
      )}

      <div className="card">
        <form action={createProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Denominación del Puesto</label>
            <input type="text" name="title" required className="form-input" placeholder="Ej: ABOGADO/A (ABO)" />
          </div>

          <div className="form-group">
            <label className="form-label">Gerencia de Pertenencia</label>
            <input type="text" name="gerencia" className="form-input" placeholder="Ej: ASUNTOS LEGALES" />
          </div>

          <div className="form-group">
            <label className="form-label">Reporta a</label>
            <input type="text" name="reporta" className="form-input" placeholder="Ej: JEFE/A DE DEPARTAMENTO" />
          </div>

          <div className="form-group">
            <label className="form-label">Supervisa a</label>
            <input type="text" name="supervisa" className="form-input" placeholder="Ej: N/A o Analista Jr." />
          </div>
          
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Vigencia desde</label>
            <input type="date" name="vigencia" className="form-input" />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Objetivo del Puesto</label>
            <textarea name="objetivo" rows={3} className="form-input" placeholder="Ej: Asistir al GLE en el asesoramiento técnico..."></textarea>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Educación</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label><input type="checkbox" name="educacion" value="Primario" /> Primario</label>
              <label><input type="checkbox" name="educacion" value="Secundario" /> Secundario</label>
              <label><input type="checkbox" name="educacion" value="Terciario" /> Terciario</label>
              <label><input type="checkbox" name="educacion" value="Universitario" /> Universitario</label>
              <label><input type="checkbox" name="educacion" value="Estudios de Post-grado" /> Post-grado</label>
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Orientación Técnica Requerida (Título)</label>
            <input type="text" name="orientacionTecnica" className="form-input" placeholder="Ej: Título Universitario en la carrera de Abogacía" />
          </div>

          <div className="form-group">
            <label className="form-label">¿Requiere Idiomas?</label>
            <input type="checkbox" name="idiomasRequiere" /> Sí
          </div>

          <div className="form-group">
            <label className="form-label">Aclaraciones de Idiomas</label>
            <input type="text" name="idiomasAclaracion" className="form-input" placeholder="Ej: Conocimientos básicos de Inglés" />
          </div>
          
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Tecnologías de la Información</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label><input type="checkbox" name="tecBasicas" value="Basicas" /> Conocimientos básicos de herramientas de gestión</label>
              <label><input type="checkbox" name="tecEspeciales" value="Especiales" /> Herramientas informáticas especiales (MS Word, Excel, PowerPoint)</label>
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Otros Conocimientos (Software Específico, ej: Microsoft 365, SAP)</label>
            <input type="text" name="otrosConocimientos" className="form-input" placeholder="Ej: Microsoft 365, AutoCAD..." />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Conocimientos Necesarios (Capacitaciones Específicas / Normas)</label>
            <textarea name="conocimientosEsp" rows={5} className="form-input" placeholder="Escribe una capacitación por línea (presiona Enter para separar)."></textarea>
          </div>
          
          <div className="form-group">
            <label className="form-label">¿Requiere Experiencia?</label>
            <input type="checkbox" name="experienciaReq" /> Sí
          </div>

          <div className="form-group">
            <label className="form-label">Años de Experiencia</label>
            <input type="text" name="experienciaAnios" className="form-input" placeholder="Ej: + 3 años" />
          </div>

          <div className="form-group">
            <label className="form-label">Administración de Personal</label>
            <select name="adminPersonal" className="form-input">
              <option value="NO REQUIERE">No Requiere</option>
              <option value="HASTA 5 PERSONAS">Hasta 5 personas</option>
              <option value="HASTA 20 PERSONAS">Hasta 20 personas</option>
              <option value="HASTA 50 PERSONAS">Hasta 50 personas</option>
              <option value="HASTA 100 PERSONAS">Hasta 100 personas</option>
              <option value="MÁS DE 100 PERSONAS">Más de 100 personas</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">¿Trabajo en Turnos?</label>
            <input type="checkbox" name="turnos" /> Sí
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Aspectos Personales y Actitudinales</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <label><input type="checkbox" name="aspectos" value="RELACIONES INTERPERSONALES" /> Relaciones Interpersonales</label>
              <label><input type="checkbox" name="aspectos" value="ORGANIZACIÓN" /> Organización</label>
              <label><input type="checkbox" name="aspectos" value="CONTROL" /> Control</label>
              <label><input type="checkbox" name="aspectos" value="CAPACIDAD DE TRABAJO EN EQUIPO" /> Capacidad de trabajo en equipo</label>
              <label><input type="checkbox" name="aspectos" value="FLEXIBILIDAD" /> Flexibilidad</label>
              <label><input type="checkbox" name="aspectos" value="CAPACIDAD DE ANÁLISIS" /> Capacidad de análisis</label>
              <label><input type="checkbox" name="aspectos" value="PROACTIVIDAD" /> Proactividad</label>
            </div>
          </div>
          
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Control de Cambios (Historial de Modificaciones)</label>
            <textarea name="controlCambios" rows={2} className="form-input" placeholder="Ej: Revisión 02: Se eliminó el nivel primario en la sección de educación..."></textarea>
          </div>

          <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1rem' }}>
            Guardar Perfil de Puesto
          </button>
        </form>
      </div>
    </div>
  );
}
