import { prisma } from "@/lib/prisma";
import { getCurrentRole } from "@/lib/auth";
import { updateEmailTemplateAction } from "./actions";

export default async function ConfiguracionPage() {
  const role = await getCurrentRole();
  if (role !== "ADMIN" && role !== "RRHH" && role !== "SGI") {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <h1 style={{ color: 'var(--text-secondary)' }}>Acceso Denegado</h1>
        <p>Solo RRHH, SGI y Administradores pueden acceder a esta sección.</p>
      </div>
    );
  }

  const setting = await prisma.appSetting.findUnique({
    where: { id: 'email_template_transferencia' }
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Configuración del Sistema</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Administre las plantillas de correo electrónico y otras preferencias globales.</p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Plantilla: Correo de Transferencia / Cambio de Puesto</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
          Este es el contenido del correo que se envía al sector cuando se propone un cambio de puesto.
          <br/>Puedes usar HTML y las siguientes variables especiales (que serán reemplazadas automáticamente):
          <br/><strong>{`{{nombre}}`}</strong>, <strong>{`{{legajo}}`}</strong>, <strong>{`{{puesto}}`}</strong>, <strong>{`{{brechas}}`}</strong>
        </p>

        <form action={updateEmailTemplateAction}>
          <input type="hidden" name="templateId" value="email_template_transferencia" />
          <textarea 
            name="value" 
            className="form-input" 
            rows={15} 
            defaultValue={setting?.value || ""} 
            style={{ width: '100%', fontFamily: 'monospace', marginBottom: '1rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
}
