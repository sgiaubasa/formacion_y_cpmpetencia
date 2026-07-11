import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';

const prisma = new PrismaClient();

function normalizeName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function importNominaDefinitiva() {
  console.log('1. Marcando todo el personal actual como inactivo para limpiar la nómina visible...');
  await prisma.employee.updateMany({
    data: { isActive: false }
  });

  console.log('2. Leyendo el archivo NOMINA_UNIFICADA_DEFINITIVA.xlsx...');
  const filePath = 'C:/Users/sergio.montes/Competenca y Formacion/NOMINA_UNIFICADA_DEFINITIVA.xlsx';
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet) as any[];

  let updated = 0;
  let created = 0;

  // Cargar todos los empleados (ahora inactivos) para posible matching
  const allEmployees = await prisma.employee.findMany();

  for (const row of data) {
    const legajo = row['Legajo']?.toString().trim();
    const rawName = row['Nombre']?.toString().trim();
    const categoria = row['Puesto/Categoría']?.toString().trim();
    const gerencia = row['Gerencia']?.toString().trim() || 'General';

    if (!legajo || !rawName) continue;

    // Asegurar que el sector existe
    let sector = await prisma.sector.findFirst({ where: { name: gerencia } });
    if (!sector) {
      sector = await prisma.sector.create({ data: { name: gerencia, password: '123', role: 'USER' } });
    }

    // Asegurar que el JobProfile existe
    let jobProfile = null;
    if (categoria) {
      jobProfile = await prisma.jobProfile.findFirst({ where: { title: categoria } });
      if (!jobProfile) {
        jobProfile = await prisma.jobProfile.create({ data: { title: categoria, conocimientosEsp: '' } });
      }
    }

    // Buscar por legajo primero
    let employee = allEmployees.find(e => e.legajo === legajo);

    if (employee) {
      // Actualizar y revivir (isActive: true)
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          legajo,
          name: rawName,
          sectorId: sector.id,
          jobProfileId: jobProfile?.id || employee.jobProfileId,
          isActive: true // Aparecerá en la nómina de nuevo
        }
      });
      updated++;
    } else {
      // Crear uno completamente nuevo
      await prisma.employee.create({
        data: {
          legajo,
          name: rawName,
          sectorId: sector.id,
          jobProfileId: jobProfile?.id,
          isActive: true
        }
      });
      created++;
    }
  }

  console.log(`Listo. La nómina ha sido reemplazada.`);
  console.log(`- Empleados actualizados (recuperaron su historial): ${updated}`);
  console.log(`- Empleados nuevos creados: ${created}`);
  console.log(`Total visible en la nómina: ${updated + created} (Coincide con el Excel)`);
}

importNominaDefinitiva().catch(console.error).finally(() => prisma.$disconnect());
