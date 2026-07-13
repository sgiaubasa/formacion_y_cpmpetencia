import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function EvaluacionEficaciaPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  
  const emp = await prisma.employee.findUnique({
    where: { id: parseInt(employeeId) },
    include: {
      sector: true,
      trainingRecords: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' }
      }
    }
  });

  if (!emp) return notFound();

  async function evaluarEficacia(formData: FormData) {
    "use server"
    const recordId = parseInt(formData.get("recordId") as string);
    const score = formData.get("score") as string;
    const justification = formData.get("justification") as string;
    
    await prisma.employeeTrainingRecord.update({
      where: { id: recordId },
      data: {
        effectiveness: score,
        effectivenessJustification: justification,
        evaluatedAt: new Date()
      }
    });

    revalidatePath(`/brechas/${emp!.id}/evaluar`);
  }

  async function sendReminderEmail(formData: FormData) {
    "use server"
    // Simulador de envío de correo
    console.log(`Simulando envío de correo a Responsable de ${emp?.sector.name} para evaluar eficacia.`);
    // Aquí iría la integración con Nodemailer o Resend
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Evaluación de Eficacia (2 Meses)</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Empleado: {emp.name} | Sector: {emp.sector.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href={`/brechas/${emp.id}`} className="btn btn-secondary">Volver al GAP</Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Notificar al Responsable</h3>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Envía un recordatorio automático por correo electrónico al Jefe o Responsable del SGI para que ingrese y evalúe la eficacia de las capacitaciones recientes de este empleado antes de que se cumplan los 2 meses.
        </p>
        <form action={sendReminderEmail}>
          <button type="submit" className="btn btn-primary">
            📧 Enviar Correo de Recordatorio a Responsable
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Capacitación Realizada</th>
              <th>Fecha de Realización</th>
              <th>Vencimiento Plazo (2 meses)</th>
              <th>Estado de Eficacia</th>
              <th>Evaluación del Supervisor</th>
            </tr>
          </thead>
          <tbody>
            {emp.trainingRecords.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>No hay capacitaciones completadas para evaluar.</td></tr>
            ) : (
              emp.trainingRecords.map(record => {
                const completedDate = record.completedAt ? new Date(record.completedAt) : new Date();
                const deadlineDate = new Date(completedDate);
                deadlineDate.setMonth(deadlineDate.getMonth() + 2);
                
                // Si la fecha límite ya pasó y sigue pendiente, está vencido
                const isOverdue = record.effectiveness === 'PENDING' && new Date() > deadlineDate;

                return (
                  <tr key={record.id}>
                    <td style={{ fontWeight: 500 }}>
                      {record.trainingName}
                      {record.objective && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', padding: '0.25rem', background: '#f8fafc', borderRadius: '4px' }}>
                          <strong>Objetivo:</strong> {record.objective}
                        </div>
                      )}
                    </td>
                    <td>{completedDate.toLocaleDateString('es-AR')}</td>
                    <td style={{ color: isOverdue ? 'red' : 'inherit', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                      {deadlineDate.toLocaleDateString('es-AR')} {isOverdue && ' (¡Vencido!)'}
                    </td>
                    <td>
                      {record.effectiveness === 'PENDING' && <span className="badge badge-warning">Pendiente</span>}
                      {record.effectiveness === 'EFFECTIVE' && <span className="badge badge-success">Eficaz</span>}
                      {record.effectiveness === 'INEFFECTIVE' && <span className="badge badge-secondary" style={{ backgroundColor: '#ef4444' }}>No Eficaz</span>}
                      {record.effectivenessJustification && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          {record.effectivenessJustification}
                        </div>
                      )}
                    </td>
                    <td>
                      {record.effectiveness === 'PENDING' && (
                        <form action={evaluarEficacia} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input type="hidden" name="recordId" value={record.id} />
                          <textarea 
                            name="justification" 
                            required 
                            placeholder="Justificación (Acorde al objetivo de la capacitación)"
                            className="form-input" 
                            style={{ minHeight: '60px', fontSize: '0.85rem' }} 
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="submit" name="score" value="EFFECTIVE" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', borderColor: '#10b981', color: '#10b981', flex: 1 }}>
                              ✓ Eficaz
                            </button>
                            <button type="submit" name="score" value="INEFFECTIVE" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', borderColor: '#ef4444', color: '#ef4444', flex: 1 }}>
                              ✕ No Eficaz
                            </button>
                          </div>
                        </form>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
