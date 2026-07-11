import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function toTitleCase(str: string) {
  return str.toLowerCase().split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

async function fixNames() {
  const employees = await prisma.employee.findMany();
  let count = 0;
  for (const emp of employees) {
    // "ACEVEDO, JORGE MATIAS" -> "Acevedo, Jorge Matias"
    const newName = toTitleCase(emp.name);
    if (newName !== emp.name) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { name: newName }
      });
      count++;
    }
  }
  console.log(`Updated ${count} employee names to Title Case.`);
}

fixNames().catch(console.error).finally(() => prisma.$disconnect());
