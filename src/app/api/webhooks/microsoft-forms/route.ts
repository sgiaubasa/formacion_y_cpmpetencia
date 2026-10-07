import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncRecordToPowerAutomate } from "@/lib/powerAutomate";

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
    <rect x="6" y="6" width="368" height="108" fill="none" stroke="#cbd5e1" stroke-dasharray="4 3" rx="6"/>
    <text x="190" y="52" text-anchor="middle" font-family="'Segoe Script', 'Brush Script MT', cursive, sans-serif" font-size="22" font-style="italic" font-weight="bold" fill="#0f3d7a">${safeName}</text>
    <line x1="40" y1="66" x2="340" y2="66" stroke="#94a3b8" stroke-width="1"/>
    <text x="190" y="85" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="11" font-weight="600" fill="#1e40af">${safeSub}</text>
    <text x="190" y="102" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="10" fill="#64748b">${safeDate}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
}

/**
 * Endpoint para recibir respuestas automáticas desde Microsoft Forms (vía Power Automate).
 * Cierra automáticamente la capacitación (pasa de Programado/Brecha a Realizado),
 * registra la fecha y la nota, y completa tanto la firma del empleado como la del instructor.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const legajoRaw = String(body.legajo || body.Legajo || "").trim();
    const dniRaw = String(body.dni || body.DNI || "").trim();
    const empNameRaw = String(
      body.employeeName || body.nombre || body.empleado || body.name || ""
    ).trim();
    const trainingNameRaw = String(
      body.trainingName || body.tema || body.capacitacion || ""
    ).trim();
    const scoreRaw = String(
      body.score ?? body.nota ?? body.calificacion ?? "10"
    ).trim();
    const instructorNameRaw = String(
      body.instructorName || body.instructor || "SGI / Capacitación AUBASA"
    ).trim();
    const completedAtRaw = body.completedAt || body.fecha || null;
    const objectiveRaw = String(body.objective || body.objetivo || "").trim();
    const measureEfficacy = Boolean(body.measureEfficacy ?? body.medirEficacia ?? false);

    if (!trainingNameRaw) {
      return NextResponse.json(
        { ok: false, error: "Falta el nombre del tema de capacitación (trainingName / tema)." },
        { status: 400 }
      );
    }

    // 1. Buscar al empleado por Legajo, DNI o Nombre y Apellido
    let employee = null;
    if (legajoRaw) {
      employee = await prisma.employee.findUnique({
        where: { legajo: legajoRaw }
      });
    }
    if (!employee && dniRaw) {
      employee = await prisma.employee.findFirst({
        where: { dni: dniRaw }
      });
    }
    if (!employee && empNameRaw) {
      const allActive = await prisma.employee.findMany({
        where: { isActive: true }
      });
      const targetNorm = normalizeStr(empNameRaw);
      const targetTokens = targetNorm.split(" ").filter(Boolean);
      employee =
        allActive.find((e) => normalizeStr(e.name) === targetNorm) ||
        allActive.find((e) => {
          const empNorm = normalizeStr(e.name);
          return (
            targetTokens.length >= 2 &&
            targetTokens.every((tok) => empNorm.includes(tok))
          );
        }) ||
        null;
    }

    if (!employee) {
      return NextResponse.json(
        {
          ok: false,
          error: `No se encontró el colaborador (Legajo: '${legajoRaw}', DNI: '${dniRaw}', Nombre: '${empNameRaw}').`
        },
        { status: 404 }
      );
    }

    const completedDate = completedAtRaw ? new Date(completedAtRaw) : new Date();
    const dateFormatted = completedDate.toLocaleDateString("es-AR");

    // 2. Obtener o generar firmas automáticas del Empleado y del Instructor
    // Si el empleado ya tiene una firma previa registrada en el sistema, la reutilizamos; si no, generamos el sello digital de Microsoft Forms 365
    const prevRecordWithSig = await prisma.employeeTrainingRecord.findFirst({
      where: {
        employeeId: employee.id,
        employeeSignature: { not: null }
      },
      orderBy: { id: "desc" },
      select: { employeeSignature: true }
    });

    const employeeSignature =
      body.employeeSignature ||
      prevRecordWithSig?.employeeSignature ||
      buildSvgSignatureDataUri(
        employee.name,
        `Legajo ${employee.legajo} — Validado vía Microsoft Forms 365`,
        `Fecha: ${dateFormatted}`
      );

    const instructorSignature =
      body.instructorSignature ||
      buildSvgSignatureDataUri(
        instructorNameRaw,
        "Instructor — Validación Automática Microsoft 365",
        `Fecha: ${dateFormatted}`
      );

    // 3. Buscar si el empleado ya tiene esa capacitación en estado IN_PLAN o GAP
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

    return NextResponse.json({
      ok: true,
      message: "Capacitación cerrada y firmada automáticamente desde Microsoft Forms 365.",
      recordId: updatedOrCreated.id,
      employee: {
        id: employee.id,
        legajo: employee.legajo,
        name: employee.name
      },
      trainingName: updatedOrCreated.trainingName,
      status: updatedOrCreated.status,
      score: updatedOrCreated.score
    });
  } catch (err: any) {
    console.error("Error in Microsoft Forms webhook:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Error interno procesando respuesta de Microsoft Forms." },
      { status: 500 }
    );
  }
}
