import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  const filePath = 'C:/Users/sergio.montes/Competenca y Formacion/Login (1).xlsx';
  const wb = xlsx.readFile(filePath);
  
  // Find sheet ignoring case and whitespace
  const sheetName = wb.SheetNames.find(n => n.toLowerCase().trim() === 'consolidado') || wb.SheetNames[0];
  console.log('Using sheet:', sheetName);
  
  const sheet = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet) as any[];
  
  console.log(`Found ${data.length} rows.`);

  let createdRecords = 0;
  let createdEmployees = 0;

  for (const row of data) {
    const getVal = (keyStr: string) => {
      const key = Object.keys(row).find(k => k.toLowerCase().includes(keyStr.toLowerCase()));
      return key ? row[key]?.toString().trim() : null;
    };

    const legajo = getVal('legajo') || '';
    const nombre = getVal('nombre') || getVal('apellido');
    let sectorName = getVal('sector');
    const capacitacion = getVal('tema');
    const fecha = getVal('realizacion') || getVal('efectiva') || getVal('fecha');

    if (!nombre || !capacitacion) {
      continue;
    }

    if (!sectorName) sectorName = 'Sede Central'; // default fallback

    let sector = await prisma.sector.findUnique({ where: { name: sectorName } });
    if (!sector) {
      sector = await prisma.sector.create({
        data: { name: sectorName, password: '123', role: 'USER' }
      });
    }

    let employee = await prisma.employee.findFirst({
      where: {
        OR: legajo ? [{ legajo }, { name: nombre }] : [{ name: nombre }]
      }
    });

    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          legajo: legajo || `SIN-LEGAJO-${Math.random().toString(36).substring(7)}`,
          name: nombre,
          sectorId: sector.id
        }
      });
      createdEmployees++;
    }

    const existing = await prisma.employeeTrainingRecord.findFirst({
      where: { employeeId: employee.id, trainingName: capacitacion }
    });

    if (!existing) {
      let parsedDate = null;
      if (fecha) {
        if (!isNaN(Number(fecha))) {
          // Excel serial date
          parsedDate = new Date(Math.round((Number(fecha) - 25569) * 86400 * 1000));
        } else if (fecha.includes('/')) {
          const parts = fecha.split('/');
          if (parts.length === 3) {
            parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
        }
      }

      await prisma.employeeTrainingRecord.create({
        data: {
          employeeId: employee.id,
          trainingName: capacitacion,
          status: 'COMPLETED',
          effectiveness: 'EFFECTIVE', // Es histórico, asumimos eficaz
          completedAt: parsedDate || new Date(),
          evaluatedAt: parsedDate || new Date()
        }
      });
      createdRecords++;
    }
  }

  console.log(`Import finished.`);
  console.log(`- Created ${createdEmployees} new employees (if they didn't exist).`);
  console.log(`- Created ${createdRecords} historical training records.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
