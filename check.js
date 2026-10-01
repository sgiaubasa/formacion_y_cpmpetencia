const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const t = await prisma.employeeTrainingRecord.findMany({ where: { employeeId: 1103 } });
  console.log(t);
}
main().finally(() => prisma.$disconnect());
