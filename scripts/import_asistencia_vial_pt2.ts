import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const perfilesGerenciaPrevencionPt2 = [
  {
    title: 'Coordinador Operativo de Asistencia Vial',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: [
      'Conocimientos en metodologías de operación por procesos, calidad y mejora continua.',
      'Conocimientos sobre esquemas de control de stock.',
      'Conocimientos plataforma GLM.',
      'Contrato de Concesión.',
      'Política de Gestión Integrada.',
      'Sensibilización de las normas IRAM- ISO 9001:2015 y 39001:2012.',
      'Alcance, estructura y funcionamiento del SGCySV.',
      'Ley Nacional de Tránsito'
    ]
  },
  {
    title: 'Administrativo',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: [
      'Conocimientos de esquemas de almacenamiento y control de stock.',
      'Política de Gestión Integrada.',
      'Sensibilización de las normas IRAM- ISO 9001:2015 y 39001:2012.',
      'Ley Nacional de Tránsito',
      'Reglamento del Usuario y Explotación',
      'Manual para Solución de Contingencias.',
      'Instrucciones de Trabajo relacionadas con la Seguridad Vial (ITAU/04/05).',
      'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1',
      'Norma de Seguridad Vial AUBASA – ITAU/04/05-A2'
    ]
  },
  {
    title: 'Chofer de Asistencia Vial',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: [
      'Conocimiento de Manejo Seguro.',
      'Conocimiento de materiales peligrosos.',
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
    title: 'Chofer de Balizamiento',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: [
      'Conocimiento de Manejo Seguro.',
      'Conocimiento de materiales peligrosos.',
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
    title: 'Analista Estadístico de Asistencia Vial',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: [
      'Conocimientos en metodología de procesos, calidad y mejora continua.',
      'Contrato de Concesión. Clausula segunda- 2.1.1 – 2.1.13-Clausula Decima -10.1 al 10.7',
      'Reglamento del Usuario. Art 1-2-5-6-10',
      'Reglamento de Explotación. Art 1-2-3-6-7-17',
      'Ley Nacional de Tránsito. Art.29-40-42-46-47-48',
      'Manual para la Solución de Contingencias',
      'Política de Gestión Integrada',
      'Sensibilización de las Normas IRAM-ISO:2015 /39001:2012',
      'Instructivos de Trabajo Detección de Alertas y Atención de Contingencias – ITAU',
      'Instructivo de Trabajo – ITAU 04/04, 04/05 Y 04/06'
    ]
  }
];

async function seedProfiles() {
  for (const profile of perfilesGerenciaPrevencionPt2) {
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
