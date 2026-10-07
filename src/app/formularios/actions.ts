"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole, getSectorIdFromRole } from "@/lib/auth";
import {
  getAllOnlineForms,
  saveAllOnlineForms,
  OnlineTrainingForm,
  OnlineFormQuestion
} from "@/lib/onlineForms";
import { buildSvgSignatureDataUri } from "@/app/api/webhooks/microsoft-forms/route";
import { syncRecordToPowerAutomate } from "@/lib/powerAutomate";
import { revalidatePath } from "next/cache";

function normalizeStr(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function createOnlineFormAction(payload: {
  title: string;
  description: string;
  trainingName: string;
  objective: string;
  instructorName: string;
  questions: OnlineFormQuestion[];
}) {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);

  let ownerSectorName: string | null = null;
  if (isSector && sectorRoleId) {
    const sec = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
    ownerSectorName = sec?.name || null;
  }

  const allForms = await getAllOnlineForms();
  const slugBase = normalizeStr(payload.title).replace(/\s+/g, "-").slice(0, 32) || "form";
  const newForm: OnlineTrainingForm = {
    id: `${slugBase}-${Date.now().toString(36)}`,
    title: payload.title.trim(),
    description: payload.description.trim(),
    trainingName: payload.trainingName.trim(),
    objective: payload.objective.trim(),
    instructorName: payload.instructorName.trim() || "SGI / Capacitación AUBASA",
    ownerSectorName,
    createdByRole: role,
    createdAt: new Date().toISOString(),
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
    const targetNorm = normalizeStr(empNameRaw);
    const targetTokens = targetNorm.split(" ").filter(Boolean);
    employee =
      allActiveEmployees.find((e) => normalizeStr(e.name) === targetNorm) ||
      allActiveEmployees.find((e) => {
        const empNorm = normalizeStr(e.name);
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

  // Calcular nota de 0 a 10 según respuestas correctas
  let scoreNum = 10;
  if (form.questions && form.questions.length > 0) {
    let correctCount = 0;
    for (const q of form.questions) {
      if (payload.answers[q.id] === q.correctIndex) {
        correctCount++;
      }
    }
    scoreNum = Math.round((correctCount / form.questions.length) * 10);
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

  const employeeSignature =
    payload.drawnSignature ||
    prevRecordWithSig?.employeeSignature ||
    buildSvgSignatureDataUri(
      employee.name,
      `Legajo ${employee.legajo} — Firma Digital Formulario AUBASA`,
      `Fecha: ${dateFormatted}`
    );

  const instructorSignature = buildSvgSignatureDataUri(
    form.instructorName || "SGI / Capacitación AUBASA",
    "Instructor — Firma Digital Validada",
    `Fecha: ${dateFormatted}`
  );

  // Buscar si el empleado ya tiene el registro en IN_PLAN, GAP o COMPLETED (para no duplicar)
  const existingRecords = await prisma.employeeTrainingRecord.findMany({
    where: { employeeId: employee.id },
    orderBy: { id: "desc" }
  });

  const targetTrainingNorm = normalizeStr(form.trainingName);
  const matchedPending = existingRecords.find(
    (r) =>
      (r.status === "IN_PLAN" || r.status === "GAP") &&
      normalizeStr(r.trainingName) === targetTrainingNorm
  );
  const matchedCompleted = existingRecords.find(
    (r) =>
      r.status === "COMPLETED" &&
      normalizeStr(r.trainingName) === targetTrainingNorm
  );

  let record;
  if (matchedPending) {
    record = await prisma.employeeTrainingRecord.update({
      where: { id: matchedPending.id },
      data: {
        status: "COMPLETED",
        completedAt: completedDate,
        score: scoreStr,
        instructorName: form.instructorName,
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
        instructorName: form.instructorName,
        employeeSignature,
        instructorSignature,
        objective: matchedCompleted.objective || form.objective || null
      }
    });
  } else {
    record = await prisma.employeeTrainingRecord.create({
      data: {
        employeeId: employee.id,
        trainingName: form.trainingName,
        objective: form.objective || null,
        status: "COMPLETED",
        completedAt: completedDate,
        score: scoreStr,
        instructorName: form.instructorName,
        employeeSignature,
        instructorSignature,
        sourceProfileId: employee.jobProfileId ?? null,
        effectiveness: "PENDING"
      }
    });
  }

  await syncRecordToPowerAutomate(record.id).catch(() => {});
  revalidatePath("/plan-anual");
  revalidatePath("/formularios");
  revalidatePath("/");

  return {
    ok: true,
    employeeName: employee.name,
    legajo: employee.legajo,
    sectorName: employee.sector.name,
    score: scoreStr
  };
}
