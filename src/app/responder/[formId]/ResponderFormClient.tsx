"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import SignatureCanvas from "react-signature-canvas";
import { OnlineTrainingForm } from "@/lib/onlineForms";
import {
  submitOnlineFormResponseAction,
  saveOnlineFormInstructorSignatureAction
} from "@/app/formularios/actions";

function renderVideoPlayer(url: string) {
  if (!url) return null;
  const trimmed = url.trim();

  // YouTube
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  if (ytMatch) {
    return (
      <div
        style={{
          position: "relative",
          paddingBottom: "56.25%",
          height: 0,
          overflow: "hidden",
          borderRadius: "10px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.12)"
        }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title="Video de Capacitación"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none"
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  // Vimeo
  const vimeoMatch = trimmed.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/
  );
  if (vimeoMatch && vimeoMatch[3]) {
    return (
      <div
        style={{
          position: "relative",
          paddingBottom: "56.25%",
          height: 0,
          overflow: "hidden",
          borderRadius: "10px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.12)"
        }}
      >
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[3]}`}
          title="Video de Capacitación"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none"
          }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Google Drive
  const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdriveMatch) {
    return (
      <div
        style={{
          position: "relative",
          paddingBottom: "56.25%",
          height: 0,
          overflow: "hidden",
          borderRadius: "10px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.12)"
        }}
      >
        <iframe
          src={`https://drive.google.com/file/d/${gdriveMatch[1]}/preview`}
          title="Video de Capacitación"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none"
          }}
          allow="autoplay"
          allowFullScreen
        />
      </div>
    );
  }

  // Video directo (MP4, WebM, Supabase Storage, etc.)
  return (
    <div
      style={{
        width: "100%",
        borderRadius: "10px",
        overflow: "hidden",
        backgroundColor: "#000000",
        boxShadow: "0 4px 14px rgba(0,0,0,0.12)"
      }}
    >
      <video
        controls
        playsInline
        preload="metadata"
        style={{ width: "100%", maxHeight: "460px", display: "block" }}
        src={trimmed}
      >
        Tu navegador no soporta el reproductor de video. Podés acceder al enlace directo:{" "}
        <a href={trimmed} target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8" }}>
          Ver video
        </a>
      </video>
    </div>
  );
}

export function ResponderFormClient({
  form,
  employees = [],
  isInstructorMode = false
}: {
  form: OnlineTrainingForm;
  employees?: { id: number; name: string; legajo: string }[];
  isInstructorMode?: boolean;
}) {
  const [legajo, setLegajo] = useState("");
  const [dni, setDni] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [acceptedSignature, setAcceptedSignature] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    recordId?: number;
    employeeName: string;
    legajo: string;
    sectorName: string;
    score: string;
  } | null>(null);

  // Estado exclusivo para modo instructor (?modo=instructor)
  const [instNameInput, setInstNameInput] = useState(form.instructorName || "");
  const [instSavedInfo, setInstSavedInfo] = useState<{ updatedCount: number } | null>(null);

  const sigCanvasRef = useRef<any>(null);

  const handleNameChange = (val: string) => {
    setEmployeeName(val);
    const matched = employees.find(
      (e) =>
        e.name.toLowerCase() === val.trim().toLowerCase() ||
        `${e.name} (Legajo ${e.legajo})`.toLowerCase() === val.trim().toLowerCase()
    );
    if (matched) {
      setEmployeeName(matched.name);
      setLegajo(matched.legajo);
    }
  };

  const handleLegajoChange = (val: string) => {
    setLegajo(val);
    const clean = val.replace(/\D/g, "").trim();
    if (clean) {
      const matched = employees.find((e) => e.legajo.replace(/\D/g, "") === clean);
      if (matched) {
        setEmployeeName(matched.name);
      }
    }
  };

  const handleClearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setHasDrawn(false);
    }
  };

  const handleInstructorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!instNameInput.trim()) {
      setErrorMsg("Por favor ingresá el nombre y apellido del Instructor.");
      return;
    }
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setErrorMsg("Por favor dibujá la firma del Instructor en el recuadro.");
      return;
    }

    let drawnSignature: string | null = null;
    try {
      drawnSignature = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");
    } catch {
      drawnSignature = sigCanvasRef.current.toDataURL("image/png");
    }

    if (!drawnSignature) {
      setErrorMsg("No se pudo procesar la firma. Por favor intentá nuevamente.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveOnlineFormInstructorSignatureAction({
        formId: form.id,
        instructorName: instNameInput,
        drawnSignature
      });
      if (res.ok) {
        setInstSavedInfo({ updatedCount: res.updatedCount || 0 });
      } else {
        setErrorMsg(res.error || "Error al guardar la firma del instructor.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error de conexión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // MODO INSTRUCTOR: Pantalla para que el instructor deje su firma para todas las planillas de esta capacitación
  if (isInstructorMode) {
    if (instSavedInfo) {
      return (
        <div
          style={{
            maxWidth: "640px",
            margin: "2.5rem auto",
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            borderTop: "6px solid #0d8383",
            boxShadow: "0 10px 30px rgba(27, 54, 93, 0.1)",
            padding: "2.5rem 2rem",
            textAlign: "center"
          }}
        >
          <img src="/logo.png" alt="AUBASA" style={{ width: "155px", marginBottom: "1rem" }} />
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✅</div>
          <h2 style={{ color: "#1b365d", marginBottom: "0.5rem" }}>
            ¡Firma de Instructor Guardada para toda la Capacitación!
          </h2>
          <p style={{ color: "#475569", lineHeight: 1.5 }}>
            La firma manuscrita de <strong>{instNameInput}</strong> quedó registrada oficialmente para la capacitación <strong>&ldquo;{form.trainingName}&rdquo;</strong> y se aplicó automáticamente a todas las planillas de asistencia ({instSavedInfo.updatedCount} planillas actualizadas y todas las nuevas que se generen).
          </p>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: "680px", margin: "2rem auto", padding: "0 1rem 3rem 1rem" }}>
        <div
          className="card"
          style={{
            borderTop: "6px solid #1b365d",
            backgroundColor: "#ffffff"
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <img src="/logo.png" alt="AUBASA" style={{ width: "150px", marginBottom: "0.75rem" }} />
            <span
              style={{
                display: "inline-block",
                backgroundColor: "#1b365d",
                color: "#ffffff",
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.22rem 0.65rem",
                borderRadius: "999px",
                textTransform: "uppercase",
                marginBottom: "0.35rem"
              }}
            >
              Enlace Oficial de Firma del Instructor
            </span>
            <h2 style={{ margin: "0.25rem 0", color: "#1b365d" }}>{form.trainingName}</h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
              Al registrar tu firma aquí una sola vez, aparecerá automáticamente en todas las planillas de asistencia (PAU/05 - A9.3) de esta capacitación.
            </p>
          </div>

          <form onSubmit={handleInstructorSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label className="form-label">Nombre y Apellido del Instructor *</label>
              <input
                type="text"
                className="form-input"
                value={instNameInput}
                onChange={(e) => setInstNameInput(e.target.value)}
                required
                placeholder="Ej: David Ceballos / Horacio San Martin"
              />
            </div>

            <div>
              <label className="form-label">
                ✍️ Firma Manuscrita del Instructor (Firmá con tu dedo o mouse) *
              </label>
              <div
                style={{
                  border: "2px dashed #94a3b8",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  padding: "0.5rem"
                }}
              >
                <SignatureCanvas
                  ref={sigCanvasRef}
                  onBegin={() => setHasDrawn(true)}
                  canvasProps={{
                    style: { width: "100%", height: 180, display: "block", cursor: "crosshair" }
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", color: hasDrawn ? "#0d8383" : "#64748b", fontWeight: 600 }}>
                  {hasDrawn ? "✓ Trazo detectado" : "Dibujá la firma dentro del recuadro"}
                </span>
                <button
                  type="button"
                  onClick={handleClearSignature}
                  style={{
                    background: "none",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "0.25rem 0.65rem",
                    fontSize: "0.78rem",
                    color: "#dc2626",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  ↺ Limpiar firma
                </button>
              </div>
            </div>

            {errorMsg && (
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.88rem"
                }}
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn"
              style={{
                width: "100%",
                backgroundColor: "#0d8383",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "1rem",
                padding: "0.9rem",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer"
              }}
            >
              {isSubmitting
                ? "Guardando firma en todas las planillas..."
                : "✅ Guardar Firma de Instructor para toda la Capacitación"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!employeeName.trim() && !legajo.trim() && !dni.trim()) {
      setErrorMsg("Por favor seleccioná tu Nombre y Apellido de la lista o ingresá tu Legajo / DNI.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Por favor ingresá una dirección de Correo Electrónico (Mail) válida.");
      return;
    }

    for (const q of form.questions) {
      if (answers[q.id] === undefined) {
        setErrorMsg("Por favor respondé todas las preguntas del cuestionario antes de enviar.");
        return;
      }
    }

    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setErrorMsg("Por favor realizá tu firma manuscrita en el recuadro antes de continuar.");
      return;
    }

    if (!acceptedSignature) {
      setErrorMsg("Debés marcar la casilla de Declaración de Conformidad.");
      return;
    }

    let drawnSignature: string | null = null;
    try {
      drawnSignature = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");
    } catch {
      drawnSignature = sigCanvasRef.current.toDataURL("image/png");
    }

    if (!drawnSignature) {
      setErrorMsg("No se pudo procesar tu firma manuscrita. Por favor dibujala nuevamente.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitOnlineFormResponseAction({
        formId: form.id,
        legajo,
        dni,
        employeeName,
        email,
        drawnSignature,
        answers
      });

      if (res.ok) {
        setSubmittedData({
          recordId: res.recordId,
          employeeName: res.employeeName || employeeName,
          legajo: res.legajo || legajo,
          sectorName: res.sectorName || "",
          score: res.score || "10"
        });
      } else {
        setErrorMsg(res.error || "No se pudo registrar la respuesta.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error de conexión al enviar el formulario.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedData) {
    return (
      <div
        style={{
          maxWidth: "680px",
          margin: "2rem auto",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          borderTop: "6px solid #0d8383",
          boxShadow: "0 10px 30px rgba(27, 54, 93, 0.1)",
          padding: "2.5rem 2rem",
          textAlign: "center"
        }}
      >
        <img
          src="/logo.png"
          alt="AUBASA"
          style={{ width: "160px", height: "auto", marginBottom: "1.25rem" }}
        />
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "#dcfce7",
            color: "#15803d",
            fontSize: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem auto",
            fontWeight: 700
          }}
        >
          ✓
        </div>
        <h2 style={{ color: "#1b365d", marginBottom: "0.5rem" }}>
          ¡Capacitación Registrada y Firmada en el Registro de Asistencia!
        </h2>
        <p style={{ color: "#475569", marginBottom: "1.5rem" }}>
          Tu respuesta y tu <strong>firma manuscrita</strong> quedaron estampadas automáticamente en el <strong>Registro de Asistencia Oficial (PAU/05 - Anexo 9.3)</strong>.
        </p>

        <div
          style={{
            backgroundColor: "#f0fdfa",
            border: "1px solid #99f6e4",
            borderRadius: "10px",
            padding: "1.25rem",
            textAlign: "left",
            marginBottom: "1.5rem",
            fontSize: "0.95rem",
            color: "#1e293b"
          }}
        >
          <div style={{ marginBottom: "0.4rem" }}>
            <strong>Colaborador:</strong> {submittedData.employeeName} (Legajo {submittedData.legajo})
          </div>
          {email && (
            <div style={{ marginBottom: "0.4rem" }}>
              <strong>Correo Electrónico:</strong> {email}
            </div>
          )}
          {submittedData.sectorName && (
            <div style={{ marginBottom: "0.4rem" }}>
              <strong>Sector:</strong> {submittedData.sectorName}
            </div>
          )}
          <div style={{ marginBottom: "0.4rem" }}>
            <strong>Capacitación:</strong> {form.trainingName}
          </div>
          <div style={{ marginBottom: "0.4rem" }}>
            <strong>Calificación Obtenida:</strong> {submittedData.score} / 10
          </div>
          <div style={{ color: "#0d8383", fontWeight: 700, marginTop: "0.5rem" }}>
            ✓ Firma del Participante y del Instructor ({form.instructorName}) asentadas en el Registro de Asistencia.
          </div>
        </div>

        {submittedData.recordId && (
          <Link
            href={`/plan-anual/planilla/${submittedData.recordId}`}
            target="_blank"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              backgroundColor: "#1b365d",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.95rem",
              padding: "0.75rem 1.4rem",
              borderRadius: "8px",
              textDecoration: "none"
            }}
          >
            📄 Ver Registro de Asistencia Firmado (PAU/05 - A9.3)
          </Link>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "780px", margin: "1.5rem auto", padding: "0 1rem 3rem 1rem" }}>
      {/* CABECERA DEL FORMULARIO */}
      <div
        className="card"
        style={{
          borderTop: "6px solid #0d8383",
          marginBottom: "1.5rem",
          background: "linear-gradient(135deg, #ffffff 0%, #f0fdfa 70%, #e0f2fe 100%)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "0.6rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid #cbd5e1"
            }}
          >
            <img src="/logo.png" alt="Logo AUBASA" style={{ width: "145px", height: "auto", display: "block" }} />
          </div>
          <div style={{ flex: "1 1 300px" }}>
            <span
              style={{
                display: "inline-block",
                backgroundColor: "#0d8383",
                color: "#ffffff",
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.22rem 0.65rem",
                borderRadius: "999px",
                textTransform: "uppercase",
                marginBottom: "0.35rem"
              }}
            >
              Formulario Oficial de Capacitación — AUBASA
            </span>
            <h1 style={{ margin: 0, fontSize: "1.4rem", color: "#1b365d" }}>{form.title}</h1>
            <div style={{ marginTop: "0.35rem", fontSize: "0.88rem", color: "#0d8383", fontWeight: 700 }}>
              🎓 Tema de Capacitación: {form.trainingName}
            </div>
          </div>
        </div>

        {form.description && (
          <p style={{ margin: "0 0 0.6rem 0", color: "#334155", fontSize: "0.93rem" }}>
            {form.description}
          </p>
        )}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderLeft: "4px solid #63b5e5",
            padding: "0.65rem 0.9rem",
            borderRadius: "0 8px 8px 0",
            fontSize: "0.86rem",
            color: "#1b365d"
          }}
        >
          <strong>Objetivo de la Capacitación:</strong> {form.objective}
        </div>
      </div>

      {/* SECCIÓN MATERIAL INTERACTIVO: VIDEO Y PDF */}
      {(form.videoUrl || form.pdfUrl) && (
        <div
          className="card"
          style={{
            marginBottom: "1.5rem",
            borderLeft: "5px solid #f59e0b",
            backgroundColor: "#fffbeb"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.3rem" }}>🎬📄</span>
            <h3 style={{ margin: 0, color: "#92400e", fontSize: "1.1rem" }}>
              Material Interactivo de la Capacitación (Miralo / Leelo aquí antes de responder)
            </h3>
          </div>

          <p style={{ margin: "0 0 1rem 0", fontSize: "0.88rem", color: "#78350f" }}>
            Interactuá con el documento o video de la capacitación directamente en esta pantalla antes de contestar las preguntas:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Reproductor de Video */}
            {form.videoUrl && (
              <div style={{ backgroundColor: "#ffffff", padding: "1rem", borderRadius: "10px", border: "1px solid #fde68a" }}>
                <div style={{ fontWeight: 700, color: "#1b365d", marginBottom: "0.6rem", fontSize: "0.95rem" }}>
                  🎥 Video de la Capacitación
                </div>
                {renderVideoPlayer(form.videoUrl)}
              </div>
            )}

            {/* Visor Interactivo de Documento PDF */}
            {form.pdfUrl && (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  padding: "1rem",
                  borderRadius: "10px",
                  border: "1px solid #fde68a",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>📄</span>
                    <div>
                      <div style={{ fontWeight: 700, color: "#1b365d", fontSize: "0.95rem" }}>
                        {form.pdfName || "Material de Lectura / Presentación (PDF)"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                        Podés desplazarte por las páginas aquí mismo o abrirlo en pantalla completa
                      </div>
                    </div>
                  </div>
                  <a
                    href={form.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      backgroundColor: "#1b365d",
                      color: "#ffffff",
                      padding: "0.45rem 1rem",
                      fontSize: "0.85rem",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem"
                    }}
                  >
                    🔍 Pantalla Completa / Descargar PDF
                  </a>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "480px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid #cbd5e1"
                  }}
                >
                  <iframe
                    src={`${form.pdfUrl}#toolbar=1&view=FitH`}
                    title={form.pdfName || "Documento PDF"}
                    style={{ width: "100%", height: "100%", border: "none" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 1. IDENTIFICACIÓN */}
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid #1b365d" }}>
          <h3 style={{ marginTop: 0, color: "#1b365d", fontSize: "1.08rem", marginBottom: "0.85rem" }}>
            1. Tus Datos de Identificación (Nombre, Legajo y Mail)
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "1rem"
            }}
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Apellido y Nombre (Seleccioná de la lista) *</label>
              <input
                list="aubasa-employees-list"
                type="text"
                className="form-input"
                placeholder="Escribí tu apellido o nombre para buscarte en la lista..."
                value={employeeName}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
              <datalist id="aubasa-employees-list">
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    Legajo: {emp.legajo}
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="form-label">Número de Legajo *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: 12807"
                value={legajo}
                onChange={(e) => handleLegajoChange(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Correo Electrónico (Mail) *</label>
              <input
                type="email"
                className="form-input"
                placeholder="ejemplo@aubasa.com.ar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">DNI (Opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Sin puntos"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 2. PREGUNTAS CON SU PUNTAJE */}
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid #0d8383" }}>
          <h3 style={{ marginTop: 0, color: "#1b365d", fontSize: "1.08rem", marginBottom: "1rem" }}>
            2. Cuestionario de la Capacitación (Puntaje Máximo: 10 puntos)
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {form.questions.map((q, idx) => {
              const pts =
                typeof q.points === "number"
                  ? q.points
                  : Number((10 / (form.questions.length || 1)).toFixed(2));
              return (
                <div
                  key={q.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "1.1rem",
                    backgroundColor: "#f8fafc"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      marginBottom: "0.75rem"
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#1b365d", fontSize: "0.96rem" }}>
                      {idx + 1}. {q.question}
                    </div>
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        backgroundColor: "#e0f2fe",
                        color: "#0369a1",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px"
                      }}
                    >
                      Vale {pts} {pts === 1 ? "punto" : "puntos"}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                    {q.options.map((opt, oIdx) => {
                      const isSelected = answers[q.id] === oIdx;
                      return (
                        <label
                          key={oIdx}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.65rem",
                            padding: "0.65rem 0.85rem",
                            borderRadius: "8px",
                            border: isSelected ? "2px solid #0d8383" : "1px solid #cbd5e1",
                            backgroundColor: isSelected ? "#f0fdfa" : "#ffffff",
                            cursor: "pointer",
                            fontSize: "0.91rem",
                            color: "#1e293b"
                          }}
                        >
                          <input
                            type="radio"
                            name={`question_${q.id}`}
                            checked={isSelected}
                            onChange={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q.id]: oIdx
                              }))
                            }
                            style={{ marginTop: "0.22rem" }}
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. FIRMA MANUSCRITA PARA EL REGISTRO DE ASISTENCIA */}
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid #63b5e5" }}>
          <h3 style={{ marginTop: 0, color: "#1b365d", fontSize: "1.08rem", marginBottom: "0.5rem" }}>
            3. Tu Firma para el Registro de Asistencia (PAU/05 - Anexo 9.3)
          </h3>
          <p style={{ margin: "0 0 1rem 0", fontSize: "0.88rem", color: "#475569" }}>
            Dibujá tu firma en el recuadro con tu dedo (en celular) o mouse (en PC). Tu firma irá directamente a la columna <strong>&ldquo;Firma&rdquo;</strong> del Registro de Asistencia oficial de la capacitación.
          </p>

          <div
            style={{
              border: "2px dashed #94a3b8",
              borderRadius: "10px",
              backgroundColor: "#ffffff",
              padding: "0.5rem",
              position: "relative"
            }}
          >
            <SignatureCanvas
              ref={sigCanvasRef}
              onBegin={() => setHasDrawn(true)}
              canvasProps={{
                style: {
                  width: "100%",
                  height: 180,
                  display: "block",
                  cursor: "crosshair"
                }
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "35px",
                left: "20px",
                right: "20px",
                borderBottom: "1px solid #e2e8f0",
                pointerEvents: "none"
              }}
            />
            <div
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                textAlign: "center",
                pointerEvents: "none",
                marginTop: "-15px"
              }}
            >
              Línea de firma para Registro de Asistencia
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", color: hasDrawn ? "#0d8383" : "#64748b", fontWeight: 600 }}>
              {hasDrawn ? "✓ Firma registrada" : "Trazá tu firma dentro del recuadro"}
            </span>
            <button
              type="button"
              onClick={handleClearSignature}
              style={{
                background: "none",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "0.3rem 0.75rem",
                fontSize: "0.8rem",
                color: "#dc2626",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              ↺ Limpiar / Volver a firmar
            </button>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              padding: "1rem",
              borderRadius: "10px",
              backgroundColor: acceptedSignature ? "#f0fdfa" : "#f8fafc",
              border: acceptedSignature ? "2px solid #0d8383" : "1px solid #cbd5e1",
              cursor: "pointer",
              fontSize: "0.93rem",
              color: "#1e293b"
            }}
          >
            <input
              type="checkbox"
              checked={acceptedSignature}
              onChange={(e) => setAcceptedSignature(e.target.checked)}
              style={{ width: "20px", height: "20px", marginTop: "0.15rem" }}
            />
            <span>
              <strong>Declaro bajo juramento haber recibido y comprendido la capacitación &ldquo;{form.trainingName}&rdquo;</strong>, prestando mi conformidad para que mi firma quede asentada en el Registro de Asistencia junto a la firma del Instructor ({form.instructorName}).
            </span>
          </label>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fca5a5",
              padding: "0.85rem 1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              fontWeight: 600,
              fontSize: "0.9rem"
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn"
          style={{
            width: "100%",
            backgroundColor: "#0d8383",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "1.05rem",
            padding: "0.95rem",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(13, 131, 131, 0.25)"
          }}
        >
          {isSubmitting ? "Registrando en Planilla de Asistencia..." : "✅ Enviar Cuestionario y Firmar Registro de Asistencia"}
        </button>
      </form>
    </div>
  );
}
