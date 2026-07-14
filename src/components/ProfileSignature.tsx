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
    <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {existingSignature ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <img src={existingSignature} alt={`Firma ${roleTitle}`} style={{ maxHeight: '60px', display: 'block' }} />
          <div style={{ borderBottom: '1px solid black', width: '80%', margin: '0 auto 5px auto' }}></div>
          <div style={{ fontWeight: 'bold' }}>{roleTitle}</div>
          <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.2rem' }}>
            {existingEmail}
          </div>
        </div>
      ) : isSigning ? (
        <div className="no-print">
          <div style={{ border: '1px dashed #999', backgroundColor: 'white', display: 'inline-block', marginBottom: '0.5rem' }}>
            <SignatureCanvas 
              ref={sigCanvas}
              penColor="black"
              canvasProps={{ width: 250, height: 100, className: "sigCanvas" }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button onClick={handleClear} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} disabled={saving}>Limpiar</button>
            <button onClick={() => setIsSigning(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} disabled={saving}>Cancelar</button>
            <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} disabled={saving}>
              {saving ? '...' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ borderBottom: '1px solid black', width: '80%', margin: '0 auto 5px auto' }}></div>
          <div style={{ fontWeight: 'bold' }}>{roleTitle}</div>
          {canSign && (
            <button 
              onClick={() => setIsSigning(true)} 
              className="btn btn-primary no-print" 
              style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
            >
              Firmar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
