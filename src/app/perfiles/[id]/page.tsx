import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PrintButton from "./PrintButton";
import { notFound } from "next/navigation";
import { getCurrentRole, isSectorRole, getUserEmail } from "@/lib/auth";
import { ProfileSignatureWrapper } from "./ProfileSignatureWrapper";

export default async function PerfilViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getCurrentRole();
  const email = await getUserEmail();
  const isSector = await isSectorRole(role);
  
  let isManager = false;
  if (email) {
    const user = await prisma.appUser.findUnique({ where: { email } });
    isManager = user?.isManager || false;
  }
  const perfil = await prisma.jobProfile.findUnique({
    where: { id: parseInt(id) },
    include: {
      previousVersion: true,
      nextVersions: true
    }
  });

  if (!perfil) return notFound();

  // Helper para tildar opciones
  const hasEducacion = (val: string) => perfil.educacion?.includes(val) ? 'X' : '';
  const hasAspecto = (val: string) => perfil.aspectos?.includes(val) ? 'X' : '';

  const canEdit = !isSector || (isSector && perfil.status === 'PENDIENTE_SECTOR');

  return (
    <div>
      <div className="page-header no-print">
        <h1 className="page-title">Vista de Perfil y Formulario</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/perfiles" className="btn btn-secondary">Volver al listado</Link>
          {canEdit && (
            <Link href={`/perfiles/${perfil.id}/editar`} className="btn btn-secondary">Editar Perfil</Link>
          )}
          <PrintButton />
        </div>
      </div>

      <div className="card print-area" style={{ padding: '2rem', backgroundColor: 'white', color: 'black' }}>
        
        {!perfil.isActive && (
          <div className="no-print" style={{ backgroundColor: '#fef2f2', border: '1px solid #ef4444', color: '#b91c1c', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', fontWeight: 'bold' }}>
            ATENCIÓN: Estás viendo una versión antigua de este perfil (Revisión {perfil.revision}).
            {perfil.nextVersions && perfil.nextVersions.length > 0 && (
              <span style={{ marginLeft: '10px' }}>
                <Link href={`/perfiles/${perfil.nextVersions[0].id}`} style={{ color: '#1d4ed8', textDecoration: 'underline' }}>
                  Ir a la versión más reciente.
                </Link>
              </span>
            )}
          </div>
        )}

        {/* Encabezado AUBASA */}
        <table className="aubasa-form" style={{ marginBottom: '1rem' }}>
          <tbody>
            <tr>
              <td rowSpan={4} style={{ width: '30%', textAlign: 'center', verticalAlign: 'middle' }}>
                <h2 style={{ color: 'var(--secondary-color)', fontSize: '2.5rem', margin: 0, letterSpacing: '-1px' }}>AUBASA</h2>
                <span style={{ fontSize: '0.6rem', color: '#666', fontWeight: 'bold' }}>AUTOPISTAS DE BUENOS AIRES S.A.</span>
              </td>
              <td colSpan={2} style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}>
                PAU/03
              </td>
              <td style={{ backgroundColor: '#f4f4f4' }}>Código</td>
              <td style={{ backgroundColor: '#f4f4f4', fontWeight: 'bold' }}>PAU/03 - A2</td>
            </tr>
            <tr>
              <td colSpan={2} rowSpan={3} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                ANEXO 2<br/>
                Perfil y Descripción de Puesto
              </td>
              <td>Revisión</td>
              <td>{perfil.revision || '01'}</td>
            </tr>
            <tr>
              <td>Fecha</td>
              <td>{perfil.vigencia ? perfil.vigencia.split('-').reverse().join('/') : '-'}</td>
            </tr>
            <tr>
              <td>Página</td>
              <td>1 de 3</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '1rem' }}>
          Vigencia desde {perfil.vigencia ? perfil.vigencia.split('-').reverse().join('/') : '-'}
        </div>

        <table className="aubasa-form">
          <tbody>
            <tr>
              <td className="header-dark" style={{ width: '35%' }}>DENOMINACIÓN DEL PUESTO</td>
              <td style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>{perfil.title}</td>
            </tr>
            <tr>
              <td className="header-dark">GERENCIA DE PERTENENCIA</td>
              <td style={{ backgroundColor: '#e2e8f0' }}>{perfil.gerencia || '-'}</td>
            </tr>
            <tr>
              <td className="header-dark">REPORTA</td>
              <td style={{ backgroundColor: '#e2e8f0' }}>{perfil.reporta || '-'}</td>
            </tr>
            <tr>
              <td className="header-dark">SUPERVISA</td>
              <td style={{ backgroundColor: '#e2e8f0' }}>{perfil.supervisa || '-'}</td>
            </tr>
          </tbody>
        </table>

        <table className="aubasa-form">
          <tbody>
            <tr><td className="header-dark">OBJETIVO DEL PUESTO</td></tr>
            <tr><td style={{ padding: '1rem', whiteSpace: 'pre-wrap' }}>{perfil.objetivo || '-'}</td></tr>
          </tbody>
        </table>

        {perfil.responsabilidades && (
          <table className="aubasa-form">
            <tbody>
              <tr><td className="header-dark">FUNCIONES Y RESPONSABILIDADES</td></tr>
              <tr><td style={{ padding: '1rem', whiteSpace: 'pre-wrap' }}>{perfil.responsabilidades}</td></tr>
            </tbody>
          </table>
        )}

        <table className="aubasa-form">
          <tbody>
            <tr><td colSpan={4} className="header-dark">EDUCACIÓN</td></tr>
            <tr>
              <td>SECUNDARIO</td>
              <td style={{ width: '5%', textAlign: 'center' }}>{hasEducacion('Secundario')}</td>
              <td>UNIVERSITARIO</td>
              <td style={{ width: '5%', textAlign: 'center' }}>{hasEducacion('Universitario')}</td>
            </tr>
            <tr>
              <td>TERCIARIO</td>
              <td style={{ textAlign: 'center' }}>{hasEducacion('Terciario')}</td>
              <td>ESTUDIOS DE POST-GRADO</td>
              <td style={{ textAlign: 'center' }}>{hasEducacion('Estudios de Post-grado')}</td>
            </tr>
            <tr>
              <td colSpan={4}>ORIENTACIÓN TÉCNICA REQUERIDA EN EL PUESTO: {perfil.orientacionTecnica}</td>
            </tr>
          </tbody>
        </table>

        <table className="aubasa-form">
          <tbody>
            <tr><td colSpan={5} className="header-dark">IDIOMAS</td></tr>
            <tr>
              <td style={{ width: '30%' }}>REQUIERE:</td>
              <td style={{ width: '10%' }}>Si {perfil.idiomasRequiere ? 'X' : ''}</td>
              <td style={{ border: 'none' }}></td>
              <td style={{ width: '10%' }}>No {!perfil.idiomasRequiere ? 'X' : ''}</td>
              <td style={{ border: 'none' }}></td>
            </tr>
            <tr>
              <td>ACLARACIONES:</td>
              <td colSpan={4}>{perfil.idiomasAclaracion || '-'}</td>
            </tr>
          </tbody>
        </table>

        <table className="aubasa-form">
          <tbody>
            <tr><td colSpan={2} className="header-dark">TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIÓN</td></tr>
            <tr>
              <td style={{ width: '50%' }}>OTROS CONOCIMIENTOS:</td>
              <td>{perfil.otrosConocimientos || ''}</td>
            </tr>
            <tr>
              <td>CONOCIMIENTOS BÁSICOS DE HERRAMIENTAS DE GESTIÓN:</td>
              <td style={{ width: '10%', textAlign: 'center' }}>{perfil.tecnologias?.includes('Basicas') ? 'X' : ''}</td>
            </tr>
            <tr>
              <td>HERRAMIENTAS INFORMÁTICAS ESPECIALES (MS WORD, MS EXCEL, MS POWERPOINT):</td>
              <td style={{ textAlign: 'center' }}>{perfil.tecnologias?.includes('Especiales') ? 'X' : ''}</td>
            </tr>
          </tbody>
        </table>

        <table className="aubasa-form">
          <tbody>
            <tr><td className="header-dark">CONOCIMIENTOS NECESARIOS</td></tr>
            <tr>
              <td style={{ padding: '1rem' }}>
                <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                  {perfil.conocimientosEsp ? perfil.conocimientosEsp.split('\n').map((item, i) => {
                    const text = item.replace(/[\t\r]/g, '').trim();
                    return text ? <li key={i} style={{ marginBottom: '0.25rem' }}>{text}</li> : null;
                  }) : <li>-</li>}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
        
        {/* Salto de página opcional si queda muy largo */}
        <div style={{ pageBreakBefore: 'always' }}></div>

        <table className="aubasa-form">
          <tbody>
            <tr>
              <td className="header-dark" style={{ width: '70%' }}>DISPONIBILIDAD TRABAJO EN TURNOS</td>
              <td style={{ width: '15%', textAlign: 'center' }}>Si {perfil.turnos ? 'X' : ''}</td>
              <td style={{ width: '15%', textAlign: 'center' }}>No {!perfil.turnos ? 'X' : ''}</td>
            </tr>
          </tbody>
        </table>

        <table className="aubasa-form">
          <tbody>
            <tr><td colSpan={4} className="header-dark">EXPERIENCIA</td></tr>
            <tr>
              <td style={{ width: '25%' }}>REQUIERE</td>
              <td style={{ width: '10%', textAlign: 'center' }}>Sí {perfil.experienciaReq ? 'x' : ''}</td>
              <td style={{ width: '10%', textAlign: 'center' }}>No {!perfil.experienciaReq ? 'x' : ''}</td>
              <td>AÑOS DE EXPERIENCIA: {perfil.experienciaAnios || '-'}</td>
            </tr>
          </tbody>
        </table>

        <table className="aubasa-form">
          <tbody>
            <tr><td colSpan={2} className="header-dark">ADMINISTRACIÓN DE PERSONAL</td></tr>
            <tr>
              <td style={{ width: '50%' }}>NO REQUIERE {perfil.adminPersonal === 'NO REQUIERE' ? 'X' : ''}</td>
              <td>HASTA 5 PERSONAS {perfil.adminPersonal === 'HASTA 5 PERSONAS' ? 'X' : ''}</td>
            </tr>
            <tr>
              <td>HASTA 20 PERSONAS {perfil.adminPersonal === 'HASTA 20 PERSONAS' ? 'X' : ''}</td>
              <td>HASTA 50 PERSONAS {perfil.adminPersonal === 'HASTA 50 PERSONAS' ? 'X' : ''}</td>
            </tr>
            <tr>
              <td>HASTA 100 PERSONAS {perfil.adminPersonal === 'HASTA 100 PERSONAS' ? 'X' : ''}</td>
              <td>MÁS DE 100 PERSONAS {perfil.adminPersonal === 'MÁS DE 100 PERSONAS' ? 'X' : ''}</td>
            </tr>
          </tbody>
        </table>

        <table className="aubasa-form">
          <tbody>
            <tr><td colSpan={2} className="header-dark">ASPECTOS PERSONALES Y ACTITUDINALES</td></tr>
            <tr style={{ backgroundColor: '#f8fafc' }}><td colSpan={2}>SELECCIONAR UNO O MÁS ELEMENTOS</td></tr>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', padding: '1rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.8 }}>
                  <li>{hasAspecto('RELACIONES INTERPERSONALES')} RELACIONES INTERPERSONALES</li>
                  <li>{hasAspecto('CONTROL')} CONTROL</li>
                  <li>{hasAspecto('FLEXIBILIDAD')} FLEXIBILIDAD</li>
                  <li>{hasAspecto('PROACTIVIDAD')} PROACTIVIDAD</li>
                </ul>
              </td>
              <td style={{ verticalAlign: 'top', padding: '1rem' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.8 }}>
                  <li>{hasAspecto('ORGANIZACIÓN')} ORGANIZACIÓN</li>
                  <li>{hasAspecto('CAPACIDAD DE TRABAJO EN EQUIPO')} CAPACIDAD DE TRABAJO EN EQUIPO</li>
                  <li>{hasAspecto('CAPACIDAD DE ANÁLISIS')} CAPACIDAD DE ANÁLISIS</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Firmas Integradas (Pantalla e Impresión) */}
        <table className="aubasa-form" style={{ marginTop: '2rem' }}>
          <tbody>
            <tr className="header-light" style={{ textAlign: 'center' }}>
              <td style={{ width: '33%' }}>REDACCIÓN - REVISIÓN</td>
              <td style={{ width: '33%' }}>APROBACIÓN</td>
              <td style={{ width: '33%' }}>LIBERACIÓN</td>
            </tr>
            <tr style={{ minHeight: '120px', verticalAlign: 'bottom', textAlign: 'center' }}>
              <td style={{ padding: '1rem 0' }}>
                <ProfileSignatureWrapper 
                  profileId={perfil.id}
                  roleName="RRHH"
                  roleTitle="Gerente RRHH"
                  existingSignature={perfil.firmaRRHH}
                  existingDate={perfil.fechaFirmaRRHH}
                  existingEmail={perfil.emailFirmaRRHH}
                  canSign={role === 'RRHH' || role === 'ADMIN'}
                />
              </td>
              <td style={{ padding: '1rem 0' }}>
                <ProfileSignatureWrapper 
                  profileId={perfil.id}
                  roleName="GerenteArea"
                  roleTitle="Gerente de Área"
                  existingSignature={perfil.firmaGerenteArea}
                  existingDate={perfil.fechaFirmaGerenteArea}
                  existingEmail={perfil.emailFirmaGerenteArea}
                  canSign={role === 'ADMIN' || (role.startsWith('SECTOR_') && isManager)}
                />
              </td>
              <td style={{ padding: '1rem 0' }}>
                <ProfileSignatureWrapper 
                  profileId={perfil.id}
                  roleName="GerenteGeneral"
                  roleTitle="Gerente General"
                  existingSignature={perfil.firmaGerenteGeneral}
                  existingDate={perfil.fechaFirmaGerenteGeneral}
                  existingEmail={perfil.emailFirmaGerenteGeneral}
                  canSign={role === 'ADMIN' || role === 'RRHH'} 
                />
              </td>
            </tr>
          </tbody>
        </table>

        {perfil.controlCambios && (
          <table className="aubasa-form" style={{ marginTop: '2rem', pageBreakInside: 'avoid' }}>
            <tbody>
              <tr><td className="header-dark" style={{ backgroundColor: '#64748b' }}>CONTROL DE CAMBIOS EN ESTA REVISIÓN RESPECTO DE LA ANTERIOR</td></tr>
              <tr>
                <td style={{ padding: '1rem', whiteSpace: 'pre-line', fontStyle: 'italic', color: '#333' }}>
                  {perfil.controlCambios}
                </td>
              </tr>
            </tbody>
          </table>
        )}

      </div>

      <div className="card no-print" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Historial de Versiones</h2>
        {perfil.previousVersionId ? (
          <p>
            Esta revisión fue basada en la Revisión {perfil.previousVersion?.revision || '-'}. <br/>
            <Link href={`/perfiles/${perfil.previousVersionId}`} className="btn btn-secondary" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
              Ver versión anterior
            </Link>
          </p>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Esta es la versión original (primera revisión).</p>
        )}
      </div>

    </div>
  );
}
