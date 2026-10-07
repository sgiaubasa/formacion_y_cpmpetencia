import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncRecordToPowerAutomate } from "@/lib/powerAutomate";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
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

export function buildSvgSignatureDataUri(
  signerName: string,
  subtitle: string,
  dateStr: string
): string {
  const safeName = (signerName || "Firmado").replace(/[<>&"']/g, "");
  const safeSub = (subtitle || "Validado Digitalmente — AUBASA").replace(/[<>&"']/g, "");
  const safeDate = (dateStr || "").replace(/[<>&"']/g, "");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="120" viewBox="0 0 380 120">
    <rect width="380" height="120" fill="#ffffff" rx="8"/>
    <rect x="6" y="6" width="368" height="108" fill="none" stroke="#0d8383" stroke-dasharray="4 3" rx="6"/>
    <text x="190" y="52" text-anchor="middle" font-family="'Segoe Script', 'Brush Script MT', cursive, sans-serif" font-size="22" font-style="italic" font-weight="bold" fill="#1b365d">${safeName}</text>
    <line x1="40" y1="66" x2="340" y2="66" stroke="#94a3b8" stroke-width="1"/>
    <text x="190" y="85" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="11" font-weight="600" fill="#0d8383">${safeSub}</text>
    <text x="190" y="102" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="10" fill="#64748b">${safeDate}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
}

async function processSingleFormItem(
  item: any,
  allPermittedEmployees: {
    id: number;
    legajo: string;
    dni: string | null;
    name: string;
    jobProfileId: number | null;
  }[]
) {
  const legajoRaw = String(item.legajo || item.Legajo || "").replace(/\D/g, "").trim();
  const dniRaw = String(item.dni || item.DNI || "").replace(/\D/g, "").trim();
  const empNameRaw = String(
    item.employeeName || item.nombre || item.empleado || item.name || ""
  ).trim();
  const trainingNameRaw = String(
    item.trainingName || item.tema || item.capacitacion || ""
  ).trim();
  const scoreRaw = String(
    item.score ?? item.nota ?? item.calificacion ?? "10"
  ).trim();
  const rawInstructorInput = String(
    item.instructorName || item.instructor || "Montes Sergio (Leg. 11739)"
  ).trim();
  const isSgiOrMontes =
    !rawInstructorInput ||
    rawInstructorInput.toLowerCase().includes("sgi") ||
    rawInstructorInput.toLowerCase().includes("montes");
  const instructorNameRaw = isSgiOrMontes
    ? "Montes Sergio (Leg. 11739)"
    : rawInstructorInput;
  const completedAtRaw = item.completedAt || item.fecha || null;
  const objectiveRaw = String(item.objective || item.objetivo || "").trim();
  const measureEfficacy = Boolean(item.measureEfficacy ?? item.medirEficacia ?? true);

  if (!trainingNameRaw) {
    return { ok: false, error: "Falta el nombre del tema de capacitación." };
  }

  let employee = null;
  if (legajoRaw) {
    employee =
      allPermittedEmployees.find((e) => e.legajo.replace(/\D/g, "") === legajoRaw) || null;
  }
  if (!employee && dniRaw) {
    employee =
      allPermittedEmployees.find((e) => (e.dni || "").replace(/\D/g, "") === dniRaw) || null;
  }
  if (!employee && empNameRaw) {
    const targetNorm = normalizeStr(empNameRaw);
    const targetTokens = targetNorm.split(" ").filter(Boolean);
    employee =
      allPermittedEmployees.find((e) => normalizeStr(e.name) === targetNorm) ||
      allPermittedEmployees.find((e) => {
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
      notFound: true,
      label: `${empNameRaw || "Sin nombre"} (Legajo: ${legajoRaw || "-"})`
    };
  }

  let completedDate = new Date();
  if (completedAtRaw) {
    const parsed = new Date(completedAtRaw);
    if (!isNaN(parsed.getTime())) {
      completedDate = parsed;
    }
  }
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
    item.employeeSignature ||
    prevRecordWithSig?.employeeSignature ||
    buildSvgSignatureDataUri(
      employee.name,
      `Legajo ${employee.legajo} — Firma Digital Validada`,
      `Fecha: ${dateFormatted}`
    );

  const instructorSignature =
    item.instructorSignature ||
    buildSvgSignatureDataUri(
      isSgiOrMontes ? "Montes Sergio" : instructorNameRaw,
      isSgiOrMontes
        ? "Legajo 11739 — Instructor SGI AUBASA"
        : "Instructor — Firma Digital Validada",
      `Fecha: ${dateFormatted}`
    );

  // Buscar TODOS los registros del empleado para ese tema (incluyendo COMPLETED para no duplicar al re-subir el Excel actualizado)
  const existingRecords = await prisma.employeeTrainingRecord.findMany({
    where: {
      employeeId: employee.id
    },
    orderBy: { id: "desc" }
  });

  const targetTrainingNorm = normalizeStr(trainingNameRaw);
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

  let updatedOrCreated;
  let wasAlreadyCompleted = false;

  if (matchedPending) {
    updatedOrCreated = await prisma.employeeTrainingRecord.update({
      where: { id: matchedPending.id },
      data: {
        status: "COMPLETED",
        completedAt: completedDate,
        score: scoreRaw,
        instructorName: instructorNameRaw,
        employeeSignature,
        instructorSignature,
        ...(objectiveRaw ? { objective: objectiveRaw } : {}),
        effectiveness: matchedPending.effectiveness || (measureEfficacy ? "PENDING" : null)
      }
    });
  } else if (matchedCompleted) {
    // Si ya estaba completada de una carga anterior del Excel, actualizamos datos faltantes sin duplicar el registro
    wasAlreadyCompleted = true;
    updatedOrCreated = await prisma.employeeTrainingRecord.update({
      where: { id: matchedCompleted.id },
      data: {
        score: scoreRaw || matchedCompleted.score,
        instructorName: matchedCompleted.instructorName || instructorNameRaw,
        employeeSignature: matchedCompleted.employeeSignature || employeeSignature,
        instructorSignature: matchedCompleted.instructorSignature || instructorSignature,
        ...(objectiveRaw && !matchedCompleted.objective ? { objective: objectiveRaw } : {})
      }
    });
  } else {
    updatedOrCreated = await prisma.employeeTrainingRecord.create({
      data: {
        employeeId: employee.id,
        trainingName: trainingNameRaw,
        objective: objectiveRaw || null,
        status: "COMPLETED",
        completedAt: completedDate,
        score: scoreRaw,
        instructorName: instructorNameRaw,
        employeeSignature,
        instructorSignature,
        sourceProfileId: employee.jobProfileId ?? null,
        effectiveness: measureEfficacy ? "PENDING" : null
      }
    });
  }

  if (!wasAlreadyCompleted) {
    await syncRecordToPowerAutomate(updatedOrCreated.id).catch(() => {});
  }

  return {
    ok: true,
    wasAlreadyCompleted,
    recordId: updatedOrCreated.id,
    employee: {
      id: employee.id,
      legajo: employee.legajo,
      name: employee.name
    }
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verificar alcance por sector cuando se sube el Excel desde la sesión del usuario
    const role = await getCurrentRole();
    const isSector = await isSectorRole(role);
    const sectorRoleId = await getSectorIdFromRole(role);

    let allowedSectors: string[] | null = null;
    if (isSector && sectorRoleId) {
      const mySector = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
      if (mySector) {
        allowedSectors = await getAllowedSectorNames(role, mySector.name);
      }
    }

    const allPermittedEmployees = await prisma.employee.findMany({
      where: {
        isActive: true,
        ...(allowedSectors && allowedSectors.length > 0
          ? { sector: { name: { in: allowedSectors } } }
          : {})
      },
      select: { id: true, legajo: true, dni: true, name: true, jobProfileId: true }
    });

    // Modo lote (importación o actualización de Excel de Microsoft Forms)
    if (Array.isArray(body.items)) {
      let newCompleted = 0;
      let updatedExisting = 0;
      const notFoundList: string[] = [];

      for (const item of body.items) {
        const res = await processSingleFormItem(item, allPermittedEmployees);
        if (res.ok) {
          if (res.wasAlreadyCompleted) {
            updatedExisting++;
          } else {
            newCompleted++;
          }
        } else if (res.notFound && res.label) {
          notFoundList.push(res.label);
        }
      }

      revalidatePath("/plan-anual");
      revalidatePath("/");

      return NextResponse.json({
        ok: true,
        processed: newCompleted + updatedExisting,
        newCompleted,
        updatedExisting,
        notFoundList
      });
    }

    // Modo individual (Formulario Online de la App o Webhook)
    const singleRes = await processSingleFormItem(body, allPermittedEmployees);
    if (!singleRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: singleRes.error || `No se encontró el colaborador en el padrón (${singleRes.label || ""}).`
        },
        { status: 404 }
      );
    }

    revalidatePath("/plan-anual");
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      message: "Capacitación cerrada y firmada automáticamente.",
      recordId: singleRes.recordId,
      employee: singleRes.employee
    });
  } catch (err: any) {
    console.error("Error in Microsoft Forms / Online Form processor:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Error interno procesando las respuestas." },
      { status: 500 }
    );
  }
}
