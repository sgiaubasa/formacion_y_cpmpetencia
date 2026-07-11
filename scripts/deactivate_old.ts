import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const res = await prisma.employee.updateMany({
    where: { legajo: { startsWith: 'SIN-LEGAJO' } },
    data: { isActive: false }
  });
  console.log('Deactivated', res.count, 'employees without proper legajos');
}
run().finally(() => prisma.$disconnect());
