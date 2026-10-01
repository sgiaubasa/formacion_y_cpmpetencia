const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const records = await prisma.employeeTrainingRecord.findMany({
    where: { 
      employee: {
        sector: {
          name: { contains: 'SGI' }
        }
      }
    },
    include: { employee: true }
  });
  console.log(`Found ${records.length} records for SGI.`);
  let countsByMonthYear = {};
  for(let r of records) {
    const d = r.completedAt || r.scheduledDate;
    if(d) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
      countsByMonthYear[key] = (countsByMonthYear[key] || 0) + 1;
    }
  }
  console.log('Counts by month (completedAt or scheduledDate):', countsByMonthYear);
}
run().then(() => prisma.$disconnect());
