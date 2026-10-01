const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/[\/-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) { // YYYY-MM-DD
      return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00Z`);
    } else { // DD/MM/YYYY
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
    }
  }
  return null;
}

async function run() {
  const content = fs.readFileSync('data_compras.tsv', 'utf-8');
  const lines = content.split('\n');
  
  let importedCount = 0;
  let skippedCount = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split('\t');
    
    // Check if it has enough columns
    if (cols.length < 8) continue;

    const scheduledDateStr = cols[0];
    const name = cols[2]?.trim();
    const trainingName = cols[5]?.trim(); // wait, let's check column index
    let scoreStr = cols[9]?.trim();
    let completedDateStr = cols[10]?.trim();

    // The columns are:
    // 0: scheduled date (e.g. 23/05/2025)
    // 1: empty (legajo)
    // 2: Name (e.g. Saldivar Brenda)
    // 3: Sector (e.g. Gerencia de Compras)
    // 4: Profile (e.g. Auxiliar de almacén)
    // 5: Instructor/Sede (e.g. Sede Central)
    // 6: Training (e.g. Gestion de Riesgos y Oportunidades)
    // 7: Group (e.g. Capacitaciones SGI)
    // 8: Status (e.g. Capacitación Realizada or Capacitación Programada)
    // 9: Score (e.g. 10 or 8,75)
    // 10: Completed Date (e.g. 26/05/2025)
    // Wait, wait, let's look at a row:
    // 23/05/2025(0)	(1)	Saldivar Brenda(2)	Gerencia de Compras(3)	Auxiliar de almacén(4)	Sede Central(5)	Gestion de Riesgos y Oportunidades(6)	Capacitaciones SGI(7)	Capacitación Realizada(8)	(9)	10(10)	26/05/2025(11)
    
    // Oh, there's an empty column 9. Let's trace it:
    // 0: 23/05/2025
    // 1: 
    // 2: Saldivar Brenda
    // 3: Gerencia de Compras
    // 4: Auxiliar de almacén
    // 5: Sede Central
    // 6: Gestion de Riesgos y Oportunidades
    // 7: Capacitaciones SGI
    // 8: Capacitación Realizada
    // 9: 
    // 10: 10
    // 11: 26/05/2025

    const actualTrainingName = cols[6]?.trim();
    let actualStatus = cols[8]?.trim() || '';
    let actualScore = cols[10]?.trim() || '';
    let actualCompleted = cols[11]?.trim() || '';

    if (!actualTrainingName) continue;

    // Filter to 2025 and 2026 only
    let year = 0;
    if (actualCompleted && actualCompleted.includes('2025')) year = 2025;
    else if (actualCompleted && actualCompleted.includes('2026')) year = 2026;
    else if (scheduledDateStr && scheduledDateStr.includes('2025')) year = 2025;
    else if (scheduledDateStr && scheduledDateStr.includes('2026')) year = 2026;
    
    if (year !== 2025 && year !== 2026) {
      skippedCount++;
      continue;
    }

    // Find the employee in DB
    const parts = name.split(' ');
    const lastName = parts[0];
    
    const employees = await prisma.employee.findMany({
      where: { 
        name: { contains: lastName, mode: 'insensitive' },
        sector: { name: { contains: 'Compras', mode: 'insensitive' } }
      }
    });

    let employee = null;
    if (employees.length === 1) {
      employee = employees[0];
    } else if (employees.length > 1) {
      // try to match first name too
      const firstName = parts[1];
      employee = employees.find(e => e.name.toLowerCase().includes(firstName.toLowerCase()));
      if (!employee) employee = employees[0]; // fallback
    }

    if (!employee) {
      console.log(`❌ Empleado no encontrado: ${name}`);
      continue;
    }

    const scheduledDate = parseDate(scheduledDateStr);
    let completedAt = parseDate(actualCompleted);
    
    const isCompleted = actualStatus.includes('Realizada');
    const isProgrammed = actualStatus.includes('Programada');

    if (!completedAt && isCompleted) {
      completedAt = scheduledDate || new Date();
    }

    // Ensure training exists in general DB
    let training = await prisma.training.findFirst({ where: { title: actualTrainingName } });
    if (!training) {
      training = await prisma.training.create({
        data: { title: actualTrainingName, objective: 'Importado de excel histórico' }
      });
    }

    let finalScore = actualScore.replace(',', '.');
    if (isNaN(parseFloat(finalScore))) finalScore = null;

    // We avoid inserting duplicates immediately
    const existingKey = {
        employeeId: employee.id,
        trainingName: actualTrainingName,
        status: isCompleted ? 'COMPLETED' : 'IN_PLAN'
    };
    
    // basic duplicate check
    const existing = await prisma.employeeTrainingRecord.findFirst({
        where: existingKey
    });

    if (existing && existing.completedAt && completedAt && existing.completedAt.getFullYear() === completedAt.getFullYear() && existing.completedAt.getMonth() === completedAt.getMonth()) {
        // already exists in the same month, skip to avoid creating duplicates!
        continue;
    }

    // Insert EmployeeTrainingRecord
    await prisma.employeeTrainingRecord.create({
      data: {
        employeeId: employee.id,
        trainingName: actualTrainingName,
        status: isCompleted ? 'COMPLETED' : 'IN_PLAN',
        effectiveness: isCompleted ? 'PENDING' : null,
        score: finalScore,
        scheduledDate: scheduledDate,
        completedAt: isCompleted ? completedAt : null
      }
    });

    console.log(`✅ Importado: ${name} - ${actualTrainingName} (${actualStatus})`);
    importedCount++;
  }

  console.log(`\n🎉 Finalizado! Importados: ${importedCount}. Omitidos: ${skippedCount}`);
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
