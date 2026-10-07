"use client";

import React, { useState } from "react";
import { OnlineTrainingForm } from "@/lib/onlineForms";
import { submitOnlineFormResponseAction } from "@/app/formularios/actions";

export function ResponderFormClient({
  form,
  employees = []
}: {
  form: OnlineTrainingForm;
  employees?: { id: number; name: string; legajo: string }[];
}) {
  const [legajo, setLegajo] = useState("");
  const [dni, setDni] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [acceptedSignature, setAcceptedSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    employeeName: string;
    legajo: string;
    sectorName: string;
    score: string;
  } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!employeeName.trim() && !legajo.trim() && !dni.trim()) {
      setErrorMsg("Por favor seleccioná tu Nombre y Apellido de la lista o ingresá tu Legajo / DNI.");
      return;
    }

    for (const q of form.questions) {
      if (answers[q.id] === undefined) {
        setErrorMsg("Por favor respondé todas las preguntas antes de enviar.");
        return;
      }
    }

    if (!acceptedSignature) {
      setErrorMsg("Debés marcar la casilla de Declaración de Conformidad y Firma Digital.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitOnlineFormResponseAction({
        formId: form.id,
        legajo,
        dni,
        employeeName,
        answers
      });

      if (res.ok) {
        setSubmittedData({
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
          ¡Capacitación Registrada y Firmada con Éxito!
        </h2>
        <p style={{ color: "#475569", marginBottom: "1.5rem" }}>
          Tu respuesta fue procesada automáticamente en el Sistema de Gestión de Competencia y Formación de AUBASA.
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
          <div style={{ color: "#0d8383", fontWeight: 700 }}>
            ✓ Firma Digital del Participante y del Instructor ({form.instructorName}) registradas. Estado: REALIZADO.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "780px", margin: "1.5rem auto", padding: "0 1rem 3rem 1rem" }}>
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

      <form onSubmit={handleSubmit}>
        {/* 1. IDENTIFICACIÓN */}
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid #1b365d" }}>
          <h3 style={{ marginTop: 0, color: "#1b365d", fontSize: "1.08rem", marginBottom: "0.85rem" }}>
            1. Tus Datos de Identificación (Buscate en la lista por Apellido o Legajo)
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
              <label className="form-label">Número de Legajo (Se completa solo al elegir tu nombre)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: 12807"
                value={legajo}
                onChange={(e) => handleLegajoChange(e.target.value)}
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

        {/* 2. PREGUNTAS */}
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid #0d8383" }}>
          <h3 style={{ marginTop: 0, color: "#1b365d", fontSize: "1.08rem", marginBottom: "1rem" }}>
            2. Cuestionario de la Capacitación
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {form.questions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "1.1rem",
                  backgroundColor: "#f8fafc"
                }}
              >
                <div style={{ fontWeight: 700, color: "#1b365d", marginBottom: "0.75rem", fontSize: "0.96rem" }}>
                  {idx + 1}. {q.question}
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
            ))}
          </div>
        </div>

        {/* 3. CONFORMIDAD Y FIRMA DIGITAL */}
        <div className="card" style={{ marginBottom: "1.25rem", borderLeft: "4px solid #63b5e5" }}>
          <h3 style={{ marginTop: 0, color: "#1b365d", fontSize: "1.08rem", marginBottom: "0.75rem" }}>
            3. Declaración de Conformidad y Registro de Firma Digital
          </h3>
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
              <strong>Declaro haber recibido y comprendido la capacitación &ldquo;{form.trainingName}&rdquo;</strong>, prestando mi conformidad para que mis datos queden registrados como <strong>Firma Digital de Realización</strong> junto a la firma del Instructor ({form.instructorName}).
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
            padding: "0.9rem",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(13, 131, 131, 0.25)"
          }}
        >
          {isSubmitting ? "Registrando Calificación y Firmas..." : "✅ Enviar Cuestionario y Registrar Firma Digital"}
        </button>
      </form>
    </div>
  );
}
