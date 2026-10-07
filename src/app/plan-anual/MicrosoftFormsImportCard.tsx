"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function MicrosoftFormsImportCard({
  allTrainings
}: {
  allTrainings: { id: number; title: string }[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [trainingName, setTrainingName] = useState("");
  const [instructorName, setInstructorName] = useState("SGI / Capacitación AUBASA");
  const [objective, setObjective] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMsg, setResultMsg] = useState<{
    ok: boolean;
    text: string;
    notFound?: string[];
  } | null>(null);

  const handleFileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("formsExcel") as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file || !trainingName.trim()) {
      return;
    }

    setIsProcessing(true);
    setResultMsg(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      if (rows.length === 0) {
        setResultMsg({ ok: false, text: "El archivo Excel no contiene filas de respuestas." });
        setIsProcessing(false);
        return;
      }

      const items = rows.map((row) => {
        const keys = Object.keys(row);
        const findCol = (keywords: string[]) => {
          const foundKey = keys.find((k) => {
            const normK = k.toLowerCase();
            return keywords.some((kw) => normK.includes(kw));
          });
          return foundKey ? row[foundKey] : "";
        };

        const legajo = findCol(["legajo"]);
        const dni = findCol(["dni", "documento"]);
        const employeeName =
          findCol(["apellido", "nombre y apellido", "nombre completo", "empleado", "participante"]) ||
          findCol(["nombre"]);
        const rawScore = findCol([
          "total de puntos",
          "puntos",
          "nota",
          "calificacion",
          "calificación",
          "score"
        ]);
        const completedAt = findCol([
          "hora de finalización",
          "hora de finalizacion",
          "fecha",
          "completion time"
        ]);

        return {
          legajo: String(legajo ?? "").trim(),
          dni: String(dni ?? "").trim(),
          employeeName: String(employeeName ?? "").trim(),
          score: rawScore !== "" && rawScore !== undefined ? String(rawScore).trim() : "10",
          completedAt: completedAt || new Date().toISOString(),
          trainingName: trainingName.trim(),
          instructorName: instructorName.trim() || "SGI / Capacitación AUBASA",
          objective: objective.trim()
        };
      });

      const res = await fetch("/api/webhooks/microsoft-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });

      const data = await res.json();
      if (data.ok) {
        const nuevos = data.newCompleted ?? data.processed ?? 0;
        const actualizados = data.updatedExisting ?? 0;
        setResultMsg({
          ok: true,
          text: `✓ ¡Procesamiento exitoso! Nuevas capacitaciones cerradas y firmadas: ${nuevos} | Ya registradas previamente (actualizadas sin duplicar): ${actualizados}.`,
          notFound: data.notFoundList && data.notFoundList.length > 0 ? data.notFoundList : undefined
        });
        form.reset();
        router.refresh();
      } else {
        setResultMsg({
          ok: false,
          text: data.error || "No se pudo procesar el archivo de Microsoft Forms."
        });
      }
    } catch (err: any) {
      setResultMsg({
        ok: false,
        text: err?.message || "Error leyendo el archivo Excel de Microsoft Forms."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        marginBottom: "1.75rem",
        borderLeft: "6px solid #1b365d",
        background: "#ffffff",
        padding: "1.1rem 1.5rem"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ flex: "1 1 420px" }}>
          <span
            style={{
              backgroundColor: "#e0f2fe",
              color: "#1b365d",
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "0.2rem 0.6rem",
              borderRadius: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.04em"
            }}
          >
            Formularios Online &amp; Microsoft Forms 365
          </span>
          <h3 style={{ margin: "0.35rem 0 0 0", fontSize: "1.05rem", color: "#1b365d" }}>
            📥 Cargar / Actualizar Excel de Microsoft Forms o Crear Formulario Online
          </h3>
          <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Podés subir el Excel de Microsoft Forms (y volver a subirlo con nuevas respuestas sin que se dupliquen las anteriores), o usar los <strong>Formularios Online propios de la aplicación</strong> que impactan en el acto.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Link
            href="/formularios"
            className="btn"
            style={{
              backgroundColor: "#0d8383",
              color: "#ffffff",
              fontWeight: 600,
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              textDecoration: "none"
            }}
          >
            📝 Ir a Formularios Online de la App
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="btn"
            style={{
              backgroundColor: isOpen ? "#f1f5f9" : "#1b365d",
              color: isOpen ? "#1e293b" : "#ffffff",
              fontWeight: 600,
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1"
            }}
          >
            {isOpen ? "▲ Ocultar Carga de Excel" : "📥 Subir / Actualizar Excel de Forms"}
          </button>
        </div>
      </div>

      {isOpen && (
        <form
          onSubmit={handleFileSubmit}
          style={{
            marginTop: "1.25rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid #e2e8f0",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            alignItems: "end"
          }}
        >
          <div>
            <label className="form-label">1. Tema de Capacitación *</label>
            <input
              list="ms-forms-trainings-list"
              value={trainingName}
              onChange={(e) => setTrainingName(e.target.value)}
              placeholder="Elegí o escribí el tema..."
              className="form-input"
              required
            />
            <datalist id="ms-forms-trainings-list">
              {allTrainings.map((t) => (
                <option key={t.id} value={t.title} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="form-label">2. Nombre del Instructor (Firma Instructor) *</label>
            <input
              type="text"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label">3. Objetivo (Opcional si ya estaba en Plan)</label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ej: Conocer el uso del sistema..."
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">4. Archivo Excel de Microsoft Forms (.xlsx) *</label>
            <input
              type="file"
              name="formsExcel"
              accept=".xlsx,.xls,.csv"
              className="form-input"
              required
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={isProcessing}
              className="btn btn-primary"
              style={{
                backgroundColor: "#0d8383",
                padding: "0.6rem 1.4rem",
                fontWeight: 700
              }}
            >
              {isProcessing
                ? "Procesando respuestas y generando firmas digitales..."
                : "✅ Importar / Actualizar Nuevas Cargas y Firmar"}
            </button>
          </div>

          {resultMsg && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                backgroundColor: resultMsg.ok ? "#dcfce7" : "#fee2e2",
                color: resultMsg.ok ? "#166534" : "#991b1b",
                border: `1px solid ${resultMsg.ok ? "#86efac" : "#fca5a5"}`,
                fontSize: "0.9rem",
                fontWeight: 600
              }}
            >
              <div>{resultMsg.text}</div>
              {resultMsg.notFound && resultMsg.notFound.length > 0 && (
                <div style={{ marginTop: "0.4rem", fontSize: "0.82rem", fontWeight: 500 }}>
                  Omitidos (no pertenecen a tu sector o no se encontraron): {resultMsg.notFound.join(", ")}
                </div>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
