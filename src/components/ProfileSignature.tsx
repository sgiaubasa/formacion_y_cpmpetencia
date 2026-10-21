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
  onSave: (role: string, signatureData: string, signerName: string) => Promise<void>
}) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [signerName, setSignerName] = useState<string>(existingEmail && !existingEmail.includes('@') ? existingEmail : '');
  const [saving, setSaving] = useState(false);

  const handleClear = () => {
    if (mode === 'draw') {
      sigCanvas.current?.clear();
    } else {
      setUploadedImage(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!signerName.trim()) {
      alert("Por favor ingrese su Nombre y Apellido antes de guardar.");
      return;
    }

    let dataURL: string | null | undefined = null;

    if (mode === 'draw') {
      if (sigCanvas.current?.isEmpty()) {
        alert("Por favor dibuje su firma antes de guardar.");
        return;
      }
      dataURL = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");
    } else {
      if (!uploadedImage) {
        alert("Por favor seleccione una imagen de su firma antes de guardar.");
        return;
      }
      dataURL = uploadedImage;
    }
    
    if (dataURL) {
      setSaving(true);
      await onSave(roleName, dataURL, signerName.trim());
      setSaving(false);
      setIsSigning(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {existingSignature ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <img src={existingSignature} alt={`Firma ${roleTitle}`} style={{ maxHeight: '65px', maxWidth: '200px', objectFit: 'contain', display: 'block', marginBottom: '4px' }} />
          <div style={{ borderBottom: '1px solid black', width: '80%', margin: '0 auto 5px auto' }}></div>
          {existingEmail && (
            <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#111', marginBottom: '2px' }}>
              {existingEmail}
            </div>
          )}
          <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#333' }}>{roleTitle}</div>
          {canSign && (
            <button
              onClick={() => setIsSigning(true)}
              className="btn btn-secondary no-print"
              style={{ marginTop: '0.4rem', padding: '0.15rem 0.5rem', fontSize: '0.65rem' }}
            >
              Cambiar firma
            </button>
          )}
        </div>
      ) : null}

      {isSigning ? (
        <div className="no-print" style={{ marginTop: existingSignature ? '0.5rem' : 0, padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', width: '92%', maxWidth: '280px' }}>
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={mode === 'draw' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1, padding: '0.25rem 0.4rem', fontSize: '0.7rem' }}
            >
              ✍️ Dibujar Firma
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={mode === 'upload' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1, padding: '0.25rem 0.4rem', fontSize: '0.7rem' }}
            >
              🖼️ Subir Imagen
            </button>
          </div>

          <div style={{ marginBottom: '0.5rem', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.2rem', color: '#334155' }}>
              Nombre y Apellido (Aclaración):
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="form-input"
              style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
            />
          </div>

          {mode === 'draw' ? (
            <div style={{ border: '1px dashed #999', backgroundColor: 'white', display: 'inline-block', marginBottom: '0.5rem' }}>
              <SignatureCanvas 
                ref={sigCanvas}
                penColor="black"
                canvasProps={{ width: 240, height: 100, className: "sigCanvas" }}
              />
            </div>
          ) : (
            <div style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ fontSize: '0.7rem', width: '100%', marginBottom: '0.4rem' }}
              />
              {uploadedImage && (
                <div style={{ border: '1px dashed #999', backgroundColor: 'white', padding: '0.25rem', display: 'inline-block' }}>
                  <img src={uploadedImage} alt="Vista previa firma" style={{ maxHeight: '70px', maxWidth: '220px', objectFit: 'contain' }} />
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
            <button type="button" onClick={handleClear} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} disabled={saving}>Limpiar</button>
            <button type="button" onClick={() => setIsSigning(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} disabled={saving}>Cancelar</button>
            <button type="button" onClick={handleSave} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} disabled={saving}>
              {saving ? '...' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : !existingSignature ? (
        <div style={{ height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
          <div style={{ borderBottom: '1px solid black', width: '80%', margin: '0 auto 5px auto' }}></div>
          <div style={{ fontWeight: 'bold' }}>{roleTitle}</div>
          {canSign && (
            <button 
              onClick={() => setIsSigning(true)} 
              className="btn btn-primary no-print" 
              style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
            >
              Firmar / Subir Firma
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
