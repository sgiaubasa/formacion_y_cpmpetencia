"use client";

import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { marcarEjecutada, generarLinkFirma } from "./actions";

export function ConfirmExecutionModal({
  recordId,
  onClose
}: {
  recordId: number;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"upload" | "sign" | "link">("upload");
  const employeeSigRef = useRef<any>(null);
  const instructorSigRef = useRef<any>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shareLink, setShareLink] = useState("");

  const handleGenerateLink = async () => {
    setIsSubmitting(true);
    try {
      const token = await generarLinkFirma(recordId);
      const url = `${window.location.origin}/firma/${token}`;
      setShareLink(url);
    } catch (err) {
      setError("Error al generar el link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    alert("Enlace copiado al portapapeles.");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === "link") return; // Link mode doesn't submit here

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
    } catch (err: any) {
      console.error("Error al guardar ejecución:", err);
      setError(err?.message || "Error al guardar.");
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
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }}
          >
            Subir Archivo
          </button>
          <button 
            type="button" 
            onClick={() => setMode("sign")} 
            className={mode === "sign" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }}
          >
            Firma App
          </button>
          <button 
            type="button" 
            onClick={() => setMode("link")} 
            className={mode === "link" ? "btn btn-primary" : "btn btn-secondary"}
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }}
          >
            Firma a Distancia
          </button>
        </div>

        {mode === "link" ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.9rem', color: '#4b5563' }}>
              Generá un enlace seguro para enviarle a la persona por WhatsApp o correo. Al firmar desde su celular, la capacitación se marcará como realizada automáticamente.
            </p>
            {!shareLink ? (
              <button type="button" onClick={handleGenerateLink} className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Generando...' : 'Generar Enlace Seguro'}
              </button>
            ) : (
              <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input type="text" readOnly value={shareLink} className="form-input" style={{ fontSize: '0.8rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={copyToClipboard} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }}>Copiar Enlace</button>
                  <a href={`https://wa.me/?text=${encodeURIComponent('Hola! Por favor firmá la capacitación ingresando a este enlace: ' + shareLink)}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: 1, fontSize: '0.85rem', textAlign: 'center', textDecoration: 'none' }}>
                    Enviar por WhatsApp
                  </a>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ width: '100%' }}>
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="hidden" name="recordId" value={recordId} />
            <input type="hidden" name="mode" value={mode} />
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Fecha de Realización</label>
                <input type="date" name="completedAt" className="form-input" defaultValue={new Date().toISOString().split('T')[0]} required />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Nota (Opcional, 0 a 10)</label>
                <input type="number" name="score" min="0" max="10" step="0.1" className="form-input" placeholder="Ej. 8" />
              </div>
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
        )}
      </div>
    </div>
  );
}
