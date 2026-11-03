import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
import { TopicsTableClient } from "./TopicsTableClient";
import { getTrainingsForSectors } from "@/lib/sectorTrainings";
import { NewTopicCard } from "./NewTopicCard";

export default async function CapacitacionesPage() {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);
  const sectorRoleId = await getSectorIdFromRole(role);

  let allowedSectors: string[] | null = null;
  let mySectorName = "";
  if (isSector && sectorRoleId) {
    const mySector = await prisma.sector.findUnique({ where: { id: sectorRoleId } });
    if (mySector) {
      mySectorName = mySector.name;
      allowedSectors = await getAllowedSectorNames(role, mySector.name);
    }
  }

  const [capacitaciones, allSectors] = await Promise.all([
    getTrainingsForSectors(allowedSectors),
    prisma.sector.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  const isSgi = role === "SGI";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isSector && mySectorName ? `Temas a Capacitar — ${mySectorName}` : "Gestión de Temas a Capacitar"}
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            {isSector
              ? `Temas asignados y disponibles para la programación del Plan Anual de ${mySectorName}. Puedes agregar nuevos temas específicos para tu sector.`
              : "Catálogo completo de temas de capacitación de AUBASA. Puedes definir a qué sectores aplica cada tema (o si es transversal para toda la empresa)."}
          </p>
        </div>
      </div>

      {/* TARJETA DE ALTA DE NUEVO TEMA (HABILITADA PARA SECTORES Y ADMINISTRADORES) */}
      <NewTopicCard
        allSectors={allSectors}
        isSector={isSector}
        mySectorName={mySectorName}
      />

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <TopicsTableClient
          topics={capacitaciones}
          isSgi={isSgi}
          isSector={isSector}
          mySectorName={mySectorName}
          allSectors={allSectors}
        />
      </div>
    </div>
  );
}
