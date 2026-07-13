import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = "sgiaubasa@gmail.com";
  const existing = await prisma.appUser.findUnique({ where: { email } });
  
  if (!existing) {
    await prisma.appUser.create({
      data: {
        email: email,
        role: "SGI"
      }
    });
    console.log(`Creado administrador SGI: ${email}`);
  } else {
    await prisma.appUser.update({
      where: { email },
      data: { role: "SGI" }
    });
    console.log(`Actualizado administrador SGI: ${email}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
