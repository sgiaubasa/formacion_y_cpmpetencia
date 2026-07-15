"use client";

import { useState } from "react";

export function AssignTrainingForm({
  allEmployees,
  allJobProfiles,
  allSectors,
  isSector,
  sectorRoleId,
  allTrainings = [],
  addAdHocNeed
}: {
  allEmployees: { id: number, name: string, legajo: string, sectorId: number }[],
  allJobProfiles: { id: number, title: string }[],
  allSectors: { id: number, name: string }[],
  isSector: boolean,
  sectorRoleId?: number,
  allTrainings: { id: number, title: string }[],
  addAdHocNeed: (formData: FormData) => Promise<void>
}) {
  const [assignmentType, setAssignmentType] = useState<"empleado" | "puesto" | "sector">("empleado");

  // Filtrar si es un usuario de sector
  const filteredEmployees = isSector && sectorRoleId ? allEmployees.filter(e => e.sectorId === sectorRoleId) : allEmployees;
  const filteredSectors = isSector && sectorRoleId ? allSectors.filter(s => s.id === sectorRoleId) : allSectors;

  return (
    <form action={addAdHocNeed} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      
      <div style={{ flex: '1 1 200px' }}>
        <label className="form-label">Asignar a:</label>
        <select 
          name="assignmentType" 
          className="form-input" 
          value={assignmentType} 
          onChange={(e) => setAssignmentType(e.target.value as "empleado" | "puesto" | "sector")}
          required
          style={{ borderRadius: '20px' }}
        >
          <option value="empleado">Un Empleado</option>
          <option value="puesto">Un Perfil (Puesto)</option>
          <option value="sector">Una Gerencia / Sector</option>
        </select>
      </div>

      <div style={{ flex: '1 1 200px' }}>
        {assignmentType === "empleado" && (
          <>
            <label className="form-label">Empleado</label>
            <select name="employeeId" className="form-input" required style={{ borderRadius: '20px' }}>
              <option value="">Seleccione un empleado...</option>
              {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.legajo})</option>)}
            </select>
          </>
        )}
        {assignmentType === "puesto" && (
          <>
            <label className="form-label">Perfil de Puesto</label>
            <select name="jobProfileId" className="form-input" required style={{ borderRadius: '20px' }}>
              <option value="">Seleccione un puesto...</option>
              {allJobProfiles.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </>
        )}
        {assignmentType === "sector" && (
          <>
            <label className="form-label">Gerencia / Sector</label>
            <select name="targetSectorId" className="form-input" required style={{ borderRadius: '20px' }}>
              <option value="">Seleccione un sector...</option>
              {filteredSectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </>
        )}
      </div>

      <div style={{ flex: '1 1 200px' }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Tema de Capacitación
          <span title="Seleccione la capacitación que se dictará" style={{ cursor: 'help', color: 'var(--text-secondary)', background: '#e2e8f0', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>?</span>
        </label>
        <select name="trainingName" className="form-input" required style={{ borderRadius: '20px' }}>
          <option value="">Seleccione un tema...</option>
          {allTrainings.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
        </select>
      </div>

      <div style={{ flex: '1 1 200px' }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Objetivo
          <span title="Objetivo de la capacitación" style={{ cursor: 'help', color: 'var(--text-secondary)', background: '#e2e8f0', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>?</span>
        </label>
        <input type="text" name="objective" className="form-input" style={{ borderRadius: '20px' }} required placeholder="Escriba el objetivo..." />
      </div>

      <div style={{ flex: '1 1 200px' }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Fecha Programada
          <span title="Día planificado para realizarla" style={{ cursor: 'help', color: 'var(--text-secondary)', background: '#e2e8f0', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>?</span>
        </label>
        <input type="date" name="scheduledDate" className="form-input" style={{ borderRadius: '20px' }} required />
      </div>

      <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', height: '42px', borderRadius: '20px' }}>
        Asignar al Plan
      </button>
    </form>
  );
}
