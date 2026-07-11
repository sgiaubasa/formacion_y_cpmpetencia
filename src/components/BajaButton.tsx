"use client";

import React from "react";

export function BajaButton() {
  return (
    <button 
      type="submit" 
      className="btn btn-secondary" 
      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px', background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, cursor: 'pointer' }} 
      title="Dar de Baja"
      onClick={(e) => {
        if (!confirm('¿Seguro que deseas dar de baja a este empleado? Su historial se mantendrá.')) {
          e.preventDefault();
        }
      }}
    >
      🔻 Baja
    </button>
  );
}
