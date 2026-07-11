import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const perfilesGerenciaPrevencion = [
  {
    title: 'Supervisor de Balizamiento y Móviles',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: [
      'Conocimientos básicos de mecánica.',
      'Conocimientos de control de stock.',
      'Política de Gestión Integrada.',
      'Sensibilización de las normas IRAM- ISO 9001:2015 y 39001:2012.',
      'Ley Nacional de Tránsito',
      'Reglamento del Usuario y Explotación',
      'Manual para Solución de Contingencias.',
      'Instrucciones de Trabajo relacionadas con la Seguridad Vial (ITAU/04/04, ITAU/04/05, ITAU/04/06).',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1'
    ]
  },
  {
    title: 'Supervisor Administrativo',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: [
      'Administración de personal.',
      'Conocimientos en la administración y control de stock.',
      'Rendición de fondo fijo',
      'Política de Gestión Integrada.',
      'Sensibilización de las normas IRAM- ISO 9001:2015 y 39001:2012.',
      'Ley Nacional de Tránsito',
      'Reglamento del Usuario y Explotación',
      'Manual para Solución de Contingencias.',
      'Instrucciones de Trabajo relacionadas con la Seguridad Vial (ITAU/04/04, ITAU/04/05, ITAU/04/06).',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1',
      'Norma de Seguridad Vial AUBASA – ITAU/04/05-A2 Respuesta a la Emergencia en Accidentes'
    ]
  },
  {
    title: 'Supervisor de Asistencia Vial',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: [
      'Conocimientos de esquemas para la administración y control de stock.',
      'Política de Gestión Integrada.',
      'Sensibilización de las normas IRAM- ISO 9001:2015 y 39001:2012.',
      'Ley Nacional de Tránsito',
      'Reglamento del Usuario y Explotación',
      'Manual para Solución de Contingencias.',
      'Instrucciones de Trabajo relacionadas con la Seguridad Vial (ITAU/04/04, ITAU/04/05, ITAU/04/06).',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1'
    ]
  },
  {
    title: 'Jefe de Asistencia Vial',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: [
      'Conocimientos en metodología de procesos, calidad y mejora continua.',
      'Conocimientos Plataforma GLM.',
      'Contrato de Concesión.',
      'Reglamento del Usuario y Explotación',
      'Ley de Tránsito 13927 y 24449',
      'Política de Gestión Integrada.',
      'Sensibilización de las normas IRAM- ISO 9001:2015 y 39001:2012.',
      'Alcance, estructura y funcionamiento del SGCySV.',
      'PAU/04-A2 Gestión de Riesgos y Oportunidades',
      'Instrucciones de Trabajo relacionadas con la Seguridad Vial (ITAU/04/04, ITAU/04/05, ITAU/04/06).',
      'Manual para Solución de Contingencias.',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1',
      'Norma de Seguridad Vial AUBASA – ITAU/04/05-A2',
      'Instrucciones de Trabajo relacionadas con quejas y reclamos, Centro de Atención al Usuario y 0800 (ITAU/04/01, ITAU/04/02).'
    ]
  }
];

async function seedProfiles() {
  for (const profile of perfilesGerenciaPrevencion) {
    const conocimientosString = profile.conocimientosEsp.join('\n');
    
    let exactMatch = await prisma.jobProfile.findFirst({
      where: { title: profile.title }
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
