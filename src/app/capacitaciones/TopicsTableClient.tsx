"use client";

import { useState } from "react";
import { updateTopicSgi, deleteTopic } from "./actions";

export interface TopicItem {
  id: number;
  title: string;
  allSectors?: boolean;
  sectors?: string[];
  createdBySector?: string;
  canDeleteBySector?: boolean;
}

export function TopicsTableClient({
  topics,
  isSgi,
  isSector = false,
  mySectorName = "",
  allSectors = []
}: {
  topics: TopicItem[];
  isSgi: boolean;
  isSector?: boolean;
  mySectorName?: string;
  allSectors?: { id: number; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editScope, setEditScope] = useState<"all" | "custom">("all");
  const [editSectors, setEditSectors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const filteredTopics = topics.filter((t) =>
    t.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  const startEdit = (topic: TopicItem) => {
    setEditingId(topic.id);
    setEditValue(topic.title);
    setEditScope(topic.allSectors ? "all" : "custom");
    setEditSectors(topic.sectors || []);
    setFeedbackMsg(null);
  };

  const handleToggleSector = (secName: string) => {
    if (editSectors.includes(secName)) {
      setEditSectors(editSectors.filter((s) => s !== secName));
    } else {
      setEditSectors([...editSectors, secName]);
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editValue.trim()) return;
    if (editScope === "custom" && editSectors.length === 0) {
      setFeedbackMsg({ text: "Debes seleccionar al menos un sector o marcar 'Todos los sectores'.", isError: true });
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const fd = new FormData();
      fd.set("id", String(id));
      fd.set("title", editValue.trim());
      fd.set("scope", editScope);
      if (editScope === "all") {
        fd.set("allSectors", "true");
      } else {
        fd.set("allSectors", "false");
        editSectors.forEach((s) => fd.append("sectors", s));
      }

      const res = await updateTopicSgi(fd);
      if (res?.error) {
        setFeedbackMsg({ text: res.error, isError: true });
      } else {
        setFeedbackMsg({
          text: `✓ Tema actualizado correctamente. Se actualizaron ${res?.updatedRecords ?? 0} registros asociados.`
        });
        setEditingId(null);
      }
    } catch {
      setFeedbackMsg({ text: "Error al guardar la modificación.", isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    const confirmText = isSector
      ? `¿Estás seguro de eliminar el tema "${title}" para tu sector?`
      : `¿Estás seguro de eliminar el tema "${title}"?`;
    if (!window.confirm(confirmText)) return;

    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const fd = new FormData();
      fd.set("id", String(id));
      const res = await deleteTopic(fd);
      if (res?.error) {
        setFeedbackMsg({ text: res.error, isError: true });
      } else {
        setFeedbackMsg({ text: `✓ Tema "${title}" eliminado correctamente.` });
      }
    } catch {
      setFeedbackMsg({ text: "Ocurrió un error al intentar eliminar el tema.", isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          background: "#f8fafc"
        }}
      >
        <div style={{ flex: "1 1 280px", maxWidth: "420px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Buscar tema de capacitación..."
            className="form-input"
            style={{ borderRadius: "8px", backgroundColor: "white" }}
          />
        </div>
        <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>
          Mostrando {filteredTopics.length} de {topics.length} temas {isSector && `para ${mySectorName}`}
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            margin: "1rem 1.25rem 0",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 600,
            backgroundColor: feedbackMsg.isError ? "#fee2e2" : "#dcfce7",
            color: feedbackMsg.isError ? "#b91c1c" : "#166534",
            border: `1px solid ${feedbackMsg.isError ? "#fecaca" : "#bbf7d0"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "inherit" }}
          >
            ✕
          </button>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: "70px" }}>ID</th>
            <th>Tema de Capacitación</th>
            <th style={{ width: "260px" }}>Alcance de Sectores</th>
            <th style={{ width: "200px" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredTopics.map((c) => {
            const isEditing = editingId === c.id;
            return (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="form-input"
                        style={{ width: "100%", fontWeight: 600 }}
                        autoFocus
                      />

                      {/* Edición de sectores (Solo SGI) */}
                      {isSgi && (
                        <div
                          style={{
                            background: "#f1f5f9",
                            padding: "0.75rem",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1"
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: "0.4rem" }}>
                            Sectores Habilitados:
                          </div>
                          <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem" }}>
                              <input
                                type="radio"
                                name={`scope-${c.id}`}
                                checked={editScope === "all"}
                                onChange={() => setEditScope("all")}
                              />
                              🌐 Todos los sectores
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.82rem" }}>
                              <input
                                type="radio"
                                name={`scope-${c.id}`}
                                checked={editScope === "custom"}
                                onChange={() => setEditScope("custom")}
                              />
                              🎯 Sectores específicos
                            </label>
                          </div>

                          {editScope === "custom" && (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                                gap: "0.4rem",
                                maxHeight: "140px",
                                overflowY: "auto",
                                padding: "0.4rem",
                                background: "white",
                                borderRadius: "6px"
                              }}
                            >
                              {allSectors.map((s) => (
                                <label
                                  key={s.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    fontSize: "0.78rem"
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={editSectors.includes(s.name)}
                                    onChange={() => handleToggleSector(s.name)}
                                  />
                                  <span>{s.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontWeight: "bold", color: "#1e293b" }}>{c.title}</span>
                      {c.createdBySector && (
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
                          Creado por sector: <em>{c.createdBySector}</em>
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  {c.allSectors ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                        border: "1px solid #a7f3d0"
                      }}
                    >
                      🌐 Todos los sectores
                    </span>
                  ) : c.sectors && c.sectors.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                      {c.sectors.map((sec) => (
                        <span
                          key={sec}
                          style={{
                            padding: "0.15rem 0.45rem",
                            borderRadius: "6px",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe"
                          }}
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>
                      {isSector ? mySectorName : "Sin sector asignado"}
                    </span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {isSgi && (
                      <>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveEdit(c.id)}
                              className="btn btn-primary"
                              style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                            >
                              {isSaving ? "Guardando..." : "💾 Guardar"}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => setEditingId(null)}
                              className="btn btn-secondary"
                              style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            className="btn btn-secondary"
                            style={{
                              padding: "0.25rem 0.6rem",
                              fontSize: "0.82rem",
                              backgroundColor: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              fontWeight: 600
                            }}
                            title="Editar nombre y sectores asignados"
                          >
                            ✏️ Editar
                          </button>
                        )}
                      </>
                    )}

                    {!isEditing && (
                      <>
                        {/* El botón de eliminar se muestra si es SGI o si el tema pertenece al sector */}
                        {(isSgi || c.canDeleteBySector) && (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleDelete(c.id, c.title)}
                            className="btn"
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#dc2626",
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.82rem",
                              border: "1px solid #fecaca"
                            }}
                            title={isSector ? "Eliminar este tema de tu sector" : "Eliminar tema"}
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {filteredTopics.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                No se encontraron temas que coincidan con la búsqueda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
