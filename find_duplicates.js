const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const records = await prisma.employeeTrainingRecord.findMany({
    where: { status: 'COMPLETED' }
  });

  const map = {};
  const duplicates = [];

  for (const r of records) {
    if (!r.completedAt) continue;
    const date = new Date(r.completedAt);
    const key = `${r.employeeId}_${r.trainingName}_${date.getFullYear()}_${date.getMonth()}`;
    
    if (map[key]) {
      // decide which one to keep
      const existing = map[key];
      let toKeep = existing;
      let toDelete = r;

      if (r.effectiveness === 'EFFECTIVE' && existing.effectiveness !== 'EFFECTIVE') {
        toKeep = r;
        toDelete = existing;
      } else if (r.evidencePath && !existing.evidencePath) {
        toKeep = r;
        toDelete = existing;
      } else if (r.score && !existing.score) {
        toKeep = r;
        toDelete = existing;
      } else if (r.id < existing.id && existing.effectiveness !== 'EFFECTIVE') {
        toKeep = r;
        toDelete = existing;
      }

      map[key] = toKeep;
      duplicates.push({ keep: toKeep, delete: toDelete });
    } else {
      map[key] = r;
    }
  }

  console.log(`Found ${duplicates.length} duplicates.`);
  for (const d of duplicates) {
    console.log(`- Deleting duplicate ID ${d.delete.id} (Keeping ID ${d.keep.id}) - Emp: ${d.delete.employeeId}, Training: ${d.delete.trainingName}`);
    await prisma.employeeTrainingRecord.delete({ where: { id: d.delete.id } });
  }
}
run().then(() => prisma.$disconnect());
