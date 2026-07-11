"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmarCambioPuestoAction } from "./actions";

export function ConfirmGapForm({ 
  employeeName,
  targetProfileTitle,
  empId,
  targetProfileId,
  allSectors,
  defaultTargetSectorId,
  gapResults,
  completedTrainings
}: { 
  employeeName: string,
  targetProfileTitle: string,
  empId: number,
  targetProfileId: number,
  allSectors: { id: number, name: string, mail: string | null }[],
  defaultTargetSectorId: number,
  gapResults: { requirement: string, hasTraining: boolean }[],
  completedTrainings: string[]
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState<number>(defaultTargetSectorId);
  const [emails, setEmails] = useState<string>("");

  useEffect(() => {
    const s = allSectors.find(sec => sec.id === defaultTargetSectorId);
    if (s?.mail) setEmails(s.mail);
  }, [defaultTargetSectorId, allSectors]);

  const handleSectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = parseInt(e.target.value);
    setSelectedSectorId(newId);
    const s = allSectors.find(sec => sec.id === newId);
    setEmails(s?.mail || "");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await confirmarCambioPuestoAction(formData);
      if (result.success) {
        if (result.previewUrl) {
          alert(`¡Propuesta de cambio enviada!\nSe ha enviado un correo de notificación.\n\nAl hacer clic en Aceptar, se abrirá una pestaña simulando el buzón de entrada.`);
          window.open(result.previewUrl, "_blank");
        } else {
          alert(`¡Propuesta de cambio enviada!`);
        }
        router.push("/brechas");
      }
    } catch (err) {
      alert("Hubo un error al confirmar el cambio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <input type="hidden" name="empId" value={empId} />
      <input type="hidden" name="targetProfileId" value={targetProfileId} />
      
      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
        <label className="form-label" style={{ fontWeight: 'bold' }}>Sector Destino (Quien recibe al empleado y aprueba la transferencia):</label>
        <select name="targetSectorId" className="form-input" value={selectedSectorId} onChange={handleSectorChange} required>
          <option value="" disabled>Seleccione el sector...</option>
          {allSectors.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <label className="form-label" style={{ fontWeight: 'bold', marginTop: '1rem' }}>Correos a Notificar (Gerentes, Coordinadores, etc.):</label>
        <input 
          type="text" 
          name="notificationEmails" 
          className="form-input" 
          value={emails} 
          onChange={e => setEmails(e.target.value)}
          placeholder="ejemplo@aubasa.com.ar, otro@aubasa.com.ar"
        />
        <small style={{ color: 'var(--text-secondary)' }}>Puedes separar múltiples correos usando comas.</small>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>2. Confirmación de Brechas para el Plan Anual</h2>
      <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
        Comparando el historial de <strong>{employeeName}</strong> contra <strong>{targetProfileTitle}</strong>.
        <br />Seleccione las capacitaciones faltantes que desea cargar formalmente al <b>Plan Anual</b>. 
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
        {/* LADO IZQUIERDO: BRECHAS A REALIZAR */}
        <div>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Brechas (A realizar)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Exigir</th>
                <th>Requisito del Puesto</th>
              </tr>
            </thead>
            <tbody>
              {gapResults.filter(r => !r.hasTraining).map((res, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" name="gap" value={res.requirement} defaultChecked style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  </td>
                  <td>{res.requirement}</td>
                </tr>
              ))}
              {gapResults.filter(r => !r.hasTraining).length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay brechas pendientes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* LADO DERECHO: CAPACITACIONES REALIZADAS */}
        <div>
          <h3 style={{ marginBottom: '0.5rem', color: '#16a34a' }}>Capacitaciones Ya Realizadas</h3>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
            {completedTrainings.length > 0 ? (
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {completedTrainings.map((t, idx) => (
                  <li key={idx} style={{ marginBottom: '0.5rem' }}>{t}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>El empleado no tiene capacitaciones registradas.</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
        {gapResults.length > 0 && !gapResults.some(r => !r.hasTraining) && (
          <span style={{ color: '#166534', fontWeight: 'bold' }}>
            ¡Cumple con todos los requisitos!
          </span>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
          {loading ? 'Enviando Propuesta...' : 'Proponer Cambio de Puesto'}
        </button>
      </div>
    </form>
  );
}
