"use client";

import { useState } from "react";
import { sgiEditRecord } from "./actions";

export function SgiEditModal({
  recordId,
  currentScheduledDate,
  currentCompletedDate,
  currentScore,
  onClose
}: {
  recordId: number;
  currentScheduledDate?: string;
  currentCompletedDate?: string;
  currentScore?: string;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    try {
      await sgiEditRecord(formData);
      onClose();
    } catch (err) {
      setError("Error al guardar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--teal-color)' }}>SGI: Modificar Registro</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Puede cambiar las fechas, la nota, o re-subir la evidencia. Deje la evidencia en blanco si no desea reemplazar la actual.
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="hidden" name="recordId" value={recordId} />
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Fecha Programada</label>
              <input type="date" name="scheduledDate" className="form-input" defaultValue={currentScheduledDate} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Fecha de Realización</label>
              <input type="date" name="completedAt" className="form-input" defaultValue={currentCompletedDate} />
            </div>
          </div>

          <div>
            <label className="form-label">Nota (Opcional, 0 a 10)</label>
            <input type="number" name="score" min="0" max="10" step="0.1" className="form-input" placeholder="Ej. 8" defaultValue={currentScore} />
          </div>

          <div>
            <label className="form-label">Evidencia / Planilla Firmada (Reemplazar)</label>
            <input type="file" name="evidence" className="form-input" accept=".pdf,image/*" />
            <small style={{ color: 'var(--text-secondary)' }}>Si no selecciona un archivo, se mantendrá la evidencia anterior.</small>
          </div>
          
          {error && <div style={{ color: 'var(--error-color)', fontSize: '0.875rem' }}>{error}</div>}
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios (SGI)"}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
