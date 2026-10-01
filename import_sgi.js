const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
  }
  return null;
}

async function run() {
  const content = fs.readFileSync('data.tsv', 'utf-8');
  const lines = content.split('\n');
  
  let importedCount = 0;
  let skippedCount = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split('\t');
    
    // Some lines might not have 12 columns if they are malformed, but let's try reading them.
    const scheduledDateStr = cols[0];
    const legajo = cols[1]?.trim();
    let name = cols[2]?.trim();
    const trainingName = cols[6]?.trim();
    let scoreStr = cols[10]?.trim();
    let completedDateStr = cols[11]?.trim();

    if (!trainingName) continue;

    // Filter to 2025 and 2026 only
    let year = 0;
    if (completedDateStr && completedDateStr.includes('2025')) year = 2025;
    else if (completedDateStr && completedDateStr.includes('2026')) year = 2026;
    else if (scheduledDateStr && scheduledDateStr.includes('2025')) year = 2025;
    else if (scheduledDateStr && scheduledDateStr.includes('2026')) year = 2026;
    else if (completedDateStr && (completedDateStr.includes('2024') || completedDateStr.includes('2023'))) year = 2024;
    else if (scheduledDateStr && (scheduledDateStr.includes('2024') || scheduledDateStr.includes('2023'))) year = 2024;

    if (year !== 2025 && year !== 2026) {
      skippedCount++;
      continue;
    }

    // Find the employee in DB
    let employee = null;
    if (legajo && legajo !== '0') {
      employee = await prisma.employee.findFirst({ where: { legajo } });
    }
    
    if (!employee) {
      // Try by name matching (approximate)
      const parts = name.split(' ');
      const lastName = parts[0];
      employee = await prisma.employee.findFirst({
        where: { name: { contains: lastName, mode: 'insensitive' } }
      });
    }

    if (!employee) {
      console.log(`❌ Empleado no encontrado: ${name} (Legajo: ${legajo})`);
      continue;
    }

    const scheduledDate = parseDate(scheduledDateStr);
    let completedAt = parseDate(completedDateStr);
    
    // If completedAt is missing but it's "Capacitación Realizada", we use scheduledDate
    if (!completedAt && cols[8]?.includes('Realizada')) {
      completedAt = scheduledDate || new Date();
    }

    // Ensure training exists in general DB
    let training = await prisma.training.findFirst({ where: { title: trainingName } });
    if (!training) {
      training = await prisma.training.create({
        data: { title: trainingName, objective: 'Importado de excel histórico' }
      });
    }

    // Insert EmployeeTrainingRecord
    await prisma.employeeTrainingRecord.create({
      data: {
        employeeId: employee.id,
        trainingName: trainingName,
        status: 'COMPLETED',
        effectiveness: 'PENDING',
        score: scoreStr || null,
        scheduledDate: scheduledDate,
        completedAt: completedAt || new Date()
      }
    });

    console.log(`✅ Importado: ${name} - ${trainingName}`);
    importedCount++;
  }

  console.log(`\n🎉 Finalizado! Importados: ${importedCount}. Omitidos (fuera de 2025-2026): ${skippedCount}`);
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
