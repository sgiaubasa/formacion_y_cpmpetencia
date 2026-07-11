import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const uniqueReqs = (list: string[]) => {
  return Array.from(new Set(list.map(l => l.trim()))).filter(l => l.length > 0);
};

const perfilesComercialPt2 = [
  {
    title: 'Operador de Quejas y Reclamos',
    gerencia: 'Gerencia Comercial',
    conocimientosEsp: uniqueReqs([
      'Reglamento del Usuario.',
      'Política de Gestión Integrada.',
      'ITAU/04-01 – Atención de consultas, sugerencias, quejas y reclamos.',
      'ITAU/04-02 – A1: Plataforma Web de Atención al Usuario.',
      'ITAU/04-05 – Gestión de la seguridad vial.'
    ])
  },
  {
    title: 'Operador Facturación',
    gerencia: 'Gerencia Comercial',
    conocimientosEsp: uniqueReqs([
      'Contrato de Concesión.',
      'Reglamento del Usuario y Explotación.',
      'Ley Nacional de Tránsito',
      'Manual para solución de Contingencias.',
      'Política de Gestión Integrada.',
      'Introducción al Sistema de gestión Integrado.',
      'Instrucciones de Trabajo relacionadas con quejas y reclamos, Centro de Atención al Usuario y 0800. (ITAU/04/01, ITAU/04/02, ITAU/04/03).',
      'Competencias propias del Agente Operador en Plataforma Web de Atención al Usuario, manejo de "GML Suit".',
      'Instrucción de Trabajo relacionada con la Seguridad Vial (ITAU/04/05).',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1'
    ])
  },
  {
    title: 'Operador Facturación Senior',
    gerencia: 'Gerencia Comercial',
    conocimientosEsp: uniqueReqs([
      'Contrato de Concesión.',
      'Reglamento del Usuario y Explotación.',
      'Ley Nacional de Tránsito',
      'Manual para solución de Contingencias.',
      'Política de Gestión Integrada.',
      'Introducción al Sistema de gestión Integrado.',
      'Instrucciones de Trabajo relacionadas con quejas y reclamos, Centro de Atención al Usuario y 0800. (ITAU/04/01, ITAU/04/02, ITAU/04/03).',
      'Manejo de "GML Suit".',
      'Instrucción de Trabajo relacionada con la Seguridad Vial (ITAU/04/05).',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1.'
    ])
  },
  {
    title: 'Operador de Contact Center',
    gerencia: 'Gerencia Comercial',
    conocimientosEsp: uniqueReqs([
      'Reglamento del Usuario.',
      'Inducción sobre la Gerencia Comercial.',
      'Política de Gestión Integrada.',
      'Operación en el Contact Center (contiene conocimientos elementales de todas las instrucciones de trabajo de la Gerencia Comercial, con específico anclaje en la tarea desempeñada).',
      'ITAU/04-02 – A1: Plataforma Web de Atención al Usuario.',
      'ITAU/04-05 – Gestión de la seguridad vial.'
    ])
  }
];

async function seedProfiles() {
  for (const profile of perfilesComercialPt2) {
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
