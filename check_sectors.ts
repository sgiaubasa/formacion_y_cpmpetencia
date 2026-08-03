import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' } });
  console.log(sectors.map(s => s.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
