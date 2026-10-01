"use client";

import { useState, useRef, useEffect } from "react";
import { programarFecha, borrarCapacitacion } from "./actions";
import { ConfirmExecutionModal } from "./ConfirmExecutionModal";
import { SgiEditModal } from "./SgiEditModal";
import { supabase } from "@/lib/supabase";

export function RowActions({
  recordId,
  currentDate,
  status,
  isSgi = false,
  isCompleted = false,
  currentScore = "",
  currentCompletedDate = ""
}: {
  recordId: number;
  currentDate: string;
  status: string;
  isSgi?: boolean;
  isCompleted?: boolean;
  currentScore?: string;
  currentCompletedDate?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<
    "none" | "schedule" | "execute" | "link_only" | "print_blank" | "sgi_edit"
  >("none");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleScheduleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    try {
      const formData = new FormData(e.currentTarget);
      const materialFile = formData.get("materialFile") as File | null;

      if (materialFile && materialFile.size > 0) {
        try {
          const cleanName = materialFile.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9.-]/g, "_");
          const filename = `material-${recordId}-${Date.now()}-${cleanName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("evidencias")
            .upload(filename, materialFile, {
              contentType: materialFile.type || "application/octet-stream",
              upsert: true
            });

          if (!uploadError && uploadData) {
            const { data: publicData } = supabase.storage
              .from("evidencias")
              .getPublicUrl(filename);
            formData.set("materialUrl", publicData.publicUrl);
            formData.set("materialName", materialFile.name);
            formData.delete("materialFile");
          }
        } catch (uploadEx) {
          console.warn("Client material upload error in schedule:", uploadEx);
        }
      } else {
        formData.delete("materialFile");
      }

      await programarFecha(formData);
      setActiveForm("none");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  if (activeForm === "schedule") {
    return (
      <form
        onSubmit={handleScheduleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          background: "#f8fafc",
          padding: "0.75rem",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          minWidth: "240px"
        }}
      >
        <input type="hidden" name="recordId" value={recordId} />
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>
            Fecha Programada *
          </label>
          <input
            type="date"
            name="scheduledDate"
            className="form-input"
            defaultValue={currentDate}
            style={{ width: "100%", padding: "0.3rem", fontSize: "0.82rem" }}
            required
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#475569", marginBottom: "0.2rem" }}>
            📎 Material PDF o Video (Opcional)
          </label>
          <input
            type="file"
            name="materialFile"
            accept=".pdf,video/*"
            className="form-input"
            style={{ width: "100%", padding: "0.25rem", fontSize: "0.75rem" }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="submit"
            disabled={isSavingSchedule}
            className="btn btn-primary"
            style={{ flex: 1, padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
          >
            {isSavingSchedule ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setActiveForm("none")}
            className="btn btn-secondary"
            style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  if (activeForm === "execute") {
    return <ConfirmExecutionModal recordId={recordId} initialMode="upload" onClose={() => setActiveForm("none")} />;
  }

  if (activeForm === "link_only") {
    return <ConfirmExecutionModal recordId={recordId} initialMode="link" onClose={() => setActiveForm("none")} />;
  }

  if (activeForm === "print_blank") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const date = fd.get("printDate") as string;
          const url = `/plan-anual/planilla/${recordId}${date ? "?date=" + date : ""}`;
          window.location.href = url;
        }}
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          background: "#f8fafc",
          padding: "0.5rem",
          borderRadius: "8px",
          border: "1px solid var(--border-color)"
        }}
      >
        <input
          type="date"
          name="printDate"
          className="form-input"
          style={{ width: "130px", padding: "0.25rem" }}
          required
          title="Fecha de Capacitación"
        />
        <button
          type="submit"
          className="btn btn-secondary"
          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "var(--teal-color)", color: "white" }}
          title="Generar"
        >
          🖨️ Generar
        </button>
        <button
          type="button"
          onClick={() => setActiveForm("none")}
          className="btn btn-secondary"
          style={{ padding: "0.25rem", fontSize: "0.75rem", border: "none" }}
          title="Cancelar"
        >
          ❌
        </button>
      </form>
    );
  }

  if (activeForm === "sgi_edit") {
    return (
      <SgiEditModal
        recordId={recordId}
        currentScheduledDate={currentDate}
        currentCompletedDate={currentCompletedDate}
        currentScore={currentScore}
        onClose={() => setActiveForm("none")}
      />
    );
  }

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn"
        style={{
          background: isCompleted ? "var(--warning-color)" : "var(--teal-color)",
          color: isCompleted ? "#000" : "white",
          padding: "0.25rem 0.75rem",
          borderRadius: "20px",
          fontSize: "0.875rem"
        }}
      >
        {isCompleted ? "Opciones / Enlaces..." : "Gestión ..."}
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {!isCompleted && (
            <>
              <button
                className="dropdown-item"
                onClick={() => {
                  setActiveForm("schedule");
                  setIsOpen(false);
                }}
              >
                📅 Programar Fecha / Material
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setActiveForm("execute");
                  setIsOpen(false);
                }}
              >
                ✓ Confirmar Ejecución
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setActiveForm("link_only");
                  setIsOpen(false);
                }}
              >
                🔗 Enlaces Firma (Empleado / Instructor)
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setActiveForm("print_blank");
                  setIsOpen(false);
                }}
              >
                🖨️ Generar Planilla (Vacía)
              </button>
            </>
          )}

          {isCompleted && (
            <button
              className="dropdown-item"
              onClick={() => {
                setActiveForm("link_only");
                setIsOpen(false);
              }}
            >
              🔗 Enlaces Firma (Empleado / Instructor)
            </button>
          )}

          {isSgi && isCompleted && (
            <button
              className="dropdown-item"
              onClick={() => {
                setActiveForm("sgi_edit");
                setIsOpen(false);
              }}
            >
              ✏️ Modificar Registro / Material (SGI)
            </button>
          )}

          {(status !== "GAP" || isSgi) && (
            <form action={borrarCapacitacion}>
              <input type="hidden" name="recordId" value={recordId} />
              <button
                type="submit"
                className="dropdown-item"
                style={{ color: "var(--danger-color)", borderTop: "1px solid var(--border-color)" }}
              >
                🗑️ Borrar Capacitación
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
