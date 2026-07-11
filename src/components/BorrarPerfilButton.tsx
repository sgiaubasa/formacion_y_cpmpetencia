"use client";

import React from "react";

export function BorrarPerfilButton() {
  return (
    <button 
      type="submit" 
      className="btn btn-primary" 
      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px', background: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' }} 
      title="Borrar Perfil"
      onClick={(e) => {
        if (!confirm('¿Estás seguro de eliminar este perfil?')) {
          e.preventDefault();
        }
      }}
    >
      🗑️ Borrar
    </button>
  );
}
