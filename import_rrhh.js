const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split(/[\/-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00Z`);
    } else {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
    }
  }
  return null;
}

async function run() {
  const content = fs.readFileSync('data_rrhh.tsv', 'utf-8');
  const lines = content.split('\n');
  
  let importedCount = 0;
  let skippedCount = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split('\t');
    if (cols.length < 8) continue;

    const scheduledDateStr = cols[0];
    const legajo = cols[1]?.trim();
    const name = cols[2]?.trim();
    
    // In this dataset, there are extra columns if instructor is split or not. 
    // Let's trace it carefully:
    // 13/10/2025(0)	40097(1)	Cuevas Candela(2)	Gerencia de Recursos Humanos(3)	Gerente de RRHH(4)	Sede Central(5)	PAU 07  Indicadores de Gestión(6)	Capacitaciones SGI(7)	Capacitacion Realizada(8)	(9)	10(10)	23/12/2025(11)
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
            sector: { name: { contains: 'Recursos Humanos', mode: 'insensitive' } }
          }
        });

        if (employees.length === 1) {
          employee = employees[0];
        } else if (employees.length > 1) {
          const firstName = parts[1];
          employee = employees.find(e => e.name.toLowerCase().includes(firstName.toLowerCase()));
          if (!employee) employee = employees[0];
        }
    }

    if (!employee) {
      console.log(`❌ Empleado no encontrado: ${name} (Legajo: ${legajo})`);
      continue;
    }

    const scheduledDate = parseDate(scheduledDateStr);
    let completedAt = parseDate(actualCompleted);
    
    const isCompleted = actualStatus.includes('Realizada');
    const isProgrammed = actualStatus.includes('Programada');

    if (!completedAt && isCompleted) {
      completedAt = scheduledDate || new Date();
    }

    let training = await prisma.training.findFirst({ where: { title: actualTrainingName } });
    if (!training) {
      training = await prisma.training.create({
        data: { title: actualTrainingName, objective: 'Importado de excel histórico RRHH' }
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
