"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OnlineTrainingForm, OnlineFormQuestion } from "@/lib/onlineForms";
import { createOnlineFormAction, deleteOnlineFormAction } from "./actions";
import { getDefaultInstructorForSector } from "@/lib/instructorDefaults";
import { supabase } from "@/lib/supabase";

interface CompletedResponseItem {
  id: number;
  employeeName: string;
  legajo: string;
  sectorName: string;
  trainingName: string;
  score: string | null;
  completedAt: string | null;
  email?: string | null;
}

export function FormulariosClient({
  forms,
  allTrainings,
  completedResponses,
  isSector,
  mySectorName,
  isAdmin,
  sectors = []
}: {
  forms: OnlineTrainingForm[];
  allTrainings: { id: number; title: string }[];
  completedResponses: CompletedResponseItem[];
  isSector: boolean;
  mySectorName: string;
  isAdmin: boolean;
  sectors?: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Derivación del instructor predeterminado respetando jerarquías
  const defaultInst = getDefaultInstructorForSector(mySectorName);
  const initialInstructor = mySectorName
    ? `${defaultInst.name}${defaultInst.legajo ? ` (Leg. ${defaultInst.legajo})` : ""}`
    : "Montes Sergio (Leg. 11739)";

  // Estado del creador de formularios
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trainingName, setTrainingName] = useState("");
  const [objective, setObjective] = useState("");
  const [targetSectorName, setTargetSectorName] = useState<string>("GLOBAL");
  const [instructorName, setInstructorName] = useState(initialInstructor);

  // Material audiovisual y de lectura
  const [videoUrl, setVideoUrl] = useState("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);

  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);

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

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingVideo(true);
    setVideoUploadError(null);
    try {
      const cleanName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.-]/g, "_");
      const filename = `video-form-${Date.now()}-${cleanName}`;
      const { error: uploadError } = await supabase.storage
        .from("evidencias")
        .upload(filename, file, {
          contentType: file.type || "video/mp4",
          upsert: true
        });
      if (uploadError) throw uploadError;
      const { data: pubData } = supabase.storage.from("evidencias").getPublicUrl(filename);
      setVideoUrl(pubData.publicUrl);
    } catch (err: any) {
      console.error("Error al subir video:", err);
      setVideoUploadError(
        "No se pudo subir el archivo de video. Podés pegar un enlace directo (ej: YouTube o Google Drive)."
      );
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPdf(true);
    setPdfUploadError(null);
    try {
      const cleanName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.-]/g, "_");
      const filename = `pdf-form-${Date.now()}-${cleanName}`;
      const { error: uploadError } = await supabase.storage
        .from("evidencias")
        .upload(filename, file, {
          contentType: "application/pdf",
          upsert: true
        });
      if (uploadError) throw uploadError;
      const { data: pubData } = supabase.storage.from("evidencias").getPublicUrl(filename);
      setPdfUrl(pubData.publicUrl);
      setPdfName(file.name);
    } catch (err: any) {
      console.error("Error al subir PDF:", err);
      setPdfUploadError("No se pudo subir el archivo PDF. Podés pegar el enlace directamente.");
    } finally {
      setIsUploadingPdf(false);
    }
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
        videoUrl: videoUrl.trim() || null,
        pdfUrl: pdfUrl.trim() || null,
        pdfName: pdfName.trim() || null,
        questions: cleanQuestions,
        targetSectorName: isAdmin ? targetSectorName : undefined
      });

      if (res.ok) {
        setShowBuilder(false);
        setTitle("");
        setDescription("");
        setTrainingName("");
        setObjective("");
        setVideoUrl("");
        setPdfUrl("");
        setPdfName("");
        setTargetSectorName("GLOBAL");
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
            Compartí el enlace por <strong>WhatsApp o Mail</strong>. Ahora podés incorporar un <strong>Video de Capacitación</strong> y/o un <strong>Documento PDF</strong> para que el colaborador lo revise antes de responder. Al enviar, el colaborador estampa su <strong>Firma Manuscrita en pantalla</strong> y el Instructor queda validado digitalmente.
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
                placeholder="Ej: Capacitación de Seguridad e Higiene"
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
              <label className="form-label">Nombre del Instructor (Firma Digital) *</label>
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

            {isAdmin && sectors.length > 0 && (
              <div>
                <label className="form-label">Sector Propietario / Visible para:</label>
                <select
                  className="form-input"
                  value={targetSectorName}
                  onChange={(e) => setTargetSectorName(e.target.value)}
                >
                  <option value="GLOBAL">Solo Administradores (SGI / RRHH / No visible a sectores)</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.name}>
                      Sector: {s.name}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Si seleccionás un sector específico, solo ese sector y los administradores verán este formulario.
                </span>
              </div>
            )}
          </div>

          {/* MATERIAL AUDIOVISUAL Y DOCUMENTAL (VIDEO Y PDF) */}
          <div
            style={{
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              borderRadius: "10px",
              padding: "1.25rem",
              marginBottom: "1.5rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "1.25rem" }}>🎬</span>
              <h4 style={{ margin: 0, color: "#1b365d", fontSize: "1.05rem" }}>
                Material de Capacitación: Video y PDF (Opcional)
              </h4>
            </div>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.86rem", color: "#64748b" }}>
              El participante podrá ver el video instructivo y/o descargar y leer el documento PDF antes de responder el cuestionario.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.25rem"
              }}
            >
              {/* VIDEO */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  padding: "1rem",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}
              >
                <div style={{ fontWeight: 700, color: "#1b365d", marginBottom: "0.35rem", fontSize: "0.92rem" }}>
                  🎥 Video de la Capacitación
                </div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.6rem" }}>
                  Pegá un link de YouTube, Vimeo, Google Drive o subí un archivo de video (.mp4).
                </div>

                <input
                  type="url"
                  className="form-input"
                  placeholder="https://www.youtube.com/watch?v=... o https://drive.google.com/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  style={{ marginBottom: "0.6rem" }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <label
                    style={{
                      cursor: isUploadingVideo ? "not-allowed" : "pointer",
                      backgroundColor: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem"
                    }}
                  >
                    <span>{isUploadingVideo ? "⏳ Subiendo archivo..." : "📤 Subir Video (.mp4)"}</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime"
                      style={{ display: "none" }}
                      disabled={isUploadingVideo}
                      onChange={handleVideoFileUpload}
                    />
                  </label>

                  {videoUrl && (
                    <button
                      type="button"
                      onClick={() => setVideoUrl("")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: 600
                      }}
                    >
                      ✕ Quitar video
                    </button>
                  )}
                </div>

                {videoUrl && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#166534", fontWeight: 600 }}>
                    ✓ Video configurado correctamente
                  </div>
                )}
                {videoUploadError && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#dc2626" }}>
                    {videoUploadError}
                  </div>
                )}
              </div>

              {/* PDF */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  padding: "1rem",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}
              >
                <div style={{ fontWeight: 700, color: "#1b365d", marginBottom: "0.35rem", fontSize: "0.92rem" }}>
                  📄 Material PDF de Lectura / Presentación
                </div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.6rem" }}>
                  Subí un documento PDF oficial o pegá un enlace directo.
                </div>

                <input
                  type="url"
                  className="form-input"
                  placeholder="https://... enlace al archivo PDF"
                  value={pdfUrl}
                  onChange={(e) => {
                    setPdfUrl(e.target.value);
                    if (!pdfName) setPdfName("Documento PDF");
                  }}
                  style={{ marginBottom: "0.6rem" }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <label
                    style={{
                      cursor: isUploadingPdf ? "not-allowed" : "pointer",
                      backgroundColor: "#f0fdfa",
                      color: "#0f766e",
                      border: "1px solid #99f6e4",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem"
                    }}
                  >
                    <span>{isUploadingPdf ? "⏳ Subiendo archivo..." : "📤 Subir PDF (.pdf)"}</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      style={{ display: "none" }}
                      disabled={isUploadingPdf}
                      onChange={handlePdfFileUpload}
                    />
                  </label>

                  {pdfUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setPdfUrl("");
                        setPdfName("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: 600
                      }}
                    >
                      ✕ Quitar PDF
                    </button>
                  )}
                </div>

                {pdfUrl && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#166534", fontWeight: 600 }}>
                    ✓ PDF: {pdfName || "Material de capacitación"}
                  </div>
                )}
                {pdfUploadError && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#dc2626" }}>
                    {pdfUploadError}
                  </div>
                )}
              </div>
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
                        placeholder={`Opción ${oIdx + 1}${oIdx === q.correctIndex ? " (Respuesta Correcta)" : ""}`}
                        value={opt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions((prev) =>
                            prev.map((item, i) => {
                              if (i !== qIdx) return item;
                              const updatedOptions = [...item.options];
                              updatedOptions[oIdx] = val;
                              return { ...item, options: updatedOptions };
                            })
                          );
                        }}
                        style={{
                          borderColor: oIdx === q.correctIndex ? "#0d8383" : undefined,
                          backgroundColor: oIdx === q.correctIndex ? "#f0fdfa" : undefined
                        }}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="btn btn-secondary"
              style={{ fontSize: "0.88rem" }}
            >
              ➕ Agregar otra pregunta
            </button>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setShowBuilder(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving || isUploadingVideo || isUploadingPdf}
                style={{ backgroundColor: "#0d8383" }}
              >
                {isSaving ? "Guardando formulario..." : "💾 Guardar y Publicar Formulario"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* LISTADO DE FORMULARIOS ACTIVOS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {forms.map((form) => {
          const formResponses = completedResponses.filter((r) => r.trainingName === form.trainingName);
          const isShowingResponses = selectedFormForResponses === form.id;

          return (
            <div
              key={form.id}
              className="card"
              style={{
                borderLeft: form.id === "manual-uso-sgcysv" ? "6px solid #1b365d" : "6px solid #0d8383",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
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
                <div style={{ flex: "1 1 450px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                    <span
                      style={{
                        backgroundColor: form.id === "manual-uso-sgcysv" ? "#e0f2fe" : "#f0fdfa",
                        color: form.id === "manual-uso-sgcysv" ? "#0369a1" : "#0f766e",
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px"
                      }}
                    >
                      {form.ownerSectorName ? `Sector: ${form.ownerSectorName}` : "Institucional AUBASA (SGI / RRHH)"}
                    </span>

                    {form.videoUrl && (
                      <span
                        style={{
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.18rem 0.55rem",
                          borderRadius: "999px"
                        }}
                      >
                        🎬 Con Video
                      </span>
                    )}

                    {form.pdfUrl && (
                      <span
                        style={{
                          backgroundColor: "#dbeafe",
                          color: "#1e40af",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.18rem 0.55rem",
                          borderRadius: "999px"
                        }}
                      >
                        📄 Con PDF
                      </span>
                    )}

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
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.86rem", width: "100%" }}>
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
                                ✓ Firmado Manuscrito (Instructor Digital)
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
