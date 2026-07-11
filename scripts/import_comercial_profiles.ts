import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const uniqueReqs = (list: string[]) => {
  return Array.from(new Set(list.map(l => l.trim()))).filter(l => l.length > 0);
};

const perfilesComercial = [
  {
    title: 'Supervisor de Contact Center',
    gerencia: 'Gerencia Comercial',
    conocimientosEsp: uniqueReqs([
      'Reglamento del Usuario.',
      'Política de Gestión Integrada.',
      'ITAU/04-01 – Atención de consultas, sugerencias, quejas y reclamos.',
      'ITAU/04-02 – Atención a los usuarios, telefonía y redes Sociales',
      'ITAU/04-03 – Gestión comercial, TelePASE y exentos.',
      'Plataforma Web de Atención al Usuario (ITAU/04/02 – A1).',
      'ITAU/04-05 – Gestión de la seguridad vial'
    ])
  },
  {
    title: 'Operador de Atención al Usuario',
    gerencia: 'Gerencia Comercial',
    conocimientosEsp: uniqueReqs([
      'Inducción sobre la Gerencia Comercial.',
      'Reglamento del Usuario.',
      'Política de Gestión Integrada.',
      'Operación en los Centros de Atención al Usuario (contiene conocimientos elementales de todas las instrucciones de trabajo de la Gerencia Comercial, con específico anclaje en la tarea desempeñada).',
      'ITAU/04-05 – Gestión de la seguridad vial.'
    ])
  },
  {
    title: 'Supervisor Operativo Back Office',
    gerencia: 'Gerencia Comercial',
    conocimientosEsp: uniqueReqs([
      'Contrato de Concesión.',
      'Reglamento del Usuario y Explotación.',
      'Ley Nacional de Tránsito.',
      'Manual para solución de Contingencias.',
      'Política de Gestión Integrada.',
      'Introducción al Sistema de Gestión Integrado.',
      'Instrucciones de Trabajo relacionadas con quejas y reclamos, Centro de Atención al Usuario y 0800. (ITAU/04/01, ITAU/04/02, ITAU/04/03).',
      'Competencias propias del Agente Supervisor en Plataforma Web de Atención al Usuario, manejo de "GML Suit".',
      'Instrucción de Trabajo relacionada con la Seguridad Vial (ITAU/04/05).',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1'
    ])
  },
  {
    title: 'Supervisor Administrativo Back Office',
    gerencia: 'Gerencia Comercial',
    conocimientosEsp: uniqueReqs([
      'Contrato de Concesión.',
      'Reglamento del Usuario y Explotación.',
      'Ley Nacional de Tránsito',
      'Manual para solución de Contingencias.',
      'Política de Gestión Integrada.',
      'Introducción al Sistema de gestión Integrado.',
      'Instrucciones de Trabajo relacionadas con quejas y reclamos, Centro de Atención al Usuario y 0800. (ITAU/04/01, ITAU/04/02, ITAU/04/03).',
      'Competencias propias del Agente Supervisor en Plataforma Web Atención al Usuario, manejo de “GML Suit”.',
      'Instrucción de Trabajo relacionada con la Seguridad Vial (ITAU/04/05).',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1.'
    ])
  }
];

async function seedProfiles() {
  for (const profile of perfilesComercial) {
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
