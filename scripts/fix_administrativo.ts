import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const reqSupervisor = [
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
].join('\n');

const reqAdministrativo = [
  'Conocimientos de esquemas de almacenamiento y control de stock.',
  'Política de Gestión Integrada.',
  'Sensibilización de las normas IRAM- ISO 9001:2015 y 39001:2012.',
  'Ley Nacional de Tránsito',
  'Reglamento del Usuario y Explotación',
  'Manual para Solución de Contingencias.',
  'Instrucciones de Trabajo relacionadas con la Seguridad Vial (ITAU/04/05).',
  'Respuesta a la Emergencia en Accidentes Viales – ITAU/04/05-A1',
  'Norma de Seguridad Vial AUBASA – ITAU/04/05-A2'
].join('\n');

async function fix() {
  // Fix Supervisor Administrativo
  const sup = await prisma.jobProfile.findFirst({
    where: { title: 'Supervisor Administrativo' }
  });
  if (sup) {
    await prisma.jobProfile.update({
      where: { id: sup.id },
      data: { conocimientosEsp: reqSupervisor }
    });
    console.log('Fixed Supervisor Administrativo');
  }

  // Create Administrativo
  await prisma.jobProfile.create({
    data: {
      title: 'Administrativo (AD)',
      gerencia: 'Prevención y Seguridad Integral',
      conocimientosEsp: reqAdministrativo
    }
  });
  console.log('Created Administrativo (AD)');
}

fix().catch(console.error).finally(() => prisma.$disconnect());
