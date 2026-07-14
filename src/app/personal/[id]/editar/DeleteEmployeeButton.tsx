"use client";

import React from "react";

export function DeleteEmployeeButton({ deleteAction }: { deleteAction: () => void }) {
  return (
    <button 
      formAction={deleteAction} 
      type="submit" 
      className="btn btn-secondary" 
      style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
      onClick={(e) => {
        if(!confirm('¿Estás seguro de ELIMINAR DEFINITIVAMENTE este registro? Esto borrará su historial de capacitaciones y no se puede deshacer.')) {
          e.preventDefault();
        }
      }}
    >
      Eliminar Definitivamente (Solo Admin)
    </button>
  );
}
