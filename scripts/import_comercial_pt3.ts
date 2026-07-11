import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const uniqueReqs = (list: string[]) => {
  return Array.from(new Set(list.map(l => l.trim()))).filter(l => l.length > 0);
};

const perfilesComercialPt3 = [
  {
    title: 'Jefe de Peaje Dinámico',
    gerencia: 'Gerencia Comercial',
    conocimientosEsp: uniqueReqs([
      'Conocimientos generales de contabilidad, experiencia en manejo de dinero.',
      'Poseer experiencia en atención al cliente y resolución de reclamos.',
      'Experiencia en ventas.',
      'Experiencia en peaje dinámico.',
      'Contrato de Concesión.',
      'Reglamento del Usuario y Explotación.',
      'Ley Nacional de Tránsito.',
      'Manual para solución de Contingencias.',
      'Política de Gestión Integrada.',
      'Introducción al Sistema de Gestión Integrado.',
      'Instrucciones de Trabajo relacionadas con quejas y reclamos, Centro de Atención al Usuario y 0800. (ITAU/04/01, ITAU/04/02, ITAU/04/03).',
      'Competencias propias del Agente Administrador en Plataforma Web de Atención al Usuario, manejo de "GML Suit".',
      'Instrucción de Trabajo relacionada con la Seguridad Vial (ITAU/04/05).',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1'
    ])
  },
  {
    title: 'Jefe de Atención al Usuario',
    gerencia: 'Gerencia Comercial',
    conocimientosEsp: uniqueReqs([
      'Conocimientos generales de contabilidad, experiencia en manejo de dinero.',
      'Poseer experiencia en atención al cliente y resolución de reclamos.',
      'Experiencia en ventas.',
      'Experiencia en peaje dinámico.',
      'Contrato de Concesión.',
      'Reglamento del Usuario y Explotación.',
      'Ley Nacional de Tránsito',
      'Manual para solución de Contingencias.',
      'Política de Gestión Integrada.',
      'Introducción al Sistema de gestión Integrado.',
      'Instrucciones de Trabajo relacionadas con quejas y reclamos, Centro de Atención al Usuario y 0800. (ITAU/04/01, ITAU/04/02, ITAU/04/03).',
      'Competencias propias del Agente Administrador en Plataforma Web de Atención al Usuario, manejo de "GML Suit".',
      'Instrucción de Trabajo relacionada con la Seguridad Vial (ITAU/04/05).',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1.'
    ])
  },
  {
    title: 'Gerente Comercial',
    gerencia: 'Gerencia Comercial',
    conocimientosEsp: uniqueReqs([
      'Conocimientos generales de contabilidad, experiencia en manejo de dinero.',
      'Poseer experiencia en atención al cliente y resolución de reclamos.',
      'Experiencia en ventas.',
      'Experiencia en peaje dinámico.',
      'Contrato de Concesión.',
      'Reglamento del Usuario y Explotación.',
      'Ley Nacional de Tránsito',
      'Manual para solución de Contingencias.',
      'Política de Gestión Integrada.',
      'Introducción al Sistema de Gestión Integrado.',
      'Instrucciones de Trabajo relacionadas con quejas y reclamos, Centro de Atención al Usuario y 0800. (ITAU/04/01, ITAU/04/02, ITAU/04/03).',
      'Competencias propias del Agente Administrador en Plataforma Web de Atención al Usuario, manejo de "GML Suit".',
      'Instrucción de Trabajo relacionada con la Seguridad Vial (ITAU/04/05).',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1'
    ])
  }
];

async function seedProfiles() {
  for (const profile of perfilesComercialPt3) {
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
