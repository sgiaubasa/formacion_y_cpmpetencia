"use client";

import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

export function ProfileSignature({ 
  profileId,
  roleName, // 'RRHH', 'GerenteArea', 'GerenteGeneral'
  roleTitle, // Label to show
  existingSignature,
  existingDate,
  existingEmail,
  canSign,
  onSave
}: { 
  profileId: number,
  roleName: 'RRHH' | 'GerenteArea' | 'GerenteGeneral',
  roleTitle: string,
  existingSignature?: string | null,
  existingDate?: Date | null,
  existingEmail?: string | null,
  canSign: boolean,
  onSave: (role: string, signatureData: string) => Promise<void>
}) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert("Por favor dibuje su firma antes de guardar.");
      return;
    }
    
    setSaving(true);
    const dataURL = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    if (dataURL) {
      await onSave(roleName, dataURL);
    }
    setSaving(false);
    setIsSigning(false);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px', textAlign: 'center', backgroundColor: '#fafafa' }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' }}>{roleTitle}</h4>
      
      {existingSignature ? (
        <div>
          <img src={existingSignature} alt={`Firma ${roleTitle}`} style={{ maxHeight: '100px', display: 'block', margin: '0 auto' }} />
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
            <div>Firmado por: <strong>{existingEmail}</strong></div>
            <div>Fecha: {existingDate ? new Date(existingDate).toLocaleDateString() + ' ' + new Date(existingDate).toLocaleTimeString() : ''}</div>
          </div>
        </div>
      ) : isSigning ? (
        <div>
          <div style={{ border: '1px dashed #999', backgroundColor: 'white', display: 'inline-block', marginBottom: '0.5rem' }}>
            <SignatureCanvas 
              ref={sigCanvas}
              penColor="black"
              canvasProps={{ width: 300, height: 150, className: "sigCanvas" }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button onClick={handleClear} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} disabled={saving}>Limpiar</button>
            <button onClick={() => setIsSigning(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} disabled={saving}>Cancelar</button>
            <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem' }} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontStyle: 'italic', fontSize: '0.875rem' }}>
          Pendiente de Firma
        </div>
      )}
      
      {!existingSignature && !isSigning && canSign && (
        <button 
          onClick={() => setIsSigning(true)} 
          className="btn btn-primary" 
          style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
        >
          Firmar Ahora
        </button>
      )}
    </div>
  );
}
