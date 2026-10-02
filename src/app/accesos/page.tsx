import { prisma } from "@/lib/prisma";
import { getCurrentRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { addAccess, removeAccess, updateUserEfficacyPermission } from "./actions";
import { getEfficacyEvaluatorsMap, formatNameFromEmail } from "@/lib/efficacyTraceability";

export default async function AccesosPage() {
  try {
    const currentRole = await getCurrentRole();
    if (currentRole !== "SGI") {
      redirect("/"); // Solo SGI puede ver esta página
    }

    const [users, sectores, evaluatorsMap] = await Promise.all([
      prisma.appUser.findMany({
        include: { sector: true },
        orderBy: { email: "asc" }
      }),
      prisma.sector.findMany({
        orderBy: { name: "asc" }
      }),
      getEfficacyEvaluatorsMap()
    ]);

    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Gestión de Accesos y Permisos (Solo Administradores SGI)</h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Configure los usuarios por sector, su nombre y apellido para trazabilidad, y quiénes están habilitados para medir la eficacia de las capacitaciones.
            </p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "var(--primary-color)" }}>
            Asignar / Actualizar Acceso
          </h2>
          <form
            action={addAccess}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              alignItems: "end"
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Correo Electrónico (AUBASA)</label>
              <input
                type="email"
                name="email"
                required
                placeholder="nombre.apellido@aubasa.com.ar"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nombre y Apellido (Trazabilidad)</label>
              <input
                type="text"
                name="fullName"
                required
                placeholder="Ej. Juan Pérez"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Rol</label>
              <select name="role" required className="form-input" id="role-select">
                <option value="SECTOR">Sector (Restringido)</option>
                <option value="RRHH">Administrador RRHH</option>
                <option value="SGI">Administrador SGI (Total)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Sector (Solo si el rol es Sector)</label>
              <select name="sectorId" className="form-input">
                <option value="">-- Seleccionar Sector --</option>
                {sectores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Permisos Especiales</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", paddingTop: "0.25rem" }}>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "0.85rem" }}>
                  <input type="checkbox" name="isManager" style={{ width: "16px", height: "16px", marginRight: "0.5rem" }} />
                  Es Gerente (Puede firmar perfiles)
                </label>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "var(--teal-color)" }}>
                  <input type="checkbox" name="canEvaluateEfficacy" style={{ width: "16px", height: "16px", marginRight: "0.5rem" }} />
                  ✓ Apto para Medir Eficacia
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem", height: "fit-content" }}>
              + Guardar Acceso
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Correo Electrónico</th>
                <th>Nombre y Apellido (Trazabilidad)</th>
                <th>Rol / Sector</th>
                <th>¿Apto para Medir Eficacia?</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const cleanEmail = u.email.toLowerCase().trim();
                const config = evaluatorsMap[cleanEmail];
                const canEval = config ? config.canEvaluate : u.role === "SGI";
                const displayFullName = config?.fullName || formatNameFromEmail(cleanEmail);

                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.email}</td>
                    <td>
                      <form action={updateUserEfficacyPermission} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <input type="hidden" name="email" value={cleanEmail} />
                        <input type="hidden" name="canEvaluate" value={canEval ? "true" : "false"} />
                        <input
                          type="text"
                          name="fullName"
                          defaultValue={displayFullName}
                          className="form-input"
                          style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem", maxWidth: "190px" }}
                          placeholder="Nombre y Apellido"
                        />
                        <button
                          type="submit"
                          className="btn btn-secondary"
                          style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
                          title="Guardar Nombre y Apellido"
                        >
                          💾
                        </button>
                      </form>
                    </td>
                    <td>
                      <div>
                        {u.role === "SGI" && <span className="badge badge-primary">Admin SGI</span>}
                        {u.role === "RRHH" && (
                          <span className="badge badge-primary" style={{ background: "#0284c7" }}>
                            Admin RRHH
                          </span>
                        )}
                        {u.role === "SECTOR" && <span className="badge badge-secondary">Sector</span>}
                        {u.isManager && (
                          <span className="badge badge-warning" style={{ marginLeft: "0.5rem" }}>
                            Gerente
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                        {u.role === "SECTOR" ? u.sector?.name || "-" : "Todo el Sistema"}
                      </div>
                    </td>
                    <td>
                      <form action={updateUserEfficacyPermission}>
                        <input type="hidden" name="email" value={cleanEmail} />
                        <input type="hidden" name="fullName" value={displayFullName} />
                        <input type="hidden" name="canEvaluate" value={canEval ? "false" : "true"} />
                        <button
                          type="submit"
                          className="btn"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            borderRadius: "20px",
                            background: canEval ? "#dcfce7" : "#f1f5f9",
                            color: canEval ? "#166534" : "#64748b",
                            border: `1px solid ${canEval ? "#86efac" : "#cbd5e1"}`
                          }}
                          title="Hacé clic para habilitar o deshabilitar el permiso de medir eficacia"
                        >
                          {canEval ? "✅ Apto para Medir Eficacia" : "❌ No habilitado (Clic para habilitar)"}
                        </button>
                      </form>
                    </td>
                    <td>
                      <form action={removeAccess}>
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className="btn btn-secondary"
                          style={{
                            padding: "0.4rem 0.8rem",
                            color: "#dc2626",
                            borderColor: "#fecaca",
                            background: "#fef2f2"
                          }}
                        >
                          Quitar Acceso
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch (error: any) {
    if (error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return (
      <div style={{ padding: "2rem", color: "red" }}>
        <h1>Error Interno (Debug)</h1>
        <pre>{error.message}</pre>
        <pre>{error.stack}</pre>
      </div>
    );
  }
}
