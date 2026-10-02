"use client";

import { useState } from "react";
import { updateTopicSgi, deleteTopic } from "./actions";

interface TopicItem {
  id: number;
  title: string;
}

export function TopicsTableClient({
  topics,
  isSgi
}: {
  topics: TopicItem[];
  isSgi: boolean;
}) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const filteredTopics = topics.filter((t) =>
    t.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  const startEdit = (topic: TopicItem) => {
    setEditingId(topic.id);
    setEditValue(topic.title);
    setFeedbackMsg(null);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editValue.trim()) return;
    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const fd = new FormData();
      fd.set("id", String(id));
      fd.set("title", editValue.trim());

      const res = await updateTopicSgi(fd);
      if (res?.error) {
        setFeedbackMsg({ text: res.error, isError: true });
      } else {
        setFeedbackMsg({
          text: `✓ Tema actualizado correctamente. Se actualizaron ${res?.updatedRecords ?? 0} capacitaciones asociadas en el sistema.`
        });
        setEditingId(null);
      }
    } catch {
      setFeedbackMsg({ text: "Error al guardar la modificación.", isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", background: "#f8fafc" }}>
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
          Mostrando {filteredTopics.length} de {topics.length} temas
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
            <th style={{ width: "80px" }}>ID</th>
            <th>Tema de Capacitación</th>
            <th style={{ width: "240px" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredTopics.map((c) => {
            const isEditing = editingId === c.id;
            return (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td style={{ fontWeight: "bold" }}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="form-input"
                      style={{ width: "100%", fontWeight: 600 }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveEdit(c.id);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (
                    c.title
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
                            title="Modificar nombre e impactar en todas las capacitaciones asociadas (Solo SGI)"
                          >
                            ✏️ Editar
                          </button>
                        )}
                      </>
                    )}

                    {!isEditing && (
                      <form action={deleteTopic}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="btn"
                          style={{
                            backgroundColor: "#fee2e2",
                            color: "#dc2626",
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.82rem"
                          }}
                        >
                          Eliminar
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {filteredTopics.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: "center" }}>
                No se encontraron temas que coincidan con la búsqueda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
