import { prisma } from "./prisma";

export interface OnlineFormQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  points?: number; // Puntaje de la pregunta (la suma total del formulario no supera 10)
}

export interface OnlineTrainingForm {
  id: string;
  title: string;
  description: string;
  trainingName: string;
  objective: string;
  instructorName: string;
  instructorSignatureMode?: "digital" | "link"; // "digital" (automática) o "link" (firma manuscrita vía enlace)
  instructorSignature?: string | null; // Firma manuscrita del instructor guardada vía link para todas las planillas
  ownerSectorName: string | null; // null = Global (SGI / RRHH / ADMIN), o nombre del sector propietario
  createdByRole: string;
  createdAt: string;
  videoUrl?: string | null; // URL de video (YouTube, Vimeo, Google Drive, MP4)
  pdfUrl?: string | null; // URL de documento PDF de lectura obligatoria
  pdfName?: string | null; // Nombre original o descripción del archivo PDF
  questions: OnlineFormQuestion[];
}

export function normalizeTrainingStr(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanTrainingTopic(s: string): string {
  return normalizeTrainingStr(s)
    .replace(/\baubasa\b/g, "")
    .replace(/\bcapacitacion\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isOnlineTrainingMatch(a: string, b: string): boolean {
  const normA = cleanTrainingTopic(a);
  const normB = cleanTrainingTopic(b);
  if (!normA || !normB) return false;
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

const SETTING_KEY = "online_training_forms_v1";
const INSTRUCTOR_SIG_MAP_KEY = "training_instructor_signatures_v1";

export interface SavedInstructorSignatureInfo {
  instructorName: string;
  instructorSignature: string;
  mode: "digital" | "link";
  updatedAt: string;
}

export async function getTrainingInstructorSignaturesMap(): Promise<
  Record<string, SavedInstructorSignatureInfo>
> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { id: INSTRUCTOR_SIG_MAP_KEY }
    });
    if (!setting?.value) return {};
    const parsed = JSON.parse(setting.value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveTrainingInstructorSignatureForTopic(
  trainingName: string,
  info: SavedInstructorSignatureInfo
): Promise<void> {
  const key = cleanTrainingTopic(trainingName);
  if (!key) return;
  try {
    const map = await getTrainingInstructorSignaturesMap();
    map[key] = info;
    await prisma.appSetting.upsert({
      where: { id: INSTRUCTOR_SIG_MAP_KEY },
      update: { value: JSON.stringify(map) },
      create: {
        id: INSTRUCTOR_SIG_MAP_KEY,
        value: JSON.stringify(map),
        description: "Firmas de instructores por tema de capacitación"
      }
    });
  } catch (e) {
    console.warn("Error guardando firma global de instructor por tema:", e);
  }
}

export async function getSavedInstructorSignatureForTopic(
  trainingName: string
): Promise<SavedInstructorSignatureInfo | null> {
  const key = cleanTrainingTopic(trainingName);
  if (!key) return null;
  const map = await getTrainingInstructorSignaturesMap();
  if (map[key]) return map[key];
  for (const [k, val] of Object.entries(map)) {
    if (k.includes(key) || key.includes(k)) {
      return val;
    }
  }
  return null;
}

const DEFAULT_MANUAL_FORM: OnlineTrainingForm = {
  id: "manual-uso-sgcysv",
  title: "Capacitación: Uso del Sistema de Gestión de Competencia y Formación — AUBASA",
  description:
    "Cuestionario de validación sobre el Manual de Uso del Sistema de Gestión de Competencia y Formación (SGCySV - AUBASA). Al enviarlo, quedará registrada automáticamente tu calificación y firma en el Registro de Asistencia.",
  trainingName: "Uso del Sistema de Gestión de Competencia y Formación",
  objective:
    "Que el personal conozca el funcionamiento integral de la aplicación, la planificación anual por sector/puesto/persona, la gestión de evaluaciones iniciales, el registro de firmas y la evaluación de la eficacia.",
  instructorName: "Montes Sergio (Leg. 11739)",
  instructorSignatureMode: "digital",
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
      correctIndex: 1,
      points: 2
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
      correctIndex: 1,
      points: 2
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
      correctIndex: 0,
      points: 2
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
      correctIndex: 1,
      points: 2
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
      correctIndex: 1,
      points: 2
    }
  ]
};

export async function migrateSgiInstructorRecordsToMontesSergio() {
  // Deprecated: No-op para respetar la jerarquía de instructores por sector.
}

export async function getAllOnlineForms(): Promise<OnlineTrainingForm[]> {
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
      if (
        f.id === "manual-uso-sgcysv" &&
        (!f.instructorName || f.instructorName.toLowerCase().includes("sgi"))
      ) {
        f.instructorName = "Montes Sergio (Leg. 11739)";
        updated = true;
      }
      // Asegurar que las preguntas tengan puntaje por defecto si no tenían
      if (Array.isArray(f.questions) && f.questions.length > 0) {
        const hasMissingPoints = f.questions.some((q) => typeof q.points !== "number");
        if (hasMissingPoints) {
          const defaultPts = Number((10 / f.questions.length).toFixed(2));
          f.questions = f.questions.map((q) => ({
            ...q,
            points: typeof q.points === "number" ? q.points : defaultPts
          }));
        }
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
      !f.ownerSectorName ||
      Boolean(f.ownerSectorName && allowedSectors.includes(f.ownerSectorName))
  );
}
