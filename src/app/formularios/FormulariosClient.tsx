"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OnlineTrainingForm, OnlineFormQuestion } from "@/lib/onlineForms";
import { createOnlineFormAction, deleteOnlineFormAction } from "./actions";

interface CompletedResponseItem {
  id: number;
  employeeName: string;
  legajo: string;
  sectorName: string;
  trainingName: string;
  score: string | null;
  completedAt: string | null;
}

export function FormulariosClient({
  forms,
  allTrainings,
  completedResponses,
  isSector,
  mySectorName,
  isAdmin
}: {
  forms: OnlineTrainingForm[];
  allTrainings: { id: number; title: string }[];
  completedResponses: CompletedResponseItem[];
  isSector: boolean;
  mySectorName: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estado del creador de formularios
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trainingName, setTrainingName] = useState("");
  const [objective, setObjective] = useState("");
  const [instructorName, setInstructorName] = useState(
    mySectorName ? `Instructor — ${mySectorName}` : "Montes Sergio (Leg. 11739)"
  );
  const [questions, setQuestions] = useState<OnlineFormQuestion[]>([
    {
      id: "q_1",
      question: "",
      options: ["", "", ""],
      correctIndex: 0
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyLink = (formId: string) => {
    const url = `${window.location.origin}/responder/${formId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(formId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length + 1}`,
        question: "",
        options: ["", "", ""],
        correctIndex: 0
      }
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !trainingName.trim()) return;
    setIsSaving(true);
    try {
      const cleanQuestions = questions
        .filter((q) => q.question.trim())
        .map((q) => ({
          ...q,
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean)
        }));

      const res = await createOnlineFormAction({
        title,
        description,
        trainingName,
        objective,
        instructorName,
        questions: cleanQuestions
      });

      if (res.ok) {
        setShowBuilder(false);
        setTitle("");
        setDescription("");
        setTrainingName("");
        setObjective("");
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (formId: string) => {
    if (!confirm("¿Seguro que deseás eliminar este formulario online?")) return;
    const res = await deleteOnlineFormAction(formId);
    if (res.ok) {
      router.refresh();
    } else if (res.error) {
      alert(res.error);
    }
  };

  return (
    <div>
      {/* BARRA SUPERIOR */}
      <div
        className="card"
        style={{
          marginBottom: "1.75rem",
          borderLeft: "6px solid #0d8383",
          background: "linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ flex: "1 1 460px" }}>
          <span
            style={{
              backgroundColor: "#0d8383",
              color: "#ffffff",
              fontSize: "0.73rem",
              fontWeight: 700,
              padding: "0.25rem 0.7rem",
              borderRadius: "999px",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}
          >
            {isSector ? `Vista de Sector: ${mySectorName}` : "Vista Global Administrador (SGI / RRHH)"}
          </span>
          <h2 style={{ margin: "0.45rem 0 0.25rem 0", color: "#1b365d", fontSize: "1.35rem" }}>
            📝 Formularios Online de Capacitación (Cierre y Firmas en el Acto)
          </h2>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Compartí el enlace por <strong>WhatsApp o Mail</strong> (funciona con o sin correo corporativo). Cuando la persona responde, el sistema calcula la nota, estampa automáticamente la <strong>Firma del Capacitado y del Instructor</strong> y pasa la capacitación a <strong>Realizado</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowBuilder(!showBuilder)}
          className="btn"
          style={{
            backgroundColor: showBuilder ? "#f1f5f9" : "#1b365d",
            color: showBuilder ? "#1e293b" : "#ffffff",
            fontWeight: 700,
            padding: "0.65rem 1.25rem",
            borderRadius: "8px",
            border: "1px solid #cbd5e1"
          }}
        >
          {showBuilder ? "✕ Cerrar Creador" : "➕ Crear Nuevo Formulario Online"}
        </button>
      </div>

      {/* CREADOR DE NUEVO FORMULARIO */}
      {showBuilder && (
        <form
          onSubmit={handleCreateForm}
          className="card"
          style={{
            marginBottom: "2rem",
            borderTop: "4px solid #1b365d",
            backgroundColor: "#ffffff"
          }}
        >
          <h3 style={{ marginTop: 0, color: "#1b365d", marginBottom: "1rem" }}>
            Configurar Nuevo Formulario Online {mySectorName ? `(${mySectorName})` : "(Global)"}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem"
            }}
          >
            <div>
              <label className="form-label">Título del Formulario *</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Evaluación de Seguridad Vial"
                required
              />
            </div>

            <div>
              <label className="form-label">Tema de Capacitación que cierra en el Plan *</label>
              <input
                list="online-form-topics"
                className="form-input"
                value={trainingName}
                onChange={(e) => setTrainingName(e.target.value)}
                placeholder="Elegí o escribí el tema..."
                required
              />
              <datalist id="online-form-topics">
                {allTrainings.map((t) => (
                  <option key={t.id} value={t.title} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="form-label">Nombre del Instructor (Firma Automática) *</label>
              <input
                type="text"
                className="form-input"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                required
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
              marginBottom: "1.25rem"
            }}
          >
            <div>
              <label className="form-label">Objetivo de la Capacitación *</label>
              <input
                type="text"
                className="form-input"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="¿Qué buscamos lograr con esta capacitación?"
                required
              />
            </div>

            <div>
              <label className="form-label">Descripción / Instrucciones para el participante</label>
              <input
                type="text"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve introducción del cuestionario..."
              />
            </div>
          </div>

          <h4 style={{ color: "#0d8383", marginBottom: "0.75rem" }}>
            Preguntas de Opción Múltiple (Calificación Automática de 0 a 10)
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
            {questions.map((q, qIdx) => (
              <div
                key={q.id}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "1rem",
                  backgroundColor: "#f8fafc"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <strong style={{ color: "#1b365d" }}>Pregunta #{qIdx + 1}</strong>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.82rem"
                      }}
                    >
                      Eliminar pregunta
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  className="form-input"
                  placeholder="Escribí el enunciado de la pregunta..."
                  value={q.question}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuestions((prev) =>
                      prev.map((item, i) => (i === qIdx ? { ...item, question: val } : item))
                    );
                  }}
                  style={{ marginBottom: "0.75rem" }}
                  required
                />

                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <input
                        type="radio"
                        name={`correct_${q.id}`}
                        checked={q.correctIndex === oIdx}
                        onChange={() => {
                          setQuestions((prev) =>
                            prev.map((item, i) =>
                              i === qIdx ? { ...item, correctIndex: oIdx } : item
                            )
                          );
                        }}
                        title="Marcar como respuesta correcta"
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder={`Opción ${oIdx + 1}${q.correctIndex === oIdx ? " (Respuesta Correcta ✓)" : ""}`}
                        value={opt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions((prev) =>
                            prev.map((item, i) => {
                              if (i !== qIdx) return item;
                              const nextOpts = [...item.options];
                              nextOpts[oIdx] = val;
                              return { ...item, options: nextOpts };
                            })
                          );
                        }}
                        required={oIdx < 2}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="btn btn-secondary"
              style={{ fontWeight: 600 }}
            >
              ➕ Agregar otra pregunta
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{ backgroundColor: "#0d8383", fontWeight: 700, padding: "0.6rem 1.5rem" }}
            >
              {isSaving ? "Guardando Formulario..." : "💾 Guardar y Publicar Formulario"}
            </button>
          </div>
        </form>
      )}

      {/* LISTADO DE FORMULARIOS DISPONIBLES */}
      <div style={{ display: "grid", gap: "1.25rem" }}>
        {forms.map((form) => {
          const formResponses = completedResponses.filter(
            (r) => r.trainingName.trim().toLowerCase() === form.trainingName.trim().toLowerCase()
          );
          const isShowingResponses = selectedFormForResponses === form.id;

          return (
            <div
              key={form.id}
              className="card"
              style={{
                borderLeft: "5px solid #0d8383",
                padding: "1.25rem 1.5rem"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}
              >
                <div style={{ flex: "1 1 420px" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                    <span
                      style={{
                        backgroundColor: form.ownerSectorName ? "#e0f2fe" : "#dcfce7",
                        color: form.ownerSectorName ? "#1b365d" : "#166534",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px"
                      }}
                    >
                      {form.ownerSectorName ? `Sector: ${form.ownerSectorName}` : "Institucional AUBASA (SGI / RRHH)"}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      • {form.questions.length} preguntas • Instructor: <strong>{form.instructorName}</strong>
                    </span>
                  </div>

                  <h3 style={{ margin: "0 0 0.3rem 0", color: "#1b365d", fontSize: "1.15rem" }}>
                    {form.title}
                  </h3>
                  <div style={{ fontSize: "0.86rem", color: "#0d8383", fontWeight: 600, marginBottom: "0.35rem" }}>
                    🎓 Tema vinculado: {form.trainingName}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.86rem", color: "#475569" }}>
                    <strong>Objetivo:</strong> {form.objective}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <Link
                    href={`/responder/${form.id}`}
                    target="_blank"
                    className="btn"
                    style={{
                      backgroundColor: "#0d8383",
                      color: "#ffffff",
                      fontWeight: 600,
                      fontSize: "0.84rem",
                      padding: "0.45rem 0.9rem",
                      borderRadius: "8px",
                      textDecoration: "none"
                    }}
                  >
                    👁️ Abrir Formulario
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(form.id)}
                    className="btn"
                    style={{
                      backgroundColor: copiedId === form.id ? "#dcfce7" : "#eff6ff",
                      color: copiedId === form.id ? "#166534" : "#1b365d",
                      border: "1px solid #bfdbfe",
                      fontWeight: 600,
                      fontSize: "0.84rem",
                      padding: "0.45rem 0.9rem",
                      borderRadius: "8px"
                    }}
                  >
                    {copiedId === form.id ? "✓ ¡Link Copiado!" : "🔗 Copiar Link (WhatsApp / Mail)"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFormForResponses(isShowingResponses ? null : form.id)
                    }
                    className="btn btn-secondary"
                    style={{ fontSize: "0.84rem", padding: "0.45rem 0.9rem" }}
                  >
                    📊 Respuestas ({formResponses.length})
                  </button>

                  {form.id !== "manual-uso-sgcysv" && (isAdmin || form.ownerSectorName === mySectorName) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(form.id)}
                      className="btn"
                      style={{
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                        fontSize: "0.82rem",
                        padding: "0.45rem 0.75rem",
                        borderRadius: "8px"
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {isShowingResponses && (
                <div
                  style={{
                    marginTop: "1.1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid #e2e8f0"
                  }}
                >
                  <h4 style={{ margin: "0 0 0.65rem 0", color: "#1b365d", fontSize: "0.95rem" }}>
                    Personal {isSector ? `de ${mySectorName}` : ""} con esta capacitación cerrada y firmada ({formResponses.length})
                  </h4>
                  {formResponses.length === 0 ? (
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                      Aún no se registran respuestas completadas para este tema en tu vista.
                    </p>
                  ) : (
                    <table className="data-table" style={{ fontSize: "0.86rem" }}>
                      <thead>
                        <tr>
                          <th>Legajo</th>
                          <th>Colaborador</th>
                          <th>Sector</th>
                          <th>Fecha Realización</th>
                          <th>Nota</th>
                          <th>Estado Firma</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formResponses.slice(0, 50).map((r) => (
                          <tr key={r.id}>
                            <td>{r.legajo}</td>
                            <td style={{ fontWeight: 600 }}>{r.employeeName}</td>
                            <td>{r.sectorName}</td>
                            <td>
                              {r.completedAt
                                ? new Date(r.completedAt).toLocaleDateString("es-AR")
                                : "-"}
                            </td>
                            <td>
                              <strong>{r.score || "10"}</strong> / 10
                            </td>
                            <td style={{ color: "#15803d", fontWeight: 600 }}>
                              ✓ Firmado (Empleado + Instructor)
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
