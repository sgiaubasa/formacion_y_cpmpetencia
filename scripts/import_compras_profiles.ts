import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const perfilesGerenciaCompras = [
  {
    title: 'Responsable de Licitaciones',
    gerencia: 'Gerencia de Compras',
    conocimientosEsp: [
      'Conocimiento en Sistemas de gestión.',
      'Contrato de Concesión de AUBASA',
      'Reglamento de explotación.',
      'Reglamento de usuario.',
      'Reglamento General de Contrataciones de Autopistas de Buenos y Aires.',
      'Manual de procedimiento de compras.',
      'Pliego de Bases y Condiciones Generales de AUBASA',
      'Disposiciones del Decreto – Ley N° 7647/70, la Ley N° 6021 y la Ley N° 13767, sus normas reglamentarias, complementarias y las que en el futuro la reemplacen.',
      'Introducción a las normas IRAM-ISO 9001:2015 y 39001:2012.',
      'Política de Gestión Integrada.',
      'Instrucciones de Trabajo relacionadas con la Seguridad Vial (ITAU/04/05).',
      'Mejora PAU/08, No conformidades y Plan de Mejoras.',
      'Ley Nacional de Tránsito N°24449 Decreto N° 32/2018 Certificado de homologación de autopartes de seguridad (C.H.A.S.).',
      'Evaluación del Desempeño PAU/07_Anexo 3 Indicadores de Gestión / Anexo 4 Plan de Auditoría Interna.',
      'Manual de Procedimiento de Evaluación de Proveedores (PAU/06- A I).',
      'Inducción de seguridad e higiene.',
      'Sistema de gestión GLM.',
      'Planificación PAU/04_anexo 02, Gestión de riesgos y oportunidades.'
    ]
  },
  {
    title: 'Analista de Compras',
    gerencia: 'Gerencia de Compras',
    conocimientosEsp: [
      'Conocimiento en Sistemas de gestión.',
      'Contrato de Concesión de AUBASA',
      'Reglamento de explotación.',
      'Reglamento de usuario.',
      'Reglamento General de Contrataciones de Autopistas de Buenos y Aires.',
      'Manual de procedimiento de compras menores.',
      'Manual de Procedimiento de Evaluación de Proveedores (PAU/06- A I)',
      'Pliego de Bases y Condiciones Generales de AUBASA',
      'Disposiciones del Decreto – Ley N° 7647/70, la Ley N° 6021 y la Ley N° 13767, sus normas reglamentarias, complementarias y las que en el futuro la reemplacen.',
      'Introducción a las normas IRAM-ISO 9001:2015 y 39001:2012.',
      'Política de Gestión Integrada.',
      'Instrucciones de Trabajo relacionadas con la Seguridad Vial (ITAU/04/05).',
      'Mejora PAU/08, No conformidades y Plan de Mejoras.',
      'Ley Nacional de Tránsito N°24449 Decreto N° 32/2018 Certificado de homologación de autopartes de seguridad (C.H.A.S.).',
      'Inducción de seguridad e higiene.',
      'Sistema de gestión GLM.',
      'Planificación PAU/04_anexo 02, Gestión de riesgos y oportunidades.'
    ]
  },
  {
    title: 'Coordinador de Contrataciones menores',
    gerencia: 'Gerencia de Compras',
    conocimientosEsp: [
      'Conocimiento en Sistemas de gestión.',
      'Contrato de Concesión de AUBASA',
      'Reglamento de explotación.',
      'Reglamento de usuario.',
      'Reglamento General de Contrataciones de Autopistas de Buenos y Aires.',
      'Manual de procedimiento de compras menores.',
      'Pliego de Bases y Condiciones Generales de AUBASA',
      'Disposiciones del Decreto – Ley N° 7647/70, la Ley N° 6021 y la Ley N° 13767, sus normas reglamentarias, complementarias y las que en el futuro la reemplacen.',
      'Introducción a las normas IRAM-ISO 9001:2015 y 39001:2012.',
      'Política de Gestión Integrada.',
      'Instrucciones de Trabajo relacionadas con la Seguridad Vial (ITAU/04/05).',
      'Mejora PAU/08, No conformidades y Plan de Mejoras.',
      'Ley Nacional de Tránsito N°24449 Decreto N° 32/2018 Certificado de homologación de autopartes de seguridad (C.H.A.S.).',
      'Evaluación del Desempeño PAU/07_Anexo 3 Indicadores de Gestión / Anexo 4 Plan de Auditoría Interna.',
      'Manual de Procedimiento de Evaluación de Proveedores (PAU/06- A I).',
      'Inducción de seguridad e higiene.',
      'Sistema de gestión GLM.',
      'Planificación PAU/04_anexo 02, Gestión de riesgos y oportunidades.'
    ]
  },
  {
    title: 'Jefe/a de Compras',
    gerencia: 'Gerencia de Compras',
    conocimientosEsp: [
      'Conocimiento en Sistemas de gestión.',
      'Contrato de Concesión de AUBASA',
      'Reglamento de explotación.',
      'Reglamento de usuario.',
      'Reglamento General de Contrataciones de Autopistas de Buenos y Aires.',
      'Manual de procedimiento de compras.',
      'Pliego de Bases y Condiciones Generales de AUBASA',
      'Disposiciones del Decreto – Ley N° 7647/70, la Ley N° 6021 y la Ley N° 13767, sus normas reglamentarias, complementarias y las que en el futuro la reemplacen.',
      'Introducción a las normas IRAM-ISO 9001:2015 y 39001:2012.',
      'Política de Gestión Integrada.',
      'Instrucciones de Trabajo relacionadas con la Seguridad Vial (ITAU/04/05).',
      'Mejora PAU/08, No conformidades y Plan de Mejoras.',
      'Ley Nacional de Tránsito N°24449 Decreto N° 32/2018 Certificado de homologación de autopartes de seguridad (C.H.A.S.).',
      'Evaluación del Desempeño PAU/07_Anexo 3 Indicadores de Gestión / Anexo 4 Plan de Auditoría Interna.',
      'Manual de Procedimiento de Evaluación de Proveedores (PAU/06- A I).',
      'Inducción de seguridad e higiene.',
      'Planificación PAU/04_anexo 02, Gestión de riesgos y oportunidades.'
    ]
  }
];

async function seedProfiles() {
  for (const profile of perfilesGerenciaCompras) {
    const conocimientosString = profile.conocimientosEsp.join('\n');
    
    // Check if a profile with similar title exists to update, else create
    // Many times, Excel has trailing spaces or different casing
    const existing = await prisma.jobProfile.findFirst({
      where: {
        title: {
          contains: profile.title.split(' ')[0] // e.g. "Responsable", "Analista"
        }
      }
    });

    // To be precise:
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
