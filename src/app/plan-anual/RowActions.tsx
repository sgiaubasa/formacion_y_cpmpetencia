"use client";

import { useState, useRef, useEffect } from "react";
import { programarFecha, borrarCapacitacion } from "./actions";
import { ConfirmExecutionModal } from "./ConfirmExecutionModal";

import { SgiEditModal } from "./SgiEditModal";

export function RowActions({ 
  recordId, 
  currentDate,
  status,
  isSgi = false,
  isCompleted = false,
  currentScore = "",
  currentCompletedDate = ""
}: { 
  recordId: number, 
  currentDate: string,
  status: string,
  isSgi?: boolean,
  isCompleted?: boolean,
  currentScore?: string,
  currentCompletedDate?: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<"none" | "schedule" | "execute" | "print_blank" | "sgi_edit">("none");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (activeForm === "schedule") {
    return (
      <form action={programarFecha} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <input type="hidden" name="recordId" value={recordId} />
        <input type="date" name="scheduledDate" className="form-input" defaultValue={currentDate} style={{ width: '130px', padding: '0.25rem' }} required />
        <button type="submit" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Guardar Fecha Programada">
          Guardar
        </button>
        <button type="button" onClick={() => setActiveForm("none")} className="btn btn-secondary" style={{ padding: '0.25rem', fontSize: '0.75rem', border: 'none' }} title="Cancelar">
          ❌
        </button>
      </form>
    );
  }

  if (activeForm === "execute") {
    return <ConfirmExecutionModal recordId={recordId} onClose={() => setActiveForm("none")} />;
  }

  if (activeForm === "print_blank") {
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const date = fd.get('printDate') as string;
        const url = `/plan-anual/planilla/${recordId}${date ? '?date=' + date : ''}`;
        window.location.href = url; // Navigates in the same tab to avoid login issues
      }} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <input type="date" name="printDate" className="form-input" style={{ width: '130px', padding: '0.25rem' }} required title="Fecha de Capacitación" />
        <button type="submit" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--teal-color)', color: 'white' }} title="Generar">
          🖨️ Generar
        </button>
        <button type="button" onClick={() => setActiveForm("none")} className="btn btn-secondary" style={{ padding: '0.25rem', fontSize: '0.75rem', border: 'none' }} title="Cancelar">
          ❌
        </button>
      </form>
    );
  }

  if (activeForm === "sgi_edit") {
    return <SgiEditModal 
      recordId={recordId} 
      currentScheduledDate={currentDate} 
      currentCompletedDate={currentCompletedDate}
      currentScore={currentScore}
      onClose={() => setActiveForm("none")} 
    />;
  }

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="btn"
        style={{ background: isCompleted ? 'var(--warning-color)' : 'var(--teal-color)', color: isCompleted ? '#000' : 'white', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.875rem' }}
      >
        {isCompleted && isSgi ? "Opciones SGI..." : "Gestión ..."}
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          {!isCompleted && (
            <>
              <button 
                className="dropdown-item"
                onClick={() => { setActiveForm("schedule"); setIsOpen(false); }}
              >
                📅 Asignar Fecha
              </button>
              <button 
                className="dropdown-item"
                onClick={() => { setActiveForm("execute"); setIsOpen(false); }}
              >
                ✓ Confirmar Ejecución
              </button>
              
              <button 
                className="dropdown-item"
                onClick={() => { setActiveForm("print_blank"); setIsOpen(false); }}
              >
                🖨️ Generar Planilla (Vacía)
              </button>
            </>
          )}

          {isSgi && isCompleted && (
            <button 
              className="dropdown-item"
              onClick={() => { setActiveForm("sgi_edit"); setIsOpen(false); }}
            >
              ✏️ Modificar Registro (SGI)
            </button>
          )}
          
          {(status !== 'GAP' || isSgi) && (
            <form action={borrarCapacitacion}>
              <input type="hidden" name="recordId" value={recordId} />
              <button 
                type="submit" 
                className="dropdown-item"
                style={{ color: 'var(--danger-color)', borderTop: '1px solid var(--border-color)' }}
              >
                🗑️ Borrar Capacitación
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
