"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmarTransferenciaAction } from "../actions";

export function ConfirmTransferForm({
  transferId,
  gaps
}: {
  transferId: number,
  gaps: string[]
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Calcula la fecha límite (hoy + 90 días)
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 90);

  const todayStr = today.toISOString().split("T")[0];
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    // Validación extra por si acaso el HTML no bloqueó algo
    const formData = new FormData(e.currentTarget);
    for (const gap of gaps) {
      const dateStr = formData.get(`date_${gap}`);
      if (!dateStr) {
        alert(`Debes asignar una fecha para: ${gap}`);
        setLoading(false);
        return;
      }
      const selectedDate = new Date(dateStr as string);
      if (selectedDate > maxDate) {
        alert(`La fecha para "${gap}" supera el límite de 3 meses (máximo ${maxDateStr}).`);
        setLoading(false);
        return;
      }
    }

    try {
      await confirmarTransferenciaAction(formData);
      alert("Transferencia confirmada y fechas programadas exitosamente.");
      router.push("/transferencias");
    } catch (err) {
      alert("Error al confirmar la transferencia.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <input type="hidden" name="transferId" value={transferId} />
      
      <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        IMPORTANTE: Para confirmar el pase del empleado a tu sector, es obligatorio que programes todas las capacitaciones faltantes indicando una fecha no mayor a 3 meses ({maxDateStr}).
      </p>

      <table className="data-table" style={{ marginBottom: '1.5rem' }}>
        <thead>
          <tr>
            <th>Capacitación Faltante (Brecha)</th>
            <th style={{ width: '250px' }}>Fecha Programada (Obligatoria)</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((gap, idx) => (
            <tr key={idx}>
              <td>{gap}</td>
              <td>
                <input 
                  type="date" 
                  name={`date_${gap}`} 
                  required 
                  min={todayStr}
                  max={maxDateStr}
                  className="form-input" 
                  style={{ width: '100%' }}
                />
              </td>
            </tr>
          ))}
          {gaps.length === 0 && (
            <tr>
              <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                Este empleado no tiene brechas. Está 100% apto.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
          {loading ? 'Confirmando...' : 'Confirmar Pase y Fechas'}
        </button>
      </div>
    </form>
  );
}
