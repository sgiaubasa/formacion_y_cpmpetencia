import { decryptRecordToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import RemoteSignatureClient from "./RemoteSignatureClient";
import { notFound } from "next/navigation";
import { getTrainingMaterialForRecord } from "@/lib/trainingMaterials";

export default async function FirmaPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ rol?: string }>;
}) {
  const resolvedParams = await params;
  const sp = await searchParams;
  const decoded = decryptRecordToken(resolvedParams.token);

  if (!decoded || !decoded.recordId) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
        <style>{`.sidebar { display: none !important; } .main-content { margin-left: 0 !important; width: 100% !important; padding: 1rem !important; }`}</style>
        <h2 style={{ color: "var(--danger-color, #dc2626)" }}>Enlace inválido o expirado.</h2>
        <p>Por favor, solicitá un nuevo enlace a tu supervisor.</p>
      </div>
    );
  }

  const { recordId } = decoded;
  const role: "empleado" | "instructor" =
    decoded.role === "instructor" || sp.rol === "instructor"
      ? "instructor"
      : "empleado";

  const record = await prisma.employeeTrainingRecord.findUnique({
    where: { id: recordId },
    include: {
      employee: true
    }
  });

  if (!record) {
    notFound();
  }

  const material = await getTrainingMaterialForRecord(record.id);

  return (
    <>
      <style>{`.sidebar { display: none !important; } .main-content { margin-left: 0 !important; width: 100% !important; padding: 1rem !important; }`}</style>
      <RemoteSignatureClient
        recordId={record.id}
        trainingName={record.trainingName}
        objective={record.objective || ""}
        employeeName={record.employee.name}
        legajo={record.employee.legajo}
        role={role}
        hasEmployeeSignature={Boolean(record.employeeSignature)}
        hasInstructorSignature={Boolean(record.instructorSignature)}
        existingInstructorName={record.instructorName || ""}
        existingScore={record.score || ""}
        existingCompletedDate={
          record.completedAt
            ? new Date(record.completedAt).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
        }
        material={material}
      />
    </>
  );
}
