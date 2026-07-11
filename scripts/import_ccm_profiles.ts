import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const uniqueReqs = (list: string[]) => {
  return Array.from(new Set(list.map(l => l.trim()))).filter(l => l.length > 0);
};

const perfilesCCM = [
  {
    title: 'Supervisor del Centro de Control y Monitoreo',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: uniqueReqs([
      'Poseer experiencia en puestos de operadores de Asistencia Vial.',
      'Ley Nacional de Tránsito.',
      'Política de Gestión Integrada.',
      'Gestión del Riesgo',
      'Inducción a la Higiene y Seguridad',
      'Manual para la Solución de Contingencias.',
      'ITAU/04/07 Gestión del Tránsito',
      'ITAU/04/04 Detección de Alertas y atención de Contingencias',
      'ITAU/04/05 Gestión de la Seg Vial',
      'PAU/05 – Comunicación Interna',
      'Ley Nacional de Tránsito. Art 29 – 40 – 42 – 46 – 47 - 48',
      'Manual para la Solución de Contingencias Rev.00.',
      'ITAU/04/07 Gestión del Tránsito Rev.04 Anexos 1 -1.1 – 2-3-4-5-5.1-6.',
      'ITAU/04/04 Detección de Alertas y atención de Contingencias Rev.00 Anexo 1',
      'ITAU/04/05 Gestión de la Seg Vial Rev.03 Anexo 2 Manual de Seguridad Vial',
      'PAU/05 – Comunicación Interna Rev.01 Punto 4.4 al 4.4.3.9',
      'ITAU 04/05 Anexo 1 Procedimiento Investigación de accidentes personal propio y de Contratistas.'
    ])
  },
  {
    title: 'Operador del Centro de Control y Monitoreo',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: uniqueReqs([
      'Política de Gestión Integrada.',
      'Gestión del Riesgo',
      'Inducción a la Higiene y Seguridad',
      'Ley Nacional de Tránsito. Art 29 – 40 – 42 – 46 – 47 – 48',
      'Manual para la Solución de Contingencias.',
      'ITAU/04/07 Rev.04 Anexos 1 -1.1 – 2-3-4-5-5.1-6.',
      'ITAU/04/04 Rev.00 Anexo 1',
      'ITAU/04/05 Rev.03 Anexo 2',
      'PAU/05 – Rev.01 Comunicación Interna Punto 4.4 al 4.4.3.9',
      'PAU 08 - Mejora',
      'PAU 07 - Indicadores de Gestión',
      'Contrato de Concesión Clau segunda 2,1 - 2.1.1 - 13 - Clau decima - 10.1 al 10.7',
      'Reglamento del Usuario Art 1 - 2 - 5 - 6 - 10',
      'Introducción norma IRAM – ISO 9001 e ISO 39001',
      'ITAU 04/07 Rev.04 Gestión del tránsito Anexos 1- 1.1 -2-3-4-5-5.1-6',
      'ITAU 04/04 Rev.00 Detección de alertas y atención de contingencias Anexo 1',
      'ITAU 04/05 Rev.03 Gestión de la SV Anexo 2 Manual de Seguridad Vial',
      'ITAU 04/05 Anexo 1 Procedimiento Investigación de accidentes personal propio y de Contratistas.'
    ])
  },
  {
    title: 'Coordinador del Centro de Control y Monitoreo',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: uniqueReqs([
      'Poseer experiencia en tareas administrativas generales',
      'Ley Nacional de Tránsito.',
      'Política de Gestión Integrada.',
      'Gestión del Riesgo',
      'Inducción a la Higiene y Seguridad',
      'Manual para la Solución de Contingencias',
      'ITAU/04/07 Gestión del Tránsito',
      'ITAU/04/04 Detección de Alertas y atención de Contingencias',
      'ITAU/04/05 Gestión de la Seg Vial',
      'PAU/05 – Comunicación Interna',
      'PAU 08 - Mejora',
      'PAU 07 - Indicadores de Gestión',
      'Ley Nacional de Tránsito 24449 Art. 29-40-42-46-47-48',
      'Contrato de Concesión Clau segunda 2,1 - 2.1.1 - 13 - Clau decima - 10.1 al 10.7',
      'Reglamento del Usuario Art 1 - 2 - 5 - 6 - 10',
      'Introducción norma IRAM – ISO 9001 e ISO 39001',
      'Manual para la Solución de Contingencias Rev.00',
      'ITAU 04/07 Rev.04 Gestión del tránsito Anexos 1- 1.1 -2-3-4-5-5.1-6',
      'ITAU 04/04 Rev.00 Detección de alertas y atención de contingencias Anexo 1',
      'ITAU 04/05 Rev.03 Gestión de la SV Anexo 2 Manual de Seguridad Vial',
      'PAU/05 Comunicación Interna –Rev.01 Punto 4.4 al 4.4.3.9',
      'ITAU 04/05 Anexo 1 Procedimiento Investigación de accidentes personal propio y de Contratistas.'
    ])
  },
  {
    title: 'Jefe del Centro de Control y Monitoreo',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: uniqueReqs([
      'Poseer experiencia en áreas relacionadas con Seguridad Vial, preferentemente en la operación de redes viales.',
      'Experiencia comprobable en la gestión de redes de video vigilancia.',
      'Preferente experiencia en sistemas TI',
      'Ley Nacional de Tránsito 24449',
      'Contrato de Concesión',
      'Reglamento del Usuario',
      'Política de Gestión Integrada.',
      'Introducción norma IRAM – ISO 9001 e ISO 39001',
      'Gestión del Riesgo',
      'Inducción a la Higiene y Seguridad',
      'Manual para la Solución de Contingencias',
      'ITAU 04/07 - Gestión del tránsito',
      'ITAU 04/04 - Detección de alertas y atención de contingencias',
      'ITAU 04/05 - Gestión de la SV',
      'PAU/05 Comunicación Interna',
      'PAU 07 - Indicadores de Gestión',
      'Ley Nacional de Tránsito 24449 Art. 29-40-42-46-47-48',
      'Contrato de Concesión Clau segunda 2,1 - 2.1.1 - 13 - Clau decima - 10.1 al 10.7',
      'Reglamento del Usuario Art 1 - 2 - 5 - 6 - 10',
      'Manual para la Solución de Contingencias Rev.00',
      'ITAU 04/04 Rev.00 Detección de alertas y atención de contingencias Anexo 1',
      'ITAU 04/05 Rev.03 Gestión de la SV Anexo 2 Manual de Seguridad Vial',
      'PAU/05 Comunicación Interna –Rev.01 Punto 4.4 al 4.4.3.9',
      'ITAU 04/05 Anexo 1 Procedimiento Investigación de accidentes personal propio y de Contratistas.',
      'PAU 08 - Rev. 01 Mejora'
    ])
  },
  {
    title: 'Administrativo del Centro de Control y Monitoreo',
    gerencia: 'Prevención y Seguridad Integral',
    conocimientosEsp: uniqueReqs([
      'Poseer experiencia en tareas administrativas generales',
      'Ley Nacional de Tránsito',
      'Política de Gestión Integrada.',
      'Gestión del Riesgo',
      'Inducción a la Higiene y Seguridad',
      'Ley Nacional de Tránsito 24449 Art. 29-40-42-46-47-48',
      'ITAU 04/05 Rev.03 Gestión de la SV Anexo 2 Manual de Seguridad Vial',
      'PAU/05 Rev.01 Punto 4.4 al 4.4.3.9 –(comunicación interna)',
      'PAU/05 Anexo 4 – (Control de Botiquines) -Anexo 3 – 3.9 (Extinción de incendios - matafuegos)'
    ])
  }
];

async function seedProfiles() {
  for (const profile of perfilesCCM) {
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
