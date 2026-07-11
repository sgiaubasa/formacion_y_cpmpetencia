const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const profiles = [
  {
    "codigo": "PAU/03-A2",
    "revision": "02",
    "fecha_revision": "2025-02-14",
    "denominacion_puesto": "Gerente de Mantenimiento (GMA)",
    "gerencia": "Gerencia de Mantenimiento",
    "reporta_a": "Coordinador General Operativo (CGO)",
    "supervisa_a": ["Jefe de Taller (JTA)"],
    "objetivo_puesto": "Gestionar los recursos humanos, técnicos y materiales para gestionar los programas de mantenimiento preventivo, correctivo y predictivo de la operación de la infraestructura y equipo de la organización, de acuerdo con los estándares, políticas, procedimientos y criterios de calidad, ambientales y de seguridad establecidos.",
    "educacion_nivel": "Universitario",
    "orientacion_tecnica": "Ingeniero Civil, vías de comunicación, electromecánico.",
    "requiere_idioma": true,
    "aclaracion_idioma": "Conocimientos básicos de Ingles.",
    "tics_conocimientos_basicos": ["Herramientas de Gestión", "Herramientas Informáticas Especiales (MS Word, MS Excel, MS PowerPoint)"],
    "conocimientos_necesarios": [
      "Planes de mantenimiento preventivo, correctivo y predictivo.",
      "Gestión de personal técnico y contratistas.",
      "Política de Gestión Integrada.",
      "Introducción a las normas IRAM-ISO 9001:2015 y 39001:2012.",
      "Presupuestación y control de gastos del sector."
    ],
    "disponibilidad_turnos": false,
    "requiere_experiencia": true,
    "anios_experiencia": "",
    "administra_personal": true,
    "cantidad_personal_cargo": "Más de 50 personas",
    "aspectos_personales_actitudinales": ["Relaciones Interpersonales", "Control", "Flexibilidad", "Organización", "Capacidad de Trabajo en Equipo", "Capacidad de Análisis", "Liderazgo"],
    "funciones_responsabilidades": [
      "Dirigir las áreas de mantenimiento en la empresa: Espacios Verdes, Mantenimiento Eléctrico, Mantenimiento de Aire Acoplado, Mantenimiento Edilicio y Vial, Taller mecánico, apoyando de los ingenieros respectivos por cada área.",
      "Coordinar los procesos de mantenimiento preventivo y correctivo para la maquinaria y la infraestructura de la empresa.",
      "Coordinar y evaluar los trabajos del personal contratista, supervisando la calidad de los materiales y la correcta aplicación de las especificaciones del contrato.",
      "Seguimiento y generación de informes para la gerencia y dirección.",
      "Elaborar el presupuesto de gastos de la gerencia a su cargo."
    ]
  },
  {
    "codigo": "PAU/03-A2",
    "revision": "02",
    "fecha_revision": "2025-02-14",
    "denominacion_puesto": "Coordinador General de Mantenimiento (CMA)",
    "gerencia": "Gerencia de Mantenimiento",
    "reporta_a": "Gerente de Mantenimiento (GMA)",
    "supervisa_a": ["Jefe de Taller (JTA)"],
    "objetivo_puesto": "Gestionar los recursos humanos, técnicos y materiales para gestionar los programas de mantenimiento preventivo, correctivo y predictivo de la operación de la infraestructura y equipo de la organización, de acuerdo con los estándares, políticas, procedimientos y criterios de calidad, ambientales y de seguridad establecidos.",
    "educacion_nivel": "Universitario",
    "orientacion_tecnica": "Ingeniero Civil, vías de comunicación, electromecánico.",
    "requiere_idioma": true,
    "aclaracion_idioma": "Conocimientos básicos de Ingles.",
    "tics_conocimientos_basicos": ["Herramientas de Gestión", "Herramientas Informáticas Especiales (MS Word, MS Excel, MS PowerPoint)"],
    "conocimientos_necesarios": [
      "Planes de mantenimiento preventivo, correctivo y predictivo corporativos.",
      "Evaluación y supervisión de prestadores y contratistas externos.",
      "Política de Gestión Integrada.",
      "Introducción a las normas IRAM-ISO 9001:2015 y 39001:2012."
    ],
    "disponibilidad_turnos": false,
    "requiere_experiencia": true,
    "anios_experiencia": "",
    "administra_personal": true,
    "cantidad_personal_cargo": "Más de 50 personas",
    "aspectos_personales_actitudinales": ["Relaciones Interpersonales", "Control", "Flexibilidad", "Organización", "Capacidad de Trabajo en Equipo", "Capacidad de Análisis", "Liderazgo"],
    "funciones_responsabilidades": [
      "Coordinar las áreas de mantenimiento en la empresa: Espacios Verdes, Mantenimiento Eléctrico, Mantenimiento de Aire Acondicionado, Mantenimiento Edilicio y Vial, Taller mecánico, apoyando de los ingenieros respectivos por cada área.",
      "Coordinar los procesos de mantenimiento preventivo y correctivo para la maquinaria y la infraestructura de la empresa.",
      "Evaluar los trabajos del personal contratista, supervisando la calidad de los materiales y la correcta aplicación de las especificaciones del contrato.",
      "Seguimiento y generación de informes para la gerencia de mantenimiento.",
      "Planificar el presupuesto de gastos de la gerencia de mantenimiento."
    ]
  },
  {
    "codigo": "PAU/03-A2",
    "revision": "02",
    "fecha_revision": "2025-02-14",
    "denominacion_puesto": "Jefe de Taller (JTA)",
    "gerencia": "Gerencia de Mantenimiento",
    "reporta_a": "Gerente de Mantenimiento (GMA)",
    "supervisa_a": ["Supervisor Taller (STA)", "Supervisor de Pañol de Taller (SPT)", "Administrativa (ADT)"],
    "objetivo_puesto": "Facilitar los recursos y apoyo para un adecuado funcionamiento del taller asegurando el mantenimiento de los vehículos, equipos y maquinarias de la unidad de negocio BALP conforme la calidad definida por AUBASA.",
    "educacion_nivel": "Universitario",
    "orientacion_tecnica": "Experiencia en Planes de Mantenimiento Preventivo y Correctivo en Vehículos, Máquinas y Equipos. Conocimiento en la gestión de stock.",
    "requiere_idioma": false,
    "aclaracion_idioma": "",
    "tics_conocimientos_basicos": ["Herramientas de Gestión", "Herramientas Informáticas Especiales (MS Word, MS Excel, MS PowerPoint)"],
    "conocimientos_necesarios": [
      "Modelos de planificación y mantenimiento automotor/industrial.",
      "Control de presupuestos y costos operativos del taller.",
      "Política de Gestión Integrada.",
      "Introducción a las normas IRAM-ISO 9001:2015 y 39001:2012."
    ],
    "disponibilidad_turnos": false,
    "requiere_experiencia": true,
    "anios_experiencia": "",
    "administra_personal": true,
    "cantidad_personal_cargo": "Hasta 20 personas",
    "aspectos_personales_actitudinales": ["Relaciones Interpersonales", "Control", "Flexibilidad", "Organización", "Capacidad de Trabajo en Equipo", "Capacidad de Análisis", "Liderazgo"],
    "funciones_responsabilidades": [
      "Asegurar la prestación adecuada de los servicios ofrecidos a las diferentes áreas de la empresa.",
      "Es responsable de la Administración de los recursos humanos y materiales asignados al funcionamiento del taller.",
      "Proponer e impulsar todos los cambios operativos que considere de importancia para mejorar el servicio prestado por la empresa.",
      "Propiciar el trabajo en equipo, manteniendo una comunicación abierta y participativa, colaborando y orientando en la gestión de los supervisores y administrativos.",
      "Verificar y controlar que el mantenimiento preventivo y correctivo a su cargo se cumpla en tiempo y forma asegurando buenas condiciones de seguridad, informando al Gerente de Mantenimiento las deficiencias que pudieran ser advertidas.",
      "Controlar los gastos del sector."
    ]
  },
  {
    "codigo": "PAU/03-A2",
    "revision": "02",
    "fecha_revision": "2025-02-14",
    "denominacion_puesto": "Supervisor Taller (STA)",
    "gerencia": "Gerencia de Mantenimiento",
    "reporta_a": "Jefe de Taller (JTA)",
    "supervisa_a": ["Herrero (HER)", "Electricista (ETM)", "Mecánico (MEC)"],
    "objetivo_puesto": "Gestionar los recursos humanos y materiales a su cargo brindando transparencia, confiabilidad, seguridad y fluidez a la parte operativa del taller.",
    "educacion_nivel": "Terciario",
    "orientacion_tecnica": "Mecánica / electromecánica (deseable)",
    "requiere_idioma": false,
    "aclaracion_idioma": "",
    "tics_conocimientos_basicos": ["Herramientas de Gestión", "Herramientas Informáticas Especiales (MS Word, MS Excel, MS PowerPoint)"],
    "conocimientos_necesarios": [
      "Mantenimiento mecánico y de flotas viales.",
      "Coordinación de personal en entornos técnicos/operativos.",
      "Normas internas de seguridad e higiene corporativas."
    ],
    "disponibilidad_turnos": false,
    "requiere_experiencia": true,
    "anios_experiencia": "",
    "administra_personal": true,
    "cantidad_personal_cargo": "Hasta 20 personas",
    "aspectos_personales_actitudinales": ["Relaciones Interpersonales", "Control", "Flexibilidad", "Organización", "Capacidad de Trabajo en Equipo", "Capacidad de Análisis", "Liderazgo"],
    "funciones_responsabilidades": [
      "Mantener informado al Jefe de Taller las 24 hs. sobre cualquier novedad relativa a la operatividad del taller.",
      "Programar y ejecutar los trabajos de mantenimiento preventivo y correctivo.",
      "Asegurar el correcto funcionamiento del taller por parte del personal a cargo.",
      "Mantener el orden y la prolijidad en el taller.",
      "Lograr el apego a las normas internas de seguridad e higiene de la empresa.",
      "Optimizar las operaciones en taller.",
      "Confección y control del 'check-in' de vehículos, maquinarias y equipos."
    ]
  },
  {
    "codigo": "PAU/03-A2",
    "revision": "02",
    "fecha_revision": "2025-02-14",
    "denominacion_puesto": "Supervisor Pañol Taller (SPT)",
    "gerencia": "Gerencia de Mantenimiento",
    "reporta_a": "Jefe de Taller (JTA)",
    "supervisa_a": ["Mecánicos (MEC)", "Electricistas (ETM)", "Herreros (HER)"],
    "objetivo_puesto": "Administrar los recursos para un adecuado funcionamiento del taller asegurando el mantenimiento de los vehículos, equipos y maquinarias de la unidad de negocio BALP conforme la calidad definida por AUBASA.",
    "educacion_nivel": "Secundario",
    "orientacion_tecnica": "Experiencia en Planes de Mantenimiento Preventivo y Correctivo en Vehículos, Máquinas y Equipos. Conocimiento en la gestión de stock.",
    "requiere_idioma": false,
    "aclaracion_idioma": "",
    "tics_conocimientos_basicos": ["Herramientas de Gestión", "Herramientas Informáticas Especiales (MS Word, MS Excel, MS PowerPoint)"],
    "conocimientos_necesarios": [
      "Técnicas de gestión, control de inventario y stock físico de pañoles.",
      "Costeo de insumos técnicos utilizados en tareas de reparación.",
      "Normas de calidad y resguardo de activos fijos."
    ],
    "disponibilidad_turnos": false,
    "requiere_experiencia": true,
    "anios_experiencia": "",
    "administra_personal": true,
    "cantidad_personal_cargo": "Hasta 20 personas",
    "aspectos_personales_actitudinales": ["Relaciones Interpersonales", "Control", "Flexibilidad", "Organización", "Capacidad de Trabajo en Equipo", "Capacidad de Análisis", "Liderazgo"],
    "funciones_responsabilidades": [
      "Propiciar el trabajo en equipo, manteniendo una comunicación abierta y participativa, colaborando con el taller.",
      "Indicar el costo del insumo utilizado en los trabajos de mantenimiento preventivo y correctivo.",
      "Verificar y controlar periódicamente el stock de insumos del pañol.",
      "Controlar ingresos y egresos de los insumos del pañol en la planilla 'control de inventario'."
    ]
  },
  {
    "codigo": "PAU/03-A2",
    "revision": "02",
    "fecha_revision": "2025-02-14",
    "denominacion_puesto": "Supervisor Administrativo",
    "gerencia": "Gerencia de Mantenimiento",
    "reporta_a": "Jefe de Taller (JTA)",
    "supervisa_a": ["Administrativo Taller Mecánico (ADT)"],
    "objetivo_puesto": "Gestionar los recursos humanos y materiales a su cargo brindando transparencia, confiabilidad y fluidez a la parte administrativa del taller.",
    "educacion_nivel": "Terciario",
    "orientacion_tecnica": "",
    "requiere_idioma": false,
    "aclaracion_idioma": "",
    "tics_conocimientos_basicos": ["Herramientas de Gestión", "Herramientas Informáticas Especiales (MS Word, MS Excel, MS PowerPoint)"],
    "conocimientos_necesarios": [
      "Procesos administrativos de compras y órdenes de pago.",
      "Control de mantenimiento, kilometrajes y pólizas de seguro de flotas.",
      "Rendición de fondos fijos y anticipos de gastos técnicos."
    ],
    "disponibilidad_turnos": false,
    "requiere_experiencia": true,
    "anios_experiencia": "",
    "administra_personal": true,
    "cantidad_personal_cargo": "Hasta 5 personas",
    "aspectos_personales_actitudinales": ["Relaciones Interpersonales", "Control", "Flexibilidad", "Organización", "Capacidad de Trabajo en Equipo", "Capacidad de Análisis"],
    "funciones_responsabilidades": [
      "Administración y archivo de la documentación de las órdenes de compras.",
      "Armar y mantener el archivo diario.",
      "Informes requeridos por superiores.",
      "Control de mantenimientos preventivos, correctivos y de kilometraje.",
      "Recepción de mails pertinentes al sector.",
      "Rendición de fondos fijos y anticipos.",
      "Solicitud de turno VTV y actualización de pólizas de seguro.",
      "Carga de comprobantes de gastos."
    ]
  },
  {
    "codigo": "PAU/03-A2",
    "revision": "02",
    "fecha_revision": "2025-02-14",
    "denominacion_puesto": "Mecánico (MEC)",
    "gerencia": "Gerencia de Mantenimiento",
    "reporta_a": "Supervisor Taller (STA)",
    "supervisa_a": ["Ayudante Mecánico (AME)"],
    "objetivo_puesto": "Encargado de la mecánica general de vehículos, máquinas y equipos.",
    "educacion_nivel": "Terciario",
    "orientacion_tecnica": "Mecánica / electromecánica (deseable)",
    "requiere_idioma": false,
    "aclaracion_idioma": "",
    "tics_conocimientos_basicos": ["Herramientas Informáticas Especiales (MS Word, MS Excel, MS PowerPoint)"],
    "conocimientos_necesarios": [
      "Conocimientos avanzados de mecánica general automotriz e industrial.",
      "Diagnóstico preventivo y correctivo de fallas de motor y tracción.",
      "Rutinas de taller aplicadas bajo estándares de mantenimiento."
    ],
    "disponibilidad_turnos": false,
    "requiere_experiencia": true,
    "anios_experiencia": "",
    "administra_personal": false,
    "cantidad_personal_cargo": 0,
    "aspectos_personales_actitudinales": ["Relaciones Interpersonales", "Control", "Flexibilidad", "Resolutivo", "Organización", "Capacidad de Trabajo en Equipo", "Capacidad de Análisis"],
    "funciones_responsabilidades": [
      "Mantener en condiciones operativas vehículos, máquinas y equipos, aplicando rutinas de mantenimiento preventivo y correctivo.",
      "Diagnosticar la falla del vehículo, preventivo o correctivo evaluando y determinando en conjunto con el supervisor del taller la reparación correspondiente.",
      "Ejecutar los trabajos de taller."
    ]
  },
  {
    "codigo": "PAU/03-A2",
    "revision": "02",
    "fecha_revision": "2025-02-14",
    "denominacion_puesto": "Electricista (ETM)",
    "gerencia": "Gerencia de Mantenimiento",
    "reporta_a": "Supervisor de Taller (STA)",
    "supervisa_a": ["Ayudante Electricista (AET)"],
    "objetivo_puesto": "Gestionar el servicio de reparación y/o mantenimiento de los sistemas eléctricos / componentes electromecánicos de los vehículos, máquinas y equipos.",
    "educacion_nivel": "Terciario",
    "orientacion_tecnica": "Electrónica y electromecánica (deseable)",
    "requiere_idioma": false,
    "aclaracion_idioma": "",
    "tics_conocimientos_basicos": ["Herramientas de Gestión", "Herramientas Informáticas Especiales (MS Word, MS Excel, MS PowerPoint)"],
    "conocimientos_necesarios": [
      "Sistemas de motores eléctricos y alternadores.",
      "Interpretación técnica avanzada de diagramas y esquemas eléctricos.",
      "Principios de electrónica automotriz e industrial."
    ],
    "disponibilidad_turnos": false,
    "requiere_experiencia": true,
    "anios_experiencia": "",
    "administra_personal": false,
    "cantidad_personal_cargo": 0,
    "aspectos_personales_actitudinales": ["Relaciones Interpersonales", "Control", "Flexibilidad", "Resolutivo", "Organización", "Capacidad de Trabajo en Equipo", "Capacidad de Análisis"],
    "funciones_responsabilidades": [
      "Verificar el estado de los vehículos en condiciones eléctricas.",
      "Mantenimiento y reparación de instalación eléctrica.",
      "Interpretación de diagramas eléctricos.",
      "Diagnosticar la falla del vehículo, preventivo o correctivo evaluando y determinando en conjunto con el supervisor del taller la reparación correspondiente."
    ]
  },
  {
    "codigo": "PAU/03-A2",
    "revision": "02",
    "fecha_revision": "2025-02-14",
    "denominacion_puesto": "Herrero (HER)",
    "gerencia": "Gerencia de Mantenimiento",
    "reporta_a": "Supervisor Taller (STA)",
    "supervisa_a": ["Ayudante Herrero (AHE)"],
    "objetivo_puesto": "Gestionar el servicio de reparaciones de los vehículos, máquinas y equipos.",
    "educacion_nivel": "Terciario",
    "orientacion_tecnica": "",
    "requiere_idioma": false,
    "aclaracion_idioma": "",
    "tics_conocimientos_basicos": ["Herramientas Informáticas Especiales (MS Word, MS Excel, MS PowerPoint)"],
    "conocimientos_necesarios": [
      "Conocimiento técnico en corte, plegado y confección de metales.",
      "Manejo avanzado de máquina soldadora tipo MIG y oxicorte.",
      "Reestructuración de piezas de chasis y carrocerías de flota pesada/liviana."
    ],
    "disponibilidad_turnos": false,
    "requiere_experiencia": true,
    "anios_experiencia": "",
    "administra_personal": false,
    "cantidad_personal_cargo": 0,
    "aspectos_personales_actitudinales": ["Relaciones Interpersonales", "Control", "Flexibilidad", "Resolutivo", "Organización", "Capacidad de Trabajo en Equipo", "Capacidad de Análisis"],
    "funciones_responsabilidades": [
      "Reestructuración y reparación de piezas en general de vehículos, máquinas y equipos."
    ]
  },
  {
    "codigo": "PAU/03-A2",
    "revision": "02",
    "fecha_revision": "2025-02-14",
    "denominacion_puesto": "Ayudante Herrero (AHE)",
    "gerencia": "Gerencia de Mantenimiento",
    "reporta_a": "Herrero (HER)",
    "supervisa_a": [],
    "objetivo_puesto": "Gestionar el servicio de reparaciones de los vehículos, máquinas y equipos.",
    "educacion_nivel": "Terciario",
    "orientacion_tecnica": "",
    "requiere_idioma": false,
    "aclaracion_idioma": "",
    "tics_conocimientos_basicos": ["Herramientas de Gestión", "Herramientas Informáticas Especiales (MS Word, MS Excel, MS PowerPoint)"],
    "conocimientos_necesarios": [
      "Conocimiento básico de máquina soldadora tipo MIG y oxicorte.",
      "Política de Gestión Integrada corporativa.",
      "Introducción básica a normativas ISO viales."
    ],
    "disponibilidad_turnos": false,
    "requiere_experiencia": true,
    "anios_experiencia": "",
    "administra_personal": false,
    "cantidad_personal_cargo": 0,
    "aspectos_personales_actitudinales": ["Relaciones Interpersonales", "Control", "Flexibilidad", "Resolutivo", "Organización", "Capacidad de Trabajo en Equipo", "Capacidad de Análisis"],
    "funciones_responsabilidades": [
      "Reestructuración y reparación de piezas en general de vehículos, máquinas y equipos."
    ]
  }
];

async function main() {
  for (const p of profiles) {
    const objetivoCompleto = p.objetivo_puesto + "\n\nFUNCIONES Y RESPONSABILIDADES:\n- " + p.funciones_responsabilidades.join("\n- ");
    
    let tecnologias = [];
    if (p.tics_conocimientos_basicos.some(t => typeof t === 'string' && t.includes("Gestión"))) tecnologias.push("Basicas");
    if (p.tics_conocimientos_basicos.some(t => typeof t === 'string' && t.includes("Especiales"))) tecnologias.push("Especiales");

    const otrosConocs = p.tics_conocimientos_basicos.filter(t => !t.includes("Gestión") && !t.includes("Especiales")).join(", ");

    await prisma.jobProfile.create({
      data: {
        title: p.denominacion_puesto,
        gerencia: p.gerencia,
        reporta: p.reporta_a,
        supervisa: p.supervisa_a.join(", "),
        objetivo: objetivoCompleto,
        educacion: p.educacion_nivel,
        orientacionTecnica: p.orientacion_tecnica,
        idiomasRequiere: p.requiere_idioma,
        idiomasAclaracion: p.aclaracion_idioma,
        tecnologias: tecnologias.join(","),
        otrosConocimientos: otrosConocs,
        conocimientosEsp: p.conocimientos_necesarios.join("\n"),
        turnos: p.disponibilidad_turnos,
        experienciaReq: p.requiere_experiencia,
        experienciaAnios: p.anios_experiencia,
        adminPersonal: p.cantidad_personal_cargo === 0 ? "NO REQUIERE" : (p.cantidad_personal_cargo || "NO REQUIERE").toString().toUpperCase(),
        aspectos: p.aspectos_personales_actitudinales.join(", "),
        revision: p.revision,
        fechaRevision: p.fecha_revision,
        status: "VIGENTE", 
        isActive: true
      }
    });
    console.log("Created profile:", p.denominacion_puesto);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
