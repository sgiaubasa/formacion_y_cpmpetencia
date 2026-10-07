import { prisma } from "./prisma";
import { buildSvgSignatureDataUri } from "@/app/api/webhooks/microsoft-forms/route";

export interface OnlineFormQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface OnlineTrainingForm {
  id: string;
  title: string;
  description: string;
  trainingName: string;
  objective: string;
  instructorName: string;
  ownerSectorName: string | null; // null = Global (SGI / RRHH / ADMIN), o nombre del sector propietario
  createdByRole: string;
  createdAt: string;
  questions: OnlineFormQuestion[];
}

const SETTING_KEY = "online_training_forms_v1";

const DEFAULT_MANUAL_FORM: OnlineTrainingForm = {
  id: "manual-uso-sgcysv",
  title: "Capacitación: Uso del Sistema de Gestión de Competencia y Formación — AUBASA",
  description:
    "Cuestionario de validación sobre el Manual de Uso del Sistema de Gestión de Competencia y Formación (SGCySV - AUBASA). Al enviarlo, quedará registrada automáticamente tu calificación y firma digital de realización.",
  trainingName: "Uso del Sistema de Gestión de Competencia y Formación",
  objective:
    "Que el personal conozca el funcionamiento integral de la aplicación, la planificación anual por sector/puesto/persona, la gestión de evaluaciones iniciales, el registro de firmas y la evaluación de la eficacia.",
  instructorName: "Montes Sergio (Leg. 11739)",
  ownerSectorName: null,
  createdByRole: "SGI",
  createdAt: new Date().toISOString(),
  questions: [
    {
      id: "q1",
      question:
        "¿De qué maneras permite la aplicación planificar una capacitación dentro del Plan Anual?",
      options: [
        "Únicamente cargando persona por persona de forma individual.",
        "Por Sector completo, por Puesto (Perfil de Puesto) o por Persona en particular.",
        "Solo a través de planillas impresas fuera del sistema."
      ],
      correctIndex: 1
    },
    {
      id: "q2",
      question:
        "Cuando llega una Evaluación Inicial por Cambio de Puesto o Transferencia con brechas detectadas, ¿qué debe hacer el sector receptor y qué plazo máximo tiene para liberar a la persona al puesto?",
      options: [
        "No debe hacer nada hasta el año siguiente.",
        "Confirmar la transferencia en el sistema, programar obligatoriamente las fechas de las capacitaciones faltantes y completar su realización y eficacia en un plazo máximo de 90 días (3 meses).",
        "Tiene un plazo de 1 año sin necesidad de programar fechas."
      ],
      correctIndex: 1
    },
    {
      id: "q3",
      question:
        "Al programar una capacitación en el sistema, ¿qué debemos indicar en el campo 'Objetivo de la Capacitación'?",
      options: [
        "Qué buscamos lograr con esa capacitación (por ejemplo: que conozca la norma, que aplique la Política del SGI o que lleve adelante un procedimiento específico relacionado con su trabajo).",
        "El lugar físico donde se va a dictar la charla.",
        "Únicamente la cantidad de horas de duración."
      ],
      correctIndex: 0
    },
    {
      id: "q4",
      question:
        "¿Cuáles son las opciones válidas en el sistema para dejar registrado el respaldo de firmas y pasar una capacitación de 'Programado' a 'Realizado'?",
      options: [
        "Solo escaneando una hoja en papel.",
        "Cualquiera de las modalidades habilitadas: 1) Adjuntar el documento/planilla firmada en la solapa de evidencia, 2) Firmar en el momento con la aplicación abierta en celular o PC, 3) Enviar el enlace (link) por Mail o WhatsApp, o 4) Formulario Online / Excel de Microsoft Forms.",
        "No hace falta registrar firmas ni evidencia."
      ],
      correctIndex: 1
    },
    {
      id: "q5",
      question:
        "¿Cómo se debe realizar correctamente la Evaluación de la Eficacia de una capacitación realizada?",
      options: [
        "Volviendo a tomarle el mismo examen escrito al día siguiente.",
        "Verificando en el puesto de trabajo (dentro del plazo de seguimiento) si la persona cumple con el Objetivo fijado para esa capacitación, redactando una breve descripción de que posee los conocimientos y lleva adelante el trabajo como corresponde, y marcándola como Eficaz.",
        "Marcando 'Eficaz' sin escribir ninguna descripción ni revisar el objetivo."
      ],
      correctIndex: 1
    }
  ]
};

export async function migrateSgiInstructorRecordsToMontesSergio() {
  try {
    const sgiRecords = await prisma.employeeTrainingRecord.findMany({
      where: {
        instructorName: { contains: "SGI", mode: "insensitive" }
      }
    });

    for (const r of sgiRecords) {
      const dateFormatted = (r.completedAt ? new Date(r.completedAt) : new Date()).toLocaleDateString("es-AR");
      const newSig = buildSvgSignatureDataUri(
        "Montes Sergio",
        "Legajo 11739 — Instructor SGI AUBASA",
        `Fecha: ${dateFormatted}`
      );
      await prisma.employeeTrainingRecord.update({
        where: { id: r.id },
        data: {
          instructorName: "Montes Sergio (Leg. 11739)",
          instructorSignature: newSig
        }
      });
    }
  } catch {
    // Ignorar errores silenciosamente
  }
}

export async function getAllOnlineForms(): Promise<OnlineTrainingForm[]> {
  await migrateSgiInstructorRecordsToMontesSergio();

  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: SETTING_KEY }
    });

    if (!setting?.value) {
      const initial = [DEFAULT_MANUAL_FORM];
      await prisma.appSetting.upsert({
        where: { id: SETTING_KEY },
        update: { value: JSON.stringify(initial) },
        create: {
          id: SETTING_KEY,
          value: JSON.stringify(initial),
          description: "Formularios de capacitación online integrados en la aplicación"
        }
      });
      return initial;
    }

    const parsed: OnlineTrainingForm[] = JSON.parse(setting.value);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_MANUAL_FORM];
    }

    let updated = false;
    for (const f of parsed) {
      if (!f.instructorName || f.instructorName.toLowerCase().includes("sgi")) {
        f.instructorName = "Montes Sergio (Leg. 11739)";
        updated = true;
      }
    }

    if (updated) {
      await prisma.appSetting.update({
        where: { id: SETTING_KEY },
        data: { value: JSON.stringify(parsed) }
      });
    }

    return parsed;
  } catch {
    return [DEFAULT_MANUAL_FORM];
  }
}

export async function saveAllOnlineForms(forms: OnlineTrainingForm[]): Promise<void> {
  await prisma.appSetting.upsert({
    where: { id: SETTING_KEY },
    update: { value: JSON.stringify(forms) },
    create: {
      id: SETTING_KEY,
      value: JSON.stringify(forms),
      description: "Formularios de capacitación online integrados en la aplicación"
    }
  });
}

export async function getOnlineFormsForSector(
  allowedSectors: string[] | null
): Promise<OnlineTrainingForm[]> {
  const all = await getAllOnlineForms();
  if (!allowedSectors || allowedSectors.length === 0) {
    return all;
  }
  return all.filter(
    (f) =>
      f.id === "manual-uso-sgcysv" ||
      (f.ownerSectorName && allowedSectors.includes(f.ownerSectorName))
  );
}
