import { decryptRecordId } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import RemoteSignatureClient from "./RemoteSignatureClient";
import { notFound } from "next/navigation";

export default async function FirmaPage({ params }: { params: { token: string } }) {
  const recordId = decryptRecordId(params.token);
  
  if (!recordId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: 'var(--danger-color, #dc2626)' }}>Enlace inválido o expirado.</h2>
        <p>Por favor, solicitá un nuevo enlace a tu supervisor.</p>
      </div>
    );
  }

  const record = await prisma.employeeTrainingRecord.findUnique({
    where: { id: recordId },
    include: {
      employee: true
    }
  });

  if (!record) {
    notFound();
  }

  if (record.status === 'COMPLETED') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: 'var(--success-color, #10b981)' }}>¡Capacitación ya completada!</h2>
        <p>Esta capacitación ya fue firmada y registrada en el sistema.</p>
      </div>
    );
  }

  return (
    <RemoteSignatureClient 
      recordId={record.id}
      trainingName={record.trainingName}
      employeeName={record.employee.name}
      legajo={record.employee.legajo}
    />
  );
}
