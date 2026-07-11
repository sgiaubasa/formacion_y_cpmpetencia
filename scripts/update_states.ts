import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';

const prisma = new PrismaClient();

async function updateStates() {
  console.log('Reading Excel file...');
  const filePath = 'C:/Users/sergio.montes/Competenca y Formacion/Login (1).xlsx';
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames.find(n => n.toLowerCase().trim() === 'consolidado') || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet) as any[];

  console.log(`Scanning ${data.length} rows to fix states...`);
  let updated = 0;

  for (const row of data) {
    const getVal = (keyStr: string) => {
      const key = Object.keys(row).find(k => k.toLowerCase().includes(keyStr.toLowerCase()));
      return key ? row[key]?.toString().trim() : null;
    };

    const nombre = getVal('nombre') || getVal('apellido');
    const capacitacion = getVal('tema');
    const estado = getVal('estado');
    const fechaProgStr = getVal('programacion');

    if (!nombre || !capacitacion || !estado) continue;

    // Solo nos interesan los que no están finalizados
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes('realizada')) continue;

    const record = await prisma.employeeTrainingRecord.findFirst({
      where: {
        trainingName: capacitacion,
        employee: { name: nombre }
      }
    });

    if (record) {
      let newStatus = 'IN_PLAN';
      let effectiveness = null;
      let scheduledDate = record.scheduledDate;

      if (fechaProgStr) {
        if (!isNaN(Number(fechaProgStr))) {
          scheduledDate = new Date(Math.round((Number(fechaProgStr) - 25569) * 86400 * 1000));
        } else if (fechaProgStr.includes('/')) {
          const parts = fechaProgStr.split('/');
          if (parts.length === 3) {
            scheduledDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
        }
      }

      if (record.status !== newStatus || (scheduledDate && record.scheduledDate?.getTime() !== scheduledDate.getTime())) {
        await prisma.employeeTrainingRecord.update({
          where: { id: record.id },
          data: {
            status: newStatus,
            effectiveness: effectiveness as any,
            scheduledDate,
            completedAt: null, // No se realizó aún
            evaluatedAt: null
          }
        });
        updated++;
      }
    }
  }

  console.log(`Fix complete. Updated ${updated} records from COMPLETED to IN_PLAN based on actual Excel states.`);
}

updateStates().catch(console.error).finally(() => prisma.$disconnect());
