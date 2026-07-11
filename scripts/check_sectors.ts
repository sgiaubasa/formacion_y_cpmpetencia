import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.sector.findMany().then(s => console.log(s)).finally(() => p.$disconnect());
