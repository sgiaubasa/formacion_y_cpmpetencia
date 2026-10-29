"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  OnlineTrainingForm,
  OnlineFormQuestion,
  isOnlineTrainingMatch
} from "@/lib/onlineForms";
import { createOnlineFormAction, deleteOnlineFormAction } from "./actions";
import { getDefaultInstructorForSector } from "@/lib/instructorDefaults";
import { supabase } from "@/lib/supabase";

interface CompletedResponseItem {
  id: number;
  matchedFormId?: string | null;
  employeeName: string;
  legajo: string;
  sectorName: string;
  trainingName: string;
  instructorName?: string;
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
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<string | null>(
    forms[0]?.id || null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedInstructorId, setCopiedInstructorId] = useState<string | null>(null);

  const defaultInst = getDefaultInstructorForSector(mySectorName);
  const initialInstructor = mySectorName
    ? `${defaultInst.name}${defaultInst.legajo ? ` (Leg. ${defaultInst.legajo})` : ""}`
    : "Montes Sergio (Leg. 11739)";

  // Estado del creador / editor de formularios
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trainingName, setTrainingName] = useState("");
  const [objective, setObjective] = useState("");
  const [targetSectorName, setTargetSectorName] = useState<string>("GLOBAL");
  const [instructorName, setInstructorName] = useState(initialInstructor);
  const [instructorSignatureMode, setInstructorSignatureMode] = useState<"digital" | "link">(
    "digital"
  );

  // Selector de tipo de material interactivo
  const [materialTab, setMaterialTab] = useState<"pdf" | "video" | "both">("both");
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
      correctIndex: 0,
      points: 10
    }
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalAssignedPoints = Number(
    questions
      .reduce((acc, q) => acc + (typeof q.points === "number" && !isNaN(q.points) ? q.points : 0), 0)
      .toFixed(2)
  );

  const openNewFormBuilder = () => {
    setEditingFormId(null);
    setTitle("");
    setDescription("");
    setTrainingName("");
    setObjective("");
    setInstructorName(initialInstructor);
    setInstructorSignatureMode("digital");
    setVideoUrl("");
    setPdfUrl("");
    setPdfName("");
    setTargetSectorName("GLOBAL");
    setQuestions([
      {
        id: "q_1",
        question: "",
        options: ["", "", ""],
        correctIndex: 0,
        points: 10
      }
    ]);
    setFormError(null);
    setShowBuilder(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEditFormBuilder = (form: OnlineTrainingForm) => {
    setEditingFormId(form.id);
    setTitle(form.title);
    setDescription(form.description || "");
    setTrainingName(form.trainingName);
    setObjective(form.objective || "");
    setInstructorName(form.instructorName || initialInstructor);
    setInstructorSignatureMode(form.instructorSignatureMode || "digital");
    setVideoUrl(form.videoUrl || "");
    setPdfUrl(form.pdfUrl || "");
    setPdfName(form.pdfName || "");
    setTargetSectorName(form.ownerSectorName || "GLOBAL");
    const defaultPts =
      form.questions.length > 0 ? Number((10 / form.questions.length).toFixed(2)) : 10;
    setQuestions(
      form.questions.map((q) => ({
        ...q,
        points: typeof q.points === "number" ? q.points : defaultPts
      }))
    );
    setFormError(null);
    setShowBuilder(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCopyLink = (formId: string) => {
    const url = `${window.location.origin}/responder/${formId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(formId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyInstructorLink = (formId: string) => {
    const url = `${window.location.origin}/responder/${formId}?modo=instructor`;
    navigator.clipboard.writeText(url);
    setCopiedInstructorId(formId);
    setTimeout(() => setCopiedInstructorId(null), 2500);
  };

  const handleDistributePointsEqually = (qList: OnlineFormQuestion[]) => {
    if (qList.length === 0) return qList;
    const base = Math.floor((10 / qList.length) * 100) / 100;
    return qList.map((q, i) => {
      if (i === qList.length - 1) {
        const prevSum = base * (qList.length - 1);
        return { ...q, points: Number((10 - prevSum).toFixed(2)) };
      }
      return { ...q, points: base };
    });
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
    setQuestions((prev) => {
      const next = [
        ...prev,
        {
          id: `q_${Date.now()}_${prev.length + 1}`,
          question: "",
          options: ["", "", ""],
          correctIndex: 0,
          points: 1
        }
      ];
      return handleDistributePointsEqually(next);
    });
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return handleDistributePointsEqually(next);
    });
  };

  const handleCreateOrUpdateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !trainingName.trim()) {
      setFormError("Completá el título del formulario y el tema de capacitación.");
      return;
    }

    if (totalAssignedPoints > 10.01) {
      setFormError(
        `La suma de los puntajes de las preguntas (${totalAssignedPoints} pts) no puede superar los 10 puntos. Ajustá los valores o usá el botón "Distribuir 10 pts equitativamente".`
      );
      return;
    }

    if (totalAssignedPoints <= 0) {
      setFormError("El puntaje total asignado a las preguntas debe ser mayor a 0.");
      return;
    }

    setIsSaving(true);
    try {
      const cleanQuestions = questions
        .filter((q) => q.question.trim())
        .map((q) => ({
          ...q,
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
          points: typeof q.points === "number" && !isNaN(q.points) ? Number(q.points) : 1
        }));

      const res = await createOnlineFormAction({
        id: editingFormId || undefined,
        title,
        description,
        trainingName,
        objective,
        instructorName,
        instructorSignatureMode,
        videoUrl: videoUrl.trim() || null,
        pdfUrl: pdfUrl.trim() || null,
        pdfName: pdfName.trim() || null,
        questions: cleanQuestions,
        targetSectorName: isAdmin ? targetSectorName : undefined
      });

      if (res.ok) {
        setShowBuilder(false);
        setEditingFormId(null);
        router.refresh();
      } else if (res.error) {
        setFormError(res.error);
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
            📝 Formularios Online de Capacitación (Material Interactivo, Puntajes y Registro de Asistencia)
          </h2>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Podés adjuntar un <strong>Video</strong> y/o un <strong>Documento PDF</strong> para que la persona interactúe con el documento en pantalla antes de responder, asignar el <strong>puntaje de cada pregunta (hasta sumar 10)</strong>, y definir el <strong>Instructor (con Firma Digital o vía Link para todas las planillas)</strong>. La firma del empleado va directo al <strong>Registro de Asistencia PAU/05 - A9.3</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (showBuilder ? setShowBuilder(false) : openNewFormBuilder())}
          className="btn"
          style={{
            backgroundColor: showBuilder ? "#f1f5f9" : "#1b365d",
            color: showBuilder ? "#1e293b" : "#ffffff",
            fontWeight: 700,
            padding: "0.65rem 1.25rem",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            cursor: "pointer"
          }}
        >
          {showBuilder ? "✕ Cerrar Editor" : "➕ Crear Nuevo Formulario Online"}
        </button>
      </div>

      {/* CREADOR / EDITOR DE FORMULARIO */}
      {showBuilder && (
        <form
          onSubmit={handleCreateOrUpdateForm}
          className="card"
          style={{
            marginBottom: "2rem",
            borderTop: "5px solid #0d8383",
            backgroundColor: "#ffffff"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, color: "#1b365d" }}>
              {editingFormId
                ? `✏️ Editando Formulario: ${title}`
                : `➕ Configurar Nuevo Formulario Online ${mySectorName ? `(${mySectorName})` : "(Global)"}`}
            </h3>
            {editingFormId && (
              <span style={{ fontSize: "0.8rem", backgroundColor: "#e0f2fe", color: "#0369a1", padding: "0.25rem 0.65rem", borderRadius: "999px", fontWeight: 700 }}>
                Modo Edición (Agrega Video, PDF, Puntajes o Instructor)
              </span>
            )}
          </div>

          {/* 1. DATOS GENERALES */}
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
                  <option value="GLOBAL">Global Institucional (SGI / RRHH / Todos los sectores)</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.name}>
                      Sector: {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. CONFIGURACIÓN DEL INSTRUCTOR Y FIRMA PARA TODAS LAS PLANILLAS */}
          <div
            style={{
              border: "1px solid #bfdbfe",
              backgroundColor: "#eff6ff",
              borderRadius: "10px",
              padding: "1.15rem",
              marginBottom: "1.25rem"
            }}
          >
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#1e3a8a", fontSize: "1rem" }}>
              👨‍🏫 Instructor de la Capacitación y Modalidad de Firma en Planillas
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1rem",
                alignItems: "start"
              }}
            >
              <div>
                <label className="form-label" style={{ color: "#1e3a8a" }}>
                  Nombre y Apellido del Instructor *
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="Ej: David Ceballos / Horacio San Martin..."
                  required
                  style={{ backgroundColor: "#ffffff" }}
                />
              </div>

              <div>
                <label className="form-label" style={{ color: "#1e3a8a" }}>
                  Tipo de Firma del Instructor (aparecerá en todas las planillas) *
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      backgroundColor: instructorSignatureMode === "digital" ? "#ffffff" : "transparent",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      border: instructorSignatureMode === "digital" ? "2px solid #0d8383" : "1px solid #93c5fd",
                      cursor: "pointer",
                      fontSize: "0.86rem"
                    }}
                  >
                    <input
                      type="radio"
                      name="instSigMode"
                      checked={instructorSignatureMode === "digital"}
                      onChange={() => setInstructorSignatureMode("digital")}
                    />
                    <span>
                      <strong>🖥️ Firma Digital Automática:</strong> Estampa el sello digital validado del instructor en todas las planillas.
                    </span>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      backgroundColor: instructorSignatureMode === "link" ? "#ffffff" : "transparent",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      border: instructorSignatureMode === "link" ? "2px solid #0d8383" : "1px solid #93c5fd",
                      cursor: "pointer",
                      fontSize: "0.86rem"
                    }}
                  >
                    <input
                      type="radio"
                      name="instSigMode"
                      checked={instructorSignatureMode === "link"}
                      onChange={() => setInstructorSignatureMode("link")}
                    />
                    <span>
                      <strong>✍️ Generar Link para Firma Manuscrita del Instructor:</strong> Le enviás el link al instructor, firma una sola vez y aparece en todas las planillas de esta capacitación.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 3. MATERIAL INTERACTIVO: VIDEO O PDF */}
          <div
            style={{
              border: "2px solid #f59e0b",
              backgroundColor: "#fffbeb",
              borderRadius: "10px",
              padding: "1.25rem",
              marginBottom: "1.5rem"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <h4 style={{ margin: 0, color: "#92400e", fontSize: "1.05rem" }}>
                  🎬📄 Material Interactivo para el Participante (Video y/o Documento PDF)
                </h4>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.84rem", color: "#78350f" }}>
                  Elegí qué material querés mostrar arriba de las preguntas para que la persona lo vea o lea directamente en el formulario:
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  onClick={() => setMaterialTab("pdf")}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: "6px",
                    border: "1px solid #d97706",
                    backgroundColor: materialTab === "pdf" ? "#d97706" : "#ffffff",
                    color: materialTab === "pdf" ? "#ffffff" : "#92400e",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  📄 Solo PDF
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialTab("video")}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: "6px",
                    border: "1px solid #d97706",
                    backgroundColor: materialTab === "video" ? "#d97706" : "#ffffff",
                    color: materialTab === "video" ? "#ffffff" : "#92400e",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  🎬 Solo Video
                </button>
                <button
                  type="button"
                  onClick={() => setMaterialTab("both")}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: "6px",
                    border: "1px solid #d97706",
                    backgroundColor: materialTab === "both" ? "#d97706" : "#ffffff",
                    color: materialTab === "both" ? "#ffffff" : "#92400e",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  🎬+📄 Video y PDF
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.25rem"
              }}
            >
              {/* VIDEO */}
              {(materialTab === "video" || materialTab === "both") && (
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    padding: "1rem",
                    borderRadius: "8px",
                    border: "1px solid #fcd34d"
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#1b365d", marginBottom: "0.35rem", fontSize: "0.95rem" }}>
                    🎥 1. Video de la Capacitación
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.6rem" }}>
                    Subí un archivo de video desde tu PC (<strong>.mp4</strong>) o pegá un enlace de YouTube, Vimeo o Google Drive:
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                    <label
                      style={{
                        cursor: isUploadingVideo ? "not-allowed" : "pointer",
                        backgroundColor: "#0d8383",
                        color: "#ffffff",
                        padding: "0.45rem 0.9rem",
                        borderRadius: "6px",
                        fontSize: "0.84rem",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem"
                      }}
                    >
                      <span>{isUploadingVideo ? "⏳ Subiendo video..." : "📤 Subir Archivo de Video (.mp4)"}</span>
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
                          background: "#fee2e2",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.4rem 0.7rem",
                          color: "#dc2626",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 700
                        }}
                      >
                        ✕ Quitar video
                      </button>
                    )}
                  </div>

                  <input
                    type="url"
                    className="form-input"
                    placeholder="O pegá aquí el link de YouTube / Drive / MP4..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />

                  {videoUrl && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#166534", fontWeight: 700 }}>
                      ✓ Video listo para reproducirse en el formulario
                    </div>
                  )}
                  {videoUploadError && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#dc2626" }}>
                      {videoUploadError}
                    </div>
                  )}
                </div>
              )}

              {/* PDF */}
              {(materialTab === "pdf" || materialTab === "both") && (
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    padding: "1rem",
                    borderRadius: "8px",
                    border: "1px solid #fcd34d"
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#1b365d", marginBottom: "0.35rem", fontSize: "0.95rem" }}>
                    📄 2. Documento PDF Interactivo (Manual / Presentación)
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.6rem" }}>
                    Subí un archivo <strong>.pdf</strong> desde tu computadora para que el empleado pueda leerlo e interactuar en el formulario:
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                    <label
                      style={{
                        cursor: isUploadingPdf ? "not-allowed" : "pointer",
                        backgroundColor: "#1b365d",
                        color: "#ffffff",
                        padding: "0.45rem 0.9rem",
                        borderRadius: "6px",
                        fontSize: "0.84rem",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem"
                      }}
                    >
                      <span>{isUploadingPdf ? "⏳ Subiendo PDF..." : "📤 Subir Documento PDF (.pdf)"}</span>
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
                          background: "#fee2e2",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.4rem 0.7rem",
                          color: "#dc2626",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 700
                        }}
                      >
                        ✕ Quitar PDF
                      </button>
                    )}
                  </div>

                  <input
                    type="url"
                    className="form-input"
                    placeholder="O pegá aquí un link directo al archivo .pdf..."
                    value={pdfUrl}
                    onChange={(e) => {
                      setPdfUrl(e.target.value);
                      if (!pdfName) setPdfName("Documento PDF de Capacitación");
                    }}
                  />

                  {pdfUrl && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#166534", fontWeight: 700 }}>
                      ✓ PDF cargado: {pdfName || "Documento PDF listo para interactuar"}
                    </div>
                  )}
                  {pdfUploadError && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#dc2626" }}>
                      {pdfUploadError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 4. PREGUNTAS Y PUNTAJES (MÁXIMO 10 EN TOTAL) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "0.85rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              backgroundColor: totalAssignedPoints > 10.01 ? "#fee2e2" : "#f0fdfa",
              border: totalAssignedPoints > 10.01 ? "2px solid #dc2626" : "1px solid #99f6e4"
            }}
          >
            <div>
              <h4 style={{ margin: 0, color: "#1b365d", fontSize: "1rem" }}>
                ❓ Preguntas del Cuestionario y Puntaje de cada una (Máximo Total: 10 puntos)
              </h4>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: totalAssignedPoints > 10.01 ? "#dc2626" : "#0f766e"
                }}
              >
                Suma actual de puntajes: {totalAssignedPoints} / 10 puntos
                {totalAssignedPoints > 10.01 && " ⚠️ (¡No puede superar 10!)"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setQuestions((prev) => handleDistributePointsEqually(prev))}
              className="btn btn-secondary"
              style={{
                fontSize: "0.8rem",
                padding: "0.4rem 0.85rem",
                backgroundColor: "#ffffff",
                border: "1px solid #0d8383",
                color: "#0d8383",
                fontWeight: 700
              }}
            >
              ⚖️ Distribuir 10 pts equitativamente
            </button>
          </div>

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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginBottom: "0.65rem"
                  }}
                >
                  <strong style={{ color: "#1b365d", fontSize: "0.95rem" }}>
                    Pregunta #{qIdx + 1}
                  </strong>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <label
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          color: "#0f766e"
                        }}
                      >
                        Puntaje (pts):
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={q.points ?? 2}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setQuestions((prev) =>
                            prev.map((item, i) =>
                              i === qIdx ? { ...item, points: isNaN(val) ? 0 : val } : item
                            )
                          );
                        }}
                        className="form-input"
                        style={{
                          width: "85px",
                          padding: "0.25rem 0.5rem",
                          fontWeight: 700,
                          textAlign: "center",
                          borderColor: totalAssignedPoints > 10.01 ? "#dc2626" : "#0d8383"
                        }}
                        required
                      />
                    </div>

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
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
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

          {formError && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fca5a5",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontWeight: 700,
                fontSize: "0.88rem"
              }}
            >
              {formError}
            </div>
          )}

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
                onClick={() => {
                  setShowBuilder(false);
                  setEditingFormId(null);
                }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving || isUploadingVideo || isUploadingPdf || totalAssignedPoints > 10.01}
                style={{
                  backgroundColor: totalAssignedPoints > 10.01 ? "#94a3b8" : "#0d8383"
                }}
              >
                {isSaving
                  ? "Guardando..."
                  : editingFormId
                  ? "💾 Guardar Cambios del Formulario"
                  : "💾 Guardar y Publicar Formulario"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* LISTADO DE FORMULARIOS ACTIVOS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {forms.map((form) => {
          const formResponses = completedResponses.filter(
            (r) =>
              r.matchedFormId === form.id ||
              isOnlineTrainingMatch(r.trainingName, form.trainingName)
          );
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
                <div style={{ flex: "1 1 420px" }}>
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

                    {form.videoUrl ? (
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
                        🎬 Video Activo
                      </span>
                    ) : null}

                    {form.pdfUrl ? (
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
                        📄 PDF Activo
                      </span>
                    ) : null}

                    <span
                      style={{
                        backgroundColor: form.instructorSignature ? "#dcfce7" : "#f1f5f9",
                        color: form.instructorSignature ? "#166534" : "#334155",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "0.18rem 0.55rem",
                        borderRadius: "999px"
                      }}
                    >
                      {form.instructorSignature
                        ? "✍️ Firma Manuscrita Instructor Guardada"
                        : "🖥️ Firma Digital Instructor"}
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
                  <button
                    type="button"
                    onClick={() => openEditFormBuilder(form)}
                    className="btn"
                    style={{
                      backgroundColor: "#fef3c7",
                      color: "#92400e",
                      border: "1px solid #fcd34d",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "8px",
                      cursor: "pointer"
                    }}
                  >
                    ✏️ Subir Video / PDF / Puntajes
                  </button>

                  <Link
                    href={`/responder/${form.id}`}
                    target="_blank"
                    className="btn"
                    style={{
                      backgroundColor: "#0d8383",
                      color: "#ffffff",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      padding: "0.45rem 0.85rem",
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
                      fontSize: "0.82rem",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "8px",
                      cursor: "pointer"
                    }}
                  >
                    {copiedId === form.id ? "✓ ¡Link Participante Copiado!" : "🔗 Link Participantes"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyInstructorLink(form.id)}
                    className="btn"
                    style={{
                      backgroundColor: copiedInstructorId === form.id ? "#dcfce7" : "#f8fafc",
                      color: copiedInstructorId === form.id ? "#166534" : "#0f766e",
                      border: "1px solid #0d8383",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "8px",
                      cursor: "pointer"
                    }}
                    title="Copiar enlace para que el Instructor firme a mano y aparezca en todas las planillas de esta capacitación"
                  >
                    {copiedInstructorId === form.id
                      ? "✓ ¡Link Instructor Copiado!"
                      : "✍️ Link Firma Instructor"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFormForResponses(isShowingResponses ? null : form.id)
                    }
                    className="btn btn-secondary"
                    style={{ fontSize: "0.82rem", padding: "0.45rem 0.85rem", fontWeight: 700 }}
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
                    Personal {isSector ? `de ${mySectorName}` : ""} con esta capacitación realizada y firmada ({formResponses.length})
                  </h4>
                  {formResponses.length === 0 ? (
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                      Aún no se registran respuestas completadas para este tema en tu vista.
                    </p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.85rem", width: "100%" }}>
                        <thead>
                          <tr>
                            <th>Legajo</th>
                            <th>Colaborador</th>
                            <th>Sector</th>
                            <th>Fecha</th>
                            <th>Nota</th>
                            <th>Instructor</th>
                            <th>Registro de Asistencia (PAU/05 - A9.3)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formResponses.slice(0, 100).map((r) => (
                            <tr key={r.id}>
                              <td>{r.legajo}</td>
                              <td style={{ fontWeight: 600 }}>
                                {r.employeeName}
                                {r.email && (
                                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>
                                    {r.email}
                                  </div>
                                )}
                              </td>
                              <td>{r.sectorName}</td>
                              <td>
                                {r.completedAt
                                  ? new Date(r.completedAt).toLocaleDateString("es-AR")
                                  : "-"}
                              </td>
                              <td>
                                <strong>{r.score || "10"}</strong> / 10
                              </td>
                              <td style={{ fontSize: "0.8rem", color: "#334155" }}>
                                {r.instructorName || form.instructorName}
                              </td>
                              <td>
                                <Link
                                  href={`/plan-anual/planilla/${r.id}`}
                                  target="_blank"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    backgroundColor: "#f0fdfa",
                                    color: "#0f766e",
                                    border: "1px solid #99f6e4",
                                    padding: "0.3rem 0.65rem",
                                    borderRadius: "6px",
                                    fontSize: "0.78rem",
                                    fontWeight: 700,
                                    textDecoration: "none"
                                  }}
                                >
                                  📄 Ver Planilla Firmada
                                </Link>
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
