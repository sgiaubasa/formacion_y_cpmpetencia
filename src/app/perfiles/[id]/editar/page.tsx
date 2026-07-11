import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentRole, isSectorRole } from "@/lib/auth";

export default async function EditarPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await prisma.jobProfile.findUnique({
    where: { id: parseInt(id) }
  });

  if (!perfil) return notFound();

  async function updateProfile(formData: FormData) {
    "use server"
    
    const role = await getCurrentRole();
    const isSector = await isSectorRole(role);
    const newStatus = isSector ? "VIGENTE" : "BORRADOR";

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
    const revision = formData.get("revision") as string || "01";
    const fechaRevision = formData.get("fechaRevision") as string;

    const oldId = parseInt(id);
    let newId = oldId;

    await prisma.$transaction(async (tx) => {
      // Desactivar el viejo
      await tx.jobProfile.update({
        where: { id: oldId },
        data: { isActive: false }
      });

      // Crear el nuevo
      const newProfile = await tx.jobProfile.create({
        data: {
          title, gerencia, reporta, supervisa, objetivo, educacion, orientacionTecnica,
          idiomasRequiere, idiomasAclaracion, tecnologias, conocimientosEsp, turnos,
          experienciaReq, experienciaAnios, adminPersonal, aspectos,
          vigencia, controlCambios, otrosConocimientos,
          revision, fechaRevision,
          isActive: true,
          previousVersionId: oldId,
          status: newStatus
        }
      });
      newId = newProfile.id;

      // Transferir Empleados
      await tx.employee.updateMany({
        where: { jobProfileId: oldId },
        data: { jobProfileId: newId }
      });

      // Transferir Transferencias Pendientes
      await tx.pendingTransfer.updateMany({
        where: { targetProfileId: oldId },
        data: { targetProfileId: newId }
      });
    });

    redirect(`/perfiles/${newId}`);
  }

  // Helpers para checkear las cajas
  const hasEducacion = (val: string) => perfil.educacion?.includes(val);
  const hasAspecto = (val: string) => perfil.aspectos?.includes(val);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{perfil.status === 'PENDIENTE_SECTOR' ? "Evaluar y Aprobar Perfil:" : "Editar Perfil:"} {perfil.title}</h1>
        <Link href={`/perfiles/${id}`} className="btn btn-secondary">Cancelar</Link>
      </div>

      <div className="card">
        <form action={updateProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Denominación del Puesto</label>
            <input type="text" name="title" required className="form-input" defaultValue={perfil.title} />
          </div>

          <div className="form-group">
            <label className="form-label">Gerencia de Pertenencia</label>
            <input type="text" name="gerencia" className="form-input" defaultValue={perfil.gerencia || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">Número de Revisión</label>
            <input type="text" name="revision" className="form-input" defaultValue={perfil.revision || '01'} />
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de Revisión</label>
            <input type="date" name="fechaRevision" className="form-input" defaultValue={perfil.fechaRevision || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">Reporta a</label>
            <input type="text" name="reporta" className="form-input" defaultValue={perfil.reporta || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">Supervisa a</label>
            <input type="text" name="supervisa" className="form-input" defaultValue={perfil.supervisa || ''} />
          </div>
          
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Vigencia desde</label>
            <input type="date" name="vigencia" className="form-input" defaultValue={perfil.vigencia || ''} />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Objetivo del Puesto / Funciones y Responsabilidades</label>
            <textarea name="objetivo" rows={8} className="form-input" defaultValue={perfil.objetivo || ''}></textarea>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Educación</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label><input type="checkbox" name="educacion" value="Primario" defaultChecked={hasEducacion('Primario')} /> Primario</label>
              <label><input type="checkbox" name="educacion" value="Secundario" defaultChecked={hasEducacion('Secundario')} /> Secundario</label>
              <label><input type="checkbox" name="educacion" value="Terciario" defaultChecked={hasEducacion('Terciario')} /> Terciario</label>
              <label><input type="checkbox" name="educacion" value="Universitario" defaultChecked={hasEducacion('Universitario')} /> Universitario</label>
              <label><input type="checkbox" name="educacion" value="Estudios de Post-grado" defaultChecked={hasEducacion('Estudios de Post-grado')} /> Post-grado</label>
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Orientación Técnica Requerida (Título)</label>
            <input type="text" name="orientacionTecnica" className="form-input" defaultValue={perfil.orientacionTecnica || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">¿Requiere Idiomas?</label>
            <input type="checkbox" name="idiomasRequiere" defaultChecked={perfil.idiomasRequiere} /> Sí
          </div>

          <div className="form-group">
            <label className="form-label">Aclaraciones de Idiomas</label>
            <input type="text" name="idiomasAclaracion" className="form-input" defaultValue={perfil.idiomasAclaracion || ''} />
          </div>
          
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Tecnologías de la Información</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label><input type="checkbox" name="tecBasicas" value="Basicas" defaultChecked={perfil.tecnologias?.includes('Basicas')} /> Conocimientos básicos de herramientas de gestión</label>
              <label><input type="checkbox" name="tecEspeciales" value="Especiales" defaultChecked={perfil.tecnologias?.includes('Especiales')} /> Herramientas informáticas especiales (MS Word, Excel, PowerPoint)</label>
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Otros Conocimientos (Software Específico, ej: Microsoft 365, SAP)</label>
            <input type="text" name="otrosConocimientos" className="form-input" defaultValue={perfil.otrosConocimientos || ''} placeholder="Ej: Microsoft 365, AutoCAD..." />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Conocimientos Necesarios (Capacitaciones Específicas / Normas)</label>
            <textarea name="conocimientosEsp" rows={5} className="form-input" defaultValue={perfil.conocimientosEsp || ''} placeholder="Escribe una capacitación por línea (presiona Enter para separar)."></textarea>
          </div>
          
          <div className="form-group">
            <label className="form-label">¿Requiere Experiencia?</label>
            <input type="checkbox" name="experienciaReq" defaultChecked={perfil.experienciaReq} /> Sí
          </div>

          <div className="form-group">
            <label className="form-label">Años de Experiencia</label>
            <input type="text" name="experienciaAnios" className="form-input" defaultValue={perfil.experienciaAnios || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">Administración de Personal</label>
            <select name="adminPersonal" className="form-input" defaultValue={perfil.adminPersonal || 'NO REQUIERE'}>
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
            <input type="checkbox" name="turnos" defaultChecked={perfil.turnos} /> Sí
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Aspectos Personales y Actitudinales</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <label><input type="checkbox" name="aspectos" value="RELACIONES INTERPERSONALES" defaultChecked={hasAspecto('RELACIONES INTERPERSONALES')} /> Relaciones Interpersonales</label>
              <label><input type="checkbox" name="aspectos" value="ORGANIZACIÓN" defaultChecked={hasAspecto('ORGANIZACIÓN')} /> Organización</label>
              <label><input type="checkbox" name="aspectos" value="CONTROL" defaultChecked={hasAspecto('CONTROL')} /> Control</label>
              <label><input type="checkbox" name="aspectos" value="CAPACIDAD DE TRABAJO EN EQUIPO" defaultChecked={hasAspecto('CAPACIDAD DE TRABAJO EN EQUIPO')} /> Capacidad de trabajo en equipo</label>
              <label><input type="checkbox" name="aspectos" value="FLEXIBILIDAD" defaultChecked={hasAspecto('FLEXIBILIDAD')} /> Flexibilidad</label>
              <label><input type="checkbox" name="aspectos" value="CAPACIDAD DE ANÁLISIS" defaultChecked={hasAspecto('CAPACIDAD DE ANÁLISIS')} /> Capacidad de análisis</label>
              <label><input type="checkbox" name="aspectos" value="PROACTIVIDAD" defaultChecked={hasAspecto('PROACTIVIDAD')} /> Proactividad</label>
            </div>
          </div>
          
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Control de Cambios (Historial de Modificaciones)</label>
            <textarea name="controlCambios" rows={2} className="form-input" defaultValue={perfil.controlCambios || ''}></textarea>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
              {perfil.status === 'PENDIENTE_SECTOR' ? "✅ Guardar y Dar Vigencia" : "Guardar Cambios (Quedará en Borrador)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
