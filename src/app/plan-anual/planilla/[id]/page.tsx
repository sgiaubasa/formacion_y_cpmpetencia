import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PlanillaAsistenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const recordId = parseInt(resolvedParams.id);
  
  if (isNaN(recordId)) {
    return notFound();
  }

  const record = await prisma.employeeTrainingRecord.findUnique({
    where: { id: recordId },
    include: { employee: { include: { sector: true } } }
  });

  if (!record) {
    return notFound();
  }

  // Obtenemos la fecha a mostrar (la programada o la actual)
  const displayDate = record.scheduledDate 
    ? new Date(record.scheduledDate).toLocaleDateString('es-AR') 
    : '';

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Botón de impresión oculto al imprimir */}
      <div className="print-hidden" style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button 
          id="print-button"
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: 'var(--teal-color)', color: 'white', border: 'none', borderRadius: '5px' }}
          // Uso de dangerouslySetInnerHTML para el onclick de javascript porque es un server component, 
          // la mejor forma es un Client Component pequeñito o simplemente inyectar un script.
        >
          🖨️ Imprimir Planilla
        </button>
        <script dangerouslySetInnerHTML={{ __html: `
          document.getElementById('print-button').addEventListener('click', function() { window.print(); });
        `}} />
      </div>

      {/* Contenedor A4 */}
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', color: 'black' }}>
        
        {/* Tabla Header */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td rowSpan={3} style={{ width: '25%', border: '1px solid black', textAlign: 'center', padding: '10px' }}>
                <img src="/logo.png" alt="AUBASA" style={{ maxWidth: '150px' }} />
              </td>
              <td style={{ width: '50%', border: '1px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                PAU/05
              </td>
              <td style={{ width: '25%', border: '1px solid black', fontSize: '12px', padding: '5px' }}>
                Código PAU/05 - A9.3
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                Anexo 9.3
              </td>
              <td style={{ border: '1px solid black', fontSize: '12px', padding: '5px' }}>
                Revisión 04
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                Registro de asistencia
              </td>
              <td style={{ border: '1px solid black', fontSize: '12px', padding: '5px' }}>
                Fecha 29.Ago.2025<br/>
                Página 1 de 1
              </td>
            </tr>
          </tbody>
        </table>

        {/* Datos de la Capacitación */}
        <div style={{ marginBottom: '20px', fontSize: '14px', fontWeight: 'bold' }}>
          <div style={{ borderBottom: '1px solid black', paddingBottom: '5px', marginBottom: '10px' }}>
            Tema: <span style={{ fontWeight: 'normal', marginLeft: '10px' }}>{record.trainingName}</span>
          </div>
          <div style={{ borderBottom: '1px solid black', paddingBottom: '5px' }}>
            Fecha: <span style={{ fontWeight: 'normal', marginLeft: '10px' }}>{displayDate}</span>
          </div>
        </div>

        {/* Tabla de Asistencia */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>
          Participantes del curso de capacitación
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', marginBottom: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#4b5563', color: 'white' }}>
              <th style={{ border: '1px solid black', padding: '8px', width: '5%' }}></th>
              <th style={{ border: '1px solid black', padding: '8px', width: '40%' }}>Apellido y Nombre</th>
              <th style={{ border: '1px solid black', padding: '8px', width: '30%' }}>Sector</th>
              <th style={{ border: '1px solid black', padding: '8px', width: '25%' }}>Firma</th>
            </tr>
          </thead>
          <tbody>
            {/* Fila del empleado asignado */}
            <tr>
              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>1</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{record.employee.name}</td>
              <td style={{ border: '1px solid black', padding: '8px' }}>{record.employee.sector.name}</td>
              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>
                {record.employeeSignature && <img src={record.employeeSignature} alt="Firma" style={{ maxHeight: '40px' }} />}
              </td>
            </tr>
            {/* Filas vacías adicionales */}
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
              <tr key={num}>
                <td style={{ border: '1px solid black', padding: '12px', textAlign: 'center' }}>{num}</td>
                <td style={{ border: '1px solid black', padding: '12px' }}></td>
                <td style={{ border: '1px solid black', padding: '12px' }}></td>
                <td style={{ border: '1px solid black', padding: '12px' }}></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginBottom: '50px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Instructor (Firma y Aclaración): 
          {record.instructorSignature ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: '10px' }}>
              <img src={record.instructorSignature} alt="Firma Instructor" style={{ maxHeight: '60px', borderBottom: '1px solid black', padding: '0 50px' }} />
              {record.instructorName && <span style={{ fontSize: '12px', marginTop: '5px' }}>{record.instructorName}</span>}
            </div>
          ) : (
            <span>____________________________________________________</span>
          )}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .print-hidden { display: none !important; }
          body { background-color: white; }
          @page { margin: 1cm; size: A4 portrait; }
        }
      `}} />
    </div>
  );
}
