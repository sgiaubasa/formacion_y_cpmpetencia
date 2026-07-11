const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STANDARD_SECTORS = [
  "Gerencia Comercial",
  "Gerencia de Operaciones",
  "Gerencia de Operaciones SVIA",
  "Gerencia de Sistemas",
  "Gerencia de Mantenimiento",
  "Gerencia de Asuntos Legales",
  "Sub-Gerencia de Relaciones Institucionales",
  "Asistencia Vial",
  "CCM",
  "Seguridad Patrimonial",
  "Gerencia de Prevencion y Seguridad Integral"
];

const MAPPINGS = {
  // Map old names to new standard names
  "Compras": null, // We might leave this or map it? The user didn't mention Compras in the new list. Wait.
  "Gerencia de Compras": null,
  "Comercial": "Gerencia Comercial",
  "COMERCIAL": "Gerencia Comercial",
  "Operaciones": "Gerencia de Operaciones",
  "OPERACIONES AULP": "Gerencia de Operaciones",
  "Gerencia Operaciones": "Gerencia de Operaciones",
  "Gerencia de operaciones": "Gerencia de Operaciones",
  "Gerencia de Operaciones (GOP)": "Gerencia de Operaciones",
  "Gerencia de Operaciones (GO)": "Gerencia de Operaciones",
  "SVIA Operaciones": "Gerencia de Operaciones SVIA",
  "OPERACIONES SVIA": "Gerencia de Operaciones SVIA",
  "Sistemas": "Gerencia de Sistemas",
  "SISTEMAS": "Gerencia de Sistemas",
  "Mantenimiento": "Gerencia de Mantenimiento",
  "MANTENIMIENTO": "Gerencia de Mantenimiento",
  "Legales": "Gerencia de Asuntos Legales",
  "Asuntos Legales": "Gerencia de Asuntos Legales",
  "RRII": "Sub-Gerencia de Relaciones Institucionales",
  "Relaciones Institucionales": "Sub-Gerencia de Relaciones Institucionales",
  "Centro de Monitoreo": "CCM",
  "Ccm": "CCM",
  "Prevención y Seguridad Integral": "Gerencia de Prevencion y Seguridad Integral"
};

async function main() {
  console.log("Starting DB migration...");
  
  // 1. Create standard sectors if they don't exist
  for (const name of STANDARD_SECTORS) {
    const existing = await prisma.sector.findUnique({ where: { name } });
    if (!existing) {
      await prisma.sector.create({
        data: {
          name,
          password: "123", // dummy
          role: "USER"
        }
      });
      console.log(`Created sector: ${name}`);
    }
  }

  // 2. Migrate Employees
  const employees = await prisma.employee.findMany({ include: { sector: true } });
  for (const emp of employees) {
    if (emp.sector && MAPPINGS[emp.sector.name]) {
      const newSectorName = MAPPINGS[emp.sector.name];
      const newSector = await prisma.sector.findUnique({ where: { name: newSectorName } });
      if (newSector) {
        await prisma.employee.update({
          where: { id: emp.id },
          data: { sectorId: newSector.id }
        });
      }
    }
  }

  // 3. Migrate JobProfiles (gerencia field is string)
  const profiles = await prisma.jobProfile.findMany();
  for (const profile of profiles) {
    if (profile.gerencia && MAPPINGS[profile.gerencia]) {
      await prisma.jobProfile.update({
        where: { id: profile.id },
        data: { gerencia: MAPPINGS[profile.gerencia] }
      });
    }
  }

  // 4. Delete old non-standard sectors (if they have no employees)
  const allSectors = await prisma.sector.findMany({ include: { _count: { select: { employees: true } } } });
  for (const sector of allSectors) {
    if (!STANDARD_SECTORS.includes(sector.name)) {
      if (sector._count.employees === 0) {
        // Can safely delete
        try {
          await prisma.sector.delete({ where: { id: sector.id } });
          console.log(`Deleted unused legacy sector: ${sector.name}`);
        } catch(e) {
          console.log(`Could not delete ${sector.name}`);
        }
      } else {
        console.log(`WARNING: Legacy sector ${sector.name} still has ${sector._count.employees} employees!`);
      }
    }
  }

  console.log("Migration complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
