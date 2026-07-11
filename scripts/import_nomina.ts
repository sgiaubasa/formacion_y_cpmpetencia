import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';

const prisma = new PrismaClient();

function normalizeName(name: string) {
  // Convierte "JARA, ROXANA MARIEL" a "Roxana Mariel Jara" o simplifica todo a minúsculas sin acentos
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function importNomina() {
  const filePath = 'C:/Users/sergio.montes/Competenca y Formacion/NOMINA_UNIFICADA_DEFINITIVA.xlsx';
  const wb = xlsx.readFile(filePath);
  const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];

  let updated = 0;
  let created = 0;

  // Cache existing employees for fuzzy matching
  const allEmployees = await prisma.employee.findMany();

  for (const row of data) {
    let legajo = row['Legajo']?.toString().trim();
    const rawName = row['Nombre']?.toString().trim();
    const categoria = row['Categoría']?.toString().trim();
    const gerencia = row['GERENCIA']?.toString().trim() || 'General';

    if (!rawName) continue;
    
    // Si no tiene legajo, generamos uno temporal para evitar que el script lo ignore o rompa la base
    if (!legajo) {
      legajo = `S/L-${Math.floor(Math.random() * 100000)}`;
    }

    // 1. Ensure Sector exists
    let sector = await prisma.sector.findFirst({ where: { name: gerencia } });
    if (!sector) {
      sector = await prisma.sector.create({ data: { name: gerencia, password: '123', role: 'USER' } });
    }

    // 2. Ensure JobProfile exists based on Categoría
    let jobProfile = null;
    if (categoria) {
      jobProfile = await prisma.jobProfile.findFirst({ where: { title: categoria } });
      if (!jobProfile) {
        jobProfile = await prisma.jobProfile.create({ data: { title: categoria, conocimientosEsp: '' } });
      }
    }

    // 3. Find Employee by Legajo or Name
    let employee = await prisma.employee.findFirst({
      where: { legajo }
    });

    if (!employee) {
      // Intento de búsqueda aproximada por nombre
      const normName = normalizeName(rawName);
      employee = allEmployees.find(e => {
        const normE = normalizeName(e.name);
        return normE === normName || normName.includes(normE) || normE.includes(normName);
      }) || null;
    }

    if (employee) {
      // Update
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          legajo,
          name: rawName, // actualizamos al nombre formal
          sectorId: sector.id,
          jobProfileId: jobProfile?.id || employee.jobProfileId,
          isActive: true // Reactivar si estaba dado de baja
        }
      });
      updated++;
    } else {
      // Create
      await prisma.employee.create({
        data: {
          legajo,
          name: rawName,
          sectorId: sector.id,
          jobProfileId: jobProfile?.id
        }
      });
      created++;
    }
  }

  console.log(`Nómina procesada. Actualizados: ${updated}, Creados: ${created}`);
}

importNomina().catch(console.error).finally(() => prisma.$disconnect());
