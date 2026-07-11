"use client";

import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { marcarEjecutada } from "./actions";

export function ConfirmExecutionModal({
  recordId,
  onClose
}: {
  recordId: number;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"upload" | "sign">("upload");
  const employeeSigRef = useRef<any>(null);
  const instructorSigRef = useRef<any>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    
    if (mode === "sign") {
      if (employeeSigRef.current?.isEmpty() || instructorSigRef.current?.isEmpty()) {
        setError("Ambas firmas son requeridas en modo digital.");
        setIsSubmitting(false);
        return;
      }
      formData.set("employeeSignature", employeeSigRef.current.getTrimmedCanvas().toDataURL('image/png'));
      formData.set("instructorSignature", instructorSigRef.current.getTrimmedCanvas().toDataURL('image/png'));
    }

    try {
      await marcarEjecutada(formData);
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
        <h2 style={{ marginBottom: '1rem', color: 'var(--teal-color)' }}>Confirmar Ejecución</h2>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            type="button" 
            onClick={() => setMode("upload")} 
            className={mode === "upload" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ flex: 1 }}
          >
            Subir Archivo
          </button>
          <button 
            type="button" 
            onClick={() => setMode("sign")} 
            className={mode === "sign" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ flex: 1 }}
          >
            Firma Digital
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="hidden" name="recordId" value={recordId} />
          <input type="hidden" name="mode" value={mode} />
          
          <div>
            <label className="form-label">Fecha de Realización</label>
            <input type="date" name="completedAt" className="form-input" defaultValue={new Date().toISOString().split('T')[0]} required />
          </div>

          {mode === "upload" ? (
            <div>
              <label className="form-label">Evidencia (Planilla Firmada)</label>
              <input type="file" name="evidence" className="form-input" accept=".pdf,image/*" required />
            </div>
          ) : (
            <>
              <div>
                <label className="form-label">Firma del Capacitado</label>
                <div style={{ border: '1px solid #ccc', borderRadius: '4px', background: '#f9fafb' }}>
                  <SignatureCanvas ref={employeeSigRef} canvasProps={{ width: 430, height: 150, className: 'sigCanvas' }} />
                </div>
                <button type="button" onClick={() => employeeSigRef.current?.clear()} style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer' }}>Borrar Firma</button>
              </div>

              <div>
                <label className="form-label">Nombre del Instructor</label>
                <input type="text" name="instructorName" className="form-input" placeholder="Ej. Juan Pérez" required={mode === "sign"} />
              </div>

              <div>
                <label className="form-label">Firma del Instructor</label>
                <div style={{ border: '1px solid #ccc', borderRadius: '4px', background: '#f9fafb' }}>
                  <SignatureCanvas ref={instructorSigRef} canvasProps={{ width: 430, height: 150, className: 'sigCanvas' }} />
                </div>
                <button type="button" onClick={() => instructorSigRef.current?.clear()} style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer' }}>Borrar Firma</button>
              </div>
            </>
          )}

          {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Confirmar'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }} disabled={isSubmitting}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
