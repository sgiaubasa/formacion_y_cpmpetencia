const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

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

  const headers = [
    "ID Registro",
    "Legajo",
    "Nombre Empleado",
    "Sector",
    "Capacitación",
    "Estado",
    "Fecha Realizada",
    "Nota",
    "Firma Digital"
  ];

  let csvContent = headers.join(';') + '\n';

  for (let r of records) {
    const estado = r.status === 'COMPLETED' ? 'Realizada' : (r.status === 'IN_PLAN' ? 'En Plan' : 'Brecha');
    const fecha = r.completedAt ? r.completedAt.toISOString().split('T')[0] : '';
    const firma = r.employeeSignature ? 'SI' : (r.evidencePath ? 'SI (Archivo)' : 'NO');
    
    // Scape commas and quotes
    const row = [
      r.id,
      r.employee.legajo,
      `"${r.employee.name}"`,
      `"${r.employee.sector?.name || ''}"`,
      `"${r.trainingName}"`,
      estado,
      fecha,
      r.score || '',
      firma
    ];
    
    csvContent += row.join(';') + '\n';
  }

  // BOM for Excel to recognize UTF-8
  fs.writeFileSync("public/Exportacion_Capacitaciones.csv", '\uFEFF' + csvContent, 'utf8');
  console.log("Generado: public/Exportacion_Capacitaciones.csv");
  
  await prisma.$disconnect();
}

run();
