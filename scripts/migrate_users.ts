import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Migrando usuarios...");

  // Agregar admins por defecto (SGI y RRHH)
  const defaultAdmins = [
    { email: "admin@aubasa.com.ar", role: "SGI" },
    { email: "sgi@aubasa.com.ar", role: "SGI" },
    { email: "admin.sgi@aubasa.com.ar", role: "SGI" },
    { email: "rrhh@aubasa.com.ar", role: "RRHH" },
    { email: "admin.rrhh@aubasa.com.ar", role: "RRHH" }
  ];

  for (const admin of defaultAdmins) {
    const existing = await prisma.appUser.findUnique({ where: { email: admin.email } });
    if (!existing) {
      await prisma.appUser.create({
        data: { email: admin.email, role: admin.role }
      });
      console.log(`Creado admin: ${admin.email}`);
    }
  }

  // Migrar sectores con email
  const sectores = await prisma.sector.findMany({
    where: { mail: { not: null } }
  });

  for (const sector of sectores) {
    if (!sector.mail) continue;
    
    // Ignorar si el mail ya está en la lista de admins
    if (defaultAdmins.some(a => a.email === sector.mail)) continue;

    const existing = await prisma.appUser.findUnique({ where: { email: sector.mail } });
    if (!existing) {
      await prisma.appUser.create({
        data: {
          email: sector.mail,
          role: "SECTOR",
          sectorId: sector.id
        }
      });
      console.log(`Creado usuario de sector: ${sector.mail} para ${sector.name}`);
    }
  }

  console.log("Migración de usuarios completada.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
