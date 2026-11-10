import { prisma } from "@/lib/prisma";
import { getCurrentRole } from "@/lib/auth";
import { updateEmailTemplateAction, updateSmtpSettingsAction } from "./actions";

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

  const allSettings = await prisma.appSetting.findMany();
  const map: Record<string, string> = {};
  for (const s of allSettings) {
    map[s.id] = s.value;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Configuración del Sistema</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Administre las plantillas de correo electrónico y el envío de notificaciones.</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
          Servidor de Correo Automático (SMTP / Power Automate)
        </h2>
        <p style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Configure una cuenta de envío (por ejemplo <code>sgiaubasa@gmail.com</code> con Contraseña de Aplicación de Google, o un Webhook de Power Automate de Office 365 Outlook) para que el sistema envíe los correos automáticamente en segundo plano. Si estos campos quedan vacíos, al confirmar un Cambio de Puesto se abrirá automáticamente su cliente de correo (Outlook) con el mensaje listo para enviar.
        </p>

        <form action={updateSmtpSettingsAction} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Servidor SMTP (Host)</label>
            <input
              type="text"
              name="smtp_host"
              className="form-input"
              defaultValue={map['smtp_host'] || 'smtp.gmail.com'}
              placeholder="smtp.gmail.com o smtp.office365.com"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Puerto SMTP</label>
            <input
              type="text"
              name="smtp_port"
              className="form-input"
              defaultValue={map['smtp_port'] || '587'}
              placeholder="587"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Usuario / Correo Emisor (SMTP)</label>
            <input
              type="email"
              name="smtp_user"
              className="form-input"
              defaultValue={map['smtp_user'] || ''}
              placeholder="sgiaubasa@gmail.com"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contraseña / Contraseña de Aplicación</label>
            <input
              type="password"
              name="smtp_pass"
              className="form-input"
              placeholder={map['smtp_pass'] ? '•••••••••••• (Ya configurada)' : 'Ingrese contraseña de aplicación'}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
            <label className="form-label">Opcional: URL Webhook de Correo (Protegido en Base de Datos)</label>
            <input
              type="password"
              name="email_webhook_url"
              className="form-input"
              placeholder={map['email_webhook_url'] ? '•••••••••••••••••••••••••••• (Webhook activo y protegido)' : 'https://...'}
            />
          </div>

          <div
            style={{
              gridColumn: '1 / -1',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '10px',
              padding: '1rem',
              marginTop: '0.5rem'
            }}
          >
            <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', color: '#0369a1' }}>
              ☁️ Conexión con OneDrive / SharePoint Corporativo AUBASA (100% Gratuito y Sin Límites de Cuota)
            </h3>
            <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', color: '#334155' }}>
              Para evitar consumir cuota de transferencia (Egress), el sistema utiliza almacenamiento propio y enlaces de OneDrive Corporativo. Si además pegás aquí un Webhook de Power Automate (<em>&ldquo;Cuando se recibe una solicitud HTTP &rarr; OneDrive for Business: Crear archivo &rarr; Crear vínculo para compartir &rarr; Respuesta&rdquo;</em>), cada archivo subido desde la app se guardará automáticamente en tu OneDrive de AUBASA.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Carpeta Compartida de OneDrive AUBASA (Acceso Rápido)</label>
                <input
                  type="url"
                  name="onedrive_folder_url"
                  className="form-input"
                  defaultValue={map['onedrive_folder_url'] || 'https://aubasa-my.sharepoint.com/'}
                  placeholder="https://aubasa-my.sharepoint.com/..."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Webhook Power Automate de Subida a OneDrive (Opcional)</label>
                <input
                  type="password"
                  name="onedrive_upload_webhook_url"
                  className="form-input"
                  placeholder={
                    map['onedrive_upload_webhook_url']
                      ? '•••••••••••••••••••••••••••• (Conectado con OneDrive)'
                      : 'https://prod-xx.brazilsouth.logic.azure.com:443/workflows/...'
                  }
                />
              </div>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Guardar Configuración de Envío</button>
          </div>
        </form>
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
            defaultValue={map['email_template_transferencia'] || ""} 
            style={{ width: '100%', fontFamily: 'monospace', marginBottom: '1rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Guardar Plantilla</button>
          </div>
        </form>
      </div>
    </div>
  );
}
