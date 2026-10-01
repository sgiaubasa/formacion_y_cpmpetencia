const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/[\/-]/);
  if (parts.length === 3) {
    let d;
    if (parts[0].length === 4) {
      d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00Z`);
    } else {
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
    }
    if (!isNaN(d.valueOf())) return d;
  }
  return null;
}

async function run() {
  const content = fs.readFileSync('data_operaciones.tsv', 'utf-8');
  const lines = content.split('\n');
  
  let importedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes('<USER_REQUEST>')) continue;
    if (line.includes('</USER_REQUEST>')) continue;
    if (line.startsWith('operaciones ')) {
        line = line.replace('operaciones ', '');
    }

    if (!line.trim()) continue;
    
    const cols = line.split('\t');
    if (cols.length < 8) continue;

    const scheduledDateStr = cols[0];
    const legajo = cols[1]?.trim();
    const name = cols[2]?.trim();
    
    const actualTrainingName = cols[6]?.trim();
    let actualStatus = cols[8]?.trim() || '';
    let actualScore = cols[10]?.trim() || '';
    let actualCompleted = cols[11]?.trim() || '';

    if (!actualTrainingName) continue;

    let year = 0;
    if (actualCompleted && actualCompleted.includes('2025')) year = 2025;
    else if (actualCompleted && actualCompleted.includes('2026')) year = 2026;
    else if (scheduledDateStr && scheduledDateStr.includes('2025')) year = 2025;
    else if (scheduledDateStr && scheduledDateStr.includes('2026')) year = 2026;
    
    if (year !== 2025 && year !== 2026) {
      skippedCount++;
      continue;
    }

    let employee = null;
    
    // Try by legajo first
    if (legajo && legajo !== '0' && legajo !== '') {
        employee = await prisma.employee.findFirst({ where: { legajo } });
    }

    if (!employee) {
        // Fallback by name
        const parts = name.split(' ');
        const lastName = parts[0];
        
        const employees = await prisma.employee.findMany({
          where: { 
            name: { contains: lastName, mode: 'insensitive' },
            sector: { name: { contains: 'Operaciones', mode: 'insensitive' } } // This will match 'Gerencia de Operaciones' but might also match SVIA. Since SVIA users shouldn't have exact same name in this batch, it's fine.
          },
          include: { sector: true }
        });

        // Filter exact 'Gerencia de Operaciones' if possible, avoiding SVIA if they are separate
        let exactMatch = employees.filter(e => e.sector.name.trim() === 'Gerencia de Operaciones');
        if (exactMatch.length === 0) exactMatch = employees; // fallback

        if (exactMatch.length === 1) {
          employee = exactMatch[0];
        } else if (exactMatch.length > 1) {
          const firstName = parts[1];
          if (firstName) {
              employee = exactMatch.find(e => e.name.toLowerCase().includes(firstName.toLowerCase()));
          }
          if (!employee) employee = exactMatch[0];
        }
    }

    if (!employee) {
      console.log(`❌ Empleado no encontrado: ${name} (Legajo: ${legajo})`);
      continue;
    }

    const scheduledDate = parseDate(scheduledDateStr);
    let completedAt = parseDate(actualCompleted);
    
    const isCompleted = actualStatus.includes('Realizada') || actualStatus.includes('Realizado');
    const isProgrammed = actualStatus.includes('Programada') || actualStatus.includes('Programado');

    if (!completedAt && isCompleted) {
      completedAt = scheduledDate || new Date();
    }

    let training = await prisma.training.findFirst({ where: { title: actualTrainingName } });
    if (!training) {
      training = await prisma.training.create({
        data: { title: actualTrainingName, objective: 'Importado de excel histórico Operaciones' }
      });
    }

    let finalScore = actualScore.replace(',', '.');
    if (isNaN(parseFloat(finalScore))) finalScore = null;

    const existingKey = {
        employeeId: employee.id,
        trainingName: actualTrainingName,
        status: isCompleted ? 'COMPLETED' : 'IN_PLAN'
    };
    
    const existing = await prisma.employeeTrainingRecord.findFirst({
        where: existingKey
    });

    if (existing && existing.completedAt && completedAt && existing.completedAt.getFullYear() === completedAt.getFullYear() && existing.completedAt.getMonth() === completedAt.getMonth()) {
        continue; // duplicate in same month
    }

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

    console.log(`✅ Importado: ${employee.name} - ${actualTrainingName} (${actualStatus})`);
    importedCount++;
  }

  console.log(`\n🎉 Finalizado! Importados: ${importedCount}. Omitidos: ${skippedCount}`);
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
