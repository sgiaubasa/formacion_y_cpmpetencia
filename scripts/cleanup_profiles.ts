import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupProfiles() {
  const allowedTitles = [
    'Responsable de Licitaciones',
    'Analista de Compras',
    'Coordinador de Contrataciones menores',
    'Jefe/a de Compras',
    'Abogado',
    'Abogado (ABO)'
  ];

  const allProfiles = await prisma.jobProfile.findMany();

  const toKeep = allProfiles.filter(p => allowedTitles.some(allowed => p.title.includes(allowed)));
  const toDelete = allProfiles.filter(p => !toKeep.some(k => k.id === p.id));

  console.log(`Manteniendo ${toKeep.length} perfiles: ${toKeep.map(p => p.title).join(', ')}`);
  console.log(`Eliminando ${toDelete.length} perfiles...`);

  let deletedCount = 0;
  for (const profile of toDelete) {
    // 1. Desvincular a los empleados que tenían este perfil
    await prisma.employee.updateMany({
      where: { jobProfileId: profile.id },
      data: { jobProfileId: null }
    });

    // 2. Eliminar el perfil
    await prisma.jobProfile.delete({
      where: { id: profile.id }
    });
    deletedCount++;
  }

  console.log(`¡Listo! Se eliminaron ${deletedCount} perfiles.`);
}

cleanupProfiles().catch(console.error).finally(() => prisma.$disconnect());
