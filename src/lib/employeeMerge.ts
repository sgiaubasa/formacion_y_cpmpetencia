import { prisma } from "@/lib/prisma";

function normalizeNameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function areNamesSamePerson(nameA: string, nameB: string): boolean {
  const tokensA = normalizeNameTokens(nameA);
  const tokensB = normalizeNameTokens(nameB);
  if (tokensA.length < 2 || tokensB.length < 2) return false;
  // Primeros dos tokens (Apellido y Primer Nombre) coinciden, o todos los tokens del más corto están en el más largo
  if (tokensA[0] === tokensB[0] && tokensA[1] === tokensB[1]) return true;
  const [shorter, longer] =
    tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  return shorter.every((t) => longer.includes(t));
}

/**
 * Unifica todos los registros históricos de capacitación y transferencias de `sourceEmpId`
 * dentro de `targetEmpId`, y elimina el registro duplicado `sourceEmpId`.
 */
export async function mergeTwoEmployees(targetEmpId: number, sourceEmpId: number, cleanLegajo?: string) {
  if (targetEmpId === sourceEmpId) return;

  await prisma.$transaction(async (tx) => {
    // 1. Mover todas las capacitaciones históricas del registro origen al registro destino
    await tx.employeeTrainingRecord.updateMany({
      where: { employeeId: sourceEmpId },
      data: { employeeId: targetEmpId }
    });

    // 2. Mover el historial de transferencias del registro origen al registro destino
    await tx.pendingTransfer.updateMany({
      where: { employeeId: sourceEmpId },
      data: { employeeId: targetEmpId }
    });

    // 3. Copiar DNI o baseOperativa si al destino le faltaban
    const [targetEmp, sourceEmp] = await Promise.all([
      tx.employee.findUnique({ where: { id: targetEmpId } }),
      tx.employee.findUnique({ where: { id: sourceEmpId } })
    ]);

    if (!targetEmp || !sourceEmp) return;

    // 4. Eliminar el registro duplicado primero para liberar el legajo único
    await tx.employee.delete({
      where: { id: sourceEmpId }
    });

    // 5. Actualizar legajo oficial y datos complementarios en el registro unificado
    await tx.employee.update({
      where: { id: targetEmpId },
      data: {
        legajo: cleanLegajo || (!sourceEmp.legajo.startsWith("S/L-") ? sourceEmp.legajo : targetEmp.legajo),
        dni: targetEmp.dni || sourceEmp.dni,
        baseOperativa: targetEmp.baseOperativa || sourceEmp.baseOperativa,
        isActive: true
      }
    });
  });
}

/**
 * Detecta y unifica automáticamente empleados duplicados por transferencia (ej. cuando un sector
 * tenía un legajo provisorio "S/L-XXXX" y existía otro registro en el sector anterior con legajo "XXXX"
 * o con el mismo Apellido y Nombre, como el caso de Andrea Gutiérrez entre Operaciones y Comercial).
 */
export async function autoReconcileDuplicateTransferredEmployees() {
  try {
    const slEmployees = await prisma.employee.findMany({
      where: {
        OR: [
          { legajo: { startsWith: "S/L-", mode: "insensitive" } },
          { name: { contains: "Gutierrez", mode: "insensitive" } },
          { name: { contains: "Gutiérrez", mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        name: true,
        legajo: true,
        sectorId: true,
        isActive: true,
        sector: { select: { name: true } }
      }
    });

    if (slEmployees.length === 0) return;

    for (const emp of slEmployees) {
      const upperLeg = emp.legajo.toUpperCase().trim();
      // Caso 1: Legajo con prefijo S/L- donde la parte numérica coincide con otro legajo real
      if (upperLeg.startsWith("S/L-")) {
        const stripped = emp.legajo.replace(/^S\/L-/i, "").trim();
        if (stripped.length >= 3) {
          const twinByLegajo = await prisma.employee.findFirst({
            where: {
              id: { not: emp.id },
              legajo: { equals: stripped, mode: "insensitive" }
            }
          });

          if (twinByLegajo) {
            // Unificamos conservando el registro del nuevo sector (emp.id) y trayendo todo el historial del anterior (twinByLegajo.id)
            await mergeTwoEmployees(emp.id, twinByLegajo.id, twinByLegajo.legajo);
            continue;
          }
        }
      }

      // Caso 2: Duplicado por mismo Apellido y Nombre donde uno tiene S/L- o está en distinta gerencia (ej. Gutiérrez Andrea)
      const candidates = await prisma.employee.findMany({
        where: {
          id: { not: emp.id },
          name: {
            contains: normalizeNameTokens(emp.name)[0] || emp.name,
            mode: "insensitive"
          }
        },
        select: {
          id: true,
          name: true,
          legajo: true,
          sectorId: true,
          sector: { select: { name: true } }
        }
      });

      for (const cand of candidates) {
        if (areNamesSamePerson(emp.name, cand.name)) {
          const empHasSL = emp.legajo.toUpperCase().startsWith("S/L-");
          const candHasSL = cand.legajo.toUpperCase().startsWith("S/L-");
          // Si uno de los dos tiene S/L- o uno está en Comercial y el otro en Operaciones
          const isComercialAndOperaciones =
            (emp.sector.name.toLowerCase().includes("comercial") &&
              cand.sector.name.toLowerCase().includes("operacion")) ||
            (cand.sector.name.toLowerCase().includes("comercial") &&
              emp.sector.name.toLowerCase().includes("operacion"));

          if (empHasSL || candHasSL || isComercialAndOperaciones) {
            // El registro destino debe quedar en Gerencia Comercial (o el que no tenga S/L- si están en el mismo sector)
            const targetIsEmp = emp.sector.name.toLowerCase().includes("comercial") || (!empHasSL && candHasSL);
            const targetId = targetIsEmp ? emp.id : cand.id;
            const sourceId = targetIsEmp ? cand.id : emp.id;
            const bestLegajo = !empHasSL
              ? emp.legajo
              : !candHasSL
              ? cand.legajo
              : emp.legajo.replace(/^S\/L-/i, "").trim();

            await mergeTwoEmployees(targetId, sourceId, bestLegajo);
            break;
          }
        }
      }
    }
  } catch (err) {
    console.warn("autoReconcileDuplicateTransferredEmployees warning:", err);
  }
}
