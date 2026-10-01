const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

async function run() {
  const records = await prisma.employeeTrainingRecord.findMany({
    include: {
      employee: {
        include: {
          sector: true
        }
      }
    }
  });

  const data = records.map(r => ({
    "ID Registro": r.id,
    "Legajo": r.employee.legajo,
    "Nombre Empleado": r.employee.name,
    "Sector": r.employee.sector?.name || '',
    "Capacitación": r.trainingName,
    "Estado": r.status === 'COMPLETED' ? 'Realizada' : (r.status === 'IN_PLAN' ? 'En Plan' : 'Brecha'),
    "Fecha Realizada": r.completedAt ? r.completedAt.toISOString().split('T')[0] : '',
    "Nota": r.score || '',
    "Firma Digital": r.employeeSignature ? 'SÍ' : (r.evidencePath ? 'SÍ (Archivo)' : 'NO')
  }));

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Capacitaciones");

  // Format as table theoretically? xlsx doesn't support writing Tables natively in community edition,
  // but it's okay, the user can do it.

  xlsx.writeFile(workbook, "public/Exportacion_Capacitaciones.xlsx");
  console.log("Generado: public/Exportacion_Capacitaciones.xlsx");
  
  await prisma.$disconnect();
}

run();
