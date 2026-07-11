import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const uniqueReqs = (list: string[]) => {
  return Array.from(new Set(list.map(l => l.trim()))).filter(l => l.length > 0);
};

async function seedProfiles() {
  const dataPath = path.join(__dirname, 'operaciones_batch1.json');
  const fileContent = fs.readFileSync(dataPath, 'utf-8');
  const perfiles = JSON.parse(fileContent);

  for (const profile of perfiles) {
    const conocimientosString = uniqueReqs(profile.conocimientos_necesarios || []).join('\n');
    
    // Only search by the clean title without the abbreviation, or just use exactly what is in denominacion_puesto
    // e.g. "Gerente de Operaciones (GO)"
    let exactMatch = await prisma.jobProfile.findFirst({
      where: { title: profile.denominacion_puesto }
    });

    if (exactMatch) {
      await prisma.jobProfile.update({
        where: { id: exactMatch.id },
        data: {
          conocimientosEsp: conocimientosString,
          gerencia: profile.gerencia
        }
      });
      console.log(`Actualizado: ${profile.denominacion_puesto}`);
    } else {
      await prisma.jobProfile.create({
        data: {
          title: profile.denominacion_puesto,
          gerencia: profile.gerencia,
          conocimientosEsp: conocimientosString
        }
      });
      console.log(`Creado: ${profile.denominacion_puesto}`);
    }
  }
}

seedProfiles().catch(console.error).finally(() => prisma.$disconnect());
