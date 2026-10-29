"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole, getSectorIdFromRole } from "@/lib/auth";
import {
  getAllOnlineForms,
  saveAllOnlineForms,
  OnlineTrainingForm,
  OnlineFormQuestion,
  normalizeTrainingStr,
  isOnlineTrainingMatch,
  saveTrainingInstructorSignatureForTopic,
  getSavedInstructorSignatureForTopic
} from "@/lib/onlineForms";
import { buildSvgSignatureDataUri } from "@/app/api/webhooks/microsoft-forms/route";
import { syncRecordToPowerAutomate } from "@/lib/powerAutomate";
import { getDefaultInstructorForSector } from "@/lib/instructorDefaults";
import { revalidatePath } from "next/cache";

export async function createOnlineFormAction(payload: {
  id?: string; // Si viene id, edita el formulario existente
  title: string;
  description: string;
  trainingName: string;
  objective: string;
  instructorName: string;
  instructorSignatureMode?: "digital" | "link";
  videoUrl?: string | null;
  pdfUrl?: string | null;
  pdfName?: string | null;
  questions: OnlineFormQuestion[];
  targetSectorName?: string | null;
}) {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);

  // Validar que la suma de puntajes de las preguntas no supere 10
  const totalPoints = (payload.questions || []).reduce(
    (acc, q) => acc + (typeof q.points === "number" && !isNaN(q.points) ? q.points : 0),
    0
  );
  if (totalPoints > 10.01) {
    return {
      ok: false,
      error: `La suma de los puntajes de las preguntas (${Number(totalPoints.toFixed(2))} pts) no puede superar los 10 puntos.`
    };
  }

  let ownerSectorName: string | null = null;
  if (isSector && sectorRoleId) {
    const sec = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
    ownerSectorName = sec?.name || null;
  } else if (!isSector && payload.targetSectorName && payload.targetSectorName !== "GLOBAL") {
    ownerSectorName = payload.targetSectorName;
  }

  const allForms = await getAllOnlineForms();

  let finalInstructor = payload.instructorName?.trim() || "";
  if (!finalInstructor) {
    const defaultInfo = getDefaultInstructorForSector(ownerSectorName);
    finalInstructor = `${defaultInfo.name}${defaultInfo.legajo ? ` (Leg. ${defaultInfo.legajo})` : ""}`;
  }

  const sigMode: "digital" | "link" = payload.instructorSignatureMode === "link" ? "link" : "digital";

  // Si estamos editando un formulario existente
  if (payload.id) {
    const existingIdx = allForms.findIndex((f) => f.id === payload.id);
    if (existingIdx !== -1) {
      const prev = allForms[existingIdx];
      const updatedForm: OnlineTrainingForm = {
        ...prev,
        title: payload.title.trim(),
        description: payload.description.trim(),
        trainingName: payload.trainingName.trim(),
        objective: payload.objective.trim(),
        instructorName: finalInstructor,
        instructorSignatureMode: sigMode,
        ownerSectorName: !isSector ? (payload.targetSectorName === "GLOBAL" ? null : payload.targetSectorName || prev.ownerSectorName) : prev.ownerSectorName,
        videoUrl: payload.videoUrl ? payload.videoUrl.trim() : null,
        pdfUrl: payload.pdfUrl ? payload.pdfUrl.trim() : null,
        pdfName: payload.pdfName ? payload.pdfName.trim() : null,
        questions: payload.questions
      };
      allForms[existingIdx] = updatedForm;
      await saveAllOnlineForms(allForms);
      revalidatePath("/formularios");
      revalidatePath(`/responder/${updatedForm.id}`);
      return { ok: true, formId: updatedForm.id };
    }
  }

  const slugBase = normalizeTrainingStr(payload.title).replace(/\s+/g, "-").slice(0, 32) || "form";
  const newForm: OnlineTrainingForm = {
    id: `${slugBase}-${Date.now().toString(36)}`,
    title: payload.title.trim(),
    description: payload.description.trim(),
    trainingName: payload.trainingName.trim(),
    objective: payload.objective.trim(),
    instructorName: finalInstructor,
    instructorSignatureMode: sigMode,
    instructorSignature: null,
    ownerSectorName,
    createdByRole: role,
    createdAt: new Date().toISOString(),
    videoUrl: payload.videoUrl ? payload.videoUrl.trim() : null,
    pdfUrl: payload.pdfUrl ? payload.pdfUrl.trim() : null,
    pdfName: payload.pdfName ? payload.pdfName.trim() : null,
    questions: payload.questions
  };

  // Asegurar que el tema exista en el catálogo
  const existingTopic = await prisma.training.findFirst({
    where: { title: { equals: newForm.trainingName, mode: "insensitive" } }
  });
  if (!existingTopic && newForm.trainingName) {
    await prisma.training.create({
      data: { title: newForm.trainingName, isMandatory: false }
    });
  }

  allForms.unshift(newForm);
  await saveAllOnlineForms(allForms);
  revalidatePath("/formularios");
  return { ok: true, formId: newForm.id };
}

export async function saveOnlineFormInstructorSignatureAction(payload: {
  formId: string;
  instructorName: string;
  drawnSignature: string;
}) {
  const allForms = await getAllOnlineForms();
  const idx = allForms.findIndex((f) => f.id === payload.formId);
  if (idx === -1) {
    return { ok: false, error: "Formulario no encontrado." };
  }

  const form = allForms[idx];
  const cleanName = payload.instructorName.trim() || form.instructorName;
  form.instructorName = cleanName;
  form.instructorSignature = payload.drawnSignature;
  form.instructorSignatureMode = "link";
  allForms[idx] = form;

  await saveAllOnlineForms(allForms);

  // Guardar la firma de este instructor para este tema a nivel global
  await saveTrainingInstructorSignatureForTopic(form.trainingName, {
    instructorName: cleanName,
    instructorSignature: payload.drawnSignature,
    mode: "link",
    updatedAt: new Date().toISOString()
  });

  // Aplicar esta firma y nombre de instructor a TODAS las planillas/registros de esta capacitación
  const allRecords = await prisma.employeeTrainingRecord.findMany({
    select: { id: true, trainingName: true }
  });
  const matchingIds = allRecords
    .filter((r) => isOnlineTrainingMatch(r.trainingName, form.trainingName))
    .map((r) => r.id);

  if (matchingIds.length > 0) {
    await prisma.employeeTrainingRecord.updateMany({
      where: { id: { in: matchingIds } },
      data: {
        instructorName: cleanName,
        instructorSignature: payload.drawnSignature
      }
    });
  }

  revalidatePath("/formularios");
  revalidatePath("/plan-anual");
  revalidatePath(`/responder/${form.id}`);

  return { ok: true, updatedCount: matchingIds.length };
}

export async function deleteOnlineFormAction(formId: string) {
  if (formId === "manual-uso-sgcysv") {
    return { ok: false, error: "El formulario oficial del Manual de Uso no se puede eliminar." };
  }

  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);

  let mySectorName = "";
  if (isSector && sectorRoleId) {
    const sec = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
    mySectorName = sec?.name || "";
  }

  const allForms = await getAllOnlineForms();
  const target = allForms.find((f) => f.id === formId);
  if (!target) return { ok: false, error: "Formulario no encontrado." };

  const isAdmin = ["SGI", "RRHH", "ADMIN"].includes(role);
  if (!isAdmin && target.ownerSectorName !== mySectorName) {
    return { ok: false, error: "No tenés permisos para eliminar este formulario." };
  }

  const filtered = allForms.filter((f) => f.id !== formId);
  await saveAllOnlineForms(filtered);
  revalidatePath("/formularios");
  return { ok: true };
}

export async function submitOnlineFormResponseAction(payload: {
  formId: string;
  legajo: string;
  dni: string;
  employeeName: string;
  email?: string;
  answers: Record<string, number>;
  drawnSignature?: string | null;
}) {
  const allForms = await getAllOnlineForms();
  const form = allForms.find((f) => f.id === payload.formId);
  if (!form) {
    return { ok: false, error: "El formulario solicitado no existe o ya no está activo." };
  }

  const legajoRaw = (payload.legajo || "").replace(/\D/g, "").trim();
  const dniRaw = (payload.dni || "").replace(/\D/g, "").trim();
  const empNameRaw = (payload.employeeName || "").trim();

  const allActiveEmployees = await prisma.employee.findMany({
    where: { isActive: true },
    include: { sector: true }
  });

  let employee = null;
  if (legajoRaw) {
    employee =
      allActiveEmployees.find((e) => e.legajo.replace(/\D/g, "") === legajoRaw) || null;
  }
  if (!employee && dniRaw) {
    employee =
      allActiveEmployees.find((e) => (e.dni || "").replace(/\D/g, "") === dniRaw) || null;
  }
  if (!employee && empNameRaw) {
    const targetNorm = normalizeTrainingStr(empNameRaw);
    const targetTokens = targetNorm.split(" ").filter(Boolean);
    employee =
      allActiveEmployees.find((e) => normalizeTrainingStr(e.name) === targetNorm) ||
      allActiveEmployees.find((e) => {
        const empNorm = normalizeTrainingStr(e.name);
        return (
          targetTokens.length >= 2 &&
          targetTokens.every((tok) => empNorm.includes(tok))
        );
      }) ||
      null;
  }

  if (!employee) {
    return {
      ok: false,
      error: "No encontramos tu Legajo o DNI en el padrón activo de AUBASA. Verificá que tu número de Legajo o DNI esté bien escrito."
    };
  }

  // Calcular nota sumando el puntaje asignado a cada pregunta correcta (máximo 10)
  let scoreNum = 10;
  if (form.questions && form.questions.length > 0) {
    const hasCustomPoints = form.questions.some(
      (q) => typeof q.points === "number" && q.points > 0
    );
    if (hasCustomPoints) {
      let earnedPoints = 0;
      for (const q of form.questions) {
        const qPts =
          typeof q.points === "number" && q.points > 0
            ? q.points
            : 10 / form.questions.length;
        if (payload.answers[q.id] === q.correctIndex) {
          earnedPoints += qPts;
        }
      }
      scoreNum = Math.min(10, Math.round(earnedPoints * 10) / 10);
    } else {
      let correctCount = 0;
      for (const q of form.questions) {
        if (payload.answers[q.id] === q.correctIndex) {
          correctCount++;
        }
      }
      scoreNum = Math.round((correctCount / form.questions.length) * 100) / 10;
    }
  }
  const scoreStr = String(scoreNum);

  const completedDate = new Date();
  const dateFormatted = completedDate.toLocaleDateString("es-AR");

  const prevRecordWithSig = await prisma.employeeTrainingRecord.findFirst({
    where: {
      employeeId: employee.id,
      employeeSignature: { not: null }
    },
    orderBy: { id: "desc" },
    select: { employeeSignature: true }
  });

  // Firma del colaborador que irá directamente al Registro de Asistencia (PAU/05 - A9.3)
  const employeeSignature =
    payload.drawnSignature ||
    prevRecordWithSig?.employeeSignature ||
    buildSvgSignatureDataUri(
      employee.name,
      `Legajo ${employee.legajo} — Firma Digital Formulario AUBASA`,
      `Fecha: ${dateFormatted}`
    );

  // Determinación de nombre y firma del Instructor
  let instructorDisplayName = "";
  let instructorDisplayTitle = "Instructor — Firma Digital Validada";

  if (form.id === "manual-uso-sgcysv") {
    instructorDisplayName = "Montes Sergio (Leg. 11739)";
    instructorDisplayTitle = "Legajo 11739 — Instructor SGI AUBASA";
  } else if (form.instructorName && !form.instructorName.toLowerCase().includes("sgi")) {
    instructorDisplayName = form.instructorName;
    instructorDisplayTitle = `Instructor — ${form.instructorName}`;
  } else {
    const secInfo = getDefaultInstructorForSector(employee.sector?.name);
    instructorDisplayName = `${secInfo.name}${secInfo.legajo ? ` (Leg. ${secInfo.legajo})` : ""}`;
    instructorDisplayTitle = secInfo.title;
  }

  // Si el instructor ya firmó manuscritamente por link (en el formulario o en el tema), usar esa firma en todas las planillas
  const savedTopicSig = await getSavedInstructorSignatureForTopic(form.trainingName);
  const instructorSignature =
    form.instructorSignature ||
    savedTopicSig?.instructorSignature ||
    buildSvgSignatureDataUri(
      instructorDisplayName.replace(/\(Leg\.\s*\d+\)/i, "").trim(),
      instructorDisplayTitle,
      `Fecha: ${dateFormatted}`
    );

  if (savedTopicSig?.instructorName && !form.instructorName) {
    instructorDisplayName = savedTopicSig.instructorName;
  }

  // Buscar si el empleado ya tiene el registro en IN_PLAN, GAP o COMPLETED (para no duplicar)
  const existingRecords = await prisma.employeeTrainingRecord.findMany({
    where: { employeeId: employee.id },
    select: {
      id: true,
      trainingName: true,
      status: true,
      objective: true,
      effectiveness: true
    },
    orderBy: { id: "desc" }
  });

  // Buscar el título oficial/canónico en el catálogo de capacitaciones
  const allTrainings = await prisma.training.findMany({ select: { title: true } });
  const canonicalTraining = allTrainings.find((t) =>
    isOnlineTrainingMatch(t.title, form.trainingName)
  );
  const finalTrainingTitle = canonicalTraining?.title || form.trainingName;

  const matchedPending = existingRecords.find(
    (r) =>
      (r.status === "IN_PLAN" || r.status === "GAP") &&
      isOnlineTrainingMatch(r.trainingName, form.trainingName)
  );
  const matchedCompleted = existingRecords.find(
    (r) =>
      r.status === "COMPLETED" &&
      isOnlineTrainingMatch(r.trainingName, form.trainingName)
  );

  let record;
  if (matchedPending) {
    record = await prisma.employeeTrainingRecord.update({
      where: { id: matchedPending.id },
      data: {
        status: "COMPLETED",
        completedAt: completedDate,
        score: scoreStr,
        instructorName: instructorDisplayName,
        employeeSignature,
        instructorSignature,
        objective: matchedPending.objective || form.objective || null,
        effectiveness: matchedPending.effectiveness || "PENDING"
      }
    });
  } else if (matchedCompleted) {
    record = await prisma.employeeTrainingRecord.update({
      where: { id: matchedCompleted.id },
      data: {
        completedAt: completedDate,
        score: scoreStr,
        instructorName: instructorDisplayName,
        employeeSignature,
        instructorSignature,
        objective: matchedCompleted.objective || form.objective || null
      }
    });
  } else {
    record = await prisma.employeeTrainingRecord.create({
      data: {
        employeeId: employee.id,
        trainingName: finalTrainingTitle,
        objective: form.objective || null,
        status: "COMPLETED",
        scheduledDate: completedDate,
        completedAt: completedDate,
        score: scoreStr,
        instructorName: instructorDisplayName,
        employeeSignature,
        instructorSignature,
        sourceProfileId: employee.jobProfileId ?? null,
        effectiveness: "PENDING"
      }
    });
  }

  // Guardar log de auditoría con email en AppSetting para visualización y exportación
  try {
    const respKey = "online_form_responses_v1";
    const setting = await prisma.appSetting.findUnique({ where: { id: respKey } });
    const existing: any[] = setting?.value ? JSON.parse(setting.value) : [];
    existing.unshift({
      id: record.id,
      formId: form.id,
      employeeName: employee.name,
      legajo: employee.legajo,
      email: (payload.email || "").trim(),
      sectorName: employee.sector.name,
      trainingName: finalTrainingTitle,
      score: scoreStr,
      completedAt: completedDate.toISOString()
    });
    const trimmed = existing.slice(0, 500);
    await prisma.appSetting.upsert({
      where: { id: respKey },
      update: { value: JSON.stringify(trimmed) },
      create: {
        id: respKey,
        value: JSON.stringify(trimmed),
        description: "Historial de respuestas de formularios online con correo electrónico"
      }
    });
  } catch (logErr) {
    console.warn("Could not record response audit log:", logErr);
  }

  await syncRecordToPowerAutomate(record.id).catch(() => {});
  revalidatePath("/plan-anual");
  revalidatePath(`/plan-anual/planilla/${record.id}`);
  revalidatePath("/formularios");
  revalidatePath("/");

  return {
    ok: true,
    recordId: record.id,
    employeeName: employee.name,
    legajo: employee.legajo,
    sectorName: employee.sector.name,
    score: scoreStr
  };
}
