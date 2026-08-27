const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.sector.count();
    console.log("SUCCESS! Connection worked. Sectors count:", count);
  } catch (e) {
    console.error("FAILED to connect:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
