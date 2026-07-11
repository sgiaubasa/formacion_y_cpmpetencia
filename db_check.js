const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sectors = await prisma.sector.findMany({ select: { id: true, name: true, role: true } });
  console.log("SECTORS:", sectors);

  const gerencias = await prisma.jobProfile.findMany({
    select: { gerencia: true },
    distinct: ['gerencia'],
    where: { gerencia: { not: null } }
  });
  console.log("GERENCIAS IN PROFILES:", gerencias);
}

main().catch(console.error).finally(() => prisma.$disconnect());
