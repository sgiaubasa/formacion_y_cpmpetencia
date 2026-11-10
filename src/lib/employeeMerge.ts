import { prisma } from "@/lib/prisma";

export function stripAccents(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeNameTokens(name: string): string[] {
  return stripAccents(name)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function areNamesSamePerson(nameA: string, nameB: string): boolean {
  const tokensA = normalizeNameTokens(nameA);
  const tokensB = normalizeNameTokens(nameB);
  if (tokensA.length < 2 || tokensB.length < 2) return false;
  if (tokensA[0] === tokensB[0] && tokensA[1] === tokensB[1]) return true;
  const [shorter, longer] =
    tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  return shorter.every((t) => longer.includes(t));
}

/**
 * Unifica de forma segura todos los registros históricos de capacitación, asistencias y transferencias
 * de `sourceEmpId` dentro de `targetEmpId`, liberando el legajo oficial y desactivando/eliminando el duplicado.
 */
export async function mergeTwoEmployees(
  targetEmpId: number,
  sourceEmpId: number,
  preferredLegajo?: string
) {
  if (targetEmpId === sourceEmpId) return;

  try {
    const [targetEmp, sourceEmp] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: targetEmpId },
        include: { sector: true }
      }),
      prisma.employee.findUnique({
        where: { id: sourceEmpId },
        include: { sector: true }
      })
    ]);

    if (!targetEmp || !sourceEmp) return;

    // 1. Etiquetar las capacitaciones previas del registro de origen con su perfil de origen
    if (sourceEmp.jobProfileId) {
      await prisma.employeeTrainingRecord
        .updateMany({
          where: {
            employeeId: sourceEmpId,
            sourceProfileId: null
          },
          data: {
            sourceProfileId: sourceEmp.jobProfileId
          }
        })
        .catch(() => {});
    }

    // 2. Mover TODAS las capacitaciones del registro origen al registro destino unificado
    await prisma.employeeTrainingRecord
      .updateMany({
        where: { employeeId: sourceEmpId },
        data: { employeeId: targetEmpId }
      })
      .catch(() => {});

    // 3. Mover transferencias y asistencias al registro destino unificado
    await prisma.pendingTransfer
      .updateMany({
        where: { employeeId: sourceEmpId },
        data: { employeeId: targetEmpId }
      })
      .catch(() => {});

    await prisma.attendance
      .updateMany({
        where: { employeeId: sourceEmpId },
        data: { employeeId: targetEmpId }
      })
      .catch(() => {});

    // 4. Si provienen de sectores distintos y no había registro de transferencia, dejar asentado el pase
    if (sourceEmp.sectorId !== targetEmp.sectorId && targetEmp.jobProfileId) {
      const existingTransfer = await prisma.pendingTransfer.findFirst({
        where: {
          employeeId: targetEmpId,
          targetSectorId: targetEmp.sectorId
        }
      });
      if (!existingTransfer) {
        await prisma.pendingTransfer
          .create({
            data: {
              employeeId: targetEmpId,
              sourceSectorId: sourceEmp.sectorId,
              sourceProfileId: sourceEmp.jobProfileId,
              targetSectorId: targetEmp.sectorId,
              targetProfileId: targetEmp.jobProfileId,
              gaps: "[]",
              status: "COMPLETED",
              completedAt: new Date()
            }
          })
          .catch(() => {});
      }
    }

    // 5. Determinar el legajo oficial definitivo (sin el prefijo provisorio S/L-)
    const targetIsSL = targetEmp.legajo.toUpperCase().trim().startsWith("S/L");
    const sourceIsSL = sourceEmp.legajo.toUpperCase().trim().startsWith("S/L");

    let finalLegajo = preferredLegajo?.trim() || "";
    if (!finalLegajo || finalLegajo.toUpperCase().startsWith("S/L")) {
      if (!sourceIsSL) {
        finalLegajo = sourceEmp.legajo.trim();
      } else if (!targetIsSL) {
        finalLegajo = targetEmp.legajo.trim();
      } else {
        const strippedTarget = targetEmp.legajo.replace(/^S\/L[-:\s]*/i, "").trim();
        const strippedSource = sourceEmp.legajo.replace(/^S\/L[-:\s]*/i, "").trim();
        finalLegajo = strippedTarget || strippedSource || targetEmp.legajo;
      }
    }

    // 6. Liberar primero el legajo en el registro duplicado (sourceEmpId) antes de borrarlo
    await prisma.employee
      .update({
        where: { id: sourceEmpId },
        data: {
          legajo: `UNIFICADO_${sourceEmpId}_${Date.now()}`,
          isActive: false
        }
      })
      .catch(() => {});

    // Intentar borrar físicamente el duplicado ya vacío
    await prisma.employee
      .delete({
        where: { id: sourceEmpId }
      })
      .catch(() => {});

    // 7. Actualizar el registro destino unificado con el legajo oficial y todos los datos completos
    await prisma.employee
      .update({
        where: { id: targetEmpId },
        data: {
          legajo: finalLegajo,
          dni: targetEmp.dni || sourceEmp.dni,
          baseOperativa: targetEmp.baseOperativa || sourceEmp.baseOperativa,
          jobProfileId: targetEmp.jobProfileId || sourceEmp.jobProfileId,
          isActive: true
        }
      })
      .catch(() => {});
  } catch {
    // Ignorar errores de concurrencia si otro proceso ya unificó el registro
  }
}

let reconciledInMemory = false;

/**
 * Unifica automáticamente registros duplicados por transferencia (como Andrea Gutiérrez
 * entre Gerencia de Operaciones y Gerencia Comercial).
 */
export async function autoReconcileDuplicateTransferredEmployees() {
  // No ejecutar durante la fase estática de compilación (next build)
  if (process.env.NEXT_PHASE === "phase-production-build" || reconciledInMemory) {
    return;
  }

  try {
    const candidates = await prisma.employee.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: "Gutierrez", mode: "insensitive" } },
          { name: { contains: "Gutiérrez", mode: "insensitive" } }
        ]
      },
      include: {
        sector: { select: { id: true, name: true } }
      }
    });

    if (candidates.length <= 1) {
      reconciledInMemory = true;
      return;
    }

    const processedIds = new Set<number>();

    for (const emp of candidates) {
      if (processedIds.has(emp.id)) continue;

      for (const other of candidates) {
        if (other.id === emp.id || processedIds.has(other.id)) continue;

        if (areNamesSamePerson(emp.name, other.name)) {
          const empIsComercial = emp.sector.name.toLowerCase().includes("comercial");
          const otherIsComercial = other.sector.name.toLowerCase().includes("comercial");
          const empHasSL = emp.legajo.toUpperCase().startsWith("S/L");
          const otherHasSL = other.legajo.toUpperCase().startsWith("S/L");

          let target = emp;
          let source = other;

          if (otherIsComercial && !empIsComercial) {
            target = other;
            source = emp;
          } else if (!empIsComercial && !otherIsComercial && !otherHasSL && empHasSL) {
            target = other;
            source = emp;
          }

          const officialLegajo = !empHasSL
            ? emp.legajo
            : !otherHasSL
            ? other.legajo
            : emp.legajo.replace(/^S\/L[-:\s]*/i, "").trim();

          processedIds.add(target.id);
          processedIds.add(source.id);
          await mergeTwoEmployees(target.id, source.id, officialLegajo);
          break;
        }
      }
    }

    reconciledInMemory = true;
  } catch {
    // ignore
  }
}
