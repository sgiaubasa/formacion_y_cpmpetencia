import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

function buildSvgSignatureDataUri(
  signerName: string,
  subtitle: string,
  dateStr: string
): string {
  const safeName = (signerName || "Firmado").replace(/[<>&"']/g, "");
  const safeSub = (subtitle || "Validado Microsoft Forms 365").replace(/[<>&"']/g, "");
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
  allActiveEmployees: { id: number; legajo: string; dni: string | null; name: string; jobProfileId: number | null }[]
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
  const instructorNameRaw = String(
    item.instructorName || item.instructor || "SGI / Capacitación AUBASA"
  ).trim();
  const completedAtRaw = item.completedAt || item.fecha || null;
  const objectiveRaw = String(item.objective || item.objetivo || "").trim();
  const measureEfficacy = Boolean(item.measureEfficacy ?? item.medirEficacia ?? true);

  if (!trainingNameRaw) {
    return { ok: false, error: "Falta el nombre del tema de capacitación." };
  }

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
      `Legajo ${employee.legajo} — Firma Digital Microsoft Forms 365`,
      `Fecha: ${dateFormatted}`
    );

  const instructorSignature =
    item.instructorSignature ||
    buildSvgSignatureDataUri(
      instructorNameRaw,
      "Instructor — Firma Digital Validada",
      `Fecha: ${dateFormatted}`
    );

  const existingRecords = await prisma.employeeTrainingRecord.findMany({
    where: {
      employeeId: employee.id,
      status: { in: ["IN_PLAN", "GAP"] }
    },
    orderBy: { id: "desc" }
  });

  const targetTrainingNorm = normalizeStr(trainingNameRaw);
  const matchedRecord = existingRecords.find(
    (r) => normalizeStr(r.trainingName) === targetTrainingNorm
  );

  let updatedOrCreated;
  if (matchedRecord) {
    updatedOrCreated = await prisma.employeeTrainingRecord.update({
      where: { id: matchedRecord.id },
      data: {
        status: "COMPLETED",
        completedAt: completedDate,
        score: scoreRaw,
        instructorName: instructorNameRaw,
        employeeSignature,
        instructorSignature,
        ...(objectiveRaw ? { objective: objectiveRaw } : {}),
        effectiveness: measureEfficacy ? "PENDING" : null
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

  await syncRecordToPowerAutomate(updatedOrCreated.id).catch(() => {});

  return {
    ok: true,
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
    const allActiveEmployees = await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, legajo: true, dni: true, name: true, jobProfileId: true }
    });

    // Modo lote (importación directa de Excel de Microsoft Forms desde la app sin usar Power Automate)
    if (Array.isArray(body.items)) {
      let processed = 0;
      const notFoundList: string[] = [];

      for (const item of body.items) {
        const res = await processSingleFormItem(item, allActiveEmployees);
        if (res.ok) {
          processed++;
        } else if (res.notFound && res.label) {
          notFoundList.push(res.label);
        }
      }

      revalidatePath("/plan-anual");
      revalidatePath("/");

      return NextResponse.json({
        ok: true,
        processed,
        notFoundList
      });
    }

    // Modo individual (Power Automate en tiempo real)
    const singleRes = await processSingleFormItem(body, allActiveEmployees);
    if (!singleRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: singleRes.error || `No se encontró el colaborador (${singleRes.label || ""}).`
        },
        { status: 404 }
      );
    }

    revalidatePath("/plan-anual");
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      message: "Capacitación cerrada y firmada automáticamente desde Microsoft Forms 365.",
      recordId: singleRes.recordId,
      employee: singleRes.employee
    });
  } catch (err: any) {
    console.error("Error in Microsoft Forms webhook:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Error interno procesando respuesta de Microsoft Forms." },
      { status: 500 }
    );
  }
}
