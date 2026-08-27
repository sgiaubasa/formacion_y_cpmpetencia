import { prisma } from './src/lib/prisma';

async function test() {
  const e1 = await prisma.employee.create({
    data: { name: 'Test 1', legajo: '99991', sectorId: 1, isActive: true }
  });
  const e2 = await prisma.employee.create({
    data: { name: 'Test 2', legajo: '99992', sectorId: 1, isActive: true }
  });

  try {
    await prisma.employee.update({
      where: { id: e1.id },
      data: { legajo: '99992' }
    });
    console.log("Success");
  } catch (e: any) {
    console.log("Caught Error:", e.code, e.message);
  }
}

test().catch(console.error);
