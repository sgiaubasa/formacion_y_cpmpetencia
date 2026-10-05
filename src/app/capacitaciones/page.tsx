import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole, getSectorIdFromRole, getAllowedSectorNames } from "@/lib/auth";
import { addTopic } from "./actions";
import { TopicsTableClient } from "./TopicsTableClient";
import { getTrainingsForSectors } from "@/lib/sectorTrainings";

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

  const capacitaciones = await getTrainingsForSectors(allowedSectors);
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
              ? "Listado de temas de capacitación correspondientes a tu sector."
              : "Administra el catálogo completo de capacitaciones disponibles en el sistema."}
            {isSgi && " Como usuario SGI, al editar el nombre de un tema se actualizarán automáticamente todas las capacitaciones y perfiles vinculados."}
          </p>
        </div>
      </div>

      {!isSector && (
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h3 style={{ marginBottom: "1rem", color: "var(--primary-color)" }}>Nuevo Tema</h3>
          <form action={addTopic} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 300px" }}>
              <label className="form-label">Nombre del Tema</label>
              <input type="text" name="title" className="form-input" placeholder="Ej: Seguridad Industrial" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1.5rem", height: "38px" }}>
              Agregar Tema
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <TopicsTableClient topics={capacitaciones} isSgi={isSgi} />
      </div>
    </div>
  );
}
