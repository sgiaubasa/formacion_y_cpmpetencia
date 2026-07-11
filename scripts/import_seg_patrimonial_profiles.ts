import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const uniqueReqs = (list: string[]) => {
  return Array.from(new Set(list.map(l => l.trim()))).filter(l => l.length > 0);
};

const perfilesSegPatrimonial = [
  {
    title: 'Coordinador de Seguridad Patrimonial',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: uniqueReqs([
      'Manejo informático intermedio/avanzado para reporte y análisis de datos.',
      'Poseer conocimientos en el trabajo bajo normas de seguridad y regulaciones pertinentes.',
      'Habilidades de liderazgo, comunicación clara, resolución de problemas y conflictos de seguridad.',
      'Introducción norma IRAM-ISO 9001 e ISO 39001',
      'Política de Gestión Integrada',
      'Gestión del Riesgo',
      'Reglamento de Explotación y del Usuario',
      'Inducción en Seg e Hig.',
      'ITAU-04-05 Gestión de Seguridad Vial',
      'Seguridad Patrimonial Anexo 8 PAU-05 (agregada)'
    ])
  },
  {
    title: 'Subgerente Seguridad Patrimonial',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: uniqueReqs([
      'Manejo informático intermedio/avanzado para reporte y análisis de datos.',
      'Conocimientos de normas de seguridad y regulaciones pertinentes.',
      'Introducción norma IRAM-ISO 9001 e ISO 39001 (agregada)',
      'Política de Gestión Integrada',
      'Gestión del Riesgo',
      'Reglamento de Explotación y del Usuario',
      'Inducción en Seg e Hig.',
      'ITAU-04-05 Gestión de Seguridad Vial',
      'Seguridad Patrimonial Anexo 8 PAU-05 (agregada)'
    ])
  }
];

async function seedProfiles() {
  for (const profile of perfilesSegPatrimonial) {
    const conocimientosString = profile.conocimientosEsp.join('\n');
    
    let exactMatch = await prisma.jobProfile.findFirst({
      where: { title: { contains: profile.title } }
    });

    if (exactMatch) {
      await prisma.jobProfile.update({
        where: { id: exactMatch.id },
        data: {
          conocimientosEsp: conocimientosString,
          gerencia: profile.gerencia
        }
      });
      console.log(`Actualizado: ${profile.title}`);
    } else {
      await prisma.jobProfile.create({
        data: {
          title: profile.title,
          gerencia: profile.gerencia,
          conocimientosEsp: conocimientosString
        }
      });
      console.log(`Creado: ${profile.title}`);
    }
  }
}

seedProfiles().catch(console.error).finally(() => prisma.$disconnect());
