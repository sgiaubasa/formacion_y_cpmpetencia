import { prisma } from "@/lib/prisma";
import { getCurrentRole, isSectorRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { addTopic } from "./actions";
import { TopicsTableClient } from "./TopicsTableClient";

export default async function CapacitacionesPage() {
  const role = await getCurrentRole();
  const isSector = await isSectorRole(role);

  if (isSector) {
    redirect("/");
  }

  const capacitaciones = await prisma.training.findMany({ orderBy: { title: "asc" } });
  const isSgi = role === "SGI";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Temas a Capacitar</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Administra el catálogo de capacitaciones disponibles en el sistema.
            {isSgi && " Como usuario SGI, al editar el nombre de un tema se actualizarán automáticamente todas las capacitaciones y perfiles vinculados."}
          </p>
        </div>
      </div>

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

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <TopicsTableClient topics={capacitaciones} isSgi={isSgi} />
      </div>
    </div>
  );
}
