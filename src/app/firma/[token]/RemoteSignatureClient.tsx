"use client";

import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { saveRemoteSignature } from "./actions";

export default function RemoteSignatureClient({
  recordId,
  trainingName,
  employeeName,
  legajo
}: {
  recordId: number;
  trainingName: string;
  employeeName: string;
  legajo: string;
}) {
  const employeeSigRef = useRef<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (employeeSigRef.current?.isEmpty()) {
      setError("Por favor, dejá tu firma antes de enviar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const signatureDataUrl = employeeSigRef.current.getTrimmedCanvas().toDataURL('image/png');
      
      const formData = new FormData(e.currentTarget);
      formData.set("recordId", recordId.toString());
      formData.set("employeeSignature", signatureDataUrl);
      
      const result = await saveRemoteSignature(formData);
      if (result.success) {
        setIsSuccess(true);
      } else {
        setError(result.error || "Ocurrió un error al guardar la firma.");
      }
    } catch (err) {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
        <h2 style={{ color: '#10b981', marginBottom: '1rem' }}>¡Firma Registrada!</h2>
        <p style={{ color: '#4b5563' }}>Gracias {employeeName}. Tu capacitación en <strong>{trainingName}</strong> fue confirmada exitosamente.</p>
        <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#9ca3af' }}>Ya podés cerrar esta pestaña.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '0.5rem' }}>Registro de Capacitación</h1>
        <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>Completá este formulario para registrar tu asistencia.</p>
      </div>

      <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase' }}>Capacitación</span>
          <div style={{ fontWeight: '600', color: '#111827' }}>{trainingName}</div>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase' }}>Empleado</span>
          <div style={{ fontWeight: '500', color: '#374151' }}>{employeeName} (Legajo: {legajo})</div>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase' }}>Fecha</span>
          <div style={{ fontWeight: '500', color: '#374151' }}>{new Date().toLocaleDateString('es-AR')}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
            Tu Firma
          </label>
          <div style={{ border: '2px dashed #d1d5db', borderRadius: '8px', background: 'white', touchAction: 'none' }}>
            <SignatureCanvas 
              ref={employeeSigRef} 
              canvasProps={{ 
                style: { width: '100%', height: '200px', borderRadius: '8px' },
                className: 'sigCanvas' 
              }} 
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              onClick={() => employeeSigRef.current?.clear()} 
              style={{ fontSize: '0.8rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
            >
              Borrar y firmar de nuevo
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ 
            background: '#0d9488', 
            color: 'white', 
            border: 'none', 
            padding: '1rem', 
            borderRadius: '8px', 
            fontSize: '1rem', 
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          {isSubmitting ? 'Guardando firma...' : 'Confirmar Asistencia'}
        </button>
      </form>
    </div>
  );
}
