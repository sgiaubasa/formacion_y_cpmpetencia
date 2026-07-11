import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';

const prisma = new PrismaClient();

function normalizeName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function reconcileLegajos() {
  const filePath = 'C:/Users/sergio.montes/Competenca y Formacion/Login (1).xlsx';
  const wb = xlsx.readFile(filePath);

  // 1. Build a map of normalized Name -> valid Legajo from the Login file
  const nameToLegajoMap = new Map<string, string>();
  
  for (const sheetName of wb.SheetNames) {
    const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]) as any[];
    for (const row of data) {
      const rawLegajo = row['Legajo']?.toString().trim();
      const rawName = row['Apellido y Nombre']?.toString().trim() || row['Nombre']?.toString().trim();
      
      if (rawLegajo && rawName && rawLegajo !== '') {
        const normName = normalizeName(rawName);
        if (!nameToLegajoMap.has(normName)) {
          nameToLegajoMap.set(normName, rawLegajo);
        }
      }
    }
  }

  // 2. Find employees with fake legajos (starting with S/L-)
  const fakeLegajoEmployees = await prisma.employee.findMany({
    where: {
      legajo: {
        startsWith: 'S/L-'
      }
    }
  });

  console.log(`Encontrados ${fakeLegajoEmployees.length} empleados con legajo provisorio (S/L-...).`);

  let updatedCount = 0;

  for (const emp of fakeLegajoEmployees) {
    const normEmpName = normalizeName(emp.name);
    
    // Try exact match first
    let realLegajo = nameToLegajoMap.get(normEmpName);

    // If not found, try fuzzy matching against the map keys
    if (!realLegajo) {
      for (const [keyName, legajoVal] of nameToLegajoMap.entries()) {
        if (keyName.includes(normEmpName) || normEmpName.includes(keyName)) {
          realLegajo = legajoVal;
          break;
        }
      }
    }

    if (realLegajo) {
      // Check if realLegajo is already taken to avoid unique constraint error
      const existing = await prisma.employee.findUnique({ where: { legajo: realLegajo } });
      
      if (!existing) {
        await prisma.employee.update({
          where: { id: emp.id },
          data: { legajo: realLegajo }
        });
        console.log(`-> Recuperado legajo ${realLegajo} para ${emp.name}`);
        updatedCount++;
      } else {
        console.log(`-> Conflicto: Legajo ${realLegajo} para ${emp.name} ya existe en otro empleado.`);
      }
    }
  }

  console.log(`\n¡Listo! Se recuperaron y actualizaron ${updatedCount} legajos.`);
}

reconcileLegajos().catch(console.error).finally(() => prisma.$disconnect());
