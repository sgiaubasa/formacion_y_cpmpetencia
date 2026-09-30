"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmarCambioPuestoAction } from "./actions";

export default function ConfirmGapForm({ 
  employeeName,
  targetProfileTitle,
  empId,
  targetProfileId,
  allSectors,
  rrhhUsers,
  defaultTargetSectorId,
  gapResults,
  completedTrainings
}: { 
  employeeName: string,
  targetProfileTitle: string,
  empId: number,
  targetProfileId: number,
  allSectors: { id: number, name: string, mail: string | null }[],
  rrhhUsers?: { id: number, email: string, role: string }[],
  defaultTargetSectorId: number,
  gapResults: { requirement: string, hasTraining: boolean }[],
  completedTrainings: string[]
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState<number>(defaultTargetSectorId);
  const [emails, setEmails] = useState<string>("");
  const [fallbackMail, setFallbackMail] = useState<{
    to: string;
    cc: string;
    subject: string;
    body: string;
  } | null>(null);

  useEffect(() => {
    const s = allSectors.find(sec => sec.id === defaultTargetSectorId);
    if (s?.mail) setEmails(s.mail);
  }, [defaultTargetSectorId, allSectors]);

  const handleSectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prevSector = allSectors.find(sec => sec.id === selectedSectorId);
    const prevSectorMails = new Set(
      (prevSector?.mail || "")
        .split(/[,;]+/)
        .map(m => m.trim().toLowerCase())
        .filter(Boolean)
    );

    // Conservar los correos que el usuario haya agregado manualmente
    const manualKept = emails
      .split(/[,;]+/)
      .map(m => m.trim())
      .filter(m => m && !prevSectorMails.has(m.toLowerCase()));

    const newId = parseInt(e.target.value);
    setSelectedSectorId(newId);
    const s = allSectors.find(sec => sec.id === newId);
    const newSectorMails = (s?.mail || "")
      .split(/[,;]+/)
      .map(m => m.trim())
      .filter(Boolean);

    const merged = Array.from(new Set([...newSectorMails, ...manualKept]));
    setEmails(merged.join(", "));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await confirmarCambioPuestoAction(formData);
      if (result.success) {
        if (result.emailSent) {
          alert(
            `¡Propuesta de cambio enviada!\nSe envió automáticamente la comunicación a:\n${result.mailtoData?.to || "los destinatarios indicados"}`
          );
          router.push("/brechas");
        } else if (result.mailtoData?.to) {
          setFallbackMail(result.mailtoData);
          const toFormatted = result.mailtoData.to
            .split(/[,;]+/)
            .map((x: string) => x.trim())
            .filter(Boolean)
            .join(";");
          const mailtoParams = new URLSearchParams();
          mailtoParams.set("subject", result.mailtoData.subject);
          mailtoParams.set("body", result.mailtoData.body);
          const mailtoUrl = `mailto:${toFormatted}?${mailtoParams.toString().replace(/\+/g, "%20")}`;
          window.location.href = mailtoUrl;
        } else {
          alert(`¡Propuesta de cambio registrada en Transferencias!`);
          router.push("/brechas");
        }
      }
    } catch (err) {
      alert("Hubo un error al confirmar el cambio.");
    } finally {
      setLoading(false);
    }
  };

  if (fallbackMail) {
    const toFormatted = fallbackMail.to
      .split(/[,;]+/)
      .map((x: string) => x.trim())
      .filter(Boolean)
      .join(";");

    const mailtoParams = new URLSearchParams();
    mailtoParams.set("subject", fallbackMail.subject);
    mailtoParams.set("body", fallbackMail.body);
    const mailtoUrl = `mailto:${toFormatted}?${mailtoParams.toString().replace(/\+/g, "%20")}`;

    const owaParams = new URLSearchParams();
    owaParams.set("to", toFormatted);
    owaParams.set("subject", fallbackMail.subject);
    owaParams.set("body", fallbackMail.body);
    const owaUrl = `https://outlook.office.com/mail/deeplink/compose?${owaParams.toString()}`;

    return (
      <div className="card" style={{ borderLeft: "4px solid var(--primary-color)", padding: "1.5rem" }}>
        <h2 style={{ color: "var(--primary-color)", marginBottom: "0.75rem" }}>
          ✅ Propuesta Registrada en Transferencias
        </h2>
        <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
          La solicitud de cambio de puesto de <strong>{employeeName}</strong> ya quedó cargada en la pestaña <b>Transferencias</b>.
          <br />
          Seleccione cómo desea despachar el aviso a <strong>{fallbackMail.to}</strong>:
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <a
            href={owaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ textDecoration: "none" }}
          >
            🌐 Enviar por Outlook Web (Office 365)
          </a>
          <a
            href={mailtoUrl}
            className="btn btn-secondary"
            style={{ textDecoration: "none" }}
          >
            📧 Abrir en Outlook de Escritorio
          </a>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/brechas")}
          >
            Finalizar y Volver a Cambio de Puesto
          </button>
        </div>
      </div>
    );
  }

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
          required
        />
        <small style={{ color: 'var(--text-secondary)' }}>
          Se cargan automáticamente los responsables del sector seleccionado. También puedes agregar correos manualmente separados por comas.
        </small>
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
