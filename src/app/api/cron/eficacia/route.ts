import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Vercel Cron Security: Ensure this is called by Vercel
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const now = new Date();
    // Fechas límite = completado + 2 meses.
    // 1 mes antes de la fecha límite = completado + 1 mes.
    // 15 días antes de la fecha límite = completado + 1.5 meses.

    // Obtenemos capacitaciones PENDIENTES de evaluar eficacia
    const pendingRecords = await prisma.employeeTrainingRecord.findMany({
      where: {
        effectiveness: 'PENDING',
        status: 'COMPLETED',
        completedAt: { not: null }
      },
      include: {
        employee: {
          include: { sector: true }
        }
      }
    });

    const notificationsSent = [];

    for (const record of pendingRecords) {
      if (!record.completedAt) continue;

      const completed = new Date(record.completedAt);
      const deadline = new Date(completed);
      deadline.setMonth(deadline.getMonth() + 2); // Eficacia vence a los 2 meses
      
      const diffTime = deadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let alertType = null;
      if (diffDays === 30) {
        alertType = 'Falta 1 mes';
      } else if (diffDays === 15) {
        alertType = 'Faltan 15 días';
      } else if (diffDays === 0) {
        alertType = 'VENCE HOY';
      }

      if (alertType) {
        // Enviar a los RRHH y al Gerente/Jefe de Sector
        // Buscamos usuarios con rol RRHH o SECTOR_X
        const targetSectorRole = `SECTOR_${record.employee.sectorId}`;
        
        const targetUsers = await prisma.appUser.findMany({
          where: {
            OR: [
              { role: 'RRHH' },
              { role: targetSectorRole }
            ]
          }
        });

        const sectorEmails = targetUsers.filter(u => u.role === targetSectorRole).map(u => u.email).filter(e => e);
        const rrhhEmails = targetUsers.filter(u => u.role === 'RRHH').map(u => u.email).filter(e => e);

        if (sectorEmails.length > 0 || rrhhEmails.length > 0) {
          await sendMail({
            to: sectorEmails.length > 0 ? sectorEmails : rrhhEmails,
            cc: rrhhEmails.length > 0 ? rrhhEmails : undefined,
            subject: `⚠️ Alerta de Eficacia: ${alertType} (${record.employee.name})`,
            html: `
              <h2>Evaluación de Eficacia Pendiente</h2>
              <p>El sistema automático de SGCySV informa que una capacitación requiere evaluación de eficacia.</p>
              <p><strong>Plazo:</strong> ${alertType}</p>
              <p><strong>Empleado:</strong> ${record.employee.name} (${record.employee.sector.name})</p>
              <p><strong>Capacitación:</strong> ${record.trainingName}</p>
              <p><strong>Fecha de Realización:</strong> ${completed.toLocaleDateString('es-AR')}</p>
              <p><strong>Vencimiento:</strong> ${deadline.toLocaleDateString('es-AR')}</p>
              <br/>
              <p>Por favor, ingrese al sistema para evaluar si el objetivo propuesto se cumplió.</p>
            `
          });
          notificationsSent.push({ recordId: record.id, alertType, emails });
        }
      }
    }

    return NextResponse.json({ success: true, processed: pendingRecords.length, notificationsSent });
  } catch (error: any) {
    console.error('Error in cron/eficacia:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
